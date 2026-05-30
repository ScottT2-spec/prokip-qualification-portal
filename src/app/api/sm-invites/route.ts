import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requireAuth } from '@/lib/auth'
import crypto from 'crypto'

export async function GET() {
  try {
    await requireAuth(['ADMIN'])

    const invites = await prisma.smInvite.findMany({
      include: {
        states: true,
        registeredUser: {
          select: { id: true, fullName: true, email: true, phone: true, isActive: true, createdAt: true },
        },
      },
      orderBy: { createdAt: 'desc' },
    })

    // Get candidate stats for registered managers
    const enriched = await Promise.all(
      invites.map(async (invite) => {
        if (!invite.registeredUserId) return { ...invite, stats: null }

        const sm = await prisma.stateManager.findUnique({
          where: { userId: invite.registeredUserId },
          include: { states: true },
        })
        if (!sm) return { ...invite, stats: null }

        const stateNames = sm.states.map((s) => s.name)
        const agents = await prisma.user.findMany({
          where: { role: 'AGENT', state: { in: stateNames } },
          include: { quizAttempts: { include: { result: true }, orderBy: { createdAt: 'desc' }, take: 1 } },
        })

        const total = agents.length
        const passed = agents.filter((a) => a.quizAttempts[0]?.result?.qualificationStatus === 'PASSED').length
        const failed = agents.filter((a) => a.quizAttempts[0]?.result?.qualificationStatus === 'FAILED').length
        const passRate = total > 0 ? Math.round((passed / total) * 100) : 0

        return { ...invite, stats: { totalCandidates: total, passed, failed, passRate } }
      })
    )

    return NextResponse.json({ invites: enriched })
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Server error'
    const status = message === 'Unauthorized' ? 401 : message === 'Forbidden' ? 403 : 500
    return NextResponse.json({ error: message }, { status })
  }
}

export async function POST(req: NextRequest) {
  try {
    await requireAuth(['ADMIN'])
    const { states, expiresAt } = await req.json()

    if (!states || !Array.isArray(states) || states.length === 0) {
      return NextResponse.json({ error: 'At least one state is required' }, { status: 400 })
    }

    const code = crypto.randomBytes(12).toString('base64url')

    const invite = await prisma.smInvite.create({
      data: {
        code,
        expiresAt: expiresAt ? new Date(expiresAt) : null,
        states: {
          create: states.map((s: { name: string; country: string }) => ({
            name: s.name,
            country: s.country || 'Nigeria',
          })),
        },
      },
      include: { states: true },
    })

    return NextResponse.json({ invite }, { status: 201 })
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Server error'
    const status = message === 'Unauthorized' ? 401 : message === 'Forbidden' ? 403 : 500
    return NextResponse.json({ error: message }, { status })
  }
}

export async function PATCH(req: NextRequest) {
  try {
    await requireAuth(['ADMIN'])
    const { inviteId, isActive, regenerate } = await req.json()

    if (!inviteId) {
      return NextResponse.json({ error: 'inviteId is required' }, { status: 400 })
    }

    const data: Record<string, unknown> = {}
    if (typeof isActive === 'boolean') data.isActive = isActive
    if (regenerate) data.code = crypto.randomBytes(12).toString('base64url')

    const invite = await prisma.smInvite.update({
      where: { id: inviteId },
      data,
      include: { states: true, registeredUser: { select: { id: true, fullName: true, email: true } } },
    })

    return NextResponse.json({ invite })
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Server error'
    const status = message === 'Unauthorized' ? 401 : message === 'Forbidden' ? 403 : 500
    return NextResponse.json({ error: message }, { status })
  }
}

export async function DELETE(req: NextRequest) {
  try {
    await requireAuth(['ADMIN'])
    const { inviteId } = await req.json()

    if (!inviteId) {
      return NextResponse.json({ error: 'inviteId is required' }, { status: 400 })
    }

    await prisma.smInvite.delete({ where: { id: inviteId } })
    return NextResponse.json({ success: true })
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Server error'
    const status = message === 'Unauthorized' ? 401 : message === 'Forbidden' ? 403 : 500
    return NextResponse.json({ error: message }, { status })
  }
}
