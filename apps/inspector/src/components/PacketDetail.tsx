import { useMemo } from "react";
import { lookup } from "@openring/uuid";
import { decode } from "@openring/decoder";
import { classify } from "@openring/parser";
import type { RingPacket } from "@openring/core";

function hex(bytes: Uint8Array, max?: number): string {
  const slice = max !== undefined ? bytes.subarray(0, max) : bytes;
  const out: string[] = [];
  for (let i = 0; i < slice.length; i++) {
    out.push(slice[i]!.toString(16).padStart(2, "0").toUpperCase());
  }
  return out.join(" ") + (max !== undefined && bytes.length > max ? " …" : "");
}

function formatFieldValue(value: number | Uint8Array): {
  hex: string;
  decimal: string | null;
} {
  if (value instanceof Uint8Array) {
    return { hex: hex(value), decimal: null };
  }
  return {
    hex: `0x${value.toString(16).toUpperCase().padStart(2, "0")}`,
    decimal: String(value),
  };
}

function kindIcon(kind: string): string {
  switch (kind) {
    case "heart-rate":
      return "❤";
    case "battery":
      return "🔋";
    case "spo2":
      return "🩸";
    case "temperature":
      return "🌡";
    case "hrv":
      return "〰";
    case "steps":
      return "👣";
    case "sleep-stage":
      return "🌙";
    default:
      return "•";
  }
}

export function PacketDetail({
  packet,
  onClose,
}: {
  packet: RingPacket;
  onClose: () => void;
}) {
  const { frame, event } = useMemo(() => {
    const frame = decode(packet);
    const event = classify(frame, []);
    return { frame, event };
  }, [packet]);

  const charInfo = lookup(packet.characteristicUuid);
  const date = new Date(packet.timestamp);
  const timestampPretty = `${date.toLocaleTimeString("en-GB", { hour12: false })}.${String(date.getMilliseconds()).padStart(3, "0")}`;

  return (
    <aside className="packet-detail">
      <header className="packet-detail-header">
        <div className="packet-detail-headline">
          <span className={`packet-detail-dir dir-${packet.direction}`}>
            {packet.direction === "in" ? "↓ RX" : "↑ TX"}
          </span>
          <div className="packet-detail-titles">
            <span className="packet-detail-title">
              {charInfo.name ?? "Unknown characteristic"}
            </span>
            <span className="packet-detail-subtitle">
              {charInfo.shortId
                ? `${charInfo.shortId} · `
                : ""}
              {packet.characteristicUuid}
            </span>
          </div>
          <button
            className="packet-detail-close"
            onClick={onClose}
            title="Close detail (Esc)"
            aria-label="Close"
          >
            ×
          </button>
        </div>
        <div className="packet-detail-meta">
          <span>{timestampPretty}</span>
          <span>·</span>
          <span>{packet.bytes.length} bytes</span>
          {packet.deviceId && (
            <>
              <span>·</span>
              <span className="mono-faint">{packet.deviceId.slice(0, 12)}…</span>
            </>
          )}
        </div>
      </header>

      <div className="packet-detail-body">
        <Section
          title="Decoder"
          subtitle={
            frame.unknown
              ? "framing not detected"
              : `${frame.fields.length} field(s) structured`
          }
        >
          <table className="field-table">
            <thead>
              <tr>
                <th>Field</th>
                <th>Off</th>
                <th>Len</th>
                <th>Value</th>
              </tr>
            </thead>
            <tbody>
              {frame.fields.map((f) => {
                const val = formatFieldValue(f.value);
                return (
                  <tr key={f.name}>
                    <td className="field-name">{f.name}</td>
                    <td className="field-num">@{f.offset}</td>
                    <td className="field-num">{f.length}</td>
                    <td>
                      <code className="field-hex">{val.hex}</code>
                      {val.decimal && (
                        <span className="field-dec"> · {val.decimal}</span>
                      )}
                      {f.note && (
                        <div className="field-note">{f.note}</div>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>

          {frame.checksum && (
            <div
              className={`checksum-badge ${
                frame.checksum.valid ? "is-valid" : "is-unknown"
              }`}
            >
              <strong>Checksum:</strong>
              {frame.checksum.valid ? (
                <>
                  <span className="checksum-algo">
                    {frame.checksum.algorithm}
                  </span>
                  <span>·</span>
                  <span>matches trailing byte</span>
                  <span className="checksum-ok">✓</span>
                </>
              ) : (
                <span>trailing byte not matched by xor / sum / crc8</span>
              )}
            </div>
          )}

          {frame.warnings.length > 0 && (
            <ul className="warnings">
              {frame.warnings.map((w, i) => (
                <li key={i}>{w}</li>
              ))}
            </ul>
          )}
        </Section>

        <Section
          title="Parser"
          subtitle={
            event.kind === "unknown"
              ? "no protocol matched"
              : `${event.protocolId ?? event.kind}`
          }
        >
          {event.kind !== "unknown" ? (
            <>
              <div className="semantic-headline">
                <span className="semantic-icon" aria-hidden>
                  {kindIcon(event.kind)}
                </span>
                <div>
                  <div className="semantic-kind">{event.kind}</div>
                  {event.values.length > 0 && (
                    <div className="semantic-values">
                      {event.values.slice(0, 3).map((v) => (
                        <span key={v.name} className="semantic-value">
                          {v.name}:{" "}
                          <strong>
                            {typeof v.value === "number"
                              ? Number.isInteger(v.value)
                                ? v.value
                                : v.value.toFixed(1)
                              : "…"}
                          </strong>
                          {v.unit ? ` ${v.unit}` : ""}
                        </span>
                      ))}
                      {event.values.length > 3 && (
                        <span className="semantic-more">
                          + {event.values.length - 3} more
                        </span>
                      )}
                    </div>
                  )}
                </div>
              </div>
              <ConfidenceBar value={event.confidence} />
            </>
          ) : (
            <p className="muted small">
              No <code>ProtocolDefinition</code> matched the decoded frame.
              Vendor opcodes belong in <code>@openring/protocol</code>; SIG
              characteristics get built-in decoders.
            </p>
          )}
        </Section>

        <Section title="Reasons" subtitle="what shaped the confidence">
          <ul className="reasons">
            {event.reasons.map((r, i) => (
              <li key={i}>{r}</li>
            ))}
          </ul>
        </Section>

        <Section title="Raw" subtitle={`${packet.bytes.length} bytes`}>
          <pre className="raw-hex">{hex(packet.bytes)}</pre>
        </Section>
      </div>
    </aside>
  );
}

function Section({
  title,
  subtitle,
  children,
}: {
  title: string;
  subtitle?: string;
  children: React.ReactNode;
}) {
  return (
    <section className="detail-section">
      <header className="detail-section-header">
        <h3>{title}</h3>
        {subtitle && <span className="muted small">{subtitle}</span>}
      </header>
      {children}
    </section>
  );
}

function ConfidenceBar({ value }: { value: number }) {
  const pct = Math.round(value * 100);
  return (
    <div className="confidence">
      <div className="confidence-row">
        <span className="confidence-label">Confidence</span>
        <span className="confidence-pct">{pct}%</span>
      </div>
      <div className="confidence-bar">
        <div
          className="confidence-bar-fill"
          style={{ width: `${pct}%` }}
          data-strength={pct >= 80 ? "high" : pct >= 50 ? "mid" : "low"}
        />
      </div>
    </div>
  );
}
