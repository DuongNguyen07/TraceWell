"use client";

import { useState, useRef, useEffect } from "react";
import Image from "next/image";
import { useSearchParams } from "next/navigation";
import { useSession, signOut } from "next-auth/react";
import { X, ChevronUp, ChevronDown, Check, Wand2, ArrowRight, Camera, Mic, Heart, MessageSquare, Copy, Video, Bell, AlertTriangle } from "lucide-react";
import HealthChart from "./HealthChart";
import FamilyResidentView from "./FamilyResidentView";
import ManagerView from "./ManagerView";

// ================================================================
// TYPES
// ================================================================

type Baseline = { mood: number; appetite: number; mobility: number; sleep: number };
type WellbeingEntry = Baseline & { timestamp: number };
type Profile = { preferences: string; routine: string; communicationStyle: string };
type Medication = { id: string; name: string; dose: string; frequency: string };

// A single vital signs reading. Every field is optional (number | null)
// rather than required — a real observation round doesn't always capture
// all five at once, and forcing every field would make the form unusable.
type VitalSigns = {
  id: string;
  systolic: number | null;
  diastolic: number | null;
  heartRate: number | null;
  temperature: number | null;
  oxygenSaturation: number | null;
  respiratoryRate: number | null;
  authorRole: string;
  timestamp: number;
};

// A diagnosis / problem-list entry. Status is one of three states — a
// Resolved condition is never deleted, only re-labelled, so the full
// clinical history stays intact rather than being erased.
type ProblemStatus = "Active" | "Chronic" | "Resolved" | "Other";

type Diagnosis = {
  id: string;
  condition: string;
  status: ProblemStatus;
  notes: string;
  authorRole: string;
  timestamp: number;
};

const PROBLEM_STATUSES: ProblemStatus[] = ["Active", "Chronic", "Resolved" , "Other"];

type NotifType = "care_update" | "wellbeing_concern";
type InAppNotification = {
  id: string;
  patientId: string;
  patientName: string;
  message: string;
  type: NotifType;
  authorRole: string;
  timestamp: number;
  read: boolean;
};

// Events broadcast via BroadcastChannel (same browser) and SSE (cross-device).
// Every event carries the FULL data object so receiving clients on other devices
// can merge it directly into state without needing to read the sender's localStorage.
// notifId (where present) links the event to the saved InAppNotification so the
// receiving side can pre-seed seenNotifIds and avoid a duplicate toast from the poll.
type LiveEvent =
  | { type: "care_note"; org: string; notifId: string; patientId: string; patientName: string; authorRole: string; preview: string; noteType: string; timestamp: number; note: CareNote }
  | { type: "wellbeing"; org: string; notifId?: string; patientId: string; patientName: string; authorRole: string; isConcern: boolean; timestamp: number; entry: WellbeingEntry }
  | { type: "chat"; org: string; patientId: string; patientName: string; authorName: string; authorRole: string; preview: string; timestamp: number; message: ChatMessage }
  | { type: "referral"; org: string; notifId: string; patientId: string; patientName: string; authorRole: string; toRecipients: string[]; subject: string; timestamp: number; referral: ReferralNote }
  | { type: "vitals"; org: string; patientId: string; patientName: string; authorRole: string; timestamp: number; vitals: VitalSigns };

type HealthInfo = {
  allergies: string[];
  conditions: string[];
  medications: string[];
  dietaryNotes?: string;
};

const DEFAULT_HEALTH_INFO: HealthInfo = {
  allergies: ["Not yet recorded"],
  conditions: ["Not yet recorded"],
  medications: ["Not yet recorded"],
};

type ChatMessage = {
  id: string;
  patientId: string;
  authorName: string;
  authorRole: string;
  content: string;
  timestamp: number;
};

type Patient = {
  id: string;
  name: string;
  age: number;
  room: string;
  baseline: Baseline;
  profile: Profile;
  medications: Medication[];
  healthInfo?: HealthInfo;
};

type CareNote = {
  id: string;
  content: string;
  authorRole: string;
  type: "text" | "image" | "voice" | "family_update";
  timestamp: number;
  imageUrl?: string;
  sensitive?: boolean;
};

type ReportType = "Blood Test" | "CT Scan" | "MRI" | "X-Ray" | "Other";

type MedicalReport = {
  id: string;
  reportType: ReportType;
  title: string;
  notes: string;
  imageUrl?: string;
  authorRole: string;
  timestamp: number;
};

const REPORT_TYPES: ReportType[] = ["Blood Test", "CT Scan", "MRI", "X-Ray", "Other"];

type ReferralNote = {
  id: string;
  fromName: string;
  toRecipients: string[];
  toRecipient?: string;  // legacy — stored before multi-recipient support
  referralType: "internal" | "external";
  subject: string;
  message: string;
  timestamp: number;
  acknowledged: boolean;
  acknowledgedBy?: string;
  acknowledgedAt?: number;
  shareCode?: string;
};

// audience distinguishes the clinical GP letter from the plain-language
// patient-facing summary — real hospitals produce both, written for very
// different readers, from the same admission record.
type DischargeAudience = "gp" | "patient";

type DischargeSummary = {
  id: string;
  audience: DischargeAudience;
  content: string;
  generatedBy: string;
  timestamp: number;
  // Tracks whether this is still an editable AI draft, or has been
  // reviewed and formally signed off by a doctor as the official document.
  // Once finalized, editing is locked — matches real clinical practice,
  // where a signed document is amended via a separate addendum, not
  // silently rewritten.
  status: "draft" | "finalized";
  finalizedBy?: string;
  finalizedAt?: number;
  // Tracks whether a doctor has ever edited the AI-generated text, so the
  // UI can show "edited by staff" rather than implying it's pure AI output.
  edited?: boolean;
};

const EMPTY_PROFILE: Profile = { preferences: "", routine: "", communicationStyle: "" };

// ================================================================
// DEMO DATA
// Stand-in for a real database — see loadFromStorage/saveToStorage below
// for how this is currently persisted (browser localStorage, a temporary
// measure pending a real Supabase connection).
// ================================================================

const DEMO_PATIENTS: Record<string, Patient[]> = {
  hospital: [
    {
      id: "h1", name: "Amara Chen", age: 68, room: "Ward 3B",
      baseline: { mood: 6, appetite: 6, mobility: 5, sleep: 6 },
      profile: { preferences: "Prefers tea over coffee; likes the curtain open during the day.", routine: "Usually naps 2-3pm; anxious before scans.", communicationStyle: "Mandarin is first language; prefers written instructions repeated verbally." },
      medications: [{ id: "m1", name: "Metformin", dose: "500mg", frequency: "Twice daily" }],
      healthInfo: { allergies: ["Penicillin", "Shellfish"], conditions: ["Type 2 diabetes", "Hypertension"], medications: ["Metformin 500mg", "Lisinopril 10mg"], dietaryNotes: "Low-sodium, diabetic diet." },
    },
    {
      id: "h2", name: "David Osei", age: 54, room: "Ward 2A",
      baseline: { mood: 7, appetite: 7, mobility: 7, sleep: 5 },
      profile: { preferences: "Prefers to be called Dave; likes the radio on low.", routine: "Early riser, walks the ward corridor most mornings.", communicationStyle: "Direct communicator, appreciates being told things plainly." },
      medications: [{ id: "m2", name: "Amlodipine", dose: "5mg", frequency: "Once daily" }],
      healthInfo: { allergies: ["Latex"], conditions: ["Post-op recovery (hip replacement)"], medications: ["Paracetamol 1g", "Enoxaparin"], dietaryNotes: "No restrictions." },
    },
    {
      id: "h3", name: "Priya Singh", age: 71, room: "ICU-4",
      baseline: { mood: 5, appetite: 5, mobility: 3, sleep: 6 },
      profile: { preferences: "Vegetarian; family visits are important, prefers evenings.", routine: "Sleeps lightly, wakes easily to noise.", communicationStyle: "Prefers Hindi for complex explanations; daughter often translates." },
      medications: [{ id: "m3", name: "Insulin (Lantus)", dose: "10 units", frequency: "Nightly" }],
      healthInfo: { allergies: ["No known allergies"], conditions: ["Post-cardiac surgery", "Atrial fibrillation"], medications: ["Warfarin", "Metoprolol"], dietaryNotes: "Fluid-restricted." },
    },
  ],
  agedcare: [
    {
      id: "p1", name: "Margaret Wu", age: 82, room: "Room 12B",
      baseline: { mood: 7, appetite: 7, mobility: 6, sleep: 7 },
      profile: { preferences: "Enjoys gardening chat and classical music; dislikes rushed showers.", routine: "Church call every Sunday morning; tea at 3pm sharp.", communicationStyle: "Mild hearing loss in left ear - approach from the right." },
      medications: [{ id: "m4", name: "Donepezil", dose: "5mg", frequency: "Once daily" }],
      healthInfo: { allergies: ["Sulfa drugs"], conditions: ["Osteoarthritis", "Mild cognitive impairment"], medications: ["Paracetamol PRN", "Donepezil"], dietaryNotes: "Soft-food diet, thickened fluids." },
    },
    {
      id: "p2", name: "Robert Nguyen", age: 76, room: "Room 08A",
      baseline: { mood: 6, appetite: 8, mobility: 7, sleep: 6 },
      profile: { preferences: "Enjoys card games with other residents; strong coffee only.", routine: "Physio every Tuesday/Thursday 10am.", communicationStyle: "Vietnamese first language; son Minh usually assists with complex topics." },
      medications: [{ id: "m5", name: "Metoprolol", dose: "25mg", frequency: "Twice daily" }],
      healthInfo: { allergies: ["No known allergies"], conditions: ["Type 2 diabetes"], medications: ["Metformin 500mg"], dietaryNotes: "Diabetic diet, no added sugar." },
    },
    {
      id: "p3", name: "Elsie Campbell", age: 89, room: "Room 14C",
      baseline: { mood: 8, appetite: 6, mobility: 4, sleep: 8 },
      profile: { preferences: "Loves her dog's photo on the nightstand; prefers female carers for personal care.", routine: "Settles best with the hallway light left on overnight.", communicationStyle: "Mild dementia - short, simple sentences work best; avoid open-ended questions." },
      medications: [{ id: "m6", name: "Furosemide", dose: "40mg", frequency: "Once daily, morning" }],
      healthInfo: { allergies: ["Penicillin"], conditions: ["Congestive heart failure", "Reduced mobility"], medications: ["Furosemide", "Aspirin 100mg"], dietaryNotes: "Low-salt diet, fluid intake monitored." },
    },
  ],
};

const FACILITY_NAMES: Record<string, string> = {
  hospital: "St Vincent's Metro Hospital",
  agedcare: "Sunnybank Aged Care Residence",
};

// ================================================================
// HELPER FUNCTIONS
// ================================================================

function roleLabel(role: string | null, org: string | null): string {
  const labels: Record<string, string> = {
    nurse: "Nurse",
    carer: "Carer",
    staff: org === "hospital" ? "Nurse" : "Carer",
    doctor: "Doctor",
    family: "Family",
    manager: "Manager",
    admin: "Admin",
    patient: org === "hospital" ? "Patient" : "Resident",
  };
  return role ? labels[role] ?? "Unknown role" : "Unknown role";
}

function timeAgo(timestamp: number): string {
  const diffMinutes = (Date.now() - timestamp) / 60000;
  if (diffMinutes < 1) return "just now";
  if (diffMinutes < 60) return `${Math.floor(diffMinutes)}m ago`;
  const diffHours = diffMinutes / 60;
  if (diffHours < 24) return `${Math.floor(diffHours)}h ago`;
  return `${Math.floor(diffHours / 24)}d ago`;
}

function formatDateTime(timestamp: number): string {
  return new Date(timestamp).toLocaleString("en-AU", {
    day: "numeric", month: "short", year: "numeric", hour: "numeric", minute: "2-digit", hour12: true,
  });
}

function fileToDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

function parseDataUrl(dataUrl: string): { mimeType: string; base64: string } {
  const [header, base64] = dataUrl.split(",");
  const mimeMatch = header.match(/data:(.*?);base64/);
  return { mimeType: mimeMatch ? mimeMatch[1] : "image/jpeg", base64 };
}

// ---------- Persistence — browser localStorage (temporary, until Supabase is wired in) ----------

function loadFromStorage<T>(key: string, fallback: T): T {
  if (typeof window === "undefined") return fallback;
  try {
    const raw = window.localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T) : fallback;
  } catch {
    return fallback;
  }
}

function saveToStorage<T>(key: string, value: T) {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(key, JSON.stringify(value));
  } catch {
    // fails silently on purpose — not critical enough to interrupt the user
  }
}

// Merges two per-patient data dicts, deduplicating by id (if present) or timestamp.
// Used to combine localStorage data with server-side data on initial load so
// clients on any device see all data, not just what they stored locally.
function mergeDataDicts<T extends { id?: string; timestamp?: number }>(
  local: Record<string, T[]>,
  server: Record<string, T[]>
): Record<string, T[]> {
  const result: Record<string, T[]> = { ...local };
  for (const [patientId, items] of Object.entries(server)) {
    const existing = result[patientId] ?? [];
    const seenIds = new Set(existing.map((x) => x.id).filter((id): id is string => !!id));
    const seenTs  = new Set(existing.map((x) => x.timestamp).filter((t): t is number => t != null));
    const extra = (items as T[]).filter((x) =>
      x.id ? !seenIds.has(x.id) : x.timestamp == null || !seenTs.has(x.timestamp)
    );
    result[patientId] = [...existing, ...extra];
  }
  return result;
}

// Fixes patients saved BEFORE the profile/medications/healthInfo fields existed —
// fills in safe empty defaults so old saved data doesn't crash the UI.
function normalizePatient(patient: Patient): Patient {
  const hi = patient.healthInfo;
  return {
    ...patient,
    profile: patient.profile ?? { ...EMPTY_PROFILE },
    medications: patient.medications ?? [],
    healthInfo: hi && hi.allergies && hi.conditions && hi.medications ? hi : {
      allergies: hi?.allergies ?? DEFAULT_HEALTH_INFO.allergies,
      conditions: hi?.conditions ?? DEFAULT_HEALTH_INFO.conditions,
      medications: hi?.medications ?? DEFAULT_HEALTH_INFO.medications,
      dietaryNotes: hi?.dietaryNotes,
    },
  };
}

// Migrates old-shape wellbeing data. Originally each patient's entry was a
// single Baseline object (no timestamp, no history — the latest check
// simply overwrote the last). This detects that old shape and wraps it
// into the new array-of-entries shape, so existing saved data doesn't
// break when the data model changes.
function normalizeWellbeingByPatient(raw: unknown): Record<string, WellbeingEntry[]> {
  const result: Record<string, WellbeingEntry[]> = {};
  if (!raw || typeof raw !== "object") return result;

  Object.entries(raw as Record<string, unknown>).forEach(([patientId, value]) => {
    if (Array.isArray(value)) {
      const seen = new Set<number>();
      result[patientId] = (value as Partial<WellbeingEntry>[])
        .map((entry) => ({
          mood: entry.mood ?? 5,
          appetite: entry.appetite ?? 5,
          mobility: entry.mobility ?? 5,
          sleep: entry.sleep ?? 5,
          timestamp: entry.timestamp ?? Date.now(),
        }))
        .filter((entry) => {
          if (seen.has(entry.timestamp)) return false;
          seen.add(entry.timestamp);
          return true;
        });
    } else if (value && typeof value === "object") {
      const old = value as Baseline;
      result[patientId] = [{ ...old, timestamp: Date.now() }];
    }
  });

  return result;
}

// Formats a vitals reading into readable text, skipping any field that
// wasn't recorded — used both for display and for the AI context block.
function formatVitals(v: VitalSigns): string {
  const parts: string[] = [];
  if (v.systolic !== null && v.diastolic !== null) parts.push(`BP ${v.systolic}/${v.diastolic} mmHg`);
  if (v.heartRate !== null) parts.push(`HR ${v.heartRate} bpm`);
  if (v.temperature !== null) parts.push(`Temp ${v.temperature}°C`);
  if (v.oxygenSaturation !== null) parts.push(`SpO2 ${v.oxygenSaturation}%`);
  if (v.respiratoryRate !== null) parts.push(`RR ${v.respiratoryRate}/min`);
  return parts.length ? parts.join(", ") : "No readings recorded";
}

// Checks a single vital reading against standard adult clinical ranges —
// established medical reference ranges, not something derived or guessed
// by AI, same category of "flag for review" as the wellbeing-baseline
// comparison already in the app. Returns a severity level used purely for
// colour-coding, never a diagnosis.
type VitalStatus = "normal" | "caution" | "concern";

function vitalStatus(field: keyof Omit<VitalSigns, "id" | "authorRole" | "timestamp">, value: number | null): VitalStatus {
  if (value === null) return "normal";
  switch (field) {
    case "systolic":
      if (value < 90 || value > 160) return "concern";
      if (value < 100 || value > 140) return "caution";
      return "normal";
    case "diastolic":
      if (value < 50 || value > 100) return "concern";
      if (value < 60 || value > 90) return "caution";
      return "normal";
    case "heartRate":
      if (value < 50 || value > 120) return "concern";
      if (value < 60 || value > 100) return "caution";
      return "normal";
    case "temperature":
      if (value < 35 || value > 38.5) return "concern";
      if (value < 36 || value > 37.5) return "caution";
      return "normal";
    case "oxygenSaturation":
      if (value < 92) return "concern";
      if (value < 95) return "caution";
      return "normal";
    case "respiratoryRate":
      if (value < 8 || value > 28) return "concern";
      if (value < 12 || value > 20) return "caution";
      return "normal";
    default:
      return "normal";
  }
}

function statusColor(status: VitalStatus): string {
  if (status === "concern") return "text-destructive";
  if (status === "caution") return "text-amber-600";
  return "text-ink";
}

// Formats a patient's full context — profile, medications, vitals, and
// diagnoses — into plain text so AI prompts (handover, Q&A, family update)
// actually use this information, rather than it being stored but never
// surfaced to the AI.
function personContextBlock(patient: Patient, latestVitals?: VitalSigns, diagnoses?: Diagnosis[]): string {
  const parts: string[] = [];
  if (patient.profile.preferences) parts.push(`Preferences: ${patient.profile.preferences}`);
  if (patient.profile.routine) parts.push(`Routine: ${patient.profile.routine}`);
  if (patient.profile.communicationStyle) parts.push(`Communication needs: ${patient.profile.communicationStyle}`);
  if (patient.medications.length) {
    parts.push(`Current medications: ${patient.medications.map((m) => `${m.name} ${m.dose} (${m.frequency})`).join("; ")}`);
  }
  if (latestVitals) {
    parts.push(`Most recent vital signs: ${formatVitals(latestVitals)}`);
  }
  // Only active/chronic conditions are surfaced to the AI — a resolved
  // condition is historical and less relevant to a current handover or
  // query, so it's deliberately excluded here even though it stays
  // visible in the UI list.
  if (diagnoses && diagnoses.length) {
    const relevant = diagnoses.filter((d) => d.status !== "Resolved");
    if (relevant.length) {
      parts.push(`Diagnoses: ${relevant.map((d) => `${d.condition} (${d.status})`).join("; ")}`);
    }
  }
  return parts.length ? parts.join("\n") : "No personalised profile recorded yet.";
}

// Helper functions specifically for the Discharge Summary feature. Unlike
// personContextBlock above (used for the "personal profile" side of the
// AI's context), these format the FULL clinical record — every diagnosis
// regardless of status, every medication, every report, and the complete
// vitals history — since a discharge summary needs the entire picture of
// the admission, not just what's currently active.

