'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import {
  LuCircleDot, LuChartBar, LuClock, LuUsers, LuTrendingUp, LuTrendingDown, LuCalendar, LuZap
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

export default function ManagerInsightsPage() {
  const [data, setData] = useState<InsightsData | null>(null)
  const [loading, setLoading] = useState(true)
  const [trendView, setTrendView] = useState<TrendView>('daily')

  useEffect(() => {
    fetch('/api/dashboard/insights')
      .then(r => r.ok ? r.json() : null)
      .then(d => { if (d) setData(d) })
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [])

  if (loading) return (
    <div className="min-h-screen bg-[#F8FAFC] flex items-center justify-center">
      <div className="w-12 h-12 border-4 border-[#E2E8F0] border-t-[#1B2B4B] rounded-full animate-spin" />
    </div>
  )

  const perf = data?.performance
  const dist = data?.scoreDistribution || {}
  const maxDist = Math.max(...Object.values(dist), 1)

  const trendData = data?.submissionTrends?.[trendView] || []
  const trendItems = trendData as any[]
  const maxTrend = Math.max(...trendItems.map((t: any) => t.count || 0), 1)

  const distColors: Record<string, string> = {
    '0-20': '#dc3545', '21-40': '#F5B731', '41-60': '#007bff', '61-80': '#28a745', '81-100': '#1B2B4B',
  }

  return (
    <div className="min-h-screen bg-[#F8FAFC]">
      <header className="bg-[#1B2B4B]">
        <div className="max-w-7xl mx-auto px-4 py-4 flex items-center justify-between">
          <div>
            <h1 className="text-lg font-bold text-white">Examination Insights</h1>
            <p className="text-xs text-[#94A3B8]">Detailed analytics for your candidates</p>
          </div>
          <Link href="/manager" className="text-sm text-[#94A3B8] hover:text-white transition-colors">← Dashboard</Link>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 py-6 space-y-6">
        {/* Performance Metrics */}
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

        {/* Top/Bottom Candidates */}
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

          {/* Highest */}
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
                        i === 0 ? 'bg-[#28a745]/20 text-[#28a745]' : 'bg-[#E2E8F0] text-[#94A3B8]'
                      }`}>{i + 1}</span>
                      <span className="text-sm font-medium text-[#1B2B4B] truncate max-w-[120px]">{c.name}</span>
                    </div>
                    <div className="flex items-center gap-3 text-xs">
                      <span className="font-semibold text-[#28a745]">{c.percentage}%</span>
                      <span className="bg-[#E2E8F0] text-[#94A3B8] px-2 py-0.5 rounded-full">{c.state}</span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Lowest */}
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
                    <div className="flex items-center gap-3 text-xs">
                      <span className="font-semibold text-[#dc3545]">{c.percentage}%</span>
                      <span className="bg-[#E2E8F0] text-[#94A3B8] px-2 py-0.5 rounded-full">{c.state}</span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Score Distribution */}
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

        {/* Submission Trends */}
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
              const shortLabel = trendView === 'daily' ? label.slice(5) : trendView === 'monthly' ? new Date(label + '-01').toLocaleString('en', { month: 'short' }) : label

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
      </main>
    </div>
  )
}
