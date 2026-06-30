import type { FieldKind } from "@openring/protocol";

/**
 * Read a typed value out of a payload at the given offset.
 *
 * The functions throw if the requested slice is out of bounds — the
 * parser catches and downgrades to "field unreadable" rather than
 * propagating, so a single bad field never tanks an entire match.
 */
export function readField(
  payload: Uint8Array,
  offset: number,
  length: number,
  kind: FieldKind,
): number | Uint8Array {
  if (offset < 0 || offset + length > payload.length) {
    throw new RangeError(
      `field at offset ${offset} length ${length} exceeds payload of ${payload.length} bytes`,
    );
  }
  switch (kind) {
    case "u8":
      return payload[offset]!;
    case "i8":
      return signedByte(payload[offset]!);
    case "u16le":
      return readU16(payload, offset, "le");
    case "u16be":
      return readU16(payload, offset, "be");
    case "i16le":
      return signedShort(readU16(payload, offset, "le"));
    case "i16be":
      return signedShort(readU16(payload, offset, "be"));
    case "u32le":
      return readU32(payload, offset, "le");
    case "u32be":
      return readU32(payload, offset, "be");
    case "bcd":
      return readBcd(payload, offset, length);
    case "bytes":
      return payload.slice(offset, offset + length);
  }
}

function signedByte(b: number): number {
  return b > 0x7f ? b - 0x100 : b;
}

function signedShort(s: number): number {
  return s > 0x7fff ? s - 0x10000 : s;
}

function readU16(p: Uint8Array, off: number, endian: "le" | "be"): number {
  return endian === "le"
    ? p[off]! | (p[off + 1]! << 8)
    : (p[off]! << 8) | p[off + 1]!;
}

function readU32(p: Uint8Array, off: number, endian: "le" | "be"): number {
  return endian === "le"
    ? (p[off]! | (p[off + 1]! << 8) | (p[off + 2]! << 16) | (p[off + 3]! << 24)) >>>
        0
    : ((p[off]! << 24) | (p[off + 1]! << 16) | (p[off + 2]! << 8) | p[off + 3]!) >>>
        0;
}

function readBcd(p: Uint8Array, off: number, length: number): number {
  let acc = 0;
  for (let i = 0; i < length; i++) {
    const byte = p[off + i]!;
    const hi = (byte >> 4) & 0x0f;
    const lo = byte & 0x0f;
    if (hi > 9 || lo > 9) {
      throw new RangeError(`byte 0x${byte.toString(16)} is not valid BCD`);
    }
    acc = acc * 100 + hi * 10 + lo;
  }
  return acc;
}