function formatDiagnosesForSummary(diagnoses: Diagnosis[]): string {
  if (!diagnoses.length) return "None recorded";
  return diagnoses.map((d) => `${d.condition} (${d.status})`).join("; ");
}

function formatMedicationsForSummary(medications: Medication[]): string {
  if (!medications.length) return "None recorded";
  return medications.map((m) => `${m.name} ${m.dose} (${m.frequency})`).join("; ");
}

function formatReportsForSummary(reports: MedicalReport[]): string {
  if (!reports.length) return "None recorded";
  return reports.map((r) => `${r.reportType}: ${r.title}${r.notes ? ` — ${r.notes}` : ""}`).join("; ");
}

function formatVitalsHistoryForSummary(vitals: VitalSigns[]): string {
  if (!vitals.length) return "None recorded";
  const sorted = [...vitals].sort((a, b) => a.timestamp - b.timestamp);
  return sorted.map((v) => `${formatDateTime(v.timestamp)}: ${formatVitals(v)}`).join(" | ");
}

// Builds a plain-text, CODE-generated table of exact vitals readings —
// deliberately NOT authored by the AI, to eliminate any risk of numbers
// being transcribed or reordered incorrectly (as happened with an earlier
// BP reading that came back reversed). This gets appended directly onto
// the GP summary after generation, so the clinically load-bearing numbers
// always come straight from the actual stored patient data, verbatim —
// never passed through the AI's own transcription at all.
function buildVitalsTableText(vitals: VitalSigns[]): string {
  if (!vitals.length) return "No vitals recorded during this admission.";
  const sorted = [...vitals].sort((a, b) => a.timestamp - b.timestamp);
  return sorted
    .map((v) => `${formatDateTime(v.timestamp)} — ${formatVitals(v)}`)
    .join("\n");
}

// Generates a human-readable referral code: REF-YYYYMMDD-XXXXX
// Excludes I/O/0/1 to avoid visual confusion when read aloud or printed.
function generateReferralCode(): string {
  const d = new Date();
  const date = `${d.getFullYear()}${String(d.getMonth() + 1).padStart(2, "0")}${String(d.getDate()).padStart(2, "0")}`;
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  const rand = Array.from({ length: 5 }, () => chars[Math.floor(Math.random() * chars.length)]).join("");
  return `REF-${date}-${rand}`;
}

// Shared helper for reading fetch responses from our own /api routes.
// Throws a specific, actionable error if the response isn't valid JSON —
// this is what catches "the route file is missing/misnamed" (which returns
// an HTML 404 page instead of JSON) and reports it distinctly from a
// genuine network failure, rather than both looking identical to the user.
// eslint-disable-next-line @typescript-eslint/no-explicit-any
async function parseJsonResponse(response: Response, routeName: string): Promise<any> {
  const rawText = await response.text();
  try {
    return JSON.parse(rawText);
  } catch {
    console.error(`${routeName} returned non-JSON. Raw response (first 200 chars):`, rawText.slice(0, 200));
    throw new Error(
      `The ${routeName} service gave an unexpected response (status ${response.status}). This usually means the matching app/api/.../route.ts file is missing, misnamed, or the dev server needs restarting.`
    );
  }
}

// ---------- Shift grouping (Doctor's Shift History panel) ----------

type ShiftDef = { key: "morning" | "afternoon" | "night"; label: string; startHour: number; endHour: number };

const SHIFT_DEFS: ShiftDef[] = [
  { key: "morning", label: "Morning", startHour: 6, endHour: 14 },
  { key: "afternoon", label: "Afternoon", startHour: 14, endHour: 22 },
  { key: "night", label: "Night", startHour: 22, endHour: 6 },
];

// Returns which shift a timestamp falls into, as a stable sortable key
// plus a human-readable label like "Morning · 25 Jul".
function getShiftPeriod(timestamp: number): { key: string; label: string } {
  const d = new Date(timestamp);
  const hour = d.getHours();

  // Night shift wraps past midnight (22:00-06:00) — this handles both the
  // "normal" case (morning/afternoon) and that wraparound case.
  let shift = SHIFT_DEFS.find((s) =>
    s.startHour < s.endHour ? hour >= s.startHour && hour < s.endHour : hour >= s.startHour || hour < s.endHour
  );
  if (!shift) shift = SHIFT_DEFS[2];

  // A 2am note belongs to the night shift that STARTED the evening before,
  // not a new night shift for the current calendar day.
  const dateForKey = new Date(d);
  if (shift.key === "night" && hour < 6) dateForKey.setDate(dateForKey.getDate() - 1);

  const dateStr = dateForKey.toISOString().slice(0, 10);
  const dayLabel = dateForKey.toLocaleDateString("en-AU", { day: "numeric", month: "short" });
  return { key: `${dateStr}-${shift.key}`, label: `${shift.label} · ${dayLabel}` };
}

type ShiftGroup = { key: string; label: string; notes: CareNote[] };

function groupNotesByShift(notes: CareNote[]): ShiftGroup[] {
  const groups: Record<string, ShiftGroup> = {};
  notes.forEach((note) => {
    const period = getShiftPeriod(note.timestamp);
    if (!groups[period.key]) groups[period.key] = { key: period.key, label: period.label, notes: [] };
    groups[period.key].notes.push(note);
  });
  return Object.values(groups).sort((a, b) => b.key.localeCompare(a.key));
}

// ================================================================
// SMALL REUSABLE UI COMPONENTS
// ================================================================

// Read-only bar showing an already-saved wellbeing value against baseline.
function WellbeingBar({ label, value, baseline }: { label: string; value: number; baseline: number }) {
  const delta = value - baseline;
  const pct = Math.max(0, Math.min(100, value * 10));
  let barColor = "bg-teal";
  if (delta <= -2) barColor = "bg-destructive";
  else if (delta < 0) barColor = "bg-amber-500";

  return (
    <div className="flex items-center gap-3">
      <span className="w-20 shrink-0 text-sm text-ink-soft">{label}</span>
      <div className="h-2 flex-1 rounded-full bg-secondary">
        <div className={`h-2 rounded-full ${barColor}`} style={{ width: `${pct}%` }} />
      </div>
      <span className="w-10 shrink-0 text-right text-xs text-muted-foreground">{value}/10</span>
    </div>
  );
}

// A draggable slider — used only inside the wellbeing entry form, distinct
// from WellbeingBar above which only displays, never changes, a value.
function WellbeingSliderInput({ label, value, onChange }: { label: string; value: number; onChange: (newValue: number) => void }) {
  return (
    <div className="flex items-center gap-3">
      <span className="w-20 shrink-0 text-sm text-ink-soft">{label}</span>
      <input type="range" min={1} max={10} value={value} onChange={(e) => onChange(Number(e.target.value))} className="h-2 flex-1 accent-teal" />
      <span className="w-10 shrink-0 text-right text-xs font-medium text-ink">{value}/10</span>
    </div>
  );
}

// HealthChart and FamilyResidentView are imported from their own files above.

// ================================================================
// MAIN DASHBOARD COMPONENT
// ================================================================

