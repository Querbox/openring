import { lookup } from "@openring/uuid";
import type { RingPacket } from "@openring/core";

function hex(bytes: Uint8Array): string {
  return Array.from(bytes)
    .map((b) => b.toString(16).padStart(2, "0").toUpperCase())
    .join(" ");
}

function formatTime(ms: number): string {
  const d = new Date(ms);
  return `${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}:${String(d.getSeconds()).padStart(2, "0")}.${String(d.getMilliseconds()).padStart(3, "0")}`;
}

function characteristicLabel(uuid: string): { primary: string; secondary: string } {
  const info = lookup(uuid);
  if (info.name) {
    return {
      primary: info.name,
      secondary: info.shortId ?? `${uuid.slice(0, 8).toUpperCase()}…`,
    };
  }
  return {
    primary: info.shortId ?? `${uuid.slice(0, 8).toUpperCase()}…`,
    secondary: "unknown",
  };
}

export function PacketLog({ packets }: { packets: RingPacket[] }) {
  return (
    <section className="packet-log">
      <header className="panel-header">
        <div>
          <h2>Packet Logger</h2>
          <p className="muted">
            Live notifications from subscribed characteristics. Most recent first.
          </p>
        </div>
        <span className="pill">{packets.length} packets</span>
      </header>

      {packets.length === 0 ? (
        <div className="empty-state">
          <p className="empty-title">No packets yet</p>
          <p className="empty-hint">
            Connect a device, then subscribe to a notify characteristic on the
            Devices tab.
          </p>
        </div>
      ) : (
        <ol className="packets">
          {packets.map((p, i) => {
            const label = characteristicLabel(p.characteristicUuid);
            return (
              <li
                key={`${p.timestamp}-${i}`}
                className={`packet dir-${p.direction}`}
              >
                <div className="packet-meta">
                  <span className="packet-time">{formatTime(p.timestamp)}</span>
                  <span className="packet-dir">
                    {p.direction === "in" ? "↓ RX" : "↑ TX"}
                  </span>
                  <span
                    className="packet-char"
                    title={p.characteristicUuid}
                  >
                    {label.primary}
                    <span className="packet-char-sub"> · {label.secondary}</span>
                  </span>
                  <span className="packet-len">{p.bytes.length} bytes</span>
                </div>
                <code className="packet-bytes">{hex(p.bytes)}</code>
              </li>
            );
          })}
        </ol>
      )}
    </section>
  );
}
