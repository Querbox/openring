import type { RingPacket } from "@openring/core";

/**
 * A single field the Decoder extracted from a raw packet.
 *
 * Fields are *structural*, not semantic — they say "byte 0 is the opcode"
 * but not "this opcode means heart rate". Semantic interpretation is the
 * Parser's job (see `@openring/parser`).
 */
export interface DecodedField {
  name: string;
  offset: number;
  length: number;
  /**
   * For 1-, 2-, or 4-byte integer fields the Decoder lifts to a number.
   * Multi-byte payloads stay as `Uint8Array`.
   */
  value: number | Uint8Array;
  /**
   * Optional human note explaining *why* the Decoder thinks this field
   * exists at this offset — useful when the framing is heuristic.
   */
  note?: string;
}

export interface ChecksumResult {
  algorithm: "xor" | "sum" | "crc8" | "unknown";
  value: number;
  computed?: number;
  valid?: boolean;
}

/**
 * The Decoder's output for one packet.
 *
 * Always returns *something* — even if the framing is unknown the raw
 * bytes still pass through. Consumers branch on `unknown === true`.
 */
export interface DecodedFrame {
  raw: RingPacket;
  fields: DecodedField[];
  checksum?: ChecksumResult;
  /** True if the Decoder could not apply any structural framing. */
  unknown: boolean;
  warnings: string[];
}

/**
 * A Decoder is stateless: same bytes in → same DecodedFrame out.
 *
 * Devices that have a known framing scheme register their own decoder;
 * everything else falls through to the generic heuristic decoder.
 */
export interface FrameDecoder {
  id: string;
  /** True if this decoder claims responsibility for the packet. */
  matches(packet: RingPacket): boolean;
  decode(packet: RingPacket): DecodedFrame;
}
