import type {
  ConnectionState,
  RingCharacteristic,
  RingDevice,
  RingPacket,
  RingService,
} from "@openring/core";

export interface ScanOptions {
  serviceUuids?: string[];
}

export type BleEvent =
  | { type: "device-discovered"; device: RingDevice }
  | { type: "connection-changed"; deviceId: string; state: ConnectionState }
  | { type: "packet"; packet: RingPacket }
  | { type: "error"; message: string };

export type BleEventHandler = (event: BleEvent) => void;
export type Unsubscribe = () => void;

/**
 * Transport-agnostic BLE adapter.
 *
 * Concrete implementations:
 *  - inspector (desktop) → Tauri/Rust adapter using `btleplug`
 *  - mobile → native CoreBluetooth / Android BLE bridge
 *  - browser → Web Bluetooth (limited)
 *
 * The adapter is event-based — consumers subscribe with `on()` and trigger
 * actions with the imperative methods. This maps cleanly onto Tauri events
 * and React state without forcing the AsyncIterable dance.
 */
export interface BleAdapter {
  on(handler: BleEventHandler): Unsubscribe;

  startScan(opts?: ScanOptions): Promise<void>;
  stopScan(): Promise<void>;

  connect(deviceId: string): Promise<void>;
  disconnect(deviceId: string): Promise<void>;

  discoverServices(deviceId: string): Promise<RingService[]>;

  subscribe(deviceId: string, characteristicUuid: string): Promise<void>;
  unsubscribe(deviceId: string, characteristicUuid: string): Promise<void>;

  write(
    deviceId: string,
    characteristicUuid: string,
    bytes: Uint8Array,
    opts?: { withResponse?: boolean },
  ): Promise<void>;
}

export type {
  ConnectionState,
  RingCharacteristic,
  RingDevice,
  RingPacket,
  RingService,
};
