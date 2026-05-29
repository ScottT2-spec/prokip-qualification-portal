import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requireAuth } from '@/lib/auth'

export async function GET() {
  try {
    const session = await requireAuth(['STATE_MANAGER', 'ADMIN'])

    const where: Record<string, unknown> = {}
    if (session.role === 'STATE_MANAGER') {
      where.managerId = session.id
    }

    const links = await prisma.referralLink.findMany({
      where,
      orderBy: { createdAt: 'desc' },
    })

    return NextResponse.json({ links })
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Server error'
    const status = message === 'Unauthorized' ? 401 : message === 'Forbidden' ? 403 : 500
    return NextResponse.json({ error: message }, { status })
  }
}

export async function POST(req: NextRequest) {
  try {
    const session = await requireAuth(['STATE_MANAGER', 'ADMIN'])
    const { stateId } = await req.json()

    // Generate unique code
    const state = await prisma.state.findUnique({ where: { id: stateId } })
    if (!state) {
      return NextResponse.json({ error: 'State not found' }, { status: 404 })
    }

    const code = `${state.name.toLowerCase().replace(/\s+/g, '-')}/${session.id.slice(-6)}${Date.now().toString(36)}`

    const link = await prisma.referralLink.create({
      data: {
        code,
        stateId,
        managerId: session.id,
      },
    })

    return NextResponse.json({ link }, { status: 201 })
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Server error'
    const status = message === 'Unauthorized' ? 401 : message === 'Forbidden' ? 403 : 500
    return NextResponse.json({ error: message }, { status })
  }
}
