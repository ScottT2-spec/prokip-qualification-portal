'use client'

import { useEffect, useState, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import {
  LuUsers, LuFileText, LuCircleCheck, LuCircleX, LuClock, LuGraduationCap, LuDownload, LuLink, LuCopy, LuPlus, LuPower, LuPowerOff, LuTrash2, LuChevronDown, LuChevronUp, LuChartBar, LuTrendingUp, LuTrendingDown, LuCircleDot, LuFilter, LuArrowUpDown, LuX
} from 'react-icons/lu'

interface ReferralLink {
  id: string
  code: string
  stateId: string
  isActive: boolean
  usedCount: number
  createdAt: string
}

interface ManagerState {
  id: string
  name: string
  country: string
}

interface Filters {
  status: string
  scoreFilter: string
  percentageMin: string
  percentageMax: string
  dateRange: string
  dateFrom: string
  dateTo: string
  completionTime: string
  sortBy: string
  sortOrder: 'asc' | 'desc'
}

const defaultFilters: Filters = {
  status: 'all',
  scoreFilter: 'all',
  percentageMin: '',
  percentageMax: '',
  dateRange: 'all',
  dateFrom: '',
  dateTo: '',
  completionTime: 'all',
  sortBy: 'createdAt',
  sortOrder: 'desc',
}

export default function ManagerDashboard() {
  const router = useRouter()
  const [user, setUser] = useState<any>(null)
  const [data, setData] = useState<any>(null)
  const [search, setSearch] = useState('')
  const [page, setPage] = useState(1)
  const [loading, setLoading] = useState(true)
  const [exporting, setExporting] = useState(false)
  const [showFilters, setShowFilters] = useState(false)
  const [filters, setFilters] = useState<Filters>(defaultFilters)

  // Referral link state
  const [referralLinks, setReferralLinks] = useState<ReferralLink[]>([])
  const [managerStates, setManagerStates] = useState<ManagerState[]>([])
  const [generatingLink, setGeneratingLink] = useState(false)
  const [copiedId, setCopiedId] = useState<string | null>(null)
  const [togglingId, setTogglingId] = useState<string | null>(null)
  const [deletingId, setDeletingId] = useState<string | null>(null)
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null)
  const [showAllLinks, setShowAllLinks] = useState(false)

  const activeFilterCount = Object.entries(filters).filter(([k, v]) => {
    if (k === 'sortBy' || k === 'sortOrder') return false
    if (k === 'status' || k === 'scoreFilter' || k === 'dateRange' || k === 'completionTime') return v !== 'all'
    return v !== ''
  }).length

  const loadData = useCallback(async () => {
    try {
      const params = new URLSearchParams({ page: page.toString() })
      if (search) params.set('search', search)
      if (filters.status !== 'all') params.set('status', filters.status)
      if (filters.scoreFilter !== 'all') params.set('scoreFilter', filters.scoreFilter)
      if (filters.percentageMin) params.set('percentageMin', filters.percentageMin)
      if (filters.percentageMax) params.set('percentageMax', filters.percentageMax)
      if (filters.dateRange !== 'all') params.set('dateRange', filters.dateRange)
      if (filters.dateFrom) params.set('dateFrom', filters.dateFrom)
      if (filters.dateTo) params.set('dateTo', filters.dateTo)
      if (filters.completionTime !== 'all') params.set('completionTime', filters.completionTime)
      params.set('sortBy', filters.sortBy)
      params.set('sortOrder', filters.sortOrder)

      const [meRes, dashRes] = await Promise.all([fetch('/api/auth/me'), fetch(`/api/dashboard/manager?${params}`)])
      if (!meRes.ok) { router.push('/login'); return }
      const me = await meRes.json()
      if (me.user.role !== 'STATE_MANAGER') { router.push('/dashboard'); return }
      setUser(me.user)
      if (dashRes.ok) setData(await dashRes.json())
    } catch { router.push('/login') } finally { setLoading(false) }
  }, [page, search, filters, router])

  const loadReferralLinks = useCallback(async () => {
    try {
      const res = await fetch('/api/referral-links')
      if (res.ok) {
        const json = await res.json()
        setReferralLinks(json.links || [])
        setManagerStates(json.states || [])
      }
    } catch {}
  }, [])

  useEffect(() => { loadData() }, [loadData])
  useEffect(() => { if (user) { loadReferralLinks() } }, [user, loadReferralLinks])

  const handleGenerateLink = async (stateId: string) => {
    setGeneratingLink(true)
    try {
      const res = await fetch('/api/referral-links', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ stateId }),
      })
      if (res.ok) await loadReferralLinks()
    } catch {} finally { setGeneratingLink(false) }
  }

  const handleToggleLink = async (linkId: string, isActive: boolean) => {
    setTogglingId(linkId)
    try {
      const res = await fetch('/api/referral-links', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ linkId, isActive }),
      })
      if (res.ok) setReferralLinks(prev => prev.map(l => l.id === linkId ? { ...l, isActive } : l))
    } catch {} finally { setTogglingId(null) }
  }

  const handleDeleteLink = async (linkId: string) => {
    setDeletingId(linkId)
    try {
      const res = await fetch('/api/referral-links', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ linkId }),
      })
      if (res.ok) setReferralLinks(prev => prev.filter(l => l.id !== linkId))
    } catch {} finally { setDeletingId(null); setConfirmDeleteId(null) }
  }

  const copyLink = (link: ReferralLink) => {
    const url = `${window.location.origin}/register/${link.code}`
    navigator.clipboard.writeText(url)
    setCopiedId(link.id)
    setTimeout(() => setCopiedId(null), 2000)
  }

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

  const handleLogout = async () => { await fetch('/api/auth/logout', { method: 'POST' }); router.push('/login') }

  const resetFilters = () => { setFilters(defaultFilters); setPage(1) }

  const updateFilter = (key: keyof Filters, value: string) => {
    setFilters(prev => ({ ...prev, [key]: value }))
    setPage(1)
  }

  const toggleSort = (field: string) => {
    setFilters(prev => ({
      ...prev,
      sortBy: field,
      sortOrder: prev.sortBy === field && prev.sortOrder === 'desc' ? 'asc' : 'desc',
    }))
    setPage(1)
  }

  if (loading) return (
    <div className="min-h-screen bg-[#F8FAFC] flex items-center justify-center">
      <div className="w-12 h-12 border-4 border-[#E2E8F0] border-t-[#1B2B4B] rounded-full animate-spin" />
    </div>
  )

  const metrics = data?.metrics || {}
  const agents = data?.data || data?.agents || []
  const statusColors: Record<string, string> = {
    NOT_STARTED: 'bg-[#E2E8F0] text-[#94A3B8]',
    IN_PROGRESS: 'bg-[#FEF3C7] text-[#F5B731]',
    SUBMITTED: 'bg-[#007bff]/10 text-[#007bff]',
    PASSED: 'bg-[#28a745]/10 text-[#28a745]',
    FAILED: 'bg-[#dc3545]/10 text-[#dc3545]',
  }

  const activeLinks = referralLinks.filter(l => l.isActive)
  const inactiveLinks = referralLinks.filter(l => !l.isActive)

  const selectClasses = "bg-[#F8FAFC] border border-[#E2E8F0] rounded-xl px-3 py-2 text-sm text-[#1B2B4B] outline-none focus:border-[#1B2B4B] focus:ring-[3px] focus:ring-[#1B2B4B]/10 w-full cursor-pointer"
  const inputClasses = "bg-[#F8FAFC] border border-[#E2E8F0] rounded-xl px-3 py-2 text-sm text-[#1B2B4B] outline-none focus:border-[#1B2B4B] focus:ring-[3px] focus:ring-[#1B2B4B]/10 w-full"

  return (
    <div className="min-h-screen bg-[#F8FAFC]">
      {/* Header */}
      <header className="bg-[#1B2B4B]">
        <div className="max-w-7xl mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <LuGraduationCap className="w-6 h-6 text-[#F5B731]" />
            <div>
              <h1 className="text-lg font-bold text-white">State Manager Dashboard</h1>
              <p className="text-xs text-[#94A3B8]">Welcome, {user?.fullName}</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <Link href="/manager/insights" className="text-sm text-[#F5B731] hover:text-white transition-colors font-semibold">📊 Insights</Link>
            <button onClick={handleLogout} className="text-sm text-[#94A3B8] hover:text-white transition-colors">Sign Out</button>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 py-6">
        {/* ── Summary Cards ── */}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3 mb-4">
          {[
            { label: 'Registered', value: metrics.totalRegistered, icon: <LuUsers className="w-5 h-5 text-[#1B2B4B]" /> },
            { label: 'Submitted', value: metrics.submitted, icon: <LuFileText className="w-5 h-5 text-[#1B2B4B]" /> },
            { label: 'Passed', value: metrics.passed, icon: <LuCircleCheck className="w-5 h-5 text-[#28a745]" /> },
            { label: 'Failed', value: metrics.failed, icon: <LuCircleX className="w-5 h-5 text-[#dc3545]" /> },
            { label: 'Not Started', value: metrics.notStarted, icon: <LuClock className="w-5 h-5 text-[#94A3B8]" /> },
          ].map((m, i) => (
            <div key={i} className="bg-white rounded-[16px] border border-[#E2E8F0] shadow-[0_1px_3px_rgba(0,0,0,0.05)] p-4 text-center">
              <span className="flex justify-center">{m.icon}</span>
              <p className="text-2xl font-bold text-[#1B2B4B] mt-1">{m.value ?? 0}</p>
              <p className="text-[11px] font-semibold tracking-wider text-[#94A3B8] uppercase">{m.label}</p>
            </div>
          ))}
        </div>

        {/* ── Extended Metrics Row ── */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-6">
          {[
            { label: 'Pass Rate', value: metrics.passRate != null ? `${metrics.passRate}%` : '—', icon: <LuCircleDot className="w-5 h-5 text-[#007bff]" /> },
            { label: 'Avg Score', value: metrics.avgScore != null ? `${metrics.avgScore}%` : '—', icon: <LuChartBar className="w-5 h-5 text-[#F5B731]" /> },
            { label: 'Highest Score', value: metrics.highestScore != null ? `${metrics.highestScore}%` : '—', icon: <LuTrendingUp className="w-5 h-5 text-[#28a745]" /> },
            { label: 'Lowest Score', value: metrics.lowestScore != null ? `${metrics.lowestScore}%` : '—', icon: <LuTrendingDown className="w-5 h-5 text-[#dc3545]" /> },
          ].map((m, i) => (
            <div key={i} className="bg-white rounded-[16px] border border-[#E2E8F0] shadow-[0_1px_3px_rgba(0,0,0,0.05)] p-4 text-center">
              <span className="flex justify-center">{m.icon}</span>
              <p className="text-2xl font-bold text-[#1B2B4B] mt-1">{m.value}</p>
              <p className="text-[11px] font-semibold tracking-wider text-[#94A3B8] uppercase">{m.label}</p>
            </div>
          ))}
        </div>

        {/* Avg Completion Time — full width accent card */}
        <div className="bg-[#1B2B4B] rounded-[16px] p-4 mb-6 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <LuClock className="w-6 h-6 text-[#F5B731]" />
            <div>
              <p className="text-[11px] font-semibold tracking-wider text-[#94A3B8] uppercase">Avg Completion Time</p>
              <p className="text-2xl font-bold text-white">
                {metrics.avgCompletionTime != null ? `${metrics.avgCompletionTime} min` : '—'}
              </p>
            </div>
          </div>
        </div>

        {/* ── Referral Links ── */}
        <div className="bg-white rounded-[16px] border border-[#E2E8F0] shadow-[0_1px_3px_rgba(0,0,0,0.05)] p-5 mb-6">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <LuLink className="w-5 h-5 text-[#1B2B4B]" />
              <h2 className="text-base font-bold text-[#1B2B4B]">Referral Links</h2>
              <span className="text-xs bg-[#E2E8F0] text-[#94A3B8] px-2 py-0.5 rounded-full">{activeLinks.length} active</span>
            </div>
            {managerStates.length > 0 && (
              <div className="flex gap-2">
                {managerStates.map(state => (
                  <button
                    key={state.id}
                    onClick={() => handleGenerateLink(state.id)}
                    disabled={generatingLink}
                    className="bg-[#F5B731] text-[#1B2B4B] px-3 py-1.5 rounded-xl text-sm font-semibold hover:bg-[#F5B731]/90 disabled:opacity-50 transition-all inline-flex items-center gap-1.5"
                  >
                    <LuPlus className="w-4 h-4" />
                    Generate Link{managerStates.length > 1 ? ` (${state.name})` : ''}
                  </button>
                ))}
              </div>
            )}
          </div>

          {referralLinks.length === 0 ? (
            <p className="text-sm text-[#94A3B8] text-center py-6">No referral links yet. Generate one to start onboarding agents.</p>
          ) : (() => {
            const sortedLinks = [...activeLinks, ...inactiveLinks]
            const visibleLinks = showAllLinks ? sortedLinks : sortedLinks.slice(0, 3)
            const hiddenCount = sortedLinks.length - 3
            return (
              <div className="space-y-2">
                {visibleLinks.map(link => {
                  const regUrl = `${typeof window !== 'undefined' ? window.location.origin : ''}/register/${link.code}`
                  return (
                    <div key={link.id} className={`flex items-center justify-between p-3 rounded-xl border transition-all ${link.isActive ? 'border-[#E2E8F0] bg-[#F8FAFC]' : 'border-[#E2E8F0]/50 bg-[#F8FAFC]/50 opacity-60'}`}>
                      <div className="flex-1 min-w-0 mr-3">
                        <div className="flex items-center gap-2 mb-0.5">
                          <code className="text-sm font-mono text-[#1B2B4B] truncate">{regUrl}</code>
                          <span className={`text-[10px] font-semibold px-1.5 py-0.5 rounded-full ${link.isActive ? 'bg-[#28a745]/10 text-[#28a745]' : 'bg-[#dc3545]/10 text-[#dc3545]'}`}>
                            {link.isActive ? 'ACTIVE' : 'INACTIVE'}
                          </span>
                        </div>
                        <div className="flex items-center gap-3 text-xs text-[#94A3B8]">
                          <span><LuUsers className="w-3 h-3 inline mr-1" />{link.usedCount} registered</span>
                          <span>Created {new Date(link.createdAt).toLocaleDateString()}</span>
                        </div>
                      </div>
                      <div className="flex items-center gap-1.5">
                        <button onClick={() => copyLink(link)} className="p-2 rounded-lg hover:bg-[#E2E8F0] transition-colors text-[#1B2B4B]" title="Copy link">
                          {copiedId === link.id ? <LuCircleCheck className="w-4 h-4 text-[#28a745]" /> : <LuCopy className="w-4 h-4" />}
                        </button>
                        <button
                          onClick={() => handleToggleLink(link.id, !link.isActive)}
                          disabled={togglingId === link.id}
                          className={`p-2 rounded-lg transition-colors disabled:opacity-50 ${link.isActive ? 'hover:bg-[#dc3545]/10 text-[#dc3545]' : 'hover:bg-[#28a745]/10 text-[#28a745]'}`}
                          title={link.isActive ? 'Deactivate' : 'Reactivate'}
                        >
                          {link.isActive ? <LuPowerOff className="w-4 h-4" /> : <LuPower className="w-4 h-4" />}
                        </button>
                        {confirmDeleteId === link.id ? (
                          <div className="flex items-center gap-1 ml-1">
                            <button onClick={() => handleDeleteLink(link.id)} disabled={deletingId === link.id} className="px-2 py-1 rounded-lg text-xs font-semibold bg-[#dc3545] text-white hover:bg-[#dc3545]/90 disabled:opacity-50 transition-all">
                              {deletingId === link.id ? '...' : 'Confirm'}
                            </button>
                            <button onClick={() => setConfirmDeleteId(null)} className="px-2 py-1 rounded-lg text-xs font-semibold bg-[#E2E8F0] text-[#1B2B4B] hover:bg-[#E2E8F0]/70 transition-all">Cancel</button>
                          </div>
                        ) : (
                          <button onClick={() => setConfirmDeleteId(link.id)} className="p-2 rounded-lg hover:bg-[#dc3545]/10 text-[#94A3B8] hover:text-[#dc3545] transition-colors" title="Delete link">
                            <LuTrash2 className="w-4 h-4" />
                          </button>
                        )}
                      </div>
                    </div>
                  )
                })}
                {hiddenCount > 0 && (
                  <button onClick={() => setShowAllLinks(!showAllLinks)} className="w-full py-2 text-sm font-medium text-[#1B2B4B] hover:text-[#F5B731] transition-colors flex items-center justify-center gap-1.5">
                    {showAllLinks ? <><LuChevronUp className="w-4 h-4" /> Show less</> : <><LuChevronDown className="w-4 h-4" /> Show {hiddenCount} more link{hiddenCount > 1 ? 's' : ''}</>}
                  </button>
                )}
              </div>
            )
          })()}
        </div>

        {/* ── Search, Filters & Export Bar ── */}
        <div className="flex flex-wrap gap-3 mb-4">
          <input
            type="text"
            value={search}
            onChange={e => { setSearch(e.target.value); setPage(1) }}
            placeholder="Search agents..."
            className="flex-1 min-w-[200px] bg-[#F8FAFC] border border-[#E2E8F0] rounded-xl px-3 py-2 text-sm text-[#1B2B4B] outline-none focus:border-[#1B2B4B] focus:ring-[3px] focus:ring-[#1B2B4B]/10"
          />
          <button
            onClick={() => setShowFilters(!showFilters)}
            className={`px-4 py-2 rounded-xl text-sm font-semibold transition-all inline-flex items-center gap-1.5 border ${showFilters ? 'bg-[#1B2B4B] text-white border-[#1B2B4B]' : 'bg-white text-[#1B2B4B] border-[#E2E8F0] hover:border-[#1B2B4B]'}`}
          >
            <LuFilter className="w-4 h-4" />
            Filters
            {activeFilterCount > 0 && (
              <span className="bg-[#F5B731] text-[#1B2B4B] text-xs font-bold w-5 h-5 rounded-full flex items-center justify-center">{activeFilterCount}</span>
            )}
          </button>
          <button onClick={() => handleExport('csv')} disabled={exporting} className="bg-[#F5B731] text-[#1B2B4B] px-4 py-2 rounded-xl text-sm font-semibold hover:bg-[#F5B731]/90 disabled:opacity-50 transition-all inline-flex items-center gap-1.5">
            <LuDownload className="w-4 h-4" /> CSV
          </button>
          <button onClick={() => handleExport('excel')} disabled={exporting} className="bg-[#0F1C32] text-white px-4 py-2 rounded-xl text-sm font-semibold hover:bg-[#1B2B4B] disabled:opacity-50 transition-all inline-flex items-center gap-1.5">
            <LuDownload className="w-4 h-4" /> Excel
          </button>
        </div>

        {/* ── Filter Panel ── */}
        {showFilters && (
          <div className="bg-white rounded-[16px] border border-[#E2E8F0] shadow-[0_1px_3px_rgba(0,0,0,0.05)] p-5 mb-4 animate-in slide-in-from-top-2">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-sm font-bold text-[#1B2B4B] flex items-center gap-2">
                <LuFilter className="w-4 h-4" /> Filter Candidates
              </h3>
              {activeFilterCount > 0 && (
                <button onClick={resetFilters} className="text-xs text-[#dc3545] hover:text-[#dc3545]/80 font-semibold flex items-center gap-1">
                  <LuX className="w-3 h-3" /> Clear all filters
                </button>
              )}
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              {/* Status */}
              <div>
                <label className="text-[11px] font-semibold tracking-wider text-[#94A3B8] uppercase mb-1.5 block">Status</label>
                <select value={filters.status} onChange={e => updateFilter('status', e.target.value)} className={selectClasses}>
                  <option value="all">All Statuses</option>
                  <option value="NOT_STARTED">Not Started</option>
                  <option value="IN_PROGRESS">In Progress</option>
                  <option value="SUBMITTED">Submitted</option>
                  <option value="PASSED">Passed</option>
                  <option value="FAILED">Failed</option>
                </select>
              </div>

              {/* Score Filter */}
              <div>
                <label className="text-[11px] font-semibold tracking-wider text-[#94A3B8] uppercase mb-1.5 block">Score</label>
                <select value={filters.scoreFilter} onChange={e => updateFilter('scoreFilter', e.target.value)} className={selectClasses}>
                  <option value="all">All Scores</option>
                  <option value="highest">Highest First</option>
                  <option value="lowest">Lowest First</option>
                  <option value="abovePass">Above Pass Mark</option>
                  <option value="belowPass">Below Pass Mark</option>
                </select>
              </div>

              {/* Percentage Range */}
              <div>
                <label className="text-[11px] font-semibold tracking-wider text-[#94A3B8] uppercase mb-1.5 block">Percentage Range</label>
                <div className="flex gap-2">
                  <select
                    value={filters.percentageMin && filters.percentageMax ? `${filters.percentageMin}-${filters.percentageMax}` : 'all'}
                    onChange={e => {
                      const v = e.target.value
                      if (v === 'all') { updateFilter('percentageMin', ''); setFilters(p => ({ ...p, percentageMax: '' })) }
                      else if (v === '0-69') { updateFilter('percentageMin', '0'); setFilters(p => ({ ...p, percentageMax: '69' })) }
                      else { const [min, max] = v.split('-'); updateFilter('percentageMin', min); setFilters(p => ({ ...p, percentageMax: max })) }
                    }}
                    className={selectClasses}
                  >
                    <option value="all">All</option>
                    <option value="90-100">90% – 100%</option>
                    <option value="80-89">80% – 89%</option>
                    <option value="70-79">70% – 79%</option>
                    <option value="0-69">Below 70%</option>
                  </select>
                </div>
              </div>

              {/* Date Range */}
              <div>
                <label className="text-[11px] font-semibold tracking-wider text-[#94A3B8] uppercase mb-1.5 block">Date Range</label>
                <select value={filters.dateRange} onChange={e => updateFilter('dateRange', e.target.value)} className={selectClasses}>
                  <option value="all">All Time</option>
                  <option value="today">Today</option>
                  <option value="yesterday">Yesterday</option>
                  <option value="last7">Last 7 Days</option>
                  <option value="last30">Last 30 Days</option>
                  <option value="custom">Custom Range</option>
                </select>
              </div>

              {/* Custom Date Inputs */}
              {filters.dateRange === 'custom' && (
                <>
                  <div>
                    <label className="text-[11px] font-semibold tracking-wider text-[#94A3B8] uppercase mb-1.5 block">From</label>
                    <input type="date" value={filters.dateFrom} onChange={e => updateFilter('dateFrom', e.target.value)} className={inputClasses} />
                  </div>
                  <div>
                    <label className="text-[11px] font-semibold tracking-wider text-[#94A3B8] uppercase mb-1.5 block">To</label>
                    <input type="date" value={filters.dateTo} onChange={e => updateFilter('dateTo', e.target.value)} className={inputClasses} />
                  </div>
                </>
              )}

              {/* Completion Time */}
              <div>
                <label className="text-[11px] font-semibold tracking-wider text-[#94A3B8] uppercase mb-1.5 block">Completion Time</label>
                <select value={filters.completionTime} onChange={e => updateFilter('completionTime', e.target.value)} className={selectClasses}>
                  <option value="all">All</option>
                  <option value="under10">Under 10 Minutes</option>
                  <option value="under20">Under 20 Minutes</option>
                  <option value="under30">Under 30 Minutes</option>
                  <option value="above30">Above 30 Minutes</option>
                </select>
              </div>
            </div>
          </div>
        )}

        {/* ── Agents Table ── */}
        <div className="bg-white rounded-[16px] border border-[#E2E8F0] shadow-[0_1px_3px_rgba(0,0,0,0.05)] overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="text-left text-[11px] font-semibold tracking-wider text-[#94A3B8] uppercase border-b border-[#E2E8F0] bg-[#F8FAFC]">
                  <th className="px-4 py-3">Name</th>
                  <th className="px-4 py-3">Email</th>
                  <th className="px-4 py-3">Phone</th>
                  <th className="px-4 py-3">State</th>
                  <th className="px-4 py-3">
                    <button onClick={() => toggleSort('passStatus')} className="inline-flex items-center gap-1 hover:text-[#1B2B4B] transition-colors uppercase">
                      Status <LuArrowUpDown className="w-3 h-3" />
                    </button>
                  </th>
                  <th className="px-4 py-3">
                    <button onClick={() => toggleSort('percentageScore')} className="inline-flex items-center gap-1 hover:text-[#1B2B4B] transition-colors uppercase">
                      Score <LuArrowUpDown className="w-3 h-3" />
                    </button>
                  </th>
                  <th className="px-4 py-3">
                    <button onClick={() => toggleSort('completionTime')} className="inline-flex items-center gap-1 hover:text-[#1B2B4B] transition-colors uppercase">
                      Time <LuArrowUpDown className="w-3 h-3" />
                    </button>
                  </th>
                  <th className="px-4 py-3">
                    <button onClick={() => toggleSort('createdAt')} className="inline-flex items-center gap-1 hover:text-[#1B2B4B] transition-colors uppercase">
                      Registered <LuArrowUpDown className="w-3 h-3" />
                    </button>
                  </th>
                  <th className="px-4 py-3">
                    <button onClick={() => toggleSort('submittedAt')} className="inline-flex items-center gap-1 hover:text-[#1B2B4B] transition-colors uppercase">
                      Submitted <LuArrowUpDown className="w-3 h-3" />
                    </button>
                  </th>
                </tr>
              </thead>
              <tbody>
                {agents.map((agent: any) => {
                  const status = agent.result?.qualificationStatus || agent.latestAttempt?.status || 'NOT_STARTED'
                  const completionMin = agent.completionMinutes
                  return (
                    <tr key={agent.id} className="border-b border-[#E2E8F0]/50 last:border-0 hover:bg-[#F8FAFC] transition-colors">
                      <td className="px-4 py-3 text-sm font-medium text-[#1B2B4B]">{agent.fullName}</td>
                      <td className="px-4 py-3 text-sm text-[#94A3B8]">{agent.email}</td>
                      <td className="px-4 py-3 text-sm text-[#94A3B8]">{agent.phone}</td>
                      <td className="px-4 py-3 text-sm text-[#94A3B8]">{agent.state || '—'}</td>
                      <td className="px-4 py-3">
                        <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${statusColors[status]}`}>
                          {status.replace(/_/g, ' ')}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-sm text-[#94A3B8] font-medium">
                        {agent.result?.percentageScore != null ? `${agent.result.percentageScore}%` : '—'}
                      </td>
                      <td className="px-4 py-3 text-sm text-[#94A3B8]">
                        {completionMin != null ? `${Math.round(completionMin)} min` : '—'}
                      </td>
                      <td className="px-4 py-3 text-sm text-[#94A3B8]">
                        {new Date(agent.createdAt).toLocaleDateString()}
                      </td>
                      <td className="px-4 py-3 text-sm text-[#94A3B8]">
                        {agent.latestAttempt?.submittedAt ? new Date(agent.latestAttempt.submittedAt).toLocaleDateString() : '—'}
                      </td>
                    </tr>
                  )
                })}
                {agents.length === 0 && (
                  <tr>
                    <td colSpan={9} className="px-4 py-8 text-center text-sm text-[#94A3B8]">
                      {activeFilterCount > 0 ? 'No agents match the current filters.' : 'No agents found'}
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* ── Pagination ── */}
        {(data?.total || 0) > 20 && (
          <div className="flex items-center justify-center gap-2 mt-6">
            <button onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1} className="px-3 py-1.5 rounded-lg text-sm bg-white border border-[#E2E8F0] text-[#1B2B4B] disabled:opacity-30">← Prev</button>
            <span className="text-sm text-[#94A3B8]">Page {page} of {Math.ceil(data.total / 20)}</span>
            <button onClick={() => setPage(p => p + 1)} disabled={page >= Math.ceil(data.total / 20)} className="px-3 py-1.5 rounded-lg text-sm bg-white border border-[#E2E8F0] text-[#1B2B4B] disabled:opacity-30">Next →</button>
          </div>
        )}
      </main>
    </div>
  )
}
