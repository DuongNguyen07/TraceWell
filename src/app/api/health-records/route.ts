import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import type { HealthRecordInput } from '@/types'

export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: 'Unauthorised' }, { status: 401 })

  const { searchParams } = new URL(req.url)
  const patientProfileId = searchParams.get('patientProfileId')
  if (!patientProfileId) return NextResponse.json({ error: 'Missing patientProfileId' }, { status: 400 })

  const records = await prisma.healthRecord.findMany({
    where: { patientProfileId },
    orderBy: { recordedAt: 'desc' },
    take: 30,
  })

  return NextResponse.json(records)
}

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: 'Unauthorised' }, { status: 401 })

  const { patientProfileId, ...data }: { patientProfileId: string } & HealthRecordInput =
    await req.json()

  const record = await prisma.healthRecord.create({
    data: { patientProfileId, ...data },
  })

  await prisma.auditLog.create({
    data: {
      userId: (session.user as any).id,
      action: 'CREATE_HEALTH_RECORD',
      resourceId: record.id,
    },
  })

  return NextResponse.json(record, { status: 201 })
}
