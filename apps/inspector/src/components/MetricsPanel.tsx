import type { SemanticKind } from "@openring/core";
import type { MetricSnapshot } from "../ble/useBle";

const METRIC_VISUALS: Partial<
  Record<SemanticKind, { icon: string; label: string; accent: string }>
> = {
  "heart-rate": { icon: "❤", label: "Heart Rate", accent: "rgb(248, 113, 113)" },
  battery: { icon: "🔋", label: "Battery", accent: "rgb(52, 211, 153)" },
  spo2: { icon: "🩸", label: "SpO₂", accent: "rgb(56, 189, 248)" },
  hrv: { icon: "〰", label: "HRV", accent: "rgb(139, 92, 246)" },
  temperature: { icon: "🌡", label: "Temperature", accent: "rgb(251, 191, 36)" },
  steps: { icon: "👣", label: "Steps", accent: "rgb(56, 189, 248)" },
  "sleep-stage": { icon: "🌙", label: "Sleep", accent: "rgb(139, 92, 246)" },
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
    <section className="metrics-panel">
      <header className="cell-header">
        <h2>Device</h2>
        <span className="muted">Decoded metrics from subscribed streams</span>
      </header>

      {present.length === 0 ? (
        <div className="empty-state-soft">
          <p className="empty-title">No live metrics yet</p>
          <p className="empty-hint">
            Subscribe to a recognised characteristic (Battery Level, Heart Rate,
            Temperature…) and values will appear here.
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
  const formatted = formatValue(snapshot.value, snapshot.unit);

  return (
    <article
      key={snapshot.updatedAt}
      className="metric-card"
      style={{
        ["--metric-accent" as never]: visual.accent,
      }}
    >
      <header className="metric-head">
        <span className="metric-icon" aria-hidden>
          {visual.icon}
        </span>
        <span className="metric-label">{visual.label}</span>
        {!snapshot.inPlausibleRange && (
          <span className="metric-warn" title="value outside plausible range">
            !
          </span>
        )}
      </header>
      <div className="metric-value" key={snapshot.value}>
        <span className="metric-number">{formatted.value}</span>
        {formatted.unit && <span className="metric-unit">{formatted.unit}</span>}
      </div>
      <footer className="metric-foot">
        <span>{Math.round(snapshot.confidence * 100)}% confidence</span>
      </footer>
    </article>
  );
}

function formatValue(
  value: number,
  unit: string | undefined,
): { value: string; unit: string | undefined } {
  if (Number.isInteger(value)) {
    return { value: String(value), unit };
  }
  return { value: value.toFixed(1), unit };
}
