import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { hashPassword, createToken } from '@/lib/auth'
import { trackLocation } from '@/lib/location'

export async function POST(req: NextRequest) {
  try {
    const { fullName, email, phone, password, country, state, referralCode } = await req.json()

    // Validation
    if (!fullName || !email || !phone || !password || !country || !state) {
      return NextResponse.json({ error: 'All fields are required' }, { status: 400 })
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

    // Validate referral link if provided
    let referralLink = null
    if (referralCode) {
      referralLink = await prisma.referralLink.findUnique({
        where: { code: referralCode },
      })
      if (!referralLink || !referralLink.isActive) {
        return NextResponse.json({ error: 'Invalid or expired referral link' }, { status: 400 })
      }
    }

    const passwordHash = await hashPassword(password)

    const user = await prisma.user.create({
      data: {
        fullName,
        email,
        phone,
        passwordHash,
        role: 'AGENT',
        country,
        state,
      },
    })

    // Link to referral
    if (referralLink) {
      await prisma.referralLink.update({
        where: { id: referralLink.id },
        data: {
          usedCount: { increment: 1 },
        },
      })
    }

    // Track location
    trackLocation(user.id, 'REGISTRATION', req).catch(() => {})

    // Log registration
    await prisma.activityLog.create({
      data: {
        userId: user.id,
        action: 'REGISTER',
        details: `Agent registered${referralCode ? ` via referral ${referralCode}` : ''}`,
        ipAddress: req.headers.get('x-forwarded-for') || 'unknown',
      },
    })

    const token = await createToken({
      id: user.id,
      email: user.email,
      fullName: user.fullName,
      role: user.role,
      state: user.state || undefined,
    })

    const response = NextResponse.json({
      user: {
        id: user.id,
        fullName: user.fullName,
        email: user.email,
        role: user.role,
      },
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
    console.error('Registration error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
