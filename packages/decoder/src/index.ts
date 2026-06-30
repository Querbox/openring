import type { RingPacket } from "@openring/core";
import type { DecodedFrame, FrameDecoder } from "./types.ts";
import { HeuristicByteFrameDecoder } from "./heuristic.ts";

export type {
  DecodedField,
  DecodedFrame,
  ChecksumResult,
  FrameDecoder,
} from "./types.ts";

export {
  xorSum,
  byteSum,
  crc8,
  identifyChecksum,
  type ChecksumGuess,
} from "./checksum.ts";

export { HeuristicByteFrameDecoder } from "./heuristic.ts";

/**
 * Apply the first matching decoder in `decoders`, falling back to the
 * generic heuristic if none match.
 *
 * Callers register device-specific decoders ahead of the heuristic; the
 * heuristic is the catch-all that always returns *something*.
 */
export function decode(
  packet: RingPacket,
  decoders: FrameDecoder[] = [],
): DecodedFrame {
  for (const d of decoders) {
    if (d.matches(packet)) return d.decode(packet);
  }
  return new HeuristicByteFrameDecoder().decode(packet);
}
