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
