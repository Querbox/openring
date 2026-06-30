export type ConnectionState =
  | "disconnected"
  | "scanning"
  | "connecting"
  | "connected"
  | "error";

export interface RingDevice {
  id: string;
  name: string;
  rssi: number;
  manufacturerData?: Uint8Array;
  vendor?: string;
}

export interface RingService {
  uuid: string;
  name?: string;
  characteristics: RingCharacteristic[];
}

export interface RingCharacteristic {
  uuid: string;
  name?: string;
  properties: Array<"read" | "write" | "notify" | "indicate">;
}

export interface RingPacket {
  timestamp: number;
  characteristicUuid: string;
  direction: "in" | "out";
  bytes: Uint8Array;
}

/**
 * The taxonomy of meanings a packet can carry. Defined here in core so
 * `protocol` (declarative definitions), `parser` (events tagged with a
 * kind), and `metrics` (aggregations grouped by kind) all reference the
 * same union.
 *
 * `raw` and `unknown` are escape hatches — `raw` means the parser
 * intentionally returns bytes without semantic interpretation; `unknown`
 * means no `ProtocolDefinition` matched.
 */
export type SemanticKind =
  | "heart-rate"
  | "spo2"
  | "hrv"
  | "temperature"
  | "battery"
  | "steps"
  | "sleep-stage"
  | "status"
  | "ack"
  | "time-sync"
  | "raw"
  | "unknown";
