import { lookup } from "@openring/uuid";
import type { RingPacket } from "@openring/core";

function hex(bytes: Uint8Array): string {
  return Array.from(bytes)
    .map((b) => b.toString(16).padStart(2, "0").toUpperCase())
    .join(" ");
}

function formatTime(ms: number): string {
  const d = new Date(ms);
  return `${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}:${String(d.getSeconds()).padStart(2, "0")}`;
}

function characteristicLabel(uuid: string): string {
  const info = lookup(uuid);
  return info.name ?? info.shortId ?? uuid.slice(0, 8).toUpperCase();
}

export function PacketLog({ packets }: { packets: RingPacket[] }) {
  return (
    <section className="packet-log">
      <header className="cell-header">
        <h2>Live packets</h2>
        <span className="pill">{packets.length}</span>
      </header>

      {packets.length === 0 ? (
        <div className="empty-state-soft">
          <p className="empty-title">No packets yet</p>
          <p className="empty-hint">
            Connect a device and subscribe to a notify characteristic.
          </p>
        </div>
      ) : (
        <ol className="packets">
          {packets.map((p, i) => (
            <li
              key={`${p.timestamp}-${i}`}
              className={`packet dir-${p.direction}`}
            >
              <span className="packet-time">{formatTime(p.timestamp)}</span>
              <span className="packet-dir">
                {p.direction === "in" ? "↓ RX" : "↑ TX"}
              </span>
              <span className="packet-char" title={p.characteristicUuid}>
                {characteristicLabel(p.characteristicUuid)}
              </span>
              <code className="packet-bytes">{hex(p.bytes)}</code>
            </li>
          ))}
        </ol>
      )}
    </section>
  );
}
