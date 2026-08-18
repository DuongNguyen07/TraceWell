


import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { CareNoteType } from '@prisma/client'

export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: 'Unauthorised' }, { status: 401 })

  const { searchParams } = new URL(req.url)
  const patientProfileId = searchParams.get('patientProfileId')

  const notes = await prisma.careNote.findMany({
    where: patientProfileId ? { patientProfileId } : undefined,
    include: { author: { select: { name: true, role: true } } },
    orderBy: { createdAt: 'desc' },
  })

  return NextResponse.json(notes)
}

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: 'Unauthorised' }, { status: 401 })

  const body = await req.json() as { patientProfileId: string; type?: string; rawContent: string }
  const authorId = (session.user as { id: string }).id

  const note = await prisma.careNote.create({
    data: {
      patientProfileId: body.patientProfileId,
      authorId,
      authorRole: session.user?.name ?? 'Unknown',
      type: (body.type?.toUpperCase() as CareNoteType | undefined) ?? CareNoteType.TEXT,
      content: body.rawContent,
    },
  })

  await prisma.auditLog.create({
    data: { userId: authorId, action: 'CREATE_CARE_NOTE', patientProfileId: body.patientProfileId },
  })

  return NextResponse.json(note, { status: 201 })
}
