"use client";

import { useState, useEffect } from "react";

// ================================================================
// Types
// ================================================================

type Baseline = { mood: number; appetite: number; mobility: number; sleep: number };
type WellbeingEntry = Baseline & { timestamp: number };

type Patient = {
  id: string;
  name: string;
  age: number;
  room: string;
  baseline: Baseline;
};

type CareNote = {
  id: string;
  content: string;
  authorRole: string;
  type: string;
  timestamp: number;
  sensitive?: boolean;
};

type VitalSigns = {
  id: string;
  authorRole?: string;
  timestamp: number;
  systolic?: number | null;
  diastolic?: number | null;
  heartRate?: number | null;
  temperature?: number | null;
  oxygenSaturation?: number | null;
};

type Diagnosis = {
  id: string;
  condition: string;
  status: string;
};

// Unified activity event — either a care note or a vitals entry, both tied
// to a patient and an authorRole so staff presence on a shift can be derived
// from any clinical data change, not just narrative notes.
type ActivityEvent = {
  authorRole: string;
  timestamp: number;
  patientId: string;
  kind: "note" | "vitals";
};

// ================================================================
// Helpers
// ================================================================

function timeAgo(ts: number): string {
  const mins = (Date.now() - ts) / 60000;
  if (mins < 1) return "just now";
  if (mins < 60) return `${Math.floor(mins)}m ago`;
  const hrs = mins / 60;
  if (hrs < 24) return `${Math.floor(hrs)}h ago`;
  return `${Math.floor(hrs / 24)}d ago`;
}

function formatDateTime(ts: number): string {
  return new Date(ts).toLocaleString("en-AU", {
    day: "numeric", month: "short",
    hour: "numeric", minute: "2-digit", hour12: true,
  });
}

type ShiftMeta = { label: string; start: number; colorClass: string; bgClass: string };

function getCurrentShift(): ShiftMeta {
  const now = new Date();
  const h = now.getHours();
  const base = (hour: number, daysOffset = 0) => {
    const d = new Date(now);
    d.setDate(d.getDate() + daysOffset);
    d.setHours(hour, 0, 0, 0);
    return d.getTime();
  };
  if (h >= 6 && h < 14)
    return { label: "Morning  06:00–14:00", start: base(6),  colorClass: "text-teal-700", bgClass: "bg-teal-100" };
  if (h >= 14 && h < 22)
    return { label: "Afternoon  14:00–22:00", start: base(14), colorClass: "text-teal-700",  bgClass: "bg-teal-100" };
  return {
    label: "Night  22:00–06:00",
    start: h < 6 ? base(22, -1) : base(22),
    colorClass: "text-indigo-700", bgClass: "bg-indigo-50",
  };
}

const SHIFT_HOURS: Record<number, { label: string; colorClass: string; bgClass: string }> = {
  6:  { label: "Morning  06:00–14:00",  colorClass: "text-teal-700",  bgClass: "bg-teal-100"  },
  14: { label: "Afternoon  14:00–22:00", colorClass: "text-teal-700",   bgClass: "bg-teal-100"   },
  22: { label: "Night  22:00–06:00",     colorClass: "text-teal-700", bgClass: "bg-teal-50" },
};

function getPreviousShiftWindows(currentShiftStart: number, count: number) {
  const result: Array<{ key: string; label: string; start: number; end: number; colorClass: string; bgClass: string }> = [];
  let cursor = currentShiftStart;
  for (let i = 0; i < count; i++) {
    const end = cursor;
    const start = cursor - 8 * 3600 * 1000;
    cursor = start;
    const h = new Date(start).getHours();
    const meta = SHIFT_HOURS[h] ?? { label: `Shift at ${String(h).padStart(2, "0")}:00`, colorClass: "text-muted-foreground", bgClass: "bg-secondary" };
    const dateLabel = new Date(start).toLocaleDateString("en-AU", { weekday: "short", day: "numeric", month: "short" });
    result.push({ key: `prev-${start}`, label: `${meta.label} · ${dateLabel}`, start, end, colorClass: meta.colorClass, bgClass: meta.bgClass });
  }
  return result;
}

const METRIC_KEYS: (keyof Baseline)[] = ["mood", "appetite", "mobility", "sleep"];

function getRoleType(authorRole: string): "Doctor" | "Nurse" | "Other" {
  if (/\b(Doctor|Physician|Dr\.?)\b/i.test(authorRole)) return "Doctor";
  if (/\b(Nurse|Carer|RN|LPN)\b/i.test(authorRole)) return "Nurse";
  return "Other";
}

function isHumanClinicalStaff(authorRole: string): boolean {
  return getRoleType(authorRole) !== "Other";
}

function getDisplayName(authorRole: string): string {
  const m = authorRole.match(/^(.*?)\s*\(.*?\)\s*$/);
  return (m ? m[1] : authorRole).trim() || authorRole;
}

// ================================================================
// ShiftTimeline — three-row layout: shift band + per-type tracks
// ================================================================
//
// All rows share a 6rem label column so the "now" line at nowPct%
// of the track area aligns perfectly across the shift band, hour
// ticks, and every data row.

