# Optim Ring — device profile

The Optim Ring is the first target device for OpenRing. This profile collects everything we know so far. It's a living document — anything observed via the Inspector should land here.

## Identity

| Field        | Value                  |
| ------------ | ---------------------- |
| Advertised name | `R09_7206`          |
| Hardware     | `RT09_V3.1`            |
| Firmware     | `RT09_3.10.21_251107`  |
| Vendor       | Optim (OEM unconfirmed)|

## GATT layout

### UART service — primary command channel

UUID: `6E40FFF0-B5A3-F393-E0A9-E50E24DCCA9E`

| Characteristic | UUID prefix | Properties | Notes |
| -------------- | ----------- | ---------- | ----- |
| TX             | `6E400002`  | Write      | Host → ring commands |
| RX             | `6E400003`  | Notify     | Ring → host responses & event stream |

This is the main app↔ring channel and the first thing the Inspector should
target.

### DFU — Texas Instruments OTA

A Texas Instruments OTA service is exposed. This means firmware updates are
plausibly possible without going through the vendor app — but we treat this
as **read-only / hands-off** until we have a confirmed safe path.

### Additional services (to investigate)

| UUID    | Likely purpose             | Status        |
| ------- | -------------------------- | ------------- |
| `FEA1`  | Vendor-specific            | Not analyzed  |
| `FEA2`  | Vendor-specific            | Not analyzed  |
| `FEC9`  | Vendor-specific            | Not analyzed  |
| `180A`  | Device Information         | Standard GATT |
| `180F`  | Battery                    | Standard GATT |
| `FFB0`  | Vendor / health data?      | Not analyzed  |

## Captures

### Notification — 2026-06-29 (initial scan)

- **Characteristic**: `6E400003`
- **Payload (15 bytes)**: `73 0C 1E 00 00 00 00 00 00 00 00 00 00 00 9D`

Working hypothesis:

- `73` — possible packet type / command opcode
- `0C` — possible length or sub-command (12 decimal)
- `1E` — possibly a counter or status byte (30 decimal)
- `00…00` — padding
- `9D` — likely checksum (last byte)

To confirm: send a different command via TX, capture the response, see if the
last byte changes consistently with the preceding bytes (XOR sum is the
most common BLE checksum scheme).

## Open questions

- Which characteristic carries heart rate / SpO₂ telemetry — UART events, FFB0, or a vendor service?
- Does the ring stream continuously or only respond to host polls?
- What is the time sync command? (Most rings require a time-set on connect before they emit useful data.)
- Is there an authentication / handshake step before the ring will respond?
