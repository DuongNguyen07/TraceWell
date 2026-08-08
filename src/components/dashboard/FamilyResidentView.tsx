"use client";

import { useState } from "react";
import HealthChart from "./HealthChart";

// ---------- Inline types (mirror the DashboardView contract exactly) ----------

type Baseline = { mood: number; appetite: number; mobility: number; sleep: number };
type WellbeingEntry = Baseline & { timestamp: number };

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

type Patient = {
  id: string;
  name: string;
  age: number;
  room: string;
  baseline: Baseline;
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

type ChatMessage = {
  id: string;
  patientId: string;
  authorName: string;
  authorRole: string;
  content: string;
  timestamp: number;
};

// ---------- Inline helpers ----------

function isClinicalNote(authorRole: string): boolean {
  return /\((Nurse|Carer|Doctor)\)/.test(authorRole);
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
    day: "numeric", month: "short", year: "numeric",
    hour: "numeric", minute: "2-digit", hour12: true,
  });
}

function formatShortDate(timestamp: number): string {
  return new Date(timestamp).toLocaleString("en-AU", { day: "numeric", month: "short" });
}

type DayGroup = { dateKey: string; label: string; notes: CareNote[] };

function groupNotesByDay(notes: CareNote[]): DayGroup[] {
  const sorted = [...notes].sort((a, b) => b.timestamp - a.timestamp);
  const groups = new Map<string, DayGroup>();
  for (const note of sorted) {
    const d = new Date(note.timestamp);
    const dateKey = `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`;
    const existing = groups.get(dateKey);
    if (existing) existing.notes.push(note);
    else groups.set(dateKey, { dateKey, label: formatShortDate(note.timestamp), notes: [note] });
  }
  return Array.from(groups.values());
}

// ================================================================
// COMPONENT
// ================================================================

