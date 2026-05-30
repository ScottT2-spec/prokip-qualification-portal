import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requireAuth } from '@/lib/auth'
import { trackLocation } from '@/lib/location'

// POST submit quiz attempt
export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await requireAuth(['AGENT'])
    const { id: attemptId } = await params

    const attempt = await prisma.quizAttempt.findFirst({
      where: {
        id: attemptId,
        userId: session.id,
        status: 'IN_PROGRESS',
      },
      include: {
        quiz: true,
        answers: true,
      },
    })

    if (!attempt) {
      return NextResponse.json({ error: 'Invalid attempt or already submitted' }, { status: 404 })
    }

    // Get all questions with correct answers
    const quizQuestions = await prisma.quizQuestion.findMany({
      where: { quizId: attempt.quizId },
      include: {
        question: {
          include: { options: true },
        },
      },
    })

    // Grade the attempt
    let totalScore = 0
    let totalPossible = 0

    for (const qq of quizQuestions) {
      const question = qq.question
      totalPossible += question.marks

      const answer = attempt.answers.find(a => a.questionId === question.id)
      if (!answer) continue

      let isCorrect = false

      if (question.type === 'SHORT_ANSWER') {
        // Short answers need manual review - mark as pending
        continue
      }

      const correctOptionIds = question.options
        .filter(o => o.isCorrect)
        .map(o => o.id)
        .sort()

      const selectedIds = [...(answer.selectedOptions || [])].sort()

      if (question.type === 'TRUE_FALSE' || question.type === 'MULTIPLE_CHOICE') {
        isCorrect = selectedIds.length === 1 && correctOptionIds.includes(selectedIds[0])
      } else if (question.type === 'MULTIPLE_ANSWERS') {
        isCorrect = selectedIds.length === correctOptionIds.length &&
          selectedIds.every((id, i) => id === correctOptionIds[i])
      } else if (question.type === 'SCENARIO') {
        isCorrect = selectedIds.length === correctOptionIds.length &&
          selectedIds.every((id, i) => id === correctOptionIds[i])
      }

      if (isCorrect) {
        totalScore += question.marks
      }

      // Update the answer with grading
      await prisma.answer.update({
        where: { id: answer.id },
        data: {
          isCorrect,
          marksAwarded: isCorrect ? question.marks : 0,
        },
      })
    }

    const percentageScore = totalPossible > 0 ? (totalScore / totalPossible) * 100 : 0
    const passed = percentageScore >= attempt.quiz.passMark

    // Update attempt
    const updatedAttempt = await prisma.quizAttempt.update({
      where: { id: attemptId },
      data: {
        status: 'SUBMITTED',
        submittedAt: new Date(),
        totalScore,
        percentageScore: Math.round(percentageScore * 100) / 100,
        passed,
      },
    })

    // Create result record
    await prisma.result.create({
      data: {
        attemptId,
        totalScore,
        percentageScore: Math.round(percentageScore * 100) / 100,
        qualificationStatus: passed ? 'PASSED' : 'FAILED',
      },
    })

    // Track submission location & flag mismatches
    trackLocation(session.id, 'QUIZ_SUBMIT', req).catch(() => {})

    await prisma.activityLog.create({
      data: {
        userId: session.id,
        action: 'QUIZ_SUBMIT',
        details: `Submitted quiz: ${attempt.quiz.title} - Score: ${Math.round(percentageScore)}% - ${passed ? 'PASSED' : 'FAILED'}`,
      },
    })

    return NextResponse.json({
      attempt: updatedAttempt,
      result: {
        totalScore,
        percentageScore: Math.round(percentageScore * 100) / 100,
        passed,
        showResult: attempt.quiz.showResultToAgent,
        showScoreOnly: attempt.quiz.showScoreOnly,
      },
    })
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Server error'
    const status = message === 'Unauthorized' ? 401 : message === 'Forbidden' ? 403 : 500
    return NextResponse.json({ error: message }, { status })
  }
}
