import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: 'Unauthorised' }, { status: 401 })

  const { patientProfileId, noteIds } = await req.json()

  // Fetch the nursing notes to summarise
  const notes = await prisma.nursingNote.findMany({
    where: { patientProfileId, id: { in: noteIds } },
    include: { author: { select: { name: true, role: true } } },
    orderBy: { createdAt: 'asc' },
  })

  if (!notes.length) {
    return NextResponse.json({ error: 'No notes found' }, { status: 404 })
  }

  const notesText = notes
    .map(n => `[${n.author.role} - ${n.author.name}]: ${n.rawContent}`)
    .join('\n\n')

  // Call Anthropic / OpenAI here — swap in whichever API key you use
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
            'You are a clinical documentation assistant. Summarise the following nursing notes into a concise, structured handover summary. Include: key observations, symptoms, changes in wellbeing, outstanding actions, and any risks. Be factual, objective and brief.',
        },
        { role: 'user', content: notesText },
      ],
      max_tokens: 500,
    }),
  })

  const aiData = await aiResponse.json()
  const summary = aiData.choices?.[0]?.message?.content ?? 'Summary unavailable'

  // Persist the summary back to each note
  await prisma.nursingNote.updateMany({
    where: { id: { in: noteIds } },
    data: { aiSummary: summary },
  })

  // Audit log
  await prisma.auditLog.create({
    data: {
      userId: (session.user as any).id,
      action: 'AI_SUMMARISE_NOTES',
      resourceId: patientProfileId,
      metadata: { noteCount: notes.length },
    },
  })

  return NextResponse.json({ summary })
}
