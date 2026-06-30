# @openring/uuid

Turn raw BLE UUIDs into something a human can read.

```ts
import { lookup } from "@openring/uuid";

lookup("0000180f-0000-1000-8000-00805f9b34fb");
// → { name: "Battery", category: "sig-service", shortId: "0x180F", uuid: "…" }

lookup("00002a19-0000-1000-8000-00805f9b34fb");
// → { name: "Battery Level", category: "sig-characteristic", shortId: "0x2A19", uuid: "…" }

lookup("6e400003-b5a3-f393-e0a9-e50e24dcca9e");
// → { name: "Nordic UART RX (device → host)", category: "vendor-characteristic",
//     vendor: "Nordic Semiconductor", uuid: "…" }

lookup("d0611e78-bbb4-4591-a5f8-487910ae4366");
// → { name: "Apple Continuity Service", category: "vendor-service", vendor: "Apple" }

lookup("ffb0");      // short form → expands to full 128-bit, then lookup
lookup("FFFFFFFF-…"); // unknown → { name: null, category: "unknown" }
```

## What it knows

- **Bluetooth SIG services** — practical subset (~50). Battery, Heart Rate, Device Information, Current Time, Cycling Power, Pulse Oximeter, etc.
- **Bluetooth SIG characteristics** — practical subset (~150). Battery Level, Heart Rate Measurement, Model Number String, Manufacturer Name String, etc.
- **Vendor 128-bit UUIDs**:
  - Nordic UART (Service + TX + RX) — used by basically every cheap whitelabel wearable
  - Apple Continuity / Nearby / ANCS / AMS
  - Texas Instruments OAD (Image Identify, Image Block)

## Coverage philosophy

Curated, not exhaustive. We add entries when we actually encounter them
on a device OpenRing supports. If you see an unknown UUID and can name
it confidently, send a PR — the tables are plain TypeScript objects, no
build step.

The Bluetooth Base UUID pattern (`0000XXXX-0000-1000-8000-00805f9b34fb`)
is recognised automatically — adding a new SIG entry is one line.
