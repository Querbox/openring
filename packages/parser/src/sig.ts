import type { DecodedFrame } from "@openring/decoder";
import type { SemanticEvent, SemanticValue } from "./index.ts";

/**
 * Built-in semantic decoders for Bluetooth-SIG-standard characteristics.
 *
 * SIG formats are stable and well-documented, so they live in code rather
 * than in the declarative `ProtocolDefinition` registry. This lets us
 * handle quirks (flag-driven layouts in Heart Rate Measurement, IEEE
 * 11073 SFLOAT in Pulse Oximeter, …) cleanly. Vendor opcodes still go
 * through the declarative path.
 */

const BASE_UUID_SUFFIX = "-0000-1000-8000-00805f9b34fb";

const HEART_RATE_MEASUREMENT = 0x2a37;
const BATTERY_LEVEL = 0x2a19;
const TEMPERATURE = 0x2a6e;
const HUMIDITY = 0x2a6f;
const PLX_SPOT_CHECK = 0x2a5e;
const PLX_CONTINUOUS = 0x2a5f;

function sigShortId(uuid: string): number | null {
  const u = uuid.toLowerCase();
  if (!u.endsWith(BASE_UUID_SUFFIX)) return null;
  const prefix = u.slice(0, 8);
  if (!/^[0-9a-f]{8}$/.test(prefix)) return null;
  if (parseInt(prefix.slice(0, 4), 16) !== 0) return null;
  return parseInt(prefix.slice(4), 16);
}

export function classifyAsSig(frame: DecodedFrame): SemanticEvent | null {
  const short = sigShortId(frame.raw.characteristicUuid);
  if (short === null) return null;
  switch (short) {
    case BATTERY_LEVEL:
      return decodeBattery(frame);
    case HEART_RATE_MEASUREMENT:
      return decodeHeartRate(frame);
    case TEMPERATURE:
      return decodeTemperature(frame);
    case HUMIDITY:
      return decodeHumidity(frame);
    case PLX_CONTINUOUS:
    case PLX_SPOT_CHECK:
      return decodeSpo2(frame, short === PLX_CONTINUOUS);
    default:
      return null;
  }
}

function decodeBattery(frame: DecodedFrame): SemanticEvent {
  const bytes = frame.raw.bytes;
  if (bytes.length < 1) {
    return shortPayload(frame, "battery", "Battery Level needs 1 byte");
  }
  const level = bytes[0]!;
  const valid = level <= 100;
  return {
    frame,
    protocolId: "sig/battery-level",
    kind: "battery",
    values: [
      { name: "level", value: level, unit: "%", inPlausibleRange: valid },
    ],
    confidence: valid ? 0.98 : 0.6,
    reasons: ["SIG standard Battery Level (0x2A19)"],
  };
}

/**
 * Heart Rate Measurement (0x2A37). Spec layout:
 *
 *   byte 0       Flags
 *                  bit 0  HR value format (0 = u8, 1 = u16)
 *                  bit 1  Sensor contact status (valid only if bit 2 set)
 *                  bit 2  Sensor contact support
 *                  bit 3  Energy expended present (2 bytes u16, kJ)
 *                  bit 4  RR intervals present (2 bytes each, 1/1024 s)
 *   ...          HR (u8 or u16 LE)
 *   ...          Energy expended (u16 LE), optional
 *   ...          RR intervals (u16 LE each), optional, repeats until end
 */
function decodeHeartRate(frame: DecodedFrame): SemanticEvent {
  const b = frame.raw.bytes;
  if (b.length < 2) {
    return shortPayload(
      frame,
      "heart-rate",
      "Heart Rate Measurement needs at least flags + 1-byte HR",
    );
  }

  const flags = b[0]!;
  const is16bit = (flags & 0x01) !== 0;
  const contactSupported = (flags & 0x04) !== 0;
  const contactDetected = contactSupported ? (flags & 0x02) !== 0 : null;
  const energyPresent = (flags & 0x08) !== 0;
  const rrPresent = (flags & 0x10) !== 0;

  const reasons: string[] = ["SIG standard Heart Rate Measurement (0x2A37)"];
  let offset = 1;

  if (b.length < offset + (is16bit ? 2 : 1)) {
    return shortPayload(frame, "heart-rate", "HR value bytes missing");
  }
  const bpm = is16bit
    ? b[offset]! | (b[offset + 1]! << 8)
    : b[offset]!;
  offset += is16bit ? 2 : 1;
  reasons.push(is16bit ? "flags indicate 16-bit BPM" : "flags indicate 8-bit BPM");

  const values: SemanticValue[] = [
    {
      name: "bpm",
      value: bpm,
      unit: "bpm",
      inPlausibleRange: bpm >= 30 && bpm <= 220,
    },
  ];

  if (energyPresent && b.length >= offset + 2) {
    const energy = b[offset]! | (b[offset + 1]! << 8);
    offset += 2;
    values.push({
      name: "energy",
      value: energy,
      unit: "kJ",
      inPlausibleRange: true,
    });
    reasons.push("energy-expended field present");
  }

  if (rrPresent) {
    let idx = 1;
    while (b.length >= offset + 2) {
      const raw = b[offset]! | (b[offset + 1]! << 8);
      offset += 2;
      const ms = Math.round((raw / 1024) * 1000);
      values.push({
        name: `rr-${idx}`,
        value: ms,
        unit: "ms",
        inPlausibleRange: ms >= 300 && ms <= 2000,
      });
      idx += 1;
    }
    if (idx > 1) reasons.push(`${idx - 1} RR interval(s) present`);
  }

  let confidence = bpm >= 30 && bpm <= 220 ? 0.95 : 0.6;
  if (contactDetected === false) {
    confidence = Math.max(0.3, confidence - 0.4);
    reasons.push("sensor reports NO contact — value likely noise");
  } else if (contactDetected === true) {
    reasons.push("sensor reports good contact");
  }

  return {
    frame,
    protocolId: "sig/heart-rate-measurement",
    kind: "heart-rate",
    values,
    confidence,
    reasons,
  };
}

