import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { hashPassword, createToken } from '@/lib/auth'

// GET: Validate invite link and return assigned states
export async function GET(req: NextRequest, { params }: { params: Promise<{ code: string }> }) {
  try {
    const { code } = await params

    const invite = await prisma.smInvite.findUnique({
      where: { code },
      include: { states: true },
    })

    if (!invite) {
      return NextResponse.json({ error: 'Invalid invitation link' }, { status: 404 })
    }
    if (!invite.isActive) {
      return NextResponse.json({ error: 'This invitation link has been disabled' }, { status: 410 })
    }
    if (invite.expiresAt && invite.expiresAt < new Date()) {
      return NextResponse.json({ error: 'This invitation link has expired' }, { status: 410 })
    }
    if (invite.registeredUserId) {
      return NextResponse.json({ error: 'This invitation link has already been used' }, { status: 410 })
    }

    return NextResponse.json({
      valid: true,
      states: invite.states.map((s) => ({ name: s.name, country: s.country })),
    })
  } catch {
    return NextResponse.json({ error: 'Server error' }, { status: 500 })
  }
}

// POST: Register state manager via invite link
export async function POST(req: NextRequest, { params }: { params: Promise<{ code: string }> }) {
  try {
    const { code } = await params
    const { fullName, email, phone, password } = await req.json()

    if (!fullName || !email || !phone || !password) {
      return NextResponse.json({ error: 'All fields are required' }, { status: 400 })
    }

    // Validate invite
    const invite = await prisma.smInvite.findUnique({
      where: { code },
      include: { states: true },
    })

    if (!invite) {
      return NextResponse.json({ error: 'Invalid invitation link' }, { status: 404 })
    }
    if (!invite.isActive) {
      return NextResponse.json({ error: 'This invitation link has been disabled' }, { status: 410 })
    }
    if (invite.expiresAt && invite.expiresAt < new Date()) {
      return NextResponse.json({ error: 'This invitation link has expired' }, { status: 410 })
    }
    if (invite.registeredUserId) {
      return NextResponse.json({ error: 'This invitation link has already been used' }, { status: 410 })
    }

    // Check duplicates
    const existingEmail = await prisma.user.findUnique({ where: { email } })
    if (existingEmail) {
      return NextResponse.json({ error: 'Email already registered' }, { status: 409 })
    }
    const existingPhone = await prisma.user.findUnique({ where: { phone } })
    if (existingPhone) {
      return NextResponse.json({ error: 'Phone number already registered' }, { status: 409 })
    }

    const passwordHash = await hashPassword(password)

    // Create user + state manager + link states in a transaction
    const result = await prisma.$transaction(async (tx) => {
      const user = await tx.user.create({
        data: {
          fullName,
          email,
          phone,
          passwordHash,
          role: 'STATE_MANAGER',
          country: invite.states[0]?.country || 'Nigeria',
          state: invite.states.map((s) => s.name).join(', '),
        },
      })

      await tx.stateManager.create({
        data: {
          userId: user.id,
          states: {
            create: invite.states.map((s) => ({
              name: s.name,
              country: s.country,
            })),
          },
        },
      })

      await tx.smInvite.update({
        where: { id: invite.id },
        data: { registeredUserId: user.id, registeredAt: new Date() },
      })

      await tx.activityLog.create({
        data: {
          userId: user.id,
          action: 'SM_REGISTER',
          details: `State Manager registered via invite for: ${invite.states.map((s) => s.name).join(', ')}`,
        },
      })

      return user
    })

    const token = await createToken({
      id: result.id,
      email: result.email,
      fullName: result.fullName,
      role: result.role,
    })

    const response = NextResponse.json({
      user: { id: result.id, fullName: result.fullName, email: result.email, role: result.role },
    })

    response.cookies.set('session-token', token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 60 * 60 * 24,
      path: '/',
    })

    return response
  } catch (error) {
    console.error('SM Registration error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
