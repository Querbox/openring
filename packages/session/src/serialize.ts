import type { SessionEvent, SessionHeader } from "./types.ts";
import { SESSION_FORMAT_VERSION } from "./types.ts";

export function bytesToHex(bytes: Uint8Array): string {
  let out = "";
  for (let i = 0; i < bytes.length; i++) {
    out += bytes[i]!.toString(16).padStart(2, "0");
  }
  return out;
}

export function hexToBytes(hex: string): Uint8Array {
  const clean = hex.replace(/\s+/g, "").toLowerCase();
  if (clean.length % 2 !== 0) {
    throw new Error(`hex string has odd length: ${clean.length}`);
  }
  const out = new Uint8Array(clean.length / 2);
  for (let i = 0; i < out.length; i++) {
    const byte = parseInt(clean.slice(i * 2, i * 2 + 2), 16);
    if (Number.isNaN(byte)) throw new Error(`bad hex at offset ${i * 2}`);
    out[i] = byte;
  }
  return out;
}

export function serialize(
  header: SessionHeader,
  events: SessionEvent[],
): string {
  let out = JSON.stringify(header) + "\n";
  for (const event of events) {
    out += JSON.stringify(event) + "\n";
  }
  return out;
}

export interface ParseResult {
  header: SessionHeader;
  events: SessionEvent[];
  /** Lines we couldn't parse — likely truncated trailing line. */
  skipped: Array<{ lineNumber: number; reason: string }>;
}

export function parse(jsonl: string): ParseResult {
  const lines = jsonl.split(/\r?\n/);
  const skipped: ParseResult["skipped"] = [];
  let header: SessionHeader | null = null;
  const events: SessionEvent[] = [];

  for (let i = 0; i < lines.length; i++) {
    const raw = lines[i]!;
    if (raw.trim().length === 0) continue;
    let parsed: unknown;
    try {
      parsed = JSON.parse(raw);
    } catch (err) {
      skipped.push({
        lineNumber: i + 1,
        reason: err instanceof Error ? err.message : String(err),
      });
      continue;
    }
    if (header === null) {
      if (!isHeader(parsed)) {
        throw new Error(
          `expected session header on first non-blank line, got: ${raw.slice(0, 60)}`,
        );
      }
      if (parsed.version !== SESSION_FORMAT_VERSION) {
        throw new Error(
          `unsupported session format version: ${parsed.version}`,
        );
      }
      header = parsed;
      continue;
    }
    if (isEvent(parsed)) {
      events.push(parsed);
    } else {
      skipped.push({ lineNumber: i + 1, reason: "unknown line shape" });
    }
  }

  if (header === null) throw new Error("session is empty");
  return { header, events, skipped };
}

function isHeader(v: unknown): v is SessionHeader {
  return (
    typeof v === "object" &&
    v !== null &&
    "kind" in v &&
    (v as { kind: string }).kind === "header"
  );
}

function isEvent(v: unknown): v is SessionEvent {
  if (typeof v !== "object" || v === null || !("kind" in v)) return false;
  const kind = (v as { kind: string }).kind;
  return (
    kind === "scan-result" ||
    kind === "connect" ||
    kind === "disconnect" ||
    kind === "discover" ||
    kind === "subscribe" ||
    kind === "unsubscribe" ||
    kind === "notify" ||
    kind === "write" ||
    kind === "note"
  );
}
