'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { LuUsers, LuFileText, LuCircleCheck, LuCircleX, LuChartBar, LuTrophy, LuTrendingDown, LuAward, LuGraduationCap, LuChevronDown, LuChevronUp } from 'react-icons/lu'

interface Metrics {
  totalRegistrations: number; totalAttempts: number; passRate: number; failureRate: number
  averageScore: number; highestScore: number; lowestScore: number; passedCount: number; failedCount: number
}

export default function AdminDashboard() {
  const router = useRouter()
  const [metrics, setMetrics] = useState<Metrics | null>(null)
  const [recentRegistrations, setRecentRegistrations] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [showAllRegistrations, setShowAllRegistrations] = useState(false)

  useEffect(() => {
    async function load() {
      try {
        const [meRes, dashRes] = await Promise.all([fetch('/api/auth/me'), fetch('/api/dashboard/admin')])
        if (!meRes.ok) { router.push('/login'); return }
        const me = await meRes.json()
        if (me.user.role !== 'ADMIN') { router.push('/dashboard'); return }
        if (dashRes.ok) { const data = await dashRes.json(); setMetrics(data.metrics); setRecentRegistrations(data.recentRegistrations) }
      } catch { router.push('/login') } finally { setLoading(false) }
    }
    load()
  }, [router])

  const handleLogout = async () => { await fetch('/api/auth/logout', { method: 'POST' }); router.push('/login') }

  if (loading) return <div className="min-h-screen bg-[#F8FAFC] flex items-center justify-center"><div className="w-12 h-12 border-4 border-[#E2E8F0] border-t-[#1B2B4B] rounded-full animate-spin" /></div>

  const cards = metrics ? [
    { label: 'Total Registrations', value: metrics.totalRegistrations, icon: <LuUsers className="w-5 h-5 text-[#1B2B4B]" /> },
    { label: 'Total Attempts', value: metrics.totalAttempts, icon: <LuFileText className="w-5 h-5 text-[#1B2B4B]" /> },
    { label: 'Pass Rate', value: `${metrics.passRate}%`, icon: <LuCircleCheck className="w-5 h-5 text-[#28a745]" /> },
    { label: 'Failure Rate', value: `${metrics.failureRate}%`, icon: <LuCircleX className="w-5 h-5 text-[#dc3545]" /> },
    { label: 'Average Score', value: `${metrics.averageScore}%`, icon: <LuChartBar className="w-5 h-5 text-[#1B2B4B]" /> },
    { label: 'Highest Score', value: `${metrics.highestScore}%`, icon: <LuTrophy className="w-5 h-5 text-[#F5B731]" /> },
    { label: 'Lowest Score', value: `${metrics.lowestScore}%`, icon: <LuTrendingDown className="w-5 h-5 text-[#94A3B8]" /> },
    { label: 'Passed', value: metrics.passedCount, icon: <LuAward className="w-5 h-5 text-[#28a745]" /> },
  ] : []

  return (
    <div className="min-h-screen bg-[#F8FAFC]">
      <header className="bg-[#1B2B4B]">
        <div className="max-w-7xl mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <LuGraduationCap className="w-7 h-7 text-[#F5B731]" />
            <div>
              <h1 className="text-lg font-bold text-white">Admin Dashboard</h1>
              <p className="text-xs text-[#94A3B8]">Prokip Qualification Portal</p>
            </div>
          </div>
          <button onClick={handleLogout} className="text-sm text-[#94A3B8] hover:text-white transition-colors">Sign Out</button>
        </div>
        <div className="max-w-7xl mx-auto px-4 pb-3">
          <nav className="flex gap-1 overflow-x-auto">
            {[
              { href: '/admin', label: 'Overview', active: true },
              { href: '/admin/quizzes', label: 'Quizzes' },
              { href: '/admin/questions', label: 'Questions' },
              { href: '/admin/state-managers', label: 'State Managers' },
              { href: '/admin/analytics', label: 'Analytics' },
            ].map(item => (
              <Link key={item.href} href={item.href}
                className={`px-3 py-1.5 rounded-lg text-sm font-medium whitespace-nowrap transition-colors ${
                  item.active ? 'bg-[#F5B731] text-[#1B2B4B]' : 'text-[#94A3B8] hover:text-white hover:bg-white/10'
                }`}>
                {item.label}
              </Link>
            ))}
          </nav>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 py-6">
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-6">
          {cards.map((card, i) => (
            <div key={i} className="bg-white rounded-[16px] border border-[#E2E8F0] shadow-[0_1px_3px_rgba(0,0,0,0.05)] p-4">
              <div className="flex items-center justify-between mb-2">
                {card.icon}
              </div>
              <p className="text-2xl font-bold text-[#1B2B4B]">{card.value}</p>
              <p className="text-[11px] font-semibold tracking-wider text-[#94A3B8] uppercase mt-1">{card.label}</p>
            </div>
          ))}
        </div>

        <div className="bg-white rounded-[16px] border border-[#E2E8F0] shadow-[0_1px_3px_rgba(0,0,0,0.05)] overflow-hidden">
          <div className="px-4 py-3 border-b border-[#E2E8F0] flex items-center justify-between">
            <h3 className="font-semibold text-[#1B2B4B]">Recent Registrations</h3>
            <Link href="/admin/analytics" className="text-sm text-[#F5B731] font-semibold hover:underline">View All</Link>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="text-left text-[11px] font-semibold tracking-wider text-[#94A3B8] uppercase border-b border-[#E2E8F0]">
                  <th className="px-4 py-2">Name</th><th className="px-4 py-2">Email</th><th className="px-4 py-2">State</th><th className="px-4 py-2">Date</th>
                </tr>
              </thead>
              <tbody>
                {(showAllRegistrations ? recentRegistrations : recentRegistrations.slice(0, 5)).map((agent: any) => (
                  <tr key={agent.id} className="border-b border-[#E2E8F0]/50 last:border-0 hover:bg-[#F8FAFC]">
                    <td className="px-4 py-3 text-sm font-medium text-[#1B2B4B]">{agent.fullName}</td>
                    <td className="px-4 py-3 text-sm text-[#94A3B8]">{agent.email}</td>
                    <td className="px-4 py-3 text-sm text-[#94A3B8]">{agent.state || '-'}</td>
                    <td className="px-4 py-3 text-sm text-[#94A3B8]">{new Date(agent.createdAt).toLocaleDateString()}</td>
                  </tr>
                ))}
                {recentRegistrations.length === 0 && (
                  <tr><td colSpan={4} className="px-4 py-8 text-center text-sm text-[#94A3B8]">No registrations yet</td></tr>
                )}
              </tbody>
            </table>
          </div>
          {recentRegistrations.length > 5 && (
            <div className="border-t border-[#E2E8F0]">
              <button
                onClick={() => setShowAllRegistrations(!showAllRegistrations)}
                className="w-full py-2.5 text-sm font-medium text-[#1B2B4B] hover:text-[#F5B731] transition-colors flex items-center justify-center gap-1.5"
              >
                {showAllRegistrations ? (
                  <><LuChevronUp className="w-4 h-4" /> Show less</>
                ) : (
                  <><LuChevronDown className="w-4 h-4" /> Show {recentRegistrations.length - 5} more</>
                )}
              </button>
            </div>
          )}
        </div>
      </main>
    </div>
  )
}
