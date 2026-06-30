/**
 * `.session.jsonl` is a JSON Lines transcript of one BLE session:
 *  - line 0:  `SessionHeader`
 *  - line N:  `SessionEvent`
 *
 * The file is append-only, diff-friendly on GitHub, and `jq`-friendly
 * (`jq 'select(.kind=="notify")' my.session.jsonl`). Truncation
 * gracefully degrades — every full line that parsed is replayable.
 */

export const SESSION_FORMAT_VERSION = 1 as const;

export interface SessionDeviceMeta {
  id: string;
  name?: string;
  rssi?: number;
  manufacturer?: string;
  model?: string;
  firmware?: string;
  hardware?: string;
}

export interface SessionHeader {
  kind: "header";
  version: typeof SESSION_FORMAT_VERSION;
  startedAt: number;
  host: {
    app: "openring-inspector";
    appVersion: string;
    platform: string;
  };
  device?: SessionDeviceMeta;
  notes?: string;
}

export interface ScanResultEvent {
  kind: "scan-result";
  ts: number;
  id: string;
  name?: string;
  rssi: number;
}

export interface ConnectEvent {
  kind: "connect";
  ts: number;
  id: string;
}

export interface DisconnectEvent {
  kind: "disconnect";
  ts: number;
  id: string;
}

export interface DiscoverEvent {
  kind: "discover";
  ts: number;
  id: string;
  services: Array<{
    uuid: string;
    characteristics: Array<{ uuid: string; properties: string[] }>;
  }>;
}

export interface SubscribeEvent {
  kind: "subscribe";
  ts: number;
  id: string;
  characteristic: string;
}

export interface UnsubscribeEvent {
  kind: "unsubscribe";
  ts: number;
  id: string;
  characteristic: string;
}

export interface NotifyEvent {
  kind: "notify";
  ts: number;
  id: string;
  characteristic: string;
  /** Lowercase hex without separators. */
  bytes: string;
}

export interface WriteEvent {
  kind: "write";
  ts: number;
  id: string;
  characteristic: string;
  bytes: string;
}

export interface NoteEvent {
  kind: "note";
  ts: number;
  text: string;
}

export type SessionEvent =
  | ScanResultEvent
  | ConnectEvent
  | DisconnectEvent
  | DiscoverEvent
  | SubscribeEvent
  | UnsubscribeEvent
  | NotifyEvent
  | WriteEvent
  | NoteEvent;

export type SessionLine = SessionHeader | SessionEvent;
