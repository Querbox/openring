/**
 * Protocol registry — declarative descriptions of known smart ring
 * commands, responses, and notifications. Each entry is consumed by
 * `@openring/parser` to classify raw packets.
 */

export interface ProtocolField {
  name: string;
  offset: number;
  length: number;
  kind: "uint8" | "uint16" | "uint32" | "bytes" | "bcd";
  scale?: number;
  unit?: string;
}

export interface ProtocolDefinition {
  id: string;
  device: string;
  characteristicUuid: string;
  direction: "in" | "out";
  matcher: {
    prefix?: number[];
    length?: number;
  };
  category: "heart-rate" | "battery" | "status" | "steps" | "unknown";
  fields: ProtocolField[];
  notes?: string;
}

export const protocols: ProtocolDefinition[] = [];
