/**
 * @openring/core — cross-platform SDK surface.
 *
 * Re-exports the device, transport, and session abstractions
 * that any OpenRing application (inspector, mobile, CLI) builds on.
 */

export type {
  RingDevice,
  RingService,
  RingCharacteristic,
  RingPacket,
  ConnectionState,
  SemanticKind,
} from "./types";
