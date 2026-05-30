import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requireAuth } from '@/lib/auth'

// GET attempt details with questions and answers
export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await requireAuth()
    const { id: attemptId } = await params

    const attempt = await prisma.quizAttempt.findFirst({
      where: {
        id: attemptId,
        ...(session.role === 'AGENT' ? { userId: session.id } : {}),
      },
      include: {
        quiz: {
          include: {
            questions: {
              include: {
                question: {
                  include: { options: { orderBy: { order: 'asc' } } },
                },
              },
              orderBy: { order: 'asc' },
            },
          },
        },
        answers: true,
        result: true,
      },
    })

    if (!attempt) {
      return NextResponse.json({ error: 'Attempt not found' }, { status: 404 })
    }

    // Randomize if configured
    let questions = attempt.quiz.questions
    if (attempt.quiz.randomizeQuestions) {
      questions = [...questions].sort(() => Math.random() - 0.5)
    }

    // Strip correct answers for agents during exam
    if (session.role === 'AGENT' && attempt.status === 'IN_PROGRESS') {
      questions = questions.map(qq => ({
        ...qq,
        question: {
          ...qq.question,
          explanation: undefined as string | null | undefined,
          options: qq.question.options.map(o => ({
            id: o.id,
            text: o.text,
            isCorrect: false as boolean,
            order: o.order,
            questionId: o.questionId,
          })),
        },
      })) as typeof questions
      if (attempt.quiz.randomizeOptions) {
        questions = questions.map(qq => ({
          ...qq,
          question: {
            ...qq.question,
            options: [...qq.question.options].sort(() => Math.random() - 0.5),
          },
        }))
      }
    }

    return NextResponse.json({
      attempt: {
        ...attempt,
        quiz: {
          ...attempt.quiz,
          questions,
        },
      },
    })
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Server error'
    const status = message === 'Unauthorized' ? 401 : message === 'Forbidden' ? 403 : 500
    return NextResponse.json({ error: message }, { status })
  }
}
