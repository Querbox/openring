import type { ConnectionState } from "@openring/core";
import type { UseBleResult } from "../ble";
import { RecorderControls } from "./RecorderControls";

export function TopBar({ ble }: { ble: UseBleResult }) {
  const { state } = ble;
  const selected = state.selectedDeviceId;
  const conn: ConnectionState = selected
    ? (state.connections[selected] ?? "disconnected")
    : "disconnected";
  const device = selected ? state.devices[selected] : undefined;

  const status = computeStatus(state.scanning, conn, device?.name);

  return (
    <header className="topbar" data-tauri-drag-region>
      <div className="topbar-brand">
        <div className="brand-mark" aria-hidden />
        <div className="brand-text">
          <span className="brand-name">OpenRing</span>
          <span className="brand-sub">Inspector</span>
        </div>
      </div>
      <div className="topbar-center">
        <RecorderControls ble={ble} />
      </div>
      <div className={`topbar-status tone-${status.tone}`}>
        <span className={`status-dot tone-${status.tone}`} />
        <span className="status-text">{status.label}</span>
      </div>
    </header>
  );
}

function computeStatus(
  scanning: boolean,
  conn: ConnectionState,
  name: string | undefined,
): { label: string; tone: "idle" | "active" | "ok" } {
  if (conn === "connected" && name) {
    return { label: `Connected · ${name}`, tone: "ok" };
  }
  if (conn === "connecting") {
    return { label: "Connecting…", tone: "active" };
  }
  if (scanning) {
    return { label: "Scanning…", tone: "active" };
  }
  return { label: "Idle", tone: "idle" };
}
