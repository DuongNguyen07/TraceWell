


import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: 'Unauthorised' }, { status: 401 })

  const { searchParams } = new URL(req.url)
  const patientProfileId = searchParams.get('patientProfileId')
  if (!patientProfileId) return NextResponse.json({ error: 'Missing patientProfileId' }, { status: 400 })

  const records = await prisma.wellbeingCheck.findMany({
    where: { patientProfileId },
    orderBy: { recordedAt: 'desc' },
    take: 30,
  })

  return NextResponse.json(records)
}

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: 'Unauthorised' }, { status: 401 })

  const { patientProfileId, mood = 5, appetite = 5, mobility = 5, sleep = 5 } = await req.json() as {
    patientProfileId: string;
    mood?: number; appetite?: number; mobility?: number; sleep?: number;
  }

  const record = await prisma.wellbeingCheck.create({
    data: { patientProfileId, mood, appetite, mobility, sleep },
  })

  await prisma.auditLog.create({
    data: {
      userId: (session.user as { id: string }).id,
      action: 'CREATE_WELLBEING_CHECK',
      patientProfileId,
    },
  })

  return NextResponse.json(record, { status: 201 })
}
