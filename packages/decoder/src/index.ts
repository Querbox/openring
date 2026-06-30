import type { RingPacket } from "@openring/core";
import type { DecodedFrame, FrameDecoder } from "./types";
import { HeuristicByteFrameDecoder } from "./heuristic";

export type {
  DecodedField,
  DecodedFrame,
  ChecksumResult,
  FrameDecoder,
} from "./types";

export {
  xorSum,
  byteSum,
  crc8,
  identifyChecksum,
  type ChecksumGuess,
} from "./checksum";

export { HeuristicByteFrameDecoder } from "./heuristic";

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