export default function DashboardView({ role: roleProp, org: orgProp }: { role?: string; org?: string } = {}) {

  const searchParams = useSearchParams();

  // ---------- Identity, read from the URL set by the login page ----------
  const { data: session } = useSession();
  // org priority: prop (route-level override) → URL param → session JWT → default
  const org = orgProp ?? searchParams.get("org") ?? session?.user?.org ?? "hospital";
  const role = roleProp ?? searchParams.get("role") ?? (session?.user?.role?.toLowerCase() ?? "staff");
  const staffName = searchParams.get("name") ?? session?.user?.name ?? "";

  const facilityName = org ? FACILITY_NAMES[org] ?? "Unknown facility" : "Unknown facility";
  const label = roleLabel(role, org);
  const displayIdentity = staffName ? `${staffName} (${label})` : label;

  const personLabel = org === "hospital" ? "Patients" : "Residents";
  const personLabelSingular = org === "hospital" ? "patient" : "resident";

  // Named role flags, checked in several places below to control what's
  // visible. Kept as named booleans (rather than inline role === "..."
  // checks scattered everywhere) so extending visibility later is a one-line change.
  const isFamilyRole  = role === "family" || role === "family_member";
  const isPatientRole = role === "patient";
  const isDoctorRole  = role === "doctor";
  const isManagerRole = role === "manager" || role === "admin";

  // ---------- Core data state ----------
  const [hydrated, setHydrated] = useState(false);

  const [patients, setPatients] = useState<Patient[]>(() => (org ? DEMO_PATIENTS[org] ?? [] : []));
  const [wellbeingByPatient, setWellbeingByPatient] = useState<Record<string, WellbeingEntry[]>>({});
  const [notesByPatient, setNotesByPatient] = useState<Record<string, CareNote[]>>({});
  const [reportsByPatient, setReportsByPatient] = useState<Record<string, MedicalReport[]>>({});
  const [referralsByPatient, setReferralsByPatient] = useState<Record<string, ReferralNote[]>>({});
  const [vitalsByPatient, setVitalsByPatient] = useState<Record<string, VitalSigns[]>>({});
  const [diagnosesByPatient, setDiagnosesByPatient] = useState<Record<string, Diagnosis[]>>({});
  // Discharge summary drafts per patient.
  const [dischargeSummariesByPatient, setDischargeSummariesByPatient] = useState<Record<string, DischargeSummary[]>>({});
  // Family chat messages per patient — shared thread visible to all family members and staff.
  const [chatMessagesByPatient, setChatMessagesByPatient] = useState<Record<string, ChatMessage[]>>({});
  // Draft text for the staff-side family chat input (separate from FamilyResidentView's own input).
  const [staffChatDraft, setStaffChatDraft] = useState("");

  // In-app notifications and alert panel state.
  const [notifications, setNotifications] = useState<InAppNotification[]>([]);
  const [notifPanelOpen, setNotifPanelOpen] = useState(false);
  // Toast pop-ups for notifications arriving from other sessions.
  const [toasts, setToasts] = useState<InAppNotification[]>([]);
  // IDs we've already shown (or created ourselves) — prevents re-toasting.
  const seenNotifIds = useRef<Set<string>>(new Set());
  // BroadcastChannel for instant cross-tab push (faster than polling).
  const bcRef = useRef<BroadcastChannel | null>(null);
  // Stable ref so the async BC handler always reads the latest role/identity/patient state
  // without needing the useEffect to re-subscribe on every render.
  const liveCtxRef = useRef({ isFamilyRole: false, isPatientRole: false, displayIdentity: "", patients: [] as Patient[] });
  // Alert that fires when a wellbeing check has concerning metric drops.
  const [wellbeingAlert, setWellbeingAlert] = useState<{
    patientName: string;
    concerns: { label: string; current: number; baseline: number; delta: number }[];
  } | null>(null);

  const [selectedId, setSelectedId] = useState<string | null>(null);
  const selectedPatient = patients.find((p) => p.id === selectedId);

  // Keep the BC handler's context ref current every render so it reads fresh values.
  liveCtxRef.current = { isFamilyRole, isPatientRole, displayIdentity, patients };

  const patientWellbeingHistory = selectedPatient ? wellbeingByPatient[selectedPatient.id] ?? [] : [];
  const latestCheck = patientWellbeingHistory.length > 0 ? patientWellbeingHistory[patientWellbeingHistory.length - 1] : undefined;

  const patientVitalsHistory = selectedPatient ? vitalsByPatient[selectedPatient.id] ?? [] : [];
  const latestVitals = patientVitalsHistory.length > 0 ? patientVitalsHistory[patientVitalsHistory.length - 1] : undefined;

  // ---------- Wellbeing entry form state ----------
  const [formOpen, setFormOpen] = useState(false);
  const [draft, setDraft] = useState<Baseline>({ mood: 5, appetite: 5, mobility: 5, sleep: 5 });

  // ---------- Care note entry state ----------
  const [noteDraft, setNoteDraft] = useState("");
  const [pendingImage, setPendingImage] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [captioning, setCaptioning] = useState(false);
  const [captionError, setCaptionError] = useState("");

  // ---------- Voice input state ----------
  const [recording, setRecording] = useState(false);
  const [voiceError, setVoiceError] = useState("");
  // `any` is used here because SpeechRecognition isn't a standard type
  // TypeScript knows about — it's a browser-specific API.
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const recognitionRef = useRef<any>(null);
  // After recording stops, voiceReviewMode lets the user amend the transcript before saving.
  const [voiceReviewMode, setVoiceReviewMode] = useState(false);

  // ---------- Camera state ----------
  const [cameraMenuOpen, setCameraMenuOpen] = useState(false);
  const [cameraOpen, setCameraOpen] = useState(false);
  const videoRef = useRef<HTMLVideoElement>(null);
  const cameraStreamRef = useRef<MediaStream | null>(null);

  // ---------- AI feature state (handover, Q&A, family update, discharge) ----------
  const [handoverText, setHandoverText] = useState<string | null>(null);
  const [handoverLoading, setHandoverLoading] = useState(false);
  const [handoverError, setHandoverError] = useState("");

  const [qaOpen, setQaOpen] = useState(false);
  const [qaQuestion, setQaQuestion] = useState("");
  const [qaAnswer, setQaAnswer] = useState<string | null>(null);
  const [qaLoading, setQaLoading] = useState(false);
  const [qaError, setQaError] = useState("");

  const [familyUpdateLoading, setFamilyUpdateLoading] = useState(false);
  const [familyUpdateError, setFamilyUpdateError] = useState("");

  // Discharge summary generation state — no separate "result" holder like
  // handover has, since each generated summary is saved directly into
  // dischargeSummariesByPatient and displayed from there.
  const [dischargeLoading, setDischargeLoading] = useState(false);
  const [dischargeError, setDischargeError] = useState("");

  // Tracks which discharge summary (by id) is currently being edited —
  // only one at a time, matching the accordion-style editing pattern used
  // elsewhere in this file. editSummaryContent holds the in-progress
  // textarea value while editing, separate from the saved content so
  // cancelling doesn't lose the original text.
  const [editingSummaryId, setEditingSummaryId] = useState<string | null>(null);
  const [editSummaryContent, setEditSummaryContent] = useState("");

  // ---------- Admit-patient form state ----------
  const [addPatientOpen, setAddPatientOpen] = useState(false);
  const [newPatientName, setNewPatientName] = useState("");
  const [newPatientAge, setNewPatientAge] = useState("");
  const [newPatientRoom, setNewPatientRoom] = useState("");

  // ---------- Edit-patient form state ----------
  const [editPatientOpen, setEditPatientOpen] = useState(false);
  const [editWard, setEditWard] = useState("");
  const [editAge, setEditAge] = useState("");

  // ---------- Profile edit form state ----------
  const [profileEditOpen, setProfileEditOpen] = useState(false);
  const [profileDraft, setProfileDraft] = useState<Profile>(EMPTY_PROFILE);

  // ---------- Medication form state ----------
  const [medFormOpen, setMedFormOpen] = useState(false);
  const [medName, setMedName] = useState("");
  const [medDose, setMedDose] = useState("");
  const [medFrequency, setMedFrequency] = useState("");

  // ---------- Shift History panel state (Doctor only) ----------
  const [expandedShiftKey, setExpandedShiftKey] = useState<string | null>(null);

  // ---------- Reports & Imaging form state ----------
  const [reportFormOpen, setReportFormOpen] = useState(false);
  const [reportType, setReportType] = useState<ReportType>("Blood Test");
  const [reportTitle, setReportTitle] = useState("");
  const [reportNotes, setReportNotes] = useState("");
  const [reportPendingImage, setReportPendingImage] = useState<string | null>(null);
  const reportFileInputRef = useRef<HTMLInputElement>(null);

  // ---------- Referrals & Collaboration form state ----------
  const [referralFormOpen, setReferralFormOpen] = useState(false);
  const [referralRecipients, setReferralRecipients] = useState<string[]>([]);
  const [referralRecipientInput, setReferralRecipientInput] = useState("");
  const [referralType, setReferralType] = useState<"internal" | "external">("internal");
  const [referralSubject, setReferralSubject] = useState("");
  const [referralMessage, setReferralMessage] = useState("");


  // ---------- Vital Signs form state ----------
  // Each field is a string (not a number) while being typed, since an
  // empty input box needs to be representable — converted to number | null
  // only when actually saving.
  const [vitalsFormOpen, setVitalsFormOpen] = useState(false);
  const [vitalsSystolic, setVitalsSystolic] = useState("");
  const [vitalsDiastolic, setVitalsDiastolic] = useState("");
  const [vitalsHeartRate, setVitalsHeartRate] = useState("");
  const [vitalsTemperature, setVitalsTemperature] = useState("");
  const [vitalsOxygenSaturation, setVitalsOxygenSaturation] = useState("");
  const [vitalsRespiratoryRate, setVitalsRespiratoryRate] = useState("");

  // ---------- Problem List / Diagnoses form state ----------
  const [diagnosisFormOpen, setDiagnosisFormOpen] = useState(false);
  const [diagnosisCondition, setDiagnosisCondition] = useState("");
  const [diagnosisStatus, setDiagnosisStatus] = useState<ProblemStatus>("Active");
  const [diagnosisNotes, setDiagnosisNotes] = useState("");

  // ================================================================
  // DATA LOADING & PERSISTENCE
  //
  // Loading real saved data happens inside useEffect (browser-only, runs
  // AFTER the page's first render) rather than during the initial useState
  // call. This avoids a "hydration mismatch" error: Next.js renders every
  // page once on the server first (where localStorage doesn't exist, so it
  // would fall back to demo data) and once in the browser (where it might
  // load different real data) — those two renders need to match exactly,
  // which is what starting from the same safe fallback on both, then
  // swapping in real data only after mount, achieves.
  // ================================================================

  // Stop any live camera stream when the component unmounts.
  useEffect(() => {
    return () => { cameraStreamRef.current?.getTracks().forEach((t) => t.stop()); };
  }, []);

  // Assign srcObject once the <video> element is in the DOM (cameraOpen → true).
  // setTimeout(..., 0) is not reliable — the DOM update may not have flushed yet.
  useEffect(() => {
    if (cameraOpen && videoRef.current && cameraStreamRef.current) {
      videoRef.current.srcObject = cameraStreamRef.current;
      videoRef.current.play().catch(() => {});
    }
  }, [cameraOpen]);

  // Family and patient roles: auto-select on mount so the view is never blank.
  // Patient role tries to match by name first, then falls back to the first in the list.
  // Family role always selects the first patient (family members see all patients in their org).
  useEffect(() => {
    if ((!isFamilyRole && !isPatientRole) || !hydrated || patients.length === 0 || selectedId) return;
    const match = isPatientRole
      ? (patients.find((p) => staffName && p.name.toLowerCase() === staffName.toLowerCase()) ?? patients[0])
      : patients[0];
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setSelectedId(match.id);
  }, [isFamilyRole, isPatientRole, hydrated, patients, staffName, selectedId]);

  useEffect(() => {
    if (!org) return;

    // Load transient data (notes, vitals, wellbeing checks) from localStorage.
    // These are session-local and not yet synced to the DB.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setWellbeingByPatient(normalizeWellbeingByPatient(loadFromStorage(`tracewell:${org}:wellbeing`, {})));
    setNotesByPatient(loadFromStorage(`tracewell:${org}:notes`, {}));
    setReportsByPatient(loadFromStorage(`tracewell:${org}:reports`, {}));
    setReferralsByPatient(loadFromStorage(`tracewell:${org}:referrals`, {}));
    setVitalsByPatient(loadFromStorage(`tracewell:${org}:vitals`, {}));
    setDiagnosesByPatient(loadFromStorage(`tracewell:${org}:diagnoses`, {}));
    setDischargeSummariesByPatient(loadFromStorage(`tracewell:${org}:discharge`, {}));
    setChatMessagesByPatient(loadFromStorage(`tracewell:${org}:chat`, {}));
    const storedNotifs = loadFromStorage<InAppNotification[]>(`tracewell:${org}:notifications`, []);
    setNotifications(storedNotifs);
    // Pre-seed so existing notifications never trigger toast pop-ups
    storedNotifs.forEach((n) => seenNotifIds.current.add(n.id));

    // Patient list: prefer the DB (single source of truth for identity data).
    // Fall back to the localStorage cache, then to the built-in demo data,
    // so the UI is never blank when the DB is not reachable.
    const cached = loadFromStorage(`tracewell:${org}:patients`, null);
    if (cached) setPatients((cached as Patient[]).map(normalizePatient));
    else        setPatients((DEMO_PATIENTS[org] ?? []).map(normalizePatient));

    setHydrated(true);

    // Fetch server-side data to merge with localStorage — this makes cross-device
    // and cross-browser data visible immediately on load (not just real-time).
    fetch(`/api/data?org=${org}`)
      .then((r) => r.ok ? r.json() : null)
      .then((serverData: Record<string, Record<string, unknown[]>> | null) => {
        if (!serverData) return;
        if (serverData.notes)     setNotesByPatient((prev) => mergeDataDicts(prev, serverData.notes as Record<string, CareNote[]>));
        if (serverData.wellbeing) setWellbeingByPatient((prev) => normalizeWellbeingByPatient(mergeDataDicts(prev, serverData.wellbeing as Record<string, WellbeingEntry[]>)));
        if (serverData.vitals)    setVitalsByPatient((prev) => mergeDataDicts(prev, serverData.vitals as Record<string, VitalSigns[]>));
        if (serverData.referrals) setReferralsByPatient((prev) => mergeDataDicts(prev, serverData.referrals as Record<string, ReferralNote[]>));
        if (serverData.chat)      setChatMessagesByPatient((prev) => mergeDataDicts(prev, serverData.chat as Record<string, ChatMessage[]>));
        if (serverData.diagnoses) setDiagnosesByPatient((prev) => mergeDataDicts(prev, serverData.diagnoses as Record<string, Diagnosis[]>));
      })
      .catch(() => { /* server data unavailable — localStorage is sufficient */ });

    fetch(`/api/patients?org=${org}`)
      .then((r) => r.ok ? r.json() : null)
      .then((data: { patients?: Patient[] } | null) => {
        if (data?.patients && data.patients.length > 0) {
          setPatients(data.patients.map(normalizePatient));
        }
      })
      .catch(() => { /* DB not available — continue with cached/demo data */ });
  }, [org]);

  // Each of these save-effects checks `hydrated` first — without that
  // guard, they'd fire on the very first render too, BEFORE the load
  // effect above has run, and would overwrite real saved data with the
  // fallback demo data.
  useEffect(() => {
    if (hydrated && org) saveToStorage(`tracewell:${org}:patients`, patients);
  }, [patients, org, hydrated]);

  useEffect(() => {
    if (hydrated && org) saveToStorage(`tracewell:${org}:wellbeing`, wellbeingByPatient);
  }, [wellbeingByPatient, org, hydrated]);

  useEffect(() => {
    if (hydrated && org) saveToStorage(`tracewell:${org}:notes`, notesByPatient);
  }, [notesByPatient, org, hydrated]);

  useEffect(() => {
    if (hydrated && org) saveToStorage(`tracewell:${org}:reports`, reportsByPatient);
  }, [reportsByPatient, org, hydrated]);

  useEffect(() => {
    if (hydrated && org) saveToStorage(`tracewell:${org}:referrals`, referralsByPatient);
  }, [referralsByPatient, org, hydrated]);

  useEffect(() => {
    if (hydrated && org) saveToStorage(`tracewell:${org}:vitals`, vitalsByPatient);
  }, [vitalsByPatient, org, hydrated]);

  useEffect(() => {
    if (hydrated && org) saveToStorage(`tracewell:${org}:diagnoses`, diagnosesByPatient);
  }, [diagnosesByPatient, org, hydrated]);

  // Save discharge summaries whenever they change.
  useEffect(() => {
    if (hydrated && org) saveToStorage(`tracewell:${org}:discharge`, dischargeSummariesByPatient);
  }, [dischargeSummariesByPatient, org, hydrated]);

  useEffect(() => {
    if (hydrated && org) saveToStorage(`tracewell:${org}:chat`, chatMessagesByPatient);
  }, [chatMessagesByPatient, org, hydrated]);

  useEffect(() => {
    if (hydrated && org) saveToStorage(`tracewell:${org}:notifications`, notifications);
  }, [notifications, org, hydrated]);

  // ── Live event helpers ────────────────────────────────────────────────────
  // showLiveToast and applyLiveEvent are called from both BroadcastChannel
  // (same-browser tabs) and SSE (cross-device). They use liveCtxRef so they
  // always read fresh role/identity/patient values without stale closures.

  function showLiveToast(t: InAppNotification) {
    seenNotifIds.current.add(t.id);
    setToasts((prev) => [...prev, t]);
    setTimeout(() => setToasts((prev) => prev.filter((x) => x.id !== t.id)), 7000);
  }

  // Merges a received LiveEvent into state and shows the appropriate toast/bell.
  // Works for same-browser tabs (BroadcastChannel) and other devices (SSE).
  function applyLiveEvent(ev: LiveEvent) {
    const { isFamilyRole, isPatientRole, displayIdentity, patients } = liveCtxRef.current;

    // Never process your own actions.
    if (ev.authorRole === displayIdentity) return;

    // Merge the full data payload into state and keep localStorage in sync
    // so the data survives a page refresh on this device too.
    if (ev.type === "care_note") {
      setNotesByPatient((prev) => {
        const existing = prev[ev.patientId] ?? [];
        if (existing.some((n) => n.id === ev.note.id)) return prev;
        const updated = { ...prev, [ev.patientId]: [...existing, ev.note] };
        saveToStorage(`tracewell:${org}:notes`, updated);
        return updated;
      });
    } else if (ev.type === "wellbeing") {
      setWellbeingByPatient((prev) => {
        const existing = (prev[ev.patientId] ?? []) as WellbeingEntry[];
        if (existing.some((e) => e.timestamp === ev.entry.timestamp)) return prev;
        const updated = { ...prev, [ev.patientId]: [...existing, ev.entry] };
        saveToStorage(`tracewell:${org}:wellbeing`, updated);
        return normalizeWellbeingByPatient(updated);
      });
    } else if (ev.type === "chat") {
      setChatMessagesByPatient((prev) => {
        const existing = prev[ev.patientId] ?? [];
        if (existing.some((m) => m.id === ev.message.id)) return prev;
        const updated = { ...prev, [ev.patientId]: [...existing, ev.message] };
        saveToStorage(`tracewell:${org}:chat`, updated);
        return updated;
      });
    } else if (ev.type === "referral") {
      setReferralsByPatient((prev) => {
        const existing = prev[ev.patientId] ?? [];
        if (existing.some((r) => r.id === ev.referral.id)) return prev;
        const updated = { ...prev, [ev.patientId]: [...existing, ev.referral] };
        saveToStorage(`tracewell:${org}:referrals`, updated);
        return updated;
      });
    } else if (ev.type === "vitals") {
      setVitalsByPatient((prev) => {
        const existing = prev[ev.patientId] ?? [];
        if (existing.some((v) => v.id === ev.vitals.id)) return prev;
        const updated = { ...prev, [ev.patientId]: [...existing, ev.vitals] };
        saveToStorage(`tracewell:${org}:vitals`, updated);
        return updated;
      });
    }

    // Pre-seed seenNotifIds so the poll doesn't fire a duplicate toast
    // for the corresponding InAppNotification that was saved to localStorage.
    const notifId = (ev as { notifId?: string }).notifId;
    if (notifId) seenNotifIds.current.add(notifId);

    // Notification routing — both bell (persistent) and toast (7-second pop-up).
    const myPatientIds = new Set(patients.map((p) => p.id));

    if (isFamilyRole || isPatientRole) {
      // Family / patient: only care about their own patients.
      if (!myPatientIds.has(ev.patientId)) return;

      let message = "";
      let notifType: NotifType = "care_update";
      if (ev.type === "care_note") {
        const noteType = (ev as Extract<LiveEvent, { type: "care_note" }>).noteType;
        message = noteType === "family_update"
          ? `New care update from ${ev.authorRole} for ${ev.patientName}`
          : `${ev.authorRole} logged a visit for ${ev.patientName}: "${ev.preview}"`;
      } else if (ev.type === "wellbeing") {
        notifType = ev.isConcern ? "wellbeing_concern" : "care_update";
        message = ev.isConcern
          ? `Wellbeing concern flagged for ${ev.patientName} by ${ev.authorRole}`
          : `Wellbeing check recorded for ${ev.patientName} by ${ev.authorRole}`;
      } else if (ev.type === "vitals") {
        message = `Vitals updated for ${ev.patientName} by ${ev.authorRole}`;
      } else if (ev.type === "chat") {
        message = `${(ev as Extract<LiveEvent, { type: "chat" }>).authorName}: "${ev.preview}"`;
      }
      if (!message) return;

      const liveNotif: InAppNotification = {
        id: `live-${ev.type}-${ev.timestamp}`,
        patientId: ev.patientId, patientName: ev.patientName,
        message, type: notifType, authorRole: ev.authorRole,
        timestamp: ev.timestamp, read: false,
      };
      seenNotifIds.current.add(liveNotif.id);
      // Add to bell AND show toast
      setNotifications((prev) =>
        prev.some((n) => n.id === liveNotif.id) ? prev : [liveNotif, ...prev]
      );
      showLiveToast(liveNotif);
    } else {
      // Clinical staff: bell + toast for all cross-user events.
      let message = "";
      let notifType: NotifType = "care_update";
      if (ev.type === "care_note") {
        const noteType = (ev as Extract<LiveEvent, { type: "care_note" }>).noteType;
        if (noteType === "family_update") return;
        message = `${ev.authorRole} logged on ${ev.patientName}: "${ev.preview}"`;
      } else if (ev.type === "referral") {
        const recipients = ev.toRecipients.join(", ");
        message = `Referral for ${ev.patientName} from ${ev.authorRole} → ${recipients}`;
      } else if (ev.type === "chat") {
        message = `${(ev as Extract<LiveEvent, { type: "chat" }>).authorName}: "${ev.preview}" (re: ${ev.patientName})`;
      } else if (ev.type === "vitals") {
        message = `Vitals recorded for ${ev.patientName} by ${ev.authorRole}`;
      } else if (ev.type === "wellbeing") {
        notifType = ev.isConcern ? "wellbeing_concern" : "care_update";
        message = ev.isConcern
          ? `Wellbeing concern for ${ev.patientName} — flagged by ${ev.authorRole}`
          : `Wellbeing check logged for ${ev.patientName} by ${ev.authorRole}`;
      }
      if (!message) return;

      const liveNotif: InAppNotification = {
        id: `live-${ev.type}-${ev.timestamp}`,
        patientId: ev.patientId, patientName: ev.patientName,
        message, type: notifType, authorRole: ev.authorRole,
        timestamp: ev.timestamp, read: false,
      };
      seenNotifIds.current.add(liveNotif.id);
      setNotifications((prev) =>
        prev.some((n) => n.id === liveNotif.id) ? prev : [liveNotif, ...prev]
      );
      showLiveToast(liveNotif);
    }
  }

  // ── Real-time cross-tab sync ────────────────────────────────────────────
  // BroadcastChannel provides instant push (< 1ms) the moment another tab
  // writes data. The storage event + 5-second poll stay as a fallback.
  useEffect(() => {
    if (!org || !hydrated) return;

    const k = (s: string) => `tracewell:${org}:${s}`;

    // ── BroadcastChannel: instant push to other tabs in the same browser ──
    // The event payload carries the full data object so no localStorage read
    // is needed — this is the same merge logic used by the SSE handler.
    if (typeof BroadcastChannel !== "undefined") {
      const bc = new BroadcastChannel("tracewell-live");
      bcRef.current = bc;
      bc.onmessage = (e: MessageEvent<LiveEvent>) => {
        if (e.data?.org === org) applyLiveEvent(e.data);
      };
    }

    // ── Storage event + poll: fallback for missed BC events ──────────
    function refreshLiveData() {
      const newNotes = loadFromStorage<Record<string, CareNote[]>>(k("notes"), {});
      setNotesByPatient((prev) => JSON.stringify(prev) !== JSON.stringify(newNotes) ? newNotes : prev);

      const newWellbeing = normalizeWellbeingByPatient(loadFromStorage(k("wellbeing"), {}));
      setWellbeingByPatient((prev) => JSON.stringify(prev) !== JSON.stringify(newWellbeing) ? newWellbeing : prev);

      const newVitals = loadFromStorage<Record<string, VitalSigns[]>>(k("vitals"), {});
      setVitalsByPatient((prev) => JSON.stringify(prev) !== JSON.stringify(newVitals) ? newVitals : prev);

      const newChat = loadFromStorage<Record<string, ChatMessage[]>>(k("chat"), {});
      setChatMessagesByPatient((prev) => JSON.stringify(prev) !== JSON.stringify(newChat) ? newChat : prev);

      const newNotifs = loadFromStorage<InAppNotification[]>(k("notifications"), []);
      setNotifications((prev) => JSON.stringify(prev) !== JSON.stringify(newNotifs) ? newNotifs : prev);
    }

    const onStorage = (e: StorageEvent) => {
      if (e.key?.startsWith(`tracewell:${org}:`)) refreshLiveData();
    };
    window.addEventListener("storage", onStorage);
    const poll = setInterval(refreshLiveData, 5000);

    return () => {
      bcRef.current?.close();
      bcRef.current = null;
      window.removeEventListener("storage", onStorage);
      clearInterval(poll);
    };
  // applyLiveEvent reads liveCtxRef.current so it's always current — no re-subscribe needed
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [org, hydrated]);

  // ── SSE: cross-device real-time sync ─────────────────────────────────────
  // Connects to /api/live so updates on any device push to this client instantly.
  // Uses the same applyLiveEvent function as BroadcastChannel so behavior is
  // identical regardless of whether the sender is in the same browser or not.
  useEffect(() => {
    if (!org || !hydrated) return;

    const es = new EventSource(`/api/live?org=${encodeURIComponent(org)}`);

    es.onmessage = (e: MessageEvent<string>) => {
      if (!e.data?.trim() || e.data.trim().startsWith(":")) return;
      try {
        const ev = JSON.parse(e.data) as LiveEvent;
        if (ev.org === org) applyLiveEvent(ev);
      } catch { /* ignore malformed frames */ }
    };

    es.onerror = () => {
    };

    return () => es.close();
  // applyLiveEvent reads liveCtxRef.current so it's always current — no re-subscribe needed
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [org, hydrated]);

  // ── Toast pop-up detection ────────────────────────────────────────────────
  // Fires whenever notifications change. Unseen IDs (not in seenNotifIds) that
  // weren't created by the current user trigger a 6-second toast pop-up.
  useEffect(() => {
    if (!hydrated) return;

    const unseen = notifications.filter((n) => !seenNotifIds.current.has(n.id));
    if (unseen.length === 0) return;

    // Mark immediately so re-renders don't re-trigger
    unseen.forEach((n) => seenNotifIds.current.add(n.id));

    const visiblePatientIds = new Set(patients.map((p) => p.id));
    const toShow = unseen.filter((n) => {
      if (n.authorRole === displayIdentity) return false; // skip own notifications
      if (isFamilyRole || isPatientRole) return visiblePatientIds.has(n.patientId);
      return true;
    });

    if (toShow.length === 0) return;

    const batch = toShow.slice(0, 3);
    setToasts((prev) => [...prev, ...batch]);
    batch.forEach((n) => {
      setTimeout(() => setToasts((prev) => prev.filter((t) => t.id !== n.id)), 6000);
    });
  }, [notifications, hydrated, displayIdentity, isFamilyRole, isPatientRole, patients]);

  // ================================================================
  // DERIVED VALUES
  // ================================================================

  const patientNotes = selectedPatient ? notesByPatient[selectedPatient.id] ?? [] : [];
  const sortedNotes = [...patientNotes].sort((a, b) => b.timestamp - a.timestamp);

  // All non-sensitive notes, newest-first — shown to family/resident via FamilyResidentView.
  const visibleNotes = [...patientNotes]
    .filter((n) => !n.sensitive)
    .sort((a, b) => b.timestamp - a.timestamp);

  // Only clinical documentation types feed into shift history —
  // family_update notes are a separate concern.
  const shiftGroups = groupNotesByShift(
    patientNotes.filter((n) => n.type === "text" || n.type === "image" || n.type === "voice")
  );


  const patientReports = selectedPatient ? reportsByPatient[selectedPatient.id] ?? [] : [];
  const sortedReports = [...patientReports].sort((a, b) => b.timestamp - a.timestamp);

  const patientReferrals = selectedPatient ? referralsByPatient[selectedPatient.id] ?? [] : [];
  const sortedReferrals = [...patientReferrals].sort((a, b) => b.timestamp - a.timestamp);

  const sortedVitals = [...patientVitalsHistory].sort((a, b) => b.timestamp - a.timestamp);

  // This patient's diagnoses. Active and Chronic sort first (what matters
  // most day-to-day), Resolved sinks to the bottom — within each group,
  // newest first.
  const patientDiagnoses = selectedPatient ? diagnosesByPatient[selectedPatient.id] ?? [] : [];
  const sortedDiagnoses = [...patientDiagnoses].sort((a, b) => {
    const rank = (s: ProblemStatus) => (s === "Resolved" ? 1 : 0);
    const rankDiff = rank(a.status) - rank(b.status);
    return rankDiff !== 0 ? rankDiff : b.timestamp - a.timestamp;
  });

  // This patient's discharge summary drafts, newest first.
  const patientDischargeSummaries = selectedPatient ? dischargeSummariesByPatient[selectedPatient.id] ?? [] : [];
  const sortedDischargeSummaries = [...patientDischargeSummaries].sort((a, b) => b.timestamp - a.timestamp);

  // ================================================================
  // ACTIONS — helpers
  // ================================================================

  // Sends an event to:
  //  1. Other tabs in the same browser (BroadcastChannel — instant, no round trip)
  //  2. All connected clients on any device (SSE via /api/broadcast — cross-device)
  // The event carries the full data payload so SSE receivers don't need
  // to access the sender's localStorage (which is browser-local).
  function broadcast(event: LiveEvent) {
    bcRef.current?.postMessage(event);
    fetch("/api/broadcast", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(event),
    }).catch(() => {/* fire-and-forget — SSE is best-effort */});
  }

  // ================================================================
  // ACTIONS — Family chat
  // ================================================================

  function addChatMessage(content: string) {
    if (!selectedPatient) return;
    const msg: ChatMessage = {
      id: crypto.randomUUID(),
      patientId: selectedPatient.id,
      authorName: staffName,
      authorRole: displayIdentity,
      content,
      timestamp: Date.now(),
    };
    const updatedChat = {
      ...chatMessagesByPatient,
      [selectedPatient.id]: [...(chatMessagesByPatient[selectedPatient.id] ?? []), msg],
    };
    setChatMessagesByPatient(updatedChat);
    if (org) saveToStorage(`tracewell:${org}:chat`, updatedChat);
    broadcast({
      type: "chat", org,
      patientId: selectedPatient.id, patientName: selectedPatient.name,
      authorName: staffName, authorRole: displayIdentity,
      preview: content.slice(0, 100), timestamp: msg.timestamp,
      message: msg,
    });
  }

  // ================================================================
  // ACTIONS — Wellbeing
  // ================================================================

  function openForm() {
    if (!selectedPatient) return;
    setDraft(latestCheck ?? selectedPatient.baseline);
    setFormOpen(true);
  }

  // Appends a new entry to the patient's history array rather than
  // overwriting a single stored object — this is what preserves history
  // for HealthTrendChart to plot.
  function saveWellbeingCheck() {
    if (!selectedPatient) return;
    const newEntry: WellbeingEntry = { ...draft, timestamp: Date.now() };
    const updatedWellbeing = {
      ...wellbeingByPatient,
      [selectedPatient.id]: [...(wellbeingByPatient[selectedPatient.id] ?? []), newEntry],
    };
    setWellbeingByPatient(updatedWellbeing);
    // Save before broadcasting so receiving tabs read fresh data.
    if (org) saveToStorage(`tracewell:${org}:wellbeing`, updatedWellbeing);
    setFormOpen(false);

    // Detect concerning drops against the patient's baseline.
    const bl = selectedPatient.baseline;
    const METRIC_LABELS: { key: keyof Baseline; label: string }[] = [
      { key: "mood",      label: "Mood" },
      { key: "appetite",  label: "Appetite" },
      { key: "mobility",  label: "Mobility" },
      { key: "sleep",     label: "Sleep" },
    ];
    const concerns = METRIC_LABELS
      .map(({ key, label }) => ({ label, current: draft[key], baseline: bl[key], delta: bl[key] - draft[key] }))
      .filter(({ delta }) => delta >= 1);

    const isConcern = concerns.length > 0;
    const wellbeingNotifId = isConcern ? crypto.randomUUID() : undefined;

    // Broadcast every wellbeing check so family/patient tabs update instantly.
    broadcast({
      type: "wellbeing", org,
      notifId: wellbeingNotifId,
      patientId: selectedPatient.id, patientName: selectedPatient.name,
      authorRole: displayIdentity, isConcern, timestamp: newEntry.timestamp,
      entry: newEntry,
    });

    if (isConcern) {
      setWellbeingAlert({ patientName: selectedPatient.name, concerns });
      const notif: InAppNotification = {
        id: wellbeingNotifId!,
        patientId: selectedPatient.id,
        patientName: selectedPatient.name,
        message: `Wellbeing concern flagged for ${selectedPatient.name}: ${concerns.map((c) => `${c.label} ${c.current}/10 (baseline ${c.baseline})`).join(", ")}`,
        type: "wellbeing_concern",
        authorRole: displayIdentity,
        timestamp: Date.now(),
        read: false,
      };
      seenNotifIds.current.add(notif.id);
      const updatedNotifs = [notif, ...notifications];
      setNotifications(updatedNotifs);
      if (org) saveToStorage(`tracewell:${org}:notifications`, updatedNotifs);
    }
  }

  function cancelForm() {
    setFormOpen(false);
  }

  // ================================================================
  // ACTIONS — Care notes (text / photo / voice)
  // ================================================================

  async function handleImageSelect(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    const dataUrl = await fileToDataUrl(file);
    setPendingImage(dataUrl);
  }

  function startVoice() {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const SpeechRecognitionClass = (window as any).webkitSpeechRecognition || (window as any).SpeechRecognition;
    if (!SpeechRecognitionClass) {
      setVoiceError("Voice input isn't supported in this browser — try Chrome, or type the note instead.");
      return;
    }
    setVoiceError("");
    setVoiceReviewMode(false);

    // Request mic with noise-suppression constraints to activate hardware-level
    // noise reduction before the speech API opens the audio device.
    navigator.mediaDevices?.getUserMedia({
      audio: { noiseSuppression: true, echoCancellation: true, autoGainControl: true },
    }).then((s) => s.getTracks().forEach((t) => t.stop())).catch(() => {});

    const recognition = new SpeechRecognitionClass();
    recognition.continuous = true;
    recognition.interimResults = true;
    recognition.lang = "en-AU";
    recognition.onresult = (event: any) => { // eslint-disable-line @typescript-eslint/no-explicit-any
      let transcript = "";
      for (let i = 0; i < event.results.length; i++) transcript += event.results[i][0].transcript;
      setNoteDraft(transcript);
    };
    // When recording ends, enter review mode so the user can verify and amend
    // the transcript before it's saved as a note.
    recognition.onend = () => {
      setRecording(false);
      setVoiceReviewMode(true);
    };
    // Every possible failure reason gets a specific, readable message
    // instead of failing silently.
    recognition.onerror = (event: any) => { // eslint-disable-line @typescript-eslint/no-explicit-any
      setRecording(false);
      const messages: Record<string, string> = {
        "not-allowed": "Microphone access was blocked. Check your browser's site permissions and allow microphone access, then try again.",
        "audio-capture": "No microphone was found. Check one is connected, then try again.",
        "no-speech": "No speech was detected — try speaking closer to the microphone.",
        network: "A network error interrupted voice input. Try again.",
      };
      setVoiceError(messages[event.error] || `Voice input stopped unexpectedly (${event.error}).`);
    };
    try {
      recognitionRef.current = recognition;
      recognition.start();
      setRecording(true);
    } catch {
      setVoiceError("Couldn't start voice input. Type the note instead.");
    }
  }

  function stopVoice() {
    recognitionRef.current?.stop();
    setRecording(false);
  }

  // ================================================================
  // ACTIONS — Camera (take photo)
  // ================================================================

  async function openCamera() {
    setCameraMenuOpen(false);
    if (!navigator.mediaDevices?.getUserMedia) {
      setCaptionError("Camera not available in this browser. Use 'Upload' instead.");
      return;
    }
    try {
      // Prefer back camera on mobile; fall back to any camera on desktop.
      let stream: MediaStream;
      try {
        stream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: "environment", width: { ideal: 1280 }, height: { ideal: 720 } },
        });
      } catch {
        stream = await navigator.mediaDevices.getUserMedia({ video: true });
      }
      cameraStreamRef.current = stream;
      setCameraOpen(true);
      // srcObject is assigned in the useEffect([cameraOpen]) below, which fires
      // after React has committed the <video> element to the DOM.
    } catch {
      setCaptionError("Camera access was denied. Tap 'Upload' to choose a photo from your device instead.");
    }
  }

  function capturePhoto() {
    const video = videoRef.current;
    // readyState < 2 means the video hasn't decoded a frame yet — drawing it
    // would produce a blank black canvas.
    if (!video || video.readyState < 2 || !video.videoWidth) return;
    const canvas = document.createElement("canvas");
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    canvas.getContext("2d")?.drawImage(video, 0, 0);
    const dataUrl = canvas.toDataURL("image/jpeg", 0.85);
    setPendingImage(dataUrl);
    closeCamera();
  }

  function closeCamera() {
    cameraStreamRef.current?.getTracks().forEach((t) => t.stop());
    cameraStreamRef.current = null;
    setCameraOpen(false);
  }

  async function addNote() {
    if (!selectedPatient) return;
    if (!noteDraft.trim() && !pendingImage) return;

    let content = noteDraft.trim();

    if (pendingImage) {
      setCaptioning(true);
      setCaptionError("");
      try {
        const { mimeType, base64 } = parseDataUrl(pendingImage);
        const response = await fetch("/api/caption", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ imageBase64: base64, mimeType }),
        });
        const data = await parseJsonResponse(response, "caption");
        if (response.ok && data.caption) {
          content = content ? `${content} — AI description: ${data.caption}` : data.caption;
        } else {
          setCaptionError(data.error || "Couldn't generate an AI description for this photo.");
          content = content || "Photo attached to care record. (AI description unavailable.)";
        }
      } catch (err) {
        console.error("Photo captioning error:", err);
        setCaptionError(err instanceof Error ? err.message : "Couldn't reach the server to describe this photo.");
        content = content || "Photo attached to care record. (AI description unavailable.)";
      } finally {
        setCaptioning(false);
      }
    }

    const newNote: CareNote = {
      id: crypto.randomUUID(),
      content,
      authorRole: displayIdentity,
      type: pendingImage ? "image" : recording ? "voice" : "text",
      timestamp: Date.now(),
      imageUrl: pendingImage ?? undefined,
    };

    const updatedNotes = {
      ...notesByPatient,
      [selectedPatient.id]: [...(notesByPatient[selectedPatient.id] ?? []), newNote],
    };
    setNotesByPatient(updatedNotes);
    // Save before broadcasting so the receiving tab reads fresh notes.
    if (org) saveToStorage(`tracewell:${org}:notes`, updatedNotes);

    // Broadcast immediately so family/patient tabs pop up a toast in real time.
    const noteNotifId = crypto.randomUUID();
    broadcast({
      type: "care_note", org, notifId: noteNotifId,
      patientId: selectedPatient.id, patientName: selectedPatient.name,
      authorRole: displayIdentity, preview: newNote.content.slice(0, 100),
      noteType: newNote.type, timestamp: newNote.timestamp,
      note: newNote,
    });

    // Also persist the notification for the bell panel history.
    const notif: InAppNotification = {
      id: noteNotifId,
      patientId: selectedPatient.id,
      patientName: selectedPatient.name,
      message: `New update for ${selectedPatient.name} from ${displayIdentity}: "${newNote.content.slice(0, 80)}${newNote.content.length > 80 ? "…" : ""}"`,
      type: "care_update",
      authorRole: displayIdentity,
      timestamp: Date.now(),
      read: false,
    };
    seenNotifIds.current.add(notif.id);
    const updatedNotifs = [notif, ...notifications];
    setNotifications(updatedNotifs);
    if (org) saveToStorage(`tracewell:${org}:notifications`, updatedNotifs);

    setNoteDraft("");
    setPendingImage(null);
    setVoiceReviewMode(false);
    if (recording) stopVoice();
  }

  function deleteNote(noteId: string) {
    if (!selectedPatient) return;
    const confirmed = window.confirm("Delete this note? This cannot be undone.");
    if (!confirmed) return;
    setNotesByPatient((prev) => ({
      ...prev,
      [selectedPatient.id]: (prev[selectedPatient.id] ?? []).filter((n) => n.id !== noteId),
    }));
  }

  // ================================================================
  // ACTIONS — Vital Signs
  // ================================================================

  // Converts the vitals form's text inputs into a saved reading.
  // parseFloat on an empty string returns NaN, so each field checks for
  // that and stores null instead — this is what makes every vital
  // genuinely optional rather than defaulting to a misleading 0.
  function saveVitals() {
    if (!selectedPatient) return;

    const parseOrNull = (value: string): number | null => {
      const parsed = parseFloat(value);
      return isNaN(parsed) ? null : parsed;
    };

    const newVitals: VitalSigns = {
      id: crypto.randomUUID(),
      systolic: parseOrNull(vitalsSystolic),
      diastolic: parseOrNull(vitalsDiastolic),
      heartRate: parseOrNull(vitalsHeartRate),
      temperature: parseOrNull(vitalsTemperature),
      oxygenSaturation: parseOrNull(vitalsOxygenSaturation),
      respiratoryRate: parseOrNull(vitalsRespiratoryRate),
      authorRole: displayIdentity,
      timestamp: Date.now(),
    };

    // Guard: don't save a completely empty reading (all fields null) —
    // that would just clutter the history with a useless entry.
    const hasAnyValue = [
      newVitals.systolic, newVitals.diastolic, newVitals.heartRate,
      newVitals.temperature, newVitals.oxygenSaturation, newVitals.respiratoryRate,
    ].some((v) => v !== null);
    if (!hasAnyValue) return;

    const updatedVitals = {
      ...vitalsByPatient,
      [selectedPatient.id]: [...(vitalsByPatient[selectedPatient.id] ?? []), newVitals],
    };
    setVitalsByPatient(updatedVitals);
    if (org) saveToStorage(`tracewell:${org}:vitals`, updatedVitals);
    broadcast({
      type: "vitals", org,
      patientId: selectedPatient.id, patientName: selectedPatient.name,
      authorRole: displayIdentity, timestamp: newVitals.timestamp,
      vitals: newVitals,
    });

    setVitalsSystolic("");
    setVitalsDiastolic("");
    setVitalsHeartRate("");
    setVitalsTemperature("");
    setVitalsOxygenSaturation("");
    setVitalsRespiratoryRate("");
    setVitalsFormOpen(false);
  }

  function deleteVitals(vitalsId: string) {
    if (!selectedPatient) return;
    const confirmed = window.confirm("Delete this vitals reading? This cannot be undone.");
    if (!confirmed) return;
    setVitalsByPatient((prev) => ({
      ...prev,
      [selectedPatient.id]: (prev[selectedPatient.id] ?? []).filter((v) => v.id !== vitalsId),
    }));
  }

  // ================================================================
  // ACTIONS — AI features (each calls its own secure /api route so
  // GEMINI_API_KEY stays server-side, never exposed to the browser)
  // ================================================================

  async function generateHandover() {
    if (!selectedPatient) return;
    setHandoverLoading(true);
    setHandoverError("");
    setHandoverText(null);
    try {
      const response = await fetch("/api/handover", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          patientName: selectedPatient.name,
          age: selectedPatient.age,
          profileContext: personContextBlock(selectedPatient, latestVitals, patientDiagnoses),
          notes: patientNotes.map((n) => ({ authorRole: n.authorRole, content: n.content, type: n.type })),
        }),
      });
      const data = await parseJsonResponse(response, "handover");
      if (!response.ok) {
        setHandoverError(data.error || "Something went wrong generating the handover.");
        return;
      }
      setHandoverText(data.summary);
    } catch (err) {
      setHandoverError(err instanceof Error ? err.message : "Couldn't reach the server. Check your connection and try again.");
    } finally {
      setHandoverLoading(false);
    }
  }

  async function askQuestion() {
    if (!selectedPatient || !qaQuestion.trim()) return;
    setQaLoading(true);
    setQaError("");
    setQaAnswer(null);
    try {
      const response = await fetch("/api/query", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          patientName: selectedPatient.name,
          age: selectedPatient.age,
          profileContext: personContextBlock(selectedPatient, latestVitals, patientDiagnoses),
          notes: patientNotes.map((n) => ({ authorRole: n.authorRole, content: n.content, type: n.type })),
          question: qaQuestion.trim(),
        }),
      });
      const data = await parseJsonResponse(response, "query");
      if (!response.ok) {
        setQaError(data.error || "Something went wrong answering the question.");
        return;
      }
      setQaAnswer(data.answer);
    } catch (err) {
      setQaError(err instanceof Error ? err.message : "Couldn't reach the server. Check your connection and try again.");
    } finally {
      setQaLoading(false);
    }
  }

  // Unlike generateHandover/askQuestion, this doesn't hold its result in a
  // separate "result" state — it's saved directly into notesByPatient as a
  // family_update-type note, since a family update is meant to be a
  // permanent, shareable record entry, not a temporary on-screen result.
  async function generateFamilyUpdate() {
    if (!selectedPatient) return;

    setFamilyUpdateLoading(true);
    setFamilyUpdateError("");

    try {
      const response = await fetch("/api/family-update", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          patientName: selectedPatient.name,
          profileContext: personContextBlock(selectedPatient, latestVitals, patientDiagnoses),
          notes: patientNotes.map((n) => ({ authorRole: n.authorRole, content: n.content, type: n.type })),
        }),
      });

      const data = await parseJsonResponse(response, "family-update");

      if (!response.ok) {
        setFamilyUpdateError(data.error || "Something went wrong generating the family update.");
        return;
      }

      const newNote: CareNote = {
        id: crypto.randomUUID(),
        content: data.update,
        authorRole: "TraceWell AI",
        type: "family_update",
        timestamp: Date.now(),
      };

      setNotesByPatient((prev) => ({
        ...prev,
        [selectedPatient.id]: [...(prev[selectedPatient.id] ?? []), newNote],
      }));

      broadcast({
        type: "care_note", org: org!,
        notifId: `notif-${newNote.id}`,
        patientId: selectedPatient.id, patientName: selectedPatient.name,
        authorRole: "TraceWell AI", preview: newNote.content.slice(0, 100),
        noteType: "family_update", timestamp: newNote.timestamp,
        note: newNote,
      });
    } catch (err) {
      console.error("Family update error:", err);
      setFamilyUpdateError(
        err instanceof Error ? err.message : "Couldn't reach the server. Check your connection and try again."
      );
    } finally {
      setFamilyUpdateLoading(false);
    }
  }

