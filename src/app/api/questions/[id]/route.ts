import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requireAuth } from '@/lib/auth'

// GET single question
export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    await requireAuth(['ADMIN'])
    const { id } = await params

    const question = await prisma.question.findUnique({
      where: { id },
      include: { options: { orderBy: { order: 'asc' } } },
    })

    if (!question) {
      return NextResponse.json({ error: 'Question not found' }, { status: 404 })
    }

    return NextResponse.json({ question })
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Server error'
    const status = message === 'Unauthorized' ? 401 : message === 'Forbidden' ? 403 : 500
    return NextResponse.json({ error: message }, { status })
  }
}

// PUT update question
export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    await requireAuth(['ADMIN'])
    const { id } = await params
    const data = await req.json()

    const existing = await prisma.question.findUnique({ where: { id } })
    if (!existing) {
      return NextResponse.json({ error: 'Question not found' }, { status: 404 })
    }

    // Update question fields
    const question = await prisma.question.update({
      where: { id },
      data: {
        text: data.text ?? existing.text,
        type: data.type ?? existing.type,
        category: data.category ?? existing.category,
        difficulty: data.difficulty ?? existing.difficulty,
        marks: data.marks ?? existing.marks,
        explanation: data.explanation ?? existing.explanation,
        scenarioText: data.scenarioText ?? existing.scenarioText,
      },
    })

    // If options provided, replace them
    if (data.options && Array.isArray(data.options)) {
      await prisma.questionOption.deleteMany({ where: { questionId: id } })
      await prisma.questionOption.createMany({
        data: data.options.map((opt: { text: string; isCorrect: boolean }, i: number) => ({
          questionId: id,
          text: opt.text,
          isCorrect: opt.isCorrect || false,
          order: i,
        })),
      })
    }

    const updated = await prisma.question.findUnique({
      where: { id },
      include: { options: { orderBy: { order: 'asc' } } },
    })

    return NextResponse.json({ question: updated })
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Server error'
    const status = message === 'Unauthorized' ? 401 : message === 'Forbidden' ? 403 : 500
    return NextResponse.json({ error: message }, { status })
  }
}

// DELETE question
export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    await requireAuth(['ADMIN'])
    const { id } = await params

    const existing = await prisma.question.findUnique({ where: { id } })
    if (!existing) {
      return NextResponse.json({ error: 'Question not found' }, { status: 404 })
    }

    // Remove from quizzes first
    await prisma.quizQuestion.deleteMany({ where: { questionId: id } })
    // Remove answers referencing this question
    await prisma.answer.deleteMany({ where: { questionId: id } })
    // Delete the question (cascades to options)
    await prisma.question.delete({ where: { id } })

    return NextResponse.json({ success: true })
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Server error'
    const status = message === 'Unauthorized' ? 401 : message === 'Forbidden' ? 403 : 500
    return NextResponse.json({ error: message }, { status })
  }
}
