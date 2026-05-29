import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requireAuth } from '@/lib/auth'
import * as XLSX from 'xlsx'

export async function GET(req: NextRequest) {
  try {
    const session = await requireAuth(['ADMIN', 'STATE_MANAGER'])
    const { searchParams } = new URL(req.url)
    const format = searchParams.get('format') || 'csv'
    const state = searchParams.get('state')
    const status = searchParams.get('status')

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

    const agents = await prisma.user.findMany({
      where,
      include: {
        quizAttempts: {
          include: { result: true },
          orderBy: { createdAt: 'desc' },
          take: 1,
        },
      },
      orderBy: { createdAt: 'desc' },
    })

    const data = agents.map(agent => {
      const attempt = agent.quizAttempts[0]
      const result = attempt?.result
      return {
        'Full Name': agent.fullName,
        'Phone Number': agent.phone,
        'Email': agent.email,
        'Country': agent.country || '',
        'State': agent.state || '',
        'Score': result?.totalScore ?? 'N/A',
        'Percentage': result ? `${result.percentageScore}%` : 'N/A',
        'Result': result?.qualificationStatus || 'NOT_STARTED',
        'Registration Date': agent.createdAt.toISOString().split('T')[0],
        'Submission Date': attempt?.submittedAt?.toISOString().split('T')[0] || 'N/A',
      }
    })

    // Filter by status if provided
    const filteredData = status
      ? data.filter(d => d['Result'] === status)
      : data

    if (format === 'csv') {
      const ws = XLSX.utils.json_to_sheet(filteredData)
      const csv = XLSX.utils.sheet_to_csv(ws)
      return new NextResponse(csv, {
        headers: {
          'Content-Type': 'text/csv',
          'Content-Disposition': 'attachment; filename=prokip-agents-export.csv',
        },
      })
    }

    if (format === 'excel') {
      const wb = XLSX.utils.book_new()
      const ws = XLSX.utils.json_to_sheet(filteredData)
      XLSX.utils.book_append_sheet(wb, ws, 'Agents')
      const buffer = XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' })
      return new NextResponse(buffer, {
        headers: {
          'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
          'Content-Disposition': 'attachment; filename=prokip-agents-export.xlsx',
        },
      })
    }

    return NextResponse.json({ data: filteredData })
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Server error'
    const status = message === 'Unauthorized' ? 401 : message === 'Forbidden' ? 403 : 500
    return NextResponse.json({ error: message }, { status })
  }
}
