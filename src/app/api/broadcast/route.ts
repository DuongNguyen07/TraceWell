

import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { sseBroadcast } from "@/lib/sse-bus";
import { applyEventToStore } from "@/lib/data-store";
import { prisma } from "@/lib/prisma";
import { CareNoteType } from "@prisma/client";

export async function POST(req: NextRequest) {
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  if (typeof body !== "object" || body === null || typeof (body as Record<string, unknown>).org !== "string") {
    return NextResponse.json({ error: "Missing org" }, { status: 400 });
  }

  const { org } = body as { org: string };

  
  applyEventToStore(org, body);

  
  sseBroadcast(org, body);

  
  const session = await getServerSession(authOptions);
  const authorId = (session?.user as { id?: string } | undefined)?.id;
  persistToDb(body, authorId).catch(() => {});

  return NextResponse.json({ ok: true });
}

async function persistToDb(event: unknown, authorId?: string): Promise<void> {
  const ev = event as Record<string, unknown>;
  const patientId = ev.patientId as string | undefined;
  if (!patientId) return;

  try {
    if (ev.type === "care_note" && ev.note && authorId) {
      const note = ev.note as Record<string, unknown>;
      const typeStr = (note.type as string ?? "text").toUpperCase();
      const validTypes = ["TEXT", "IMAGE", "VOICE", "FAMILY_UPDATE"];
      const noteType = validTypes.includes(typeStr) ? (typeStr as CareNoteType) : CareNoteType.TEXT;

      await prisma.careNote.upsert({
        where:  { id: note.id as string },
        update: {},
        create: {
          id:              note.id as string,
          patientProfileId: patientId,
          authorId,
          authorRole:      ev.authorRole as string,
          type:            noteType,
          content:         note.content as string,
          imageUrl:        (note.imageUrl as string | undefined) ?? null,
          sensitive:       (note.sensitive as boolean | undefined) ?? false,
          createdAt:       new Date(note.timestamp as number),
        },
      });

    } else if (ev.type === "wellbeing" && ev.entry) {
      const entry = ev.entry as Record<string, unknown>;
      await prisma.wellbeingCheck.create({
        data: {
          patientProfileId: patientId,
          mood:      entry.mood      as number,
          appetite:  entry.appetite  as number,
          mobility:  entry.mobility  as number,
          sleep:     entry.sleep     as number,
          recordedAt: new Date(entry.timestamp as number),
        },
      });

    } else if (ev.type === "vitals" && ev.vitals) {
      const v = ev.vitals as Record<string, unknown>;
      await prisma.vitalSigns.upsert({
        where:  { id: v.id as string },
        update: {},
        create: {
          id:               v.id as string,
          patientProfileId: patientId,
          authorRole:       ev.authorRole as string,
          systolic:         (v.systolic         as number | null) ?? null,
          diastolic:        (v.diastolic        as number | null) ?? null,
          heartRate:        (v.heartRate        as number | null) ?? null,
          temperature:      (v.temperature      as number | null) ?? null,
          oxygenSaturation: (v.oxygenSaturation as number | null) ?? null,
          respiratoryRate:  (v.respiratoryRate  as number | null) ?? null,
          recordedAt: new Date(v.timestamp as number),
        },
      });

    } else if (ev.type === "chat" && ev.message) {
      const msg = ev.message as Record<string, unknown>;
      await prisma.chatMessage.upsert({
        where:  { id: msg.id as string },
        update: {},
        create: {
          id:               msg.id as string,
          patientProfileId: patientId,
          authorName:       msg.authorName as string,
          authorRole:       msg.authorRole as string,
          content:          msg.content    as string,
          createdAt: new Date(msg.timestamp as number),
        },
      });

    } else if (ev.type === "ack_referral") {
      await prisma.referralNote.update({
        where: { id: ev.referralId as string },
        data: {
          acknowledged:   true,
          acknowledgedBy: ev.acknowledgedBy as string,
          acknowledgedAt: new Date(ev.acknowledgedAt as number),
        },
      });
    } else if (ev.type === "referral" && ev.referral && authorId) {
      const ref = ev.referral as Record<string, unknown>;
      const recipients = (ref.toRecipients as string[] | undefined) ?? [];
      await prisma.referralNote.upsert({
        where:  { id: ref.id as string },
        update: {},
        create: {
          id:               ref.id as string,
          patientProfileId: patientId,
          authorId,
          fromName:         ref.fromName as string,
          toRecipient:      (ref.toRecipient as string | undefined) ?? recipients[0] ?? "",
          toRecipients:     recipients,
          referralType:     (ref.referralType as string | undefined) ?? "internal",
          subject:          ref.subject as string,
          message:          ref.message as string,
          acknowledged:     (ref.acknowledged  as boolean | undefined) ?? false,
          acknowledgedBy:   (ref.acknowledgedBy as string  | undefined) ?? null,
          acknowledgedAt:   ref.acknowledgedAt ? new Date(ref.acknowledgedAt as number) : null,
          shareCode:        (ref.shareCode as string | undefined) ?? null,
          createdAt: new Date(ref.timestamp as number),
        },
      });
    }
  } catch (err) {
    
    
    if (process.env.NODE_ENV === "development") {
      console.debug("[broadcast] DB persist skipped:", (err as Error).message.slice(0, 120));
    }
  }
}
