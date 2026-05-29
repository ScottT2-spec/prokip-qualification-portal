'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'

interface Metrics {
  totalRegistrations: number
  totalAttempts: number
  passRate: number
  failureRate: number
  averageScore: number
  highestScore: number
  lowestScore: number
  passedCount: number
  failedCount: number
}

export default function AdminDashboard() {
  const router = useRouter()
  const [metrics, setMetrics] = useState<Metrics | null>(null)
  const [recentRegistrations, setRecentRegistrations] = useState<any[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function load() {
      try {
        const [meRes, dashRes] = await Promise.all([
          fetch('/api/auth/me'),
          fetch('/api/dashboard/admin'),
        ])
        if (!meRes.ok) { router.push('/login'); return }
        const me = await meRes.json()
        if (me.user.role !== 'ADMIN') { router.push('/dashboard'); return }

        if (dashRes.ok) {
          const data = await dashRes.json()
          setMetrics(data.metrics)
          setRecentRegistrations(data.recentRegistrations)
        }
      } catch { router.push('/login') }
      finally { setLoading(false) }
    }
    load()
  }, [router])

  const handleLogout = async () => {
    await fetch('/api/auth/logout', { method: 'POST' })
    router.push('/login')
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="w-12 h-12 border-4 border-blue-200 border-t-blue-600 rounded-full animate-spin" />
      </div>
    )
  }

  const cards = metrics ? [
    { label: 'Total Registrations', value: metrics.totalRegistrations, icon: '👥', color: 'blue' },
    { label: 'Total Attempts', value: metrics.totalAttempts, icon: '📝', color: 'purple' },
    { label: 'Pass Rate', value: `${metrics.passRate}%`, icon: '✅', color: 'green' },
    { label: 'Failure Rate', value: `${metrics.failureRate}%`, icon: '❌', color: 'red' },
    { label: 'Average Score', value: `${metrics.averageScore}%`, icon: '📊', color: 'indigo' },
    { label: 'Highest Score', value: `${metrics.highestScore}%`, icon: '🏆', color: 'yellow' },
    { label: 'Lowest Score', value: `${metrics.lowestScore}%`, icon: '📉', color: 'gray' },
    { label: 'Passed', value: metrics.passedCount, icon: '🎉', color: 'green' },
  ] : []

  const colorMap: Record<string, string> = {
    blue: 'bg-blue-50 text-blue-700',
    purple: 'bg-purple-50 text-purple-700',
    green: 'bg-green-50 text-green-700',
    red: 'bg-red-50 text-red-700',
    indigo: 'bg-indigo-50 text-indigo-700',
    yellow: 'bg-yellow-50 text-yellow-700',
    gray: 'bg-gray-50 text-gray-700',
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Sidebar-style header for mobile */}
      <header className="bg-white border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <span className="text-2xl">🎓</span>
            <div>
              <h1 className="text-lg font-bold text-gray-900">Admin Dashboard</h1>
              <p className="text-xs text-gray-500">Prokip Qualification Portal</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <button onClick={handleLogout} className="text-sm text-gray-500 hover:text-gray-700">Sign Out</button>
          </div>
        </div>
        {/* Nav */}
        <div className="max-w-7xl mx-auto px-4 pb-2">
          <nav className="flex gap-1 overflow-x-auto">
            {[
              { href: '/admin', label: 'Overview', active: true },
              { href: '/admin/quizzes', label: 'Quizzes' },
              { href: '/admin/questions', label: 'Questions' },
              { href: '/admin/state-managers', label: 'State Managers' },
              { href: '/admin/analytics', label: 'Analytics' },
            ].map(item => (
              <Link
                key={item.href}
                href={item.href}
                className={`px-3 py-1.5 rounded-lg text-sm font-medium whitespace-nowrap transition-colors ${
                  item.active ? 'bg-blue-100 text-blue-700' : 'text-gray-500 hover:text-gray-700 hover:bg-gray-50'
                }`}
              >
                {item.label}
              </Link>
            ))}
          </nav>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 py-6">
        {/* Metrics Grid */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-6">
          {cards.map((card, i) => (
            <div key={i} className="bg-white rounded-xl border border-gray-100 p-4">
              <div className="flex items-center justify-between mb-2">
                <span className="text-lg">{card.icon}</span>
                <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${colorMap[card.color]}`}>
                  {card.label}
                </span>
              </div>
              <p className="text-2xl font-bold text-gray-900">{card.value}</p>
            </div>
          ))}
        </div>

        {/* Recent Registrations */}
        <div className="bg-white rounded-xl border border-gray-100 overflow-hidden">
          <div className="px-4 py-3 border-b border-gray-100 flex items-center justify-between">
            <h3 className="font-semibold text-gray-900">Recent Registrations</h3>
            <Link href="/admin/analytics" className="text-sm text-blue-600 hover:underline">View All</Link>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="text-left text-xs text-gray-500 border-b border-gray-50">
                  <th className="px-4 py-2 font-medium">Name</th>
                  <th className="px-4 py-2 font-medium">Email</th>
                  <th className="px-4 py-2 font-medium">State</th>
                  <th className="px-4 py-2 font-medium">Date</th>
                </tr>
              </thead>
              <tbody>
                {recentRegistrations.map((agent: any) => (
                  <tr key={agent.id} className="border-b border-gray-50 last:border-0">
                    <td className="px-4 py-3 text-sm font-medium text-gray-900">{agent.fullName}</td>
                    <td className="px-4 py-3 text-sm text-gray-500">{agent.email}</td>
                    <td className="px-4 py-3 text-sm text-gray-500">{agent.state || '-'}</td>
                    <td className="px-4 py-3 text-sm text-gray-400">
                      {new Date(agent.createdAt).toLocaleDateString()}
                    </td>
                  </tr>
                ))}
                {recentRegistrations.length === 0 && (
                  <tr>
                    <td colSpan={4} className="px-4 py-8 text-center text-sm text-gray-400">
                      No registrations yet
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </main>
    </div>
  )
}
