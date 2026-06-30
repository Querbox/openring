# Optim Ring — device profile

The Optim Ring is OpenRing's first target device. This profile collects
everything observed so far. It's a living document — anything new the
Inspector or our manual scans pick up lands here.

## Identity

| Field            | Value                                  |
| ---------------- | -------------------------------------- |
| Product          | Optim Ring                             |
| Inner label      | "Smart Ring 9"                         |
| Advertised name  | `R09_7206`                             |
| Peripheral UUID  | `1B3D3B6A-7A1D-7470-1184-A37C7050DED5` (macOS/iOS CoreBluetooth identifier — randomized per host) |
| Hardware         | `RT09_V3.1`                            |
| Firmware         | `RT09_3.10.21_251107`                  |
| Battery (sample) | 32 %                                   |

### Charging case

| Field    | Value                                                  |
| -------- | ------------------------------------------------------ |
| Label    | "Smart Charging Case"                                  |
| Input    | 5 V / 1 A                                              |
| Battery  | 200 mAh                                                |
| BLE      | None observed — case is charging-only as of this scan. |

### Visible sensors

- PPG (heart rate)
- LEDs (PPG illumination)
- Charging contacts

### Plausible sensors (not yet confirmed by traffic)

Heart rate · HRV · skin temperature · sleep tracking · steps · motion · possibly SpO₂.

### Platform hypothesis

`RT09` strongly suggests a shared ODM/whitelabel platform — i.e. multiple
brands likely ship the same firmware under different names. Worth checking
against `Colmi R09` and similar white-label rings later; their protocol
documentation (if anyone has reversed it) probably applies here verbatim.

## GATT layout

### Standard GATT services

| Service           | Use            | Status                                          |
| ----------------- | -------------- | ----------------------------------------------- |
| Generic Access    | Standard       | —                                               |
| Generic Attribute | Standard       | —                                               |
| Device Information (`180A`) | Read-only metadata | Exposes Hardware Revision, Firmware Revision, System ID, Serial Number |
| Battery (`180F`)  | Battery level  | Currently reports 32 %                          |

### UART service — primary command channel

UUID: `6E40FFF0-B5A3-F393-E0A9-E50E24DCCA9E` (Nordic UART variant)

| Characteristic | UUID                                    | Properties                            | Role                         |
| -------------- | --------------------------------------- | ------------------------------------- | ---------------------------- |
| TX (host→ring) | `6E400002-B5A3-F393-E0A9-E50E24DCCA9E`  | Write, Write Without Response         | Commands from app to ring    |
| RX (ring→host) | `6E400003-B5A3-F393-E0A9-E50E24DCCA9E`  | Notify                                | Responses + event stream     |

This is the main app↔ring channel and the first target for the Inspector's
packet logger.

### `FFB0` — unknown service, candidate for sensor stream

| Characteristic | Properties                            |
| -------------- | ------------------------------------- |
| `FFB1`         | Read, Write Without Response          |
| `FFB2`         | Notify                                |
| `FFB4`         | Read, Write Without Response          |
| `FFB5`         | Notify                                |

The shape — two write characteristics each paired with a notify — looks
like a second request/response channel. Possibly bulk telemetry
(sample dumps, sleep history) while UART handles control. **To verify:**
subscribe to `FFB2` and `FFB5` and observe whether they emit periodically
or only after a write.

### Texas Instruments OTA — firmware update channel

| Characteristic   | Role                          |
| ---------------- | ----------------------------- |
| `Image Identify` | Negotiate firmware image meta |
| `Image Block`    | Transfer firmware bytes       |

Firmware updates over BLE are technically possible. **Hands-off** in
OpenRing for now: we do not flash this device until we have a verified
safe path back to factory firmware.

### Unknown vendor services

| UUID    | Characteristic properties              | Status                              |
| ------- | -------------------------------------- | ----------------------------------- |
| `FEA1`  | Notify, Read                           | Not analyzed                        |
| `FEA2`  | Read, Write, **Indicate**              | Not analyzed — Indicate is unusual; possibly an authenticated channel |
| `FEC9`  | Read                                   | Not analyzed                        |

## Captures

### 2026-06-29 — first notification on `6E400003`

```
73 0C 1E 00 00 00 00 00 00 00 00 00 00 00 9D
```

15 bytes. Working hypothesis:

| Bytes      | Hypothesis                                 |
| ---------- | ------------------------------------------ |
| `73`       | Opcode / packet type                       |
| `0C`       | Length (12 dec) — or sub-command           |
| `1E`       | Counter / status / data (30 dec)           |
| `00…00`    | Padding                                    |
| `9D`       | Checksum (XOR-sum is the common BLE choice)|

Stored verbatim in [`captures/2026-06-29-initial-notification.hex`](./captures/2026-06-29-initial-notification.hex).

### Manual write test — LightBlue, 2026-06-29

Sent `00` to UART TX (`6E400002`). No notification, no error from the ring.
LightBlue logged `Unknown Characteristic <>`.

Implications:

- Single-byte writes are silently accepted, so the ring is probably
  expecting framed packets (length prefix + opcode + payload + checksum)
  and discards malformed input.
- "Unknown Characteristic" is LightBlue not knowing the human-readable
  name for the UART UUID, not an error from the device.

## Reverse engineering status

| Known                                              | Unknown                                  |
| -------------------------------------------------- | ---------------------------------------- |
| ✅ All GATT services & characteristics              | ❌ Packet framing / protocol             |
| ✅ Firmware & hardware versions                     | ❌ Data structures                       |
| ✅ OTA service exists (TI OAD)                      | ❌ Command list                          |
| ✅ UART is the primary channel                      | ❌ Firmware binary                       |
| ✅ Standard Device Info fields readable             | ❌ Checksum algorithm (XOR? CRC8?)        |

## Open questions for Phase 1

1. Is the first 15-byte notification a handshake the ring sends on connect, or a periodic status?
2. Does the ring require a time-sync command before it emits sensor data? (Common pattern in this category.)
3. Which channel — UART, `FFB0/FFB2`, or `FFB0/FFB5` — carries heart-rate / SpO₂ telemetry?
4. Is there an auth/pair step? `FEA2`'s Indicate property suggests possibly yes.
5. Checksum scheme: XOR-sum vs CRC8 vs Fletcher? Run a few writes through each and compare against `9D`.

## Reference architecture (suspected)

```
Ring sensors
    │
    ▼
UART (or FFB0?) — framed packets, opcode + payload + checksum
    │
    ▼
Vendor mobile app — decodes, may run cloud sync
    │
    ▼
Vendor cloud
```

OpenRing's job: replace the vendor app with an open client, document the
protocol, and let users keep their data locally.
