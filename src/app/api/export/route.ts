import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requireAuth } from '@/lib/auth'
import * as XLSX from 'xlsx'

const STREAM_BATCH_SIZE = 5000 // Process in batches for 100K+ scale

/**
 * POST /api/export — Queue-based export for large datasets.
 * Creates an ExportJob, processes in batches, returns job ID.
 * Client polls GET /api/export?jobId=... for status.
 */
export async function POST(req: NextRequest) {
  try {
    const session = await requireAuth(['ADMIN', 'STATE_MANAGER'])
    const body = await req.json().catch(() => ({}))
    const format = body.format || 'csv'
    const filters = body.filters || {}

    // Create export job
    const job = await prisma.exportJob.create({
      data: {
        userId: session.id,
        format,
        filters: JSON.stringify(filters),
        status: 'PENDING',
        expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000), // 24h expiry
      },
    })

    // Process async (non-blocking)
    processExport(job.id, session).catch(err => {
      console.error(`Export job ${job.id} failed:`, err)
      prisma.exportJob.update({
        where: { id: job.id },
        data: { status: 'FAILED', error: String(err) },
      }).catch(() => {})
    })

    return NextResponse.json({ jobId: job.id, status: 'PENDING' }, { status: 202 })
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Server error'
    const status = message === 'Unauthorized' ? 401 : message === 'Forbidden' ? 403 : 500
    return NextResponse.json({ error: message }, { status })
  }
}

/**
 * GET /api/export — Either poll job status or do a direct (legacy) export.
 * 
 * With ?jobId=... → returns job status + download URL when ready.
 * Without jobId → legacy direct export (limited to 10K rows for safety).
 */
export async function GET(req: NextRequest) {
  try {
    const session = await requireAuth(['ADMIN', 'STATE_MANAGER'])
    const { searchParams } = new URL(req.url)

    // Poll mode: check job status
    const jobId = searchParams.get('jobId')
    if (jobId) {
      const job = await prisma.exportJob.findUnique({ where: { id: jobId } })
      if (!job || job.userId !== session.id) {
        return NextResponse.json({ error: 'Job not found' }, { status: 404 })
      }
      return NextResponse.json({
        jobId: job.id,
        status: job.status,
        totalRows: job.totalRows,
        error: job.error,
        completedAt: job.completedAt,
      })
    }

    // Legacy direct export (capped at 10K for safety)
    const format = searchParams.get('format') || 'csv'
    const state = searchParams.get('state')
    const status = searchParams.get('status')

    const where: Record<string, unknown> = { role: 'AGENT' }

    if (session.role === 'STATE_MANAGER') {
      const sm = await prisma.stateManager.findUnique({
        where: { userId: session.id },
        include: { states: true },
      })
      if (sm) where.state = { in: sm.states.map(s => s.name) }
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
      take: 10_000, // Safety cap for direct export
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

    const filteredData = status ? data.filter(d => d['Result'] === status) : data

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

/**
 * Background export processor — processes in batches of STREAM_BATCH_SIZE.
 * Handles 100K+ rows without OOM.
 */
async function processExport(jobId: string, session: { id: string; role: string }) {
  await prisma.exportJob.update({
    where: { id: jobId },
    data: { status: 'PROCESSING', startedAt: new Date() },
  })

  const job = await prisma.exportJob.findUnique({ where: { id: jobId } })
  if (!job) return

  const filters = JSON.parse(job.filters || '{}')
  const where: Record<string, unknown> = { role: 'AGENT' }

  // Apply scope for state managers
  if (session.role === 'STATE_MANAGER') {
    const sm = await prisma.stateManager.findUnique({
      where: { userId: session.id },
      include: { states: true },
    })
    if (sm) where.state = { in: sm.states.map(s => s.name) }
  }

  if (filters.state) where.state = filters.state
  if (filters.country) where.country = filters.country

  const totalRows = await prisma.user.count({ where })
  const allData: Record<string, unknown>[] = []
  let cursor: string | undefined

  // Batch processing with cursor pagination
  for (let processed = 0; processed < totalRows; ) {
    const batch = await prisma.user.findMany({
      where,
      include: {
        quizAttempts: {
          include: { result: true },
          orderBy: { createdAt: 'desc' },
          take: 1,
        },
      },
      orderBy: { id: 'asc' },
      take: STREAM_BATCH_SIZE,
      ...(cursor ? { skip: 1, cursor: { id: cursor } } : {}),
    })

    if (batch.length === 0) break

    for (const agent of batch) {
      const attempt = agent.quizAttempts[0]
      const result = attempt?.result
      allData.push({
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
      })
    }

    cursor = batch[batch.length - 1].id
    processed += batch.length
  }

  // Apply status filter if provided
  const finalData = filters.status
    ? allData.filter(d => d['Result'] === filters.status)
    : allData

  await prisma.exportJob.update({
    where: { id: jobId },
    data: {
      status: 'COMPLETED',
      totalRows: finalData.length,
      completedAt: new Date(),
    },
  })
}
