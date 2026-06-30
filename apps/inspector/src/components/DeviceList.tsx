import { useState } from "react";

type Device = {
  id: string;
  name: string;
  rssi: number;
  vendor?: string;
};

export function DeviceList() {
  const [scanning, setScanning] = useState(false);
  const [devices] = useState<Device[]>([]);

  return (
    <section className="device-list">
      <header className="panel-header">
        <div>
          <h2>Nearby devices</h2>
          <p className="muted">Scanning shows BLE peripherals advertising in range.</p>
        </div>
        <button
          className={`scan-btn ${scanning ? "is-scanning" : ""}`}
          onClick={() => setScanning((v) => !v)}
        >
          <span className="scan-pulse" />
          {scanning ? "Scanning…" : "Start scan"}
        </button>
      </header>

      {devices.length === 0 ? (
        <div className="empty-state">
          <p className="empty-title">
            {scanning ? "Listening for advertisements…" : "No devices yet"}
          </p>
          <p className="empty-hint">
            {scanning
              ? "Bring your ring close to the computer."
              : "Press Start scan to discover nearby smart rings."}
          </p>
        </div>
      ) : (
        <ul className="devices">
          {devices.map((d) => (
            <li key={d.id} className="device">
              <div className="device-main">
                <span className="device-name">{d.name}</span>
                <span className="device-id">{d.id}</span>
              </div>
              <div className="device-meta">
                <span className="rssi">{d.rssi} dBm</span>
                {d.vendor && <span className="vendor">{d.vendor}</span>}
              </div>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
