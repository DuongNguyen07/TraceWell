"use client";

import { useState, useRef, useEffect } from "react";
import Image from "next/image";
import { useSearchParams } from "next/navigation";
import { useSession, signOut } from "next-auth/react";
import { X, ChevronUp, ChevronDown, Check, Wand2, ArrowRight, Camera, Mic, Heart, MessageSquare, Copy, Video, Bell, AlertTriangle } from "lucide-react";
import HealthChart from "./HealthChart";
import FamilyResidentView from "./FamilyResidentView";
import ManagerView from "./ManagerView";



type Baseline = { mood: number; appetite: number; mobility: number; sleep: number };
type WellbeingEntry = Baseline & { timestamp: number };
type Profile = { preferences: string; routine: string; communicationStyle: string };
type Medication = { id: string; name: string; dose: string; frequency: string };


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


type LiveEvent =
  | { type: "care_note"; org: string; notifId: string; patientId: string; patientName: string; authorRole: string; preview: string; noteType: string; timestamp: number; note: CareNote }
  | { type: "wellbeing"; org: string; notifId?: string; patientId: string; patientName: string; authorRole: string; isConcern: boolean; timestamp: number; entry: WellbeingEntry }
  | { type: "chat"; org: string; patientId: string; patientName: string; authorName: string; authorRole: string; preview: string; timestamp: number; message: ChatMessage }
  | { type: "referral"; org: string; notifId: string; patientId: string; patientName: string; authorRole: string; toRecipients: string[]; subject: string; timestamp: number; referral: ReferralNote }
  | { type: "vitals"; org: string; patientId: string; patientName: string; authorRole: string; timestamp: number; vitals: VitalSigns }
  | { type: "ack_referral"; org: string; patientId: string; referralId: string; acknowledgedBy: string; acknowledgedAt: number }
  | { type: "clinical_visit"; org: string; patientId: string; patientName: string; authorRole: string; reason: string; timestamp: number };

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
  toRecipient?: string;  
  referralType: "internal" | "external";
  subject: string;
  message: string;
  timestamp: number;
  acknowledged: boolean;
  acknowledgedBy?: string;
  acknowledgedAt?: number;
  shareCode?: string;
};

type StaffMember = { id: string; name: string; role: string; hapId: string | null; label: string };


type DischargeAudience = "gp" | "patient";

type DischargeSummary = {
  id: string;
  audience: DischargeAudience;
  content: string;
  generatedBy: string;
  timestamp: number;
  
  
  
  
  
  status: "draft" | "finalized";
  finalizedBy?: string;
  finalizedAt?: number;
  
  
  edited?: boolean;
};

const EMPTY_PROFILE: Profile = { preferences: "", routine: "", communicationStyle: "" };


type FallRiskLevel = "Low" | "Medium" | "High";

type FallRiskAssessment = {
  id: string;
  level: FallRiskLevel;
  factors: string[];
  notes: string;
  authorRole: string;
  timestamp: number;
};

const FALL_RISK_FACTORS = [
  "History of falls",
  "Impaired mobility",
  "Medication side effects",
  "Impaired vision",
  "Confusion / cognitive impairment",
  "Environmental hazards",
];

type ScheduleItem = {
  id: string;
  task: string;
  time: string;
  notes?: string;
  authorRole: string;
  timestamp: number;
  done: boolean;
};

type FamilyContact = {
  id: string;
  name: string;
  relationship: string;
  phone: string;
  email?: string;
};

type CarerProfile = {
  name: string;
  qualifications: string;
  phone: string;
  email: string;
};

const EMPTY_CARER_PROFILE: CarerProfile = { name: "", qualifications: "", phone: "", email: "" };



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
  if (diffMinutes <= 1) return "just now";
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
    
  }
}


function mergeDataDicts<T extends { id?: string; timestamp?: number }>(
  local: Record<string, T[]>,
  server: Record<string, T[]>
): Record<string, T[]> {
  const result: Record<string, T[]> = { ...local };
  for (const [patientId, serverItems] of Object.entries(server)) {
    const serverIds = new Set(serverItems.map((x) => x.id).filter(Boolean) as string[]);
    const latestServerTs = serverItems.reduce((max, x) => Math.max(max, x.timestamp ?? 0), 0);
    
    const localNew = (result[patientId] ?? []).filter(
      (x) => x.id && !serverIds.has(x.id) && (x.timestamp ?? 0) > latestServerTs
    );
    result[patientId] = [...serverItems, ...localNew];
  }
  return result;
}


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


function formatVitals(v: VitalSigns): string {
  const parts: string[] = [];
  if (v.systolic !== null && v.diastolic !== null) parts.push(`BP ${v.systolic}/${v.diastolic} mmHg`);
  if (v.heartRate !== null) parts.push(`HR ${v.heartRate} bpm`);
  if (v.temperature !== null) parts.push(`Temp ${v.temperature}°C`);
  if (v.oxygenSaturation !== null) parts.push(`SpO2 ${v.oxygenSaturation}%`);
  if (v.respiratoryRate !== null) parts.push(`RR ${v.respiratoryRate}/min`);
  return parts.length ? parts.join(", ") : "No readings recorded";
}


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

type HealthBadge = { level: "stable" | "risky" | "danger"; reason: string };

function getHealthBadge(
  patient: Patient,
  vitals: VitalSigns[],
  wellbeingHistory: WellbeingEntry[],
): HealthBadge | null {
  if (vitals.length === 0 && wellbeingHistory.length === 0) return null;

  let level: "stable" | "risky" | "danger" = "stable";
  let reason = "";

  const latestVitals = vitals.length > 0
    ? [...vitals].sort((a, b) => b.timestamp - a.timestamp)[0]
    : undefined;
  const latestWellbeing = wellbeingHistory.length > 0
    ? [...wellbeingHistory].sort((a, b) => b.timestamp - a.timestamp)[0]
    : undefined;

  if (latestVitals) {
    const checks: [string, keyof Omit<VitalSigns, "id" | "authorRole" | "timestamp">][] = [
      ["Systolic BP",  "systolic"],
      ["Diastolic BP", "diastolic"],
      ["Heart rate",   "heartRate"],
      ["Temperature",  "temperature"],
      ["SpO₂",         "oxygenSaturation"],
      ["Resp. rate",   "respiratoryRate"],
    ];
    for (const [label, key] of checks) {
      const s = vitalStatus(key, latestVitals[key] as number | null);
      if (s === "concern") {
        level = "danger";
        if (!reason) reason = `${label} out of safe range`;
        break;
      }
      if (s === "caution" && level === "stable") {
        level = "risky";
        if (!reason) reason = `${label} borderline`;
      }
    }
  }

  if (latestWellbeing) {
    const metricLabels: Record<keyof Baseline, string> = {
      mood: "Mood", appetite: "Appetite", mobility: "Mobility", sleep: "Sleep",
    };
    for (const m of ["mood", "appetite", "mobility", "sleep"] as (keyof Baseline)[]) {
      const delta = patient.baseline[m] - latestWellbeing[m];
      if (delta >= 3) {
        level = "danger";
        if (!reason) reason = `${metricLabels[m]} significantly below baseline`;
      } else if (delta >= 2 && level === "stable") {
        level = "risky";
        if (!reason) reason = `${metricLabels[m]} below baseline`;
      }
    }
  }

  return { level, reason: reason || "Within normal range" };
}

const HEALTH_BADGE_STYLE: Record<"stable" | "risky" | "danger", string> = {
  stable: "bg-emerald-100 text-emerald-700",
  risky:  "bg-amber-100 text-amber-700",
  danger: "bg-red-100 text-red-700",
};

function statusColor(status: VitalStatus): string {
  if (status === "concern") return "text-destructive";
  if (status === "caution") return "text-amber-600";
  return "text-ink";
}


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
  
  
  
  
  if (diagnoses && diagnoses.length) {
    const relevant = diagnoses.filter((d) => d.status !== "Resolved");
    if (relevant.length) {
      parts.push(`Diagnoses: ${relevant.map((d) => `${d.condition} (${d.status})`).join("; ")}`);
    }
  }
  return parts.length ? parts.join("\n") : "No personalised profile recorded yet.";
}



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


function buildVitalsTableText(vitals: VitalSigns[]): string {
  if (!vitals.length) return "No vitals recorded during this admission.";
  const sorted = [...vitals].sort((a, b) => a.timestamp - b.timestamp);
  return sorted
    .map((v) => `${formatDateTime(v.timestamp)} — ${formatVitals(v)}`)
    .join("\n");
}


function generateReferralCode(): string {
  const d = new Date();
  const date = `${d.getFullYear()}${String(d.getMonth() + 1).padStart(2, "0")}${String(d.getDate()).padStart(2, "0")}`;
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  const rand = Array.from({ length: 5 }, () => chars[Math.floor(Math.random() * chars.length)]).join("");
  return `REF-${date}-${rand}`;
}


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



type ShiftDef = { key: "morning" | "afternoon" | "night"; label: string; startHour: number; endHour: number };

const SHIFT_DEFS: ShiftDef[] = [
  { key: "morning", label: "Morning", startHour: 6, endHour: 14 },
  { key: "afternoon", label: "Afternoon", startHour: 14, endHour: 22 },
  { key: "night", label: "Night", startHour: 22, endHour: 6 },
];


