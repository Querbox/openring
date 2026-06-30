import type { SemanticKind } from "@openring/core";
import type { SemanticValue } from "@openring/parser";
import type { MetricSnapshot } from "../ble/useBle";

type MetricVisual = {
  icon: string;
  label: string;
  accent: string;
  /** Visual scale for the progress bar — value range that maps to 0..100% fill. */
  scale?: { min: number; max: number; unit: string };
};

const METRIC_VISUALS: Partial<Record<SemanticKind, MetricVisual>> = {
  "heart-rate": {
    icon: "❤",
    label: "Heart Rate",
    accent: "rgb(248, 113, 113)",
    scale: { min: 40, max: 180, unit: "bpm" },
  },
  battery: {
    icon: "🔋",
    label: "Battery",
    accent: "rgb(52, 211, 153)",
    scale: { min: 0, max: 100, unit: "%" },
  },
  spo2: {
    icon: "🩸",
    label: "SpO₂",
    accent: "rgb(56, 189, 248)",
    scale: { min: 85, max: 100, unit: "%" },
  },
  hrv: {
    icon: "〰",
    label: "HRV",
    accent: "rgb(139, 92, 246)",
    scale: { min: 20, max: 100, unit: "ms" },
  },
  temperature: {
    icon: "🌡",
    label: "Temperature",
    accent: "rgb(251, 191, 36)",
    scale: { min: 35, max: 38, unit: "°C" },
  },
  steps: { icon: "👣", label: "Steps", accent: "rgb(56, 189, 248)" },
  "sleep-stage": {
    icon: "🌙",
    label: "Sleep",
    accent: "rgb(139, 92, 246)",
  },
  status: { icon: "•", label: "Status", accent: "rgb(123, 128, 144)" },
};

const KIND_ORDER: SemanticKind[] = [
  "heart-rate",
  "spo2",
  "battery",
  "temperature",
  "hrv",
  "steps",
  "sleep-stage",
  "status",
];

export function MetricsPanel({
  metrics,
}: {
  metrics: Partial<Record<SemanticKind, MetricSnapshot>>;
}) {
  const present = KIND_ORDER.filter(
    (k): k is SemanticKind => metrics[k] !== undefined,
  );

  return (
    <section className="dashboard-panel">
      <header className="view-header">
        <div>
          <h1>Dashboard</h1>
          <p className="muted">
            Live sensor values decoded from subscribed streams.
          </p>
        </div>
      </header>

      {present.length === 0 ? (
        <div className="empty-state-soft empty-state-big">
          <div className="empty-illustration" aria-hidden>
            <span>❤</span>
            <span>🔋</span>
            <span>🩸</span>
            <span>🌡</span>
          </div>
          <p className="empty-title">No live metrics yet</p>
          <p className="empty-hint">
            Open <strong>Devices</strong>, connect a smart ring, and subscribe
            to a recognised characteristic (Battery Level, Heart Rate, SpO₂,
            Temperature…). Values appear here as they stream.
          </p>
        </div>
      ) : (
        <div className="metrics-grid">
          {present.map((kind) => (
            <MetricCard key={kind} kind={kind} snapshot={metrics[kind]!} />
          ))}
        </div>
      )}
    </section>
  );
}

function MetricCard({
  kind,
  snapshot,
}: {
  kind: SemanticKind;
  snapshot: MetricSnapshot;
}) {
  const visual = METRIC_VISUALS[kind] ?? {
    icon: "•",
    label: kind,
    accent: "rgb(123, 128, 144)",
  };
  const headline = snapshot.headline;
  const formatted = formatNumber(headline.value);
  const rrSupplements = snapshot.supplementals.filter((s) =>
    s.name.startsWith("rr-"),
  );
  const otherSupplements = snapshot.supplementals.filter(
    (s) => !s.name.startsWith("rr-"),
  );
  const fillPercent = computeFill(visual, headline);

  return (
    <article
      key={snapshot.updatedAt}
      className="metric-card"
      style={{ ["--metric-accent" as never]: visual.accent }}
    >
      <header className="metric-head">
        <span className="metric-icon" aria-hidden>
          {visual.icon}
        </span>
        <span className="metric-label">{visual.label}</span>
        {!headline.inPlausibleRange && (
          <span className="metric-warn" title="value outside plausible range">
            !
          </span>
        )}
      </header>

      <div className="metric-value" key={headline.value as number}>
        <span className="metric-number">{formatted}</span>
        {headline.unit && (
          <span className="metric-unit">{headline.unit}</span>
        )}
      </div>

      {fillPercent !== null && (
        <div className="metric-bar">
          <div
            className="metric-bar-fill"
            style={{ width: `${fillPercent}%` }}
          />
          {visual.scale && (
            <div className="metric-bar-scale">
              <span>{visual.scale.min}</span>
              <span>{visual.scale.max}</span>
            </div>
          )}
        </div>
      )}

      {(otherSupplements.length > 0 || rrSupplements.length > 0) && (
        <div className="metric-supplements">
          {otherSupplements.map((s) => (
            <div key={s.name} className="metric-supp">
              <span className="metric-supp-label">{labelFor(s.name)}</span>
              <span className="metric-supp-value">
                {formatNumber(s.value)}
                {s.unit ? ` ${s.unit}` : ""}
              </span>
            </div>
          ))}
          {rrSupplements.length > 0 && (
            <div className="metric-supp">
              <span className="metric-supp-label">RR intervals</span>
              <span className="metric-supp-value metric-supp-rr">
                {rrSupplements
                  .slice(0, 4)
                  .map((s) => formatNumber(s.value))
                  .join(" · ")}
                {rrSupplements.length > 4 && (
                  <span className="metric-supp-more">
                    {" "}
                    + {rrSupplements.length - 4} more
                  </span>
                )}{" "}
                ms
              </span>
            </div>
          )}
        </div>
      )}

      <footer className="metric-foot">
        <span className="metric-confidence">
          {Math.round(snapshot.confidence * 100)}% confidence
        </span>
        <span className="metric-time">{relativeTime(snapshot.updatedAt)}</span>
      </footer>
    </article>
  );
}

function computeFill(visual: MetricVisual, headline: SemanticValue): number | null {
  if (!visual.scale) return null;
  if (typeof headline.value !== "number") return null;
  const { min, max } = visual.scale;
  const fraction = (headline.value - min) / (max - min);
  if (Number.isNaN(fraction)) return null;
  return Math.max(0, Math.min(100, fraction * 100));
}

function formatNumber(v: number | Uint8Array | string): string {
  if (typeof v === "number") {
    if (Number.isInteger(v)) return String(v);
    return v.toFixed(1);
  }
  if (typeof v === "string") return v;
  return "—";
}

function labelFor(name: string): string {
  if (name === "energy") return "Energy expended";
  if (name === "pulse") return "Pulse";
  return name.charAt(0).toUpperCase() + name.slice(1);
}

function relativeTime(ms: number): string {
  const diff = Date.now() - ms;
  if (diff < 1500) return "just now";
  if (diff < 60_000) return `${Math.round(diff / 1000)}s ago`;
  return `${Math.round(diff / 60_000)}m ago`;
}