function ShiftTimeline({ todayNotes, todayVitals, todayMeds, nowMs, todayStartMs }: {
  todayNotes: { timestamp: number }[];
  todayVitals: { timestamp: number }[];
  todayMeds: { timestamp: number }[];
  nowMs: number;
  todayStartMs: number;
}) {
  const dayMs  = 24 * 3600 * 1000;
  const toPct  = (ts: number) => Math.min(100, Math.max(0, ((ts - todayStartMs) / dayMs) * 100));
  const nowPct = toPct(nowMs);

  // label col = w-24 (6rem) + gap-3 (0.75rem) = 6.75rem
  // "now" line left within outer wrapper:  calc(6.75rem + (100% - 6.75rem) * nowPct/100)
  const nowLeft = `calc(6.75rem + (100% - 6.75rem) * ${nowPct / 100})`;

  const BANDS = [
    { left: "0%",     width: "25%",    bg: "linear-gradient(90deg,#e0e7ff,#c7d2fe)" }, // Night  00–06
    { left: "25%",    width: "33.34%", bg: "linear-gradient(90deg,#fef9c3,#fde68a)" }, // Morning 06–14
    { left: "58.34%", width: "33.33%", bg: "linear-gradient(90deg,#dbeafe,#bfdbfe)" }, // Afternoon 14–22
    { left: "91.67%", width: "8.33%",  bg: "linear-gradient(90deg,#c7d2fe,#e0e7ff)" }, // Night  22–24
  ];

  const ROWS: { label: string; color: string; events: { timestamp: number }[] }[] = [
    { label: "Care notes", color: "#2f8f8a", events: todayNotes  },
    { label: "Vitals",     color: "#6366f1", events: todayVitals },
    { label: "Medication", color: "#ef4444", events: todayMeds   },
  ];

  // Inner row — shared by shift band, hour ticks, and data rows
  const ROW_CLS = "flex items-center gap-3";
  const SPACER  = <div className="w-24 shrink-0" />;

  return (
    <div className="relative select-none">

      {/* ── Shift band (shares label-column spacer for alignment) ─ */}
      <div className={`${ROW_CLS} mb-0.5`}>
        {SPACER}
        <div className="relative flex-1 h-9 overflow-hidden rounded-xl border border-border/40 shadow-sm">
          {BANDS.map((b, i) => (
            <div key={i} className="absolute inset-y-0" style={{ left: b.left, width: b.width, background: b.bg }} />
          ))}
          {/* "Now" pill + line within the shift band */}
          {nowMs > 0 && (
            <>
              <div
                className="absolute inset-y-0 w-px"
                style={{ left: `${nowPct}%`, transform: "translateX(-50%)", background: "rgba(15,23,42,0.55)" }}
              />
              <div
                className="absolute top-1.5 -translate-x-1/2 rounded-full px-2 py-0.5 text-[8px] font-bold text-white shadow-sm"
                style={{ left: `${nowPct}%`, background: "rgba(15,23,42,0.82)" }}
              >
                now
              </div>
            </>
          )}
        </div>
      </div>

      {/* ── Hour tick labels ─────────────────────────────────────── */}
      <div className={`${ROW_CLS} mb-3`}>
        {SPACER}
        <div className="relative flex-1 h-4">
          {[0, 6, 12, 18].map((h) => (
            <span
              key={h}
              className="absolute -translate-x-1/2 text-[9px] text-muted-foreground"
              style={{ left: `${(h / 24) * 100}%` }}
            >
              {String(h).padStart(2, "0")}h
            </span>
          ))}
        </div>
      </div>

      {/* ── Three data-type rows ─────────────────────────────────── */}
      <div className="flex flex-col gap-1.5">
        {ROWS.map((row) => (
          <div key={row.label} className={ROW_CLS}>
            {/* Label */}
            <div className="flex w-24 shrink-0 items-center gap-1.5">
              <span className="h-2 w-2 rounded-full shrink-0" style={{ background: row.color }} />
              <span className="text-[11px] font-medium text-ink-soft">{row.label}</span>
            </div>
            {/* Track */}
            <div
              className="relative flex-1 h-8 overflow-hidden rounded-lg"
              style={{ background: "#f0f1f3" }}
            >
              {/* Now line inside track */}
              {nowMs > 0 && (
                <div
                  className="absolute inset-y-0 w-px pointer-events-none"
                  style={{ left: `${nowPct}%`, transform: "translateX(-50%)", background: "rgba(15,23,42,0.18)" }}
                />
              )}
              {/* Event dots */}
              {row.events.map((e, i) => {
                const p = toPct(e.timestamp);
                if (p < 0 || p > 100) return null;
                return (
                  <div
                    key={i}
                    className="absolute top-1/2 h-3 w-3 rounded-full"
                    style={{
                      left: `${p}%`,
                      transform: "translate(-50%, -50%)",
                      background: row.color,
                      boxShadow: `0 0 0 2px #fff, 0 1px 4px rgba(0,0,0,0.18)`,
                    }}
                  />
                );
              })}
            </div>
          </div>
        ))}
      </div>

      {/* ── Now connector — spans gap between rows at track x ────── */}
      {/* Covers only the area between the shift band and the data rows,
          bridging the visual gap left by overflow-hidden in each track. */}
      {nowMs > 0 && (
        <div
          className="pointer-events-none absolute w-px"
          style={{
            left: nowLeft,
            top: "2.625rem",   // bottom of shift band (2.25rem h) + 0.125rem gap
            bottom: "1.75rem", // top of legend area (legend height estimate)
            background: "rgba(15,23,42,0.10)",
            transform: "translateX(-50%)",
          }}
        />
      )}

      {/* ── Legend ───────────────────────────────────────────────── */}
      <div className="mt-3 border-t border-border pt-2.5">
        <div className="flex flex-wrap items-center gap-x-3 gap-y-1.5">
          {/* Shift pills */}
          {[
            { bg: "linear-gradient(to right,#e0e7ff,#c7d2fe)", label: "Night"     },
            { bg: "linear-gradient(to right,#fef9c3,#fde68a)", label: "Morning"   },
            { bg: "linear-gradient(to right,#dbeafe,#bfdbfe)", label: "Afternoon" },
          ].map(({ bg, label }) => (
            <span key={label} className="flex items-center gap-1.5 text-[10px] text-muted-foreground">
              <span className="inline-block h-3 w-5 rounded-full" style={{ background: bg }} />
              {label}
            </span>
          ))}
          {/* Divider */}
          <span className="h-3.5 w-px bg-border" />
          {/* Data-type dots */}
          {[
            { color: "#2f8f8a", label: "Care notes" },
            { color: "#6366f1", label: "Vitals"     },
          ].map(({ color, label }) => (
            <span key={label} className="flex items-center gap-1.5 text-[10px] text-muted-foreground">
              <span className="h-2 w-2 rounded-full shrink-0" style={{ background: color }} />
              {label}
            </span>
          ))}
        </div>
      </div>
    </div>
  );
}

// ================================================================
// ManagerView
// ================================================================

