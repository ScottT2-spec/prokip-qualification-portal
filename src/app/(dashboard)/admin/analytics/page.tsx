'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'

export default function AnalyticsPage() {
  const [agents, setAgents] = useState<any[]>([])
  const [total, setTotal] = useState(0)
  const [page, setPage] = useState(1)
  const [search, setSearch] = useState('')
  const [stateFilter, setStateFilter] = useState('')
  const [loading, setLoading] = useState(true)
  const [exporting, setExporting] = useState(false)

  const loadAgents = async () => {
    const params = new URLSearchParams({ page: page.toString(), limit: '20' })
    if (search) params.set('search', search); if (stateFilter) params.set('state', stateFilter)
    try { const res = await fetch(`/api/agents?${params}`); if (res.ok) { const data = await res.json(); setAgents(data.agents); setTotal(data.total) } } catch {} finally { setLoading(false) }
  }
  useEffect(() => { loadAgents() }, [page, search, stateFilter])

  const handleExport = async (format: string) => {
    setExporting(true)
    try {
      const params = new URLSearchParams({ format }); if (stateFilter) params.set('state', stateFilter)
      const res = await fetch(`/api/export?${params}`)
      if (res.ok) { const blob = await res.blob(); const url = URL.createObjectURL(blob); const a = document.createElement('a'); a.href = url; a.download = `prokip-export.${format === 'excel' ? 'xlsx' : format}`; a.click(); URL.revokeObjectURL(url) }
    } catch {} finally { setExporting(false) }
  }

  const getStatus = (agent: any) => {
    if (!agent.quizAttempts || agent.quizAttempts.length === 0) return 'NOT_STARTED'
    const latest = agent.quizAttempts[0]; if (latest.result) return latest.result.qualificationStatus; return latest.status
  }

  const statusColors: Record<string, string> = { NOT_STARTED: 'bg-[#E2E8F0] text-[#94A3B8]', IN_PROGRESS: 'bg-[#FEF3C7] text-[#F5B731]', SUBMITTED: 'bg-[#007bff]/10 text-[#007bff]', PASSED: 'bg-[#28a745]/10 text-[#28a745]', FAILED: 'bg-[#dc3545]/10 text-[#dc3545]' }
  const inputClass = "bg-[#F8FAFC] border border-[#E2E8F0] rounded-xl px-3 py-2 text-sm text-[#1B2B4B] outline-none transition-all focus:border-[#1B2B4B] focus:ring-[3px] focus:ring-[#1B2B4B]/10"

  return (
    <div className="min-h-screen bg-[#F8FAFC]">
      <header className="bg-[#1B2B4B]">
        <div className="max-w-7xl mx-auto px-4 py-4 flex items-center justify-between">
          <div><h1 className="text-lg font-bold text-white">Agents & Analytics</h1><p className="text-xs text-[#94A3B8]">{total} agents registered</p></div>
          <div className="flex items-center gap-2">
            <Link href="/admin" className="text-sm text-[#94A3B8] hover:text-white transition-colors">← Dashboard</Link>
            <div className="relative group">
              <button disabled={exporting} className="bg-[#F5B731] text-[#1B2B4B] px-4 py-2 rounded-xl text-sm font-semibold hover:bg-[#F5B731]/90 disabled:opacity-50 transition-all">{exporting ? 'Exporting...' : '📥 Export'}</button>
              <div className="absolute right-0 top-full mt-1 bg-white rounded-xl shadow-[0_25px_50px_rgba(0,0,0,0.15)] border border-[#E2E8F0] py-1 hidden group-hover:block z-10 min-w-[140px]">
                <button onClick={() => handleExport('csv')} className="w-full text-left px-4 py-2 text-sm text-[#1B2B4B] hover:bg-[#F8FAFC]">CSV</button>
                <button onClick={() => handleExport('excel')} className="w-full text-left px-4 py-2 text-sm text-[#1B2B4B] hover:bg-[#F8FAFC]">Excel (.xlsx)</button>
              </div>
            </div>
          </div>
        </div>
      </header>
      <main className="max-w-7xl mx-auto px-4 py-6">
        <div className="bg-white rounded-[16px] border border-[#E2E8F0] shadow-[0_1px_3px_rgba(0,0,0,0.05)] p-4 mb-4 flex flex-wrap gap-3">
          <input type="text" value={search} onChange={e => { setSearch(e.target.value); setPage(1) }} placeholder="Search by name, email, phone..." className={inputClass + " flex-1 min-w-[200px]"} />
          <input type="text" value={stateFilter} onChange={e => { setStateFilter(e.target.value); setPage(1) }} placeholder="Filter by state..." className={inputClass + " w-40"} />
        </div>
        <div className="bg-white rounded-[16px] border border-[#E2E8F0] shadow-[0_1px_3px_rgba(0,0,0,0.05)] overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="text-left text-[11px] font-semibold tracking-wider text-[#94A3B8] uppercase border-b border-[#E2E8F0] bg-[#F8FAFC]">
                  <th className="px-4 py-3">Name</th><th className="px-4 py-3">Email</th><th className="px-4 py-3">Phone</th><th className="px-4 py-3">State</th><th className="px-4 py-3">Status</th><th className="px-4 py-3">Score</th><th className="px-4 py-3">Registered</th>
                </tr>
              </thead>
              <tbody>
                {agents.map(agent => {
                  const status = getStatus(agent); const latest = agent.quizAttempts?.[0]
                  return (
                    <tr key={agent.id} className="border-b border-[#E2E8F0]/50 last:border-0 hover:bg-[#F8FAFC]">
                      <td className="px-4 py-3 text-sm font-medium text-[#1B2B4B]">{agent.fullName}</td>
                      <td className="px-4 py-3 text-sm text-[#94A3B8]">{agent.email}</td>
                      <td className="px-4 py-3 text-sm text-[#94A3B8]">{agent.phone}</td>
                      <td className="px-4 py-3 text-sm text-[#94A3B8]">{agent.state || '-'}</td>
                      <td className="px-4 py-3"><span className={`text-xs font-medium px-2 py-0.5 rounded-full ${statusColors[status]}`}>{status.replace(/_/g, ' ')}</span></td>
                      <td className="px-4 py-3 text-sm text-[#94A3B8]">{latest?.percentageScore != null ? `${latest.percentageScore}%` : '-'}</td>
                      <td className="px-4 py-3 text-sm text-[#94A3B8]">{new Date(agent.createdAt).toLocaleDateString()}</td>
                    </tr>
                  )
                })}
                {agents.length === 0 && <tr><td colSpan={7} className="px-4 py-8 text-center text-sm text-[#94A3B8]">No agents found</td></tr>}
              </tbody>
            </table>
          </div>
        </div>
        {total > 20 && (
          <div className="flex items-center justify-center gap-2 mt-6">
            <button onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1} className="px-3 py-1.5 rounded-lg text-sm bg-white border border-[#E2E8F0] text-[#1B2B4B] disabled:opacity-30">← Prev</button>
            <span className="text-sm text-[#94A3B8]">Page {page} of {Math.ceil(total / 20)}</span>
            <button onClick={() => setPage(p => p + 1)} disabled={page >= Math.ceil(total / 20)} className="px-3 py-1.5 rounded-lg text-sm bg-white border border-[#E2E8F0] text-[#1B2B4B] disabled:opacity-30">Next →</button>
          </div>
        )}
      </main>
    </div>
  )
}
