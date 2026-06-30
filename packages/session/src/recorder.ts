import { serialize, bytesToHex } from "./serialize.ts";
import type {
  SessionDeviceMeta,
  SessionEvent,
  SessionHeader,
} from "./types.ts";
import { SESSION_FORMAT_VERSION } from "./types.ts";

export interface RecorderOpts {
  appVersion: string;
  platform: string;
  device?: SessionDeviceMeta;
  notes?: string;
  now?: () => number;
}

/**
 * In-memory append-only buffer of one BLE session.
 *
 * The recorder is platform-agnostic — it does not touch the filesystem.
 * The Inspector's recorder controls call `serialize()` and hand the
 * resulting string to the Tauri side, which prompts for a path and
 * writes the file.
 */
export class SessionRecorder {
  readonly header: SessionHeader;
  private events: SessionEvent[] = [];
  private now: () => number;

  constructor(opts: RecorderOpts) {
    this.now = opts.now ?? (() => Date.now());
    this.header = {
      kind: "header",
      version: SESSION_FORMAT_VERSION,
      startedAt: this.now(),
      host: {
        app: "openring-inspector",
        appVersion: opts.appVersion,
        platform: opts.platform,
      },
      ...(opts.device !== undefined ? { device: opts.device } : {}),
      ...(opts.notes !== undefined ? { notes: opts.notes } : {}),
    };
  }

  appendScanResult(id: string, rssi: number, name?: string): void {
    this.events.push({
      kind: "scan-result",
      ts: this.now(),
      id,
      rssi,
      ...(name !== undefined ? { name } : {}),
    });
  }

  appendConnect(id: string): void {
    this.events.push({ kind: "connect", ts: this.now(), id });
  }

  appendDisconnect(id: string): void {
    this.events.push({ kind: "disconnect", ts: this.now(), id });
  }

  appendDiscover(
    id: string,
    services: Array<{
      uuid: string;
      characteristics: Array<{ uuid: string; properties: string[] }>;
    }>,
  ): void {
    this.events.push({
      kind: "discover",
      ts: this.now(),
      id,
      services,
    });
  }

  appendSubscribe(id: string, characteristic: string): void {
    this.events.push({
      kind: "subscribe",
      ts: this.now(),
      id,
      characteristic,
    });
  }

  appendUnsubscribe(id: string, characteristic: string): void {
    this.events.push({
      kind: "unsubscribe",
      ts: this.now(),
      id,
      characteristic,
    });
  }

  appendNotify(
    id: string,
    characteristic: string,
    bytes: Uint8Array,
    tsOverride?: number,
  ): void {
    this.events.push({
      kind: "notify",
      ts: tsOverride ?? this.now(),
      id,
      characteristic,
      bytes: bytesToHex(bytes),
    });
  }

  appendWrite(id: string, characteristic: string, bytes: Uint8Array): void {
    this.events.push({
      kind: "write",
      ts: this.now(),
      id,
      characteristic,
      bytes: bytesToHex(bytes),
    });
  }

  appendNote(text: string): void {
    this.events.push({ kind: "note", ts: this.now(), text });
  }

  count(): number {
    return this.events.length;
  }

  duration(): number {
    return this.now() - this.header.startedAt;
  }

  snapshot(): { header: SessionHeader; events: SessionEvent[] } {
    return { header: this.header, events: [...this.events] };
  }

  serialize(): string {
    return serialize(this.header, this.events);
  }
}