function getShiftPeriod(timestamp: number): { key: string; label: string } {
  const d = new Date(timestamp);
  const hour = d.getHours();

  
  
  let shift = SHIFT_DEFS.find((s) =>
    s.startHour < s.endHour ? hour >= s.startHour && hour < s.endHour : hour >= s.startHour || hour < s.endHour
  );
  if (!shift) shift = SHIFT_DEFS[2];

  
  
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


function WellbeingSliderInput({ label, value, onChange }: { label: string; value: number; onChange: (newValue: number) => void }) {
  return (
    <div className="flex items-center gap-3">
      <span className="w-20 shrink-0 text-sm text-ink-soft">{label}</span>
      <input type="range" min={1} max={10} value={value} onChange={(e) => onChange(Number(e.target.value))} className="h-2 flex-1 accent-teal" />
      <span className="w-10 shrink-0 text-right text-xs font-medium text-ink">{value}/10</span>
    </div>
  );
}





export default function DashboardView({ role: roleProp, org: orgProp }: { role?: string; org?: string } = {}) {

  const searchParams = useSearchParams();

  
  const { data: session } = useSession();
  
  const org = orgProp ?? searchParams.get("org") ?? session?.user?.org ?? "hospital";
  const role = roleProp ?? searchParams.get("role") ?? (session?.user?.role?.toLowerCase() ?? "staff");
  const staffName = searchParams.get("name") ?? session?.user?.name ?? "";

  const facilityName = org ? FACILITY_NAMES[org] ?? "Unknown facility" : "Unknown facility";
  const label = roleLabel(role, org);
  const displayIdentity = staffName ? `${staffName} (${label})` : label;

  const personLabel = org === "hospital" ? "Patients" : "Residents";
  const personLabelSingular = org === "hospital" ? "patient" : "resident";

  
  
  
  const isFamilyRole  = role === "family" || role === "family_member";
  const isPatientRole = role === "patient";
  const isDoctorRole  = role === "doctor";
  const isManagerRole = role === "manager" || role === "admin";
  const isCarerRole   = role === "carer";
  const isNurseRole   = role === "nurse";

  
  const [hydrated, setHydrated] = useState(false);

  // Family and patient roles must NOT pre-populate from demo data — their list comes from the API filtered by identity.
  const [patients, setPatients] = useState<Patient[]>(() => {
    if (roleProp === "family" || roleProp === "patient") return [];
    return org ? DEMO_PATIENTS[org] ?? [] : [];
  });
  const [wellbeingByPatient, setWellbeingByPatient] = useState<Record<string, WellbeingEntry[]>>({});
  const [notesByPatient, setNotesByPatient] = useState<Record<string, CareNote[]>>({});
  const [reportsByPatient, setReportsByPatient] = useState<Record<string, MedicalReport[]>>({});
  const [referralsByPatient, setReferralsByPatient] = useState<Record<string, ReferralNote[]>>({});
  const [vitalsByPatient, setVitalsByPatient] = useState<Record<string, VitalSigns[]>>({});
  const [diagnosesByPatient, setDiagnosesByPatient] = useState<Record<string, Diagnosis[]>>({});
  const [visitsByPatient, setVisitsByPatient] = useState<Record<string, { authorRole: string; timestamp: number }>>({});
  
  const [dischargeSummariesByPatient, setDischargeSummariesByPatient] = useState<Record<string, DischargeSummary[]>>({});
  const [fallRiskByPatient, setFallRiskByPatient] = useState<Record<string, FallRiskAssessment[]>>({});
  const [scheduleByPatient, setScheduleByPatient] = useState<Record<string, ScheduleItem[]>>({});
  const [familyContactsByPatient, setFamilyContactsByPatient] = useState<Record<string, FamilyContact[]>>({});
  const [carerProfile, setCarerProfile] = useState<CarerProfile>(EMPTY_CARER_PROFILE);
  const [carerProfileOpen, setCarerProfileOpen] = useState(false);
  const [carerProfileDraft, setCarerProfileDraft] = useState<CarerProfile>(EMPTY_CARER_PROFILE);
  
  const [chatMessagesByPatient, setChatMessagesByPatient] = useState<Record<string, ChatMessage[]>>({});
  
  const [staffChatDraft, setStaffChatDraft] = useState("");

  
  const [notifications, setNotifications] = useState<InAppNotification[]>([]);
  const [notifPanelOpen, setNotifPanelOpen] = useState(false);
  
  const [toasts, setToasts] = useState<InAppNotification[]>([]);
  
  const seenNotifIds = useRef<Set<string>>(new Set());
  
  const bcRef = useRef<BroadcastChannel | null>(null);
  
  
  const liveCtxRef = useRef({ isFamilyRole: false, isPatientRole: false, displayIdentity: "", staffName: "", patients: [] as Patient[] });
  
  const [wellbeingAlert, setWellbeingAlert] = useState<{
    patientName: string;
    concerns: { label: string; current: number; baseline: number; delta: number }[];
  } | null>(null);

  const [selectedId, setSelectedId] = useState<string | null>(null);
  const selectedPatient = patients.find((p) => p.id === selectedId);

  
  liveCtxRef.current = { isFamilyRole, isPatientRole, displayIdentity, staffName, patients };

  const patientWellbeingHistory = selectedPatient ? wellbeingByPatient[selectedPatient.id] ?? [] : [];
  const latestCheck = patientWellbeingHistory.length > 0 ? patientWellbeingHistory[patientWellbeingHistory.length - 1] : undefined;

  const patientVitalsHistory = selectedPatient ? vitalsByPatient[selectedPatient.id] ?? [] : [];
  const latestVitals = patientVitalsHistory.length > 0 ? patientVitalsHistory[patientVitalsHistory.length - 1] : undefined;

  
  const [formOpen, setFormOpen] = useState(false);
  const [draft, setDraft] = useState<Baseline>({ mood: 5, appetite: 5, mobility: 5, sleep: 5 });

  
  const [noteDraft, setNoteDraft] = useState("");
  const [pendingImage, setPendingImage] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [captioning, setCaptioning] = useState(false);
  const [captionError, setCaptionError] = useState("");

  
  const [recording, setRecording] = useState(false);
  const [voiceError, setVoiceError] = useState("");
  
  
  
  const recognitionRef = useRef<any>(null);
  
  const [voiceReviewMode, setVoiceReviewMode] = useState(false);

  
  const [cameraMenuOpen, setCameraMenuOpen] = useState(false);
  const [cameraOpen, setCameraOpen] = useState(false);
  const [cameraFor, setCameraFor] = useState<"note" | "report">("note");
  const videoRef = useRef<HTMLVideoElement>(null);
  const cameraStreamRef = useRef<MediaStream | null>(null);

  
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

  const [dischargeLoading, setDischargeLoading] = useState(false);
  const [dischargeError, setDischargeError] = useState("");
  const [editingSummaryId, setEditingSummaryId] = useState<string | null>(null);
  const [editSummaryContent, setEditSummaryContent] = useState("");

  const [addPatientOpen, setAddPatientOpen] = useState(false);
  const [newPatientName, setNewPatientName] = useState("");
  const [newPatientAge, setNewPatientAge] = useState("");
  const [newPatientRoom, setNewPatientRoom] = useState("");

  const [editPatientOpen, setEditPatientOpen] = useState(false);
  const [editWard, setEditWard] = useState("");
  const [editAge, setEditAge] = useState("");

  const [profileEditOpen, setProfileEditOpen] = useState(false);
  const [profileDraft, setProfileDraft] = useState<Profile>(EMPTY_PROFILE);

  const [medFormOpen, setMedFormOpen] = useState(false);
  const [medName, setMedName] = useState("");
  const [medDose, setMedDose] = useState("");
  const [medFrequency, setMedFrequency] = useState("");

  const [expandedShiftKey, setExpandedShiftKey] = useState<string | null>(null);

  const [reportFormOpen, setReportFormOpen] = useState(false);
  const [reportType, setReportType] = useState<ReportType>("Blood Test");
  const [reportTitle, setReportTitle] = useState("");
  const [reportNotes, setReportNotes] = useState("");
  const [reportPendingImage, setReportPendingImage] = useState<string | null>(null);
  const reportFileInputRef = useRef<HTMLInputElement>(null);

  const [referralFormOpen, setReferralFormOpen] = useState(false);
  const [referralRecipients, setReferralRecipients] = useState<string[]>([]);
  const [referralSearchInput, setReferralSearchInput] = useState("");
  const [referralDropdownOpen, setReferralDropdownOpen] = useState(false);
  const [referralType, setReferralType] = useState<"internal" | "external">("internal");
  const [referralSubject, setReferralSubject] = useState("");
  const [referralMessage, setReferralMessage] = useState("");
  const [deleteReferralId, setDeleteReferralId] = useState<string | null>(null);
  const [deleteNoteId, setDeleteNoteId] = useState<string | null>(null);
  const [deleteDiagnosisId, setDeleteDiagnosisId] = useState<string | null>(null);
  const [orgStaff, setOrgStaff] = useState<StaffMember[]>([]);
  
  const [changePwOpen, setChangePwOpen] = useState(false);
  const [changePwCurrent, setChangePwCurrent] = useState("");
  const [changePwNew, setChangePwNew] = useState("");
  const [changePwConfirm, setChangePwConfirm] = useState("");
  const [changePwError, setChangePwError] = useState("");
  const [changePwSuccess, setChangePwSuccess] = useState(false);


  
  
  
  
  const [vitalsFormOpen, setVitalsFormOpen] = useState(false);
  const [vitalsSystolic, setVitalsSystolic] = useState("");
  const [vitalsDiastolic, setVitalsDiastolic] = useState("");
  const [vitalsHeartRate, setVitalsHeartRate] = useState("");
  const [vitalsTemperature, setVitalsTemperature] = useState("");
  const [vitalsOxygenSaturation, setVitalsOxygenSaturation] = useState("");
  const [vitalsRespiratoryRate, setVitalsRespiratoryRate] = useState("");

  
  const [diagnosisFormOpen, setDiagnosisFormOpen] = useState(false);
  const [diagnosisCondition, setDiagnosisCondition] = useState("");
  const [diagnosisStatus, setDiagnosisStatus] = useState<ProblemStatus>("Active");
  const [diagnosisNotes, setDiagnosisNotes] = useState("");

  
  const [fallRiskFormOpen, setFallRiskFormOpen] = useState(false);
  const [fallRiskLevel, setFallRiskLevel] = useState<FallRiskLevel>("Low");
  const [fallRiskFactors, setFallRiskFactors] = useState<string[]>([]);
  const [fallRiskNotes, setFallRiskNotes] = useState("");

  const [scheduleFormOpen, setScheduleFormOpen] = useState(false);
  const [scheduleTask, setScheduleTask] = useState("");
  const [scheduleTime, setScheduleTime] = useState("");
  const [scheduleNotes, setScheduleNotes] = useState("");

  const [familyFormOpen, setFamilyFormOpen] = useState(false);
  const [familyName, setFamilyName] = useState("");
  const [familyRelationship, setFamilyRelationship] = useState("");
  const [familyPhone, setFamilyPhone] = useState("");
  const [familyEmail, setFamilyEmail] = useState("");

  
  
  
  
  
  
  
  
  
  
  
  

  
  useEffect(() => {
    return () => { cameraStreamRef.current?.getTracks().forEach((t) => t.stop()); };
  }, []);

  
  
  useEffect(() => {
    if (cameraOpen && videoRef.current && cameraStreamRef.current) {
      videoRef.current.srcObject = cameraStreamRef.current;
      videoRef.current.play().catch(() => {});
    }
  }, [cameraOpen]);

  
  
  
  useEffect(() => {
    if ((!isFamilyRole && !isPatientRole) || !hydrated || patients.length === 0 || selectedId) return;
    const match = isPatientRole
      ? (patients.find((p) => staffName && p.name.toLowerCase() === staffName.toLowerCase()) ?? patients[0])
      : patients[0];
    
    setSelectedId(match.id);
  }, [isFamilyRole, isPatientRole, hydrated, patients, staffName, selectedId]);

  useEffect(() => {
    if (!org) return;

    
    
    
    setWellbeingByPatient(normalizeWellbeingByPatient(loadFromStorage(`tracewell:${org}:wellbeing`, {})));
    setNotesByPatient(loadFromStorage(`tracewell:${org}:notes`, {}));
    setReportsByPatient(loadFromStorage(`tracewell:${org}:reports`, {}));
    setReferralsByPatient(loadFromStorage(`tracewell:${org}:referrals`, {}));
    setVitalsByPatient(loadFromStorage(`tracewell:${org}:vitals`, {}));
    setDiagnosesByPatient(loadFromStorage(`tracewell:${org}:diagnoses`, {}));
    setDischargeSummariesByPatient(loadFromStorage(`tracewell:${org}:discharge`, {}));
    setChatMessagesByPatient(loadFromStorage(`tracewell:${org}:chat`, {}));
    setFallRiskByPatient(loadFromStorage(`tracewell:${org}:fallrisk`, {}));
    setScheduleByPatient(loadFromStorage(`tracewell:${org}:schedule`, {}));
    setFamilyContactsByPatient(loadFromStorage(`tracewell:${org}:familycontacts`, {}));
    const storedNotifs = loadFromStorage<InAppNotification[]>(`tracewell:${org}:notifications`, []);
    setNotifications(storedNotifs);
    
    storedNotifs.forEach((n) => seenNotifIds.current.add(n.id));

    
    
    
    // Family and patient roles get their list from the API only — localStorage may contain another role's patient cache.
    if (!isFamilyRole && !isPatientRole) {
      const cached = loadFromStorage(`tracewell:${org}:patients`, null);
      if (cached) setPatients((cached as Patient[]).map(normalizePatient));
      else        setPatients((DEMO_PATIENTS[org] ?? []).map(normalizePatient));
    }

    setHydrated(true);

    
    
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
      .catch(() => {  });

    fetch(`/api/staff?org=${org}`)
      .then((r) => r.ok ? r.json() : null)
      .then((data: { staff?: StaffMember[] } | null) => { if (data?.staff) setOrgStaff(data.staff); })
      .catch(() => {});

    fetch(`/api/patients?org=${org}`)
      .then((r) => r.ok ? r.json() : null)
      .then((data: { patients?: Patient[] } | null) => {
        if (data?.patients && data.patients.length > 0) {
          setPatients(data.patients.map(normalizePatient));
        }
      })
      .catch(() => {  });
  }, [org]);

  
  
  
  
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

  
  useEffect(() => {
    if (hydrated && org) saveToStorage(`tracewell:${org}:discharge`, dischargeSummariesByPatient);
  }, [dischargeSummariesByPatient, org, hydrated]);

  useEffect(() => {
    if (hydrated && org) saveToStorage(`tracewell:${org}:chat`, chatMessagesByPatient);
  }, [chatMessagesByPatient, org, hydrated]);

  useEffect(() => {
    if (hydrated && org) saveToStorage(`tracewell:${org}:fallrisk`, fallRiskByPatient);
  }, [fallRiskByPatient, org, hydrated]);

  useEffect(() => {
    if (hydrated && org) saveToStorage(`tracewell:${org}:schedule`, scheduleByPatient);
  }, [scheduleByPatient, org, hydrated]);

  useEffect(() => {
    if (hydrated && org) saveToStorage(`tracewell:${org}:familycontacts`, familyContactsByPatient);
  }, [familyContactsByPatient, org, hydrated]);

  useEffect(() => {
    if (!isCarerRole) return;
    const key = `tracewell:carerProfile:${staffName || "anon"}`;
    setCarerProfile(loadFromStorage(key, EMPTY_CARER_PROFILE));
  }, [isCarerRole, staffName]);

  useEffect(() => {
    if (!isCarerRole || !hydrated) return;
    saveToStorage(`tracewell:carerProfile:${staffName || "anon"}`, carerProfile);
  }, [carerProfile, isCarerRole, staffName, hydrated]);

  useEffect(() => {
    if (hydrated && org) saveToStorage(`tracewell:${org}:notifications`, notifications);
  }, [notifications, org, hydrated]);

  
  
  
  

  function showLiveToast(t: InAppNotification) {
    seenNotifIds.current.add(t.id);
    setToasts((prev) => [...prev, t]);
    setTimeout(() => setToasts((prev) => prev.filter((x) => x.id !== t.id)), 7000);
  }

  
  
  function applyLiveEvent(ev: LiveEvent) {
    const { isFamilyRole, isPatientRole, displayIdentity, staffName, patients } = liveCtxRef.current;

    
    if ((ev as { authorRole?: string }).authorRole === displayIdentity) return;

    
    
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
    } else if (ev.type === "ack_referral") {
      setReferralsByPatient((prev) => {
        const list = prev[ev.patientId] ?? [];
        const updated = { ...prev, [ev.patientId]: list.map((r) =>
          r.id === ev.referralId ? { ...r, acknowledged: true, acknowledgedBy: ev.acknowledgedBy, acknowledgedAt: ev.acknowledgedAt } : r
        ) };
        saveToStorage(`tracewell:${org}:referrals`, updated);
        return updated;
      });
    } else if (ev.type === "clinical_visit") {
      setVisitsByPatient((prev) => {
        const existing = prev[ev.patientId];
        if (existing && existing.timestamp >= ev.timestamp) return prev;
        return { ...prev, [ev.patientId]: { authorRole: ev.authorRole, timestamp: ev.timestamp } };
      });
    }

    
    
    const notifId = (ev as { notifId?: string }).notifId;
    if (notifId) seenNotifIds.current.add(notifId);

    
    const myPatientIds = new Set(patients.map((p) => p.id));

    if (isFamilyRole || isPatientRole) {
      
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

      const _ts = (ev as { timestamp?: number }).timestamp ?? Date.now();
      const liveNotif: InAppNotification = {
        id: `live-${ev.type}-${_ts}`,
        patientId: ev.patientId, patientName: (ev as { patientName?: string }).patientName ?? "",
        message, type: notifType, authorRole: (ev as { authorRole?: string }).authorRole ?? "",
        timestamp: _ts, read: false,
      };
      seenNotifIds.current.add(liveNotif.id);
      
      setNotifications((prev) =>
        prev.some((n) => n.id === liveNotif.id) ? prev : [liveNotif, ...prev]
      );
      showLiveToast(liveNotif);
    } else {
      
      let message = "";
      let notifType: NotifType = "care_update";
      if (ev.type === "care_note") {
        const noteType = (ev as Extract<LiveEvent, { type: "care_note" }>).noteType;
        if (noteType === "family_update") return;
        message = `${ev.authorRole} logged on ${ev.patientName}: "${ev.preview}"`;
      } else if (ev.type === "referral") {
        // Only notify if this user is a named recipient (sender is already filtered above).
        // If staffName is unknown (no session/URL param), show to all staff as fallback.
        if (staffName && !ev.toRecipients.some((rec) => rec.toLowerCase().includes(staffName.toLowerCase()))) return;
        message = `New referral for ${ev.patientName} from ${ev.authorRole}`;
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

      const _ts2 = (ev as { timestamp?: number }).timestamp ?? Date.now();
      const liveNotif: InAppNotification = {
        id: `live-${ev.type}-${_ts2}`,
        patientId: ev.patientId, patientName: (ev as { patientName?: string }).patientName ?? "",
        message, type: notifType, authorRole: (ev as { authorRole?: string }).authorRole ?? "",
        timestamp: _ts2, read: false,
      };
      seenNotifIds.current.add(liveNotif.id);
      setNotifications((prev) =>
        prev.some((n) => n.id === liveNotif.id) ? prev : [liveNotif, ...prev]
      );
      showLiveToast(liveNotif);
    }
  }

  
  
  
  useEffect(() => {
    if (!org || !hydrated) return;

    const k = (s: string) => `tracewell:${org}:${s}`;

    
    
    
    if (typeof BroadcastChannel !== "undefined") {
      const bc = new BroadcastChannel("tracewell-live");
      bcRef.current = bc;
      bc.onmessage = (e: MessageEvent<LiveEvent>) => {
        if (e.data?.org === org) applyLiveEvent(e.data);
      };
    }

    
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
  
  
  }, [org, hydrated]);

  
  
  
  
  useEffect(() => {
    if (!org || !hydrated) return;

    const es = new EventSource(`/api/live?org=${encodeURIComponent(org)}`);

    es.onmessage = (e: MessageEvent<string>) => {
      if (!e.data?.trim() || e.data.trim().startsWith(":")) return;
      try {
        const ev = JSON.parse(e.data) as LiveEvent;
        if (ev.org === org) applyLiveEvent(ev);
      } catch {  }
    };

    es.onerror = () => {
    };

    return () => es.close();
  
  
  }, [org, hydrated]);

  
  
  
  useEffect(() => {
    if (!hydrated) return;

    const unseen = notifications.filter((n) => !seenNotifIds.current.has(n.id));
    if (unseen.length === 0) return;

    
    unseen.forEach((n) => seenNotifIds.current.add(n.id));

    const visiblePatientIds = new Set(patients.map((p) => p.id));
    const toShow = unseen.filter((n) => {
      if (n.authorRole === displayIdentity) return false; 
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

  
  
  

  const patientNotes = selectedPatient ? notesByPatient[selectedPatient.id] ?? [] : [];
  const sortedNotes = [...patientNotes].sort((a, b) => b.timestamp - a.timestamp);

  
  const visibleNotes = [...patientNotes]
    .filter((n) => !n.sensitive)
    .sort((a, b) => b.timestamp - a.timestamp);

  
  const lastClinicalActivity: { authorRole: string; timestamp: number } | undefined = (() => {
    if (!selectedPatient) return undefined;
    const pid = selectedPatient.id;
    const candidates: { authorRole: string; timestamp: number }[] = [];

    // Care notes by clinical staff
    const clinicalNote = visibleNotes.find((n) => /\b(Nurse|Carer|Doctor)\b/.test(n.authorRole));
    if (clinicalNote) candidates.push({ authorRole: clinicalNote.authorRole, timestamp: clinicalNote.timestamp });

    // Vital signs
    const latestVital = [...(vitalsByPatient[pid] ?? [])].sort((a, b) => b.timestamp - a.timestamp)[0];
    if (latestVital?.authorRole) candidates.push({ authorRole: latestVital.authorRole, timestamp: latestVital.timestamp });

    // Wellbeing checks (authorRole not stored in entry — falls back to "Care team" label)
    const latestWellbeing = [...(wellbeingByPatient[pid] ?? [])].sort((a, b) => b.timestamp - a.timestamp)[0];
    if (latestWellbeing) candidates.push({ authorRole: "Care team", timestamp: latestWellbeing.timestamp });

    // Diagnoses (doctor adds/updates a diagnosis)
    const latestDiagnosis = [...(diagnosesByPatient[pid] ?? [])]
      .filter((d) => d.timestamp && d.authorRole)
      .sort((a, b) => (b.timestamp ?? 0) - (a.timestamp ?? 0))[0];
    if (latestDiagnosis?.authorRole && latestDiagnosis?.timestamp) {
      candidates.push({ authorRole: latestDiagnosis.authorRole, timestamp: latestDiagnosis.timestamp });
    }

    // Profile / medication updates (broadcast as clinical_visit event)
    const visit = visitsByPatient[pid];
    if (visit) candidates.push(visit);

    return candidates.sort((a, b) => b.timestamp - a.timestamp)[0];
  })();

  
  
  const shiftGroups = groupNotesByShift(
    patientNotes.filter((n) => n.type === "text" || n.type === "image" || n.type === "voice")
  );


  const patientReports = selectedPatient ? reportsByPatient[selectedPatient.id] ?? [] : [];
  const sortedReports = [...patientReports].sort((a, b) => b.timestamp - a.timestamp);

  const patientReferrals = selectedPatient ? referralsByPatient[selectedPatient.id] ?? [] : [];
  const visibleReferrals = patientReferrals.filter((r) => {
    if (isManagerRole || !staffName) return true;
    const isSender   = r.fromName.includes(staffName);
    const isReceiver = (r.toRecipients ?? []).some((rec) => rec.includes(staffName));
    return isSender || isReceiver;
  });
  const sortedReferrals = [...visibleReferrals].sort((a, b) => b.timestamp - a.timestamp);

  const sortedVitals = [...patientVitalsHistory].sort((a, b) => b.timestamp - a.timestamp);

  
  
  
  const patientDiagnoses = selectedPatient ? diagnosesByPatient[selectedPatient.id] ?? [] : [];
  const sortedDiagnoses = [...patientDiagnoses].sort((a, b) => {
    const rank = (s: ProblemStatus) => (s === "Resolved" ? 1 : 0);
    const rankDiff = rank(a.status) - rank(b.status);
    return rankDiff !== 0 ? rankDiff : b.timestamp - a.timestamp;
  });

  
  const patientDischargeSummaries = selectedPatient ? dischargeSummariesByPatient[selectedPatient.id] ?? [] : [];
  const sortedDischargeSummaries = [...patientDischargeSummaries].sort((a, b) => b.timestamp - a.timestamp);

  
  
  

  
  
  
  
  
  function broadcast(event: LiveEvent) {
    bcRef.current?.postMessage(event);
    fetch("/api/broadcast", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(event),
    }).catch(() => {});
  }

  
  
  

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

  
  
  

  function openForm() {
    if (!selectedPatient) return;
    setDraft(latestCheck ?? selectedPatient.baseline);
    setFormOpen(true);
  }

  
  
  
  function saveWellbeingCheck() {
    if (!selectedPatient) return;
    const newEntry: WellbeingEntry = { ...draft, timestamp: Date.now() };
    const updatedWellbeing = {
      ...wellbeingByPatient,
      [selectedPatient.id]: [...(wellbeingByPatient[selectedPatient.id] ?? []), newEntry],
    };
    setWellbeingByPatient(updatedWellbeing);
    
    if (org) saveToStorage(`tracewell:${org}:wellbeing`, updatedWellbeing);
    setFormOpen(false);

    
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

  
  
  

  async function handleImageSelect(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    const dataUrl = await fileToDataUrl(file);
    setPendingImage(dataUrl);
  }

  function startVoice() {
    
    const SpeechRecognitionClass = (window as any).webkitSpeechRecognition || (window as any).SpeechRecognition;
    if (!SpeechRecognitionClass) {
      setVoiceError("Voice input isn't supported in this browser — try Chrome, or type the note instead.");
      return;
    }
    setVoiceError("");
    setVoiceReviewMode(false);

    
    
    navigator.mediaDevices?.getUserMedia({
      audio: { noiseSuppression: true, echoCancellation: true, autoGainControl: true },
    }).then((s) => s.getTracks().forEach((t) => t.stop())).catch(() => {});

    const recognition = new SpeechRecognitionClass();
    recognition.continuous = true;
    recognition.interimResults = true;
    recognition.lang = "en-AU";
    recognition.onresult = (event: any) => { 
      let transcript = "";
      for (let i = 0; i < event.results.length; i++) transcript += event.results[i][0].transcript;
      setNoteDraft(transcript);
    };
    
    
    recognition.onend = () => {
      setRecording(false);
      setVoiceReviewMode(true);
    };
    
    
    recognition.onerror = (event: any) => { 
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

  
  
  

  async function openCamera() {
    setCameraMenuOpen(false);
    if (!navigator.mediaDevices?.getUserMedia) {
      setCaptionError("Camera not available in this browser. Use 'Upload' instead.");
      return;
    }
    try {
      
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
      
      
    } catch {
      setCaptionError("Camera access was denied. Tap 'Upload' to choose a photo from your device instead.");
    }
  }

  function capturePhoto() {
    const video = videoRef.current;
    
    
    if (!video || video.readyState < 2 || !video.videoWidth) return;
    const canvas = document.createElement("canvas");
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    canvas.getContext("2d")?.drawImage(video, 0, 0);
    const dataUrl = canvas.toDataURL("image/jpeg", 0.85);
    if (cameraFor === "report") setReportPendingImage(dataUrl);
    else setPendingImage(dataUrl);
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
    
    if (org) saveToStorage(`tracewell:${org}:notes`, updatedNotes);

    
    const noteNotifId = crypto.randomUUID();
    broadcast({
      type: "care_note", org, notifId: noteNotifId,
      patientId: selectedPatient.id, patientName: selectedPatient.name,
      authorRole: displayIdentity, preview: newNote.content.slice(0, 100),
      noteType: newNote.type, timestamp: newNote.timestamp,
      note: newNote,
    });

    
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
    setDeleteNoteId(noteId);
  }

  function confirmDeleteNote(noteId: string) {
    if (!selectedPatient) return;
    setNotesByPatient((prev) => ({
      ...prev,
      [selectedPatient.id]: (prev[selectedPatient.id] ?? []).filter((n) => n.id !== noteId),
    }));
  }

  
  
  

  
  
  
  
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
  
  
  function startEditingSummary(summary: DischargeSummary) {
    setEditingSummaryId(summary.id);
    setEditSummaryContent(summary.content);
  }

  function cancelEditingSummary() {
    setEditingSummaryId(null);
    setEditSummaryContent("");
  }

  
  
  
  
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
    const now = Date.now();
    setVisitsByPatient((prev) => ({ ...prev, [selectedPatient.id]: { authorRole: displayIdentity, timestamp: now } }));
    broadcast({ type: "clinical_visit", org, patientId: selectedPatient.id, patientName: selectedPatient.name, authorRole: displayIdentity, reason: "profile_update", timestamp: now });
  }

  function addMedication() {
    if (!selectedPatient || !medName.trim()) return;
    const newMed: Medication = { id: crypto.randomUUID(), name: medName.trim(), dose: medDose.trim(), frequency: medFrequency.trim() };
    setPatients((prev) => prev.map((p) => (p.id === selectedPatient.id ? { ...p, medications: [...p.medications, newMed] } : p)));
    setMedName("");
    setMedDose("");
    setMedFrequency("");
    setMedFormOpen(false);
    const now = Date.now();
    setVisitsByPatient((prev) => ({ ...prev, [selectedPatient.id]: { authorRole: displayIdentity, timestamp: now } }));
    broadcast({ type: "clinical_visit", org, patientId: selectedPatient.id, patientName: selectedPatient.name, authorRole: displayIdentity, reason: "medication_update", timestamp: now });
  }

  function removeMedication(medId: string) {
    if (!selectedPatient) return;
    setPatients((prev) => prev.map((p) => (p.id === selectedPatient.id ? { ...p, medications: p.medications.filter((m) => m.id !== medId) } : p)));
    const now = Date.now();
    setVisitsByPatient((prev) => ({ ...prev, [selectedPatient.id]: { authorRole: displayIdentity, timestamp: now } }));
    broadcast({ type: "clinical_visit", org, patientId: selectedPatient.id, patientName: selectedPatient.name, authorRole: displayIdentity, reason: "medication_update", timestamp: now });
  }

  
  
  
  
  
  
  

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

  
  
  
  
  
  
  

  function addReferral() {
    if (!selectedPatient || referralRecipients.length === 0 || !referralSubject.trim()) return;

    const newReferral: ReferralNote = {
      id: crypto.randomUUID(),
      shareCode: referralType === "internal" ? generateReferralCode() : undefined,
      fromName: displayIdentity,
      toRecipient: referralRecipients[0] ?? "",
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
    setReferralSearchInput("");
    setReferralDropdownOpen(false);
    setReferralType("internal");
    setReferralSubject("");
    setReferralMessage("");
    setReferralFormOpen(false);
  }

  function acknowledgeReferral(referralId: string) {
    if (!selectedPatient) return;
    const now = Date.now();
    setReferralsByPatient((prev) => {
      const updated = {
        ...prev,
        [selectedPatient.id]: (prev[selectedPatient.id] ?? []).map((r) =>
          r.id === referralId ? { ...r, acknowledged: true, acknowledgedBy: displayIdentity, acknowledgedAt: now } : r
        ),
      };
      if (org) saveToStorage(`tracewell:${org}:referrals`, updated);
      return updated;
    });
    broadcast({ type: "ack_referral", org, patientId: selectedPatient.id, referralId, acknowledgedBy: displayIdentity, acknowledgedAt: now });
  }

  function confirmDeleteReferral(referralId: string) {
    if (!selectedPatient) return;
    setReferralsByPatient((prev) => {
      const updated = { ...prev, [selectedPatient.id]: (prev[selectedPatient.id] ?? []).filter((r) => r.id !== referralId) };
      if (org) saveToStorage(`tracewell:${org}:referrals`, updated);
      return updated;
    });
    setDeleteReferralId(null);
  }

  function deleteReferral(referralId: string) {
    setDeleteReferralId(referralId);
  }

  
  
  

  async function changePassword() {
    if (!changePwNew || changePwNew !== changePwConfirm) {
      setChangePwError("New passwords do not match.");
      return;
    }
    if (changePwNew.length < 8) {
      setChangePwError("Password must be at least 8 characters.");
      return;
    }
    setChangePwError("");
    const res = await fetch("/api/change-password", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ currentPassword: changePwCurrent, newPassword: changePwNew }),
    });
    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      setChangePwError((data as { error?: string }).error ?? "Failed to change password.");
      return;
    }
    setChangePwSuccess(true);
    setChangePwCurrent(""); setChangePwNew(""); setChangePwConfirm("");
    setTimeout(() => { setChangePwOpen(false); setChangePwSuccess(false); }, 2000);
  }

  
  
  
  
  
  
  

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
    setDeleteDiagnosisId(diagnosisId);
  }

  function confirmDeleteDiagnosis(diagnosisId: string) {
    if (!selectedPatient) return;
    setDiagnosesByPatient((prev) => ({
      ...prev,
      [selectedPatient.id]: (prev[selectedPatient.id] ?? []).filter((d) => d.id !== diagnosisId),
    }));
  }

  

  function toggleFallRiskFactor(factor: string) {
    setFallRiskFactors((prev) => (prev.includes(factor) ? prev.filter((f) => f !== factor) : [...prev, factor]));
  }

  function saveFallRiskAssessment() {
    if (!selectedPatient) return;
    const entry: FallRiskAssessment = {
      id: crypto.randomUUID(),
      level: fallRiskLevel,
      factors: fallRiskFactors,
      notes: fallRiskNotes.trim(),
      authorRole: displayIdentity,
      timestamp: Date.now(),
    };
    setFallRiskByPatient((prev) => ({ ...prev, [selectedPatient.id]: [...(prev[selectedPatient.id] ?? []), entry] }));
    setFallRiskFormOpen(false);
    setFallRiskLevel("Low");
    setFallRiskFactors([]);
    setFallRiskNotes("");
  }

  function deleteFallRiskAssessment(assessmentId: string) {
    if (!selectedPatient) return;
    setFallRiskByPatient((prev) => ({
      ...prev,
      [selectedPatient.id]: (prev[selectedPatient.id] ?? []).filter((f) => f.id !== assessmentId),
    }));
  }

  function fallRiskBadgeStyle(level: FallRiskLevel): string {
    if (level === "High") return "bg-red-50 text-destructive";
    if (level === "Medium") return "bg-amber-100 text-amber-800";
    return "bg-teal-soft text-teal";
  }

  function addScheduleItem() {
    if (!selectedPatient || !scheduleTask.trim()) return;
    const entry: ScheduleItem = {
      id: crypto.randomUUID(),
      task: scheduleTask.trim(),
      time: scheduleTime.trim(),
      notes: scheduleNotes.trim() || undefined,
      authorRole: displayIdentity,
      timestamp: Date.now(),
      done: false,
    };
    setScheduleByPatient((prev) => ({
      ...prev,
      [selectedPatient.id]: [...(prev[selectedPatient.id] ?? []), entry].sort((a, b) => a.time.localeCompare(b.time)),
    }));
    setScheduleFormOpen(false);
    setScheduleTask("");
    setScheduleTime("");
    setScheduleNotes("");
  }

  function removeScheduleItem(itemId: string) {
    if (!selectedPatient) return;
    setScheduleByPatient((prev) => ({
      ...prev,
      [selectedPatient.id]: (prev[selectedPatient.id] ?? []).filter((s) => s.id !== itemId),
    }));
  }

  function toggleScheduleDone(itemId: string) {
    if (!selectedPatient) return;
    setScheduleByPatient((prev) => ({
      ...prev,
      [selectedPatient.id]: (prev[selectedPatient.id] ?? []).map((s) => (s.id === itemId ? { ...s, done: !s.done } : s)),
    }));
  }

  function addFamilyContact() {
    if (!selectedPatient || !familyName.trim()) return;
    const entry: FamilyContact = {
      id: crypto.randomUUID(),
      name: familyName.trim(),
      relationship: familyRelationship.trim(),
      phone: familyPhone.trim(),
      email: familyEmail.trim() || undefined,
    };
    setFamilyContactsByPatient((prev) => ({ ...prev, [selectedPatient.id]: [...(prev[selectedPatient.id] ?? []), entry] }));
    setFamilyFormOpen(false);
    setFamilyName("");
    setFamilyRelationship("");
    setFamilyPhone("");
    setFamilyEmail("");
  }

  function removeFamilyContact(contactId: string) {
    if (!selectedPatient) return;
    setFamilyContactsByPatient((prev) => ({
      ...prev,
      [selectedPatient.id]: (prev[selectedPatient.id] ?? []).filter((c) => c.id !== contactId),
    }));
  }

  function openCarerProfile() {
    setCarerProfileDraft(carerProfile);
    setCarerProfileOpen(true);
  }

  function saveCarerProfile() {
    setCarerProfile(carerProfileDraft);
    setCarerProfileOpen(false);
  }

  function statusBadgeStyle(status: ProblemStatus): string {
    if (status === "Active") return "bg-amber-100 text-amber-800";
    if (status === "Chronic") return "bg-secondary text-ink";
    return "bg-teal-soft text-teal";
  }

  
  
  
  function audienceLabel(audience: DischargeAudience): string {
    return audience === "gp" ? "GP Summary" : "Patient Summary";
  }

  function audienceBadgeStyle(audience: DischargeAudience): string {
    return audience === "gp" ? "bg-secondary text-ink" : "bg-teal-soft text-teal";
  }

  function handleSignOut() {
    signOut({ callbackUrl: "/" });
  }

  
  
  

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

            
            <div className="relative">
              <button
                onClick={() => {
                  setNotifPanelOpen((o) => !o);
                  
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

            {isCarerRole && (
              <button onClick={openCarerProfile} className="rounded-full border border-border px-4 py-2 text-sm text-ink-soft hover:bg-secondary">
                My profile
              </button>
            )}

            <button onClick={handleSignOut} className="rounded-full px-4 py-2 text-sm text-ink-soft hover:bg-secondary">
              Sign out
            </button>
          </div>
        </div>
      </header>

      
      {isManagerRole ? (
        <ManagerView
          patients={patients}
          notesByPatient={notesByPatient}
          wellbeingByPatient={wellbeingByPatient}
          vitalsByPatient={vitalsByPatient}
          diagnosesByPatient={diagnosesByPatient}
          referralsByPatient={referralsByPatient}
          fallRiskByPatient={fallRiskByPatient}
          org={org}
        />
      ) : isPatientRole ? (
        
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
              lastClinicalActivity={lastClinicalActivity}
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
              const healthBadge = getHealthBadge(p, vitalsByPatient[p.id] ?? [], wellbeingByPatient[p.id] ?? []);
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
                    setFallRiskFormOpen(false);
                    setScheduleFormOpen(false);
                    setFamilyFormOpen(false);
                  }}
                  className={`rounded-lg px-3 py-2 text-left transition-colors ${isSelected ? "bg-teal-soft" : "hover:bg-secondary"}`}
                >
                  <div className="flex items-center justify-between gap-1">
                    <div className="text-sm font-medium text-ink">{p.name}</div>
                    {healthBadge && (
                      <span
                        title={healthBadge.reason}
                        className={`shrink-0 rounded-full px-2 py-0.5 text-[10px] font-semibold capitalize ${HEALTH_BADGE_STYLE[healthBadge.level]}`}
                      >
                        {healthBadge.level}
                      </span>
                    )}
                  </div>
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
                lastClinicalActivity={lastClinicalActivity}
              />
            ) : (
              <div>
                <div className="flex items-center gap-3">
                  <h1 className="text-2xl">{selectedPatient.name}</h1>
                  {(() => {
                    const badge = getHealthBadge(selectedPatient, patientVitalsHistory, patientWellbeingHistory);
                    if (!badge) return null;
                    return (
                      <span
                        title={badge.reason}
                        className={`rounded-full px-3 py-1 text-xs font-semibold capitalize ${HEALTH_BADGE_STYLE[badge.level]}`}
                      >
                        {badge.level}
                      </span>
                    );
                  })()}
                </div>
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

                {(isCarerRole || (org === "agedcare" && (isNurseRole || isDoctorRole))) && (() => {
                  const fallRiskHistory = fallRiskByPatient[selectedPatient.id] ?? [];
                  const latestFallRisk = fallRiskHistory.length > 0 ? fallRiskHistory[fallRiskHistory.length - 1] : undefined;
                  const scheduleItems = [...(scheduleByPatient[selectedPatient.id] ?? [])].sort((a, b) => a.time.localeCompare(b.time));
                  const familyContacts = familyContactsByPatient[selectedPatient.id] ?? [];
                  return (
                    <>
                      
                      <div className="mt-6 rounded-xl border border-border bg-background p-4">
                        <div className="mb-3 flex items-center justify-between">
                          <span className="text-sm font-semibold text-ink">Fall risk</span>
                          {!fallRiskFormOpen && (
                            <button onClick={() => setFallRiskFormOpen(true)} className="text-xs font-medium text-teal hover:underline">+ New assessment</button>
                          )}
                        </div>
                        {fallRiskFormOpen && (
                          <div className="mb-4 flex flex-col gap-3 rounded-lg border border-border p-3">
                            <div className="flex flex-col gap-1">
                              <label className="text-xs text-muted-foreground">Risk level</label>
                              <div className="flex gap-2">
                                {(["Low", "Medium", "High"] as FallRiskLevel[]).map((lvl) => (
                                  <button key={lvl} onClick={() => setFallRiskLevel(lvl)}
                                    className={`rounded-full px-3 py-1.5 text-xs font-medium ${fallRiskLevel === lvl ? fallRiskBadgeStyle(lvl) : "bg-secondary text-ink-soft"}`}>
                                    {lvl}
                                  </button>
                                ))}
                              </div>
                            </div>
                            <div className="flex flex-col gap-1">
                              <label className="text-xs text-muted-foreground">Contributing factors</label>
                              <div className="flex flex-wrap gap-1.5">
                                {FALL_RISK_FACTORS.map((factor) => (
                                  <button key={factor} onClick={() => toggleFallRiskFactor(factor)}
                                    className={`rounded-full px-2.5 py-1 text-xs ${fallRiskFactors.includes(factor) ? "bg-teal-soft text-teal" : "bg-secondary text-ink-soft"}`}>
                                    {factor}
                                  </button>
                                ))}
                              </div>
                            </div>
                            <textarea value={fallRiskNotes} onChange={(e) => setFallRiskNotes(e.target.value)} rows={2}
                              placeholder="Additional notes (optional)"
                              className="resize-none rounded-lg border border-border px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-ring" />
                            <div className="flex gap-2">
                              <button onClick={saveFallRiskAssessment} className="rounded-full bg-primary px-4 py-2 text-sm font-medium text-primary-foreground">Save assessment</button>
                              <button onClick={() => setFallRiskFormOpen(false)} className="rounded-full px-4 py-2 text-sm text-ink-soft hover:bg-secondary">Cancel</button>
                            </div>
                          </div>
                        )}
                        {latestFallRisk ? (
                          <div>
                            <div className="flex items-center gap-2">
                              <span className={`rounded-full px-2.5 py-1 text-xs font-semibold ${fallRiskBadgeStyle(latestFallRisk.level)}`}>{latestFallRisk.level} risk</span>
                              <span className="text-xs text-muted-foreground">{formatDateTime(latestFallRisk.timestamp)} · {latestFallRisk.authorRole}</span>
                            </div>
                            {latestFallRisk.factors.length > 0 && <p className="mt-2 text-sm text-ink">{latestFallRisk.factors.join(", ")}</p>}
                            {latestFallRisk.notes && <p className="mt-1 text-sm text-ink-soft">{latestFallRisk.notes}</p>}
                            {fallRiskHistory.length > 1 && (
                              <details className="mt-3">
                                <summary className="cursor-pointer text-xs font-medium text-teal">
                                  View {fallRiskHistory.length - 1} earlier assessment{fallRiskHistory.length - 1 !== 1 ? "s" : ""}
                                </summary>
                                <div className="mt-2 flex flex-col gap-2">
                                  {[...fallRiskHistory].reverse().slice(1).map((f) => (
                                    <div key={f.id} className="flex items-center justify-between rounded-lg bg-secondary px-3 py-2">
                                      <div>
                                        <div className="text-xs text-muted-foreground">{formatDateTime(f.timestamp)} · {f.authorRole}</div>
                                        <span className={`mt-1 inline-block rounded-full px-2 py-0.5 text-xs font-medium ${fallRiskBadgeStyle(f.level)}`}>{f.level}</span>
                                      </div>
                                      <button onClick={() => deleteFallRiskAssessment(f.id)} className="text-xs text-muted-foreground hover:text-destructive"><X size={12} /></button>
                                    </div>
                                  ))}
                                </div>
                              </details>
                            )}
                          </div>
                        ) : (
                          <p className="text-sm text-ink-soft">No fall risk assessment recorded yet.</p>
                        )}
                      </div>

                      
                      <div className="mt-6 rounded-xl border border-border bg-background p-4">
                        <div className="mb-3 flex items-center justify-between">
                          <span className="text-sm font-semibold text-ink">Care schedule</span>
                          {!scheduleFormOpen && (
                            <button onClick={() => setScheduleFormOpen(true)} className="text-xs font-medium text-teal hover:underline">+ Add task</button>
                          )}
                        </div>
                        {scheduleFormOpen && (
                          <div className="mb-4 flex flex-col gap-3 rounded-lg border border-border p-3">
                            <div className="grid grid-cols-2 gap-3">
                              <input value={scheduleTime} onChange={(e) => setScheduleTime(e.target.value)} type="time"
                                className="rounded-lg border border-border px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-ring" />
                              <input value={scheduleTask} onChange={(e) => setScheduleTask(e.target.value)}
                                onKeyDown={(e) => e.key === "Enter" && addScheduleItem()}
                                placeholder="Task, e.g. Assist with shower"
                                className="rounded-lg border border-border px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-ring" />
                            </div>
                            <input value={scheduleNotes} onChange={(e) => setScheduleNotes(e.target.value)} placeholder="Notes (optional)"
                              className="rounded-lg border border-border px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-ring" />
                            <div className="flex gap-2">
                              <button onClick={addScheduleItem} className="rounded-full bg-primary px-4 py-2 text-sm font-medium text-primary-foreground">Add to schedule</button>
                              <button onClick={() => setScheduleFormOpen(false)} className="rounded-full px-4 py-2 text-sm text-ink-soft hover:bg-secondary">Cancel</button>
                            </div>
                          </div>
                        )}
                        {scheduleItems.length > 0 ? (
                          <div className="flex flex-col gap-2">
                            {scheduleItems.map((s) => (
                              <div key={s.id} className={`flex items-center justify-between rounded-lg px-3 py-2 ${s.done ? "bg-teal-soft" : "bg-secondary"}`}>
                                <button onClick={() => toggleScheduleDone(s.id)} className="flex flex-1 items-center gap-3 text-left">
                                  <span className={`flex h-4 w-4 shrink-0 items-center justify-center rounded-full border ${s.done ? "border-teal bg-teal text-white" : "border-border"}`}>
                                    {s.done && <Check size={10} />}
                                  </span>
                                  <div className="min-w-0">
                                    <div className={`text-sm ${s.done ? "text-ink-soft line-through" : "text-ink"}`}>
                                      {s.time && <span className="font-medium">{s.time} · </span>}{s.task}
                                    </div>
                                    {s.notes && <div className="text-xs text-muted-foreground">{s.notes}</div>}
                                  </div>
                                </button>
                                <button onClick={() => removeScheduleItem(s.id)} className="shrink-0 text-xs text-muted-foreground hover:text-destructive"><X size={12} /></button>
                              </div>
                            ))}
                          </div>
                        ) : (
                          <p className="text-sm text-ink-soft">No scheduled tasks yet.</p>
                        )}
                      </div>

                      
                      <div className="mt-6 rounded-xl border border-border bg-background p-4">
                        <div className="mb-3 flex items-center justify-between">
                          <span className="text-sm font-semibold text-ink">Family details</span>
                          {!familyFormOpen && (
                            <button onClick={() => setFamilyFormOpen(true)} className="text-xs font-medium text-teal hover:underline">+ Add family member</button>
                          )}
                        </div>
                        {familyFormOpen && (
                          <div className="mb-4 flex flex-col gap-3 rounded-lg border border-border p-3">
                            <div className="grid grid-cols-2 gap-3">
                              <input value={familyName} onChange={(e) => setFamilyName(e.target.value)} placeholder="Full name"
                                className="rounded-lg border border-border px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-ring" />
                              <input value={familyRelationship} onChange={(e) => setFamilyRelationship(e.target.value)} placeholder="Relationship, e.g. Daughter"
                                className="rounded-lg border border-border px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-ring" />
                              <input value={familyPhone} onChange={(e) => setFamilyPhone(e.target.value)} placeholder="Phone"
                                className="rounded-lg border border-border px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-ring" />
                              <input value={familyEmail} onChange={(e) => setFamilyEmail(e.target.value)}
                                onKeyDown={(e) => e.key === "Enter" && addFamilyContact()}
                                placeholder="Email (optional)"
                                className="rounded-lg border border-border px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-ring" />
                            </div>
                            <div className="flex gap-2">
                              <button onClick={addFamilyContact} className="rounded-full bg-primary px-4 py-2 text-sm font-medium text-primary-foreground">Save contact</button>
                              <button onClick={() => setFamilyFormOpen(false)} className="rounded-full px-4 py-2 text-sm text-ink-soft hover:bg-secondary">Cancel</button>
                            </div>
                          </div>
                        )}
                        {familyContacts.length > 0 ? (
                          <div className="flex flex-col gap-2">
                            {familyContacts.map((c) => (
                              <div key={c.id} className="flex items-center justify-between rounded-lg bg-secondary px-3 py-2">
                                <div>
                                  <div className="text-sm font-medium text-ink">{c.name} <span className="font-normal text-ink-soft">· {c.relationship}</span></div>
                                  <div className="text-xs text-muted-foreground">{c.phone}{c.email ? ` · ${c.email}` : ""}</div>
                                </div>
                                <button onClick={() => removeFamilyContact(c.id)} className="text-xs text-muted-foreground hover:text-destructive"><X size={12} /></button>
                              </div>
                            ))}
                          </div>
                        ) : (
                          <p className="text-sm text-ink-soft">No family details recorded yet.</p>
                        )}
                      </div>
                    </>
                  );
                })()}

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
                          
                          <img src={reportPendingImage} alt="Report attachment" className="h-12 w-12 rounded object-cover" />
                          <span className="flex-1 text-xs text-ink">Image attached.</span>
                          <button onClick={() => setReportPendingImage(null)} className="text-xs text-ink-soft hover:text-ink">Remove</button>
                        </div>
                      )}

                      <div className="flex items-center gap-2">
                        <input ref={reportFileInputRef} type="file" accept="image/*" onChange={handleReportImageSelect} className="hidden" />
                        <button
                          onClick={() => { setCameraFor("report"); openCamera(); }}
                          className="rounded-lg border border-border px-3 py-2 text-sm text-ink-soft hover:bg-secondary"
                          title="Take a photo of the scan or report"
                        >
                          <Camera size={12} className="mr-1 inline" /> Take photo
                        </button>
                        <button
                          onClick={() => reportFileInputRef.current?.click()}
                          className="rounded-lg border border-border px-3 py-2 text-sm text-ink-soft hover:bg-secondary"
                          title="Attach an image of the report/scan"
                        >
                          <Camera size={12} className="mr-1 inline" /> Upload
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
                      
                      <div className="flex gap-1 rounded-full bg-secondary p-0.5 w-fit">
                        {(["internal", "external"] as const).map((t) => (
                          <button key={t} onClick={() => setReferralType(t)}
                            className={`rounded-full px-3 py-1 text-xs font-medium capitalize transition-colors ${referralType === t ? "bg-primary text-primary-foreground" : "text-ink-soft hover:bg-card"}`}>
                            {t}
                          </button>
                        ))}
                      </div>

                      
                      {referralRecipients.length > 0 && (
                        <div className="flex flex-wrap gap-1.5">
                          {referralRecipients.map((r) => (
                            <span key={r} className="flex items-center gap-1 rounded-full bg-teal-soft px-2.5 py-0.5 text-xs font-medium text-teal">
                              {r}
                              <button onClick={() => setReferralRecipients((prev) => prev.filter((x) => x !== r))} className="ml-0.5 rounded-full hover:opacity-60">
                                <X size={10} />
                              </button>
                            </span>
                          ))}
                        </div>
                      )}

                      
                      {referralType === "internal" ? (() => {
                        const suggestions = orgStaff
                          .filter((s) =>
                            !referralRecipients.some((r) => r.includes(s.name)) &&
                            (referralSearchInput === "" ||
                              s.name.toLowerCase().includes(referralSearchInput.toLowerCase()) ||
                              (s.hapId?.toLowerCase().includes(referralSearchInput.toLowerCase()) ?? false))
                          )
                          .slice(0, 8);
                        return (
                          <div className="relative">
                            <input
                              value={referralSearchInput}
                              onChange={(e) => { setReferralSearchInput(e.target.value); setReferralDropdownOpen(true); }}
                              onFocus={() => setReferralDropdownOpen(true)}
                              onBlur={() => setTimeout(() => setReferralDropdownOpen(false), 150)}
                              placeholder={referralRecipients.length === 0 ? "Search by name or HAP ID…" : "+ Add participant"}
                              className="w-full rounded-lg border border-border px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-ring"
                            />
                            {referralDropdownOpen && suggestions.length > 0 && (
                              <div className="absolute z-20 mt-1 w-full overflow-hidden rounded-lg border border-border bg-background shadow-lg">
                                {suggestions.map((s) => (
                                  <button
                                    key={s.id}
                                    onMouseDown={(e) => {
                                      e.preventDefault();
                                      const label = `${s.name}${s.hapId ? ` · ${s.hapId}` : ""} (${s.role.charAt(0) + s.role.slice(1).toLowerCase()})`;
                                      if (!referralRecipients.includes(label)) setReferralRecipients((prev) => [...prev, label]);
                                      setReferralSearchInput("");
                                      setReferralDropdownOpen(false);
                                    }}
                                    className="flex w-full items-center gap-2 px-3 py-2 text-left text-sm hover:bg-secondary"
                                  >
                                    <span className="font-medium text-ink">{s.name}</span>
                                    {s.hapId && <span className="rounded bg-secondary px-1.5 py-0.5 font-mono text-[10px] text-ink-soft">{s.hapId}</span>}
                                    <span className="ml-auto text-xs text-muted-foreground capitalize">{s.role.toLowerCase()}</span>
                                  </button>
                                ))}
                              </div>
                            )}
                          </div>
                        );
                      })() : (
                        <div className="flex gap-2">
                          <input
                            value={referralSearchInput}
                            onChange={(e) => setReferralSearchInput(e.target.value)}
                            onKeyDown={(e) => {
                              if ((e.key === "Enter" || e.key === ",") && referralSearchInput.trim()) {
                                e.preventDefault();
                                const val = referralSearchInput.trim().replace(/,$/, "");
                                if (val && !referralRecipients.includes(val)) setReferralRecipients((prev) => [...prev, val]);
                                setReferralSearchInput("");
                              }
                            }}
                            placeholder="Recipient name or institution"
                            className="flex-1 rounded-lg border border-border px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-ring"
                          />
                          <button
                            onClick={() => {
                              if (referralSearchInput.trim() && !referralRecipients.includes(referralSearchInput.trim())) {
                                setReferralRecipients((prev) => [...prev, referralSearchInput.trim()]);
                                setReferralSearchInput("");
                              }
                            }}
                            className="rounded-lg bg-secondary px-3 py-2 text-sm text-ink hover:opacity-80"
                          >
                            Add
                          </button>
                        </div>
                      )}

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
                        <button onClick={() => { setReferralFormOpen(false); setReferralRecipients([]); setReferralSearchInput(""); setReferralDropdownOpen(false); }}
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
                            {!isExternal && !referral.acknowledged && !!staffName &&
                              referral.toRecipients?.some((r) => r.includes(staffName)) && (
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

                    
                    {dischargeLoading && (
                      <div className="mb-3 rounded-lg bg-teal-soft p-3 text-sm text-ink">
                        Pulling together the admission record for {selectedPatient.name}...
                      </div>
                    )}

                    
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
                        
                        {sortedDischargeSummaries.map((summary) => {
                          const isEditingThis = editingSummaryId === summary.id;
                          const isFinalized = summary.status === "finalized";

                          return (
                            <div key={summary.id} className="rounded-lg border border-border p-3">
                              
                              <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
                                <div className="flex items-center gap-2 text-xs text-muted-foreground">
                                  
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
                                
                                <button onClick={() => deleteDischargeSummary(summary.id)} className="text-xs text-muted-foreground hover:text-destructive">
                                  <X size={12} />
                                </button>
                              </div>

                              
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
                              onClick={() => { setCameraFor("note"); openCamera(); }}
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
      )} 

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

      
      {carerProfileOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4" onClick={() => setCarerProfileOpen(false)}>
          <div onClick={(e) => e.stopPropagation()} className="w-full max-w-md rounded-2xl border border-border bg-card p-6 shadow-lift">
            <h2 className="text-lg text-ink">My profile</h2>
            <div className="mt-4 flex flex-col gap-3">
              <div>
                <label className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Full name</label>
                <input value={carerProfileDraft.name} onChange={(e) => setCarerProfileDraft((prev) => ({ ...prev, name: e.target.value }))}
                  className="mt-1 w-full rounded-lg border border-border px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-ring" />
              </div>
              <div>
                <label className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Qualifications</label>
                <textarea value={carerProfileDraft.qualifications} onChange={(e) => setCarerProfileDraft((prev) => ({ ...prev, qualifications: e.target.value }))}
                  rows={2} placeholder="e.g. Certificate III in Individual Support"
                  className="mt-1 w-full resize-none rounded-lg border border-border px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-ring" />
              </div>
              <div>
                <label className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Phone</label>
                <input value={carerProfileDraft.phone} onChange={(e) => setCarerProfileDraft((prev) => ({ ...prev, phone: e.target.value }))}
                  className="mt-1 w-full rounded-lg border border-border px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-ring" />
              </div>
              <div>
                <label className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Email</label>
                <input value={carerProfileDraft.email} onChange={(e) => setCarerProfileDraft((prev) => ({ ...prev, email: e.target.value }))}
                  onKeyDown={(e) => e.key === "Enter" && saveCarerProfile()}
                  className="mt-1 w-full rounded-lg border border-border px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-ring" />
              </div>
              <div className="mt-1 flex gap-2">
                <button onClick={saveCarerProfile} className="rounded-full bg-primary px-4 py-2 text-sm font-medium text-primary-foreground">Save profile</button>
                <button onClick={() => setCarerProfileOpen(false)} className="rounded-full px-4 py-2 text-sm text-ink-soft hover:bg-secondary">Cancel</button>
              </div>
            </div>
          </div>
        </div>
      )}

      
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

      
      {deleteReferralId !== null && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="w-full max-w-sm rounded-2xl border border-border bg-card p-6 shadow-lift">
            <h2 className="text-base font-semibold text-ink">Delete referral?</h2>
            <p className="mt-2 text-sm text-ink-soft">
              This referral will be permanently removed. This action cannot be undone.
            </p>
            <div className="mt-5 flex gap-3">
              <button
                onClick={() => { confirmDeleteReferral(deleteReferralId); setDeleteReferralId(null); }}
                className="flex-1 rounded-full bg-destructive py-2 text-sm font-medium text-white hover:opacity-80"
              >
                Delete
              </button>
              <button
                onClick={() => setDeleteReferralId(null)}
                className="flex-1 rounded-full border border-border py-2 text-sm text-ink-soft hover:bg-secondary"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      
      {deleteNoteId !== null && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="w-full max-w-sm rounded-2xl border border-border bg-card p-6 shadow-lift">
            <h2 className="text-base font-semibold text-ink">Delete this note?</h2>
            <p className="mt-2 text-sm text-ink-soft">
              This note will be permanently removed. This action cannot be undone.
            </p>
            <div className="mt-5 flex gap-3">
              <button
                onClick={() => { confirmDeleteNote(deleteNoteId); setDeleteNoteId(null); }}
                className="flex-1 rounded-full bg-destructive py-2 text-sm font-medium text-white hover:opacity-80"
              >
                Delete
              </button>
              <button
                onClick={() => setDeleteNoteId(null)}
                className="flex-1 rounded-full border border-border py-2 text-sm text-ink-soft hover:bg-secondary"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {deleteDiagnosisId !== null && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="w-full max-w-sm rounded-2xl border border-border bg-card p-6 shadow-lift">
            <h2 className="text-base font-semibold text-ink">Remove from problem list?</h2>
            <p className="mt-2 text-sm text-ink-soft">
              This diagnosis entry will be permanently removed. This action cannot be undone.
            </p>
            <div className="mt-5 flex gap-3">
              <button
                onClick={() => { confirmDeleteDiagnosis(deleteDiagnosisId); setDeleteDiagnosisId(null); }}
                className="flex-1 rounded-full bg-destructive py-2 text-sm font-medium text-white hover:opacity-80"
              >
                Remove
              </button>
              <button
                onClick={() => setDeleteDiagnosisId(null)}
                className="flex-1 rounded-full border border-border py-2 text-sm text-ink-soft hover:bg-secondary"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      
      {changePwOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4" onClick={() => setChangePwOpen(false)}>
          <div onClick={(e) => e.stopPropagation()} className="w-full max-w-sm rounded-2xl border border-border bg-card p-6 shadow-lift">
            <h2 className="text-base font-semibold text-ink">Change password</h2>
            <div className="mt-4 flex flex-col gap-3">
              <div>
                <label className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Current password</label>
                <input
                  type="password"
                  value={changePwCurrent}
                  onChange={(e) => setChangePwCurrent(e.target.value)}
                  className="mt-1 w-full rounded-lg border border-border px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-ring"
                />
              </div>
              <div>
                <label className="text-xs font-medium uppercase tracking-wide text-muted-foreground">New password</label>
                <input
                  type="password"
                  value={changePwNew}
                  onChange={(e) => setChangePwNew(e.target.value)}
                  className="mt-1 w-full rounded-lg border border-border px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-ring"
                />
              </div>
              <div>
                <label className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Confirm new password</label>
                <input
                  type="password"
                  value={changePwConfirm}
                  onChange={(e) => setChangePwConfirm(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && changePassword()}
                  className="mt-1 w-full rounded-lg border border-border px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-ring"
                />
              </div>
              {changePwError && (
                <p className="rounded-lg bg-destructive/10 px-3 py-2 text-sm text-destructive">{changePwError}</p>
              )}
              {changePwSuccess && (
                <p className="rounded-lg bg-teal-soft px-3 py-2 text-sm text-teal">Password updated successfully.</p>
              )}
              <div className="mt-1 flex gap-2">
                <button onClick={changePassword} className="flex-1 rounded-full bg-primary py-2 text-sm font-medium text-primary-foreground">
                  Update password
                </button>
                <button onClick={() => { setChangePwOpen(false); setChangePwCurrent(""); setChangePwNew(""); setChangePwConfirm(""); setChangePwError(""); setChangePwSuccess(false); }}
                  className="rounded-full px-4 py-2 text-sm text-ink-soft hover:bg-secondary">
                  Cancel
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      
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

