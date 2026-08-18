"use client";

import { useMemo, useState, useRef } from "react";

type Baseline = { mood: number; appetite: number; mobility: number; sleep: number };
type WellbeingEntry = Baseline & { timestamp: number };
type MetricKey = keyof Baseline;
type Granularity = "daily" | "weekly" | "monthly";

const DETAIL_METRICS: { key: MetricKey; label: string; color: string }[] = [
  { key: "mood",      label: "Mood",      color: "#2f8f8a" },
  { key: "appetite",  label: "Appetite",  color: "#c98a2b" },
  { key: "mobility",  label: "Mobility",  color: "#4a6fd1" },
  { key: "sleep",     label: "Sleep",     color: "#9457c9" },
];

const W = 640, H_OVERALL = 160, H_DETAIL = 220;
const PL = 32, PR = 16, PT = 12, PB = 32;

function overall(e: WellbeingEntry) {
  return (e.mood + e.appetite + e.mobility + e.sleep) / 4;
}

function weekStart(date: Date): Date {
  const d = new Date(date);
  d.setHours(0, 0, 0, 0);
  const day = (d.getDay() + 6) % 7;
  d.setDate(d.getDate() - day);
  return d;
}

function formatShortDate(ts: number) {
  return new Date(ts).toLocaleString("en-AU", { day: "numeric", month: "short" });
}

function formatDateTime(ts: number) {
  return new Date(ts).toLocaleString("en-AU", {
    day: "numeric", month: "short", year: "numeric",
    hour: "numeric", minute: "2-digit", hour12: true,
  });
}

function filterWindow(entries: WellbeingEntry[], gran: Granularity, offset: number): {
  entries: WellbeingEntry[];
  periodStart: number;
  periodEnd: number;
} {
  const sorted = [...entries].sort((a, b) => a.timestamp - b.timestamp);
  if (gran === "daily") {
    return { entries: sorted, periodStart: 0, periodEnd: 0 };
  }
  const now = new Date();
  let start: Date, end: Date;
  if (gran === "weekly") {
    start = weekStart(now);
    start.setDate(start.getDate() - offset * 7);
    end = new Date(start);
    end.setDate(end.getDate() + 7);
  } else {
    start = new Date(now.getFullYear(), now.getMonth() - offset, 1);
    end   = new Date(start.getFullYear(), start.getMonth() + 1, 1);
  }
  return {
    entries: sorted.filter((e) => e.timestamp >= start.getTime() && e.timestamp < end.getTime()),
    periodStart: start.getTime(),
    periodEnd: end.getTime(),
  };
}

function periodLabel(gran: Granularity, offset: number): string {
  const now = new Date();
  if (gran === "weekly") {
    const ws = weekStart(now);
    ws.setDate(ws.getDate() - offset * 7);
    const we = new Date(ws); we.setDate(we.getDate() + 6);
    const o: Intl.DateTimeFormatOptions = { day: "numeric", month: "short" };
    return ws.toLocaleString("en-AU", o) + " – " + we.toLocaleString("en-AU", o);
  }
  const ms = new Date(now.getFullYear(), now.getMonth() - offset, 1);
  return ms.toLocaleString("en-AU", { month: "long", year: "numeric" });
}

type ChartLine = {
  key: string; label: string; color: string;
  getValue: (e: WellbeingEntry) => number;
  baselineVal?: number;
};

type TooltipState = { mouseX: number; mouseY: number; entry: WellbeingEntry } | null;

