import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requireAuth } from '@/lib/auth'

// GET all quizzes
export async function GET() {
  try {
    const session = await requireAuth()
    
    if (session.role === 'AGENT') {
      // Agents only see published quizzes
      const quizzes = await prisma.quiz.findMany({
        where: { status: 'PUBLISHED' },
        include: {
          _count: { select: { questions: true } },
          attempts: {
            where: { userId: session.id },
            select: { id: true, status: true, percentageScore: true, passed: true },
          },
        },
        orderBy: { createdAt: 'desc' },
      })
      return NextResponse.json({ quizzes })
    }

    // Admin sees all quizzes
    const quizzes = await prisma.quiz.findMany({
      include: {
        _count: { select: { questions: true, attempts: true } },
      },
      orderBy: { createdAt: 'desc' },
    })
    return NextResponse.json({ quizzes })
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Server error'
    const status = message === 'Unauthorized' ? 401 : message === 'Forbidden' ? 403 : 500
    return NextResponse.json({ error: message }, { status })
  }
}

// POST create quiz (Admin only)
export async function POST(req: NextRequest) {
  try {
    await requireAuth(['ADMIN'])
    const data = await req.json()

    const quiz = await prisma.quiz.create({
      data: {
        title: data.title,
        description: data.description,
        duration: data.duration,
        passMark: data.passMark || 70,
        maxAttempts: data.maxAttempts || 1,
        randomizeQuestions: data.randomizeQuestions || false,
        randomizeOptions: data.randomizeOptions || false,
        allowBackNavigation: data.allowBackNavigation ?? true,
        showResultToAgent: data.showResultToAgent || false,
        showScoreOnly: data.showScoreOnly ?? true,
        showAfterReview: data.showAfterReview || false,
        timePerQuestion: data.timePerQuestion,
        startDate: data.startDate ? new Date(data.startDate) : null,
        endDate: data.endDate ? new Date(data.endDate) : null,
      },
    })

    return NextResponse.json({ quiz }, { status: 201 })
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Server error'
    const status = message === 'Unauthorized' ? 401 : message === 'Forbidden' ? 403 : 500
    return NextResponse.json({ error: message }, { status })
  }
}
