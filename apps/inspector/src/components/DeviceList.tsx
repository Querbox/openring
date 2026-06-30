import type { UseBleResult } from "../ble";
import type { ConnectionState } from "@openring/core";

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
    const rankDiff =
      (CONNECTION_RANK[ca] ?? 99) - (CONNECTION_RANK[cb] ?? 99);
    if (rankDiff !== 0) return rankDiff;
    return (b.rssi ?? -200) - (a.rssi ?? -200);
  });

  return (
    <section className="device-list">
      <header className="panel-header">
        <div>
          <h2>Nearby devices</h2>
          <p className="muted">
            Scanning shows BLE peripherals advertising in range.
          </p>
        </div>
        <button
          className={`scan-btn ${state.scanning ? "is-scanning" : ""}`}
          onClick={() => (state.scanning ? stopScan() : startScan())}
        >
          <span className="scan-pulse" />
          {state.scanning ? "Stop scan" : "Start scan"}
        </button>
      </header>

      {devices.length === 0 ? (
        <div className="empty-state">
          <p className="empty-title">
            {state.scanning ? "Listening for advertisements…" : "No devices yet"}
          </p>
          <p className="empty-hint">
            {state.scanning
              ? "Bring your ring close to the computer."
              : "Press Start scan to discover nearby smart rings."}
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
                className={`device ${isSelected ? "is-selected" : ""}`}
                onClick={() => select(d.id)}
              >
                <div className="device-main">
                  <span className="device-name">{d.name}</span>
                  <span className="device-id">{d.id}</span>
                </div>
                <div className="device-meta">
                  <span className="rssi">{d.rssi ?? "?"} dBm</span>
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
                        ? "Connecting…"
                        : "Connect"}
                  </button>
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </section>
  );
}
