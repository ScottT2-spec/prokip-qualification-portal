'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { LuUsers } from 'react-icons/lu'

export default function StateManagersPage() {
  const [managers, setManagers] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [showCreate, setShowCreate] = useState(false)
  const [form, setForm] = useState({ fullName: '', email: '', phone: '', password: '', states: [{ name: '', country: 'Nigeria' }] })
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  const loadManagers = async () => { try { const res = await fetch('/api/state-managers'); if (res.ok) { const data = await res.json(); setManagers(data.managers) } } catch {} finally { setLoading(false) } }
  useEffect(() => { loadManagers() }, [])

  const createManager = async (e: React.FormEvent) => {
    e.preventDefault(); setError(''); setSaving(true)
    try {
      const res = await fetch('/api/state-managers', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(form) })
      const data = await res.json()
      if (!res.ok) { setError(data.error); setSaving(false); return }
      setShowCreate(false); setForm({ fullName: '', email: '', phone: '', password: '', states: [{ name: '', country: 'Nigeria' }] }); loadManagers()
    } catch { setError('Network error') } finally { setSaving(false) }
  }

  const inputClass = "w-full bg-[#F8FAFC] border border-[#E2E8F0] rounded-xl px-3 py-2.5 text-sm text-[#1B2B4B] outline-none transition-all focus:border-[#1B2B4B] focus:ring-[3px] focus:ring-[#1B2B4B]/10"
  const labelClass = "text-xs font-semibold tracking-wider uppercase text-[#1B2B4B] mb-1 block"

  return (
    <div className="min-h-screen bg-[#F8FAFC]">
      <header className="bg-[#1B2B4B]">
        <div className="max-w-7xl mx-auto px-4 py-4 flex items-center justify-between">
          <div><h1 className="text-lg font-bold text-white">State Managers</h1><p className="text-xs text-[#94A3B8]">Manage regional managers</p></div>
          <div className="flex items-center gap-3">
            <Link href="/admin" className="text-sm text-[#94A3B8] hover:text-white transition-colors">← Dashboard</Link>
            <button onClick={() => setShowCreate(!showCreate)} className="bg-[#F5B731] text-[#1B2B4B] px-4 py-2 rounded-xl text-sm font-semibold hover:bg-[#F5B731]/90 transition-all">+ Add Manager</button>
          </div>
        </div>
      </header>
      <main className="max-w-7xl mx-auto px-4 py-6">
        {showCreate && (
          <div className="bg-white rounded-[16px] border border-[#E2E8F0] shadow-[0_1px_3px_rgba(0,0,0,0.05)] p-6 mb-6">
            <h3 className="font-semibold text-[#1B2B4B] mb-4">Add State Manager</h3>
            {error && <div className="bg-[#dc3545]/10 text-[#dc3545] text-sm rounded-xl p-3 mb-4">{error}</div>}
            <form onSubmit={createManager} className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div><label className={labelClass}>Full Name</label><input type="text" value={form.fullName} onChange={e => setForm(p => ({...p, fullName: e.target.value}))} required className={inputClass} /></div>
                <div><label className={labelClass}>Email</label><input type="email" value={form.email} onChange={e => setForm(p => ({...p, email: e.target.value}))} required className={inputClass} /></div>
                <div><label className={labelClass}>Phone</label><input type="tel" value={form.phone} onChange={e => setForm(p => ({...p, phone: e.target.value}))} required className={inputClass} /></div>
                <div><label className={labelClass}>Password</label><input type="password" value={form.password} onChange={e => setForm(p => ({...p, password: e.target.value}))} required className={inputClass} /></div>
              </div>
              <div>
                <label className={labelClass}>Assigned States</label>
                {form.states.map((s, i) => (
                  <div key={i} className="flex gap-2 mb-2">
                    <input type="text" value={s.name} onChange={e => { const states = [...form.states]; states[i] = { ...states[i], name: e.target.value }; setForm(p => ({ ...p, states })) }} placeholder="State name" required className="flex-1 bg-[#F8FAFC] border border-[#E2E8F0] rounded-lg px-3 py-2 text-sm text-[#1B2B4B] outline-none focus:border-[#1B2B4B]" />
                    <select value={s.country} onChange={e => { const states = [...form.states]; states[i] = { ...states[i], country: e.target.value }; setForm(p => ({ ...p, states })) }} className="bg-[#F8FAFC] border border-[#E2E8F0] rounded-lg px-3 py-2 text-sm text-[#1B2B4B] outline-none focus:border-[#1B2B4B]">
                      <option value="Nigeria">Nigeria</option><option value="Ghana">Ghana</option><option value="Kenya">Kenya</option><option value="South Africa">South Africa</option>
                    </select>
                  </div>
                ))}
                <button type="button" onClick={() => setForm(p => ({ ...p, states: [...p.states, { name: '', country: 'Nigeria' }] }))} className="text-sm text-[#F5B731] font-semibold hover:underline">+ Add State</button>
              </div>
              <div className="flex gap-2">
                <button type="submit" disabled={saving} className="bg-[#0F1C32] text-white px-6 py-2.5 rounded-xl text-sm font-semibold hover:bg-[#1B2B4B] disabled:opacity-50 transition-all">{saving ? 'Creating...' : 'Create Manager'}</button>
                <button type="button" onClick={() => setShowCreate(false)} className="px-6 py-2.5 rounded-xl text-sm text-[#1B2B4B] bg-[#F8FAFC] border border-[#E2E8F0] hover:bg-white transition-all">Cancel</button>
              </div>
            </form>
          </div>
        )}
        <div className="space-y-3">
          {managers.map(sm => (
            <div key={sm.id} className="bg-white rounded-[16px] border border-[#E2E8F0] shadow-[0_1px_3px_rgba(0,0,0,0.05)] p-5 hover:shadow-[0_4px_6px_rgba(0,0,0,0.07)] transition-shadow">
              <div className="flex items-start justify-between">
                <div>
                  <h3 className="font-semibold text-[#1B2B4B]">{sm.user.fullName}</h3>
                  <p className="text-sm text-[#94A3B8]">{sm.user.email} · {sm.user.phone}</p>
                  <div className="flex gap-2 mt-2">{sm.states.map((s: any) => (<span key={s.id} className="text-xs bg-[#F5B731]/10 text-[#F5B731] px-2 py-0.5 rounded-full font-semibold">{s.name}, {s.country}</span>))}</div>
                </div>
                <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${sm.user.isActive ? 'bg-[#28a745]/10 text-[#28a745]' : 'bg-[#dc3545]/10 text-[#dc3545]'}`}>{sm.user.isActive ? 'Active' : 'Inactive'}</span>
              </div>
            </div>
          ))}
          {!loading && managers.length === 0 && <div className="text-center py-12 text-[#94A3B8]"><p className="flex justify-center mb-2"><LuUsers className="w-10 h-10" /></p><p>No state managers yet</p></div>}
        </div>
      </main>
    </div>
  )
}
