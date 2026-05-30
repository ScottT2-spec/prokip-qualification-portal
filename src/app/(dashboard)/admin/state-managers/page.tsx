'use client'

import { useEffect, useState, useCallback } from 'react'
import Link from 'next/link'
import { LuUsers, LuLink, LuPlus, LuCopy, LuCircleCheck, LuPowerOff, LuPower, LuTrash2, LuRefreshCw, LuChevronDown, LuChevronUp } from 'react-icons/lu'

interface SmInvite {
  id: string
  code: string
  states: { id: string; name: string; country: string }[]
  isActive: boolean
  expiresAt: string | null
  registeredUserId: string | null
  registeredUser: { id: string; fullName: string; email: string; phone: string; isActive: boolean; createdAt: string } | null
  registeredAt: string | null
  stats: { totalCandidates: number; passed: number; failed: number; passRate: number } | null
  createdAt: string
}

export default function StateManagersPage() {
  const [invites, setInvites] = useState<SmInvite[]>([])
  const [loading, setLoading] = useState(true)
  const [showCreate, setShowCreate] = useState(false)
  const [stateInputs, setStateInputs] = useState([{ name: '', country: 'Nigeria' }])
  const [expiresAt, setExpiresAt] = useState('')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [copiedId, setCopiedId] = useState<string | null>(null)
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null)
  const [showAll, setShowAll] = useState(false)

  const loadInvites = useCallback(async () => {
    try {
      const res = await fetch('/api/sm-invites')
      if (res.ok) {
        const data = await res.json()
        setInvites(data.invites || [])
      }
    } catch {} finally { setLoading(false) }
  }, [])

  useEffect(() => { loadInvites() }, [loadInvites])

  const createInvite = async (e: React.FormEvent) => {
    e.preventDefault(); setError(''); setSaving(true)
    const validStates = stateInputs.filter(s => s.name.trim())
    if (validStates.length === 0) { setError('Add at least one state'); setSaving(false); return }
    try {
      const res = await fetch('/api/sm-invites', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ states: validStates, expiresAt: expiresAt || null }),
      })
      if (!res.ok) { const d = await res.json(); setError(d.error); setSaving(false); return }
      setShowCreate(false)
      setStateInputs([{ name: '', country: 'Nigeria' }])
      setExpiresAt('')
      loadInvites()
    } catch { setError('Network error') } finally { setSaving(false) }
  }

  const toggleInvite = async (id: string, isActive: boolean) => {
    await fetch('/api/sm-invites', { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ inviteId: id, isActive }) })
    setInvites(prev => prev.map(i => i.id === id ? { ...i, isActive } : i))
  }

  const regenerateLink = async (id: string) => {
    const res = await fetch('/api/sm-invites', { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ inviteId: id, regenerate: true }) })
    if (res.ok) { const { invite } = await res.json(); setInvites(prev => prev.map(i => i.id === id ? { ...i, code: invite.code } : i)) }
  }

  const deleteInvite = async (id: string) => {
    await fetch('/api/sm-invites', { method: 'DELETE', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ inviteId: id }) })
    setInvites(prev => prev.filter(i => i.id !== id))
    setConfirmDeleteId(null)
  }

  const copyLink = (invite: SmInvite) => {
    const url = `${window.location.origin}/manager/register/${invite.code}`
    navigator.clipboard.writeText(url)
    setCopiedId(invite.id)
    setTimeout(() => setCopiedId(null), 2000)
  }

  const getStatus = (invite: SmInvite) => {
    if (invite.registeredUserId) return { label: 'Registered', color: 'bg-[#28a745]/10 text-[#28a745]' }
    if (!invite.isActive) return { label: 'Disabled', color: 'bg-[#dc3545]/10 text-[#dc3545]' }
    if (invite.expiresAt && new Date(invite.expiresAt) < new Date()) return { label: 'Expired', color: 'bg-[#94A3B8]/10 text-[#94A3B8]' }
    return { label: 'Pending Registration', color: 'bg-[#FEF3C7] text-[#F5B731]' }
  }

  const inputClass = "w-full bg-[#F8FAFC] border border-[#E2E8F0] rounded-xl px-3 py-2.5 text-sm text-[#1B2B4B] outline-none transition-all focus:border-[#1B2B4B] focus:ring-[3px] focus:ring-[#1B2B4B]/10"
  const labelClass = "text-xs font-semibold tracking-wider uppercase text-[#1B2B4B] mb-1 block"

  const visibleInvites = showAll ? invites : invites.slice(0, 5)
  const hiddenCount = invites.length - 5

  return (
    <div className="min-h-screen bg-[#F8FAFC]">
      <header className="bg-[#1B2B4B]">
        <div className="max-w-7xl mx-auto px-4 py-4 flex items-center justify-between">
          <div><h1 className="text-lg font-bold text-white">State Managers</h1><p className="text-xs text-[#94A3B8]">Invite & manage regional managers</p></div>
          <div className="flex items-center gap-3">
            <Link href="/admin" className="text-sm text-[#94A3B8] hover:text-white transition-colors">← Dashboard</Link>
            <button onClick={() => setShowCreate(!showCreate)} className="bg-[#F5B731] text-[#1B2B4B] px-4 py-2 rounded-xl text-sm font-semibold hover:bg-[#F5B731]/90 transition-all inline-flex items-center gap-1.5">
              <LuPlus className="w-4 h-4" /> Generate Invite
            </button>
          </div>
        </div>
      </header>
      <main className="max-w-7xl mx-auto px-4 py-6">
        {/* Create Invite Form */}
        {showCreate && (
          <div className="bg-white rounded-[16px] border border-[#E2E8F0] shadow-[0_1px_3px_rgba(0,0,0,0.05)] p-6 mb-6">
            <h3 className="font-semibold text-[#1B2B4B] mb-4 flex items-center gap-2"><LuLink className="w-5 h-5" /> Generate Registration Link</h3>
            {error && <div className="bg-[#dc3545]/10 text-[#dc3545] text-sm rounded-xl p-3 mb-4">{error}</div>}
            <form onSubmit={createInvite} className="space-y-4">
              <div>
                <label className={labelClass}>Assigned States</label>
                {stateInputs.map((s, i) => (
                  <div key={i} className="flex gap-2 mb-2">
                    <input type="text" value={s.name} onChange={e => { const arr = [...stateInputs]; arr[i] = { ...arr[i], name: e.target.value }; setStateInputs(arr) }} placeholder="State name (e.g. Kano)" required className="flex-1 bg-[#F8FAFC] border border-[#E2E8F0] rounded-lg px-3 py-2 text-sm text-[#1B2B4B] outline-none focus:border-[#1B2B4B]" />
                    <select value={s.country} onChange={e => { const arr = [...stateInputs]; arr[i] = { ...arr[i], country: e.target.value }; setStateInputs(arr) }} className="bg-[#F8FAFC] border border-[#E2E8F0] rounded-lg px-3 py-2 text-sm text-[#1B2B4B] outline-none focus:border-[#1B2B4B]">
                      <option value="Nigeria">Nigeria</option><option value="Ghana">Ghana</option><option value="Kenya">Kenya</option><option value="South Africa">South Africa</option>
                    </select>
                    {stateInputs.length > 1 && (
                      <button type="button" onClick={() => setStateInputs(stateInputs.filter((_, j) => j !== i))} className="text-[#dc3545] hover:bg-[#dc3545]/10 p-2 rounded-lg transition-colors">
                        <LuTrash2 className="w-4 h-4" />
                      </button>
                    )}
                  </div>
                ))}
                <button type="button" onClick={() => setStateInputs([...stateInputs, { name: '', country: 'Nigeria' }])} className="text-sm text-[#F5B731] font-semibold hover:underline">+ Add State</button>
              </div>
              <div>
                <label className={labelClass}>Expiration Date (Optional)</label>
                <input type="datetime-local" value={expiresAt} onChange={e => setExpiresAt(e.target.value)} className={inputClass} />
              </div>
              <div className="flex gap-2">
                <button type="submit" disabled={saving} className="bg-[#0F1C32] text-white px-6 py-2.5 rounded-xl text-sm font-semibold hover:bg-[#1B2B4B] disabled:opacity-50 transition-all">{saving ? 'Generating...' : 'Generate Link'}</button>
                <button type="button" onClick={() => setShowCreate(false)} className="px-6 py-2.5 rounded-xl text-sm text-[#1B2B4B] bg-[#F8FAFC] border border-[#E2E8F0] hover:bg-white transition-all">Cancel</button>
              </div>
            </form>
          </div>
        )}

        {/* Invites List */}
        <div className="space-y-3">
          {visibleInvites.map(invite => {
            const status = getStatus(invite)
            const regUrl = `${typeof window !== 'undefined' ? window.location.origin : ''}/manager/register/${invite.code}`
            return (
              <div key={invite.id} className={`bg-white rounded-[16px] border border-[#E2E8F0] shadow-[0_1px_3px_rgba(0,0,0,0.05)] p-5 transition-shadow hover:shadow-[0_4px_6px_rgba(0,0,0,0.07)] ${!invite.isActive && !invite.registeredUserId ? 'opacity-60' : ''}`}>
                <div className="flex items-start justify-between gap-3">
                  <div className="flex-1 min-w-0">
                    {/* Registered manager info */}
                    {invite.registeredUser ? (
                      <div className="mb-2">
                        <h3 className="font-semibold text-[#1B2B4B]">{invite.registeredUser.fullName}</h3>
                        <p className="text-sm text-[#94A3B8]">{invite.registeredUser.email} · {invite.registeredUser.phone}</p>
                        {invite.registeredAt && <p className="text-xs text-[#94A3B8] mt-0.5">Registered {new Date(invite.registeredAt).toLocaleDateString()}</p>}
                      </div>
                    ) : (
                      <div className="mb-2">
                        <div className="flex items-center gap-2 mb-1">
                          <code className="text-xs font-mono text-[#1B2B4B] bg-[#F8FAFC] px-2 py-1 rounded-lg truncate max-w-[300px] sm:max-w-none block">{regUrl}</code>
                        </div>
                      </div>
                    )}

                    {/* States */}
                    <div className="flex flex-wrap gap-1.5 mb-2">
                      {invite.states.map((s) => (
                        <span key={s.id} className="text-xs bg-[#F5B731]/10 text-[#F5B731] px-2 py-0.5 rounded-full font-semibold">{s.name}, {s.country}</span>
                      ))}
                    </div>

                    {/* Stats for registered managers */}
                    {invite.stats && (
                      <div className="flex flex-wrap gap-3 text-xs text-[#94A3B8]">
                        <span><LuUsers className="w-3 h-3 inline mr-1" />{invite.stats.totalCandidates} candidates</span>
                        <span className="text-[#28a745]">✓ {invite.stats.passed} passed</span>
                        <span className="text-[#dc3545]">✗ {invite.stats.failed} failed</span>
                        <span>{invite.stats.passRate}% pass rate</span>
                      </div>
                    )}

                    <div className="flex items-center gap-2 mt-1 text-xs text-[#94A3B8]">
                      <span>Created {new Date(invite.createdAt).toLocaleDateString()}</span>
                      {invite.expiresAt && <span>· Expires {new Date(invite.expiresAt).toLocaleDateString()}</span>}
                    </div>
                  </div>

                  <div className="flex flex-col items-end gap-2">
                    <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full whitespace-nowrap ${status.color}`}>{status.label}</span>
                    <div className="flex items-center gap-1">
                      {!invite.registeredUserId && (
                        <>
                          <button onClick={() => copyLink(invite)} className="p-1.5 rounded-lg hover:bg-[#E2E8F0] transition-colors text-[#1B2B4B]" title="Copy link">
                            {copiedId === invite.id ? <LuCircleCheck className="w-4 h-4 text-[#28a745]" /> : <LuCopy className="w-4 h-4" />}
                          </button>
                          <button onClick={() => regenerateLink(invite.id)} className="p-1.5 rounded-lg hover:bg-[#E2E8F0] transition-colors text-[#1B2B4B]" title="Regenerate link">
                            <LuRefreshCw className="w-4 h-4" />
                          </button>
                          <button onClick={() => toggleInvite(invite.id, !invite.isActive)} className={`p-1.5 rounded-lg transition-colors ${invite.isActive ? 'hover:bg-[#dc3545]/10 text-[#dc3545]' : 'hover:bg-[#28a745]/10 text-[#28a745]'}`} title={invite.isActive ? 'Disable' : 'Enable'}>
                            {invite.isActive ? <LuPowerOff className="w-4 h-4" /> : <LuPower className="w-4 h-4" />}
                          </button>
                        </>
                      )}
                      {confirmDeleteId === invite.id ? (
                        <div className="flex items-center gap-1">
                          <button onClick={() => deleteInvite(invite.id)} className="px-2 py-1 rounded-lg text-xs font-semibold bg-[#dc3545] text-white hover:bg-[#dc3545]/90 transition-all">Confirm</button>
                          <button onClick={() => setConfirmDeleteId(null)} className="px-2 py-1 rounded-lg text-xs font-semibold bg-[#E2E8F0] text-[#1B2B4B] transition-all">Cancel</button>
                        </div>
                      ) : (
                        <button onClick={() => setConfirmDeleteId(invite.id)} className="p-1.5 rounded-lg hover:bg-[#dc3545]/10 text-[#94A3B8] hover:text-[#dc3545] transition-colors" title="Delete">
                          <LuTrash2 className="w-4 h-4" />
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            )
          })}

          {hiddenCount > 0 && (
            <button onClick={() => setShowAll(!showAll)} className="w-full py-2.5 text-sm font-medium text-[#1B2B4B] hover:text-[#F5B731] transition-colors flex items-center justify-center gap-1.5">
              {showAll ? <><LuChevronUp className="w-4 h-4" /> Show less</> : <><LuChevronDown className="w-4 h-4" /> Show {hiddenCount} more</>}
            </button>
          )}

          {!loading && invites.length === 0 && (
            <div className="text-center py-12 text-[#94A3B8]">
              <p className="flex justify-center mb-2"><LuUsers className="w-10 h-10" /></p>
              <p className="mb-1">No state manager invites yet</p>
              <p className="text-xs">Click &quot;Generate Invite&quot; to create a registration link</p>
            </div>
          )}
        </div>
      </main>
    </div>
  )
}
