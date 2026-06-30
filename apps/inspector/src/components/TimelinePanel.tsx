import { useEffect, useMemo, useState } from "react";
import { lookup } from "@openring/uuid";
import { decode } from "@openring/decoder";
import { classify } from "@openring/parser";
import type { RingPacket } from "@openring/core";
import { PacketDetail } from "./PacketDetail";

type Filter = "all" | "in" | "out";

function hex(bytes: Uint8Array, max = 24): string {
  const out: string[] = [];
  const slice = bytes.subarray(0, max);
  for (let i = 0; i < slice.length; i++) {
    out.push(slice[i]!.toString(16).padStart(2, "0").toUpperCase());
  }
  return out.join(" ") + (bytes.length > max ? " …" : "");
}

function formatTime(ms: number): string {
  const d = new Date(ms);
  return (
    `${String(d.getHours()).padStart(2, "0")}:` +
    `${String(d.getMinutes()).padStart(2, "0")}:` +
    `${String(d.getSeconds()).padStart(2, "0")}.` +
    `${String(d.getMilliseconds()).padStart(3, "0")}`
  );
}

function characteristicLabel(uuid: string): string {
  const info = lookup(uuid);
  return info.name ?? info.shortId ?? uuid.slice(0, 8).toUpperCase();
}

interface DecoratedPacket {
  packet: RingPacket;
  semantic: {
    label: string;
    confidence: number;
  } | null;
}

function decorate(p: RingPacket): DecoratedPacket {
  const frame = decode(p);
  const event = classify(frame, []);
  if (event.kind === "unknown" || event.confidence < 0.5) {
    return { packet: p, semantic: null };
  }
  const headline = event.values[0];
  if (!headline) {
    return { packet: p, semantic: null };
  }
  const value =
    typeof headline.value === "number"
      ? Number.isInteger(headline.value)
        ? headline.value
        : headline.value.toFixed(1)
      : "";
  return {
    packet: p,
    semantic: {
      label: `${prettyKind(event.kind)} · ${value}${headline.unit ? " " + headline.unit : ""}`,
      confidence: event.confidence,
    },
  };
}

function prettyKind(k: string): string {
  switch (k) {
    case "heart-rate":
      return "❤ Heart Rate";
    case "battery":
      return "🔋 Battery";
    case "spo2":
      return "🩸 SpO₂";
    case "temperature":
      return "🌡 Temperature";
    case "hrv":
      return "〰 HRV";
    case "steps":
      return "👣 Steps";
    case "sleep-stage":
      return "🌙 Sleep";
    case "status":
      return "• Status";
    default:
      return k;
  }
}

export function TimelinePanel({ packets }: { packets: RingPacket[] }) {
  const [filter, setFilter] = useState<Filter>("all");
  const [selectedKey, setSelectedKey] = useState<string | null>(null);

  const filtered = useMemo(() => {
    const base =
      filter === "all" ? packets : packets.filter((p) => p.direction === filter);
    return base.map(decorate);
  }, [packets, filter]);

  const counts = useMemo(
    () => ({
      all: packets.length,
      in: packets.filter((p) => p.direction === "in").length,
      out: packets.filter((p) => p.direction === "out").length,
    }),
    [packets],
  );

  const selected = useMemo(() => {
    if (!selectedKey) return null;
    return filtered.find((d) => keyFor(d.packet) === selectedKey) ?? null;
  }, [selectedKey, filtered]);

  // Esc closes the detail panel.
  useEffect(() => {
    if (!selectedKey) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape") setSelectedKey(null);
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [selectedKey]);

  return (
    <section className="timeline-panel">
      <header className="view-header">
        <div>
          <h1>Timeline</h1>
          <p className="muted">
            Every notification and write, decoded when we recognise it.
            Click a row for the full decoder breakdown.
          </p>
        </div>
        <div className="filter-chips">
          <FilterChip
            label="All"
            count={counts.all}
            active={filter === "all"}
            onClick={() => setFilter("all")}
          />
          <FilterChip
            label="↓ RX"
            count={counts.in}
            active={filter === "in"}
            onClick={() => setFilter("in")}
          />
          <FilterChip
            label="↑ TX"
            count={counts.out}
            active={filter === "out"}
            onClick={() => setFilter("out")}
          />
        </div>
      </header>

      <div
        className={`timeline-body ${selected ? "has-detail" : ""}`}
      >
        {filtered.length === 0 ? (
          <div className="empty-state-soft empty-state-big">
            <p className="empty-title">No packets to show</p>
            <p className="empty-hint">
              Connect a device, subscribe to a notify characteristic, and
              packets stream in here.
            </p>
          </div>
        ) : (
          <ol className="timeline-list">
            {filtered.map((d) => {
              const key = keyFor(d.packet);
              const isSelected = key === selectedKey;
              return (
                <li
                  key={key}
                  className={`timeline-row dir-${d.packet.direction} ${
                    isSelected ? "is-selected" : ""
                  }`}
                  onClick={() => setSelectedKey(isSelected ? null : key)}
                >
                  <span className="timeline-time">
                    {formatTime(d.packet.timestamp)}
                  </span>
                  <span className="timeline-dir" aria-label={d.packet.direction}>
                    {d.packet.direction === "in" ? "↓" : "↑"}
                  </span>
                  <div className="timeline-main">
                    <div className="timeline-label-row">
                      <span className="timeline-char">
                        {characteristicLabel(d.packet.characteristicUuid)}
                      </span>
                      {d.semantic && (
                        <span className="timeline-semantic">
                          {d.semantic.label}
                        </span>
                      )}
                    </div>
                    <code className="timeline-hex">{hex(d.packet.bytes)}</code>
                  </div>
                  <span className="timeline-len">{d.packet.bytes.length}B</span>
                </li>
              );
            })}
          </ol>
        )}

        {selected && (
          <PacketDetail
            packet={selected.packet}
            onClose={() => setSelectedKey(null)}
          />
        )}
      </div>
    </section>
  );
}

function keyFor(p: RingPacket): string {
  return `${p.timestamp}-${p.characteristicUuid}-${p.bytes.length}`;
}

function FilterChip({
  label,
  count,
  active,
  onClick,
}: {
  label: string;
  count: number;
  active: boolean;
  onClick: () => void;
}) {
  return (
    <button
      className={`filter-chip ${active ? "is-active" : ""}`}
      onClick={onClick}
    >
      <span>{label}</span>
      <span className="filter-chip-count">{count}</span>
    </button>
  );
}
