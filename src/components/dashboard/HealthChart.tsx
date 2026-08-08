"use client";

import { useMemo, useState } from "react";

type Baseline = { mood: number; appetite: number; mobility: number; sleep: number };
type WellbeingEntry = Baseline & { timestamp: number };
type MetricKey = keyof Baseline;
type Granularity = "daily" | "weekly" | "monthly";

const METRICS: { key: MetricKey; label: string; color: string }[] = [
  { key: "mood",      label: "Mood",      color: "#2f8f8a" },
  { key: "appetite",  label: "Appetite",  color: "#c98a2b" },
  { key: "mobility",  label: "Mobility",  color: "#4a6fd1" },
  { key: "sleep",     label: "Sleep",     color: "#9457c9" },
];

const GRANULARITIES: { key: Granularity; label: string }[] = [
  { key: "daily",   label: "Daily"   },
  { key: "weekly",  label: "Weekly"  },
  { key: "monthly", label: "Monthly" },
];

const WIDTH = 640, HEIGHT = 240;
const PAD_LEFT = 32, PAD_RIGHT = 16, PAD_TOP = 16, PAD_BOTTOM = 28;

function weekKey(date: Date): string {
  const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
  const dayNum = (d.getUTCDay() + 6) % 7;
  d.setUTCDate(d.getUTCDate() - dayNum);
  const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
  const weekNum = Math.ceil(((d.getTime() - yearStart.getTime()) / 86400000 + 1) / 7);
  return `${d.getUTCFullYear()}-${String(weekNum).padStart(2, "0")}`;
}

function monthKey(date: Date): string {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;
}

function formatShortDate(ts: number): string {
  return new Date(ts).toLocaleString("en-AU", { day: "numeric", month: "short" });
}

function formatDateTime(ts: number): string {
  return new Date(ts).toLocaleString("en-AU", {
    day: "numeric", month: "short", year: "numeric",
    hour: "numeric", minute: "2-digit", hour12: true,
  });
}

function aggregate(history: WellbeingEntry[], granularity: Granularity): WellbeingEntry[] {
  if (granularity === "daily") return history;
  const keyFor = granularity === "weekly" ? weekKey : monthKey;
  const buckets = new Map<string, WellbeingEntry[]>();
  for (const entry of history) {
    const key = keyFor(new Date(entry.timestamp));
    const bucket = buckets.get(key);
    if (bucket) bucket.push(entry);
    else buckets.set(key, [entry]);
  }
  const result: WellbeingEntry[] = [];
  for (const entries of buckets.values()) {
    const count = entries.length;
    const sum = entries.reduce(
      (acc, e) => ({ mood: acc.mood + e.mood, appetite: acc.appetite + e.appetite, mobility: acc.mobility + e.mobility, sleep: acc.sleep + e.sleep, timestamp: 0 }),
      { mood: 0, appetite: 0, mobility: 0, sleep: 0, timestamp: 0 }
    );
    result.push({
      mood:      Math.round((sum.mood      / count) * 10) / 10,
      appetite:  Math.round((sum.appetite  / count) * 10) / 10,
      mobility:  Math.round((sum.mobility  / count) * 10) / 10,
      sleep:     Math.round((sum.sleep     / count) * 10) / 10,
      timestamp: Math.max(...entries.map((e) => e.timestamp)),
    });
  }
  return result.sort((a, b) => a.timestamp - b.timestamp);
}

export default function HealthChart({ history, baseline }: { history: WellbeingEntry[]; baseline: Baseline }) {
  const [hidden, setHidden] = useState<Set<MetricKey>>(new Set());
  const [granularity, setGranularity] = useState<Granularity>("daily");
  const sorted = useMemo(() => aggregate(history, granularity), [history, granularity]);

  const granularityPicker = (
    <div className="mb-3 flex gap-1 rounded-full bg-secondary p-1 w-fit">
      {GRANULARITIES.map((g) => (
        <button
          key={g.key}
          onClick={() => setGranularity(g.key)}
          className={`rounded-full px-3 py-1 text-xs font-medium transition-colors ${
            granularity === g.key ? "bg-primary text-primary-foreground" : "text-ink-soft hover:bg-card"
          }`}
        >
          {g.label}
        </button>
      ))}
    </div>
  );

  if (history.length === 0) {
    return (
      <div>
        {granularityPicker}
        <div className="flex h-40 items-center justify-center rounded-lg border border-dashed border-border text-sm text-ink-soft">
          No wellbeing checks logged yet — this chart fills in as the care team logs them.
        </div>
      </div>
    );
  }

  const plotWidth  = WIDTH  - PAD_LEFT - PAD_RIGHT;
  const plotHeight = HEIGHT - PAD_TOP  - PAD_BOTTOM;
  const xFor = (i: number) => sorted.length === 1 ? PAD_LEFT + plotWidth / 2 : PAD_LEFT + (i / (sorted.length - 1)) * plotWidth;
  const yFor = (v: number) => PAD_TOP + plotHeight - (v / 10) * plotHeight;
  const labelStep = Math.max(1, Math.ceil(sorted.length / 6));

  function toggleMetric(key: MetricKey) {
    setHidden((prev) => { const next = new Set(prev); next.has(key) ? next.delete(key) : next.add(key); return next; });
  }

  return (
    <div>
      {granularityPicker}

      <svg viewBox={`0 0 ${WIDTH} ${HEIGHT}`} className="w-full" role="img" aria-label="Wellbeing history chart">
        {[0, 5, 10].map((v) => (
          <g key={v}>
            <line x1={PAD_LEFT} x2={WIDTH - PAD_RIGHT} y1={yFor(v)} y2={yFor(v)} stroke="var(--color-border)" strokeWidth={1} />
            <text x={4} y={yFor(v) + 4} fontSize={10} fill="var(--color-muted-foreground)">{v}</text>
          </g>
        ))}
        {sorted.map((entry, i) =>
          i % labelStep === 0 ? (
            <text key={entry.timestamp} x={xFor(i)} y={HEIGHT - 8} fontSize={10} textAnchor="middle" fill="var(--color-muted-foreground)">
              {formatShortDate(entry.timestamp)}
            </text>
          ) : null
        )}
        {METRICS.filter((m) => !hidden.has(m.key)).map((metric) => {
          const points = sorted.map((e, i) => `${xFor(i)},${yFor(e[metric.key])}`).join(" ");
          return (
            <g key={metric.key}>
              <polyline points={points} fill="none" stroke={metric.color} strokeWidth={2} />
              {sorted.map((e, i) => (
                <circle key={e.timestamp} cx={xFor(i)} cy={yFor(e[metric.key])} r={3} fill={metric.color}>
                  <title>{metric.label}: {e[metric.key]}/10 · {formatDateTime(e.timestamp)}</title>
                </circle>
              ))}
            </g>
          );
        })}
      </svg>

      <div className="mt-2 flex flex-wrap gap-3">
        {METRICS.map((metric) => (
          <button
            key={metric.key}
            onClick={() => toggleMetric(metric.key)}
            className={`flex items-center gap-1.5 rounded-full px-2 py-1 text-xs transition-opacity ${hidden.has(metric.key) ? "opacity-40" : ""}`}
            title={`Baseline: ${baseline[metric.key]}/10`}
          >
            <span className="h-2 w-2 rounded-full" style={{ backgroundColor: metric.color }} />
            <span className="text-ink-soft">
              {metric.label} <span className="text-muted-foreground">(baseline {baseline[metric.key]})</span>
            </span>
          </button>
        ))}
      </div>
    </div>
  );
}
