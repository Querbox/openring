# Contributing

OpenRing is open source. The cleanest contributions are:

- **A new device profile** in `devices/<your-ring>/profile.md`.
- **A protocol definition** in `packages/protocol/` for a packet you've decoded.
- **A bug fix** in the Inspector or any package.
- **Design polish** — better empty states, animations, copy.

## Development

```bash
npm install
npm run inspector:tauri   # launch the inspector desktop app
```

You'll need:

- Node 20+
- Rust (stable) for the Inspector's Tauri shell
- macOS, Linux, or Windows with a working BLE stack

## Commit style

Conventional Commits:

- `feat(inspector): packet logger panel`
- `fix(parser): off-by-one in checksum calculator`
- `docs(optim-ring): record heart-rate packet`

## Reverse engineering checklist

Before you push a protocol definition to `packages/protocol/`, confirm:

1. You captured the packet at least twice and the bytes that should be constant are constant.
2. You can explain every byte you decode or you've marked it `unknown`.
3. You've recorded the capture as a `.hex` file in the device's `captures/` folder.
4. The packet doesn't contain anything personal (cleared from the ring beforehand, or scrubbed).

We don't merge "I think this might be heart rate" without at least two captures and a confidence note.