function LineChart({ entries, lines, height, hidden, periodStart, periodEnd }: {
  entries: WellbeingEntry[];
  lines: ChartLine[];
  height: number;
  hidden?: Set<string>;
  periodStart?: number;
  periodEnd?: number;
}) {
  const [tooltip, setTooltip] = useState<TooltipState>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  if (entries.length === 0) {
    return (
      <div className="flex h-24 items-center justify-center rounded-lg border border-dashed border-border text-xs text-ink-soft">
        No data for this period
      </div>
    );
  }

  const plotW = W - PL - PR;
  const plotH = height - PT - PB;

  
  
  const usePeriodBounds = periodStart !== undefined && periodEnd !== undefined && periodEnd > periodStart;
  const xFor = usePeriodBounds
    ? (ts: number) => PL + ((ts - periodStart!) / (periodEnd! - periodStart!)) * plotW
    : (_ts: number, i: number) => entries.length === 1 ? PL + plotW / 2 : PL + (i / (entries.length - 1)) * plotW;

  const yFor = (v: number) => PT + plotH - (v / 10) * plotH;
  const step = Math.max(1, Math.ceil(entries.length / 6));
  const visible = hidden ? lines.filter((l) => !hidden.has(l.key)) : lines;

  
  const xTicks: { label: string; x: number }[] = usePeriodBounds
    ? (() => {
        
        const span = periodEnd! - periodStart!;
        const tickCount = 5;
        return Array.from({ length: tickCount }, (_, i) => {
          const ts = periodStart! + (span / (tickCount - 1)) * i;
          return { label: formatShortDate(ts), x: PL + ((ts - periodStart!) / span) * plotW };
        });
      })()
    : entries
        .map((e, i) => i % step === 0 ? { label: formatShortDate(e.timestamp), x: xFor(e.timestamp, i) } : null)
        .filter((t): t is { label: string; x: number } => t !== null);

  return (
    <div ref={containerRef} className="relative">
      <svg
        viewBox={`0 0 ${W} ${height}`}
        className="w-full"
        onMouseLeave={() => setTooltip(null)}
      >
        {[0, 5, 10].map((v) => (
          <g key={v}>
            <line x1={PL} x2={W - PR} y1={yFor(v)} y2={yFor(v)} stroke="var(--color-border)" strokeWidth={1} />
            <text x={4} y={yFor(v) + 4} fontSize={9} fill="var(--color-muted-foreground)">{v}</text>
          </g>
        ))}
        {xTicks.map(({ label, x }) => (
          <text key={label + x} x={x} y={height - 8} fontSize={8} textAnchor="middle" fill="var(--color-muted-foreground)">
            {label}
          </text>
        ))}

        
        {usePeriodBounds && (
          <>
            <line x1={PL} x2={PL} y1={PT} y2={height - PB} stroke="var(--color-border)" strokeWidth={1} strokeDasharray="3 3" />
            <line x1={W - PR} x2={W - PR} y1={PT} y2={height - PB} stroke="var(--color-border)" strokeWidth={1} strokeDasharray="3 3" />
          </>
        )}

        {visible.map((line) => {
          const pts = entries.map((e, i) => `${xFor(e.timestamp, i)},${yFor(line.getValue(e))}`).join(" ");
          return (
            <g key={line.key}>
              {line.baselineVal !== undefined && (
                <line x1={PL} x2={W - PR} y1={yFor(line.baselineVal)} y2={yFor(line.baselineVal)}
                  stroke={line.color} strokeWidth={0.8} strokeDasharray="3 4" opacity={0.3} />
              )}
              <polyline points={pts} fill="none" stroke={line.color} strokeWidth={2} strokeLinejoin="round" />
              {entries.map((e, i) => (
                <circle
                  key={`${line.key}-${e.timestamp}`}
                  cx={xFor(e.timestamp, i)} cy={yFor(line.getValue(e))} r={4}
                  fill={line.color} stroke="white" strokeWidth={1.5}
                  className="cursor-pointer"
                  onMouseEnter={(evt) => {
                    const rect = containerRef.current?.getBoundingClientRect();
                    if (!rect) return;
                    setTooltip({ mouseX: evt.clientX - rect.left, mouseY: evt.clientY - rect.top, entry: e });
                  }}
                />
              ))}
            </g>
          );
        })}
      </svg>

      {tooltip && (
        <div
          className="pointer-events-none absolute z-20 w-52 rounded-xl border border-border bg-card px-3 py-2.5 shadow-lift text-xs"
          style={{
            left: Math.min(tooltip.mouseX + 14, (containerRef.current?.clientWidth ?? 400) - 218),
            top: Math.max(tooltip.mouseY - 90, 4),
          }}
        >
          <div className="mb-1.5 text-[10px] font-semibold text-muted-foreground">
            {formatDateTime(tooltip.entry.timestamp)}
          </div>
          {DETAIL_METRICS.map((m) => (
            <div key={m.key} className="flex items-center justify-between py-0.5">
              <span className="flex items-center gap-1.5">
                <span className="h-1.5 w-1.5 rounded-full" style={{ backgroundColor: m.color }} />
                <span className="text-ink-soft">{m.label}</span>
              </span>
              <span className="font-semibold text-ink">{tooltip.entry[m.key]}/10</span>
            </div>
          ))}
          <div className="mt-1 flex items-center justify-between border-t border-border pt-1">
            <span className="flex items-center gap-1.5">
              <span className="h-1.5 w-1.5 rounded-full bg-[#64748b]" />
              <span className="text-ink-soft">Overall</span>
            </span>
            <span className="font-semibold text-ink">{overall(tooltip.entry).toFixed(1)}/10</span>
          </div>
        </div>
      )}
    </div>
  );
}

