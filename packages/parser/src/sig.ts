import type { DecodedFrame } from "@openring/decoder";
import type { SemanticEvent } from "./index.ts";

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

function decodeHeartRate(frame: DecodedFrame): SemanticEvent {
  const b = frame.raw.bytes;
  if (b.length < 2) {
    return shortPayload(frame, "heart-rate", "Heart Rate Measurement needs flags + value");
  }
  const flags = b[0]!;
  const is16bit = (flags & 0x01) === 1;
  const bpm = is16bit && b.length >= 3 ? b[1]! | (b[2]! << 8) : b[1]!;
  const valid = bpm >= 30 && bpm <= 220;
  return {
    frame,
    protocolId: "sig/heart-rate-measurement",
    kind: "heart-rate",
    values: [
      { name: "bpm", value: bpm, unit: "bpm", inPlausibleRange: valid },
    ],
    confidence: valid ? 0.95 : 0.6,
    reasons: [
      "SIG standard Heart Rate Measurement (0x2A37)",
      is16bit ? "flags indicate 16-bit BPM" : "flags indicate 8-bit BPM",
    ],
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
      { name: "celsius", value: celsius, unit: "°C", inPlausibleRange: valid },
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
      { name: "humidity", value: percent, unit: "%", inPlausibleRange: valid },
    ],
    confidence: valid ? 0.85 : 0.5,
    reasons: ["SIG standard Humidity (0x2A6F)"],
  };
}

function shortPayload(
  frame: DecodedFrame,
  kind: "battery" | "heart-rate" | "temperature" | "status",
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
