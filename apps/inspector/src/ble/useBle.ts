import { useEffect, useMemo, useReducer, useRef } from "react";
import type { RingDevice, RingPacket, RingService } from "@openring/core";
import type { BleEvent, ConnectionState } from "@openring/ble";
import { TauriBleAdapter } from "./adapter";

const MAX_PACKETS = 500;

type State = {
  scanning: boolean;
  devices: Record<string, RingDevice>;
  selectedDeviceId: string | null;
  connections: Record<string, ConnectionState>;
  services: Record<string, RingService[]>;
  packets: RingPacket[];
  error: string | null;
};

type Action =
  | { type: "set-scanning"; value: boolean }
  | { type: "device-discovered"; device: RingDevice }
  | { type: "select-device"; id: string | null }
  | {
      type: "connection-changed";
      id: string;
      state: ConnectionState;
    }
  | { type: "services"; id: string; services: RingService[] }
  | { type: "packet"; packet: RingPacket }
  | { type: "error"; message: string | null };

const initialState: State = {
  scanning: false,
  devices: {},
  selectedDeviceId: null,
  connections: {},
  services: {},
  packets: [],
  error: null,
};

function reducer(state: State, action: Action): State {
  switch (action.type) {
    case "set-scanning":
      return { ...state, scanning: action.value };
    case "device-discovered": {
      const prev = state.devices[action.device.id];
      const next = prev
        ? { ...prev, ...action.device }
        : action.device;
      return {
        ...state,
        devices: { ...state.devices, [action.device.id]: next },
      };
    }
    case "select-device":
      return { ...state, selectedDeviceId: action.id };
    case "connection-changed":
      return {
        ...state,
        connections: { ...state.connections, [action.id]: action.state },
      };
    case "services":
      return {
        ...state,
        services: { ...state.services, [action.id]: action.services },
      };
    case "packet": {
      const next = [action.packet, ...state.packets];
      if (next.length > MAX_PACKETS) next.length = MAX_PACKETS;
      return { ...state, packets: next };
    }
    case "error":
      return { ...state, error: action.message };
  }
}

export interface UseBleResult {
  state: State;
  startScan: () => Promise<void>;
  stopScan: () => Promise<void>;
  connect: (id: string) => Promise<void>;
  disconnect: (id: string) => Promise<void>;
  select: (id: string | null) => void;
  subscribe: (id: string, characteristicUuid: string) => Promise<void>;
  write: (
    id: string,
    characteristicUuid: string,
    bytes: Uint8Array,
    opts?: { withResponse?: boolean },
  ) => Promise<void>;
}

export function useBle(): UseBleResult {
  const adapterRef = useRef<TauriBleAdapter | null>(null);
  if (!adapterRef.current) adapterRef.current = new TauriBleAdapter();
  const adapter = adapterRef.current;

  const [state, dispatch] = useReducer(reducer, initialState);

  useEffect(() => {
    const off = adapter.on((event: BleEvent) => {
      switch (event.type) {
        case "device-discovered":
          dispatch({ type: "device-discovered", device: event.device });
          break;
        case "connection-changed":
          dispatch({
            type: "connection-changed",
            id: event.deviceId,
            state: event.state,
          });
          if (event.state === "connected") {
            adapter
              .discoverServices(event.deviceId)
              .then((services) =>
                dispatch({ type: "services", id: event.deviceId, services }),
              )
              .catch((err) =>
                dispatch({ type: "error", message: String(err) }),
              );
          }
          break;
        case "packet":
          dispatch({ type: "packet", packet: event.packet });
          break;
        case "error":
          dispatch({ type: "error", message: event.message });
          break;
      }
    });
    return () => {
      off();
      void adapter.dispose();
    };
  }, [adapter]);

  return useMemo<UseBleResult>(
    () => ({
      state,
      startScan: async () => {
        dispatch({ type: "error", message: null });
        try {
          await adapter.startScan();
          dispatch({ type: "set-scanning", value: true });
        } catch (err) {
          dispatch({ type: "error", message: String(err) });
        }
      },
      stopScan: async () => {
        try {
          await adapter.stopScan();
        } finally {
          dispatch({ type: "set-scanning", value: false });
        }
      },
      connect: async (id) => {
        try {
          await adapter.connect(id);
        } catch (err) {
          dispatch({ type: "error", message: String(err) });
        }
      },
      disconnect: async (id) => {
        try {
          await adapter.disconnect(id);
        } catch (err) {
          dispatch({ type: "error", message: String(err) });
        }
      },
      select: (id) => dispatch({ type: "select-device", id }),
      subscribe: async (id, characteristicUuid) => {
        try {
          await adapter.subscribe(id, characteristicUuid);
        } catch (err) {
          dispatch({ type: "error", message: String(err) });
        }
      },
      write: async (id, characteristicUuid, bytes, opts) => {
        try {
          await adapter.write(id, characteristicUuid, bytes, opts);
        } catch (err) {
          dispatch({ type: "error", message: String(err) });
        }
      },
    }),
    [adapter, state],
  );
}