export default function HealthChart({ history, baseline }: { history: WellbeingEntry[]; baseline: Baseline }) {
  const [gran, setGran]     = useState<Granularity>("daily");
  const [offset, setOffset] = useState(0);
  const [hidden, setHidden] = useState<Set<string>>(new Set());

  const baselineOverall = (baseline.mood + baseline.appetite + baseline.mobility + baseline.sleep) / 4;
  const { entries: windowed, periodStart, periodEnd } = useMemo(
    () => filterWindow(history, gran, offset),
    [history, gran, offset]
  );

  const overallLines: ChartLine[] = [
    { key: "overall", label: "Overall", color: "#64748b", getValue: overall, baselineVal: baselineOverall },
  ];
  const detailLines: ChartLine[] = DETAIL_METRICS.map((m) => ({
    key: m.key, label: m.label, color: m.color,
    getValue: (e: WellbeingEntry) => e[m.key], baselineVal: baseline[m.key],
  }));

  if (history.length === 0) {
    return (
      <div className="flex h-40 items-center justify-center rounded-lg border border-dashed border-border text-sm text-ink-soft">
        No wellbeing checks logged yet — this chart fills in as the care team logs them.
      </div>
    );
  }

  const bounds = gran !== "daily" ? { periodStart, periodEnd } : {};

  return (
    <div className="flex flex-col gap-5">
      
      <div className="flex flex-wrap items-center gap-3">
        <div className="flex gap-1 rounded-full bg-secondary p-1">
          {(["daily", "weekly", "monthly"] as Granularity[]).map((g) => (
            <button key={g} onClick={() => { setGran(g); setOffset(0); }}
              className={`rounded-full px-3 py-1 text-xs font-medium capitalize transition-colors ${
                gran === g ? "bg-primary text-primary-foreground" : "text-ink-soft hover:bg-card"}`}>
              {g}
            </button>
          ))}
        </div>
        {gran !== "daily" && (
          <div className="flex items-center gap-1">
            <button onClick={() => setOffset((o) => o + 1)}
              className="rounded-full px-2.5 py-1 text-base leading-none text-ink-soft hover:bg-secondary" title="Previous period">
              &#8249;
            </button>
            <span className="min-w-[140px] text-center text-xs font-medium text-ink">{periodLabel(gran, offset)}</span>
            <button onClick={() => setOffset((o) => Math.max(0, o - 1))} disabled={offset === 0}
              className="rounded-full px-2.5 py-1 text-base leading-none text-ink-soft hover:bg-secondary disabled:opacity-30" title="Next period">
              &#8250;
            </button>
          </div>
        )}
      </div>

      
      <div>
        <div className="mb-1.5 flex items-center justify-between">
          <div className="flex items-center gap-1.5">
            <span className="h-2 w-2 rounded-full bg-[#64748b]" />
            <span className="text-xs font-semibold text-ink">Overall Health Matrix</span>
          </div>
          <span className="text-[10px] text-muted-foreground">baseline {baselineOverall.toFixed(1)}/10</span>
        </div>
        <LineChart entries={windowed} lines={overallLines} height={H_OVERALL} {...bounds} />
      </div>

      
      <div>
        <div className="mb-1.5"><span className="text-xs font-semibold text-ink">Specified Health Matrix</span></div>
        <LineChart entries={windowed} lines={detailLines} height={H_DETAIL} hidden={hidden} {...bounds} />
        <div className="mt-2 flex flex-wrap gap-2">
          {DETAIL_METRICS.map((m) => (
            <button key={m.key}
              onClick={() => setHidden((prev) => { const n = new Set(prev); if (n.has(m.key)) n.delete(m.key); else n.add(m.key); return n; })}
              className={`flex items-center gap-1.5 rounded-full border border-border px-2.5 py-1 text-xs transition-opacity ${hidden.has(m.key) ? "opacity-35" : ""}`}>
              <span className="h-2 w-2 rounded-full" style={{ backgroundColor: m.color }} />
              <span className="text-ink-soft">{m.label}</span>
              <span className="text-muted-foreground">(bl {baseline[m.key]}/10)</span>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
