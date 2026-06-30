# OpenRing

> The open platform for smart rings.

OpenRing is an open-source platform for working with smart rings independently of vendor apps — inspecting their Bluetooth protocols, decoding their data, and building your own experiences on top.

This repo is a monorepo containing the desktop inspector, mobile app, shared packages, and device profiles.

## Structure

```
openring/
├── apps/
│   ├── inspector/      # Desktop inspector (Tauri + React)
│   └── mobile/         # Mobile health app (planned)
├── packages/
│   ├── core/           # Cross-platform core SDK
│   ├── ble/            # BLE abstractions
│   ├── parser/         # Packet parsing and inference
│   ├── protocol/       # Protocol definitions
│   └── ui/             # Shared UI components & design tokens
├── devices/            # Device profiles (Optim Ring, etc.)
├── docs/               # Vision, architecture, contributing
└── tools/              # Reverse engineering & dev tools
```

## Roadmap

- **Phase 1 — Inspector**: Scan, connect, inspect services/characteristics, log packets.
- **Phase 2 — Protocol Explorer**: Pattern recognition, packet classification with confidence scores.
- **Phase 3 — SDK**: TypeScript first, then Python and Swift.
- **Phase 4 — Mobile**: Cross-platform health app on top of the SDK.

## Quick start

Prerequisites: Node 20+, Rust (stable), pnpm or npm.

```bash
npm install
npm run inspector:tauri   # launch the inspector desktop app
```

See [`docs/`](./docs) for the full vision, architecture, and contribution guide.

## License

MIT — see [LICENSE](./LICENSE).
