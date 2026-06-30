# @openring/parser

The second layer of the OpenRing decoder pipeline.

> bytes ─► Decoder ─► **Parser** ─► Metrics

The Parser takes a `DecodedFrame` from `@openring/decoder` and a list
of `ProtocolDefinition`s from `@openring/protocol`, finds the best
match, extracts typed values from the payload, and emits a
`SemanticEvent` with a confidence score.

## Usage

```ts
import { decode } from "@openring/decoder";
import { protocols } from "@openring/protocol";
import { classify } from "@openring/parser";

const frame = decode(packet);
const event = classify(frame, protocols);

// event.kind          — "heart-rate" | "battery" | … | "unknown"
// event.values        — [{ name: "bpm", value: 72, unit: "bpm", inPlausibleRange: true }]
// event.confidence    — 0..1
// event.reasons       — array of strings explaining the score
// event.protocolId    — id of the matching ProtocolDefinition (or undefined)
```

## Confidence scoring

Starts from the matched definition's `baseConfidence`, then:

| Signal                                      | Adjustment |
| ------------------------------------------- | ---------- |
| Checksum valid (per Decoder)                | + 0.15     |
| Field value inside `plausibleRange`         | + 0.05     |
| Field value outside `plausibleRange`        | − 0.10     |

Clamped to `[0, 1]`. The `reasons` array spells out every contributor
so the Protocol Explorer can show "why 83 %, not 95 %".

## Picking the best match

When more than one `ProtocolDefinition` matches the frame, the Parser
keeps the one with the highest computed confidence. Ties resolve in
registration order, deterministic across runs.

## Unknown packets

If no definition matches, the Parser returns
`{ kind: "unknown", confidence: 0, reasons: ["no ProtocolDefinition matched …"] }`
— still a `SemanticEvent`, so UI code never has to special-case the
"nothing matched" path.
