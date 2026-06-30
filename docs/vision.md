# Vision

OpenRing is **the open platform for smart rings**.

Smart rings have become powerful health sensors, but they live inside closed
vendor ecosystems: opaque protocols, single-purpose apps, no way to own your
own data. OpenRing fixes that.

We want:

- **Independence** — use smart rings without depending on vendor apps.
- **Transparency** — every protocol we touch is documented in the open.
- **A great experience** — modern, beautiful, fast. Not another developer-utility aesthetic.
- **Plurality** — one platform that supports many rings, not one app per vendor.

## Products

- **OpenRing Inspector** — desktop app for exploring BLE protocols.
- **OpenRing Core (SDK)** — TypeScript today, Python and Swift later.
- **OpenRing Mobile** — open health app on top of the SDK.
- **OpenRing Docs** — public protocol documentation.
- **Device profiles** — community-maintained per-ring specifications.

## Design philosophy

Aesthetic references: **Apple, Linear, Raycast, Arc.**
Not nRF Connect. Not Wireshark.

- Dark mode first.
- Generous spacing.
- Smooth, intentional motion.
- Glassmorphism used sparingly, for depth.
- Minimalist surface, deep functionality underneath.
- Professional, not playful.

The Inspector should look like a tool a designer wants to leave open on their
second monitor — not something they tolerate.

## Engineering principles

- Clean code, modular architecture.
- Reusable components.
- Tests for everything that decodes bytes.
- Documentation from day one.
- Cross-platform from day one.
- Open source from day one.

## What "done" looks like for Phase 1

- The Inspector can scan, connect, and stream notifications from the Optim Ring.
- A captured packet can be replayed and exported as a `.hex` file.
- The Optim Ring profile in `devices/optim-ring/` is filled out enough that
  a contributor can pick up the protocol work without prior context.
