


import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { DiagnosisStatus } from "@prisma/client";

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user) return NextResponse.json({ error: "Unauthorised" }, { status: 401 });

  const body = await req.json();
  const { id, patientProfileId, condition, status, notes, authorRole, timestamp } = body as {
    id: string;
    patientProfileId: string;
    condition: string;
    status: string;
    notes: string;
    authorRole: string;
    timestamp: number;
  };

  if (!id || !patientProfileId || !condition) {
    return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
  }

  const dbStatus = (status.toUpperCase()) as DiagnosisStatus;

  try {
    await prisma.diagnosis.upsert({
      where:  { id },
      update: {},
      create: {
        id,
        patientProfileId,
        condition,
        status:    dbStatus,
        notes:     notes || null,
        authorRole,
        createdAt: new Date(timestamp),
      },
    });
    return NextResponse.json({ ok: true });
  } catch (err) {
    
    if (process.env.NODE_ENV === "development") {
      console.debug("[api/diagnoses] DB write skipped:", (err as Error).message.slice(0, 120));
    }
    return NextResponse.json({ ok: true });
  }
}
