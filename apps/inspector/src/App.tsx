import { useState } from "react";
import { Sidebar } from "./components/Sidebar";
import { DeviceList } from "./components/DeviceList";
import { InspectorPane } from "./components/InspectorPane";
import { PacketLog } from "./components/PacketLog";
import { useBle } from "./ble";

export type View = "devices" | "logger" | "protocol" | "settings";

export function App() {
  const [view, setView] = useState<View>("devices");
  const ble = useBle();

  const selected = ble.state.selectedDeviceId;
  const connectionState = selected
    ? (ble.state.connections[selected] ?? "disconnected")
    : "disconnected";

  return (
    <div className="app">
      <div className="window-chrome" data-tauri-drag-region />
      <div className="app-grid">
        <Sidebar
          active={view}
          onChange={setView}
          status={
            ble.state.scanning
              ? { label: "Scanning…", tone: "active" }
              : selected
                ? {
                    label: `${ble.state.devices[selected]?.name ?? selected}`,
                    tone: connectionState === "connected" ? "ok" : "active",
                  }
                : { label: "No device connected", tone: "idle" }
          }
          packetCount={ble.state.packets.length}
        />
        <main className="main">
          {ble.state.error && (
            <div className="banner banner-error" role="alert">
              <span>{ble.state.error}</span>
            </div>
          )}
          {view === "devices" && (
            <div className="split">
              <DeviceList ble={ble} />
              <InspectorPane ble={ble} />
            </div>
          )}
          {view === "logger" && <PacketLog packets={ble.state.packets} />}
          {view === "protocol" && (
            <EmptyView
              title="Protocol Explorer"
              hint="Captured packets will be classified with confidence scores."
            />
          )}
          {view === "settings" && (
            <EmptyView title="Settings" hint="Theme, telemetry, and capture preferences." />
          )}
        </main>
      </div>
    </div>
  );
}

function EmptyView({ title, hint }: { title: string; hint: string }) {
  return (
    <div className="empty">
      <h1>{title}</h1>
      <p>{hint}</p>
    </div>
  );
}
