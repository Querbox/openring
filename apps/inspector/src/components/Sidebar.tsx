import type { View } from "../App";

const items: Array<{ id: View; label: string; hint: string }> = [
  { id: "devices", label: "Devices", hint: "Scan & connect" },
  { id: "logger", label: "Packet Logger", hint: "Live BLE traffic" },
  { id: "protocol", label: "Protocol Explorer", hint: "Decode packets" },
  { id: "settings", label: "Settings", hint: "Preferences" },
];

export type StatusTone = "idle" | "active" | "ok";

export function Sidebar({
  active,
  onChange,
  status,
  packetCount,
}: {
  active: View;
  onChange: (v: View) => void;
  status: { label: string; tone: StatusTone };
  packetCount: number;
}) {
  return (
    <aside className="sidebar">
      <div className="brand">
        <div className="brand-mark" aria-hidden />
        <div className="brand-text">
          <span className="brand-name">OpenRing</span>
          <span className="brand-sub">Inspector</span>
        </div>
      </div>

      <nav className="nav">
        {items.map((item) => (
          <button
            key={item.id}
            className={`nav-item ${active === item.id ? "is-active" : ""}`}
            onClick={() => onChange(item.id)}
          >
            <span className="nav-label">
              {item.label}
              {item.id === "logger" && packetCount > 0 && (
                <span className="badge">{packetCount}</span>
              )}
            </span>
            <span className="nav-hint">{item.hint}</span>
          </button>
        ))}
      </nav>

      <div className="sidebar-footer">
        <span className={`status-dot tone-${status.tone}`} />
        <span className="status-text">{status.label}</span>
      </div>
    </aside>
  );
}
