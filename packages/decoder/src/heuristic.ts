import type { RingPacket } from "@openring/core";
import type { DecodedField, DecodedFrame, FrameDecoder } from "./types.ts";
import { identifyChecksum } from "./checksum.ts";

/**
 * Default framing heuristic for unknown devices.
 *
 * Assumes the dominant cheap-BLE pattern:
 *
 *   byte 0       opcode
 *   byte 1       length (decimal count of payload bytes, sometimes)
 *   bytes 2..N-2 payload
 *   byte N-1     checksum (XOR-sum / sum / CRC-8 over the body)
 *
 * If the trailing byte matches any known checksum algorithm over the
 * preceding bytes, that strongly suggests the framing is correct.
 *
 * Anything shorter than 4 bytes falls through as "unknown".
 */
export class HeuristicByteFrameDecoder implements FrameDecoder {
  id = "heuristic-opcode-length-payload-checksum";

  matches(_packet: RingPacket): boolean {
    return true;
  }

  decode(packet: RingPacket): DecodedFrame {
    const { bytes } = packet;
    const warnings: string[] = [];

    if (bytes.length < 4) {
      return {
        raw: packet,
        fields: [
          { name: "raw", offset: 0, length: bytes.length, value: bytes },
        ],
        unknown: true,
        warnings: ["frame too short for opcode/length/checksum framing"],
      };
    }

    const opcode = bytes[0]!;
    const length = bytes[1]!;
    const checksumByte = bytes[bytes.length - 1]!;
    const body = bytes.subarray(0, bytes.length - 1);
    const payload = bytes.subarray(2, bytes.length - 1);

    const checksum = identifyChecksum(body, checksumByte);

    if (length !== payload.length) {
      warnings.push(
        `length byte (${length}) does not equal payload byte count (${payload.length}); the second byte may not be a length field`,
      );
    }

    const fields: DecodedField[] = [
      {
        name: "opcode",
        offset: 0,
        length: 1,
        value: opcode,
        note: "first-byte opcode is the most common pattern; not verified for this device",
      },
      {
        name: "length",
        offset: 1,
        length: 1,
        value: length,
        note:
          length === payload.length
            ? "matches the payload byte count"
            : "does not match payload byte count — may be sub-command or status",
      },
      {
        name: "payload",
        offset: 2,
        length: payload.length,
        value: payload,
      },
      {
        name: "checksum",
        offset: bytes.length - 1,
        length: 1,
        value: checksumByte,
        note:
          checksum.algorithm === "unknown"
            ? "trailing byte did not match xor/sum/crc8 over the body"
            : `${checksum.algorithm} over bytes[0..${bytes.length - 2}] matches`,
      },
    ];

    const unknown = checksum.algorithm === "unknown" && warnings.length > 0;

    return {
      raw: packet,
      fields,
      checksum: {
        algorithm: checksum.algorithm,
        value: checksumByte,
        computed: checksum.computed,
        valid: checksum.valid,
      },
      unknown,
      warnings,
    };
  }
}
