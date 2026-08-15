// Returns all patients for an org (hospital | agedcare), scoped by role:
//   FAMILY_MEMBER → only patients they are linked to via FamilyLink
//   PATIENT       → only their own PatientProfile
//   Everyone else → all patients in the requested org

import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

function ageFrom(dob: Date | null): number {
  if (!dob) return 0;
  const now = new Date();
  let age = now.getFullYear() - dob.getFullYear();
  const beforeBirthday =
    now.getMonth() < dob.getMonth() ||
    (now.getMonth() === dob.getMonth() && now.getDate() < dob.getDate());
  if (beforeBirthday) age--;
  return age;
}

type DbProfile = {
  id: string;
  dateOfBirth: Date | null;
  ward: string | null;
  allergies: string[];
  baseline: unknown;
  profile: unknown;
  medications: { id: string; name: string; dose: string; frequency: string }[];
  diagnoses: { id: string; condition: string; status: string; notes: string | null; authorRole: string; createdAt: Date }[];
  user: { name: string };
};

function toPatient(pp: DbProfile) {
  const baseline = (pp.baseline ?? { mood: 5, appetite: 5, mobility: 5, sleep: 5 }) as {
    mood: number; appetite: number; mobility: number; sleep: number;
  };
  const profileJson = (pp.profile ?? {}) as Record<string, string>;
  const activeDiagnoses = pp.diagnoses.filter((d) => d.status !== "RESOLVED");

  return {
    id:   pp.id,
    name: pp.user.name,
    age:  ageFrom(pp.dateOfBirth),
    room: pp.ward ?? "Unknown room",
    baseline,
    profile: {
      preferences:        profileJson.preferences        ?? "",
      routine:            profileJson.routine            ?? "",
      communicationStyle: profileJson.communicationStyle ?? "",
    },
    medications: pp.medications.map((m) => ({
      id: m.id, name: m.name, dose: m.dose, frequency: m.frequency,
    })),
    healthInfo: {
      allergies:   pp.allergies.length      ? pp.allergies      : ["Not yet recorded"],
      conditions:  activeDiagnoses.length   ? activeDiagnoses.map((d) => d.condition) : ["Not yet recorded"],
      medications: pp.medications.length    ? pp.medications.map((m) => `${m.name} ${m.dose}`) : ["Not yet recorded"],
    },
  };
}

const INCLUDE = {
  user:        { select: { name: true } },
  medications: { orderBy: { createdAt: "asc" as const } },
  diagnoses:   { select: { id: true, condition: true, status: true, notes: true, authorRole: true, createdAt: true }, orderBy: { createdAt: "asc" as const } },
};

export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorised" }, { status: 401 });
  }

  const { searchParams } = new URL(req.url);
  const org = searchParams.get("org");
  const sessionUser = session.user as { id: string; role: string };

  if (sessionUser.role === "PATIENT") {
    const own = await prisma.patientProfile.findUnique({
      where:   { userId: sessionUser.id },
      include: INCLUDE,
    });
    if (!own) return NextResponse.json({ patients: [] });
    return NextResponse.json({ patients: [toPatient(own as DbProfile)] });
  }

  if (sessionUser.role === "FAMILY_MEMBER") {
    const links = await prisma.familyLink.findMany({
      where:   { familyMemberId: sessionUser.id },
      include: { patientProfile: { include: INCLUDE } },
    });
    return NextResponse.json({ patients: links.map((l) => toPatient(l.patientProfile as unknown as DbProfile)) });
  }

  const profiles = await prisma.patientProfile.findMany({
    where:   org ? { org } : {},
    include: INCLUDE,
    orderBy: { createdAt: "asc" },
  });

  return NextResponse.json({ patients: profiles.map((pp) => toPatient(pp as unknown as DbProfile)) });
}
