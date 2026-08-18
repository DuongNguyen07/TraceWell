


import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: 'Unauthorised' }, { status: 401 })

  const { patientProfileId, noteIds } = await req.json() as {
    patientProfileId: string;
    noteIds: string[];
  }

  const notes = await prisma.careNote.findMany({
    where: { patientProfileId, id: { in: noteIds } },
    include: { author: { select: { name: true, role: true } } },
    orderBy: { createdAt: 'asc' },
  })

  if (!notes.length) {
    return NextResponse.json({ error: 'No notes found' }, { status: 404 })
  }

  const notesText = notes
    .map((n) => `[${n.author.role} - ${n.author.name}]: ${n.content}`)
    .join('\n\n')

  const aiResponse = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
    },
    body: JSON.stringify({
      model: 'gpt-4o-mini',
      messages: [
        {
          role: 'system',
          content:
            'You are a clinical documentation assistant. Summarise the following care notes into a concise, structured handover summary. Include: key observations, symptoms, changes in wellbeing, outstanding actions, and any risks. Be factual, objective and brief.',
        },
        { role: 'user', content: notesText },
      ],
      max_tokens: 500,
    }),
  })

  const aiData = await aiResponse.json() as { choices?: { message?: { content?: string } }[] }
  const summary = aiData.choices?.[0]?.message?.content ?? 'Summary unavailable'

  await prisma.auditLog.create({
    data: {
      userId: (session.user as { id: string }).id,
      patientProfileId,
      action: 'AI_SUMMARISE_NOTES',
      metadata: { noteCount: notes.length },
    },
  })

  return NextResponse.json({ summary })
}
