import type { SemanticKind } from "@openring/core";
import type { DecodedField, DecodedFrame } from "@openring/decoder";
import type {
  ProtocolDefinition,
  ProtocolMatcher,
  SemanticField,
} from "@openring/protocol";
import { readField } from "./extract.ts";
import { classifyAsSig } from "./sig.ts";

export interface SemanticValue {
  name: string;
  value: number | Uint8Array;
  unit?: string;
  /** True if value is inside the field's plausibleRange (or no range was declared). */
  inPlausibleRange: boolean;
  /** Free-form note if extraction failed (out of bounds, bad BCD, …). */
  error?: string;
}

export interface SemanticEvent {
  frame: DecodedFrame;
  /** The matched ProtocolDefinition's id, or undefined for unknown. */
  protocolId?: string;
  kind: SemanticKind;
  values: SemanticValue[];
  /** Confidence 0..1. */
  confidence: number;
  reasons: string[];
}

const CHECKSUM_BONUS = 0.15;
const FIELD_IN_RANGE_BONUS = 0.05;
const FIELD_OUT_OF_RANGE_PENALTY = 0.1;

export { readField } from "./extract.ts";

/**
 * Run every protocol definition against the decoded frame, keep the one
 * with the highest computed confidence. Returns a SemanticEvent tagged
 * with kind "unknown" when nothing matches.
 */
export function classify(
  frame: DecodedFrame,
  protocols: ProtocolDefinition[],
): SemanticEvent {
  const sig = classifyAsSig(frame);
  if (sig && sig.confidence > 0) return sig;

  const candidates: SemanticEvent[] = [];
  for (const def of protocols) {
    if (!matches(def.matcher, frame)) continue;
    candidates.push(applyDefinition(def, frame));
  }
  if (candidates.length === 0) {
    return {
      frame,
      kind: "unknown",
      values: [],
      confidence: 0,
      reasons: ["no ProtocolDefinition matched the decoded frame"],
    };
  }
  candidates.sort((a, b) => b.confidence - a.confidence);
  return candidates[0]!;
}

function matches(m: ProtocolMatcher, frame: DecodedFrame): boolean {
  if (m.characteristicUuid !== undefined) {
    if (
      frame.raw.characteristicUuid.toLowerCase() !==
      m.characteristicUuid.toLowerCase()
    ) {
      return false;
    }
  }
  if (m.direction !== undefined && frame.raw.direction !== m.direction) {
    return false;
  }
  if (m.totalLength !== undefined && frame.raw.bytes.length !== m.totalLength) {
    return false;
  }
  if (m.opcode !== undefined) {
    const opcode = findField(frame, "opcode");
    if (typeof opcode !== "number" || opcode !== m.opcode) return false;
  }
  if (m.payloadLength !== undefined) {
    const payload = findField(frame, "payload");
    if (!(payload instanceof Uint8Array) || payload.length !== m.payloadLength) {
      return false;
    }
  }
  return true;
}

function findField(
  frame: DecodedFrame,
  name: DecodedField["name"],
): number | Uint8Array | undefined {
  return frame.fields.find((f) => f.name === name)?.value;
}

function applyDefinition(
  def: ProtocolDefinition,
  frame: DecodedFrame,
): SemanticEvent {
  const reasons: string[] = [`opcode and matcher fields satisfy "${def.id}"`];
  let confidence = def.baseConfidence;

  if (frame.checksum?.valid) {
    confidence += CHECKSUM_BONUS;
    reasons.push(`checksum (${frame.checksum.algorithm}) valid`);
  } else if (frame.checksum && frame.checksum.algorithm === "unknown") {
    reasons.push("checksum algorithm could not be identified");
  }

  const payload = findField(frame, "payload");
  if (!(payload instanceof Uint8Array)) {
    return {
      frame,
      protocolId: def.id,
      kind: def.kind,
      values: [],
      confidence: clamp(confidence),
      reasons: [...reasons, "frame has no payload field — no fields extracted"],
    };
  }

  const values = def.fields.map((field) =>
    extractValue(field, payload, reasons, (delta) => {
      confidence += delta;
    }),
  );

  return {
    frame,
    protocolId: def.id,
    kind: def.kind,
    values,
    confidence: clamp(confidence),
    reasons,
  };
}

function extractValue(
  field: SemanticField,
  payload: Uint8Array,
  reasons: string[],
  bump: (delta: number) => void,
): SemanticValue {
  let raw: number | Uint8Array;
  try {
    raw = readField(payload, field.payloadOffset, field.length, field.kind);
  } catch (err) {
    const error = err instanceof Error ? err.message : String(err);
    reasons.push(`field "${field.name}" unreadable: ${error}`);
    return {
      name: field.name,
      value: new Uint8Array(),
      inPlausibleRange: false,
      ...(field.unit !== undefined ? { unit: field.unit } : {}),
      error,
    };
  }

  const scaled =
    typeof raw === "number" && field.scale !== undefined
      ? raw * field.scale
      : raw;

  let inRange = true;
  if (field.plausibleRange && typeof scaled === "number") {
    inRange =
      scaled >= field.plausibleRange.min && scaled <= field.plausibleRange.max;
    if (inRange) {
      bump(FIELD_IN_RANGE_BONUS);
      reasons.push(`field "${field.name}" within plausible range`);
    } else {
      bump(-FIELD_OUT_OF_RANGE_PENALTY);
      reasons.push(
        `field "${field.name}" value ${scaled} outside plausible range [${field.plausibleRange.min}, ${field.plausibleRange.max}]`,
      );
    }
  }

  return {
    name: field.name,
    value: scaled,
    inPlausibleRange: inRange,
    ...(field.unit !== undefined ? { unit: field.unit } : {}),
  };
}

function clamp(n: number): number {
  if (n < 0) return 0;
  if (n > 1) return 1;
  return n;
}
