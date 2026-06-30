import { useState } from "react";
import { TopBar } from "./components/TopBar";
import { Sidebar, type View } from "./components/Sidebar";
import { DeviceList } from "./components/DeviceList";
import { ServicesTree } from "./components/ServicesTree";
import { MetricsPanel } from "./components/MetricsPanel";
import { TimelinePanel } from "./components/TimelinePanel";
import { useBle } from "./ble";

export function App() {
  const ble = useBle();
  const [view, setView] = useState<View>("dashboard");
  const [collapsed, setCollapsed] = useState(false);

  return (
    <div className={`app ${collapsed ? "is-sidebar-collapsed" : ""}`}>
      <TopBar
        ble={ble}
        onToggleSidebar={() => setCollapsed((v) => !v)}
        sidebarCollapsed={collapsed}
      />

      {ble.state.error && (
        <div className="banner banner-error" role="alert">
          <span>{ble.state.error}</span>
        </div>
      )}

      {ble.state.loadedSession && (
        <div className="banner banner-info" role="status">
          <span>
            <strong>Replay</strong>{" "}
            <code>{ble.state.loadedSession.path.split("/").pop()}</code> ·{" "}
            {ble.state.loadedSession.replayedEvents} of{" "}
            {ble.state.loadedSession.eventCount} events streamed into the view
            {ble.state.loadedSession.skipped > 0 && (
              <>
                {" "}
                · <em>{ble.state.loadedSession.skipped} lines skipped</em>
              </>
            )}
          </span>
          <button
            className="banner-dismiss"
            onClick={() => ble.dismissLoadedSession()}
            title="Dismiss banner (replayed data stays in the view)"
          >
            ×
          </button>
        </div>
      )}

      <div className="shell">
        <Sidebar
          view={view}
          onChangeView={setView}
          collapsed={collapsed}
          onToggleCollapsed={() => setCollapsed((v) => !v)}
          ble={ble}
        />
        <main className="view">
          {view === "dashboard" && <MetricsPanel metrics={ble.state.metrics} />}
          {view === "devices" && (
            <div className="devices-view">
              <DeviceList ble={ble} />
              <ServicesTree ble={ble} />
            </div>
          )}
          {view === "timeline" && <TimelinePanel packets={ble.state.packets} />}
          {view === "settings" && <SettingsPlaceholder />}
        </main>
      </div>
    </div>
  );
}

function SettingsPlaceholder() {
  return (
    <section className="settings-view">
      <header className="view-header">
        <div>
          <h1>Settings</h1>
          <p className="muted">Preferences will live here.</p>
        </div>
      </header>
      <div className="empty-state-soft empty-state-big">
        <p className="empty-title">Nothing here yet</p>
        <p className="empty-hint">
          Theme, capture preferences, and device defaults will land soon.
        </p>
      </div>
    </section>
  );
}
