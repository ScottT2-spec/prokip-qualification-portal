import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export async function GET() {
  const checks: Record<string, unknown> = {
    dbUrlSet: !!process.env.DATABASE_URL,
    dbUrlPrefix: process.env.DATABASE_URL?.substring(0, 30) + '...',
  }

  try {
    const count = await prisma.user.count()
    checks.dbConnected = true
    checks.userCount = count
  } catch (e: unknown) {
    checks.dbConnected = false
    checks.dbError = e instanceof Error ? e.message : String(e)
  }

  return NextResponse.json(checks)
}
