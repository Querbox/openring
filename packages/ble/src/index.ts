import type {
  ConnectionState,
  RingDevice,
  RingPacket,
  RingService,
} from "@openring/core";

/**
 * Transport-agnostic BLE adapter.
 *
 * Concrete implementations:
 *  - inspector (desktop) → Tauri/Rust adapter using `btleplug`
 *  - mobile → native CoreBluetooth / Android BLE bridge
 *  - browser → Web Bluetooth (limited)
 */
export interface BleAdapter {
  startScan(opts?: ScanOptions): AsyncIterable<RingDevice>;
  stopScan(): Promise<void>;
  connect(deviceId: string): Promise<void>;
  disconnect(deviceId: string): Promise<void>;
  discoverServices(deviceId: string): Promise<RingService[]>;
  subscribe(deviceId: string, characteristicUuid: string): AsyncIterable<RingPacket>;
  write(deviceId: string, characteristicUuid: string, bytes: Uint8Array): Promise<void>;
  state(deviceId: string): ConnectionState;
}

export interface ScanOptions {
  serviceUuids?: string[];
  duration?: number;
}
