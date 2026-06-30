import {
  ChevronLeftIcon,
  ChevronRightIcon,
  DashboardIcon,
  DevicesIcon,
  SettingsIcon,
  TimelineIcon,
} from "./icons";
import type { UseBleResult } from "../ble";

export type View = "dashboard" | "devices" | "timeline" | "settings";

const NAV: Array<{
  id: View;
  label: string;
  hint: string;
  Icon: (props: { size?: number }) => JSX.Element;
}> = [
  {
    id: "dashboard",
    label: "Dashboard",
    hint: "Live sensors",
    Icon: DashboardIcon,
  },
  {
    id: "devices",
    label: "Devices",
    hint: "Scan & connect",
    Icon: DevicesIcon,
  },
  {
    id: "timeline",
    label: "Timeline",
    hint: "All BLE events",
    Icon: TimelineIcon,
  },
  {
    id: "settings",
    label: "Settings",
    hint: "Preferences",
    Icon: SettingsIcon,
  },
];

export function Sidebar({
  view,
  onChangeView,
  collapsed,
  onToggleCollapsed,
  ble,
}: {
  view: View;
  onChangeView: (v: View) => void;
  collapsed: boolean;
  onToggleCollapsed: () => void;
  ble: UseBleResult;
}) {
  const { state } = ble;
  const packetCount = state.packets.length;
  const metricCount = Object.values(state.metrics).filter(Boolean).length;
  const connectedCount = Object.values(state.connections).filter(
    (s) => s === "connected",
  ).length;

  const badgeFor = (v: View): number => {
    if (v === "timeline") return packetCount;
    if (v === "dashboard") return metricCount;
    if (v === "devices") return connectedCount;
    return 0;
  };

  return (
    <aside className={`sidebar ${collapsed ? "is-collapsed" : ""}`}>
      <nav className="sidebar-nav">
        {NAV.map((item) => {
          const active = view === item.id;
          const badge = badgeFor(item.id);
          return (
            <button
              key={item.id}
              className={`nav-item ${active ? "is-active" : ""}`}
              onClick={() => onChangeView(item.id)}
              title={collapsed ? item.label : undefined}
            >
              <span className="nav-icon">
                <item.Icon size={18} />
              </span>
              {!collapsed && (
                <>
                  <span className="nav-text">
                    <span className="nav-label">{item.label}</span>
                    <span className="nav-hint">{item.hint}</span>
                  </span>
                  {badge > 0 && <span className="nav-badge">{badge}</span>}
                </>
              )}
              {collapsed && badge > 0 && (
                <span className="nav-badge-dot" aria-hidden />
              )}
            </button>
          );
        })}
      </nav>

      <button
        className="sidebar-toggle"
        onClick={onToggleCollapsed}
        title={collapsed ? "Expand sidebar" : "Collapse sidebar"}
      >
        {collapsed ? <ChevronRightIcon /> : <ChevronLeftIcon />}
        {!collapsed && <span>Collapse</span>}
      </button>
    </aside>
  );
}
