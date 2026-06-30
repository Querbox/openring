import type { UseBleResult } from "../ble";

export function InspectorPane({ ble }: { ble: UseBleResult }) {
  const { state, subscribe } = ble;
  const id = state.selectedDeviceId;
  const services = id ? (state.services[id] ?? []) : [];
  const conn = id ? (state.connections[id] ?? "disconnected") : "disconnected";

  return (
    <section className="inspector-pane">
      <header className="panel-header">
        <div>
          <h2>Inspector</h2>
          <p className="muted">
            Services, characteristics, and live notifications.
          </p>
        </div>
        {id && conn === "connected" && (
          <span className="pill pill-ok">Connected</span>
        )}
      </header>

      {!id ? (
        <div className="empty-state">
          <p className="empty-title">Select a device to inspect</p>
          <p className="empty-hint">
            Once connected, GATT services and characteristics will appear here.
          </p>
        </div>
      ) : conn !== "connected" ? (
        <div className="empty-state">
          <p className="empty-title">Not connected</p>
          <p className="empty-hint">
            Press <strong>Connect</strong> on the device tile to discover its
            services.
          </p>
        </div>
      ) : services.length === 0 ? (
        <div className="empty-state">
          <p className="empty-title">Discovering services…</p>
        </div>
      ) : (
        <ul className="services">
          {services.map((s) => (
            <li key={s.uuid} className="service">
              <header className="service-header">
                <span className="service-uuid">{s.uuid}</span>
                <span className="service-meta">
                  {s.characteristics.length} characteristic
                  {s.characteristics.length === 1 ? "" : "s"}
                </span>
              </header>
              <ul className="characteristics">
                {s.characteristics.map((c) => {
                  const supportsNotify =
                    c.properties.includes("notify") ||
                    c.properties.includes("indicate");
                  return (
                    <li key={c.uuid} className="characteristic">
                      <div className="characteristic-main">
                        <span className="characteristic-uuid">{c.uuid}</span>
                        <span className="characteristic-props">
                          {c.properties.join(" · ")}
                        </span>
                      </div>
                      {supportsNotify && (
                        <button
                          className="subscribe-btn"
                          onClick={() => void subscribe(id, c.uuid)}
                        >
                          Subscribe
                        </button>
                      )}
                    </li>
                  );
                })}
              </ul>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
