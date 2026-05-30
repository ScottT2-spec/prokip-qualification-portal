import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requireAuth } from '@/lib/auth'
import * as XLSX from 'xlsx'
import jsPDF from 'jspdf'
import autoTable from 'jspdf-autotable'

const STREAM_BATCH_SIZE = 5000

function formatRow(agent: any) {
  const attempt = agent.quizAttempts[0]
  const result = attempt?.result
  const startedAt = attempt?.startedAt ? new Date(attempt.startedAt) : null
  const submittedAt = attempt?.submittedAt ? new Date(attempt.submittedAt) : null
  let completionTime = 'N/A'
  if (startedAt && submittedAt) {
    const mins = Math.round((submittedAt.getTime() - startedAt.getTime()) / 60000)
    completionTime = `${mins} min`
  }

  return {
    'Full Name': agent.fullName,
    'Phone Number': agent.phone,
    'Email': agent.email,
    'Country': agent.country || 'N/A',
    'State': agent.state || 'N/A',
    'Score': result?.totalScore ?? 'N/A',
    'Percentage Score': result ? `${result.percentageScore}%` : 'N/A',
    'Pass/Fail Status': result?.qualificationStatus === 'PASSED' ? 'PASSED' : result?.qualificationStatus === 'FAILED' ? 'FAILED' : attempt?.status || 'NOT_STARTED',
    'Completion Time': completionTime,
    'Registration Date': agent.createdAt.toISOString().split('T')[0],
    'Submission Date': submittedAt ? submittedAt.toISOString().split('T')[0] : 'N/A',
    'Device Type': 'N/A',
    'Browser': 'N/A',
    'Risk Level': 'Low',
    'Integrity Status': result?.qualificationStatus === 'PASSED' || result?.qualificationStatus === 'FAILED' ? 'Verified' : 'Pending',
  }
}

export async function POST(req: NextRequest) {
  try {
    const session = await requireAuth(['ADMIN', 'STATE_MANAGER'])
    const body = await req.json().catch(() => ({}))
    const format = body.format || 'csv'
    const filters = body.filters || {}

    const job = await prisma.exportJob.create({
      data: {
        userId: session.id,
        format,
        filters: JSON.stringify(filters),
        status: 'PENDING',
        expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000),
      },
    })

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

export async function GET(req: NextRequest) {
  try {
    const session = await requireAuth(['ADMIN', 'STATE_MANAGER'])
    const { searchParams } = new URL(req.url)

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
      take: 10_000,
    })

    const data = agents.map(formatRow)
    const filteredData = status ? data.filter(d => d['Pass/Fail Status'] === status) : data

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

      // Set column widths
      ws['!cols'] = Object.keys(filteredData[0] || {}).map(k => ({ wch: Math.max(k.length + 2, 14) }))

      XLSX.utils.book_append_sheet(wb, ws, 'Agents')
      const buffer = XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' })
      return new NextResponse(buffer, {
        headers: {
          'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
          'Content-Disposition': 'attachment; filename=prokip-agents-export.xlsx',
        },
      })
    }

    if (format === 'pdf') {
      const doc = new jsPDF({ orientation: 'landscape', unit: 'mm', format: 'a4' })

      // Header
      doc.setFontSize(16)
      doc.setTextColor(27, 43, 75)
      doc.text('Prokip Agent Qualification Report', 14, 15)
      doc.setFontSize(9)
      doc.setTextColor(100)
      doc.text(`Generated: ${new Date().toISOString().split('T')[0]}  |  Total Records: ${filteredData.length}`, 14, 22)

      const columns = Object.keys(filteredData[0] || {})
      const rows = filteredData.map(row => columns.map(c => String((row as any)[c])))

      autoTable(doc, {
        head: [columns],
        body: rows,
        startY: 27,
        styles: { fontSize: 6.5, cellPadding: 1.5 },
        headStyles: { fillColor: [15, 28, 50], textColor: 255, fontSize: 6.5, fontStyle: 'bold' },
        alternateRowStyles: { fillColor: [248, 250, 252] },
        margin: { left: 6, right: 6 },
      })

      const pdfBuffer = Buffer.from(doc.output('arraybuffer'))
      return new NextResponse(pdfBuffer, {
        headers: {
          'Content-Type': 'application/pdf',
          'Content-Disposition': 'attachment; filename=prokip-agents-export.pdf',
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

async function processExport(jobId: string, session: { id: string; role: string }) {
  await prisma.exportJob.update({
    where: { id: jobId },
    data: { status: 'PROCESSING', startedAt: new Date() },
  })

  const job = await prisma.exportJob.findUnique({ where: { id: jobId } })
  if (!job) return

  const filters = JSON.parse(job.filters || '{}')
  const where: Record<string, unknown> = { role: 'AGENT' }

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
      allData.push(formatRow(agent))
    }

    cursor = batch[batch.length - 1].id
    processed += batch.length
  }

  const finalData = filters.status
    ? allData.filter(d => d['Pass/Fail Status'] === filters.status)
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