export default function FamilyResidentView({
  patient,
  personLabelSingular,
  visibleNotes,
  wellbeingHistory,
  chatMessages,
  currentUserName,
  currentUserRole,
  onSendChatMessage,
}: {
  patient: Patient;
  personLabelSingular: string;
  visibleNotes: CareNote[];
  wellbeingHistory: WellbeingEntry[];
  chatMessages: ChatMessage[];
  currentUserName: string;
  currentUserRole: string;
  onSendChatMessage: (content: string) => void;
}) {
  const lastVisit = visibleNotes.find((n) => isClinicalNote(n.authorRole));
  const dayGroups = groupNotesByDay(visibleNotes);
  const healthInfo = patient.healthInfo ?? DEFAULT_HEALTH_INFO;

  const [chatDraft, setChatDraft] = useState("");

  function sendMessage() {
    const content = chatDraft.trim();
    if (!content) return;
    onSendChatMessage(content);
    setChatDraft("");
  }

  return (
    <div>
      <h1 className="text-2xl">{patient.name}</h1>
      <p className="mt-1 text-ink-soft">
        {patient.room} · Age {patient.age}
      </p>

      {lastVisit ? (
        <div className="mt-6 flex items-start gap-3 rounded-xl border border-teal bg-teal-soft p-4">
          <span className="mt-0.5 text-lg">🩺</span>
          <div>
            <div className="text-sm font-semibold text-ink">
              Last visit: {lastVisit.authorRole} · {timeAgo(lastVisit.timestamp)}
            </div>
            <div className="mt-1 text-sm text-ink-soft">{lastVisit.content}</div>
          </div>
        </div>
      ) : (
        <div className="mt-6 rounded-xl border border-dashed border-border p-4 text-sm text-ink-soft">
          No visits from the care team have been logged yet.
        </div>
      )}

      <div className="mt-6 rounded-xl border border-border bg-background p-4">
        <span className="text-sm font-semibold text-ink">Health information</span>
        <div className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-2">
          <div>
            <div className="text-xs font-medium uppercase tracking-wide text-ink-soft">Allergies</div>
            <div className="mt-1 flex flex-wrap gap-1.5">
              {healthInfo.allergies.map((a) => (
                <span key={a} className="rounded-full bg-amber-50 px-2 py-0.5 text-xs text-amber-700">{a}</span>
              ))}
            </div>
          </div>
          <div>
            <div className="text-xs font-medium uppercase tracking-wide text-ink-soft">Conditions</div>
            <div className="mt-1 flex flex-wrap gap-1.5">
              {healthInfo.conditions.map((c) => (
                <span key={c} className="rounded-full bg-secondary px-2 py-0.5 text-xs text-ink-soft">{c}</span>
              ))}
            </div>
          </div>
          <div>
            <div className="text-xs font-medium uppercase tracking-wide text-ink-soft">Medications</div>
            <div className="mt-1 flex flex-wrap gap-1.5">
              {healthInfo.medications.map((m) => (
                <span key={m} className="rounded-full bg-secondary px-2 py-0.5 text-xs text-ink-soft">{m}</span>
              ))}
            </div>
          </div>
          {healthInfo.dietaryNotes && (
            <div>
              <div className="text-xs font-medium uppercase tracking-wide text-ink-soft">Dietary notes</div>
              <div className="mt-1 text-sm text-ink">{healthInfo.dietaryNotes}</div>
            </div>
          )}
        </div>
      </div>

      <div className="mt-6 rounded-xl border border-border bg-background p-4">
        <span className="text-sm font-semibold text-ink">Health tracking over time</span>
        <p className="mt-1 mb-3 text-xs text-ink-soft">
          Mood, appetite, mobility and sleep, each logged out of 10 by the care team.
          Switch between daily, weekly and monthly views, or click a legend item to hide/show a line.
        </p>
        <HealthChart history={wellbeingHistory} baseline={patient.baseline} />
      </div>

      <div className="mt-6 rounded-xl border border-border bg-background p-4">
        <span className="text-sm font-semibold text-ink">Daily activity summary</span>
        <p className="mt-1 mb-3 text-xs text-ink-soft">
          A day-by-day summary for {patient.name}. Clinical details are kept out of this
          view — for full clinical history, speak with the care team.
        </p>
        <div className="flex flex-col gap-4">
          {dayGroups.length === 0 ? (
            <p className="text-sm text-ink-soft">
              No activity has been recorded for this {personLabelSingular} yet.
            </p>
          ) : (
            dayGroups.map((day) => (
              <div key={day.dateKey} className="rounded-lg border border-border p-3">
                <div className="mb-2 flex items-center justify-between">
                  <span className="text-sm font-medium text-ink">{day.label}</span>
                  <span className="text-xs text-muted-foreground">
                    {day.notes.length} update{day.notes.length === 1 ? "" : "s"}
                  </span>
                </div>
                <div className="flex flex-col gap-2">
                  {day.notes.map((note) => (
                    <div key={note.id} className="border-l-2 border-teal pl-3">
                      <div className="flex items-center gap-2 text-xs text-muted-foreground">
                        <span className={isClinicalNote(note.authorRole) ? "font-medium text-teal" : ""}>
                          {note.authorRole}
                        </span>
                        <span>· {timeAgo(note.timestamp)}</span>
                        {note.type === "image" && <span>· 📷 Photo</span>}
                        {note.type === "voice" && <span>· 🎙️ Voice note</span>}
                      </div>
                      {note.imageUrl && (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img
                          src={note.imageUrl}
                          alt="Care note attachment"
                          className="mt-1 max-h-40 rounded-lg border border-border object-cover"
                        />
                      )}
                      <div className="mt-0.5 text-sm text-ink">{note.content}</div>
                    </div>
                  ))}
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      <div className="mt-6 rounded-xl border border-border bg-background p-4">
        <span className="text-sm font-semibold text-ink">Family chat</span>
        <p className="mt-1 mb-3 text-xs text-ink-soft">
          Message the care team about {patient.name} — every family member sharing this{" "}
          {personLabelSingular} can see this conversation.
        </p>
        <div className="mb-3 flex max-h-72 flex-col gap-2 overflow-y-auto">
          {chatMessages.length === 0 ? (
            <p className="text-sm text-ink-soft">No messages yet — say hello, or ask a question below.</p>
          ) : (
            chatMessages.map((msg) => {
              const isMine = msg.authorName === currentUserName && msg.authorRole === currentUserRole;
              return (
                <div
                  key={msg.id}
                  className={`max-w-[85%] rounded-xl px-3 py-2 text-sm ${
                    isMine ? "self-end bg-teal-soft text-ink" : "self-start bg-secondary text-ink"
                  }`}
                >
                  <div className="text-xs font-medium text-ink-soft">
                    {msg.authorName} ({msg.authorRole}) · {timeAgo(msg.timestamp)}
                  </div>
                  <div className="mt-0.5">{msg.content}</div>
                  <div className="mt-0.5 text-[10px] text-muted-foreground">{formatDateTime(msg.timestamp)}</div>
                </div>
              );
            })
          )}
        </div>
        <div className="flex gap-2">
          <input
            value={chatDraft}
            onChange={(e) => setChatDraft(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && sendMessage()}
            placeholder="Ask the care team anything..."
            className="flex-1 rounded-lg border border-border px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-ring"
          />
          <button
            onClick={sendMessage}
            className="rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground"
          >
            Send
          </button>
        </div>
      </div>

      <p className="mt-4 text-xs text-muted-foreground">
        Wellbeing checks and care notes are added by the care team — you can review a
        summarized, non-clinical version here, and reach out any time via the chat above.
      </p>
    </div>
  );
}
