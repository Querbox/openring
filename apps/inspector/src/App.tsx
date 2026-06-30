import { TopBar } from "./components/TopBar";
import { DeviceList } from "./components/DeviceList";
import { ServicesTree } from "./components/ServicesTree";
import { MetricsPanel } from "./components/MetricsPanel";
import { PacketLog } from "./components/PacketLog";
import { useBle } from "./ble";

export function App() {
  const ble = useBle();

  return (
    <div className="app">
      <TopBar ble={ble} />

      {ble.state.error && (
        <div className="banner banner-error" role="alert">
          <span>{ble.state.error}</span>
        </div>
      )}

      <main className="dashboard">
        <section className="dash-cell cell-devices">
          <DeviceList ble={ble} />
        </section>
        <section className="dash-cell cell-metrics">
          <MetricsPanel metrics={ble.state.metrics} />
        </section>
        <section className="dash-cell cell-services">
          <ServicesTree ble={ble} />
        </section>
        <section className="dash-cell cell-packets">
          <PacketLog packets={ble.state.packets} />
        </section>
      </main>
    </div>
  );
}
