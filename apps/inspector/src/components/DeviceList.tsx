import type { ConnectionState } from "@openring/core";
import type { UseBleResult } from "../ble";

const CONNECTION_RANK: Record<ConnectionState, number> = {
  connected: 0,
  connecting: 1,
  scanning: 2,
  disconnected: 3,
  error: 4,
};

export function DeviceList({ ble }: { ble: UseBleResult }) {
  const { state, startScan, stopScan, connect, disconnect, select } = ble;
  const devices = Object.values(state.devices).sort((a, b) => {
    const ca = state.connections[a.id] ?? "disconnected";
    const cb = state.connections[b.id] ?? "disconnected";
    const rankDiff = (CONNECTION_RANK[ca] ?? 99) - (CONNECTION_RANK[cb] ?? 99);
    if (rankDiff !== 0) return rankDiff;
    return (b.rssi ?? -200) - (a.rssi ?? -200);
  });

  return (
    <section className="device-list">
      <header className="cell-header">
        <h2>Devices</h2>
        <button
          className={`scan-btn ${state.scanning ? "is-scanning" : ""}`}
          onClick={() => (state.scanning ? stopScan() : startScan())}
        >
          <span className="scan-pulse" />
          {state.scanning ? "Stop" : "Scan"}
        </button>
      </header>

      {devices.length === 0 ? (
        <div className="empty-state-soft">
          <p className="empty-title">
            {state.scanning ? "Listening…" : "No devices yet"}
          </p>
          <p className="empty-hint">
            {state.scanning
              ? "Bring your ring close to the computer."
              : "Tap Scan to discover smart rings."}
          </p>
        </div>
      ) : (
        <ul className="devices">
          {devices.map((d) => {
            const conn = state.connections[d.id] ?? "disconnected";
            const isSelected = state.selectedDeviceId === d.id;
            return (
              <li
                key={d.id}
                className={`device-row tone-${conn} ${
                  isSelected ? "is-selected" : ""
                }`}
                onClick={() => select(d.id)}
              >
                <span className={`device-dot tone-${conn}`} aria-hidden />
                <div className="device-main">
                  <span className="device-name">{d.name}</span>
                  <span className="device-meta">
                    {d.rssi ?? "?"} dBm{conn !== "disconnected" ? ` · ${conn}` : ""}
                  </span>
                </div>
                <button
                  className={`connect-btn tone-${conn}`}
                  onClick={(e) => {
                    e.stopPropagation();
                    if (conn === "connected") void disconnect(d.id);
                    else void connect(d.id);
                  }}
                >
                  {conn === "connected"
                    ? "Disconnect"
                    : conn === "connecting"
                      ? "…"
                      : "Connect"}
                </button>
              </li>
            );
          })}
        </ul>
      )}
    </section>
  );
}
