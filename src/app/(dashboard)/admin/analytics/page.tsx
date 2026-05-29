'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'

export default function AnalyticsPage() {
  const [agents, setAgents] = useState<any[]>([])
  const [total, setTotal] = useState(0)
  const [page, setPage] = useState(1)
  const [search, setSearch] = useState('')
  const [stateFilter, setStateFilter] = useState('')
  const [statusFilter, setStatusFilter] = useState('')
  const [loading, setLoading] = useState(true)
  const [exporting, setExporting] = useState(false)

  const loadAgents = async () => {
    const params = new URLSearchParams({ page: page.toString(), limit: '20' })
    if (search) params.set('search', search)
    if (stateFilter) params.set('state', stateFilter)
    try {
      const res = await fetch(`/api/agents?${params}`)
      if (res.ok) {
        const data = await res.json()
        setAgents(data.agents)
        setTotal(data.total)
      }
    } catch {} finally { setLoading(false) }
  }

  useEffect(() => { loadAgents() }, [page, search, stateFilter])

  const handleExport = async (format: string) => {
    setExporting(true)
    try {
      const params = new URLSearchParams({ format })
      if (stateFilter) params.set('state', stateFilter)
      if (statusFilter) params.set('status', statusFilter)
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
    NOT_STARTED: 'bg-gray-100 text-gray-700',
    IN_PROGRESS: 'bg-yellow-100 text-yellow-700',
    SUBMITTED: 'bg-blue-100 text-blue-700',
    PASSED: 'bg-green-100 text-green-700',
    FAILED: 'bg-red-100 text-red-700',
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 py-4 flex items-center justify-between">
          <div>
            <h1 className="text-lg font-bold text-gray-900">Agents & Analytics</h1>
            <p className="text-xs text-gray-500">{total} agents registered</p>
          </div>
          <div className="flex items-center gap-2">
            <Link href="/admin" className="text-sm text-gray-500 hover:text-gray-700">← Dashboard</Link>
            <div className="relative group">
              <button disabled={exporting} className="bg-green-600 text-white px-4 py-2 rounded-xl text-sm font-semibold hover:bg-green-700 disabled:opacity-50">
                {exporting ? 'Exporting...' : '📥 Export'}
              </button>
              <div className="absolute right-0 top-full mt-1 bg-white rounded-xl shadow-lg border border-gray-100 py-1 hidden group-hover:block z-10 min-w-[140px]">
                <button onClick={() => handleExport('csv')} className="w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-50">CSV</button>
                <button onClick={() => handleExport('excel')} className="w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-50">Excel (.xlsx)</button>
              </div>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 py-6">
        {/* Filters */}
        <div className="bg-white rounded-xl border border-gray-100 p-4 mb-4 flex flex-wrap gap-3">
          <input
            type="text" value={search}
            onChange={e => { setSearch(e.target.value); setPage(1) }}
            placeholder="Search by name, email, phone..."
            className="flex-1 min-w-[200px] px-3 py-2 rounded-lg border border-gray-200 text-sm outline-none focus:border-blue-500"
          />
          <input
            type="text" value={stateFilter}
            onChange={e => { setStateFilter(e.target.value); setPage(1) }}
            placeholder="Filter by state..."
            className="px-3 py-2 rounded-lg border border-gray-200 text-sm outline-none focus:border-blue-500 w-40"
          />
        </div>

        {/* Agent table */}
        <div className="bg-white rounded-xl border border-gray-100 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="text-left text-xs text-gray-500 border-b border-gray-100 bg-gray-50">
                  <th className="px-4 py-3 font-medium">Name</th>
                  <th className="px-4 py-3 font-medium">Email</th>
                  <th className="px-4 py-3 font-medium">Phone</th>
                  <th className="px-4 py-3 font-medium">State</th>
                  <th className="px-4 py-3 font-medium">Status</th>
                  <th className="px-4 py-3 font-medium">Score</th>
                  <th className="px-4 py-3 font-medium">Registered</th>
                </tr>
              </thead>
              <tbody>
                {agents.map(agent => {
                  const status = getStatus(agent)
                  const latest = agent.quizAttempts?.[0]
                  return (
                    <tr key={agent.id} className="border-b border-gray-50 last:border-0 hover:bg-gray-50">
                      <td className="px-4 py-3 text-sm font-medium text-gray-900">{agent.fullName}</td>
                      <td className="px-4 py-3 text-sm text-gray-500">{agent.email}</td>
                      <td className="px-4 py-3 text-sm text-gray-500">{agent.phone}</td>
                      <td className="px-4 py-3 text-sm text-gray-500">{agent.state || '-'}</td>
                      <td className="px-4 py-3">
                        <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${statusColors[status]}`}>
                          {status.replace(/_/g, ' ')}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-500">
                        {latest?.percentageScore != null ? `${latest.percentageScore}%` : '-'}
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-400">
                        {new Date(agent.createdAt).toLocaleDateString()}
                      </td>
                    </tr>
                  )
                })}
                {agents.length === 0 && (
                  <tr><td colSpan={7} className="px-4 py-8 text-center text-sm text-gray-400">No agents found</td></tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

        {total > 20 && (
          <div className="flex items-center justify-center gap-2 mt-6">
            <button onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1} className="px-3 py-1.5 rounded-lg text-sm bg-white border border-gray-200 disabled:opacity-30">← Prev</button>
            <span className="text-sm text-gray-500">Page {page} of {Math.ceil(total / 20)}</span>
            <button onClick={() => setPage(p => p + 1)} disabled={page >= Math.ceil(total / 20)} className="px-3 py-1.5 rounded-lg text-sm bg-white border border-gray-200 disabled:opacity-30">Next →</button>
          </div>
        )}
      </main>
    </div>
  )
}
