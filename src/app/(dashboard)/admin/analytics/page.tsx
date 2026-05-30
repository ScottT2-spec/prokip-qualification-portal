'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import {
  LuDownload, LuCircleDot, LuChartBar, LuClock, LuUsers, LuTrendingUp, LuTrendingDown, LuCalendar, LuZap
} from 'react-icons/lu'

interface InsightsData {
  performance: {
    passRate: number
    failureRate: number
    avgScore: number
    avgCompletionTime: number
    totalCandidates: number
    totalAttempts: number
  }
  fastest: { name: string; percentage: number; timeTaken: number }[]
  highestScoring: { name: string; percentage: number; state: string }[]
  lowestScoring: { name: string; percentage: number; state: string }[]
  scoreDistribution: Record<string, number>
  submissionTrends: {
    daily: { date: string; count: number }[]
    weekly: { week: string; count: number }[]
    monthly: { month: string; count: number }[]
  }
}

type TrendView = 'daily' | 'weekly' | 'monthly'

export default function AnalyticsPage() {
  const [data, setData] = useState<InsightsData | null>(null)
  const [loading, setLoading] = useState(true)
  const [trendView, setTrendView] = useState<TrendView>('daily')

  // Agent list state (existing)
  const [agents, setAgents] = useState<any[]>([])
  const [total, setTotal] = useState(0)
  const [page, setPage] = useState(1)
  const [search, setSearch] = useState('')
  const [stateFilter, setStateFilter] = useState('')
  const [exporting, setExporting] = useState(false)
  const [exportOpen, setExportOpen] = useState(false)

  useEffect(() => {
    fetch('/api/dashboard/insights')
      .then(r => r.ok ? r.json() : null)
      .then(d => { if (d) setData(d) })
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [])

  const loadAgents = async () => {
    const params = new URLSearchParams({ page: page.toString(), limit: '20' })
    if (search) params.set('search', search)
    if (stateFilter) params.set('state', stateFilter)
    try {
      const res = await fetch(`/api/agents?${params}`)
      if (res.ok) { const d = await res.json(); setAgents(d.data || d.agents); setTotal(d.pagination?.total ?? d.total) }
    } catch {}
  }
  useEffect(() => { loadAgents() }, [page, search, stateFilter])

  const handleExport = async (format: string) => {
    setExporting(true)
    try {
      const params = new URLSearchParams({ format })
      if (stateFilter) params.set('state', stateFilter)
      const res = await fetch(`/api/export?${params}`)
      if (res.ok) {
        const blob = await res.blob()
        const url = URL.createObjectURL(blob)
        const a = document.createElement('a')
        a.href = url
        a.download = `prokip-export.${format === 'excel' ? 'xlsx' : format}`
        a.click()
        URL.revokeObjectURL(url)
      }
    } catch {} finally { setExporting(false) }
  }

  const getStatus = (agent: any) => {
    if (!agent.quizAttempts || agent.quizAttempts.length === 0) return 'NOT_STARTED'
    const latest = agent.quizAttempts[0]
    if (latest.result) return latest.result.qualificationStatus
    return latest.status
  }

  const statusColors: Record<string, string> = {
    NOT_STARTED: 'bg-[#E2E8F0] text-[#94A3B8]',
    IN_PROGRESS: 'bg-[#FEF3C7] text-[#F5B731]',
    SUBMITTED: 'bg-[#007bff]/10 text-[#007bff]',
    PASSED: 'bg-[#28a745]/10 text-[#28a745]',
    FAILED: 'bg-[#dc3545]/10 text-[#dc3545]',
  }

  const inputClass = "bg-[#F8FAFC] border border-[#E2E8F0] rounded-xl px-3 py-2 text-sm text-[#1B2B4B] outline-none transition-all focus:border-[#1B2B4B] focus:ring-[3px] focus:ring-[#1B2B4B]/10"

  if (loading) return (
    <div className="min-h-screen bg-[#F8FAFC] flex items-center justify-center">
      <div className="w-12 h-12 border-4 border-[#E2E8F0] border-t-[#1B2B4B] rounded-full animate-spin" />
    </div>
  )

  const perf = data?.performance
  const dist = data?.scoreDistribution || {}
  const maxDist = Math.max(...Object.values(dist), 1)

  // Trend data
  const trendData = data?.submissionTrends?.[trendView] || []
  const trendItems = trendView === 'daily'
    ? (trendData as { date: string; count: number }[])
    : trendView === 'weekly'
    ? (trendData as { week: string; count: number }[])
    : (trendData as { month: string; count: number }[])
  const maxTrend = Math.max(...trendItems.map((t: any) => t.count || 0), 1)

  const distColors: Record<string, string> = {
    '0-20': '#dc3545',
    '21-40': '#F5B731',
    '41-60': '#007bff',
    '61-80': '#28a745',
    '81-100': '#1B2B4B',
  }

  return (
    <div className="min-h-screen bg-[#F8FAFC]">
      {/* Header */}
      <header className="bg-[#1B2B4B]">
        <div className="max-w-7xl mx-auto px-4 py-4 flex items-center justify-between">
          <div>
            <h1 className="text-lg font-bold text-white">Examination Insights</h1>
            <p className="text-xs text-[#94A3B8]">Detailed analytics & performance</p>
          </div>
          <div className="flex items-center gap-2">
            <Link href="/admin" className="text-sm text-[#94A3B8] hover:text-white transition-colors">← Dashboard</Link>
            <div className="relative">
              <button onClick={() => setExportOpen(!exportOpen)} disabled={exporting} className="bg-[#F5B731] text-[#1B2B4B] px-4 py-2 rounded-xl text-sm font-semibold hover:bg-[#F5B731]/90 disabled:opacity-50 transition-all">
                {exporting ? 'Exporting...' : <span className="inline-flex items-center gap-1.5"><LuDownload className="w-4 h-4" /> Export</span>}
              </button>
              {exportOpen && (
                <>
                  <div className="fixed inset-0 z-10" onClick={() => setExportOpen(false)} />
                  <div className="absolute right-0 top-full mt-1 bg-white rounded-xl shadow-[0_25px_50px_rgba(0,0,0,0.15)] border border-[#E2E8F0] py-1 z-20 min-w-[140px]">
                    <button onClick={() => { handleExport('csv'); setExportOpen(false) }} className="w-full text-left px-4 py-2 text-sm text-[#1B2B4B] hover:bg-[#F8FAFC]">CSV</button>
                    <button onClick={() => { handleExport('excel'); setExportOpen(false) }} className="w-full text-left px-4 py-2 text-sm text-[#1B2B4B] hover:bg-[#F8FAFC]">Excel (.xlsx)</button>
                  </div>
                </>
              )}
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 py-6 space-y-6">
        {/* ── Performance Metrics ── */}
        <div>
          <h2 className="text-sm font-bold text-[#1B2B4B] mb-3 flex items-center gap-2">
            <LuChartBar className="w-4 h-4 text-[#F5B731]" /> Performance Metrics
          </h2>
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
            {[
              { label: 'Pass Rate', value: `${perf?.passRate ?? 0}%`, icon: <LuCircleDot className="w-5 h-5 text-[#28a745]" /> },
              { label: 'Failure Rate', value: `${perf?.failureRate ?? 0}%`, icon: <LuCircleDot className="w-5 h-5 text-[#dc3545]" /> },
              { label: 'Avg Score', value: `${perf?.avgScore ?? 0}%`, icon: <LuChartBar className="w-5 h-5 text-[#F5B731]" /> },
              { label: 'Avg Time', value: `${perf?.avgCompletionTime ?? 0}m`, icon: <LuClock className="w-5 h-5 text-[#007bff]" /> },
              { label: 'Candidates', value: perf?.totalCandidates ?? 0, icon: <LuUsers className="w-5 h-5 text-[#1B2B4B]" /> },
              { label: 'Attempts', value: perf?.totalAttempts ?? 0, icon: <LuClock className="w-5 h-5 text-[#94A3B8]" /> },
            ].map((m, i) => (
              <div key={i} className="bg-white rounded-[16px] border border-[#E2E8F0] shadow-[0_1px_3px_rgba(0,0,0,0.05)] p-4 text-center">
                <span className="flex justify-center">{m.icon}</span>
                <p className="text-2xl font-bold text-[#1B2B4B] mt-1">{m.value}</p>
                <p className="text-[11px] font-semibold tracking-wider text-[#94A3B8] uppercase">{m.label}</p>
              </div>
            ))}
          </div>
        </div>

        {/* ── Top/Bottom Candidates Row ── */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          {/* Fastest */}
          <div className="bg-white rounded-[16px] border border-[#E2E8F0] shadow-[0_1px_3px_rgba(0,0,0,0.05)] p-5">
            <h3 className="text-sm font-bold text-[#1B2B4B] mb-3 flex items-center gap-2">
              <LuZap className="w-4 h-4 text-[#F5B731]" /> Fastest Candidates
            </h3>
            {(data?.fastest || []).length === 0 ? (
              <p className="text-sm text-[#94A3B8] text-center py-4">No data yet</p>
            ) : (
              <div className="space-y-2">
                {(data?.fastest || []).map((c, i) => (
                  <div key={i} className="flex items-center justify-between py-2 border-b border-[#E2E8F0]/50 last:border-0">
                    <div className="flex items-center gap-2">
                      <span className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold ${
                        i === 0 ? 'bg-[#F5B731] text-[#1B2B4B]' : i === 1 ? 'bg-[#94A3B8]/20 text-[#94A3B8]' : i === 2 ? 'bg-[#CD7F32]/20 text-[#CD7F32]' : 'bg-[#E2E8F0] text-[#94A3B8]'
                      }`}>{i + 1}</span>
                      <span className="text-sm font-medium text-[#1B2B4B] truncate max-w-[120px]">{c.name}</span>
                    </div>
                    <div className="flex items-center gap-3 text-xs text-[#94A3B8]">
                      <span className="font-semibold text-[#1B2B4B]">{c.percentage}%</span>
                      <span className="bg-[#F5B731]/10 text-[#F5B731] font-semibold px-2 py-0.5 rounded-full">{c.timeTaken}m</span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Highest Scoring */}
          <div className="bg-white rounded-[16px] border border-[#E2E8F0] shadow-[0_1px_3px_rgba(0,0,0,0.05)] p-5">
            <h3 className="text-sm font-bold text-[#1B2B4B] mb-3 flex items-center gap-2">
              <LuTrendingUp className="w-4 h-4 text-[#28a745]" /> Highest Scoring
            </h3>
            {(data?.highestScoring || []).length === 0 ? (
              <p className="text-sm text-[#94A3B8] text-center py-4">No data yet</p>
            ) : (
              <div className="space-y-2">
                {(data?.highestScoring || []).map((c, i) => (
                  <div key={i} className="flex items-center justify-between py-2 border-b border-[#E2E8F0]/50 last:border-0">
                    <div className="flex items-center gap-2">
                      <span className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold ${
                        i === 0 ? 'bg-[#28a745]/20 text-[#28a745]' : i === 1 ? 'bg-[#94A3B8]/20 text-[#94A3B8]' : i === 2 ? 'bg-[#CD7F32]/20 text-[#CD7F32]' : 'bg-[#E2E8F0] text-[#94A3B8]'
                      }`}>{i + 1}</span>
                      <span className="text-sm font-medium text-[#1B2B4B] truncate max-w-[120px]">{c.name}</span>
                    </div>
                    <div className="flex items-center gap-3 text-xs text-[#94A3B8]">
                      <span className="font-semibold text-[#28a745]">{c.percentage}%</span>
                      <span className="bg-[#E2E8F0] px-2 py-0.5 rounded-full">{c.state}</span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Lowest Scoring */}
          <div className="bg-white rounded-[16px] border border-[#E2E8F0] shadow-[0_1px_3px_rgba(0,0,0,0.05)] p-5">
            <h3 className="text-sm font-bold text-[#1B2B4B] mb-3 flex items-center gap-2">
              <LuTrendingDown className="w-4 h-4 text-[#dc3545]" /> Lowest Scoring
            </h3>
            {(data?.lowestScoring || []).length === 0 ? (
              <p className="text-sm text-[#94A3B8] text-center py-4">No data yet</p>
            ) : (
              <div className="space-y-2">
                {(data?.lowestScoring || []).map((c, i) => (
                  <div key={i} className="flex items-center justify-between py-2 border-b border-[#E2E8F0]/50 last:border-0">
                    <div className="flex items-center gap-2">
                      <span className="w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold bg-[#E2E8F0] text-[#94A3B8]">{i + 1}</span>
                      <span className="text-sm font-medium text-[#1B2B4B] truncate max-w-[120px]">{c.name}</span>
                    </div>
                    <div className="flex items-center gap-3 text-xs text-[#94A3B8]">
                      <span className="font-semibold text-[#dc3545]">{c.percentage}%</span>
                      <span className="bg-[#E2E8F0] px-2 py-0.5 rounded-full">{c.state}</span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* ── Score Distribution ── */}
        <div className="bg-white rounded-[16px] border border-[#E2E8F0] shadow-[0_1px_3px_rgba(0,0,0,0.05)] p-5">
          <h3 className="text-sm font-bold text-[#1B2B4B] mb-4 flex items-center gap-2">
            <LuChartBar className="w-4 h-4 text-[#007bff]" /> Score Distribution
          </h3>
          <div className="flex items-end gap-3 h-48">
            {Object.entries(dist).map(([range, count]) => {
              const height = maxDist > 0 ? (count / maxDist) * 100 : 0
              return (
                <div key={range} className="flex-1 flex flex-col items-center gap-2">
                  <span className="text-xs font-bold text-[#1B2B4B]">{count}</span>
                  <div className="w-full rounded-t-lg transition-all duration-500" style={{ height: `${Math.max(height, 4)}%`, backgroundColor: distColors[range] || '#94A3B8' }} />
                  <span className="text-[10px] font-semibold text-[#94A3B8] text-center">{range}%</span>
                </div>
              )
            })}
          </div>
        </div>

        {/* ── Submission Trends ── */}
        <div className="bg-white rounded-[16px] border border-[#E2E8F0] shadow-[0_1px_3px_rgba(0,0,0,0.05)] p-5">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-bold text-[#1B2B4B] flex items-center gap-2">
              <LuCalendar className="w-4 h-4 text-[#F5B731]" /> Submission Trends
            </h3>
            <div className="flex bg-[#F8FAFC] rounded-xl border border-[#E2E8F0] p-0.5">
              {(['daily', 'weekly', 'monthly'] as TrendView[]).map(v => (
                <button
                  key={v}
                  onClick={() => setTrendView(v)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                    trendView === v ? 'bg-[#1B2B4B] text-white' : 'text-[#94A3B8] hover:text-[#1B2B4B]'
                  }`}
                >
                  {v.charAt(0).toUpperCase() + v.slice(1)}
                </button>
              ))}
            </div>
          </div>
          <div className="flex items-end gap-1 h-40 overflow-x-auto pb-2">
            {trendItems.map((item: any, i: number) => {
              const count = item.count || 0
              const height = maxTrend > 0 ? (count / maxTrend) * 100 : 0
              const label = item.date || item.week || item.month || ''
              const shortLabel = trendView === 'daily'
                ? label.slice(5)
                : trendView === 'monthly'
                ? new Date(label + '-01').toLocaleString('en', { month: 'short' })
                : label

              return (
                <div key={i} className="flex flex-col items-center gap-1 min-w-[24px] flex-1 group">
                  <span className="text-[10px] font-bold text-[#1B2B4B] opacity-0 group-hover:opacity-100 transition-opacity">{count}</span>
                  <div
                    className="w-full rounded-t-md transition-all duration-300 bg-[#1B2B4B] hover:bg-[#F5B731] cursor-default"
                    style={{ height: `${Math.max(height, 2)}%` }}
                    title={`${label}: ${count} submissions`}
                  />
                  {(trendView !== 'daily' || i % 5 === 0) && (
                    <span className="text-[8px] text-[#94A3B8] -rotate-45 origin-top-left whitespace-nowrap">{shortLabel}</span>
                  )}
                </div>
              )
            })}
          </div>
        </div>

        {/* ── Agent List (existing) ── */}
        <div>
          <h2 className="text-sm font-bold text-[#1B2B4B] mb-3 flex items-center gap-2">
            <LuUsers className="w-4 h-4 text-[#1B2B4B]" /> All Candidates
          </h2>
          <div className="bg-white rounded-[16px] border border-[#E2E8F0] shadow-[0_1px_3px_rgba(0,0,0,0.05)] p-4 mb-4 flex flex-wrap gap-3">
            <input type="text" value={search} onChange={e => { setSearch(e.target.value); setPage(1) }} placeholder="Search by name, email, phone..." className={inputClass + " flex-1 min-w-[200px]"} />
            <input type="text" value={stateFilter} onChange={e => { setStateFilter(e.target.value); setPage(1) }} placeholder="Filter by state..." className={inputClass + " w-40"} />
          </div>
          <div className="bg-white rounded-[16px] border border-[#E2E8F0] shadow-[0_1px_3px_rgba(0,0,0,0.05)] overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="text-left text-[11px] font-semibold tracking-wider text-[#94A3B8] uppercase border-b border-[#E2E8F0] bg-[#F8FAFC]">
                    <th className="px-4 py-3">Name</th>
                    <th className="px-4 py-3">Email</th>
                    <th className="px-4 py-3">Phone</th>
                    <th className="px-4 py-3">State</th>
                    <th className="px-4 py-3">Status</th>
                    <th className="px-4 py-3">Score</th>
                    <th className="px-4 py-3">Registered</th>
                  </tr>
                </thead>
                <tbody>
                  {agents.map(agent => {
                    const status = getStatus(agent)
                    const latest = agent.quizAttempts?.[0]
                    return (
                      <tr key={agent.id} className="border-b border-[#E2E8F0]/50 last:border-0 hover:bg-[#F8FAFC] transition-colors">
                        <td className="px-4 py-3 text-sm font-medium text-[#1B2B4B]">{agent.fullName}</td>
                        <td className="px-4 py-3 text-sm text-[#94A3B8]">{agent.email}</td>
                        <td className="px-4 py-3 text-sm text-[#94A3B8]">{agent.phone}</td>
                        <td className="px-4 py-3 text-sm text-[#94A3B8]">{agent.state || '—'}</td>
                        <td className="px-4 py-3"><span className={`text-xs font-medium px-2 py-0.5 rounded-full ${statusColors[status]}`}>{status.replace(/_/g, ' ')}</span></td>
                        <td className="px-4 py-3 text-sm text-[#94A3B8]">{latest?.percentageScore != null ? `${latest.percentageScore}%` : '—'}</td>
                        <td className="px-4 py-3 text-sm text-[#94A3B8]">{new Date(agent.createdAt).toLocaleDateString()}</td>
                      </tr>
                    )
                  })}
                  {agents.length === 0 && (
                    <tr><td colSpan={7} className="px-4 py-8 text-center text-sm text-[#94A3B8]">No agents found</td></tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
          {total > 20 && (
            <div className="flex items-center justify-center gap-2 mt-4">
              <button onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1} className="px-3 py-1.5 rounded-lg text-sm bg-white border border-[#E2E8F0] text-[#1B2B4B] disabled:opacity-30">← Prev</button>
              <span className="text-sm text-[#94A3B8]">Page {page} of {Math.ceil(total / 20)}</span>
              <button onClick={() => setPage(p => p + 1)} disabled={page >= Math.ceil(total / 20)} className="px-3 py-1.5 rounded-lg text-sm bg-white border border-[#E2E8F0] text-[#1B2B4B] disabled:opacity-30">Next →</button>
            </div>
          )}
        </div>
      </main>
    </div>
  )
}
