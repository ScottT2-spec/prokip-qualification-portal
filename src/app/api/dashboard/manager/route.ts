import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requireAuth } from '@/lib/auth'
import { parsePaginationParams, paginatedResponse, buildUserSearchFilter, buildSortOrder } from '@/lib/pagination'
import { queryCache } from '@/lib/cache'

export async function GET(req: NextRequest) {
  try {
    const session = await requireAuth(['STATE_MANAGER'])
    const params = parsePaginationParams(req)

    // Get states managed by this user (cached 60s)
    const cacheKey = `sm_states_${session.id}`
    const stateNames = await queryCache.wrap(cacheKey, async () => {
      const sm = await prisma.stateManager.findUnique({
        where: { userId: session.id },
        include: { states: { select: { name: true } } },
      })
      return sm?.states.map(s => s.name) || []
    }, 60_000)

    if (stateNames.length === 0) {
      return NextResponse.json({ error: 'State manager profile not found' }, { status: 404 })
    }

    // Build agent filter
    const where: Record<string, unknown> = {
      role: 'AGENT',
      state: { in: stateNames },
    }

    // Apply search
    const searchFilter = buildUserSearchFilter(params.search)
    if (searchFilter.OR) where.OR = searchFilter.OR

    // Apply filters
    if (params.filters.status) {
      where.quizAttempts = {
        some: { result: { qualificationStatus: params.filters.status } },
      }
    }

    const orderBy = buildSortOrder(params.sortBy, params.sortOrder)

    const [agents, total] = await Promise.all([
      prisma.user.findMany({
        where,
        select: {
          id: true,
          fullName: true,
          email: true,
          phone: true,
          state: true,
          createdAt: true,
          quizAttempts: {
            select: {
              id: true,
              status: true,
              percentageScore: true,
              submittedAt: true,
              result: {
                select: { qualificationStatus: true, percentageScore: true },
              },
            },
            orderBy: { createdAt: 'desc' },
            take: 1,
          },
        },
        orderBy,
        skip: params.skip,
        take: params.limit,
      }),
      prisma.user.count({ where }),
    ])

    // Metrics (cached 30s per manager)
    const metricsCacheKey = `sm_metrics_${session.id}`
    const metrics = await queryCache.wrap(metricsCacheKey, async () => {
      const [allAgents, submitted, passed, failed, attempts] = await Promise.all([
        prisma.user.count({ where: { role: 'AGENT', state: { in: stateNames } } }),
        prisma.quizAttempt.count({
          where: { status: 'SUBMITTED', user: { state: { in: stateNames } } },
        }),
        prisma.result.count({
          where: { qualificationStatus: 'PASSED', attempt: { user: { state: { in: stateNames } } } },
        }),
        prisma.result.count({
          where: { qualificationStatus: 'FAILED', attempt: { user: { state: { in: stateNames } } } },
        }),
        prisma.quizAttempt.findMany({
          where: { status: 'SUBMITTED', startedAt: { not: null }, submittedAt: { not: null }, user: { state: { in: stateNames } } },
          select: { startedAt: true, submittedAt: true },
        }),
      ])
      const times = attempts.filter(a => a.startedAt && a.submittedAt).map(a => (new Date(a.submittedAt!).getTime() - new Date(a.startedAt!).getTime()) / 60000)
      const avgCompletionTime = times.length > 0 ? Math.round((times.reduce((a, b) => a + b, 0) / times.length) * 10) / 10 : null
      return { totalRegistered: allAgents, submitted, passed, failed, avgCompletionTime }
    }, 30_000)

    const response = paginatedResponse(
      agents.map(a => ({
        id: a.id,
        fullName: a.fullName,
        email: a.email,
        phone: a.phone,
        state: a.state,
        createdAt: a.createdAt,
        latestAttempt: a.quizAttempts[0] || null,
        result: a.quizAttempts[0]?.result || null,
      })),
      total,
      params,
    )

    return NextResponse.json({ ...response, metrics })
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Server error'
    const status_code = message === 'Unauthorized' ? 401 : message === 'Forbidden' ? 403 : 500
    return NextResponse.json({ error: message }, { status: status_code })
  }
}
