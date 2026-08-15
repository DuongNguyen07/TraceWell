// Returns all clinical data for an org.
// Primary source: PostgreSQL (via Prisma).
// Fallback: server-side in-memory hot cache (populated by broadcasts during the
// current server process) — used when the DB is unreachable or the migration
// has not yet been applied.

import { NextRequest, NextResponse } from "next/server";
import { getOrgData } from "@/lib/data-store";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const org = new URL(req.url).searchParams.get("org");
  if (!org) return NextResponse.json({ error: "Missing org" }, { status: 400 });

  const inMemory = getOrgData(org);

  try {
    const profiles = await prisma.patientProfile.findMany({
      where:  { org },
      select: { id: true },
    });
    const profileIds = profiles.map((p) => p.id);

    if (profileIds.length === 0) return NextResponse.json(inMemory);

    const [careNotes, wellbeingChecks, vitals, chatMessages, referrals, diagnoses] = await Promise.all([
      prisma.careNote.findMany({      where: { patientProfileId: { in: profileIds } }, orderBy: { createdAt:  "asc" } }),
      prisma.wellbeingCheck.findMany({ where: { patientProfileId: { in: profileIds } }, orderBy: { recordedAt: "asc" } }),
      prisma.vitalSigns.findMany({    where: { patientProfileId: { in: profileIds } }, orderBy: { recordedAt: "asc" } }),
      prisma.chatMessage.findMany({   where: { patientProfileId: { in: profileIds } }, orderBy: { createdAt:  "asc" } }),
      prisma.referralNote.findMany({  where: { patientProfileId: { in: profileIds } }, orderBy: { createdAt:  "asc" } }),
      prisma.diagnosis.findMany({     where: { patientProfileId: { in: profileIds } }, orderBy: { createdAt:  "asc" } }),
    ]);

    function groupBy<T extends { patientProfileId: string }>(items: T[]): Record<string, T[]> {
      return items.reduce((acc, item) => {
        (acc[item.patientProfileId] ??= []).push(item);
        return acc;
      }, {} as Record<string, T[]>);
    }

    const notesByPid      = groupBy(careNotes);
    const wellbeingByPid  = groupBy(wellbeingChecks);
    const vitalsByPid     = groupBy(vitals);
    const chatByPid       = groupBy(chatMessages);
    const referralsByPid  = groupBy(referrals);
    const diagnosesByPid  = groupBy(diagnoses);

    const dbNotes: Record<string, unknown[]> = {};
    for (const [pid, items] of Object.entries(notesByPid)) {
      dbNotes[pid] = items.map((n) => ({
        id:        n.id,
        content:   n.content,
        authorRole: n.authorRole,
        type:      n.type.toLowerCase() as "text" | "image" | "voice" | "family_update",
        timestamp: n.createdAt.getTime(),
        imageUrl:  n.imageUrl ?? undefined,
        sensitive: n.sensitive,
      }));
    }

    const dbWellbeing: Record<string, unknown[]> = {};
    for (const [pid, items] of Object.entries(wellbeingByPid)) {
      dbWellbeing[pid] = items.map((w) => ({
        mood: w.mood, appetite: w.appetite, mobility: w.mobility, sleep: w.sleep,
        timestamp: w.recordedAt.getTime(),
      }));
    }

    const dbVitals: Record<string, unknown[]> = {};
    for (const [pid, items] of Object.entries(vitalsByPid)) {
      dbVitals[pid] = items.map((v) => ({
        id:               v.id,
        systolic:         v.systolic,
        diastolic:        v.diastolic,
        heartRate:        v.heartRate,
        temperature:      v.temperature,
        oxygenSaturation: v.oxygenSaturation,
        respiratoryRate:  v.respiratoryRate,
        authorRole:       v.authorRole,
        timestamp:        v.recordedAt.getTime(),
      }));
    }

    const dbChat: Record<string, unknown[]> = {};
    for (const [pid, items] of Object.entries(chatByPid)) {
      dbChat[pid] = items.map((m) => ({
        id:         m.id,
        patientId:  pid,
        authorName: m.authorName,
        authorRole: m.authorRole,
        content:    m.content,
        timestamp:  m.createdAt.getTime(),
      }));
    }

    const dbReferrals: Record<string, unknown[]> = {};
    for (const [pid, items] of Object.entries(referralsByPid)) {
      dbReferrals[pid] = items.map((r) => ({
        id:             r.id,
        fromName:       r.fromName,
        toRecipient:    r.toRecipient,
        subject:        r.subject,
        message:        r.message,
        timestamp:      r.createdAt.getTime(),
        acknowledged:   r.acknowledged,
        acknowledgedBy: r.acknowledgedBy ?? undefined,
        acknowledgedAt: r.acknowledgedAt?.getTime() ?? undefined,
        shareCode:      r.shareCode ?? undefined,
      }));
    }

    const dbDiagnoses: Record<string, unknown[]> = {};
    for (const [pid, items] of Object.entries(diagnosesByPid)) {
      dbDiagnoses[pid] = items.map((d) => ({
        id:         d.id,
        condition:  d.condition,
        // Convert "ACTIVE" → "Active", "CHRONIC" → "Chronic", etc.
        status:     d.status.charAt(0) + d.status.slice(1).toLowerCase(),
        notes:      d.notes ?? "",
        authorRole: d.authorRole,
        timestamp:  d.createdAt.getTime(),
      }));
    }

    // Merge DB data with the in-memory hot cache. DB data is base;
    // in-memory carries items broadcast since the last server restart
    // that may not have been persisted yet.
    function mergeInto(
      base: Record<string, unknown[]>,
      extra: Record<string, unknown[]>,
    ): Record<string, unknown[]> {
      const result = { ...base };
      for (const [pid, items] of Object.entries(extra)) {
        const existing = result[pid] ?? [];
        const seenIds   = new Set(existing.map((x: unknown) => (x as { id?: string }).id).filter(Boolean));
        const seenTs    = new Set(existing.map((x: unknown) => (x as { timestamp?: number }).timestamp).filter(Boolean));
        const novel     = (items as unknown[]).filter(
          (x) => !seenIds.has((x as { id?: string }).id ?? "") && !seenTs.has((x as { timestamp?: number }).timestamp ?? 0),
        );
        result[pid] = [...existing, ...novel];
      }
      return result;
    }

    return NextResponse.json({
      notes:     mergeInto(dbNotes,     inMemory.notes),
      wellbeing: mergeInto(dbWellbeing, inMemory.wellbeing),
      vitals:    mergeInto(dbVitals,    inMemory.vitals),
      chat:      mergeInto(dbChat,      inMemory.chat),
      referrals: mergeInto(dbReferrals, inMemory.referrals),
      diagnoses: mergeInto(dbDiagnoses, inMemory.diagnoses),
    });

  } catch {
    // DB unavailable or migration not yet run — serve in-memory data so the
    // app keeps working during setup.
    return NextResponse.json(inMemory);
  }
}
