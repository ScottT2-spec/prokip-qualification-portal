import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requireAuth } from '@/lib/auth'

export async function GET(req: NextRequest) {
  try {
    const session = await requireAuth(['STATE_MANAGER'])
    const { searchParams } = new URL(req.url)
    const search = searchParams.get('search')
    const status = searchParams.get('status')
    const page = parseInt(searchParams.get('page') || '1')
    const limit = parseInt(searchParams.get('limit') || '20')

    // Get states managed by this user
    const stateManager = await prisma.stateManager.findUnique({
      where: { userId: session.id },
      include: { states: true },
    })

    if (!stateManager) {
      return NextResponse.json({ error: 'State manager profile not found' }, { status: 404 })
    }

    const stateNames = stateManager.states.map(s => s.name)

    // Build agent filter
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

    const [agents, total] = await Promise.all([
      prisma.user.findMany({
        where,
        include: {
          quizAttempts: {
            include: { result: true },
            orderBy: { createdAt: 'desc' },
            take: 1,
          },
        },
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
      }),
      prisma.user.count({ where }),
    ])

    // Compute metrics
    const allAgents = await prisma.user.count({
      where: { role: 'AGENT', state: { in: stateNames } },
    })
    const submitted = await prisma.quizAttempt.count({
      where: {
        status: 'SUBMITTED',
        user: { state: { in: stateNames } },
      },
    })
    const passed = await prisma.result.count({
      where: {
        qualificationStatus: 'PASSED',
        attempt: { user: { state: { in: stateNames } } },
      },
    })
    const failed = await prisma.result.count({
      where: {
        qualificationStatus: 'FAILED',
        attempt: { user: { state: { in: stateNames } } },
      },
    })

    return NextResponse.json({
      agents: agents.map(a => ({
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
      page,
      limit,
      metrics: {
        totalRegistered: allAgents,
        submitted,
        passed,
        failed,
        notStarted: allAgents - submitted - (allAgents - submitted > 0 ? 0 : 0),
      },
    })
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Server error'
    const status_code = message === 'Unauthorized' ? 401 : message === 'Forbidden' ? 403 : 500
    return NextResponse.json({ error: message }, { status: status_code })
  }
}