export default function ManagerView({
  patients,
  notesByPatient,
  wellbeingByPatient,
  vitalsByPatient,
  diagnosesByPatient,
  org,
}: {
  patients: Patient[];
  notesByPatient: Record<string, CareNote[]>;
  wellbeingByPatient: Record<string, WellbeingEntry[]>;
  vitalsByPatient?: Record<string, VitalSigns[]>;
  diagnosesByPatient?: Record<string, Diagnosis[]>;
  org: string;
}) {
  const [selectedPatientId, setSelectedPatientId]   = useState<string | null>(null);
  const [expandedPrevShift, setExpandedPrevShift]   = useState<string | null>(null);

  const personLabel    = org === "hospital" ? "patients"  : "residents";
  const personLabelCap = org === "hospital" ? "Patients"  : "Residents";
  type TimeState = { nowMs: number; todayMs: number; shift: ShiftMeta };
  const [timeState, setTimeState] = useState<TimeState>({ nowMs: 0, todayMs: 0, shift: getCurrentShift() });
  const { nowMs, todayMs, shift } = timeState;

  useEffect(() => {
    const d = new Date();
    d.setHours(0, 0, 0, 0);
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setTimeState({ nowMs: new Date().getTime(), todayMs: d.getTime(), shift: getCurrentShift() });
  }, []);

  // ── Notes (for display + note-specific stats) ─────────────────

  const allNotes = patients.flatMap((p) =>
    (notesByPatient[p.id] ?? []).map((n) => ({ ...n, patientId: p.id, patientName: p.name }))
  );

  const todayNotes = allNotes.filter((n) => n.timestamp >= todayMs);

  // ── Vitals with authorRole (for shift counting) ───────────────

  const allVitals = patients.flatMap((p) =>
    (vitalsByPatient?.[p.id] ?? [])
      .filter((v): v is VitalSigns & { authorRole: string } => !!v.authorRole)
      .map((v) => ({ authorRole: v.authorRole, timestamp: v.timestamp, patientId: p.id }))
  );

  const todayVitals = allVitals.filter((v) => v.timestamp >= todayMs);

  // ── Unified activity events (notes + vitals) for shift metrics ─
  // Any data written to a patient — care note OR vitals reading —
  // counts as clinical activity, so staff coverage is not under-counted
  // when nurses or doctors record vitals without adding a narrative note.

  const allActivityEvents: ActivityEvent[] = [
    ...allNotes.map((n) => ({ authorRole: n.authorRole, timestamp: n.timestamp, patientId: n.patientId, kind: "note" as const })),
    ...allVitals.map((v) => ({ authorRole: v.authorRole, timestamp: v.timestamp, patientId: v.patientId, kind: "vitals" as const })),
  ];

  const shiftActivities = allActivityEvents.filter((e) => e.timestamp >= shift.start);
  const shiftClinicalActivities = shiftActivities.filter((e) => isHumanClinicalStaff(e.authorRole));

  const staffTodayCount = new Set(
    allActivityEvents
      .filter((e) => e.timestamp >= todayMs && isHumanClinicalStaff(e.authorRole))
      .map((e) => e.authorRole)
  ).size;

  // ── Per-patient shift assignment ──────────────────────────────
  // Doctor(s) and nurse(s) who have logged a note OR recorded vitals
  // for each patient this shift.

  const shiftAssignment = patients.map((p) => {
    const pEvents  = shiftClinicalActivities.filter((e) => e.patientId === p.id);
    const doctors  = [...new Set(pEvents.filter((e) => getRoleType(e.authorRole) === "Doctor").map((e) => e.authorRole))];
    const nurses   = [...new Set(pEvents.filter((e) => getRoleType(e.authorRole) === "Nurse").map((e) => e.authorRole))];
    const count    = pEvents.length;
    return { patient: p, doctors, nurses, count };
  });

  // ── Staff map (human clinical only) ──────────────────────────

  type StaffEntry = {
    key: string;
    name: string;
    roleType: "Doctor" | "Nurse";
    shiftPatients: Set<string>;
    todayPatients: Set<string>;
    shiftEventCount: number;
    lastActive: number;
  };

  const staffMap = new Map<string, StaffEntry>();
  allActivityEvents.filter((e) => isHumanClinicalStaff(e.authorRole)).forEach((e) => {
    const rt = getRoleType(e.authorRole);
    if (rt === "Other") return;
    if (!staffMap.has(e.authorRole)) {
      staffMap.set(e.authorRole, {
        key: e.authorRole,
        name: getDisplayName(e.authorRole),
        roleType: rt,
        shiftPatients: new Set(),
        todayPatients: new Set(),
        shiftEventCount: 0,
        lastActive: 0,
      });
    }
    const s = staffMap.get(e.authorRole)!;
    if (e.timestamp >= shift.start) { s.shiftPatients.add(e.patientId); s.shiftEventCount++; }
    if (e.timestamp >= todayMs)       s.todayPatients.add(e.patientId);
    if (e.timestamp > s.lastActive)   s.lastActive = e.timestamp;
  });

  const doctors = [...staffMap.values()].filter((s) => s.roleType === "Doctor").sort((a, b) => b.lastActive - a.lastActive);
  const nurses  = [...staffMap.values()].filter((s) => s.roleType === "Nurse").sort((a, b) => b.lastActive - a.lastActive);

  // ── Previous shifts (last 4 completed shifts) ─────────────────

  const prevShiftWindows = getPreviousShiftWindows(shift.start, 4);

  const prevShiftData = prevShiftWindows.map((w) => {
    const windowEvents = allActivityEvents.filter((e) => e.timestamp >= w.start && e.timestamp < w.end && isHumanClinicalStaff(e.authorRole));
    const sm = new Map<string, { name: string; roleType: "Doctor" | "Nurse"; patients: Set<string>; count: number }>();
    windowEvents.forEach((e) => {
      const rt = getRoleType(e.authorRole);
      if (rt === "Other") return;
      if (!sm.has(e.authorRole)) {
        sm.set(e.authorRole, { name: getDisplayName(e.authorRole), roleType: rt, patients: new Set(), count: 0 });
      }
      const s = sm.get(e.authorRole)!;
      s.patients.add(e.patientId);
      s.count++;
    });
    return { ...w, staff: [...sm.entries()].map(([key, v]) => ({ key, ...v })).sort((a, b) => b.count - a.count), totalEvents: windowEvents.length };
  });

  // ── Wellbeing / org avg ───────────────────────────────────────

  const latestChecks = patients.flatMap((p) => {
    const hist = wellbeingByPatient[p.id] ?? [];
    return hist.length > 0 ? [{ ...hist[hist.length - 1], patientId: p.id }] : [];
  });

  const orgAvg: Baseline | null =
    latestChecks.length > 0
      ? {
          mood:      latestChecks.reduce((s, c) => s + c.mood,      0) / latestChecks.length,
          appetite:  latestChecks.reduce((s, c) => s + c.appetite,  0) / latestChecks.length,
          mobility:  latestChecks.reduce((s, c) => s + c.mobility,  0) / latestChecks.length,
          sleep:     latestChecks.reduce((s, c) => s + c.sleep,     0) / latestChecks.length,
        }
      : null;
  const orgOverallAvg = orgAvg ? (orgAvg.mood + orgAvg.appetite + orgAvg.mobility + orgAvg.sleep) / 4 : null;

  // ── Per-patient status for list ───────────────────────────────

  const patientStatuses = patients.map((p) => {
    const hist    = wellbeingByPatient[p.id] ?? [];
    const latest  = hist.length > 0 ? hist[hist.length - 1] : null;
    const avg     = latest ? (latest.mood + latest.appetite + latest.mobility + latest.sleep) / 4 : null;
    const baseAvg = (p.baseline.mood + p.baseline.appetite + p.baseline.mobility + p.baseline.sleep) / 4;
    const delta   = avg !== null ? avg - baseAvg : null;
    const notes   = notesByPatient[p.id] ?? [];
    const todayNoteCount = notes.filter((n) => n.timestamp >= todayMs).length;
    const lastNote = [...notes].sort((a, b) => b.timestamp - a.timestamp)[0];
    const status: "ok" | "watch" | "alert" | "no-data" =
      delta === null ? "no-data" : delta >= -0.5 ? "ok" : delta >= -1.5 ? "watch" : "alert";
    return { patient: p, avg, delta, latest, status, todayNoteCount, lastNote };
  });

  const alertPatients = patientStatuses.filter(
    (ps) => ps.status === "alert" || (ps.todayNoteCount === 0 && ps.status !== "no-data")
  );

  // ── Selected patient detail ───────────────────────────────────

  const selectedPatient = patients.find((p) => p.id === selectedPatientId) ?? null;
  const selectedStatus  = patientStatuses.find((ps) => ps.patient.id === selectedPatientId) ?? null;

  const selectedNotes = selectedPatientId
    ? [...(notesByPatient[selectedPatientId] ?? [])].sort((a, b) => b.timestamp - a.timestamp)
    : [];

  const selectedShiftAssignment = shiftAssignment.find((sa) => sa.patient.id === selectedPatientId) ?? null;

  const todayActivitiesForPatient = selectedPatientId
    ? allActivityEvents.filter((e) => e.patientId === selectedPatientId && e.timestamp >= todayMs)
    : [];

  const selectedTodayDoctors = selectedPatientId
    ? [...new Set(todayActivitiesForPatient.filter((e) => getRoleType(e.authorRole) === "Doctor").map((e) => e.authorRole))]
    : [];
  const selectedTodayNurses = selectedPatientId
    ? [...new Set(todayActivitiesForPatient.filter((e) => getRoleType(e.authorRole) === "Nurse").map((e) => e.authorRole))]
    : [];

  const selectedLatestVitals = selectedPatientId && vitalsByPatient?.[selectedPatientId]
    ? [...vitalsByPatient[selectedPatientId]].sort((a, b) => b.timestamp - a.timestamp)[0]
    : null;

  const selectedDiagnoses = selectedPatientId ? (diagnosesByPatient?.[selectedPatientId] ?? []) : [];
  const activeDx = selectedDiagnoses.filter((d) => d.status === "Active" || d.status === "Chronic");

  // ── Stats cards ───────────────────────────────────────────────

  const statsCards = [
    { label: personLabelCap,      value: String(patients.length),                    sub: org === "hospital" ? "Across all wards" : "In care", accent: "text-ink" },
    { label: "Notes today",       value: String(todayNotes.length),                   sub: `${staffTodayCount} clinical staff active`, accent: "text-ink" },
    { label: "This shift",        value: String(shiftClinicalActivities.length),      sub: shift.label, accent: shift.colorClass },
    {
      label: "Avg wellbeing",
      value: orgOverallAvg !== null ? `${orgOverallAvg.toFixed(1)}/10` : "—",
      sub: `${latestChecks.length} of ${patients.length} checked`,
      accent: orgOverallAvg === null ? "text-muted-foreground" : orgOverallAvg >= 7 ? "text-teal" : orgOverallAvg >= 5 ? "text-amber-600" : "text-destructive",
    },
  ];

  // ── Render helpers ────────────────────────────────────────────

  const dotColor = (s: "ok" | "watch" | "alert" | "no-data") =>
    s === "ok" ? "bg-teal" : s === "watch" ? "bg-amber-500" : s === "alert" ? "bg-destructive" : "bg-muted-foreground";

  const scorePill = (s: "ok" | "watch" | "alert" | "no-data") =>
    s === "ok" ? "bg-teal-soft text-teal" : s === "watch" ? "bg-amber-100 text-amber-700" : s === "alert" ? "bg-red-100 text-red-700" : "bg-secondary text-ink-soft";

  // Simple inline chevron
  const ChevronDown = () => (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="text-muted-foreground">
      <polyline points="6 9 12 15 18 9" />
    </svg>
  );
  const ChevronUp = () => (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="text-muted-foreground">
      <polyline points="18 15 12 9 6 15" />
    </svg>
  );

  return (
    <div className="container-page py-6">

      {/* ── Stats ──────────────────────────────────────────────── */}
      <div className="mb-6 grid grid-cols-2 gap-4 sm:grid-cols-4">
        {statsCards.map(({ label, value, sub, accent }) => (
          <div key={label} className="rounded-xl border border-border bg-card p-4 shadow-soft">
            <div className="text-xs font-medium uppercase tracking-wide text-muted-foreground">{label}</div>
            <div className={`mt-1 text-2xl font-semibold ${accent}`}>{value}</div>
            <div className="mt-0.5 text-xs text-ink-soft">{sub}</div>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">

        {/* ── Left 2/3 ──────────────────────────────────────────── */}
        <div className="flex flex-col gap-6 lg:col-span-2">

          {/* 24-hour timeline */}
          <div className="rounded-xl border border-border bg-white p-5 shadow-soft">
            {/* Header */}
            <div className="mb-4">
              <div className="text-sm font-bold text-ink">24-hour activity timeline</div>
              <p className="mt-0.5 text-xs text-muted-foreground">
                Shifts, care notes and vitals on one shared clock.
              </p>
              {/* Shift status pill — shown after hydration so time string is accurate */}
              {nowMs > 0 && (() => {
                const [shiftName, shiftRange] = shift.label.split(/\s{2,}/);
                const nowTimeStr = new Date(nowMs).toLocaleTimeString("en-AU", { hour: "2-digit", minute: "2-digit", hour12: false });
                const dotCls = shift.label.startsWith("Morning") ? "bg-amber-500" : shift.label.startsWith("Afternoon") ? "bg-sky-500" : "bg-indigo-400";
                return (
                  <div suppressHydrationWarning className={`mt-2 inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs ${shift.bgClass}`}>
                    <span className={`h-2 w-2 rounded-full shrink-0 ${dotCls}`} />
                    <span className={shift.colorClass}>
                      <span className="font-bold">{shiftName}</span>
                      {" "}{shiftRange} · now {nowTimeStr}
                    </span>
                  </div>
                );
              })()}
            </div>
            <ShiftTimeline
              todayNotes={todayNotes}
              todayVitals={todayVitals}
              todayMeds={[]}
              nowMs={nowMs}
              todayStartMs={todayMs}
            />
          </div>

          {/* Current shift assignment — per patient */}
          <div className="rounded-xl border border-border bg-card p-4 shadow-soft">
            <div className="mb-3 text-sm font-semibold text-ink">
              Current shift — staff per {org === "hospital" ? "patient" : "resident"}
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border text-left text-[10px] font-medium uppercase tracking-wide text-muted-foreground">
                    <th className="pb-2 pr-4">{personLabelCap}</th>
                    <th className="pb-2 pr-4">Ward / Room</th>
                    <th className="pb-2 pr-4">Doctors this shift</th>
                    <th className="pb-2 pr-4">Nurses this shift</th>
                    <th className="pb-2">Activity</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {shiftAssignment.map(({ patient: p, doctors: pDocs, nurses: pNurses, count }) => (
                    <tr
                      key={p.id}
                      className={`cursor-pointer transition-colors ${selectedPatientId === p.id ? "bg-teal-soft" : "hover:bg-secondary"}`}
                      onClick={() => setSelectedPatientId(selectedPatientId === p.id ? null : p.id)}
                    >
                      <td className="py-2 pr-4 font-medium text-ink">{p.name}</td>
                      <td className="py-2 pr-4 text-xs text-ink-soft">{p.room}</td>
                      <td className="py-2 pr-4">
                        {pDocs.length === 0 ? (
                          <span className="text-xs text-muted-foreground">—</span>
                        ) : (
                          <div className="flex flex-wrap gap-1">
                            {pDocs.map((d) => (
                              <span key={d} className="rounded bg-blue-50 px-1.5 py-0.5 text-[11px] text-blue-700">{getDisplayName(d)}</span>
                            ))}
                          </div>
                        )}
                      </td>
                      <td className="py-2 pr-4">
                        {pNurses.length === 0 ? (
                          <span className="text-xs text-muted-foreground">—</span>
                        ) : (
                          <div className="flex flex-wrap gap-1">
                            {pNurses.map((n) => (
                              <span key={n} className="rounded bg-teal-soft px-1.5 py-0.5 text-[11px] text-teal">{getDisplayName(n)}</span>
                            ))}
                          </div>
                        )}
                      </td>
                      <td className="py-2 text-xs font-semibold text-ink">{count || <span className="font-normal text-muted-foreground">0</span>}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            {selectedPatient && (
              <p className="mt-2 text-[10px] text-muted-foreground">
                Showing detail for <span className="font-semibold">{selectedPatient.name}</span> below ↓
              </p>
            )}
          </div>

          {/* Patient list + detail panel */}
          <div className="rounded-xl border border-border bg-card shadow-soft">
            <div className="flex min-h-0">

              {/* Patient list sidebar */}
              <div className="w-44 shrink-0 border-r border-border p-3">
                <div className="mb-2 text-[10px] font-medium uppercase tracking-wide text-muted-foreground">
                  {personLabelCap}
                </div>
                <div className="flex flex-col gap-1">
                  {patientStatuses.map(({ patient: p, status, todayNoteCount }) => (
                    <button
                      key={p.id}
                      onClick={() => setSelectedPatientId(selectedPatientId === p.id ? null : p.id)}
                      className={`flex w-full items-center gap-2 rounded-lg px-2 py-1.5 text-left transition-colors ${
                        selectedPatientId === p.id ? "bg-teal-soft" : "hover:bg-secondary"
                      }`}
                    >
                      <span className={`h-1.5 w-1.5 shrink-0 rounded-full ${dotColor(status)}`} />
                      <div className="min-w-0">
                        <div className="truncate text-xs font-medium text-ink">{p.name}</div>
                        <div className="text-[10px] text-ink-soft">{p.room}</div>
                        {todayNoteCount === 0 && status !== "no-data" && (
                          <div className="text-[10px] text-amber-600">No notes today</div>
                        )}
                      </div>
                    </button>
                  ))}
                </div>
                <div className="mt-3 border-t border-border pt-2 flex flex-col gap-1">
                  <div className="text-[10px] font-medium uppercase tracking-wide text-muted-foreground mb-1">Status key</div>
                  {[
                    { color: "bg-teal",        label: "On/above baseline" },
                    { color: "bg-amber-500",   label: "Slightly below" },
                    { color: "bg-destructive", label: "Declining" },
                    { color: "bg-muted-foreground", label: "No check yet" },
                  ].map(({ color, label }) => (
                    <div key={label} className="flex items-center gap-1.5 text-[10px] text-ink-soft">
                      <span className={`h-1.5 w-1.5 rounded-full ${color}`} />{label}
                    </div>
                  ))}
                </div>
              </div>

              {/* Patient detail panel */}
              <div className="min-w-0 flex-1 p-4">
                {!selectedPatient ? (
                  <div className="flex h-40 items-center justify-center text-sm text-ink-soft">
                    Select a {org === "hospital" ? "patient" : "resident"} to view their full record
                  </div>
                ) : (
                  <div>
                    {/* Header */}
                    <div className="mb-4 flex items-start justify-between gap-2">
                      <div>
                        <h2 className="text-lg font-semibold text-ink">{selectedPatient.name}</h2>
                        <p className="text-sm text-ink-soft">{selectedPatient.room} · Age {selectedPatient.age}</p>
                      </div>
                      {selectedStatus && (
                        <span className={`rounded-full px-2 py-1 text-xs font-semibold ${scorePill(selectedStatus.status)}`}>
                          {selectedStatus.avg !== null ? `${selectedStatus.avg.toFixed(1)}/10` : "No check"} wellbeing
                        </span>
                      )}
                    </div>

                    {/* Staff responsibility — this shift */}
                    <div className="mb-4 rounded-lg border border-border bg-background p-3">
                      <div className="mb-2 text-[10px] font-medium uppercase tracking-wide text-muted-foreground">
                        Staff on duty this shift
                      </div>
                      <div className="grid grid-cols-2 gap-3">
                        <div>
                          <div className="mb-1 text-[10px] text-muted-foreground">Doctors</div>
                          {(selectedShiftAssignment?.doctors ?? []).length === 0 ? (
                            <span className="text-xs text-muted-foreground">None this shift</span>
                          ) : (
                            <div className="flex flex-col gap-1">
                              {selectedShiftAssignment!.doctors.map((d) => (
                                <span key={d} className="flex items-center gap-1 text-xs font-medium text-ink">
                                  <span className="h-1.5 w-1.5 rounded-full bg-blue-500" />{getDisplayName(d)}
                                </span>
                              ))}
                            </div>
                          )}
                        </div>
                        <div>
                          <div className="mb-1 text-[10px] text-muted-foreground">Nurses / Carers</div>
                          {(selectedShiftAssignment?.nurses ?? []).length === 0 ? (
                            <span className="text-xs text-muted-foreground">None this shift</span>
                          ) : (
                            <div className="flex flex-col gap-1">
                              {selectedShiftAssignment!.nurses.map((n) => (
                                <span key={n} className="flex items-center gap-1 text-xs font-medium text-ink">
                                  <span className="h-1.5 w-1.5 rounded-full bg-teal" />{getDisplayName(n)}
                                </span>
                              ))}
                            </div>
                          )}
                        </div>
                      </div>
                      {(selectedTodayDoctors.length > (selectedShiftAssignment?.doctors.length ?? 0) ||
                        selectedTodayNurses.length > (selectedShiftAssignment?.nurses.length ?? 0)) && (
                        <div className="mt-2 border-t border-border pt-2">
                          <div className="mb-1 text-[10px] text-muted-foreground">Also active today (other shifts)</div>
                          <div className="flex flex-wrap gap-1">
                            {[...selectedTodayDoctors, ...selectedTodayNurses]
                              .filter((r) => !selectedShiftAssignment?.doctors.includes(r) && !selectedShiftAssignment?.nurses.includes(r))
                              .map((r) => (
                                <span key={r} className="rounded bg-secondary px-1.5 py-0.5 text-[11px] text-ink-soft">{getDisplayName(r)}</span>
                              ))}
                          </div>
                        </div>
                      )}
                    </div>

                    {/* Wellbeing bars */}
                    {selectedStatus?.latest && (
                      <div className="mb-4 rounded-lg border border-border bg-background p-3">
                        <div className="mb-2 text-[10px] font-medium uppercase tracking-wide text-muted-foreground">
                          Wellbeing vs baseline
                        </div>
                        <div className="flex flex-col gap-2">
                          {METRIC_KEYS.map((key) => {
                            const val  = selectedStatus.latest![key];
                            const base = selectedPatient.baseline[key];
                            const color = val >= base - 0.5 ? "bg-teal" : val >= base - 1.5 ? "bg-amber-400" : "bg-destructive";
                            return (
                              <div key={key} className="flex items-center gap-2">
                                <span className="w-14 text-[11px] capitalize text-ink-soft">{key}</span>
                                <div className="relative h-2 flex-1 rounded-full bg-secondary">
                                  <div className={`h-2 rounded-full ${color}`} style={{ width: `${(val / 10) * 100}%` }} />
                                  <div className="absolute top-1/2 h-3 w-0.5 -translate-y-1/2 rounded-full bg-ink/40" style={{ left: `${(base / 10) * 100}%` }} />
                                </div>
                                <span className="w-12 text-right text-[11px] font-semibold text-ink">{val} / {base}</span>
                              </div>
                            );
                          })}
                        </div>
                        <p className="mt-1 text-[10px] text-muted-foreground">Bar = current · tick = baseline</p>
                      </div>
                    )}

                    {/* Latest vitals */}
                    {selectedLatestVitals && (
                      <div className="mb-4 rounded-lg border border-border bg-background p-3">
                        <div className="mb-2 text-[10px] font-medium uppercase tracking-wide text-muted-foreground">
                          Latest vitals · <span suppressHydrationWarning>{timeAgo(selectedLatestVitals.timestamp)}</span>
                        </div>
                        <div className="flex flex-wrap gap-2">
                          {selectedLatestVitals.systolic != null && selectedLatestVitals.diastolic != null && (
                            <span className="rounded bg-secondary px-2 py-1 text-xs">BP {selectedLatestVitals.systolic}/{selectedLatestVitals.diastolic} mmHg</span>
                          )}
                          {selectedLatestVitals.heartRate != null && (
                            <span className="rounded bg-secondary px-2 py-1 text-xs">HR {selectedLatestVitals.heartRate} bpm</span>
                          )}
                          {selectedLatestVitals.temperature != null && (
                            <span className="rounded bg-secondary px-2 py-1 text-xs">Temp {selectedLatestVitals.temperature}°C</span>
                          )}
                          {selectedLatestVitals.oxygenSaturation != null && (
                            <span className="rounded bg-secondary px-2 py-1 text-xs">SpO₂ {selectedLatestVitals.oxygenSaturation}%</span>
                          )}
                        </div>
                      </div>
                    )}

                    {/* Active diagnoses */}
                    {activeDx.length > 0 && (
                      <div className="mb-4 rounded-lg border border-border bg-background p-3">
                        <div className="mb-2 text-[10px] font-medium uppercase tracking-wide text-muted-foreground">
                          Active conditions
                        </div>
                        <div className="flex flex-wrap gap-1.5">
                          {activeDx.map((d) => (
                            <span key={d.id} className={`rounded-full px-2 py-0.5 text-[11px] font-medium ${d.status === "Active" ? "bg-amber-100 text-amber-700" : "bg-secondary text-ink"}`}>
                              {d.condition} · {d.status}
                            </span>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* All notes */}
                    <div>
                      <div className="mb-2 text-[10px] font-medium uppercase tracking-wide text-muted-foreground">
                        All notes ({selectedNotes.length})
                      </div>
                      {selectedNotes.length === 0 ? (
                        <p className="text-sm text-ink-soft">No notes logged yet.</p>
                      ) : (
                        <div className="flex max-h-72 flex-col gap-2 overflow-y-auto pr-1">
                          {selectedNotes.map((note) => {
                            const rt = getRoleType(note.authorRole);
                            const borderColor = rt === "Doctor" ? "border-blue-400" : rt === "Nurse" ? "border-teal" : "border-border";
                            return (
                              <div key={note.id} className={`border-l-2 pl-3 ${borderColor}`}>
                                <div className="flex flex-wrap items-center gap-x-2 gap-y-0.5 text-[11px] text-muted-foreground">
                                  <span className="font-medium text-ink">{note.authorRole}</span>
                                  <span>·</span>
                                  <span>{formatDateTime(note.timestamp)}</span>
                                  <span className="text-muted-foreground" suppressHydrationWarning>({timeAgo(note.timestamp)})</span>
                                  {note.type === "family_update" && <span className="rounded bg-teal-soft px-1 py-0.5 text-[10px] text-teal">AI update</span>}
                                  {note.sensitive && <span className="rounded bg-amber-100 px-1 py-0.5 text-[10px] text-amber-700">Sensitive</span>}
                                </div>
                                <div className="mt-0.5 text-sm text-ink">{note.content}</div>
                              </div>
                            );
                          })}
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* ── Previous shifts ──────────────────────────────────── */}
          <div className="rounded-xl border border-border bg-card p-4 shadow-soft">
            <div className="mb-1 text-sm font-semibold text-ink">Previous shifts</div>
            <p className="mb-3 text-xs text-muted-foreground">
              Completed shifts for all clinical staff — who worked, which {personLabel} they covered.
            </p>
            <div className="flex flex-col gap-2">
              {prevShiftData.map((w) => {
                const isOpen = expandedPrevShift === w.key;
                const prevDoctors = w.staff.filter((s) => s.roleType === "Doctor");
                const prevNurses  = w.staff.filter((s) => s.roleType === "Nurse");
                return (
                  <div key={w.key} className="overflow-hidden rounded-xl border border-border">
                    <button
                      onClick={() => setExpandedPrevShift(isOpen ? null : w.key)}
                      className="flex w-full items-center gap-3 px-4 py-2.5 text-left transition-colors hover:bg-secondary"
                    >
                      <span className={`shrink-0 rounded-full px-2 py-0.5 text-[10px] font-semibold ${w.bgClass} ${w.colorClass}`}>
                        {w.label}
                      </span>
                      <span className="ml-auto flex shrink-0 items-center gap-2 text-[11px] text-muted-foreground">
                        {w.staff.length > 0
                          ? <><span className="font-medium text-ink">{w.staff.length}</span> staff · <span className="font-medium text-ink">{w.totalEvents}</span> events</>
                          : <span>No activity</span>
                        }
                        {isOpen ? <ChevronUp /> : <ChevronDown />}
                      </span>
                    </button>
                    {isOpen && (
                      w.staff.length === 0 ? (
                        <div className="border-t border-border px-4 py-3 text-sm text-ink-soft">
                          No clinical activity recorded for this shift.
                        </div>
                      ) : (
                        <div className="grid grid-cols-1 gap-4 border-t border-border px-4 py-3 sm:grid-cols-2">
                          {/* Doctors column */}
                          <div>
                            <div className="mb-2 text-[10px] font-medium uppercase tracking-wide text-muted-foreground">
                              Doctors ({prevDoctors.length})
                            </div>
                            {prevDoctors.length === 0 ? (
                              <p className="text-xs text-ink-soft">None on this shift</p>
                            ) : (
                              <div className="flex flex-col gap-2">
                                {prevDoctors.map((s) => (
                                  <div key={s.key}>
                                    <div className="flex items-center gap-1.5">
                                      <span className="h-1.5 w-1.5 rounded-full bg-blue-500" />
                                      <span className="text-xs font-semibold text-ink">{s.name}</span>
                                      <span className="text-[10px] text-muted-foreground">({s.count} events)</span>
                                    </div>
                                    <div className="mt-1 flex flex-wrap gap-1 pl-3">
                                      {[...s.patients].map((pid) => {
                                        const pt = patients.find((p) => p.id === pid);
                                        return pt ? (
                                          <button
                                            key={pid}
                                            onClick={() => setSelectedPatientId(pid)}
                                            className="rounded bg-blue-50 px-1.5 py-0.5 text-[10px] text-blue-700 hover:opacity-80"
                                          >
                                            {pt.name}
                                          </button>
                                        ) : null;
                                      })}
                                    </div>
                                  </div>
                                ))}
                              </div>
                            )}
                          </div>
                          {/* Nurses column */}
                          <div>
                            <div className="mb-2 text-[10px] font-medium uppercase tracking-wide text-muted-foreground">
                              Nurses / Carers ({prevNurses.length})
                            </div>
                            {prevNurses.length === 0 ? (
                              <p className="text-xs text-ink-soft">None on this shift</p>
                            ) : (
                              <div className="flex flex-col gap-2">
                                {prevNurses.map((s) => (
                                  <div key={s.key}>
                                    <div className="flex items-center gap-1.5">
                                      <span className="h-1.5 w-1.5 rounded-full bg-teal" />
                                      <span className="text-xs font-semibold text-ink">{s.name}</span>
                                      <span className="text-[10px] text-muted-foreground">({s.count} events)</span>
                                    </div>
                                    <div className="mt-1 flex flex-wrap gap-1 pl-3">
                                      {[...s.patients].map((pid) => {
                                        const pt = patients.find((p) => p.id === pid);
                                        return pt ? (
                                          <button
                                            key={pid}
                                            onClick={() => setSelectedPatientId(pid)}
                                            className="rounded bg-teal-soft px-1.5 py-0.5 text-[10px] text-teal hover:opacity-80"
                                          >
                                            {pt.name}
                                          </button>
                                        ) : null;
                                      })}
                                    </div>
                                  </div>
                                ))}
                              </div>
                            )}
                          </div>
                        </div>
                      )
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* ── Right 1/3 ──────────────────────────────────────────── */}
        <div className="flex flex-col gap-6">

          {/* Alerts */}
          {alertPatients.length > 0 && (
            <div className="rounded-xl border border-amber-200 bg-amber-50 p-4">
              <div className="mb-2 flex items-center gap-1.5">
                <span className="h-2 w-2 rounded-full bg-amber-500" />
                <span className="text-sm font-semibold text-amber-800">Needs attention ({alertPatients.length})</span>
              </div>
              <div className="flex flex-col gap-1.5">
                {alertPatients.map(({ patient: p, status, todayNoteCount }) => (
                  <button
                    key={p.id}
                    onClick={() => setSelectedPatientId(p.id)}
                    className="rounded-lg bg-white px-3 py-2 text-left hover:ring-1 hover:ring-amber-300"
                  >
                    <div className="flex items-baseline justify-between">
                      <span className="text-sm font-medium text-ink">{p.name}</span>
                      <span className="text-[10px] text-amber-700">
                        {status === "alert" ? "Wellbeing ↓" : "No activity"}
                      </span>
                    </div>
                    <div className="text-xs text-muted-foreground">
                      {p.room} · {todayNoteCount > 0 ? `${todayNoteCount} note${todayNoteCount !== 1 ? "s" : ""} today` : "No notes today"}
                    </div>
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Doctors on ward */}
          <div className="rounded-xl border border-border bg-card p-4 shadow-soft">
            <div className="mb-3 text-sm font-semibold text-ink">Doctors</div>
            {doctors.length === 0 ? (
              <p className="text-sm text-ink-soft">No doctor activity on record.</p>
            ) : (
              <div className="flex flex-col gap-2">
                {doctors.map((s) => {
                  const pts = [...s.shiftPatients].map((id) => patients.find((p) => p.id === id)).filter(Boolean) as Patient[];
                  return (
                    <div key={s.key} className="rounded-lg border border-border bg-background p-2.5">
                      <div className="flex items-start justify-between gap-1">
                        <div>
                          <div className="text-sm font-semibold text-ink">{s.name}</div>
                          <div className="text-[10px] text-muted-foreground" suppressHydrationWarning>{timeAgo(s.lastActive)}</div>
                        </div>
                        <div className="text-right text-xs">
                          <span className="font-semibold text-ink">{s.shiftEventCount}</span>
                          <span className="text-muted-foreground"> events</span>
                        </div>
                      </div>
                      {pts.length > 0 && (
                        <div className="mt-2 border-t border-border pt-1.5">
                          <div className="mb-1 text-[10px] text-muted-foreground">{personLabelCap} this shift</div>
                          <div className="flex flex-wrap gap-1">
                            {pts.map((p) => (
                              <button key={p.id} onClick={() => setSelectedPatientId(p.id)} className="rounded bg-blue-50 px-1.5 py-0.5 text-[11px] text-blue-700 hover:opacity-80">
                                {p.name}
                              </button>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Nurses on ward */}
          <div className="rounded-xl border border-border bg-card p-4 shadow-soft">
            <div className="mb-3 text-sm font-semibold text-ink">Nurses / Carers</div>
            {nurses.length === 0 ? (
              <p className="text-sm text-ink-soft">No nurse activity on record.</p>
            ) : (
              <div className="flex flex-col gap-2">
                {nurses.map((s) => {
                  const pts = [...s.shiftPatients].map((id) => patients.find((p) => p.id === id)).filter(Boolean) as Patient[];
                  return (
                    <div key={s.key} className="rounded-lg border border-border bg-background p-2.5">
                      <div className="flex items-start justify-between gap-1">
                        <div>
                          <div className="text-sm font-semibold text-ink">{s.name}</div>
                          <div className="text-[10px] text-muted-foreground" suppressHydrationWarning>{timeAgo(s.lastActive)}</div>
                        </div>
                        <div className="text-right text-xs">
                          <span className="font-semibold text-ink">{s.shiftEventCount}</span>
                          <span className="text-muted-foreground"> events</span>
                        </div>
                      </div>
                      {pts.length > 0 && (
                        <div className="mt-2 border-t border-border pt-1.5">
                          <div className="mb-1 text-[10px] text-muted-foreground">{personLabelCap} this shift</div>
                          <div className="flex flex-wrap gap-1">
                            {pts.map((p) => (
                              <button key={p.id} onClick={() => setSelectedPatientId(p.id)} className="rounded bg-teal-soft px-1.5 py-0.5 text-[11px] text-teal hover:opacity-80">
                                {p.name}
                              </button>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Org wellbeing snapshot */}
          {orgAvg && (
            <div className="rounded-xl border border-border bg-card p-4 shadow-soft">
              <div className="mb-1 text-sm font-semibold text-ink">Org wellbeing snapshot</div>
              <p className="mb-3 text-xs text-ink-soft">Avg across {personLabel} with a check on record.</p>
              <div className="flex flex-col gap-2">
                {METRIC_KEYS.map((key) => {
                  const val = orgAvg[key];
                  const color = val >= 7 ? "bg-teal" : val >= 5 ? "bg-amber-400" : "bg-destructive";
                  return (
                    <div key={key} className="flex items-center gap-2">
                      <span className="w-16 text-xs capitalize text-ink-soft">{key}</span>
                      <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-secondary">
                        <div className={`h-1.5 rounded-full ${color}`} style={{ width: `${(val / 10) * 100}%` }} />
                      </div>
                      <span className="w-8 text-right text-xs font-semibold text-ink">{val.toFixed(1)}</span>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
