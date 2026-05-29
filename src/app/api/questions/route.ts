import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requireAuth } from '@/lib/auth'

// GET all questions (Admin only)
export async function GET(req: NextRequest) {
  try {
    await requireAuth(['ADMIN'])
    const { searchParams } = new URL(req.url)
    const category = searchParams.get('category')
    const difficulty = searchParams.get('difficulty')
    const type = searchParams.get('type')
    const search = searchParams.get('search')
    const page = parseInt(searchParams.get('page') || '1')
    const limit = parseInt(searchParams.get('limit') || '50')

    const where: Record<string, unknown> = {}
    if (category) where.category = category
    if (difficulty) where.difficulty = difficulty
    if (type) where.type = type
    if (search) where.text = { contains: search, mode: 'insensitive' }

    const [questions, total] = await Promise.all([
      prisma.question.findMany({
        where,
        include: { options: { orderBy: { order: 'asc' } } },
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
      }),
      prisma.question.count({ where }),
    ])

    return NextResponse.json({ questions, total, page, limit })
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Server error'
    const status = message === 'Unauthorized' ? 401 : message === 'Forbidden' ? 403 : 500
    return NextResponse.json({ error: message }, { status })
  }
}

// POST create question
export async function POST(req: NextRequest) {
  try {
    await requireAuth(['ADMIN'])
    const data = await req.json()

    const question = await prisma.question.create({
      data: {
        text: data.text,
        type: data.type,
        category: data.category,
        difficulty: data.difficulty || 'MEDIUM',
        marks: data.marks || 1,
        explanation: data.explanation,
        scenarioText: data.scenarioText,
        options: {
          create: (data.options || []).map((opt: { text: string; isCorrect: boolean }, i: number) => ({
            text: opt.text,
            isCorrect: opt.isCorrect || false,
            order: i,
          })),
        },
      },
      include: { options: true },
    })

    // Link to quiz if quizId provided
    if (data.quizId) {
      const maxOrder = await prisma.quizQuestion.findFirst({
        where: { quizId: data.quizId },
        orderBy: { order: 'desc' },
      })
      await prisma.quizQuestion.create({
        data: {
          quizId: data.quizId,
          questionId: question.id,
          order: (maxOrder?.order || 0) + 1,
        },
      })
    }

    return NextResponse.json({ question }, { status: 201 })
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Server error'
    const status = message === 'Unauthorized' ? 401 : message === 'Forbidden' ? 403 : 500
    return NextResponse.json({ error: message }, { status })
  }
}
