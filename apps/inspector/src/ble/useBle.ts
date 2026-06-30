import { useEffect, useMemo, useReducer, useRef } from "react";
import type { RingDevice, RingPacket, RingService } from "@openring/core";
import type { BleEvent, ConnectionState } from "@openring/ble";
import { decode } from "@openring/decoder";
import { classify, type SemanticValue } from "@openring/parser";
import {
  SessionRecorder,
  parse as parseSession,
  hexToBytes,
  type ParseResult,
  type SessionEvent,
} from "@openring/session";
import type { SemanticKind } from "@openring/core";
import { invoke } from "@tauri-apps/api/core";
import { save as saveDialog, open as openDialog } from "@tauri-apps/plugin-dialog";
import { TauriBleAdapter } from "./adapter";

const MAX_PACKETS = 500;
const RECORDER_TICK_MS = 250;

export type MetricSnapshot = {
  kind: SemanticKind;
  headline: SemanticValue;
  supplementals: SemanticValue[];
  confidence: number;
  characteristicUuid: string;
  updatedAt: number;
};

export type RecordingState = {
  active: boolean;
  eventCount: number;
  startedAt: number | null;
};

export type LoadedSession = {
  path: string;
  header: ParseResult["header"];
  eventCount: number;
  /** How many events were actually replayed into the UI state. */
  replayedEvents: number;
  skipped: number;
};

type State = {
  scanning: boolean;
  devices: Record<string, RingDevice>;
  selectedDeviceId: string | null;
  connections: Record<string, ConnectionState>;
  services: Record<string, RingService[]>;
  packets: RingPacket[];
  metrics: Partial<Record<SemanticKind, MetricSnapshot>>;
  recording: RecordingState;
  loadedSession: LoadedSession | null;
  error: string | null;
};

type Action =
  | { type: "set-scanning"; value: boolean }
  | { type: "device-discovered"; device: RingDevice }
  | { type: "select-device"; id: string | null }
  | { type: "connection-changed"; id: string; state: ConnectionState }
  | { type: "services"; id: string; services: RingService[] }
  | { type: "packet"; packet: RingPacket }
  | { type: "recording-started"; startedAt: number }
  | { type: "recording-tick"; count: number }
  | { type: "recording-stopped" }
  | { type: "session-loaded"; session: LoadedSession | null }
  | { type: "error"; message: string | null };

const initialState: State = {
  scanning: false,
  devices: {},
  selectedDeviceId: null,
  connections: {},
  services: {},
  packets: [],
  metrics: {},
  recording: { active: false, eventCount: 0, startedAt: null },
  loadedSession: null,
  error: null,
};

function reducer(state: State, action: Action): State {
  switch (action.type) {
    case "set-scanning":
      return { ...state, scanning: action.value };
    case "device-discovered": {
      const prev = state.devices[action.device.id];
      const next = prev ? { ...prev, ...action.device } : action.device;
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
      const nextPackets = [action.packet, ...state.packets];
      if (nextPackets.length > MAX_PACKETS) nextPackets.length = MAX_PACKETS;
      const metric = extractMetric(action.packet);
      const nextMetrics: Partial<Record<SemanticKind, MetricSnapshot>> = metric
        ? { ...state.metrics, [metric.kind]: metric }
        : state.metrics;
      return { ...state, packets: nextPackets, metrics: nextMetrics };
    }
    case "recording-started":
      return {
        ...state,
        recording: {
          active: true,
          eventCount: 0,
          startedAt: action.startedAt,
        },
      };
    case "recording-tick":
      if (!state.recording.active) return state;
      return {
        ...state,
        recording: { ...state.recording, eventCount: action.count },
      };
    case "recording-stopped":
      return {
        ...state,
        recording: { ...state.recording, active: false },
      };
    case "session-loaded":
      return { ...state, loadedSession: action.session };
    case "error":
      return { ...state, error: action.message };
  }
}

