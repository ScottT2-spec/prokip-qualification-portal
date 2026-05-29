import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requireAuth } from '@/lib/auth'

// POST save an answer (auto-save)
export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await requireAuth(['AGENT'])
    const { id: attemptId } = await params
    const { questionId, selectedOptions, textAnswer } = await req.json()

    // Verify attempt belongs to user and is in progress
    const attempt = await prisma.quizAttempt.findFirst({
      where: {
        id: attemptId,
        userId: session.id,
        status: 'IN_PROGRESS',
      },
    })

    if (!attempt) {
      return NextResponse.json({ error: 'Invalid attempt' }, { status: 404 })
    }

    // Upsert answer
    const answer = await prisma.answer.upsert({
      where: {
        attemptId_questionId: {
          attemptId,
          questionId,
        },
      },
      update: {
        selectedOptions: selectedOptions || [],
        textAnswer: textAnswer || null,
        answeredAt: new Date(),
      },
      create: {
        attemptId,
        questionId,
        selectedOptions: selectedOptions || [],
        textAnswer: textAnswer || null,
      },
    })

    return NextResponse.json({ answer })
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Server error'
    const status = message === 'Unauthorized' ? 401 : message === 'Forbidden' ? 403 : 500
    return NextResponse.json({ error: message }, { status })
  }
}