function decodeTemperature(frame: DecodedFrame): SemanticEvent {
  const b = frame.raw.bytes;
  if (b.length < 2) {
    return shortPayload(frame, "temperature", "Temperature needs 2 bytes");
  }
  const raw = b[0]! | (b[1]! << 8);
  const signed = raw > 0x7fff ? raw - 0x10000 : raw;
  const celsius = signed * 0.01;
  const valid = celsius >= -20 && celsius <= 60;
  return {
    frame,
    protocolId: "sig/temperature",
    kind: "temperature",
    values: [
      {
        name: "celsius",
        value: round(celsius, 2),
        unit: "°C",
        inPlausibleRange: valid,
      },
    ],
    confidence: valid ? 0.9 : 0.55,
    reasons: ["SIG standard Temperature (0x2A6E), int16 LE × 0.01 °C"],
  };
}

function decodeHumidity(frame: DecodedFrame): SemanticEvent {
  const b = frame.raw.bytes;
  if (b.length < 2) {
    return shortPayload(frame, "status", "Humidity needs 2 bytes");
  }
  const raw = b[0]! | (b[1]! << 8);
  const percent = raw * 0.01;
  const valid = percent >= 0 && percent <= 100;
  return {
    frame,
    protocolId: "sig/humidity",
    kind: "status",
    values: [
      {
        name: "humidity",
        value: round(percent, 1),
        unit: "%",
        inPlausibleRange: valid,
      },
    ],
    confidence: valid ? 0.85 : 0.5,
    reasons: ["SIG standard Humidity (0x2A6F)"],
  };
}

/**
 * Pulse Oximeter Continuous (0x2A5F) / Spot Check (0x2A5E).
 *
 *   byte 0       Flags
 *   bytes 1-2    SpO2 (IEEE 11073 16-bit SFLOAT, %)
 *   bytes 3-4    Pulse Rate (SFLOAT, bpm)
 *   ...          Optional fields based on flags (timestamp, measurement
 *                status, sensor status, pulse amplitude) — ignored here.
 */
function decodeSpo2(frame: DecodedFrame, continuous: boolean): SemanticEvent {
  const b = frame.raw.bytes;
  if (b.length < 5) {
    return shortPayload(
      frame,
      "spo2",
      "Pulse Oximeter needs flags + 2 × SFLOAT (5 bytes)",
    );
  }
  const spo2 = decodeSfloat(b[1]! | (b[2]! << 8));
  const pulse = decodeSfloat(b[3]! | (b[4]! << 8));
  const spo2Valid = spo2 !== null && spo2 >= 70 && spo2 <= 100;
  const pulseValid = pulse !== null && pulse >= 30 && pulse <= 220;

  const values: SemanticValue[] = [];
  if (spo2 !== null) {
    values.push({
      name: "spo2",
      value: round(spo2, 1),
      unit: "%",
      inPlausibleRange: spo2Valid,
    });
  }
  if (pulse !== null) {
    values.push({
      name: "pulse",
      value: round(pulse, 0),
      unit: "bpm",
      inPlausibleRange: pulseValid,
    });
  }

  return {
    frame,
    protocolId: continuous ? "sig/spo2-continuous" : "sig/spo2-spot-check",
    kind: "spo2",
    values,
    confidence: spo2Valid ? (pulseValid ? 0.95 : 0.85) : 0.5,
    reasons: [
      continuous
        ? "SIG standard PLX Continuous Measurement (0x2A5F)"
        : "SIG standard PLX Spot-Check Measurement (0x2A5E)",
      `SFLOAT-decoded SpO₂=${spo2 === null ? "n/a" : spo2.toFixed(1)}, pulse=${pulse === null ? "n/a" : pulse.toFixed(0)}`,
    ],
  };
}

/**
 * IEEE 11073 16-bit SFLOAT.
 *
 *  Layout:  [ exponent: 4 bits signed | mantissa: 12 bits signed ]
 *
 *  Special mantissa values (independent of exponent):
 *    +∞  = 0x07FE
 *    NaN = 0x07FF
 *    NRes (not at this resolution) = 0x0800
 *    Reserved = 0x0801
 *    −∞ = 0x0802
 */
export function decodeSfloat(raw: number): number | null {
  const rawMantissa = raw & 0x0fff;
  const rawExponent = (raw >> 12) & 0x0f;

  if (
    rawMantissa === 0x07ff || // NaN
    rawMantissa === 0x0800 || // NRes
    rawMantissa === 0x0801 || // Reserved
    rawMantissa === 0x0802 // -Inf
  ) {
    return null;
  }
  if (rawMantissa === 0x07fe) return Infinity;

  const mantissa =
    rawMantissa & 0x0800 ? rawMantissa - 0x1000 : rawMantissa;
  const exponent = rawExponent & 0x08 ? rawExponent - 0x10 : rawExponent;

  return mantissa * Math.pow(10, exponent);
}

function round(value: number, decimals: number): number {
  const f = Math.pow(10, decimals);
  return Math.round(value * f) / f;
}

function shortPayload(
  frame: DecodedFrame,
  kind: "battery" | "heart-rate" | "temperature" | "status" | "spo2",
  why: string,
): SemanticEvent {
  return {
    frame,
    kind,
    values: [],
    confidence: 0,
    reasons: [why],
  };
}
