import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requireAuth } from '@/lib/auth'

export async function GET(req: NextRequest) {
  try {
    const session = await requireAuth(['ADMIN', 'STATE_MANAGER'])
    const { searchParams } = new URL(req.url)
    const search = searchParams.get('search')
    const state = searchParams.get('state')
    const status = searchParams.get('status')
    const page = parseInt(searchParams.get('page') || '1')
    const limit = parseInt(searchParams.get('limit') || '20')

    const where: Record<string, unknown> = { role: 'AGENT' }

    if (session.role === 'STATE_MANAGER') {
      const sm = await prisma.stateManager.findUnique({
        where: { userId: session.id },
        include: { states: true },
      })
      if (sm) {
        where.state = { in: sm.states.map(s => s.name) }
      }
    }

    if (state) where.state = state
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
            include: { result: true, quiz: { select: { title: true } } },
            orderBy: { createdAt: 'desc' },
          },
        },
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
      }),
      prisma.user.count({ where }),
    ])

    return NextResponse.json({ agents, total, page, limit })
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Server error'
    const status = message === 'Unauthorized' ? 401 : message === 'Forbidden' ? 403 : 500
    return NextResponse.json({ error: message }, { status })
  }
}
