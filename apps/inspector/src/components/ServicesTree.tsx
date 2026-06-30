import { useState } from "react";
import { lookup } from "@openring/uuid";
import type { UseBleResult } from "../ble";

export function ServicesTree({ ble }: { ble: UseBleResult }) {
  const { state, subscribe } = ble;
  const id = state.selectedDeviceId;
  const services = id ? (state.services[id] ?? []) : [];
  const conn = id ? (state.connections[id] ?? "disconnected") : "disconnected";

  return (
    <section className="services-tree">
      <header className="cell-header">
        <h2>Services</h2>
        <span className="muted">
          {conn === "connected" ? "GATT tree of the selected device" : "Pick a device and connect"}
        </span>
      </header>

      {!id ? (
        <Empty label="No device selected" />
      ) : conn !== "connected" ? (
        <Empty label="Not connected" />
      ) : services.length === 0 ? (
        <Empty label="Discovering services…" />
      ) : (
        <ul className="services">
          {services.map((s) => (
            <ServiceRow
              key={s.uuid}
              service={s}
              onSubscribe={(uuid) => void subscribe(id, uuid)}
            />
          ))}
        </ul>
      )}
    </section>
  );
}

function ServiceRow({
  service,
  onSubscribe,
}: {
  service: { uuid: string; characteristics: { uuid: string; properties: string[] }[] };
  onSubscribe: (characteristicUuid: string) => void;
}) {
  const [open, setOpen] = useState(false);
  const info = lookup(service.uuid);
  const tag = categoryLabel(info.category);

  return (
    <li className={`service ${open ? "is-open" : ""}`}>
      <button className="service-row" onClick={() => setOpen((v) => !v)}>
        <span className="caret" aria-hidden>
          ▶
        </span>
        <span className="service-title">
          <span className="service-name">{info.name ?? "Unknown service"}</span>
          {tag && <span className={`uuid-tag tag-${info.category}`}>{tag}</span>}
        </span>
        <span className="service-uuid">
          {info.shortId ?? service.uuid.slice(0, 8).toUpperCase() + "…"}
        </span>
      </button>
      {open && (
        <ul className="characteristics">
          {service.characteristics.map((c) => {
            const cinfo = lookup(c.uuid);
            const supportsNotify =
              c.properties.includes("notify") ||
              c.properties.includes("indicate");
            return (
              <li key={c.uuid} className="characteristic">
                <div className="characteristic-main">
                  <span className="characteristic-name">
                    {cinfo.name ?? "Unknown characteristic"}
                  </span>
                  <span className="characteristic-uuid">
                    {cinfo.shortId ?? c.uuid.slice(0, 8).toUpperCase() + "…"}
                    <span className="dot-sep"> · </span>
                    {c.properties.join(" · ")}
                  </span>
                </div>
                {supportsNotify && (
                  <button
                    className="subscribe-btn"
                    onClick={(e) => {
                      e.stopPropagation();
                      onSubscribe(c.uuid);
                    }}
                  >
                    Subscribe
                  </button>
                )}
              </li>
            );
          })}
        </ul>
      )}
    </li>
  );
}

function Empty({ label }: { label: string }) {
  return (
    <div className="empty-state-soft">
      <p className="empty-title">{label}</p>
    </div>
  );
}

function categoryLabel(c: string): string | null {
  if (c === "sig-service" || c === "sig-characteristic") return "SIG";
  if (
    c === "vendor-service" ||
    c === "vendor-characteristic" ||
    c === "vendor-descriptor"
  )
    return "Vendor";
  return null;
}
