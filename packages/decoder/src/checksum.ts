/**
 * Checksum algorithms commonly used in cheap BLE peripheral firmware.
 *
 * The Decoder tries a handful in order and reports which one (if any)
 * matches the trailing byte — that's how we figure out the framing
 * scheme on a device we haven't reversed yet.
 */

export function xorSum(bytes: Uint8Array): number {
  let acc = 0;
  for (let i = 0; i < bytes.length; i++) acc ^= bytes[i]!;
  return acc & 0xff;
}

export function byteSum(bytes: Uint8Array): number {
  let acc = 0;
  for (let i = 0; i < bytes.length; i++) acc = (acc + bytes[i]!) & 0xff;
  return acc;
}

/**
 * CRC-8 with the polynomial 0x07 (CCITT). The most common 8-bit CRC on
 * embedded BLE devices.
 */
export function crc8(bytes: Uint8Array): number {
  let crc = 0;
  for (let i = 0; i < bytes.length; i++) {
    crc ^= bytes[i]!;
    for (let bit = 0; bit < 8; bit++) {
      crc = crc & 0x80 ? ((crc << 1) ^ 0x07) & 0xff : (crc << 1) & 0xff;
    }
  }
  return crc;
}

export interface ChecksumGuess {
  algorithm: "xor" | "sum" | "crc8" | "unknown";
  computed: number;
  valid: boolean;
}

/**
 * Try every supported algorithm against `body` (everything except the
 * last byte) and return the first one whose computed value equals the
 * `claimed` checksum byte. If nothing matches, returns "unknown".
 */
export function identifyChecksum(
  body: Uint8Array,
  claimed: number,
): ChecksumGuess {
  const candidates: Array<{
    algorithm: "xor" | "sum" | "crc8";
    fn: (b: Uint8Array) => number;
  }> = [
    { algorithm: "xor", fn: xorSum },
    { algorithm: "sum", fn: byteSum },
    { algorithm: "crc8", fn: crc8 },
  ];
  for (const c of candidates) {
    const computed = c.fn(body);
    if (computed === claimed) {
      return { algorithm: c.algorithm, computed, valid: true };
    }
  }
  return { algorithm: "unknown", computed: 0, valid: false };
}
