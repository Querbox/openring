/**
 * Quick sanity run for the decoder + parser pipeline.
 *
 *   node --experimental-strip-types tools/decoder-smoke.ts
 *
 * Feeds the Optim Ring's first observed notification through Decoder
 * and Parser and prints the structured result. Useful when iterating on
 * the heuristic or the protocol schema.
 */

import { decode } from "../packages/decoder/src/index.ts";
import { classify } from "../packages/parser/src/index.ts";
import type { ProtocolDefinition } from "../packages/protocol/src/index.ts";

const packet = {
  timestamp: Date.now(),
  characteristicUuid: "6e400003-b5a3-f393-e0a9-e50e24dcca9e",
  direction: "in" as const,
  bytes: new Uint8Array([
    0x73, 0x0c, 0x1e, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0x9d,
  ]),
};

const frame = decode(packet);

console.log("── Decoded frame ─────────────────────────────");
console.log("unknown:  ", frame.unknown);
console.log("warnings: ", frame.warnings);
console.log("checksum: ", frame.checksum);
console.log("fields:");
for (const f of frame.fields) {
  const value =
    f.value instanceof Uint8Array
      ? `[${[...f.value].map((b) => b.toString(16).padStart(2, "0")).join(" ")}]`
      : `0x${f.value.toString(16).padStart(2, "0")} (${f.value})`;
  console.log(`  ${f.name.padEnd(9)} @${f.offset} len=${f.length}  ${value}`);
  if (f.note) console.log(`              note: ${f.note}`);
}

// Pretend we already know this is the Optim Ring heart-rate-ish notification,
// just to see what classify() emits when a definition matches.
const speculative: ProtocolDefinition[] = [
  {
    id: "optim-ring/notif-0x73-speculative",
    device: "optim-ring",
    kind: "status",
    description:
      "Speculative: opcode 0x73 with 12-byte payload on UART RX. Real meaning unknown.",
    matcher: {
      opcode: 0x73,
      characteristicUuid: "6e400003-b5a3-f393-e0a9-e50e24dcca9e",
      direction: "in",
    },
    fields: [
      { name: "byte0", payloadOffset: 0, length: 1, kind: "u8" },
      { name: "tail", payloadOffset: 1, length: 11, kind: "bytes" },
    ],
    baseConfidence: 0.4,
    notes: "Placeholder — do NOT promote to packages/protocol/ until verified.",
  },
];

const event = classify(frame, speculative);

console.log("\n── Semantic event ────────────────────────────");
console.log("kind:       ", event.kind);
console.log("protocolId: ", event.protocolId);
console.log("confidence: ", event.confidence.toFixed(2));
console.log("reasons:");
for (const r of event.reasons) console.log(`  • ${r}`);
console.log("values:");
for (const v of event.values) {
  const value =
    v.value instanceof Uint8Array
      ? `[${[...v.value].map((b) => b.toString(16).padStart(2, "0")).join(" ")}]`
      : v.value;
  console.log(
    `  ${v.name.padEnd(8)} ${value}${v.unit ? " " + v.unit : ""}  inRange=${v.inPlausibleRange}`,
  );
}
