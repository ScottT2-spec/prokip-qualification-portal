import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requireAuth } from '@/lib/auth'
import { sendScoreEmail, sendBulkScoreEmails } from '@/lib/email'

/**
 * POST /api/scores/release
 * 
 * Release exam scores via email to candidates.
 * 
 * Body options:
 *   { "quizId": "..." }                         — Release to ALL submitted candidates for a quiz
 *   { "quizId": "...", "candidateIds": [...] }   — Release to specific candidates
 *   { "quizId": "...", "state": "Lagos" }        — Release to candidates in a specific state
 *   { "quizId": "...", "status": "PASSED" }      — Release only to passed/failed candidates
 *   { "message": "..." }                         — Optional additional message in the email
 */
export async function POST(req: NextRequest) {
  try {
    const session = await requireAuth(['ADMIN', 'STATE_MANAGER'])
    const body = await req.json()
    const { quizId, candidateIds, state, status, message } = body

    if (!quizId) {
      return NextResponse.json({ error: 'quizId is required' }, { status: 400 })
    }

    // Get quiz details
    const quiz = await prisma.quiz.findUnique({ where: { id: quizId } })
    if (!quiz) {
      return NextResponse.json({ error: 'Quiz not found' }, { status: 404 })
    }

    // Build filter for results
    const where: Record<string, unknown> = {
      attempt: {
        quizId,
        status: 'SUBMITTED',
      },
    }

    // Filter by specific candidates
    if (candidateIds?.length) {
      where.attempt = { ...where.attempt as object, userId: { in: candidateIds } }
    }

    // Filter by state
    if (state) {
      where.attempt = { ...where.attempt as object, user: { state } }
    }

    // State manager scope — restrict to their states
    if (session.role === 'STATE_MANAGER') {
      const sm = await prisma.stateManager.findUnique({
        where: { userId: session.id },
        include: { states: { select: { name: true } } },
      })
      if (!sm) {
        return NextResponse.json({ error: 'State manager profile not found' }, { status: 404 })
      }
      const stateNames = sm.states.map(s => s.name)
      where.attempt = { ...where.attempt as object, user: { state: { in: stateNames } } }
    }

    // Filter by pass/fail status
    if (status) {
      where.qualificationStatus = status
    }

    // Fetch results with candidate info
    const results = await prisma.result.findMany({
      where,
      include: {
        attempt: {
          include: {
            user: {
              select: { id: true, fullName: true, email: true, state: true },
            },
            quiz: {
              select: { title: true, passMark: true },
            },
          },
        },
      },
    })

    if (results.length === 0) {
      return NextResponse.json({ error: 'No results found matching the criteria' }, { status: 404 })
    }

    // Build email data
    const emailData = results.map(result => ({
      to: result.attempt.user.email,
      candidateName: result.attempt.user.fullName,
      quizTitle: result.attempt.quiz.title,
      score: result.totalScore,
      percentageScore: result.percentageScore,
      totalMarks: result.totalScore / (result.percentageScore / 100) || 0,
      passMark: result.attempt.quiz.passMark,
      passed: result.qualificationStatus === 'PASSED',
      state: result.attempt.user.state || undefined,
      additionalMessage: message,
    }))

    // Send emails
    const emailResult = await sendBulkScoreEmails(emailData)

    // Log the release action
    await prisma.activityLog.create({
      data: {
        userId: session.id,
        action: 'SCORES_RELEASED',
        details: JSON.stringify({
          quizId,
          quizTitle: quiz.title,
          totalCandidates: results.length,
          sent: emailResult.sent,
          failed: emailResult.failed,
          filters: { state, status, candidateIds: candidateIds?.length },
        }),
      },
    })

    return NextResponse.json({
      success: true,
      summary: {
        totalCandidates: results.length,
        emailsSent: emailResult.sent,
        emailsFailed: emailResult.failed,
        errors: emailResult.errors.length > 0 ? emailResult.errors : undefined,
      },
    })
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Server error'
    const statusCode = message === 'Unauthorized' ? 401 : message === 'Forbidden' ? 403 : 500
    return NextResponse.json({ error: message }, { status: statusCode })
  }
}
