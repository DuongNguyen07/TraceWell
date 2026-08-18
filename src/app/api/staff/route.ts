import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user) return NextResponse.json({ error: "Unauthorised" }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const org = searchParams.get("org");

  const users = await prisma.user.findMany({
    where: {
      ...(org ? { org } : {}),
      role: { notIn: ["PATIENT", "FAMILY_MEMBER"] },
    },
    select: { id: true, name: true, role: true, hapId: true },
    orderBy: [{ role: "asc" }, { name: "asc" }],
  });

  return NextResponse.json({
    staff: users.map((u) => ({
      id: u.id,
      name: u.name,
      role: u.role,
      hapId: u.hapId ?? null,
      label: `${u.name}${u.hapId ? ` · ${u.hapId}` : ""} (${u.role.charAt(0) + u.role.slice(1).toLowerCase()})`,
    })),
  });
}