function extractMetric(packet: RingPacket): MetricSnapshot | null {
  const frame = decode(packet);
  const event = classify(frame, []);
  if (event.kind === "unknown" || event.confidence < 0.5) return null;
  const headline = event.values[0];
  if (!headline || typeof headline.value !== "number") return null;
  return {
    kind: event.kind,
    headline,
    supplementals: event.values.slice(1),
    confidence: event.confidence,
    characteristicUuid: packet.characteristicUuid,
    updatedAt: packet.timestamp,
  };
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
  startRecording: () => void;
  stopRecording: () => Promise<void>;
  openSession: () => Promise<void>;
  dismissLoadedSession: () => void;
}

export function useBle(): UseBleResult {
  const adapterRef = useRef<TauriBleAdapter | null>(null);
  if (!adapterRef.current) adapterRef.current = new TauriBleAdapter();
  const adapter = adapterRef.current;

  const recorderRef = useRef<SessionRecorder | null>(null);

  const [state, dispatch] = useReducer(reducer, initialState);

  useEffect(() => {
    const off = adapter.on((event: BleEvent) => {
      switch (event.type) {
        case "device-discovered":
          dispatch({ type: "device-discovered", device: event.device });
          recorderRef.current?.appendScanResult(
            event.device.id,
            event.device.rssi,
            event.device.name,
          );
          break;
        case "connection-changed":
          dispatch({
            type: "connection-changed",
            id: event.deviceId,
            state: event.state,
          });
          if (event.state === "connected") {
            recorderRef.current?.appendConnect(event.deviceId);
            adapter
              .discoverServices(event.deviceId)
              .then((services) => {
                dispatch({ type: "services", id: event.deviceId, services });
                recorderRef.current?.appendDiscover(
                  event.deviceId,
                  services.map((s) => ({
                    uuid: s.uuid,
                    characteristics: s.characteristics.map((c) => ({
                      uuid: c.uuid,
                      properties: c.properties,
                    })),
                  })),
                );
              })
              .catch((err) =>
                dispatch({ type: "error", message: String(err) }),
              );
          } else if (event.state === "disconnected") {
            recorderRef.current?.appendDisconnect(event.deviceId);
          }
          break;
        case "packet": {
          dispatch({ type: "packet", packet: event.packet });
          const rec = recorderRef.current;
          if (rec && event.packet.deviceId) {
            if (event.packet.direction === "in") {
              rec.appendNotify(
                event.packet.deviceId,
                event.packet.characteristicUuid,
                event.packet.bytes,
                event.packet.timestamp,
              );
            } else {
              rec.appendWrite(
                event.packet.deviceId,
                event.packet.characteristicUuid,
                event.packet.bytes,
              );
            }
          }
          break;
        }
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

  // Tick recorder count for the UI while recording is active.
  useEffect(() => {
    if (!state.recording.active) return;
    const interval = setInterval(() => {
      const count = recorderRef.current?.count() ?? 0;
      dispatch({ type: "recording-tick", count });
    }, RECORDER_TICK_MS);
    return () => clearInterval(interval);
  }, [state.recording.active]);

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
          recorderRef.current?.appendSubscribe(id, characteristicUuid);
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

      startRecording: () => {
        const selectedId = state.selectedDeviceId;
        const device = selectedId ? state.devices[selectedId] : undefined;
        const startedAt = Date.now();
        recorderRef.current = new SessionRecorder({
          appVersion: "0.0.1",
          platform: detectPlatform(),
          ...(device && selectedId
            ? {
                device: {
                  id: selectedId,
                  ...(device.name !== undefined ? { name: device.name } : {}),
                  ...(device.rssi !== undefined ? { rssi: device.rssi } : {}),
                },
              }
            : {}),
        });
        dispatch({ type: "recording-started", startedAt });
      },

      stopRecording: async () => {
        const rec = recorderRef.current;
        if (!rec) return;
        const content = rec.serialize();
        dispatch({ type: "recording-stopped" });
        recorderRef.current = null;
        try {
          const stamp = new Date()
            .toISOString()
            .replace(/[:.]/g, "-")
            .slice(0, 19);
          const path = await saveDialog({
            defaultPath: `openring-${stamp}.session.jsonl`,
            filters: [
              { name: "OpenRing Session", extensions: ["jsonl"] },
            ],
          });
          if (path) {
            await invoke("session_save", { path, content });
          }
        } catch (err) {
          dispatch({ type: "error", message: String(err) });
        }
      },

      openSession: async () => {
        try {
          const selected = await openDialog({
            multiple: false,
            filters: [
              { name: "OpenRing Session", extensions: ["jsonl"] },
            ],
          });
          if (typeof selected !== "string") return;
          const content = await invoke<string>("session_open", {
            path: selected,
          });
          const parsed = parseSession(content);
          const replayed = replayInto(parsed.events, dispatch);
          dispatch({
            type: "session-loaded",
            session: {
              path: selected,
              header: parsed.header,
              eventCount: parsed.events.length,
              replayedEvents: replayed,
              skipped: parsed.skipped.length,
            },
          });
        } catch (err) {
          dispatch({ type: "error", message: String(err) });
        }
      },

      dismissLoadedSession: () =>
        dispatch({ type: "session-loaded", session: null }),
    }),
    [adapter, state],
  );
}

/**
 * Translate a recorded SessionEvent stream into the same reducer
 * dispatches the live BLE adapter would produce. The reducer doesn't
 * know which source the events came from, so replayed sessions show up
 * in every panel exactly like live traffic — devices appear in the
 * list, services populate the GATT tree, notify/write packets stream
 * into the timeline, and recognised payloads update the metric cards.
 *
 * Returns the count of events that were successfully dispatched.
 */
function replayInto(
  events: SessionEvent[],
  dispatch: (action: Action) => void,
): number {
  let replayed = 0;
  for (const ev of events) {
    try {
      switch (ev.kind) {
        case "scan-result": {
          const device: RingDevice = {
            id: ev.id,
            name: ev.name?.trim() ? ev.name : ev.id,
            rssi: ev.rssi,
          };
          dispatch({ type: "device-discovered", device });
          replayed += 1;
          break;
        }
        case "connect":
          dispatch({
            type: "connection-changed",
            id: ev.id,
            state: "connected",
          });
          replayed += 1;
          break;
        case "disconnect":
          dispatch({
            type: "connection-changed",
            id: ev.id,
            state: "disconnected",
          });
          replayed += 1;
          break;
        case "discover": {
          const services: RingService[] = ev.services.map((s) => ({
            uuid: s.uuid,
            characteristics: s.characteristics.map((c) => ({
              uuid: c.uuid,
              properties: c.properties.filter(
                (p): p is
                  | "read"
                  | "write"
                  | "writeWithoutResponse"
                  | "notify"
                  | "indicate" =>
                  p === "read" ||
                  p === "write" ||
                  p === "writeWithoutResponse" ||
                  p === "notify" ||
                  p === "indicate",
              ),
            })),
          }));
          dispatch({ type: "services", id: ev.id, services });
          replayed += 1;
          break;
        }
        case "notify":
        case "write": {
          const bytes = hexToBytes(ev.bytes);
          const packet: RingPacket = {
            timestamp: ev.ts,
            deviceId: ev.id,
            characteristicUuid: ev.characteristic,
            direction: ev.kind === "notify" ? "in" : "out",
            bytes,
          };
          dispatch({ type: "packet", packet });
          replayed += 1;
          break;
        }
        case "subscribe":
        case "unsubscribe":
        case "note":
          // not surfaced in the live UI yet, so nothing to dispatch
          break;
      }
    } catch (err) {
      // Bad hex or malformed event — skip rather than abort the whole replay.
      // The skipped count is already reported separately via parse().
      // eslint-disable-next-line no-console
      console.warn("[replay] skipping event", ev.kind, err);
    }
  }
  return replayed;
}

function detectPlatform(): string {
  const ua = typeof navigator !== "undefined" ? navigator.userAgent : "";
  if (/Mac OS X/i.test(ua)) return "macos";
  if (/Windows/i.test(ua)) return "windows";
  if (/Linux/i.test(ua)) return "linux";
  return "unknown";
}
