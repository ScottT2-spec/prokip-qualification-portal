import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requireAuth } from '@/lib/auth'

export async function GET(req: NextRequest) {
  try {
    const session = await requireAuth(['STATE_MANAGER'])
    const { searchParams } = new URL(req.url)
    const search = searchParams.get('search')
    const status = searchParams.get('status')
    const scoreFilter = searchParams.get('scoreFilter')
    const percentageMin = searchParams.get('percentageMin')
    const percentageMax = searchParams.get('percentageMax')
    const dateRange = searchParams.get('dateRange')
    const dateFrom = searchParams.get('dateFrom')
    const dateTo = searchParams.get('dateTo')
    const completionTime = searchParams.get('completionTime')
    const sortBy = searchParams.get('sortBy') || 'createdAt'
    const sortOrder = (searchParams.get('sortOrder') || 'desc') as 'asc' | 'desc'
    const page = parseInt(searchParams.get('page') || '1')
    const limit = parseInt(searchParams.get('limit') || '20')

    const stateManager = await prisma.stateManager.findUnique({
      where: { userId: session.id },
      include: { states: true },
    })

    if (!stateManager) {
      return NextResponse.json({ error: 'State manager profile not found' }, { status: 404 })
    }

    const stateNames = stateManager.states.map(s => s.name)

    // Base filter
    const where: Record<string, unknown> = {
      role: 'AGENT',
      state: { in: stateNames },
    }
    if (search) {
      where.OR = [
        { fullName: { contains: search, mode: 'insensitive' } },
        { email: { contains: search, mode: 'insensitive' } },
        { phone: { contains: search } },
      ]
    }

    // Date range filter on user createdAt
    if (dateRange || (dateFrom && dateTo)) {
      const now = new Date()
      let start: Date | undefined
      let end: Date | undefined

      if (dateRange === 'today') {
        start = new Date(now.getFullYear(), now.getMonth(), now.getDate())
        end = new Date(start.getTime() + 86400000)
      } else if (dateRange === 'yesterday') {
        end = new Date(now.getFullYear(), now.getMonth(), now.getDate())
        start = new Date(end.getTime() - 86400000)
      } else if (dateRange === 'last7') {
        start = new Date(now.getTime() - 7 * 86400000)
        end = now
      } else if (dateRange === 'last30') {
        start = new Date(now.getTime() - 30 * 86400000)
        end = now
      } else if (dateFrom && dateTo) {
        start = new Date(dateFrom)
        end = new Date(dateTo)
        end.setDate(end.getDate() + 1) // include end date
      }

      if (start && end) {
        where.createdAt = { gte: start, lt: end }
      }
    }

    // Fetch all matching agents with attempts
    const allMatchingAgents = await prisma.user.findMany({
      where,
      include: {
        quizAttempts: {
          include: { result: true },
          orderBy: { createdAt: 'desc' },
          take: 1,
        },
      },
      orderBy: sortBy === 'createdAt' ? { createdAt: sortOrder } : { createdAt: 'desc' },
    })

    // Post-query filtering (status, score, percentage, completion time)
    let filtered = allMatchingAgents.map(a => {
      const attempt = a.quizAttempts[0] || null
      const result = attempt?.result || null
      const agentStatus = result?.qualificationStatus || attempt?.status || 'NOT_STARTED'
      const pct = result?.percentageScore ?? attempt?.percentageScore ?? null
      const completionMs = (attempt?.startedAt && attempt?.submittedAt)
        ? new Date(attempt.submittedAt).getTime() - new Date(attempt.startedAt).getTime()
        : null
      const completionMin = completionMs != null ? completionMs / 60000 : null

      return {
        id: a.id,
        fullName: a.fullName,
        email: a.email,
        phone: a.phone,
        state: a.state,
        createdAt: a.createdAt,
        latestAttempt: attempt,
        result,
        _status: agentStatus,
        _pct: pct,
        _completionMin: completionMin,
        _submittedAt: attempt?.submittedAt || null,
      }
    })

    // Status filter
    if (status && status !== 'all') {
      filtered = filtered.filter(a => a._status === status)
    }

    // Score filter
    if (scoreFilter === 'highest') {
      filtered.sort((a, b) => (b._pct ?? -1) - (a._pct ?? -1))
    } else if (scoreFilter === 'lowest') {
      filtered.sort((a, b) => (a._pct ?? 999) - (b._pct ?? 999))
    } else if (scoreFilter === 'abovePass') {
      filtered = filtered.filter(a => a._pct != null && a._pct >= 70)
    } else if (scoreFilter === 'belowPass') {
      filtered = filtered.filter(a => a._pct != null && a._pct < 70)
    }

    // Percentage range filter
    if (percentageMin != null && percentageMax != null) {
      const pMin = parseFloat(percentageMin)
      const pMax = parseFloat(percentageMax)
      if (!isNaN(pMin) && !isNaN(pMax)) {
        filtered = filtered.filter(a => a._pct != null && a._pct >= pMin && a._pct <= pMax)
      }
    }

    // Completion time filter
    if (completionTime) {
      if (completionTime === 'under10') {
        filtered = filtered.filter(a => a._completionMin != null && a._completionMin < 10)
      } else if (completionTime === 'under20') {
        filtered = filtered.filter(a => a._completionMin != null && a._completionMin < 20)
      } else if (completionTime === 'under30') {
        filtered = filtered.filter(a => a._completionMin != null && a._completionMin < 30)
      } else if (completionTime === 'above30') {
        filtered = filtered.filter(a => a._completionMin != null && a._completionMin >= 30)
      }
    }

    // Sorting
    if (sortBy === 'percentageScore') {
      filtered.sort((a, b) => sortOrder === 'asc' ? (a._pct ?? -1) - (b._pct ?? -1) : (b._pct ?? -1) - (a._pct ?? -1))
    } else if (sortBy === 'completionTime') {
      filtered.sort((a, b) => sortOrder === 'asc' ? (a._completionMin ?? 9999) - (b._completionMin ?? 9999) : (b._completionMin ?? -1) - (a._completionMin ?? -1))
    } else if (sortBy === 'submittedAt') {
      filtered.sort((a, b) => {
        const aT = a._submittedAt ? new Date(a._submittedAt).getTime() : 0
        const bT = b._submittedAt ? new Date(b._submittedAt).getTime() : 0
        return sortOrder === 'asc' ? aT - bT : bT - aT
      })
    } else if (sortBy === 'passStatus') {
      const order: Record<string, number> = { PASSED: 0, FAILED: 1, SUBMITTED: 2, IN_PROGRESS: 3, NOT_STARTED: 4 }
      filtered.sort((a, b) => sortOrder === 'asc' ? (order[a._status] ?? 5) - (order[b._status] ?? 5) : (order[b._status] ?? 5) - (order[a._status] ?? 5))
    }

    const total = filtered.length
    const paginated = filtered.slice((page - 1) * limit, page * limit)

    // ── Enhanced metrics ──
    const allAgentCount = await prisma.user.count({
      where: { role: 'AGENT', state: { in: stateNames } },
    })

    const allResults = await prisma.result.findMany({
      where: { attempt: { user: { state: { in: stateNames } } } },
      select: { percentageScore: true, qualificationStatus: true },
    })

    const allAttempts = await prisma.quizAttempt.findMany({
      where: {
        user: { state: { in: stateNames } },
        status: 'SUBMITTED',
        startedAt: { not: null },
        submittedAt: { not: null },
      },
      select: { startedAt: true, submittedAt: true },
    })

    const submittedCount = await prisma.quizAttempt.count({
      where: { status: 'SUBMITTED', user: { state: { in: stateNames } } },
    })

    const passedCount = allResults.filter(r => r.qualificationStatus === 'PASSED').length
    const failedCount = allResults.filter(r => r.qualificationStatus === 'FAILED').length

    const scores = allResults.map(r => r.percentageScore).filter((s): s is number => s != null)
    const avgScore = scores.length > 0 ? Math.round((scores.reduce((a, b) => a + b, 0) / scores.length) * 10) / 10 : null
    const highestScore = scores.length > 0 ? Math.max(...scores) : null
    const lowestScore = scores.length > 0 ? Math.min(...scores) : null
    const passRate = submittedCount > 0 ? Math.round((passedCount / submittedCount) * 1000) / 10 : null

    const completionTimes = allAttempts
      .map(a => {
        if (!a.startedAt || !a.submittedAt) return null
        return (new Date(a.submittedAt).getTime() - new Date(a.startedAt).getTime()) / 60000
      })
      .filter((t): t is number => t != null && t > 0)

    const avgCompletionTime = completionTimes.length > 0
      ? Math.round((completionTimes.reduce((a, b) => a + b, 0) / completionTimes.length) * 10) / 10
      : null

    const inProgressCount = await prisma.quizAttempt.count({
      where: { status: 'IN_PROGRESS', user: { state: { in: stateNames } } },
    })

    const agentsWithAttempts = await prisma.quizAttempt.groupBy({
      by: ['userId'],
      where: { user: { state: { in: stateNames } } },
    })

    const notStartedCount = allAgentCount - agentsWithAttempts.length

    return NextResponse.json({
      agents: paginated.map(a => ({
        id: a.id,
        fullName: a.fullName,
        email: a.email,
        phone: a.phone,
        state: a.state,
        createdAt: a.createdAt,
        latestAttempt: a.latestAttempt,
        result: a.result,
        completionMinutes: a._completionMin,
      })),
      total,
      page,
      limit,
      metrics: {
        totalRegistered: allAgentCount,
        submitted: submittedCount,
        passed: passedCount,
        failed: failedCount,
        notStarted: notStartedCount,
        inProgress: inProgressCount,
        passRate,
        avgScore,
        highestScore,
        lowestScore,
        avgCompletionTime,
      },
    })
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Server error'
    const status_code = message === 'Unauthorized' ? 401 : message === 'Forbidden' ? 403 : 500
    return NextResponse.json({ error: message }, { status: status_code })
  }
}
