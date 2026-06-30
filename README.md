# OpenRing

> The open platform for smart rings.

![status](https://img.shields.io/badge/status-early%20WIP-orange?style=flat-square)
![license](https://img.shields.io/badge/license-MIT-blue?style=flat-square)
![phase](https://img.shields.io/badge/phase-1%20Inspector-8b5cf6?style=flat-square)

> ⚠️ **Very early work in progress.** OpenRing is at the scaffolding stage.
> The desktop Inspector compiles and can already scan, connect, and stream
> notifications from BLE rings on macOS — but **no protocol has been
> decoded yet**, the SDK is unstable, and nothing here is ready for users.
> Expect breaking changes everywhere. Star the repo if you want to follow
> along.

OpenRing is an open-source platform for working with smart rings independently of vendor apps — inspecting their Bluetooth protocols, decoding their data, and building your own experiences on top.

This repo is a monorepo containing the desktop inspector, mobile app (planned), shared packages, and per-device profiles.

## Status

Overall progress against the long-term vision: roughly **~12%**.

```text
Phase 1 — Inspector            ████████░░░░░░░░░░░░  40 %
Phase 2 — Protocol Explorer    █░░░░░░░░░░░░░░░░░░░   5 %
Phase 3 — SDK                  ██░░░░░░░░░░░░░░░░░░  10 %
Phase 4 — OpenRing Mobile      ░░░░░░░░░░░░░░░░░░░░   0 %
─────────────────────────────────────────────────────────
Design system                  ███████░░░░░░░░░░░░░  35 %
Device profiles                ████░░░░░░░░░░░░░░░░  20 %
Public docs                    █████░░░░░░░░░░░░░░░  25 %
```

### Phase 1 — Inspector  `40 %`

The first deliverable: a desktop tool that can find a smart ring on Bluetooth and let you watch its traffic.

- [x] Monorepo scaffold (npm workspaces, TypeScript, Tauri 2 + React)
- [x] Design tokens + dark glassmorphism shell (Linear / Raycast aesthetic)
- [x] Rust BLE backend using `btleplug` — scan, connect, discover, subscribe, write
- [x] Live device list (RSSI-sorted) and full GATT services tree
- [x] Packet logger with hex dump, timestamps, RX/TX direction
- [ ] Hex / text TX input for sending commands to the ring
- [ ] Capture export (`.hex` files) and replay
- [ ] Settings panel + polished error / empty states
- [ ] First-run BLE permission flow on Linux & Windows

### Phase 2 — Protocol Explorer  `5 %`

Pattern recognition over captured packets. Show a guess and a confidence:
"Possible Battery Packet — 87 %".

- [x] Package stubs (`@openring/parser`, `@openring/protocol`)
- [ ] First decoded packet → real `ProtocolDefinition`
- [ ] Confidence scoring rendered in the Inspector
- [ ] Pattern grouping (repeating opcodes, length prefixes, checksums)
- [ ] Auto-suggest field boundaries from observed variance

### Phase 3 — OpenRing SDK  `10 %`

A library so other people can build apps on top of OpenRing without
re-inventing the BLE layer.

- [x] Core types + transport-agnostic `BleAdapter` interface
- [ ] Stable TypeScript public API
- [ ] Python bindings (for data science / ad-hoc reverse engineering)
- [ ] Swift bindings (for iOS apps)
- [ ] Documented protocol contract per supported device

### Phase 4 — OpenRing Mobile  `0 %`

An open health app built on the SDK. Not started.

### Cross-cutting tracks

- **Design system** `35 %` — tokens (colors / spacing / typography / motion) live in `@openring/ui`; component library still to come.
- **Device profiles** `20 %` — Optim Ring profile is the only one and still has more unknowns than knowns.
- **Public docs** `25 %` — vision, architecture, contributing guide live in `docs/`; protocol documentation per device pending Phase 2.

## Structure

```
openring/
├── apps/
│   ├── inspector/      # Desktop inspector (Tauri + React)
│   └── mobile/         # Mobile health app (planned)
├── packages/
│   ├── core/           # Cross-platform core SDK types
│   ├── ble/            # BLE adapter interface
│   ├── parser/         # Packet parsing and inference
│   ├── protocol/       # Protocol definitions
│   └── ui/             # Shared UI components & design tokens
├── devices/            # Device profiles (Optim Ring, etc.)
├── docs/               # Vision, architecture, contributing
└── tools/              # Reverse engineering & dev scripts
```

## Quick start

Prerequisites: Node 20+, Rust (stable), npm.

```bash
npm install
npm run inspector:tauri   # launch the inspector desktop app
```

First launch on macOS triggers a Bluetooth permission prompt.

See [`docs/`](./docs) for the full vision, architecture, and contribution guide.

## Contributing

Early-stage, but contributions are welcome. The most useful things right now:

1. **Device profiles** — own a smart ring? Add a profile in `devices/<your-ring>/`.
2. **Protocol captures** — connect with the Inspector, subscribe, share what you observe.
3. **Design polish** — better empty states, animations, copy.

See [`docs/contributing.md`](./docs/contributing.md).

## License

MIT — see [LICENSE](./LICENSE).
