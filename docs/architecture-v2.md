# Architecture v2 — direction

> **This is a forward-looking spec, not the current state.** The repo today
> reflects v1: a Tauri Inspector with a Rust BLE backend, a packet logger, and
> a thin `parser` / `protocol` package split that conflates two
> responsibilities. v2 is what the next several Session 2+ commits will
> converge on.

## Why v2

v1 has two issues that show up fast as the project grows:

1. **`parser` and `protocol` overlap.** Both packages reach into raw bytes,
   neither owns "the meaning". Adding a second device means duplicating logic.
2. **The packet log throws away structure.** Bytes flow in and are rendered as
   hex. The moment we want to write a confidence ("Possible Battery Packet,
   87 %"), we need a structured intermediate representation.

v2 introduces a four-layer pipeline that gives each stage a single,
testable responsibility.

## The four-layer pipeline

```
Raw bytes  ─►  Decoder  ─►  Parser  ─►  Metrics
(BLE)         (framing)     (semantic)    (aggregated)
```

| Layer       | Input                       | Output                                  | Lives in                |
| ----------- | --------------------------- | --------------------------------------- | ----------------------- |
| **Decoder** | `RingPacket` (bytes)        | `DecodedFrame` (opcode, length, payload, checksum) | `@openring/decoder`     |
| **Parser**  | `DecodedFrame` + `ProtocolDefinition` | `SemanticEvent` (`{ kind: "heart-rate", value: 72 }`) | `@openring/parser`      |
| **Protocol** | — (declarative data)       | The `ProtocolDefinition[]` registry consumed by Parser | `@openring/protocol`    |
| **Metrics** | `SemanticEvent[]`           | Derived values (resting HR, sleep summary, trends) | `@openring/metrics`     |

Each layer is **stateless** and **pure** — same input, same output, no I/O.
Side effects live in the apps (`inspector`, `mobile`).

### Why this split is worth the extra packages

- The Decoder works **without** knowing what a packet means. You can frame
  bytes on a brand-new device before you've reverse-engineered a single
  opcode — and immediately see "looks like opcode 0x73, payload 12 bytes,
  checksum 0x9D".
- The Parser is **device-agnostic code** that reads `ProtocolDefinition`
  data. Adding a new ring = adding declarative `ProtocolDefinition`s in
  `@openring/protocol`, not writing new TypeScript.
- The Metrics layer is **shared between Inspector and the future mobile app**
  — both consume the same `SemanticEvent` stream.

## Sessions

The single highest-leverage feature for an open-source reverse engineering
community.

**Format: JSON Lines (`*.session.jsonl`).** First line is a header, every
subsequent line is one event:

```jsonl
{"kind":"header","version":1,"device":{"name":"R09_7206","hardware":"RT09_V3.1","firmware":"RT09_3.10.21_251107"},"started_at":1733000000000}
{"kind":"scan-result","ts":12,"id":"…","rssi":-58,"name":"R09_7206"}
{"kind":"connect","ts":1230,"id":"…"}
{"kind":"discover","ts":2100,"id":"…","services":[…]}
{"kind":"subscribe","ts":2200,"id":"…","characteristic":"6E400003-…"}
{"kind":"notify","ts":2280,"id":"…","characteristic":"6E400003-…","bytes":"730C1E…9D"}
{"kind":"write","ts":3001,"id":"…","characteristic":"6E400002-…","bytes":"00"}
{"kind":"disconnect","ts":9000,"id":"…"}
```

Why JSON Lines:

- **Diff-friendly.** GitHub renders line-by-line diffs cleanly. Paste a
  session into an issue and reviewers can comment on individual packets.
- **`jq`-friendly.** `jq 'select(.kind=="notify")' my.session.jsonl` works
  out of the box.
- **Append-only.** The recorder never has to rewrite the file.
- **Recoverable.** A truncated file still parses up to the last full line.

### One data model, two views

The **Device Timeline** in the Inspector and the `.session` file on disk are
the **same event stream**, rendered differently. There is no second
persistence layer — what you see in the Timeline panel is exactly what gets
written to disk, and exactly what an imported `.session` file replays into
the UI.

## Protocol Explorer — the flagship view

The Protocol Explorer is not a tab next to "Packet Logger" — it **is** the
view that makes OpenRing different from every other BLE tool.

It takes a packet and shows, in one column:

```
73 0C 1E 00 00 00 00 00 00 00 00 00 00 00 9D
                     ↓  Decoder
opcode:    0x73
length:    12
payload:   1E 00 00 00 00 00 00 00 00 00 00 00
checksum:  0x9D  (XOR-sum: ✓ valid)
                     ↓  Parser + Protocol registry
Possible:  Heart Rate response
Confidence: 87 %
Reason:    Opcode 0x73 matches RT09 family heart rate response;
           payload[0] within plausible BPM range (30).
```

Unknown packets show what the Decoder could infer, with a clear "no
ProtocolDefinition matches" badge — so the path from "unknown" to
"contribute a definition" is obvious to a contributor.

## Protocol Diff across firmware versions

A long-term feature that no other BLE tool ships:

- The Recorder tags every session with `firmware`.
- The Inspector can load two sessions (or two `devices/<ring>/profile.md`
  snapshots) from different firmware versions and surface differences:

  ```
  + Opcode 0x87 appeared in 3.11 (not in 3.10) — seen 4 times
  ~ Packet length for opcode 0x42 changed: 14 → 16 bytes
  - Opcode 0x6C no longer observed in 3.11
  ```

This is the kind of insight that takes a community-driven RE project from
"shared knowledge" to "actionable diffs".

## AI Assistant pane (later)

A right-edge panel that takes the Decoder + Parser output for the selected
packet and emits a natural-language suggestion. Deliberately **deferred**
until the Decoder pipeline produces structured context — without that, the
prompt would be "here are bytes, guess", and LLMs are bad at that. With
structured context, the prompt becomes "given this decoded frame and this
device's known opcodes, suggest the most likely meaning" — which is the
shape of task LLMs do well.

## Workspace layout (target)

```
┌───────────┬─────────────┬──────────────────────────┬──────────────┐
│           │             │                          │              │
│  Devices  │  Services   │  Packet Inspector        │ AI Assistant │
│           │  + Subscribe│  (decoded fields,        │  (suggestion)│
│           │             │   parser guess, hex)     │              │
│           │             │                          │              │
├───────────┴─────────────┴──────────────────────────┴──────────────┤
│  Timeline (live event stream / scrubber)                         │
└──────────────────────────────────────────────────────────────────┘
```

## Status

The pieces in this document map onto the README roadmap like this:

| v2 piece            | README phase                                  | State today  |
| ------------------- | --------------------------------------------- | ------------ |
| Decoder layer       | Phase 2 (Protocol Explorer)                   | scaffolded   |
| Parser layer        | Phase 2 (Protocol Explorer)                   | stub         |
| Protocol registry   | Phase 2 (Protocol Explorer)                   | stub         |
| Metrics layer       | Phase 3 (SDK) and Phase 4 (Mobile)            | planned      |
| Session recorder    | Phase 1 (Inspector) — recorder + replay UI    | planned      |
| Protocol Explorer   | Phase 2 (Protocol Explorer)                   | empty view   |
| Protocol Diff       | Phase 2 / Phase 3                             | vision       |
| AI Assistant        | post-Phase 2                                  | vision       |
