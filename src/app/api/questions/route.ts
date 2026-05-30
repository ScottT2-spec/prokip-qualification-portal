import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requireAuth } from '@/lib/auth'
import { parsePaginationParams, paginatedResponse } from '@/lib/pagination'

// GET all questions (Admin only)
export async function GET(req: NextRequest) {
  try {
    await requireAuth(['ADMIN'])
    const params = parsePaginationParams(req, { limit: 50 })

    const where: Record<string, unknown> = {}
    if (params.filters.category) where.category = params.filters.category
    if (params.filters.difficulty) where.difficulty = params.filters.difficulty
    if (params.filters.type) where.type = params.filters.type
    if (params.search) where.text = { contains: params.search, mode: 'insensitive' }

    const sortField = ['createdAt', 'category', 'difficulty', 'type'].includes(params.sortBy)
      ? params.sortBy : 'createdAt'

    const [questions, total] = await Promise.all([
      prisma.question.findMany({
        where,
        include: { options: { orderBy: { order: 'asc' } } },
        orderBy: { [sortField]: params.sortOrder },
        skip: params.skip,
        take: params.limit,
      }),
      prisma.question.count({ where }),
    ])

    return NextResponse.json(paginatedResponse(questions, total, params))
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
