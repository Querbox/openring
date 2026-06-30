import type { ConnectionState } from "@openring/core";
import type { UseBleResult } from "../ble";
import { RecorderControls } from "./RecorderControls";

export function TopBar({
  ble,
  onToggleSidebar,
  sidebarCollapsed,
}: {
  ble: UseBleResult;
  onToggleSidebar: () => void;
  sidebarCollapsed: boolean;
}) {
  const { state } = ble;
  const selected = state.selectedDeviceId;
  const conn: ConnectionState = selected
    ? (state.connections[selected] ?? "disconnected")
    : "disconnected";
  const device = selected ? state.devices[selected] : undefined;
  const status = computeStatus(state.scanning, conn, device?.name);

  return (
    <header className="topbar" data-tauri-drag-region="">
      <div className="topbar-left" data-tauri-drag-region="">
        <button
          className="sidebar-pill-toggle"
          onClick={onToggleSidebar}
          title={sidebarCollapsed ? "Expand sidebar" : "Collapse sidebar"}
          aria-label="Toggle sidebar"
          data-tauri-drag-region="false"
        >
          <span className="hamburger" aria-hidden>
            <span />
            <span />
            <span />
          </span>
        </button>
        <div className="topbar-brand" data-tauri-drag-region="">
          <div
            className="brand-mark"
            aria-hidden
            data-tauri-drag-region=""
          />
          <div className="brand-text" data-tauri-drag-region="">
            <span className="brand-name" data-tauri-drag-region="">
              OpenRing
            </span>
            <span className="brand-sub" data-tauri-drag-region="">
              Inspector
            </span>
          </div>
        </div>
      </div>
      <div className="topbar-center" data-tauri-drag-region="">
        <RecorderControls ble={ble} />
      </div>
      <div
        className={`topbar-status tone-${status.tone}`}
        data-tauri-drag-region=""
      >
        <span
          className={`status-dot tone-${status.tone}`}
          data-tauri-drag-region=""
        />
        <span className="status-text" data-tauri-drag-region="">
          {status.label}
        </span>
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
