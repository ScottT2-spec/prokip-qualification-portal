import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requireAuth } from '@/lib/auth'

export async function GET() {
  try {
    await requireAuth(['ADMIN'])

    const [
      totalCandidates,
      totalStates,
      totalStateManagers,
      totalSubmissions,
      passedCount,
      failedCount,
      results,
      submittedAttempts,
      recentRegistrations,
      statePerformance,
      suspiciousAccounts,
    ] = await Promise.all([
      prisma.user.count({ where: { role: 'AGENT' } }),
      prisma.state.count(),
      prisma.stateManager.count(),
      prisma.quizAttempt.count({ where: { status: 'SUBMITTED' } }),
      prisma.result.count({ where: { qualificationStatus: 'PASSED' } }),
      prisma.result.count({ where: { qualificationStatus: 'FAILED' } }),
      prisma.result.findMany({
        select: { percentageScore: true },
      }),
      prisma.quizAttempt.findMany({
        where: { status: 'SUBMITTED', startedAt: { not: null }, submittedAt: { not: null } },
        select: { startedAt: true, submittedAt: true },
      }),
      prisma.user.findMany({
        where: { role: 'AGENT' },
        orderBy: { createdAt: 'desc' },
        take: 10,
        select: {
          id: true,
          fullName: true,
          email: true,
          state: true,
          createdAt: true,
        },
      }),
      prisma.user.groupBy({
        by: ['state'],
        where: { role: 'AGENT' },
        _count: true,
      }),
      // Suspicious: agents with multiple attempts or deactivated accounts
      prisma.user.count({
        where: {
          role: 'AGENT',
          OR: [
            { isActive: false },
            { quizAttempts: { some: { attemptNumber: { gt: 1 } } } },
          ],
        },
      }),
    ])

    const scores = results.map(r => r.percentageScore)
    const avgScore = scores.length > 0 ? scores.reduce((a, b) => a + b, 0) / scores.length : 0
    const highestScore = scores.length > 0 ? Math.max(...scores) : 0
    const lowestScore = scores.length > 0 ? Math.min(...scores) : 0
    const passRate = totalSubmissions > 0 ? (passedCount / totalSubmissions) * 100 : 0
    const failureRate = totalSubmissions > 0 ? (failedCount / totalSubmissions) * 100 : 0

    // Average completion time in minutes
    const completionTimes = submittedAttempts
      .filter(a => a.startedAt && a.submittedAt)
      .map(a => (new Date(a.submittedAt!).getTime() - new Date(a.startedAt!).getTime()) / 60000)
    const avgCompletionTime = completionTimes.length > 0
      ? completionTimes.reduce((a, b) => a + b, 0) / completionTimes.length
      : 0

    return NextResponse.json({
      metrics: {
        totalCandidates,
        totalStates,
        totalStateManagers,
        totalSubmissions,
        passedCount,
        failedCount,
        passRate: Math.round(passRate * 100) / 100,
        failureRate: Math.round(failureRate * 100) / 100,
        averageScore: Math.round(avgScore * 100) / 100,
        highestScore: Math.round(highestScore * 100) / 100,
        lowestScore: Math.round(lowestScore * 100) / 100,
        avgCompletionTime: Math.round(avgCompletionTime * 10) / 10,
        suspiciousAccounts,
      },
      recentRegistrations,
      statePerformance,
    })
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Server error'
    const status = message === 'Unauthorized' ? 401 : message === 'Forbidden' ? 403 : 500
    return NextResponse.json({ error: message }, { status })
  }
}
