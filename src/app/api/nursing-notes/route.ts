import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import type { NursingNoteInput } from '@/types'

export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: 'Unauthorised' }, { status: 401 })

  const { searchParams } = new URL(req.url)
  const patientProfileId = searchParams.get('patientProfileId')

  const notes = await prisma.nursingNote.findMany({
    where: patientProfileId ? { patientProfileId } : undefined,
    include: { author: { select: { name: true, role: true } } },
    orderBy: { createdAt: 'desc' },
  })

  return NextResponse.json(notes)
}

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: 'Unauthorised' }, { status: 401 })

  const body: NursingNoteInput = await req.json()
  const authorId = (session.user as any).id

  const note = await prisma.nursingNote.create({
    data: {
      patientProfileId: body.patientProfileId,
      authorId,
      type: body.type,
      rawContent: body.rawContent,
      audioUrl: body.audioUrl,
    },
  })

  await prisma.auditLog.create({
    data: { userId: authorId, action: 'CREATE_NURSING_NOTE', resourceId: note.id },
  })

  return NextResponse.json(note, { status: 201 })
}
