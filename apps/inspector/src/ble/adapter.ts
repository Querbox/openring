import { invoke } from "@tauri-apps/api/core";
import { listen, type UnlistenFn } from "@tauri-apps/api/event";
import type {
  BleAdapter,
  BleEvent,
  BleEventHandler,
  RingDevice,
  RingService,
  Unsubscribe,
} from "@openring/ble";
import type { ConnectionState, RingPacket } from "@openring/core";

type BleDevicePayload = {
  id: string;
  name?: string | null;
  rssi?: number | null;
  manufacturer_data: Record<string, number[]>;
  services: string[];
};

type ConnectionChangedPayload = {
  id: string;
  state: ConnectionState;
};

type BlePacketPayload = {
  device_id: string;
  characteristic_uuid: string;
  direction: "in" | "out";
  bytes: number[];
  timestamp_ms: number;
};

type BleServicePayload = {
  uuid: string;
  primary: boolean;
  characteristics: Array<{ uuid: string; properties: string[] }>;
};

function toRingDevice(p: BleDevicePayload): RingDevice {
  const manufacturer = Object.entries(p.manufacturer_data)[0];
  const device: RingDevice = {
    id: p.id,
    name: p.name?.trim() ? p.name : p.id,
    rssi: p.rssi ?? 0,
  };
  if (manufacturer) {
    device.manufacturerData = Uint8Array.from(manufacturer[1] ?? []);
  }
  return device;
}

function toRingPacket(p: BlePacketPayload): RingPacket {
  return {
    timestamp: p.timestamp_ms,
    characteristicUuid: p.characteristic_uuid,
    direction: p.direction,
    bytes: Uint8Array.from(p.bytes),
  };
}

function toRingService(s: BleServicePayload): RingService {
  return {
    uuid: s.uuid,
    characteristics: s.characteristics.map((c) => ({
      uuid: c.uuid,
      properties: c.properties.filter(
        (x): x is "read" | "write" | "notify" | "indicate" =>
          x === "read" || x === "write" || x === "notify" || x === "indicate",
      ),
    })),
  };
}

/**
 * Tauri-backed BLE adapter for the desktop Inspector.
 *
 * Wraps the Rust `ble` module: every method invokes a Tauri command, and
 * every event subscribed on the Rust side is forwarded to handlers
 * registered via `on()`.
 */
export class TauriBleAdapter implements BleAdapter {
  private handlers = new Set<BleEventHandler>();
  private unlisteners: UnlistenFn[] = [];
  private started = false;

  private async ensureListeners() {
    if (this.started) return;
    this.started = true;

    this.unlisteners.push(
      await listen<BleDevicePayload>("ble://device-discovered", (e) => {
        this.emit({
          type: "device-discovered",
          device: toRingDevice(e.payload),
        });
      }),
      await listen<ConnectionChangedPayload>(
        "ble://connection-changed",
        (e) => {
          this.emit({
            type: "connection-changed",
            deviceId: e.payload.id,
            state: e.payload.state,
          });
        },
      ),
      await listen<BlePacketPayload>("ble://packet", (e) => {
        this.emit({ type: "packet", packet: toRingPacket(e.payload) });
      }),
      await listen<string>("ble://error", (e) => {
        this.emit({ type: "error", message: e.payload });
      }),
    );
  }

  private emit(event: BleEvent) {
    for (const h of this.handlers) {
      try {
        h(event);
      } catch (err) {
        console.error("BleAdapter handler threw", err);
      }
    }
  }

  on(handler: BleEventHandler): Unsubscribe {
    this.handlers.add(handler);
    void this.ensureListeners();
    return () => {
      this.handlers.delete(handler);
    };
  }

  async startScan(): Promise<void> {
    await this.ensureListeners();
    await invoke("ble_start_scan");
  }

  async stopScan(): Promise<void> {
    await invoke("ble_stop_scan");
  }

  async connect(deviceId: string): Promise<void> {
    await invoke("ble_connect", { deviceId });
  }

  async disconnect(deviceId: string): Promise<void> {
    await invoke("ble_disconnect", { deviceId });
  }

  async discoverServices(deviceId: string): Promise<RingService[]> {
    const services = await invoke<BleServicePayload[]>("ble_discover_services", {
      deviceId,
    });
    return services.map(toRingService);
  }

  async subscribe(deviceId: string, characteristicUuid: string): Promise<void> {
    await invoke("ble_subscribe", { deviceId, characteristicUuid });
  }

  async unsubscribe(
    deviceId: string,
    characteristicUuid: string,
  ): Promise<void> {
    await invoke("ble_unsubscribe", { deviceId, characteristicUuid });
  }

  async write(
    deviceId: string,
    characteristicUuid: string,
    bytes: Uint8Array,
    opts?: { withResponse?: boolean },
  ): Promise<void> {
    await invoke("ble_write", {
      deviceId,
      characteristicUuid,
      bytes: Array.from(bytes),
      withResponse: opts?.withResponse ?? false,
    });
  }

  async dispose(): Promise<void> {
    for (const u of this.unlisteners) {
      try {
        u();
      } catch {
        /* ignore */
      }
    }
    this.unlisteners = [];
    this.handlers.clear();
    this.started = false;
  }
}
