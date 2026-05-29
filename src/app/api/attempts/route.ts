import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requireAuth } from '@/lib/auth'

// POST start a quiz attempt
export async function POST(req: NextRequest) {
  try {
    const session = await requireAuth(['AGENT'])
    const { quizId } = await req.json()

    const quiz = await prisma.quiz.findUnique({
      where: { id: quizId },
      include: { _count: { select: { questions: true } } },
    })

    if (!quiz || quiz.status !== 'PUBLISHED') {
      return NextResponse.json({ error: 'Quiz not available' }, { status: 404 })
    }

    // Check date constraints
    const now = new Date()
    if (quiz.startDate && now < quiz.startDate) {
      return NextResponse.json({ error: 'Quiz has not started yet' }, { status: 400 })
    }
    if (quiz.endDate && now > quiz.endDate) {
      return NextResponse.json({ error: 'Quiz has ended' }, { status: 400 })
    }

    // Check active attempts (prevent multiple simultaneous)
    const activeAttempt = await prisma.quizAttempt.findFirst({
      where: {
        userId: session.id,
        quizId,
        status: 'IN_PROGRESS',
      },
    })

    if (activeAttempt) {
      return NextResponse.json({ 
        attempt: activeAttempt,
        message: 'Resuming existing attempt' 
      })
    }

    // Check max attempts
    const attemptCount = await prisma.quizAttempt.count({
      where: {
        userId: session.id,
        quizId,
        status: 'SUBMITTED',
      },
    })

    if (attemptCount >= quiz.maxAttempts) {
      return NextResponse.json({ error: 'Maximum attempts reached' }, { status: 400 })
    }

    const attempt = await prisma.quizAttempt.create({
      data: {
        userId: session.id,
        quizId,
        status: 'IN_PROGRESS',
        startedAt: new Date(),
        attemptNumber: attemptCount + 1,
      },
    })

    await prisma.activityLog.create({
      data: {
        userId: session.id,
        action: 'QUIZ_START',
        details: `Started quiz: ${quiz.title} (Attempt ${attemptCount + 1})`,
      },
    })

    return NextResponse.json({ attempt }, { status: 201 })
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Server error'
    const status = message === 'Unauthorized' ? 401 : message === 'Forbidden' ? 403 : 500
    return NextResponse.json({ error: message }, { status })
  }
}
