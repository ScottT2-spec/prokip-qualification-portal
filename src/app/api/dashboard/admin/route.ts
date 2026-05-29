import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requireAuth } from '@/lib/auth'

export async function GET() {
  try {
    await requireAuth(['ADMIN'])

    const [
      totalRegistrations,
      totalAttempts,
      passedCount,
      failedCount,
      results,
      recentRegistrations,
      statePerformance,
    ] = await Promise.all([
      prisma.user.count({ where: { role: 'AGENT' } }),
      prisma.quizAttempt.count({ where: { status: 'SUBMITTED' } }),
      prisma.result.count({ where: { qualificationStatus: 'PASSED' } }),
      prisma.result.count({ where: { qualificationStatus: 'FAILED' } }),
      prisma.result.findMany({
        select: { percentageScore: true },
      }),
      prisma.user.findMany({
        where: { role: 'AGENT' },
        orderBy: { createdAt: 'desc' },
        take: 10,
        select: {
          id: true,
          fullName: true,
          email: true,
          state: true,
          createdAt: true,
        },
      }),
      prisma.user.groupBy({
        by: ['state'],
        where: { role: 'AGENT' },
        _count: true,
      }),
    ])

    const scores = results.map(r => r.percentageScore)
    const avgScore = scores.length > 0 ? scores.reduce((a, b) => a + b, 0) / scores.length : 0
    const highestScore = scores.length > 0 ? Math.max(...scores) : 0
    const lowestScore = scores.length > 0 ? Math.min(...scores) : 0
    const passRate = totalAttempts > 0 ? (passedCount / totalAttempts) * 100 : 0
    const failureRate = totalAttempts > 0 ? (failedCount / totalAttempts) * 100 : 0

    return NextResponse.json({
      metrics: {
        totalRegistrations,
        totalAttempts,
        passRate: Math.round(passRate * 100) / 100,
        failureRate: Math.round(failureRate * 100) / 100,
        averageScore: Math.round(avgScore * 100) / 100,
        highestScore: Math.round(highestScore * 100) / 100,
        lowestScore: Math.round(lowestScore * 100) / 100,
        passedCount,
        failedCount,
      },
      recentRegistrations,
      statePerformance,
    })
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Server error'
    const status = message === 'Unauthorized' ? 401 : message === 'Forbidden' ? 403 : 500
    return NextResponse.json({ error: message }, { status })
  }
}
