import type { RingPacket } from "@openring/core";

export interface ParsedPacket {
  raw: RingPacket;
  category?: "heart-rate" | "battery" | "status" | "steps" | "unknown";
  fields?: Record<string, number | string>;
  confidence: number;
  reason?: string;
}

/**
 * Pure inference layer — given a raw packet, try to decide what it likely
 * represents based on registered protocol definitions and heuristics.
 *
 * Returns a `confidence` between 0 and 1. The Inspector renders that as
 * the "Possible Battery Packet (87%)" UI from the project vision.
 */
export function classify(packet: RingPacket): ParsedPacket {
  return {
    raw: packet,
    category: "unknown",
    confidence: 0,
    reason: "No protocol definitions loaded yet.",
  };
}
