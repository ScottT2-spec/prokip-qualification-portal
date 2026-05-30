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
      include: { state: { select: { id: true, name: true, country: true } } },
      orderBy: { createdAt: 'desc' },
    })

    // Also return the manager's assigned states for generating new links
    let states: { id: string; name: string; country: string }[] = []
    if (session.role === 'STATE_MANAGER') {
      const sm = await prisma.stateManager.findUnique({
        where: { userId: session.id },
        include: { states: true },
      })
      if (sm) {
        states = sm.states.map(s => ({ id: s.id, name: s.name, country: s.country }))
      }
    } else {
      // Admin gets all states
      const allStates = await prisma.state.findMany()
      states = allStates.map(s => ({ id: s.id, name: s.name, country: s.country }))
    }

    return NextResponse.json({ links, states })
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

export async function PATCH(req: NextRequest) {
  try {
    const session = await requireAuth(['STATE_MANAGER', 'ADMIN'])
    const { linkId, isActive } = await req.json()

    if (!linkId || typeof isActive !== 'boolean') {
      return NextResponse.json({ error: 'linkId and isActive are required' }, { status: 400 })
    }

    // Verify ownership
    const link = await prisma.referralLink.findUnique({ where: { id: linkId } })
    if (!link) {
      return NextResponse.json({ error: 'Link not found' }, { status: 404 })
    }
    if (session.role === 'STATE_MANAGER' && link.managerId !== session.id) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const updated = await prisma.referralLink.update({
      where: { id: linkId },
      data: { isActive },
    })

    return NextResponse.json({ link: updated })
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Server error'
    const status = message === 'Unauthorized' ? 401 : message === 'Forbidden' ? 403 : 500
    return NextResponse.json({ error: message }, { status })
  }
}
