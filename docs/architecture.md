# Architecture

OpenRing is a TypeScript monorepo today, with one desktop app and a planned
mobile app on top of shared packages. The backend transport layer is written
in Rust where it sits closest to the OS (the Inspector's Tauri shell).

```
┌──────────────────────────────┐    ┌────────────────────────────┐
│  apps/inspector              │    │  apps/mobile (planned)     │
│  Tauri + React + TS          │    │  React Native / Swift / KMP │
└──────────────┬───────────────┘    └──────────────┬─────────────┘
               │                                   │
               └─────────────┬─────────────────────┘
                             │
                ┌────────────▼────────────┐
                │  @openring/core         │  device, session, packet types
                ├─────────────────────────┤
                │  @openring/ble          │  transport-agnostic adapter
                │  @openring/parser       │  packet → classification
                │  @openring/protocol     │  packet definitions
                │  @openring/ui           │  tokens + shared components
                └─────────────────────────┘
                             │
                ┌────────────▼────────────┐
                │  Platform BLE backends  │
                │  • Tauri/Rust (desktop) │
                │  • CoreBluetooth (iOS)  │
                │  • Android BLE          │
                └─────────────────────────┘
```

## Layering rules

1. **`core` knows nothing.** Pure types.
2. **`ble` depends on `core` only.** It's an interface — implementations live
   next to each platform.
3. **`protocol` depends on `core` only.** Pure data.
4. **`parser` depends on `core` and `protocol`.** Pure functions, no I/O.
5. **`ui` depends on `core`.** Components and tokens, no business logic.
6. **`apps` depend on whatever they need.** Apps are the only place where
   side effects, native code, and BLE adapters meet.

The Inspector ships its own Rust BLE adapter (likely `btleplug`) wired
into a class that implements `@openring/ble`'s `BleAdapter`. The mobile app
will do the same with native code.

## Why Tauri (not Electron)?

- Smaller binaries (~10 MB vs 150 MB).
- Real Rust BLE access via `btleplug` and the OS's native stack.
- Native window chrome without forcing a Chromium runtime.
- Aligns with our "modern, professional" aesthetic — no Electron bloat.

## Why TypeScript-first for the SDK?

- Largest community for developer tools (which is the SDK's first audience).
- Sharing code between Inspector and mobile app.
- Python and Swift bindings follow Phase 3 once the protocol surface is stable.

## Folder layout

| Path        | What lives here                                       |
| ----------- | ----------------------------------------------------- |
| `apps/`     | Runnable applications (inspector, mobile).            |
| `packages/` | Library code consumed by apps.                        |
| `devices/`  | Per-device profiles, captures, reverse engineering.   |
| `docs/`     | Vision, architecture, contributing, protocol guides.  |
| `tools/`    | One-off scripts (capture decoders, Python helpers).   |
