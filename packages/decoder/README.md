# @openring/decoder

The first layer of the OpenRing decoder pipeline.

> bytes ─► **Decoder** ─► Parser ─► Metrics

The Decoder is **structural**, not semantic. It splits a `RingPacket`
into fields — opcode, length, payload, checksum — without claiming to
know what the bytes mean. Semantic interpretation lives in
`@openring/parser`.

## Usage

```ts
import { decode } from "@openring/decoder";

const frame = decode(packet);

// frame.fields    — opcode / length / payload / checksum
// frame.checksum  — { algorithm: "xor", value, computed, valid }
// frame.unknown   — true if the heuristic couldn't apply
// frame.warnings  — human notes when something looks off
```

## How the heuristic works

The default `HeuristicByteFrameDecoder` assumes the most common cheap-BLE
framing:

```
byte 0       opcode
byte 1       length
bytes 2..    payload
last byte    checksum (XOR-sum / byte-sum / CRC-8)
```

It tries XOR, byte-sum, and CRC-8 against the body and reports which one
matches the trailing byte. A match strongly suggests the framing is real.

When the heuristic can't find a checksum match **and** the length byte
disagrees with the payload size, the frame is marked `unknown` and the
Protocol Explorer surfaces it as "framing not detected".

## Device-specific decoders

Real devices register their own decoder, which is tried before the
heuristic:

```ts
import { decode } from "@openring/decoder";
import { OptimRingDecoder } from "@openring/protocol/optim-ring";

const frame = decode(packet, [new OptimRingDecoder()]);
```

The Optim Ring decoder isn't built yet — it'll land once we've confirmed
its actual framing scheme via Inspector captures.
