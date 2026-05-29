import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requireAuth } from '@/lib/auth'

// GET single quiz with questions
export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await requireAuth()
    const { id } = await params

    const quiz = await prisma.quiz.findUnique({
      where: { id },
      include: {
        questions: {
          include: {
            question: {
              include: { options: { orderBy: { order: 'asc' } } },
            },
          },
          orderBy: { order: 'asc' },
        },
        _count: { select: { attempts: true } },
      },
    })

    if (!quiz) {
      return NextResponse.json({ error: 'Quiz not found' }, { status: 404 })
    }

    // Agents can't see correct answers
    if (session.role === 'AGENT') {
      const sanitized = {
        ...quiz,
        questions: quiz.questions.map(qq => ({
          ...qq,
          question: {
            ...qq.question,
            explanation: undefined,
            options: qq.question.options.map(o => ({
              id: o.id,
              text: o.text,
              order: o.order,
            })),
          },
        })),
      }
      return NextResponse.json({ quiz: sanitized })
    }

    return NextResponse.json({ quiz })
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Server error'
    const status = message === 'Unauthorized' ? 401 : message === 'Forbidden' ? 403 : 500
    return NextResponse.json({ error: message }, { status })
  }
}

// PUT update quiz
export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    await requireAuth(['ADMIN'])
    const { id } = await params
    const data = await req.json()

    const quiz = await prisma.quiz.update({
      where: { id },
      data: {
        title: data.title,
        description: data.description,
        status: data.status,
        duration: data.duration,
        passMark: data.passMark,
        maxAttempts: data.maxAttempts,
        randomizeQuestions: data.randomizeQuestions,
        randomizeOptions: data.randomizeOptions,
        allowBackNavigation: data.allowBackNavigation,
        showResultToAgent: data.showResultToAgent,
        showScoreOnly: data.showScoreOnly,
        showAfterReview: data.showAfterReview,
        timePerQuestion: data.timePerQuestion,
        startDate: data.startDate ? new Date(data.startDate) : undefined,
        endDate: data.endDate ? new Date(data.endDate) : undefined,
      },
    })

    return NextResponse.json({ quiz })
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Server error'
    const status = message === 'Unauthorized' ? 401 : message === 'Forbidden' ? 403 : 500
    return NextResponse.json({ error: message }, { status })
  }
}

// DELETE quiz
export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    await requireAuth(['ADMIN'])
    const { id } = await params
    await prisma.quiz.delete({ where: { id } })
    return NextResponse.json({ success: true })
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Server error'
    const status = message === 'Unauthorized' ? 401 : message === 'Forbidden' ? 403 : 500
    return NextResponse.json({ error: message }, { status })
  }
}
