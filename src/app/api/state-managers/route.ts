import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requireAuth, hashPassword } from '@/lib/auth'

export async function GET() {
  try {
    await requireAuth(['ADMIN'])
    const managers = await prisma.stateManager.findMany({
      include: {
        user: {
          select: { id: true, fullName: true, email: true, phone: true, isActive: true },
        },
        states: true,
      },
      orderBy: { createdAt: 'desc' },
    })
    return NextResponse.json({ managers })
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Server error'
    const status = message === 'Unauthorized' ? 401 : message === 'Forbidden' ? 403 : 500
    return NextResponse.json({ error: message }, { status })
  }
}

export async function POST(req: NextRequest) {
  try {
    await requireAuth(['ADMIN'])
    const { fullName, email, phone, password, states } = await req.json()

    if (!fullName || !email || !phone || !password) {
      return NextResponse.json({ error: 'All fields are required' }, { status: 400 })
    }

    const existing = await prisma.user.findFirst({
      where: { OR: [{ email }, { phone }] },
    })
    if (existing) {
      return NextResponse.json({ error: 'Email or phone already exists' }, { status: 409 })
    }

    const passwordHash = await hashPassword(password)

    const user = await prisma.user.create({
      data: {
        fullName,
        email,
        phone,
        passwordHash,
        role: 'STATE_MANAGER',
      },
    })

    const stateManager = await prisma.stateManager.create({
      data: {
        userId: user.id,
        states: {
          create: (states || []).map((s: { name: string; country: string }) => ({
            name: s.name,
            country: s.country || 'Nigeria',
          })),
        },
      },
      include: { user: true, states: true },
    })

    return NextResponse.json({ stateManager }, { status: 201 })
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Server error'
    const status = message === 'Unauthorized' ? 401 : message === 'Forbidden' ? 403 : 500
    return NextResponse.json({ error: message }, { status })
  }
}
