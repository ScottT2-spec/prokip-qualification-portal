import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requireAuth } from '@/lib/auth'
import { parsePaginationParams, paginatedResponse, buildUserSearchFilter, buildAgentFilters, buildSortOrder } from '@/lib/pagination'
import { queryCache } from '@/lib/cache'

export async function GET(req: NextRequest) {
  try {
    const session = await requireAuth(['ADMIN', 'STATE_MANAGER'])
    const params = parsePaginationParams(req)

    // Base filter: agents only
    const where: Record<string, unknown> = { role: 'AGENT' }

    // State manager scope — restrict to managed states
    if (session.role === 'STATE_MANAGER') {
      const cacheKey = `sm_states_${session.id}`
      const stateNames = await queryCache.wrap(cacheKey, async () => {
        const sm = await prisma.stateManager.findUnique({
          where: { userId: session.id },
          include: { states: { select: { name: true } } },
        })
        return sm?.states.map(s => s.name) || []
      }, 60_000)

      if (stateNames.length > 0) {
        where.state = { in: stateNames }
      }
    }

    // Apply search
    const searchFilter = buildUserSearchFilter(params.search)
    if (searchFilter.OR) where.OR = searchFilter.OR

    // Apply filters (state, country, status, date range, isActive)
    const filterWhere = buildAgentFilters(params.filters)
    Object.assign(where, filterWhere)

    // Execute paginated query + count in parallel
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
          country: true,
          isActive: true,
          createdAt: true,
          quizAttempts: {
            select: {
              id: true,
              status: true,
              percentageScore: true,
              submittedAt: true,
              attemptNumber: true,
              result: {
                select: {
                  qualificationStatus: true,
                  percentageScore: true,
                },
              },
              quiz: { select: { title: true } },
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

    return NextResponse.json(paginatedResponse(agents, total, params))
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Server error'
    const status = message === 'Unauthorized' ? 401 : message === 'Forbidden' ? 403 : 500
    return NextResponse.json({ error: message }, { status })
  }
}
