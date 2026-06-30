import type { SemanticKind } from "@openring/core";

/**
 * Protocol registry — declarative descriptions of known smart ring
 * commands, responses, and notifications.
 *
 * This package is **pure data**. It has no runtime code dependencies on
 * `@openring/decoder` or `@openring/parser` — those packages *consume*
 * these definitions and apply them. That separation lets device
 * profiles ship as JSON later without having to import any of our
 * runtime code.
 */

/**
 * Numeric encoding of a payload field. Names follow the Rust convention
 * (`u8`, `u16le`, `i16be`, …) because BLE protocols are little-endian
 * by default but a meaningful subset of cheap devices use big-endian.
 */
export type FieldKind =
  | "u8"
  | "u16le"
  | "u16be"
  | "u32le"
  | "u32be"
  | "i8"
  | "i16le"
  | "i16be"
  | "bcd"
  | "bytes";

export interface PlausibleRange {
  min: number;
  max: number;
}

export interface SemanticField {
  /** Human-readable name surfaced in the UI. */
  name: string;
  /** Position relative to the decoded *payload*, not the whole packet. */
  payloadOffset: number;
  length: number;
  kind: FieldKind;
  /** Multiplier applied to the raw numeric value. */
  scale?: number;
  /** Display unit. Free-form so devices can use whatever they emit. */
  unit?: string;
  /**
   * Plausibility range for sanity-checking. A value outside this range
   * drops the parser's confidence for the protocol as a whole.
   */
  plausibleRange?: PlausibleRange;
}

/**
 * Conditions the decoded frame must satisfy for this definition to
 * apply. Matching is conjunctive — every present condition must hold.
 */
export interface ProtocolMatcher {
  opcode?: number;
  totalLength?: number;
  payloadLength?: number;
  characteristicUuid?: string;
  direction?: "in" | "out";
}

export interface ProtocolDefinition {
  id: string;
  /** Folder name in `devices/` this definition belongs to. */
  device: string;
  kind: SemanticKind;
  description?: string;
  matcher: ProtocolMatcher;
  fields: SemanticField[];
  /**
   * Base confidence the matcher contributes when it matches (0..1).
   * The parser adjusts this based on checksum validity and field
   * plausibility.
   */
  baseConfidence: number;
  notes?: string;
}

/**
 * The global registry. Empty until we ship the first real definition
 * (the Optim Ring `73 0C 1E … 9D` notification is the prime candidate
 * — pending a confirmed checksum algorithm from live captures).
 */
export const protocols: ProtocolDefinition[] = [];
