'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'

export default function ManagerDashboard() {
  const router = useRouter()
  const [user, setUser] = useState<any>(null)
  const [data, setData] = useState<any>(null)
  const [search, setSearch] = useState('')
  const [page, setPage] = useState(1)
  const [loading, setLoading] = useState(true)
  const [exporting, setExporting] = useState(false)

  const loadData = async () => {
    try {
      const params = new URLSearchParams({ page: page.toString() })
      if (search) params.set('search', search)

      const [meRes, dashRes] = await Promise.all([
        fetch('/api/auth/me'),
        fetch(`/api/dashboard/manager?${params}`),
      ])

      if (!meRes.ok) { router.push('/login'); return }
      const me = await meRes.json()
      if (me.user.role !== 'STATE_MANAGER') { router.push('/dashboard'); return }
      setUser(me.user)

      if (dashRes.ok) {
        const d = await dashRes.json()
        setData(d)
      }
    } catch { router.push('/login') }
    finally { setLoading(false) }
  }

  useEffect(() => { loadData() }, [page, search])

  const handleExport = async (format: string) => {
    setExporting(true)
    try {
      const res = await fetch(`/api/export?format=${format}`)
      if (res.ok) {
        const blob = await res.blob()
        const url = URL.createObjectURL(blob)
        const a = document.createElement('a')
        a.href = url
        a.download = `agents-export.${format === 'excel' ? 'xlsx' : format}`
        a.click()
        URL.revokeObjectURL(url)
      }
    } catch {} finally { setExporting(false) }
  }

  const handleLogout = async () => {
    await fetch('/api/auth/logout', { method: 'POST' })
    router.push('/login')
  }

  if (loading) {
    return <div className="min-h-screen bg-gray-50 flex items-center justify-center"><div className="w-12 h-12 border-4 border-blue-200 border-t-blue-600 rounded-full animate-spin" /></div>
  }

  const metrics = data?.metrics || {}
  const agents = data?.agents || []

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
            <h1 className="text-lg font-bold text-gray-900">🎓 State Manager Dashboard</h1>
            <p className="text-xs text-gray-500">Welcome, {user?.fullName}</p>
          </div>
          <button onClick={handleLogout} className="text-sm text-gray-500 hover:text-gray-700">Sign Out</button>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 py-6">
        {/* Metrics */}
        <div className="grid grid-cols-2 sm:grid-cols-5 gap-3 mb-6">
          {[
            { label: 'Registered', value: metrics.totalRegistered, icon: '👥', color: 'blue' },
            { label: 'Submitted', value: metrics.submitted, icon: '📝', color: 'purple' },
            { label: 'Passed', value: metrics.passed, icon: '✅', color: 'green' },
            { label: 'Failed', value: metrics.failed, icon: '❌', color: 'red' },
            { label: 'Not Started', value: metrics.notStarted, icon: '⏳', color: 'gray' },
          ].map((m, i) => (
            <div key={i} className="bg-white rounded-xl border border-gray-100 p-4 text-center">
              <span className="text-lg">{m.icon}</span>
              <p className="text-2xl font-bold text-gray-900 mt-1">{m.value || 0}</p>
              <p className="text-xs text-gray-500">{m.label}</p>
            </div>
          ))}
        </div>

        {/* Search + Export */}
        <div className="flex flex-wrap gap-3 mb-4">
          <input
            type="text" value={search}
            onChange={e => { setSearch(e.target.value); setPage(1) }}
            placeholder="Search agents..."
            className="flex-1 min-w-[200px] px-3 py-2 rounded-lg border border-gray-200 text-sm outline-none focus:border-blue-500 bg-white"
          />
          <button onClick={() => handleExport('csv')} disabled={exporting} className="bg-green-600 text-white px-4 py-2 rounded-xl text-sm font-semibold hover:bg-green-700 disabled:opacity-50">
            📥 Export CSV
          </button>
          <button onClick={() => handleExport('excel')} disabled={exporting} className="bg-green-600 text-white px-4 py-2 rounded-xl text-sm font-semibold hover:bg-green-700 disabled:opacity-50">
            📥 Export Excel
          </button>
        </div>

        {/* Agent Table */}
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
                </tr>
              </thead>
              <tbody>
                {agents.map((agent: any) => {
                  const status = agent.result?.qualificationStatus ||
                    agent.latestAttempt?.status || 'NOT_STARTED'
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
                        {agent.result?.percentageScore != null ? `${agent.result.percentageScore}%` : '-'}
                      </td>
                    </tr>
                  )
                })}
                {agents.length === 0 && (
                  <tr><td colSpan={6} className="px-4 py-8 text-center text-sm text-gray-400">No agents found</td></tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

        {(data?.total || 0) > 20 && (
          <div className="flex items-center justify-center gap-2 mt-6">
            <button onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1} className="px-3 py-1.5 rounded-lg text-sm bg-white border border-gray-200 disabled:opacity-30">← Prev</button>
            <span className="text-sm text-gray-500">Page {page} of {Math.ceil(data.total / 20)}</span>
            <button onClick={() => setPage(p => p + 1)} disabled={page >= Math.ceil(data.total / 20)} className="px-3 py-1.5 rounded-lg text-sm bg-white border border-gray-200 disabled:opacity-30">Next →</button>
          </div>
        )}
      </main>
    </div>
  )
}
