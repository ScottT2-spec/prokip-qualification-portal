import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requireAuth } from '@/lib/auth'

export async function GET(req: NextRequest) {
  try {
    const session = await requireAuth(['ADMIN', 'STATE_MANAGER'])

    // Scope to manager's states if STATE_MANAGER
    let stateFilter: Record<string, unknown> | undefined
    if (session.role === 'STATE_MANAGER') {
      const sm = await prisma.stateManager.findUnique({
        where: { userId: session.id },
        include: { states: true },
      })
      if (!sm) return NextResponse.json({ error: 'State manager not found' }, { status: 404 })
      stateFilter = { state: { in: sm.states.map(s => s.name) } }
    }

    const userWhere = { role: 'AGENT' as const, ...stateFilter }
    const attemptUserWhere = stateFilter ? { user: stateFilter } : {}

    // ── Performance Metrics ──
    const [totalCandidates, totalAttempts, submittedCount, allResults, submittedAttempts] = await Promise.all([
      prisma.user.count({ where: userWhere }),
      prisma.quizAttempt.count({ where: { ...attemptUserWhere } }),
      prisma.quizAttempt.count({ where: { status: 'SUBMITTED', ...attemptUserWhere } }),
      prisma.result.findMany({
        where: { attempt: { ...attemptUserWhere } },
        select: { percentageScore: true, qualificationStatus: true },
      }),
      prisma.quizAttempt.findMany({
        where: { status: 'SUBMITTED', startedAt: { not: null }, submittedAt: { not: null }, ...attemptUserWhere },
        select: { startedAt: true, submittedAt: true },
      }),
    ])

    const scores = allResults.map(r => r.percentageScore).filter((s): s is number => s != null)
    const passedCount = allResults.filter(r => r.qualificationStatus === 'PASSED').length
    const failedCount = allResults.filter(r => r.qualificationStatus === 'FAILED').length
    const passRate = submittedCount > 0 ? Math.round((passedCount / submittedCount) * 1000) / 10 : 0
    const failureRate = submittedCount > 0 ? Math.round((failedCount / submittedCount) * 1000) / 10 : 0
    const avgScore = scores.length > 0 ? Math.round((scores.reduce((a, b) => a + b, 0) / scores.length) * 10) / 10 : 0

    const completionTimes = submittedAttempts
      .map(a => a.startedAt && a.submittedAt ? (new Date(a.submittedAt).getTime() - new Date(a.startedAt).getTime()) / 60000 : null)
      .filter((t): t is number => t != null && t > 0)
    const avgCompletionTime = completionTimes.length > 0
      ? Math.round((completionTimes.reduce((a, b) => a + b, 0) / completionTimes.length) * 10) / 10
      : 0

    // ── Fastest Candidates ──
    const fastestAttempts = await prisma.quizAttempt.findMany({
      where: { status: 'SUBMITTED', startedAt: { not: null }, submittedAt: { not: null }, ...attemptUserWhere },
      include: { user: { select: { fullName: true } }, result: { select: { percentageScore: true } } },
      orderBy: { submittedAt: 'asc' },
      take: 100,
    })

    const fastest = fastestAttempts
      .map(a => ({
        name: a.user.fullName,
        percentage: a.result?.percentageScore ?? a.percentageScore ?? 0,
        timeTaken: a.startedAt && a.submittedAt
          ? Math.round((new Date(a.submittedAt).getTime() - new Date(a.startedAt).getTime()) / 60000 * 10) / 10
          : 0,
      }))
      .filter(a => a.timeTaken > 0)
      .sort((a, b) => a.timeTaken - b.timeTaken)
      .slice(0, 10)

    // ── Highest Scoring Candidates ──
    const highestResults = await prisma.result.findMany({
      where: { attempt: { ...attemptUserWhere } },
      include: { attempt: { include: { user: { select: { fullName: true, state: true } } } } },
      orderBy: { percentageScore: 'desc' },
      take: 10,
    })

    const highestScoring = highestResults.map(r => ({
      name: r.attempt.user.fullName,
      percentage: r.percentageScore,
      state: r.attempt.user.state || '—',
    }))

    // ── Lowest Scoring Candidates ──
    const lowestResults = await prisma.result.findMany({
      where: { attempt: { ...attemptUserWhere } },
      include: { attempt: { include: { user: { select: { fullName: true, state: true } } } } },
      orderBy: { percentageScore: 'asc' },
      take: 10,
    })

    const lowestScoring = lowestResults.map(r => ({
      name: r.attempt.user.fullName,
      percentage: r.percentageScore,
      state: r.attempt.user.state || '—',
    }))

    // ── Score Distribution ──
    const distribution = { '0-20': 0, '21-40': 0, '41-60': 0, '61-80': 0, '81-100': 0 }
    for (const s of scores) {
      if (s <= 20) distribution['0-20']++
      else if (s <= 40) distribution['21-40']++
      else if (s <= 60) distribution['41-60']++
      else if (s <= 80) distribution['61-80']++
      else distribution['81-100']++
    }

    // ── Submission Trends ──
    const now = new Date()
    const thirtyDaysAgo = new Date(now.getTime() - 30 * 86400000)

    const recentSubmissions = await prisma.quizAttempt.findMany({
      where: {
        status: 'SUBMITTED',
        submittedAt: { gte: thirtyDaysAgo },
        ...attemptUserWhere,
      },
      select: { submittedAt: true },
      orderBy: { submittedAt: 'asc' },
    })

    // Daily submissions (last 30 days)
    const dailyMap: Record<string, number> = {}
    const weeklyMap: Record<string, number> = {}
    const monthlyMap: Record<string, number> = {}

    for (let i = 29; i >= 0; i--) {
      const d = new Date(now.getTime() - i * 86400000)
      const key = d.toISOString().slice(0, 10)
      dailyMap[key] = 0
    }

    for (const s of recentSubmissions) {
      if (!s.submittedAt) continue
      const key = new Date(s.submittedAt).toISOString().slice(0, 10)
      if (dailyMap[key] !== undefined) dailyMap[key]++
    }

    // Weekly (last 12 weeks)
    const twelveWeeksAgo = new Date(now.getTime() - 84 * 86400000)
    const weeklySubmissions = await prisma.quizAttempt.findMany({
      where: { status: 'SUBMITTED', submittedAt: { gte: twelveWeeksAgo }, ...attemptUserWhere },
      select: { submittedAt: true },
    })

    for (let i = 11; i >= 0; i--) {
      const weekStart = new Date(now.getTime() - (i + 1) * 7 * 86400000)
      const label = `W${weekStart.toISOString().slice(5, 10)}`
      weeklyMap[label] = 0
    }

    for (const s of weeklySubmissions) {
      if (!s.submittedAt) continue
      const weeksAgo = Math.floor((now.getTime() - new Date(s.submittedAt).getTime()) / (7 * 86400000))
      if (weeksAgo < 12) {
        const weekStart = new Date(now.getTime() - (weeksAgo + 1) * 7 * 86400000)
        const label = `W${weekStart.toISOString().slice(5, 10)}`
        if (weeklyMap[label] !== undefined) weeklyMap[label]++
      }
    }

    // Monthly (last 6 months)
    const sixMonthsAgo = new Date(now.getFullYear(), now.getMonth() - 5, 1)
    const monthlySubmissions = await prisma.quizAttempt.findMany({
      where: { status: 'SUBMITTED', submittedAt: { gte: sixMonthsAgo }, ...attemptUserWhere },
      select: { submittedAt: true },
    })

    for (let i = 5; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1)
      const label = d.toISOString().slice(0, 7)
      monthlyMap[label] = 0
    }

    for (const s of monthlySubmissions) {
      if (!s.submittedAt) continue
      const label = new Date(s.submittedAt).toISOString().slice(0, 7)
      if (monthlyMap[label] !== undefined) monthlyMap[label]++
    }

    return NextResponse.json({
      performance: {
        passRate,
        failureRate,
        avgScore,
        avgCompletionTime,
        totalCandidates,
        totalAttempts,
      },
      fastest,
      highestScoring,
      lowestScoring,
      scoreDistribution: distribution,
      submissionTrends: {
        daily: Object.entries(dailyMap).map(([date, count]) => ({ date, count })),
        weekly: Object.entries(weeklyMap).map(([week, count]) => ({ week, count })),
        monthly: Object.entries(monthlyMap).map(([month, count]) => ({ month, count })),
      },
    })
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Server error'
    const status = message === 'Unauthorized' ? 401 : message === 'Forbidden' ? 403 : 500
    return NextResponse.json({ error: message }, { status })
  }
}
