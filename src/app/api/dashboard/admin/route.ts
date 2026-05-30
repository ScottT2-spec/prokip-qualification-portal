import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requireAuth } from '@/lib/auth'
import { queryCache } from '@/lib/cache'

export async function GET() {
  try {
    await requireAuth(['ADMIN'])

    // Cache dashboard metrics for 30s — avoids hammering DB on rapid refreshes
    const cacheKey = 'admin_dashboard_metrics'
    const cached = queryCache.get<Record<string, unknown>>(cacheKey)
    if (cached) return NextResponse.json(cached)

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
        where: { role: { in: ['AGENT', 'STATE_MANAGER'] } },
        orderBy: { createdAt: 'desc' },
        take: 10,
        select: {
          id: true,
          fullName: true,
          email: true,
          role: true,
          state: true,
          createdAt: true,
        },
      }),
      prisma.user.groupBy({
        by: ['state'],
        where: { role: 'AGENT' },
        _count: true,
      }),
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

    const completionTimes = submittedAttempts
      .filter(a => a.startedAt && a.submittedAt)
      .map(a => (new Date(a.submittedAt!).getTime() - new Date(a.startedAt!).getTime()) / 60000)
    const avgCompletionTime = completionTimes.length > 0
      ? completionTimes.reduce((a, b) => a + b, 0) / completionTimes.length
      : 0

    const response = {
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
    }

    queryCache.set(cacheKey, response, 30_000)
    return NextResponse.json(response)
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Server error'
    const status = message === 'Unauthorized' ? 401 : message === 'Forbidden' ? 403 : 500
    return NextResponse.json({ error: message }, { status })
  }
}
