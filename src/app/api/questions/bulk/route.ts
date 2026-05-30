import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requireAuth } from '@/lib/auth'

/**
 * POST /api/questions/bulk
 * 
 * Create multiple questions at once.
 * 
 * Body: { quizId?: string, questions: Array<{ text, type, category?, difficulty?, marks?, explanation?, scenarioText?, options: [{ text, isCorrect }] }> }
 */
export async function POST(req: NextRequest) {
  try {
    await requireAuth(['ADMIN'])
    const { questions, quizId } = await req.json()

    if (!Array.isArray(questions) || questions.length === 0) {
      return NextResponse.json({ error: 'questions array is required and must not be empty' }, { status: 400 })
    }

    if (questions.length > 200) {
      return NextResponse.json({ error: 'Maximum 200 questions per batch' }, { status: 400 })
    }

    // Validate all questions before inserting
    for (let i = 0; i < questions.length; i++) {
      const q = questions[i]
      if (!q.text || !q.type) {
        return NextResponse.json({ error: `Question ${i + 1}: text and type are required` }, { status: 400 })
      }
      if (q.type !== 'SHORT_ANSWER' && (!q.options || q.options.length < 2)) {
        return NextResponse.json({ error: `Question ${i + 1}: at least 2 options required for ${q.type}` }, { status: 400 })
      }
    }

    // Get current max order if linking to quiz
    let nextOrder = 0
    if (quizId) {
      const maxOrder = await prisma.quizQuestion.findFirst({
        where: { quizId },
        orderBy: { order: 'desc' },
      })
      nextOrder = (maxOrder?.order || 0) + 1
    }

    // Insert all in a transaction
    const created = await prisma.$transaction(
      questions.map((q: any, idx: number) =>
        prisma.question.create({
          data: {
            text: q.text,
            type: q.type,
            category: q.category || null,
            difficulty: q.difficulty || 'MEDIUM',
            marks: q.marks || 1,
            explanation: q.explanation || null,
            scenarioText: q.scenarioText || null,
            options: {
              create: (q.options || []).map((opt: { text: string; isCorrect: boolean }, i: number) => ({
                text: opt.text,
                isCorrect: opt.isCorrect || false,
                order: i,
              })),
            },
          },
          include: { options: true },
        })
      )
    )

    // Link to quiz if provided
    if (quizId) {
      await prisma.$transaction(
        created.map((q, idx) =>
          prisma.quizQuestion.create({
            data: { quizId, questionId: q.id, order: nextOrder + idx },
          })
        )
      )
    }

    return NextResponse.json({ created: created.length, questions: created }, { status: 201 })
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Server error'
    const status = message === 'Unauthorized' ? 401 : message === 'Forbidden' ? 403 : 500
    return NextResponse.json({ error: message }, { status })
  }
}
