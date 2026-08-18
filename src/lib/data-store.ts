


export type OrgData = {
  notes:      Record<string, unknown[]>;
  wellbeing:  Record<string, unknown[]>;
  vitals:     Record<string, unknown[]>;
  referrals:  Record<string, unknown[]>;
  chat:       Record<string, unknown[]>;
  diagnoses:  Record<string, unknown[]>;
};

declare global {
  var __tracewellData: Map<string, OrgData> | undefined;
}

function store(): Map<string, OrgData> {
  if (!global.__tracewellData) global.__tracewellData = new Map();
  return global.__tracewellData;
}

function orgData(org: string): OrgData {
  const s = store();
  if (!s.has(org)) {
    s.set(org, { notes: {}, wellbeing: {}, vitals: {}, referrals: {}, chat: {}, diagnoses: {} });
  }
  return s.get(org)!;
}

function upsertById(list: unknown[], item: unknown & { id?: string; timestamp?: number }): unknown[] {
  if (!item.id) return list;
  const exists = list.some((x) => (x as { id?: string }).id === item.id);
  return exists ? list : [...list, item];
}

export function applyEventToStore(org: string, event: unknown): void {
  const ev = event as Record<string, unknown>;
  const patientId = ev.patientId as string | undefined;
  if (!patientId) return;

  const d = orgData(org);

  if (ev.type === "care_note" && ev.note) {
    d.notes[patientId] = upsertById(d.notes[patientId] ?? [], ev.note as { id?: string });
  } else if (ev.type === "wellbeing" && ev.entry) {
    const existing = (d.wellbeing[patientId] ?? []) as { timestamp?: number }[];
    const entry = ev.entry as { timestamp?: number };
    if (!existing.some((e) => e.timestamp === entry.timestamp)) {
      d.wellbeing[patientId] = [...existing, entry];
    }
  } else if (ev.type === "vitals" && ev.vitals) {
    d.vitals[patientId] = upsertById(d.vitals[patientId] ?? [], ev.vitals as { id?: string });
  } else if (ev.type === "referral" && ev.referral) {
    d.referrals[patientId] = upsertById(d.referrals[patientId] ?? [], ev.referral as { id?: string });
  } else if (ev.type === "chat" && ev.message) {
    d.chat[patientId] = upsertById(d.chat[patientId] ?? [], ev.message as { id?: string });
  }
}

export function getOrgData(org: string): OrgData {
  return orgData(org);
}
