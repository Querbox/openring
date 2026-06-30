import { Sidebar } from "./components/Sidebar";
import { DeviceList } from "./components/DeviceList";
import { InspectorPane } from "./components/InspectorPane";
import { useState } from "react";

export type View = "devices" | "logger" | "protocol" | "settings";

export function App() {
  const [view, setView] = useState<View>("devices");

  return (
    <div className="app">
      <div className="window-chrome" data-tauri-drag-region />
      <div className="app-grid">
        <Sidebar active={view} onChange={setView} />
        <main className="main">
          {view === "devices" && (
            <div className="split">
              <DeviceList />
              <InspectorPane />
            </div>
          )}
          {view === "logger" && (
            <EmptyView
              title="Packet Logger"
              hint="Connect to a device and notifications will stream here."
            />
          )}
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