// Generates BOTH discharge documents (GP + Patient) from one API call,
  // saving each as its own independently editable/finalizable entry. A
  // doctor might finalise the GP letter first and refine patient wording
  // separately, so keeping them as two separate entries — rather than one
  // combined record — matches how that review actually happens.
  async function generateDischargeSummary() {
    if (!selectedPatient) return;

    setDischargeLoading(true);
    setDischargeError("");

    try {
      const response = await fetch("/api/discharge-summary", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          patientName: selectedPatient.name,
          age: selectedPatient.age,
          profileContext: personContextBlock(selectedPatient, latestVitals, patientDiagnoses),
          notes: patientNotes.map((n) => ({ authorRole: n.authorRole, content: n.content, type: n.type })),
          vitalsHistory: formatVitalsHistoryForSummary(patientVitalsHistory),
          diagnosesSummary: formatDiagnosesForSummary(patientDiagnoses),
          medicationsSummary: formatMedicationsForSummary(selectedPatient.medications),
          reportsSummary: formatReportsForSummary(patientReports),
        }),
      });

      const data = await parseJsonResponse(response, "discharge-summary");

      if (!response.ok) {
        setDischargeError(data.error || "Something went wrong generating the discharge summary.");
        return;
      }

      const now = Date.now();

      // The AI never states exact vitals numbers (see route.ts) — this
      // builds the real, exact readings directly from stored data and
      // appends them to the AI's qualitative narrative, guaranteeing the
      // numbers on the final document are always exactly what's on record.
      const vitalsTable = buildVitalsTableText(patientVitalsHistory);
      const gpContent = `${data.gpSummary}\n\nRECORDED VITALS (verbatim, from patient record):\n${vitalsTable}`;

      const gpEntry: DischargeSummary = {
        id: crypto.randomUUID(),
        audience: "gp",
        content: gpContent,
        generatedBy: displayIdentity,
        timestamp: now,
        status: "draft",
      };

      const patientEntry: DischargeSummary = {
        id: crypto.randomUUID(),
        audience: "patient",
        content: data.patientSummary,
        generatedBy: displayIdentity,
        // Offset by 1ms so sorting newest-first gives a predictable,
        // consistent order (GP letter just above the patient summary)
        // rather than depending on exact tie-breaking behaviour when two
        // timestamps happen to be identical.
        timestamp: now + 1,
        status: "draft",
      };

      setDischargeSummariesByPatient((prev) => ({
        ...prev,
        [selectedPatient.id]: [...(prev[selectedPatient.id] ?? []), gpEntry, patientEntry],
      }));
    } catch (err) {
      console.error("Discharge summary error:", err);
      setDischargeError(
        err instanceof Error ? err.message : "Couldn't reach the server. Check your connection and try again."
      );
    } finally {
      setDischargeLoading(false);
    }
  }

  function deleteDischargeSummary(summaryId: string) {
    if (!selectedPatient) return;
    const confirmed = window.confirm("Delete this discharge summary draft? This cannot be undone.");
    if (!confirmed) return;
    setDischargeSummariesByPatient((prev) => ({
      ...prev,
      [selectedPatient.id]: (prev[selectedPatient.id] ?? []).filter((s) => s.id !== summaryId),
    }));
  }
  // Opens edit mode for a specific summary, seeding the textarea with its
  // current content so editing starts from what's actually saved.
  function startEditingSummary(summary: DischargeSummary) {
    setEditingSummaryId(summary.id);
    setEditSummaryContent(summary.content);
  }

  function cancelEditingSummary() {
    setEditingSummaryId(null);
    setEditSummaryContent("");
  }

  // Saves the doctor's edited text back onto the correct summary, and marks
  // it as `edited: true` — this is what lets the UI later show "edited by
  // staff" rather than presenting amended text as if it were the AI's
  // original, unmodified output.
  function saveEditedSummary(summaryId: string) {
    if (!selectedPatient) return;
    setDischargeSummariesByPatient((prev) => ({
      ...prev,
      [selectedPatient.id]: (prev[selectedPatient.id] ?? []).map((s) =>
        s.id === summaryId ? { ...s, content: editSummaryContent, edited: true } : s
      ),
    }));
    setEditingSummaryId(null);
    setEditSummaryContent("");
  }

  // Marks a summary as finalized — the doctor's formal sign-off that this
  // is now the official discharge plan. Requires confirmation since this
  // is a deliberate, meaningful action: once finalized, the content can no
  // longer be edited through this UI (see the render logic below, which
  // only shows Edit/Finalise buttons for status === "draft").
  function finalizeSummary(summaryId: string) {
    if (!selectedPatient) return;
    const confirmed = window.confirm(
      "Finalise this discharge summary as the official discharge plan? Once finalised, it can no longer be edited here."
    );
    if (!confirmed) return;
    setDischargeSummariesByPatient((prev) => ({
      ...prev,
      [selectedPatient.id]: (prev[selectedPatient.id] ?? []).map((s) =>
        s.id === summaryId
          ? { ...s, status: "finalized", finalizedBy: displayIdentity, finalizedAt: Date.now() }
          : s
      ),
    }));
  }

  // ================================================================
  // ACTIONS — Patient admission, profile, medications
  // ================================================================

  function admitPatient() {
    const name = newPatientName.trim();
    const ageNumber = parseInt(newPatientAge, 10);
    const room = newPatientRoom.trim();
    if (!name || !room || isNaN(ageNumber) || ageNumber <= 0) return;

    const newPatient: Patient = {
      id: crypto.randomUUID(),
      name,
      age: ageNumber,
      room,
      baseline: { mood: 5, appetite: 5, mobility: 5, sleep: 5 },
      profile: { ...EMPTY_PROFILE },
      medications: [],
    };

    setPatients((prev) => [...prev, newPatient]);
    setNewPatientName("");
    setNewPatientAge("");
    setNewPatientRoom("");
    setAddPatientOpen(false);
    setSelectedId(newPatient.id);
  }

  function openEditPatient() {
    if (!selectedPatient) return;
    setEditWard(selectedPatient.room);
    setEditAge(String(selectedPatient.age));
    setEditPatientOpen(true);
  }

  function saveEditPatient() {
    if (!selectedPatient) return;
    const ageNum = parseInt(editAge, 10);
    setPatients((prev) => prev.map((p) =>
      p.id === selectedPatient.id
        ? { ...p, room: editWard.trim() || p.room, age: isNaN(ageNum) || ageNum <= 0 ? p.age : ageNum }
        : p
    ));
    setEditPatientOpen(false);
  }

  function removePatient() {
    if (!selectedPatient) return;
    setPatients((prev) => prev.filter((p) => p.id !== selectedPatient.id));
    setSelectedId(null);
    setEditPatientOpen(false);
  }

  function openProfileEdit() {
    if (!selectedPatient) return;
    setProfileDraft(selectedPatient.profile);
    setProfileEditOpen(true);
  }

  function saveProfile() {
    if (!selectedPatient) return;
    setPatients((prev) => prev.map((p) => (p.id === selectedPatient.id ? { ...p, profile: profileDraft } : p)));
    setProfileEditOpen(false);
  }

  function addMedication() {
    if (!selectedPatient || !medName.trim()) return;
    const newMed: Medication = { id: crypto.randomUUID(), name: medName.trim(), dose: medDose.trim(), frequency: medFrequency.trim() };
    setPatients((prev) => prev.map((p) => (p.id === selectedPatient.id ? { ...p, medications: [...p.medications, newMed] } : p)));
    setMedName("");
    setMedDose("");
    setMedFrequency("");
    setMedFormOpen(false);
  }

  function removeMedication(medId: string) {
    if (!selectedPatient) return;
    setPatients((prev) => prev.map((p) => (p.id === selectedPatient.id ? { ...p, medications: p.medications.filter((m) => m.id !== medId) } : p)));
  }

  // ================================================================
  // ACTIONS — Reports & Imaging
  // No AI captioning here deliberately — a report's title/notes are
  // entered directly by staff, since auto-describing a scan/blood-test
  // image is a much higher-stakes AI task than describing a general care
  // photo, and is out of scope for this build.
  // ================================================================

  async function handleReportImageSelect(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    const dataUrl = await fileToDataUrl(file);
    setReportPendingImage(dataUrl);
  }

  function addReport() {
    if (!selectedPatient || !reportTitle.trim()) return;

    const newReport: MedicalReport = {
      id: crypto.randomUUID(),
      reportType,
      title: reportTitle.trim(),
      notes: reportNotes.trim(),
      imageUrl: reportPendingImage ?? undefined,
      authorRole: displayIdentity,
      timestamp: Date.now(),
    };

    setReportsByPatient((prev) => ({
      ...prev,
      [selectedPatient.id]: [...(prev[selectedPatient.id] ?? []), newReport],
    }));

    setReportType("Blood Test");
    setReportTitle("");
    setReportNotes("");
    setReportPendingImage(null);
    setReportFormOpen(false);
  }

  function deleteReport(reportId: string) {
    if (!selectedPatient) return;
    const confirmed = window.confirm("Delete this report? This cannot be undone.");
    if (!confirmed) return;
    setReportsByPatient((prev) => ({
      ...prev,
      [selectedPatient.id]: (prev[selectedPatient.id] ?? []).filter((r) => r.id !== reportId),
    }));
  }

  function reportTypeIcon(type: ReportType): string {
    const icons: Record<ReportType, string> = {
      "Blood Test": "🩸",
      "CT Scan": "🖥",
      "MRI": "🧲",
      "X-Ray": "🦴",
      "Other": "📄",
    };
    return icons[type];
  }

  // ================================================================
  // ACTIONS — Referrals & Collaboration
  // Doctor-only creation by convention — the "+ New referral" button is
  // only rendered when isDoctorRole is true. Any staff role can
  // acknowledge a referral, since the point is confirming someone on the
  // receiving end has actually seen it, not restricting who can respond.
  // ================================================================

  function addReferral() {
    if (!selectedPatient || referralRecipients.length === 0 || !referralSubject.trim()) return;

    const newReferral: ReferralNote = {
      id: crypto.randomUUID(),
      shareCode: referralType === "internal" ? generateReferralCode() : undefined,
      fromName: displayIdentity,
      toRecipients: referralRecipients,
      referralType,
      subject: referralSubject.trim(),
      message: referralMessage.trim(),
      timestamp: Date.now(),
      acknowledged: false,
    };

    const updatedReferrals = {
      ...referralsByPatient,
      [selectedPatient.id]: [...(referralsByPatient[selectedPatient.id] ?? []), newReferral],
    };
    setReferralsByPatient(updatedReferrals);
    if (org) saveToStorage(`tracewell:${org}:referrals`, updatedReferrals);

    const referralNotifId = crypto.randomUUID();
    const recipientStr = referralRecipients.join(", ");
    broadcast({
      type: "referral", org, notifId: referralNotifId,
      patientId: selectedPatient.id, patientName: selectedPatient.name,
      authorRole: displayIdentity, toRecipients: newReferral.toRecipients,
      subject: newReferral.subject, timestamp: newReferral.timestamp,
      referral: newReferral,
    });
    const referralNotif: InAppNotification = {
      id: referralNotifId,
      patientId: selectedPatient.id,
      patientName: selectedPatient.name,
      message: `New referral for ${selectedPatient.name} from ${displayIdentity} to ${recipientStr}: "${newReferral.subject}"`,
      type: "care_update",
      authorRole: displayIdentity,
      timestamp: newReferral.timestamp,
      read: false,
    };
    seenNotifIds.current.add(referralNotif.id);
    const updatedNotifs = [referralNotif, ...notifications];
    setNotifications(updatedNotifs);
    if (org) saveToStorage(`tracewell:${org}:notifications`, updatedNotifs);

    setReferralRecipients([]);
    setReferralRecipientInput("");
    setReferralType("internal");
    setReferralSubject("");
    setReferralMessage("");
    setReferralFormOpen(false);
  }

  function acknowledgeReferral(referralId: string) {
    if (!selectedPatient) return;
    setReferralsByPatient((prev) => ({
      ...prev,
      [selectedPatient.id]: (prev[selectedPatient.id] ?? []).map((r) =>
        r.id === referralId
          ? { ...r, acknowledged: true, acknowledgedBy: displayIdentity, acknowledgedAt: Date.now() }
          : r
      ),
    }));
  }

  function deleteReferral(referralId: string) {
    if (!selectedPatient) return;
    const confirmed = window.confirm("Delete this referral note? This cannot be undone.");
    if (!confirmed) return;
    setReferralsByPatient((prev) => ({
      ...prev,
      [selectedPatient.id]: (prev[selectedPatient.id] ?? []).filter((r) => r.id !== referralId),
    }));
  }

  // ================================================================
  // ACTIONS — Problem List / Diagnoses
  // A Resolved diagnosis is never deleted from the record — only
  // re-labelled via updateDiagnosisStatus — preserving the full clinical
  // history rather than erasing it. Deletion remains available separately
  // for genuine data-entry mistakes.
  // ================================================================

  function addDiagnosis() {
    if (!selectedPatient || !diagnosisCondition.trim()) return;

    const newDiagnosis: Diagnosis = {
      id: crypto.randomUUID(),
      condition: diagnosisCondition.trim(),
      status: diagnosisStatus,
      notes: diagnosisNotes.trim(),
      authorRole: displayIdentity,
      timestamp: Date.now(),
    };

    setDiagnosesByPatient((prev) => ({
      ...prev,
      [selectedPatient.id]: [...(prev[selectedPatient.id] ?? []), newDiagnosis],
    }));

    // Persist to DB so other clinical staff see it on load
    fetch("/api/diagnoses", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ...newDiagnosis, patientProfileId: selectedPatient.id }),
    }).catch(() => {});

    setDiagnosisCondition("");
    setDiagnosisStatus("Active");
    setDiagnosisNotes("");
    setDiagnosisFormOpen(false);
  }

  function updateDiagnosisStatus(diagnosisId: string, newStatus: ProblemStatus) {
    if (!selectedPatient) return;
    setDiagnosesByPatient((prev) => ({
      ...prev,
      [selectedPatient.id]: (prev[selectedPatient.id] ?? []).map((d) =>
        d.id === diagnosisId ? { ...d, status: newStatus } : d
      ),
    }));
  }

  function deleteDiagnosis(diagnosisId: string) {
    if (!selectedPatient) return;
    const confirmed = window.confirm("Delete this diagnosis entry? This cannot be undone.");
    if (!confirmed) return;
    setDiagnosesByPatient((prev) => ({
      ...prev,
      [selectedPatient.id]: (prev[selectedPatient.id] ?? []).filter((d) => d.id !== diagnosisId),
    }));
  }

  function statusBadgeStyle(status: ProblemStatus): string {
    if (status === "Active") return "bg-amber-100 text-amber-800";
    if (status === "Chronic") return "bg-secondary text-ink";
    return "bg-teal-soft text-teal";
  }

  // Human-readable label and colour styling for the audience badge shown
  // on each discharge summary card — makes it immediately visually clear
  // which document is the clinical GP letter versus the patient-facing one.
  function audienceLabel(audience: DischargeAudience): string {
    return audience === "gp" ? "GP Summary" : "Patient Summary";
  }

  function audienceBadgeStyle(audience: DischargeAudience): string {
    return audience === "gp" ? "bg-secondary text-ink" : "bg-teal-soft text-teal";
  }

  function handleSignOut() {
    signOut({ callbackUrl: "/" });
  }

  // ================================================================
  // RENDER
  // ================================================================

  return (
    <div className="min-h-screen bg-background">
      <header className="sticky top-0 z-50 border-b border-border bg-background/80 backdrop-blur">
        <div className="container-page flex h-16 items-center justify-between">
          <div className="flex items-center gap-2.5">
            <Image
              src="/TraceWell_Logo_nobg.png"
              alt="TraceWell logo"
              width={32}
              height={32}
              className="h-8 w-8 object-contain"
            />
            <div>
              <div className="font-[var(--font-display)] text-lg text-ink">TraceWell</div>
              <div className="text-xs text-ink-soft">{facilityName}</div>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <span className="chip">{displayIdentity}</span>

            {/* Notification bell */}
            <div className="relative">
              <button
                onClick={() => {
                  setNotifPanelOpen((o) => !o);
                  // Mark all as read when panel opens
                  if (!notifPanelOpen) {
                    setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
                  }
                }}
                className="relative rounded-full p-2 text-ink-soft hover:bg-secondary"
                aria-label="Notifications"
              >
                <Bell className="h-5 w-5" />
                {notifications.filter((n) => !n.read).length > 0 && (
                  <span className="absolute right-1 top-1 flex h-4 w-4 items-center justify-center rounded-full bg-destructive text-[10px] font-bold text-white">
                    {Math.min(notifications.filter((n) => !n.read).length, 9)}
                  </span>
                )}
              </button>

              {notifPanelOpen && (
                <div className="absolute right-0 top-full z-50 mt-2 w-96 rounded-2xl border border-border bg-card shadow-lift">
                  <div className="flex items-center justify-between border-b border-border px-4 py-3">
                    <span className="text-sm font-semibold text-ink">Notifications</span>
                    <button onClick={() => setNotifPanelOpen(false)} className="text-ink-soft hover:text-ink">
                      <X className="h-4 w-4" />
                    </button>
                  </div>
                  <div className="max-h-80 overflow-y-auto">
                    {notifications.length === 0 ? (
                      <div className="px-4 py-6 text-center text-sm text-ink-soft">No notifications yet.</div>
                    ) : (
                      // For family/patient roles, only show notifications for their visible patients.
                      (() => {
                        const visiblePatientIds = new Set(patients.map((p) => p.id));
                        const filtered = (isFamilyRole || isPatientRole)
                          ? notifications.filter((n) => visiblePatientIds.has(n.patientId))
                          : notifications;
                        if (filtered.length === 0) {
                          return <div className="px-4 py-6 text-center text-sm text-ink-soft">No notifications for your patients.</div>;
                        }
                        return filtered.slice(0, 30).map((n) => (
                          <div key={n.id} className={`border-b border-border px-4 py-3 last:border-0 ${n.read ? "opacity-60" : ""}`}>
                            <div className="flex items-start gap-2">
                              <span className={`mt-0.5 shrink-0 rounded-full p-1 ${n.type === "wellbeing_concern" ? "bg-amber-100 text-amber-700" : "bg-teal-soft text-teal"}`}>
                                {n.type === "wellbeing_concern" ? <AlertTriangle className="h-3 w-3" /> : <Bell className="h-3 w-3" />}
                              </span>
                              <div className="min-w-0">
                                <p className="text-xs text-ink leading-snug">{n.message}</p>
                                <p className="mt-0.5 text-[10px] text-ink-soft">{new Date(n.timestamp).toLocaleString()}</p>
                              </div>
                            </div>
                          </div>
                        ));
                      })()
                    )}
                  </div>
                  {notifications.length > 0 && (
                    <div className="border-t border-border px-4 py-2">
                      <button
                        onClick={() => setNotifications([])}
                        className="text-xs text-ink-soft hover:text-ink"
                      >
                        Clear all
                      </button>
                    </div>
                  )}
                </div>
              )}
            </div>

            <button onClick={handleSignOut} className="rounded-full px-4 py-2 text-sm text-ink-soft hover:bg-secondary">
              Sign out
            </button>
          </div>
        </div>
      </header>

      {/* Manager dashboard — replaces the entire sidebar + detail layout */}
      {isManagerRole ? (
        <ManagerView
          patients={patients}
          notesByPatient={notesByPatient}
          wellbeingByPatient={wellbeingByPatient}
          vitalsByPatient={vitalsByPatient}
          diagnosesByPatient={diagnosesByPatient}
          org={org}
        />
      ) : isPatientRole ? (
        /* Patient view — no sidebar, shows only their own record full-width */
        <div className="container-page py-6">
          {selectedPatient ? (
            <FamilyResidentView
              patient={selectedPatient}
              personLabelSingular={personLabelSingular}
              visibleNotes={visibleNotes}
              wellbeingHistory={patientWellbeingHistory}
              chatMessages={chatMessagesByPatient[selectedPatient.id] ?? []}
              currentUserName={staffName}
              currentUserRole={displayIdentity}
              onSendChatMessage={addChatMessage}
              showChat={false}
            />
          ) : (
            <div className="flex h-40 items-center justify-center text-sm text-ink-soft">
              Loading your record...
            </div>
          )}
        </div>
      ) : (
      <div className="container-page flex gap-6 py-6">
        <aside className="w-64 shrink-0 rounded-2xl border border-border bg-card p-4 shadow-soft">
          <div className="mb-3 flex items-center justify-between">
            <span className="eyebrow">{personLabel}</span>
            {!isFamilyRole && (
              <div className="flex items-center gap-2">
                {selectedPatient && (
                  <button onClick={openEditPatient} className="text-xs font-medium text-ink-soft hover:underline">
                    Edit
                  </button>
                )}
                <button onClick={() => setAddPatientOpen(true)} className="text-xs font-medium text-teal hover:underline">
                  + Add
                </button>
              </div>
            )}
          </div>
          <div className="flex flex-col gap-1">
            {patients.map((p) => {
              const isSelected = p.id === selectedId;
              const latestNote = [...(notesByPatient[p.id] ?? [])].sort((a, b) => b.timestamp - a.timestamp)[0];
              return (
                <button
                  key={p.id}
                  onClick={() => {
                    setSelectedId(p.id);
                    setFormOpen(false);
                    setPendingImage(null);
                    if (recording) stopVoice();
                    setHandoverText(null);
                    setHandoverError("");
                    setCaptionError("");
                    setQaAnswer(null);
                    setQaError("");
                    setQaQuestion("");
                    setProfileEditOpen(false);
                    setMedFormOpen(false);
                    setFamilyUpdateError("");
                    setExpandedShiftKey(null);
                    setReportFormOpen(false);
                    setReportPendingImage(null);
                    setReferralFormOpen(false);
                    setVitalsFormOpen(false);
                    setDiagnosisFormOpen(false);
                    setDischargeError("");
                    setEditingSummaryId(null);
                    setEditSummaryContent("");
                    setStaffChatDraft("");
                  }}
                  className={`rounded-lg px-3 py-2 text-left transition-colors ${isSelected ? "bg-teal-soft" : "hover:bg-secondary"}`}
                >
                  <div className="text-sm font-medium text-ink">{p.name}</div>
                  <div className="text-xs text-ink-soft">{p.room} · Age {p.age}</div>
                  {latestNote && (
                    <div className="mt-0.5 text-[11px] text-muted-foreground">
                      Last logged {timeAgo(latestNote.timestamp)}
                    </div>
                  )}
                </button>
              );
            })}
          </div>
        </aside>

        <main className="flex-1 rounded-2xl border border-border bg-card p-6 shadow-soft">
          {selectedPatient ? (
            isFamilyRole ? (
              <FamilyResidentView
                patient={selectedPatient}
                personLabelSingular={personLabelSingular}
                visibleNotes={visibleNotes}
                wellbeingHistory={patientWellbeingHistory}
                chatMessages={chatMessagesByPatient[selectedPatient.id] ?? []}
                currentUserName={staffName}
                currentUserRole={displayIdentity}
                onSendChatMessage={addChatMessage}
              />
            ) : (
              <div>
                <h1 className="text-2xl">{selectedPatient.name}</h1>
                <p className="mt-1 text-ink-soft">{selectedPatient.room} · Age {selectedPatient.age}</p>

                <div className="mt-6 rounded-xl border border-border bg-background p-4">
                  <div className="mb-3 flex items-center justify-between">
                    <span className="text-sm font-semibold text-ink">Vital signs</span>
                    {!vitalsFormOpen && (
                      <button onClick={() => setVitalsFormOpen(true)} className="text-xs font-medium text-teal hover:underline">
                        + Record reading
                      </button>
                    )}
                  </div>

                  {vitalsFormOpen && (
                    <div className="mb-4 flex flex-col gap-3 rounded-lg border border-border p-3">
                      <p className="text-xs text-muted-foreground">
                        Leave any field blank if it wasn&apos;t measured this round.
                      </p>
                      <div className="grid grid-cols-2 gap-3">
                        <div className="flex flex-col gap-1">
                          <label className="text-xs text-muted-foreground">Systolic BP (mmHg)</label>
                          <input value={vitalsSystolic} onChange={(e) => setVitalsSystolic(e.target.value)} type="number" placeholder="e.g. 120" className="rounded-lg border border-border px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-ring" />
                        </div>
                        <div className="flex flex-col gap-1">
                          <label className="text-xs text-muted-foreground">Diastolic BP (mmHg)</label>
                          <input value={vitalsDiastolic} onChange={(e) => setVitalsDiastolic(e.target.value)} type="number" placeholder="e.g. 80" className="rounded-lg border border-border px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-ring" />
                        </div>
                        <div className="flex flex-col gap-1">
                          <label className="text-xs text-muted-foreground">Heart rate (bpm)</label>
                          <input value={vitalsHeartRate} onChange={(e) => setVitalsHeartRate(e.target.value)} type="number" placeholder="e.g. 72" className="rounded-lg border border-border px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-ring" />
                        </div>
                        <div className="flex flex-col gap-1">
                          <label className="text-xs text-muted-foreground">Temperature (°C)</label>
                          <input value={vitalsTemperature} onChange={(e) => setVitalsTemperature(e.target.value)} type="number" step="0.1" placeholder="e.g. 36.8" className="rounded-lg border border-border px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-ring" />
                        </div>
                        <div className="flex flex-col gap-1">
                          <label className="text-xs text-muted-foreground">Oxygen saturation (%)</label>
                          <input value={vitalsOxygenSaturation} onChange={(e) => setVitalsOxygenSaturation(e.target.value)} type="number" placeholder="e.g. 98" className="rounded-lg border border-border px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-ring" />
                        </div>
                        <div className="flex flex-col gap-1">
                          <label className="text-xs text-muted-foreground">Respiratory rate (/min)</label>
                          <input value={vitalsRespiratoryRate} onChange={(e) => setVitalsRespiratoryRate(e.target.value)} type="number" placeholder="e.g. 16" className="rounded-lg border border-border px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-ring" />
                        </div>
                      </div>
                      <div className="flex gap-2">
                        <button onClick={saveVitals} className="rounded-full bg-primary px-4 py-2 text-sm font-medium text-primary-foreground">Save reading</button>
                        <button onClick={() => setVitalsFormOpen(false)} className="rounded-full px-4 py-2 text-sm text-ink-soft hover:bg-secondary">Cancel</button>
                      </div>
                    </div>
                  )}

                  {latestVitals ? (
                    <div>
                      <div className="mb-2 text-xs font-medium uppercase tracking-wide text-muted-foreground">
                        Latest reading — {formatDateTime(latestVitals.timestamp)}
                      </div>
                      <div className="grid grid-cols-2 gap-x-4 gap-y-1.5 sm:grid-cols-3">
                        {latestVitals.systolic !== null && latestVitals.diastolic !== null && (
                          <div className={`text-sm ${statusColor(vitalStatus("systolic", latestVitals.systolic))}`}>
                            BP {latestVitals.systolic}/{latestVitals.diastolic}
                          </div>
                        )}
                        {latestVitals.heartRate !== null && (
                          <div className={`text-sm ${statusColor(vitalStatus("heartRate", latestVitals.heartRate))}`}>
                            HR {latestVitals.heartRate} bpm
                          </div>
                        )}
                        {latestVitals.temperature !== null && (
                          <div className={`text-sm ${statusColor(vitalStatus("temperature", latestVitals.temperature))}`}>
                            Temp {latestVitals.temperature}°C
                          </div>
                        )}
                        {latestVitals.oxygenSaturation !== null && (
                          <div className={`text-sm ${statusColor(vitalStatus("oxygenSaturation", latestVitals.oxygenSaturation))}`}>
                            SpO2 {latestVitals.oxygenSaturation}%
                          </div>
                        )}
                        {latestVitals.respiratoryRate !== null && (
                          <div className={`text-sm ${statusColor(vitalStatus("respiratoryRate", latestVitals.respiratoryRate))}`}>
                            RR {latestVitals.respiratoryRate}/min
                          </div>
                        )}
                      </div>

                      {sortedVitals.length > 1 && (
                        <details className="mt-3">
                          <summary className="cursor-pointer text-xs font-medium text-teal">
                            View {sortedVitals.length - 1} earlier reading{sortedVitals.length - 1 !== 1 ? "s" : ""}
                          </summary>
                          <div className="mt-2 flex flex-col gap-2">
                            {sortedVitals.slice(1).map((v) => (
                              <div key={v.id} className="flex items-center justify-between rounded-lg bg-secondary px-3 py-2">
                                <div>
                                  <div className="text-xs text-muted-foreground">{formatDateTime(v.timestamp)} · {v.authorRole}</div>
                                  <div className="text-sm text-ink">{formatVitals(v)}</div>
                                </div>
                                <button onClick={() => deleteVitals(v.id)} className="text-xs text-muted-foreground hover:text-destructive"><X size={12} /></button>
                              </div>
                            ))}
                          </div>
                        </details>
                      )}
                    </div>
                  ) : (
                    <p className="text-sm text-ink-soft">No vital signs recorded yet.</p>
                  )}
                </div>

                <div className="mt-6 rounded-xl border border-border bg-background p-4">
                  <div className="mb-3 flex items-center justify-between">
                    <span className="text-sm font-semibold text-ink">Wellbeing vs. baseline</span>
                    {!formOpen && (
                      <button onClick={openForm} className="text-xs font-medium text-teal hover:underline">
                        + Log today&apos;s check
                      </button>
                    )}
                  </div>
                  {formOpen ? (
                    <div className="flex flex-col gap-3">
                      <WellbeingSliderInput label="Mood" value={draft.mood} onChange={(v) => setDraft((prev) => ({ ...prev, mood: v }))} />
                      <WellbeingSliderInput label="Appetite" value={draft.appetite} onChange={(v) => setDraft((prev) => ({ ...prev, appetite: v }))} />
                      <WellbeingSliderInput label="Mobility" value={draft.mobility} onChange={(v) => setDraft((prev) => ({ ...prev, mobility: v }))} />
                      <WellbeingSliderInput label="Sleep" value={draft.sleep} onChange={(v) => setDraft((prev) => ({ ...prev, sleep: v }))} />
                      <div className="mt-2 flex gap-2">
                        <button onClick={saveWellbeingCheck} className="rounded-full bg-primary px-4 py-2 text-sm font-medium text-primary-foreground">Save check</button>
                        <button onClick={cancelForm} className="rounded-full px-4 py-2 text-sm text-ink-soft hover:bg-secondary">Cancel</button>
                      </div>
                    </div>
                  ) : latestCheck ? (
                    <>
                      {/* Characterised health matrix — per-metric snapshot vs baseline */}
                      {(() => {
                        const metrics = [
                          { label: "Mood",     cur: latestCheck.mood,     base: selectedPatient.baseline.mood },
                          { label: "Appetite", cur: latestCheck.appetite, base: selectedPatient.baseline.appetite },
                          { label: "Mobility", cur: latestCheck.mobility, base: selectedPatient.baseline.mobility },
                          { label: "Sleep",    cur: latestCheck.sleep,    base: selectedPatient.baseline.sleep },
                        ];
                        const overall = metrics.reduce((s, m) => s + m.cur, 0) / 4;
                        const baseOverall = metrics.reduce((s, m) => s + m.base, 0) / 4;
                        const overallDelta = overall - baseOverall;
                        const overallLabel = overallDelta >= 1 ? "Above baseline" : overallDelta >= -0.5 ? "At baseline" : overallDelta >= -2 ? "Below baseline" : "Significantly below baseline";
                        return (
                          <div className="mb-4">
                            <div className="mb-2 text-xs font-medium uppercase tracking-wide text-muted-foreground">Health Matrix</div>
                            <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
                              {metrics.map(({ label, cur, base }) => {
                                const delta = cur - base;
                                const bg = delta >= 0 ? "bg-teal-soft" : delta >= -1 ? "bg-amber-50" : "bg-red-50";
                                const col = delta >= 0 ? "text-teal" : delta >= -1 ? "text-amber-600" : "text-destructive";
                                return (
                                  <div key={label} className={`rounded-lg p-2.5 ${bg}`}>
                                    <div className="text-xs text-muted-foreground">{label}</div>
                                    <div className="text-xl font-semibold text-ink">{cur}<span className="text-xs font-normal text-muted-foreground">/10</span></div>
                                    <div className={`flex items-center gap-0.5 text-xs ${col}`}>
                                      {delta > 0 ? <ChevronUp size={11} /> : delta < 0 ? <ChevronDown size={11} /> : null}
                                      {delta > 0 ? "+" : ""}{delta.toFixed(1)} vs baseline
                                    </div>
                                  </div>
                                );
                              })}
                            </div>
                            <div className="mt-2 flex items-center justify-between rounded-lg border border-border bg-card px-3 py-2">
                              <span className="text-sm font-medium text-ink">Overall health score</span>
                              <span className="text-sm font-semibold text-ink">{overall.toFixed(1)}/10</span>
                              <span className={`text-xs font-medium ${overallDelta >= 0 ? "text-teal" : overallDelta >= -1 ? "text-amber-600" : "text-destructive"}`}>
                                {overallLabel}
                              </span>
                            </div>
                          </div>
                        );
                      })()}

                      <div className="flex flex-col gap-2.5">
                        <WellbeingBar label="Mood" value={latestCheck.mood} baseline={selectedPatient.baseline.mood} />
                        <WellbeingBar label="Appetite" value={latestCheck.appetite} baseline={selectedPatient.baseline.appetite} />
                        <WellbeingBar label="Mobility" value={latestCheck.mobility} baseline={selectedPatient.baseline.mobility} />
                        <WellbeingBar label="Sleep" value={latestCheck.sleep} baseline={selectedPatient.baseline.sleep} />
                      </div>

                      <div className="mt-4 border-t border-border pt-4">
                        <div className="mb-2 text-xs font-medium uppercase tracking-wide text-muted-foreground">
                          Trend ({patientWellbeingHistory.length} check{patientWellbeingHistory.length !== 1 ? "s" : ""} logged)
                        </div>
                        <HealthChart history={patientWellbeingHistory} baseline={selectedPatient.baseline} />
                      </div>
                    </>
                  ) : (
                    <p className="text-sm text-ink-soft">No wellbeing checks logged yet.</p>
                  )}
                </div>

                <div className="mt-6 rounded-xl border border-border bg-background p-4">
                  <div className="mb-3 flex items-center justify-between">
                    <span className="text-sm font-semibold text-ink">Personalised profile</span>
                    <button onClick={openProfileEdit} className="text-xs font-medium text-teal hover:underline">Edit</button>
                  </div>
                  {selectedPatient.profile.preferences || selectedPatient.profile.routine || selectedPatient.profile.communicationStyle ? (
                    <div className="flex flex-col gap-2">
                      {selectedPatient.profile.preferences && (
                        <div>
                          <div className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Preferences</div>
                          <div className="text-sm text-ink">{selectedPatient.profile.preferences}</div>
                        </div>
                      )}
                      {selectedPatient.profile.routine && (
                        <div>
                          <div className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Routine</div>
                          <div className="text-sm text-ink">{selectedPatient.profile.routine}</div>
                        </div>
                      )}
                      {selectedPatient.profile.communicationStyle && (
                        <div>
                          <div className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Communication</div>
                          <div className="text-sm text-ink">{selectedPatient.profile.communicationStyle}</div>
                        </div>
                      )}
                    </div>
                  ) : (
                    <p className="text-sm text-ink-soft">No personalised profile recorded yet.</p>
                  )}
                </div>

                <div className="mt-6 rounded-xl border border-border bg-background p-4">
                  <div className="mb-3 flex items-center justify-between">
                    <span className="text-sm font-semibold text-ink">Current medications</span>
                    <button onClick={() => setMedFormOpen(true)} className="text-xs font-medium text-teal hover:underline">+ Add</button>
                  </div>
                  {selectedPatient.medications.length === 0 ? (
                    <p className="text-sm text-ink-soft">No medications on record.</p>
                  ) : (
                    <div className="flex flex-col gap-1.5">
                      {selectedPatient.medications.map((m) => (
                        <div key={m.id} className="flex items-center justify-between rounded-lg bg-secondary px-3 py-2">
                          <div>
                            <span className="text-sm font-medium text-ink">{m.name}</span>{" "}
                            <span className="text-xs text-muted-foreground">{m.dose} · {m.frequency}</span>
                          </div>
                          <button onClick={() => removeMedication(m.id)} className="text-xs text-muted-foreground hover:text-destructive"><X size={12} /></button>
                        </div>
                      ))}
                    </div>
                  )}
                  {medFormOpen && (
                    <div className="mt-3 flex flex-col gap-2 border-t border-border pt-3">
                      <input value={medName} onChange={(e) => setMedName(e.target.value)} placeholder="Medication name" className="rounded-lg border border-border px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-ring" />
                      <div className="flex gap-2">
                        <input value={medDose} onChange={(e) => setMedDose(e.target.value)} placeholder="Dose (e.g. 500mg)" className="flex-1 rounded-lg border border-border px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-ring" />
                        <input value={medFrequency} onChange={(e) => setMedFrequency(e.target.value)} placeholder="Frequency" className="flex-1 rounded-lg border border-border px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-ring" />
                      </div>
                      <div className="flex gap-2">
                        <button onClick={addMedication} className="rounded-full bg-primary px-3 py-1.5 text-xs font-medium text-primary-foreground">Save</button>
                        <button onClick={() => setMedFormOpen(false)} className="text-xs text-ink-soft hover:text-ink">Cancel</button>
                      </div>
                    </div>
                  )}
                </div>

                <div className="mt-6 rounded-xl border border-border bg-background p-4">
                  <div className="mb-3 flex items-center justify-between">
                    <span className="text-sm font-semibold text-ink">Problem list</span>
                    {!diagnosisFormOpen && (
                      <button onClick={() => setDiagnosisFormOpen(true)} className="text-xs font-medium text-teal hover:underline">
                        + Add diagnosis
                      </button>
                    )}
                  </div>

                  {diagnosisFormOpen && (
                    <div className="mb-4 flex flex-col gap-3 rounded-lg border border-border p-3">
                      <input
                        value={diagnosisCondition}
                        onChange={(e) => setDiagnosisCondition(e.target.value)}
                        placeholder="Condition (e.g. Type 2 Diabetes)"
                        className="rounded-lg border border-border px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-ring"
                      />
                      <select
                        value={diagnosisStatus}
                        onChange={(e) => setDiagnosisStatus(e.target.value as ProblemStatus)}
                        className="rounded-lg border border-border px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-ring"
                      >
                        {PROBLEM_STATUSES.map((s) => (
                          <option key={s} value={s}>{s}</option>
                        ))}
                      </select>
                      <textarea
                        value={diagnosisNotes}
                        onChange={(e) => setDiagnosisNotes(e.target.value)}
                        placeholder="Notes (optional)"
                        rows={2}
                        className="resize-none rounded-lg border border-border px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-ring"
                      />
                      <div className="flex gap-2">
                        <button onClick={addDiagnosis} className="rounded-full bg-primary px-4 py-2 text-sm font-medium text-primary-foreground">
                          Save
                        </button>
                        <button onClick={() => setDiagnosisFormOpen(false)} className="rounded-full px-4 py-2 text-sm text-ink-soft hover:bg-secondary">
                          Cancel
                        </button>
                      </div>
                    </div>
                  )}

                  {sortedDiagnoses.length === 0 ? (
                    <p className="text-sm text-ink-soft">No diagnoses on record.</p>
                  ) : (
                    <div className="flex flex-col gap-2">
                      {sortedDiagnoses.map((d) => (
                        <div key={d.id} className="rounded-lg border border-border p-3">
                          <div className="flex items-start justify-between gap-2">
                            <div className="min-w-0 flex-1">
                              <div className="flex flex-wrap items-center gap-2">
                                <span className="text-sm font-medium text-ink">{d.condition}</span>
                                <span className={`rounded-full px-2 py-0.5 text-xs ${statusBadgeStyle(d.status)}`}>{d.status}</span>
                              </div>
                              <div className="mt-0.5 text-xs text-muted-foreground">
                                {d.authorRole} · {formatDateTime(d.timestamp)}
                              </div>
                              {d.notes && <div className="mt-1 text-sm text-ink">{d.notes}</div>}
                            </div>
                            <button onClick={() => deleteDiagnosis(d.id)} title="Delete" className="shrink-0 text-xs text-muted-foreground hover:text-destructive"><X size={12} /></button>
                          </div>
                          <div className="mt-2 flex gap-1.5">
                            {PROBLEM_STATUSES.filter((s) => s !== d.status).map((s) => (
                              <button
                                key={s}
                                onClick={() => updateDiagnosisStatus(d.id, s)}
                                className="rounded-full bg-secondary px-2.5 py-1 text-xs text-ink hover:opacity-80"
                              >
                                Mark {s}
                              </button>
                            ))}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                <div className="mt-6 rounded-xl border border-border bg-background p-4">
                  <div className="mb-3 flex items-center justify-between">
                    <span className="text-sm font-semibold text-ink">Reports & imaging</span>
                    {!reportFormOpen && (
                      <button onClick={() => setReportFormOpen(true)} className="text-xs font-medium text-teal hover:underline">
                        + Add report
                      </button>
                    )}
                  </div>

                  {reportFormOpen && (
                    <div className="mb-4 flex flex-col gap-3 rounded-lg border border-border p-3">
                      <select
                        value={reportType}
                        onChange={(e) => setReportType(e.target.value as ReportType)}
                        className="rounded-lg border border-border px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-ring"
                      >
                        {REPORT_TYPES.map((t) => (
                          <option key={t} value={t}>{t}</option>
                        ))}
                      </select>
                      <input
                        value={reportTitle}
                        onChange={(e) => setReportTitle(e.target.value)}
                        placeholder="Title (e.g. Full Blood Count, Chest X-Ray)"
                        className="rounded-lg border border-border px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-ring"
                      />
                      <textarea
                        value={reportNotes}
                        onChange={(e) => setReportNotes(e.target.value)}
                        placeholder="Result summary / findings (optional)"
                        rows={2}
                        className="resize-none rounded-lg border border-border px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-ring"
                      />

                      {reportPendingImage && (
                        <div className="flex items-center gap-2 rounded-lg bg-teal-soft p-2">
                          {/* eslint-disable-next-line @next/next/no-img-element */}
                          <img src={reportPendingImage} alt="Report attachment" className="h-12 w-12 rounded object-cover" />
                          <span className="flex-1 text-xs text-ink">Image attached.</span>
                          <button onClick={() => setReportPendingImage(null)} className="text-xs text-ink-soft hover:text-ink">Remove</button>
                        </div>
                      )}

                      <div className="flex items-center gap-2">
                        <input ref={reportFileInputRef} type="file" accept="image/*" onChange={handleReportImageSelect} className="hidden" />
                        <button
                          onClick={() => reportFileInputRef.current?.click()}
                          className="rounded-lg border border-border px-3 py-2 text-sm text-ink-soft hover:bg-secondary"
                          title="Attach an image of the report/scan"
                        >
                          <Camera size={12} className="mr-1 inline" /> Attach image
                        </button>
                        <div className="flex-1" />
                        <button onClick={addReport} className="rounded-full bg-primary px-4 py-2 text-sm font-medium text-primary-foreground">
                          Save report
                        </button>
                        <button
                          onClick={() => { setReportFormOpen(false); setReportPendingImage(null); }}
                          className="rounded-full px-4 py-2 text-sm text-ink-soft hover:bg-secondary"
                        >
                          Cancel
                        </button>
                      </div>
                    </div>
                  )}

                  {sortedReports.length === 0 ? (
                    <p className="text-sm text-ink-soft">No reports recorded yet.</p>
                  ) : (
                    <div className="flex flex-col gap-3">
                      {sortedReports.map((report) => (
                        <div key={report.id} className="flex items-start justify-between gap-2 rounded-lg border border-border p-3">
                          <div className="min-w-0 flex-1">
                            <div className="flex items-center gap-2">
                              <span className="text-base">{reportTypeIcon(report.reportType)}</span>
                              <span className="text-sm font-medium text-ink">{report.title}</span>
                              <span className="rounded-full bg-secondary px-2 py-0.5 text-xs text-ink-soft">{report.reportType}</span>
                            </div>
                            <div className="mt-0.5 text-xs text-muted-foreground">
                              {report.authorRole} · {formatDateTime(report.timestamp)}
                            </div>
                            {report.notes && <div className="mt-1 text-sm text-ink">{report.notes}</div>}
                            {report.imageUrl && (
                              // eslint-disable-next-line @next/next/no-img-element
                              <img src={report.imageUrl} alt={report.title} className="mt-2 max-h-48 rounded-lg border border-border object-cover" />
                            )}
                          </div>
                          <button onClick={() => deleteReport(report.id)} title="Delete this report" className="shrink-0 text-xs text-muted-foreground hover:text-destructive"><X size={12} /></button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                <div className="mt-6 rounded-xl border border-border bg-background p-4">
                  <div className="mb-3 flex items-center justify-between">
                    <span className="text-sm font-semibold text-ink">Referrals & collaboration</span>
                    {isDoctorRole && !referralFormOpen && (
                      <button onClick={() => setReferralFormOpen(true)} className="text-xs font-medium text-teal hover:underline">
                        + New referral
                      </button>
                    )}
                  </div>

                  {referralFormOpen && (
                    <div className="mb-4 flex flex-col gap-3 rounded-lg border border-border p-3">
                      {/* Internal / External toggle */}
                      <div className="flex gap-1 rounded-full bg-secondary p-0.5 w-fit">
                        {(["internal", "external"] as const).map((t) => (
                          <button key={t} onClick={() => setReferralType(t)}
                            className={`rounded-full px-3 py-1 text-xs font-medium capitalize transition-colors ${referralType === t ? "bg-primary text-primary-foreground" : "text-ink-soft hover:bg-card"}`}>
                            {t}
                          </button>
                        ))}
                      </div>

                      {/* Recipient chip input */}
                      <div className="flex min-h-[40px] flex-wrap items-center gap-1.5 rounded-lg border border-border px-2 py-1.5 focus-within:ring-2 focus-within:ring-ring">
                        {referralRecipients.map((r) => (
                          <span key={r} className="flex items-center gap-1 rounded-full bg-teal-soft px-2.5 py-0.5 text-xs font-medium text-teal">
                            {r}
                            <button onClick={() => setReferralRecipients((prev) => prev.filter((x) => x !== r))} className="ml-0.5 rounded-full hover:opacity-60">
                              <X size={10} />
                            </button>
                          </span>
                        ))}
                        <input
                          value={referralRecipientInput}
                          onChange={(e) => setReferralRecipientInput(e.target.value)}
                          onKeyDown={(e) => {
                            if ((e.key === "Enter" || e.key === ",") && referralRecipientInput.trim()) {
                              e.preventDefault();
                              const val = referralRecipientInput.trim().replace(/,$/, "");
                              if (val && !referralRecipients.includes(val)) setReferralRecipients((prev) => [...prev, val]);
                              setReferralRecipientInput("");
                            }
                          }}
                          onBlur={() => {
                            if (referralRecipientInput.trim()) {
                              const val = referralRecipientInput.trim();
                              if (!referralRecipients.includes(val)) setReferralRecipients((prev) => [...prev, val]);
                              setReferralRecipientInput("");
                            }
                          }}
                          placeholder={referralRecipients.length === 0 ? "Add recipient (press Enter)" : "Add another…"}
                          className="min-w-[140px] flex-1 bg-transparent text-sm outline-none"
                        />
                      </div>

                      <input
                        value={referralSubject}
                        onChange={(e) => setReferralSubject(e.target.value)}
                        placeholder="Subject (e.g. Pre-op review requested)"
                        className="rounded-lg border border-border px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-ring"
                      />
                      <textarea
                        value={referralMessage}
                        onChange={(e) => setReferralMessage(e.target.value)}
                        placeholder="Message / clinical reasoning"
                        rows={3}
                        className="resize-none rounded-lg border border-border px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-ring"
                      />
                      <div className="flex gap-2">
                        <button onClick={addReferral} disabled={referralRecipients.length === 0 || !referralSubject.trim()}
                          className="rounded-full bg-primary px-4 py-2 text-sm font-medium text-primary-foreground disabled:opacity-50">
                          Send referral
                        </button>
                        <button onClick={() => { setReferralFormOpen(false); setReferralRecipients([]); setReferralRecipientInput(""); }}
                          className="rounded-full px-4 py-2 text-sm text-ink-soft hover:bg-secondary">
                          Cancel
                        </button>
                      </div>
                    </div>
                  )}

                  {sortedReferrals.length === 0 ? (
                    <p className="text-sm text-ink-soft">No referrals or collaboration notes yet.</p>
                  ) : (
                    <div className="flex flex-col gap-3">
                      {sortedReferrals.map((referral) => {
                        const recipients = referral.toRecipients ?? (referral.toRecipient ? [referral.toRecipient] : ["Unknown"]);
                        const isExternal = referral.referralType === "external";
                        return (
                          <div key={referral.id} className="rounded-lg border border-border p-3">
                            <div className="flex items-start justify-between gap-2">
                              <div className="min-w-0 flex-1">
                                <div className="flex flex-wrap items-center gap-2">
                                  <span className="text-sm font-medium text-ink">{referral.subject}</span>
                                  {isExternal ? (
                                    <span className="rounded-full bg-purple-100 px-2 py-0.5 text-xs text-purple-700">External</span>
                                  ) : referral.acknowledged ? (
                                    <span className="rounded-full bg-teal-soft px-2 py-0.5 text-xs text-teal">Acknowledged</span>
                                  ) : (
                                    <span className="rounded-full bg-amber-100 px-2 py-0.5 text-xs text-amber-800">Awaiting response</span>
                                  )}
                                </div>
                                <div className="mt-0.5 flex flex-wrap items-center gap-1 text-xs text-muted-foreground">
                                  <span>From {referral.fromName}</span>
                                  <ArrowRight size={10} className="shrink-0" />
                                  <span>{recipients.join(", ")}</span>
                                  <span>· {formatDateTime(referral.timestamp)}</span>
                                </div>
                                {referral.shareCode && (
                                  <div className="mt-1 flex items-center gap-1.5">
                                    <span className="rounded bg-secondary px-2 py-0.5 font-mono text-xs text-ink">{referral.shareCode}</span>
                                    <button
                                      onClick={() => navigator.clipboard?.writeText(referral.shareCode!)}
                                      className="text-muted-foreground hover:text-teal"
                                      title="Copy referral code"
                                    >
                                      <Copy size={11} />
                                    </button>
                                  </div>
                                )}
                                {referral.message && <div className="mt-1.5 text-sm text-ink">{referral.message}</div>}
                                {referral.acknowledged && referral.acknowledgedBy && (
                                  <div className="mt-1.5 text-xs text-muted-foreground">
                                    Acknowledged by {referral.acknowledgedBy} · {formatDateTime(referral.acknowledgedAt!)}
                                  </div>
                                )}
                              </div>
                              <button onClick={() => deleteReferral(referral.id)} title="Delete this referral" className="shrink-0 text-xs text-muted-foreground hover:text-destructive"><X size={12} /></button>
                            </div>
                            {!isExternal && !referral.acknowledged && (
                              <button
                                onClick={() => acknowledgeReferral(referral.id)}
                                className="mt-2 rounded-full bg-secondary px-3 py-1 text-xs font-medium text-ink hover:opacity-80"
                              >
                                Mark as acknowledged
                              </button>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>

                {isDoctorRole && (
                  <div className="mt-6 rounded-xl border border-border bg-background p-4">
                    <div className="mb-1 text-sm font-semibold text-ink">Shift history</div>
                    <p className="mb-3 text-xs text-muted-foreground">
                      Notes grouped by the shift they were logged in, so patterns across shifts are visible rather than buried in one long feed.
                    </p>

                    {shiftGroups.length === 0 ? (
                      <p className="text-sm text-ink-soft">No shift data yet.</p>
                    ) : (
                      <div className="flex flex-col gap-1.5">
                        {shiftGroups.map((group) => {
                          const isOpen = expandedShiftKey === group.key;
                          return (
                            <div key={group.key} className="rounded-lg border border-border">
                              <button
                                onClick={() => setExpandedShiftKey(isOpen ? null : group.key)}
                                className="flex w-full items-center justify-between px-3 py-2"
                              >
                                <span className="text-sm font-medium text-ink">{group.label}</span>
                                <span className="flex items-center gap-2">
                                  <span className="rounded-full bg-secondary px-2 py-0.5 text-xs text-ink-soft">
                                    {group.notes.length} note{group.notes.length !== 1 ? "s" : ""}
                                  </span>
                                  {isOpen ? <ChevronUp size={14} className="text-muted-foreground" /> : <ChevronDown size={14} className="text-muted-foreground" />}
                                </span>
                              </button>
                              {isOpen && (
                                <div className="flex flex-col gap-2 px-3 pb-3">
                                  {group.notes
                                    .sort((a, b) => b.timestamp - a.timestamp)
                                    .map((note) => (
                                      <div key={note.id} className="border-l-2 border-border pl-2 text-xs">
                                        <span className="font-mono text-muted-foreground">{note.authorRole}:</span>{" "}
                                        <span className="text-ink-soft">{note.content}</span>
                                      </div>
                                    ))}
                                </div>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>
                )}


                {/* ================================================================
                     DISCHARGE SUMMARY PANEL — Doctor only.

                     Clicking "Generate draft" creates TWO separate entries at once:
                     one audience="gp" (clinical, for the ongoing GP) and one
                     audience="patient" (plain language, for the patient). Each is
                     its own independently editable/finalizable card, distinguished
                     visually by the audience badge at the top of each card.
                   ================================================================ */}
                {isDoctorRole && (
                  <div className="mt-6 rounded-xl border border-border bg-background p-4">
                    <div className="mb-3 flex items-center justify-between">
                      <span className="text-sm font-semibold text-ink">Discharge summary</span>
                      <button
                        onClick={generateDischargeSummary}
                        disabled={dischargeLoading}
                        className="rounded-full bg-teal-soft px-3 py-1.5 text-xs font-medium text-teal hover:opacity-80 disabled:opacity-50"
                      >
                        {dischargeLoading ? "Drafting..." : <><Wand2 size={12} className="mr-1 inline" />Generate draft</>}
                      </button>
                    </div>

                    {/* Loading state — shown once, covers both documents being generated together */}
                    {dischargeLoading && (
                      <div className="mb-3 rounded-lg bg-teal-soft p-3 text-sm text-ink">
                        Pulling together the admission record for {selectedPatient.name}...
                      </div>
                    )}

                    {/* Error state — e.g. the API route failed, or Gemini was overloaded */}
                    {dischargeError && (
                      <div className="mb-3 flex items-center gap-2 rounded-lg bg-amber-50 p-3 text-sm text-amber-700">
                        <span className="flex-1">{dischargeError}</span>
                        <button onClick={() => setDischargeError("")} className="hover:underline">Dismiss</button>
                      </div>
                    )}

                    {sortedDischargeSummaries.length === 0 ? (
                      <p className="text-sm text-ink-soft">No discharge summary drafted yet.</p>
                    ) : (
                      <div className="flex flex-col gap-3">
                        {/* Each entry — whether GP or Patient audience — renders through
                            this exact same card structure, just with a different badge
                            and different content. Sorted newest-first, and since the GP
                            entry is always created 1ms before the Patient entry (see
                            generateDischargeSummary), the GP card naturally appears
                            first within each generation batch. */}
                        {sortedDischargeSummaries.map((summary) => {
                          const isEditingThis = editingSummaryId === summary.id;
                          const isFinalized = summary.status === "finalized";

                          return (
                            <div key={summary.id} className="rounded-lg border border-border p-3">
                              {/* ---------- Card header: audience badge + author/date + status badge + delete ---------- */}
                              <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
                                <div className="flex items-center gap-2 text-xs text-muted-foreground">
                                  {/* NEW — this is "piece 4": the audience badge,
                                      distinguishing GP Summary from Patient Summary
                                      at a glance */}
                                  <span className={`rounded-full px-2 py-0.5 font-medium ${audienceBadgeStyle(summary.audience)}`}>
                                    {audienceLabel(summary.audience)}
                                  </span>
                                  <span>Draft by {summary.generatedBy} · {formatDateTime(summary.timestamp)}</span>
                                  {summary.edited && (
                                    <span className="rounded-full bg-secondary px-2 py-0.5 text-ink">Edited</span>
                                  )}
                                  {isFinalized ? (
                                    <span className="inline-flex items-center gap-1 rounded-full bg-teal-soft px-2 py-0.5 text-teal"><Check size={10} />Finalised</span>
                                  ) : (
                                    <span className="rounded-full bg-amber-100 px-2 py-0.5 text-amber-800">Draft — pending review</span>
                                  )}
                                </div>
                                {/* Delete stays available even for finalized summaries —
                                    for genuine data-entry mistakes — but editing/finalizing
                                    do not, once locked (see below). */}
                                <button onClick={() => deleteDischargeSummary(summary.id)} className="text-xs text-muted-foreground hover:text-destructive">
                                  <X size={12} />
                                </button>
                              </div>

                              {/* ---------- Card body: either the edit textarea, or the read-only display ---------- */}
                              {isEditingThis ? (
                                <div className="flex flex-col gap-2">
                                  <textarea
                                    value={editSummaryContent}
                                    onChange={(e) => setEditSummaryContent(e.target.value)}
                                    rows={10}
                                    className="w-full resize-y rounded-lg border border-border px-3 py-2 font-mono text-xs outline-none focus:ring-2 focus:ring-ring"
                                  />
                                  <div className="flex gap-2">
                                    <button
                                      onClick={() => saveEditedSummary(summary.id)}
                                      className="rounded-full bg-primary px-4 py-2 text-sm font-medium text-primary-foreground"
                                    >
                                      Save changes
                                    </button>
                                    <button
                                      onClick={cancelEditingSummary}
                                      className="rounded-full px-4 py-2 text-sm text-ink-soft hover:bg-secondary"
                                    >
                                      Cancel
                                    </button>
                                  </div>
                                </div>
                              ) : (
                                <>
                                  <div className="whitespace-pre-wrap text-sm text-ink">{summary.content}</div>

                                  {isFinalized ? (
                                    <p className="mt-2 text-xs text-muted-foreground">
                                      Finalised by {summary.finalizedBy} · {formatDateTime(summary.finalizedAt!)} — this is the official {audienceLabel(summary.audience).toLowerCase()}.
                                    </p>
                                  ) : (
                                    <>
                                      <p className="mt-2 text-xs text-muted-foreground">
                                        This is an AI-generated draft. Review, edit if needed, and finalise once confirmed.
                                      </p>
                                      {/* Edit and Finalise are only offered while still a
                                          draft — once finalized, this whole block is
                                          replaced by the "official document" note above. */}
                                      <div className="mt-2 flex gap-2">
                                        <button
                                          onClick={() => startEditingSummary(summary)}
                                          className="rounded-full bg-secondary px-3 py-1.5 text-xs font-medium text-ink hover:opacity-80"
                                        >
                                          Edit
                                        </button>
                                        <button
                                          onClick={() => finalizeSummary(summary.id)}
                                          className="rounded-full bg-teal-soft px-3 py-1.5 text-xs font-medium text-teal hover:opacity-80"
                                        >
                                          <Check size={12} className="mr-1 inline" />Finalise as {audienceLabel(summary.audience).toLowerCase()}
                                        </button>
                                      </div>
                                    </>
                                  )}
                                </>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>
                )}

                <div className="mt-6 rounded-xl border border-border bg-background p-4">
                  <div className="mb-3 flex items-center justify-between">
                    <span className="text-sm font-semibold text-ink">Care notes</span>
                    <div className="flex gap-2">
                      <button onClick={() => setQaOpen(true)} className="rounded-full bg-secondary px-3 py-1.5 text-xs font-medium text-ink hover:opacity-80"><MessageSquare size={12} className="mr-1 inline" /> Ask TraceWell</button>
                      <button onClick={generateHandover} disabled={handoverLoading} className="rounded-full bg-teal-soft px-3 py-1.5 text-xs font-medium text-teal hover:opacity-80 disabled:opacity-50">
                        {handoverLoading ? "Generating..." : <><Wand2 size={12} className="mr-1 inline" />Generate AI handover</>}
                      </button>
                      <button onClick={generateFamilyUpdate} disabled={familyUpdateLoading} className="rounded-full bg-amber-100 px-3 py-1.5 text-xs font-medium text-amber-800 hover:opacity-80 disabled:opacity-50">
                        {familyUpdateLoading ? "Sending..." : <><Heart size={12} className="mr-1 inline" />Send family update</>}
                      </button>
                    </div>
                  </div>

                  {handoverLoading && <div className="mb-4 rounded-lg bg-teal-soft p-3 text-sm text-ink">Reviewing {selectedPatient.name}&apos;s notes...</div>}
                  {handoverError && (
                    <div className="mb-4 flex items-center gap-2 rounded-lg bg-amber-50 p-3 text-sm text-amber-700">
                      <span className="flex-1">{handoverError}</span>
                      <button onClick={() => setHandoverError("")} className="hover:underline">Dismiss</button>
                    </div>
                  )}
                  {handoverText && !handoverLoading && (
                    <div className="mb-4 whitespace-pre-wrap rounded-lg border border-teal bg-teal-soft p-3 text-sm text-ink">{handoverText}</div>
                  )}

                  {familyUpdateLoading && (
                    <div className="mb-4 rounded-lg bg-amber-50 p-3 text-sm text-amber-800">
                      Writing a family-friendly update for {selectedPatient.name}...
                    </div>
                  )}
                  {familyUpdateError && (
                    <div className="mb-4 flex items-center gap-2 rounded-lg bg-amber-50 p-3 text-sm text-amber-700">
                      <span className="flex-1">{familyUpdateError}</span>
                      <button onClick={() => setFamilyUpdateError("")} className="hover:underline">Dismiss</button>
                    </div>
                  )}

                  {pendingImage && (
                    <div className="mb-3 flex items-center gap-2 rounded-lg bg-teal-soft p-2">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img src={pendingImage} alt="Selected" className="h-12 w-12 rounded object-cover" />
                      <span className="flex-1 text-xs text-ink">Photo ready — the AI will describe it automatically when you click Add.</span>
                      <button onClick={() => setPendingImage(null)} className="text-xs text-ink-soft hover:text-ink">Remove</button>
                    </div>
                  )}

                  {captioning && <div className="mb-3 rounded-lg bg-teal-soft p-2 text-xs text-ink">Reading the photo and generating a description...</div>}
                  {captionError && (
                    <div className="mb-3 flex items-center gap-2 rounded-lg bg-amber-50 p-2 text-xs text-amber-700">
                      <span className="flex-1">{captionError}</span>
                      <button onClick={() => setCaptionError("")} className="hover:underline">Dismiss</button>
                    </div>
                  )}

                  {voiceError && (
                    <div className="mb-3 flex items-center gap-2 rounded-lg bg-amber-50 p-2 text-xs text-amber-700">
                      <span className="flex-1">{voiceError}</span>
                      <button onClick={() => setVoiceError("")} className="text-amber-700 hover:underline">Dismiss</button>
                    </div>
                  )}

                  {recording && (
                    <div className="mb-3 flex items-center gap-2 text-xs font-medium text-destructive">
                      <span className="relative flex h-2 w-2">
                        <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-destructive opacity-75" />
                        <span className="relative inline-flex h-2 w-2 rounded-full bg-destructive" />
                      </span>
                      Listening — speak now, click the microphone again to stop. Noise cancellation active.
                    </div>
                  )}

                  {/* Voice review panel — shown after recording stops so the transcript can be amended */}
                  {voiceReviewMode && !recording && noteDraft.trim() && (
                    <div className="mb-3 rounded-lg border border-teal bg-teal-soft p-3">
                      <div className="mb-1.5 flex items-center justify-between">
                        <span className="text-xs font-semibold text-teal">Review voice transcript — edit before saving</span>
                        <button onClick={() => { setNoteDraft(""); setVoiceReviewMode(false); }} className="text-xs text-ink-soft hover:text-destructive">Discard</button>
                      </div>
                      <textarea
                        value={noteDraft}
                        onChange={(e) => setNoteDraft(e.target.value)}
                        rows={3}
                        className="w-full resize-none rounded border border-border bg-card px-2 py-1.5 text-sm text-ink outline-none focus:ring-2 focus:ring-ring"
                      />
                      <button onClick={addNote} disabled={captioning} className="mt-2 rounded-full bg-primary px-4 py-1.5 text-xs font-medium text-primary-foreground disabled:opacity-50">
                        {captioning ? "Saving..." : "Save voice note"}
                      </button>
                    </div>
                  )}

                  {!voiceReviewMode && (
                    <div className="flex gap-2">
                      <input
                        value={noteDraft}
                        onChange={(e) => setNoteDraft(e.target.value)}
                        onKeyDown={(e) => e.key === "Enter" && addNote()}
                        placeholder={recording ? "Listening..." : pendingImage ? "Optional context..." : "Add a care note..."}
                        className="flex-1 rounded-lg border border-border px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-ring"
                      />
                      <input ref={fileInputRef} type="file" accept="image/*" onChange={handleImageSelect} className="hidden" />
                      {/* Camera button with dropdown: Take photo / Upload */}
                      <div className="relative">
                        <button
                          onClick={() => setCameraMenuOpen((v) => !v)}
                          className="rounded-lg border border-border px-3 py-2 text-sm text-ink-soft hover:bg-secondary"
                          title="Add photo"
                        >
                          <Camera size={16} />
                        </button>
                        {cameraMenuOpen && (
                          <div className="absolute bottom-full right-0 z-20 mb-1 min-w-36 overflow-hidden rounded-lg border border-border bg-card shadow-lift">
                            <button
                              onClick={openCamera}
                              className="flex w-full items-center gap-2 px-3 py-2 text-left text-sm text-ink hover:bg-secondary"
                            >
                              <Video size={13} /> Take photo
                            </button>
                            <button
                              onClick={() => { setCameraMenuOpen(false); fileInputRef.current?.click(); }}
                              className="flex w-full items-center gap-2 px-3 py-2 text-left text-sm text-ink hover:bg-secondary"
                            >
                              <Camera size={13} /> Upload file
                            </button>
                          </div>
                        )}
                      </div>
                      <button
                        onClick={recording ? stopVoice : startVoice}
                        className={`rounded-lg border px-3 py-2 text-sm ${recording ? "border-destructive bg-destructive text-white" : "border-border text-ink-soft hover:bg-secondary"}`}
                        title={recording ? "Stop recording" : "Record a voice note"}
                      >
                        <Mic size={16} />
                      </button>
                      <button onClick={addNote} disabled={captioning} className="rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground disabled:opacity-50">
                        {captioning ? "..." : "Add"}
                      </button>
                    </div>
                  )}

                  <div className="mt-4 flex flex-col gap-3">
                    {sortedNotes.length === 0 ? (
                      <p className="text-sm text-ink-soft">No notes recorded yet.</p>
                    ) : (
                      sortedNotes.map((note) => (
                        <div key={note.id} className="flex items-start justify-between gap-2 border-l-2 border-teal pl-3">
                          <div className="min-w-0 flex-1">
                            <div className="text-xs text-muted-foreground">
                              {note.authorRole} · {formatDateTime(note.timestamp)} ({timeAgo(note.timestamp)})
                              {note.type === "image" && <span className="ml-1 inline-flex items-center gap-0.5">· <Camera size={10} className="inline" /> Photo</span>}
                              {note.type === "voice" && <span className="ml-1 inline-flex items-center gap-0.5">· <Mic size={10} className="inline" /> Voice note</span>}
                              {note.type === "family_update" && <span className="ml-1 inline-flex items-center gap-0.5">· <Heart size={10} className="inline" /> Family update</span>}
                            </div>
                            {note.imageUrl && (
                              // eslint-disable-next-line @next/next/no-img-element
                              <img src={note.imageUrl} alt="Care note attachment" className="mt-1 max-h-40 rounded-lg border border-border object-cover" />
                            )}
                            <div className="mt-0.5 text-sm text-ink">{note.content}</div>
                          </div>
                          <button onClick={() => deleteNote(note.id)} title="Delete this note" className="shrink-0 text-xs text-muted-foreground hover:text-destructive"><X size={12} /></button>
                        </div>
                      ))
                    )}
                  </div>
                </div>

                {/* Family Messages — shared real-time thread between family and all staff */}
                <div className="mt-6 rounded-xl border border-border bg-background p-4">
                  <div className="mb-3 flex items-center gap-2">
                    <MessageSquare className="h-4 w-4 text-teal" />
                    <span className="text-sm font-semibold text-ink">Family Messages</span>
                    <span className="ml-auto text-xs text-muted-foreground">Visible to family and all care staff</span>
                  </div>

                  <div className="flex max-h-64 flex-col gap-2 overflow-y-auto">
                    {(chatMessagesByPatient[selectedPatient.id] ?? []).length === 0 ? (
                      <p className="text-sm text-ink-soft">No messages yet. Family members and staff can message here.</p>
                    ) : (
                      [...(chatMessagesByPatient[selectedPatient.id] ?? [])].sort((a, b) => a.timestamp - b.timestamp).map((msg) => {
                        const isMine = msg.authorRole === displayIdentity;
                        return (
                          <div key={msg.id} className={`flex flex-col ${isMine ? "items-end" : "items-start"}`}>
                            <div className={`max-w-[80%] rounded-2xl px-3 py-2 text-sm ${isMine ? "bg-teal text-white" : "bg-secondary text-ink"}`}>
                              {msg.content}
                            </div>
                            <span className="mt-0.5 text-[10px] text-muted-foreground">
                              {msg.authorName || msg.authorRole} · {timeAgo(msg.timestamp)}
                            </span>
                          </div>
                        );
                      })
                    )}
                  </div>

                  <div className="mt-3 flex gap-2">
                    <input
                      value={staffChatDraft}
                      onChange={(e) => setStaffChatDraft(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === "Enter" && staffChatDraft.trim()) {
                          addChatMessage(staffChatDraft.trim());
                          setStaffChatDraft("");
                        }
                      }}
                      placeholder="Message family..."
                      className="flex-1 rounded-lg border border-border px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-ring"
                    />
                    <button
                      onClick={() => {
                        if (staffChatDraft.trim()) {
                          addChatMessage(staffChatDraft.trim());
                          setStaffChatDraft("");
                        }
                      }}
                      disabled={!staffChatDraft.trim()}
                      className="rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground disabled:opacity-50"
                    >
                      Send
                    </button>
                  </div>
                </div>
              </div>
            )
          ) : (
            <div>
              <h1 className="text-xl">Select a {personLabelSingular} to begin</h1>
              <p className="mt-2 text-ink-soft">Choose someone from the {personLabel.toLowerCase()} list on the left to view their details.</p>
            </div>
          )}
        </main>
      </div>
      )} {/* end of non-manager / non-patient layout */}

      {editPatientOpen && selectedPatient && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4" onClick={() => setEditPatientOpen(false)}>
          <div onClick={(e) => e.stopPropagation()} className="w-full max-w-sm rounded-2xl border border-border bg-card p-6 shadow-lift">
            <h2 className="text-lg text-ink">Edit — {selectedPatient.name}</h2>
            <div className="mt-4 flex flex-col gap-3">
              <div>
                <label className="text-xs font-medium uppercase tracking-wide text-muted-foreground">{org === "hospital" ? "Ward" : "Room"}</label>
                <input value={editWard} onChange={(e) => setEditWard(e.target.value)} placeholder={org === "hospital" ? "e.g. Ward 4C" : "e.g. Room 09B"} className="mt-1 w-full rounded-lg border border-border px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-ring" />
              </div>
              <div>
                <label className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Age</label>
                <input value={editAge} onChange={(e) => setEditAge(e.target.value)} type="number" placeholder="Age" onKeyDown={(e) => e.key === "Enter" && saveEditPatient()} className="mt-1 w-full rounded-lg border border-border px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-ring" />
              </div>
              <div className="mt-1 flex gap-2">
                <button onClick={saveEditPatient} className="rounded-full bg-primary px-4 py-2 text-sm font-medium text-primary-foreground">Save changes</button>
                <button onClick={() => setEditPatientOpen(false)} className="rounded-full px-4 py-2 text-sm text-ink-soft hover:bg-secondary">Cancel</button>
              </div>
              <div className="border-t border-border pt-3">
                <button onClick={removePatient} className="text-sm text-destructive hover:underline">
                  Remove {personLabelSingular} from list
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {addPatientOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4" onClick={() => setAddPatientOpen(false)}>
          <div onClick={(e) => e.stopPropagation()} className="w-full max-w-sm rounded-2xl border border-border bg-card p-6 shadow-lift">
            <h2 className="text-lg text-ink">Admit new {personLabelSingular}</h2>
            <div className="mt-4 flex flex-col gap-3">
              <input value={newPatientName} onChange={(e) => setNewPatientName(e.target.value)} placeholder="Full name" className="rounded-lg border border-border px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-ring" />
              <input value={newPatientAge} onChange={(e) => setNewPatientAge(e.target.value)} type="number" placeholder="Age" className="rounded-lg border border-border px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-ring" />
              <input value={newPatientRoom} onChange={(e) => setNewPatientRoom(e.target.value)} onKeyDown={(e) => e.key === "Enter" && admitPatient()} placeholder={org === "hospital" ? "Ward (e.g. Ward 4C)" : "Room (e.g. Room 09B)"} className="rounded-lg border border-border px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-ring" />
              <p className="text-xs text-muted-foreground">Wellbeing baseline is set to a neutral default until a proper assessment is logged — this is a placeholder, not a clinical starting point.</p>
              <div className="mt-1 flex gap-2">
                <button onClick={admitPatient} className="rounded-full bg-primary px-4 py-2 text-sm font-medium text-primary-foreground">Admit {personLabelSingular}</button>
                <button onClick={() => setAddPatientOpen(false)} className="rounded-full px-4 py-2 text-sm text-ink-soft hover:bg-secondary">Cancel</button>
              </div>
            </div>
          </div>
        </div>
      )}

      {profileEditOpen && selectedPatient && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4" onClick={() => setProfileEditOpen(false)}>
          <div onClick={(e) => e.stopPropagation()} className="w-full max-w-md rounded-2xl border border-border bg-card p-6 shadow-lift">
            <h2 className="text-lg text-ink">Edit profile — {selectedPatient.name}</h2>
            <div className="mt-4 flex flex-col gap-3">
              <div>
                <label className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Preferences</label>
                <textarea value={profileDraft.preferences} onChange={(e) => setProfileDraft((prev) => ({ ...prev, preferences: e.target.value }))} rows={2} className="mt-1 w-full resize-none rounded-lg border border-border px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-ring" />
              </div>
              <div>
                <label className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Routine</label>
                <textarea value={profileDraft.routine} onChange={(e) => setProfileDraft((prev) => ({ ...prev, routine: e.target.value }))} rows={2} className="mt-1 w-full resize-none rounded-lg border border-border px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-ring" />
              </div>
              <div>
                <label className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Communication needs</label>
                <textarea value={profileDraft.communicationStyle} onChange={(e) => setProfileDraft((prev) => ({ ...prev, communicationStyle: e.target.value }))} rows={2} className="mt-1 w-full resize-none rounded-lg border border-border px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-ring" />
              </div>
              <button onClick={saveProfile} className="rounded-full bg-primary py-2.5 text-sm font-medium text-primary-foreground">Save profile</button>
            </div>
          </div>
        </div>
      )}

      {/* Camera modal — live viewfinder with capture button */}
      {cameraOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4" onClick={closeCamera}>
          <div onClick={(e) => e.stopPropagation()} className="flex flex-col items-center gap-4 rounded-2xl border border-border bg-card p-6 shadow-lift">
            <h2 className="text-lg text-ink">Take a photo</h2>
            <video
              ref={videoRef}
              autoPlay
              playsInline
              muted
              className="h-64 w-80 rounded-lg bg-black object-cover"
            />
            <div className="flex gap-3">
              <button
                onClick={capturePhoto}
                className="flex items-center gap-2 rounded-full bg-primary px-5 py-2.5 text-sm font-medium text-primary-foreground"
              >
                <Camera size={14} /> Capture
              </button>
              <button onClick={closeCamera} className="rounded-full border border-border px-5 py-2.5 text-sm text-ink-soft hover:bg-secondary">
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Wellbeing concern alert modal — fires after saving a concerning check */}
      {wellbeingAlert && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="w-full max-w-sm rounded-2xl border border-amber-300 bg-card p-6 shadow-lift">
            <div className="mb-3 flex items-center gap-2 text-amber-700">
              <AlertTriangle className="h-5 w-5 shrink-0" />
              <span className="font-semibold">Health concern flagged</span>
            </div>
            <p className="text-sm text-ink">
              One or more wellbeing metrics for <strong>{wellbeingAlert.patientName}</strong> are below their personal baseline:
            </p>
            <ul className="mt-3 space-y-1.5">
              {wellbeingAlert.concerns.map((c) => (
                <li key={c.label} className="flex items-center justify-between rounded-lg bg-amber-50 px-3 py-2 text-sm">
                  <span className="font-medium text-ink">{c.label}</span>
                  <span className="text-amber-700">
                    {c.current}/10 <span className="text-ink-soft">(baseline {c.baseline})</span>
                    {c.delta >= 2 && <span className="ml-1 rounded-full bg-destructive/10 px-1.5 py-0.5 text-xs font-semibold text-destructive">-{c.delta} critical</span>}
                    {c.delta === 1 && <span className="ml-1 rounded-full bg-amber-100 px-1.5 py-0.5 text-xs font-semibold text-amber-700">-{c.delta} watch</span>}
                  </span>
                </li>
              ))}
            </ul>
            <p className="mt-3 text-xs text-ink-soft">
              The patient and their linked family members have been notified. Consider following up with a clinical assessment.
            </p>
            <button
              onClick={() => setWellbeingAlert(null)}
              className="mt-4 w-full rounded-full bg-primary py-2 text-sm font-medium text-primary-foreground"
            >
              Acknowledge
            </button>
          </div>
        </div>
      )}

      {qaOpen && selectedPatient && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4" onClick={() => setQaOpen(false)}>
          <div onClick={(e) => e.stopPropagation()} className="w-full max-w-md rounded-2xl border border-border bg-card p-6 shadow-lift">
            <h2 className="text-lg text-ink">Ask about {selectedPatient.name}</h2>
            <p className="mt-1 text-xs text-muted-foreground">Answers are grounded in this patient&apos;s notes and profile.</p>
            <div className="mt-4 flex flex-col gap-3">
              <input value={qaQuestion} onChange={(e) => setQaQuestion(e.target.value)} onKeyDown={(e) => e.key === "Enter" && askQuestion()} placeholder="e.g. What changed recently?" className="rounded-lg border border-border px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-ring" />
              {qaError && (
                <div className="flex items-center gap-2 rounded-lg bg-amber-50 p-2 text-xs text-amber-700">
                  <span className="flex-1">{qaError}</span>
                  <button onClick={() => setQaError("")} className="hover:underline">Dismiss</button>
                </div>
              )}
              <button onClick={askQuestion} disabled={qaLoading} className="rounded-full bg-primary px-4 py-2 text-sm font-medium text-primary-foreground disabled:opacity-50">
                {qaLoading ? "Thinking..." : "Ask"}
              </button>
              {qaAnswer && <div className="rounded-lg bg-teal-soft p-3 text-sm text-ink">{qaAnswer}</div>}
            </div>
          </div>
        </div>
      )}

      {/* ── Toast notifications (cross-session real-time pop-ups) ── */}
      {toasts.length > 0 && (
        <div className="pointer-events-none fixed bottom-4 right-4 z-[200] flex flex-col gap-2">
          {toasts.map((toast) => (
            <div
              key={toast.id}
              className="toast-in pointer-events-auto flex w-80 items-start gap-3 rounded-2xl border border-border bg-card p-4 shadow-lift"
            >
              <span className={`mt-0.5 shrink-0 rounded-full p-1.5 ${toast.type === "wellbeing_concern" ? "bg-amber-100 text-amber-700" : "bg-teal-soft text-teal"}`}>
                {toast.type === "wellbeing_concern"
                  ? <AlertTriangle className="h-3.5 w-3.5" />
                  : <Bell className="h-3.5 w-3.5" />}
              </span>
              <div className="min-w-0 flex-1">
                <p className="text-xs font-semibold text-ink">{toast.patientName}</p>
                <p className="mt-0.5 line-clamp-2 text-xs leading-snug text-ink-soft">{toast.message}</p>
                <p className="mt-1 text-[10px] text-muted-foreground">{timeAgo(toast.timestamp)}</p>
              </div>
              <button
                onClick={() => setToasts((prev) => prev.filter((t) => t.id !== toast.id))}
                className="shrink-0 text-ink-soft hover:text-ink"
                aria-label="Dismiss"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

