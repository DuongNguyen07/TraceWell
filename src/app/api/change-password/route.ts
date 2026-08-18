import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import bcrypt from "bcryptjs";

export async function POST(req: NextRequest) {
  let body: { email?: string; currentPassword?: string; newPassword?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid request" }, { status: 400 });
  }

  const { email, currentPassword, newPassword } = body;
  if (!currentPassword || !newPassword) {
    return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
  }
  if (newPassword.length < 8) {
    return NextResponse.json({ error: "New password must be at least 8 characters" }, { status: 400 });
  }

  
  let userId: string;
  let storedHash: string;

  const session = await getServerSession(authOptions);
  const sessionUserId = (session?.user as { id?: string } | undefined)?.id;

  if (sessionUserId) {
    const user = await prisma.user.findUnique({ where: { id: sessionUserId }, select: { id: true, password: true } });
    if (!user) return NextResponse.json({ error: "User not found" }, { status: 404 });
    userId = user.id;
    storedHash = user.password;
  } else if (email) {
    const user = await prisma.user.findUnique({ where: { email }, select: { id: true, password: true } });
    if (!user) return NextResponse.json({ error: "Invalid email or password" }, { status: 400 });
    userId = user.id;
    storedHash = user.password;
  } else {
    return NextResponse.json({ error: "Unauthorised" }, { status: 401 });
  }

  const valid = await bcrypt.compare(currentPassword, storedHash);
  if (!valid) return NextResponse.json({ error: "Current password is incorrect" }, { status: 400 });

  const hashed = await bcrypt.hash(newPassword, 12);
  await prisma.user.update({ where: { id: userId }, data: { password: hashed } });

  return NextResponse.json({ ok: true });
}
