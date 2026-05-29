'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'

export default function StateManagersPage() {
  const [managers, setManagers] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [showCreate, setShowCreate] = useState(false)
  const [form, setForm] = useState({
    fullName: '', email: '', phone: '', password: '',
    states: [{ name: '', country: 'Nigeria' }],
  })
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  const loadManagers = async () => {
    try {
      const res = await fetch('/api/state-managers')
      if (res.ok) {
        const data = await res.json()
        setManagers(data.managers)
      }
    } catch {} finally { setLoading(false) }
  }

  useEffect(() => { loadManagers() }, [])

  const createManager = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setSaving(true)
    try {
      const res = await fetch('/api/state-managers', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      })
      const data = await res.json()
      if (!res.ok) {
        setError(data.error)
        setSaving(false)
        return
      }
      setShowCreate(false)
      setForm({ fullName: '', email: '', phone: '', password: '', states: [{ name: '', country: 'Nigeria' }] })
      loadManagers()
    } catch { setError('Network error') } finally { setSaving(false) }
  }

  const addState = () => {
    setForm(p => ({ ...p, states: [...p.states, { name: '', country: 'Nigeria' }] }))
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 py-4 flex items-center justify-between">
          <div>
            <h1 className="text-lg font-bold text-gray-900">State Managers</h1>
            <p className="text-xs text-gray-500">Manage regional managers</p>
          </div>
          <div className="flex items-center gap-2">
            <Link href="/admin" className="text-sm text-gray-500 hover:text-gray-700">← Dashboard</Link>
            <button onClick={() => setShowCreate(!showCreate)} className="bg-blue-600 text-white px-4 py-2 rounded-xl text-sm font-semibold hover:bg-blue-700">
              + Add Manager
            </button>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 py-6">
        {showCreate && (
          <div className="bg-white rounded-xl border border-gray-100 p-6 mb-6">
            <h3 className="font-semibold text-gray-900 mb-4">Add State Manager</h3>
            {error && <div className="bg-red-50 text-red-700 text-sm rounded-xl p-3 mb-4">{error}</div>}
            <form onSubmit={createManager} className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Full Name</label>
                  <input type="text" value={form.fullName} onChange={e => setForm(p => ({...p, fullName: e.target.value}))} required className="w-full px-3 py-2.5 rounded-xl border border-gray-200 text-sm outline-none focus:border-blue-500" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
                  <input type="email" value={form.email} onChange={e => setForm(p => ({...p, email: e.target.value}))} required className="w-full px-3 py-2.5 rounded-xl border border-gray-200 text-sm outline-none focus:border-blue-500" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Phone</label>
                  <input type="tel" value={form.phone} onChange={e => setForm(p => ({...p, phone: e.target.value}))} required className="w-full px-3 py-2.5 rounded-xl border border-gray-200 text-sm outline-none focus:border-blue-500" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Password</label>
                  <input type="password" value={form.password} onChange={e => setForm(p => ({...p, password: e.target.value}))} required className="w-full px-3 py-2.5 rounded-xl border border-gray-200 text-sm outline-none focus:border-blue-500" />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Assigned States</label>
                {form.states.map((s, i) => (
                  <div key={i} className="flex gap-2 mb-2">
                    <input type="text" value={s.name} onChange={e => {
                      const states = [...form.states]
                      states[i] = { ...states[i], name: e.target.value }
                      setForm(p => ({ ...p, states }))
                    }} placeholder="State name" required className="flex-1 px-3 py-2 rounded-lg border border-gray-200 text-sm outline-none focus:border-blue-500" />
                    <select value={s.country} onChange={e => {
                      const states = [...form.states]
                      states[i] = { ...states[i], country: e.target.value }
                      setForm(p => ({ ...p, states }))
                    }} className="px-3 py-2 rounded-lg border border-gray-200 text-sm outline-none focus:border-blue-500">
                      <option value="Nigeria">Nigeria</option>
                      <option value="Ghana">Ghana</option>
                      <option value="Kenya">Kenya</option>
                      <option value="South Africa">South Africa</option>
                    </select>
                  </div>
                ))}
                <button type="button" onClick={addState} className="text-sm text-blue-600 hover:underline">+ Add State</button>
              </div>

              <div className="flex gap-2">
                <button type="submit" disabled={saving} className="bg-blue-600 text-white px-6 py-2.5 rounded-xl text-sm font-semibold hover:bg-blue-700 disabled:opacity-50">{saving ? 'Creating...' : 'Create Manager'}</button>
                <button type="button" onClick={() => setShowCreate(false)} className="px-6 py-2.5 rounded-xl text-sm text-gray-600 bg-gray-100 hover:bg-gray-200">Cancel</button>
              </div>
            </form>
          </div>
        )}

        <div className="space-y-3">
          {managers.map(sm => (
            <div key={sm.id} className="bg-white rounded-xl border border-gray-100 p-5">
              <div className="flex items-start justify-between">
                <div>
                  <h3 className="font-semibold text-gray-900">{sm.user.fullName}</h3>
                  <p className="text-sm text-gray-500">{sm.user.email} · {sm.user.phone}</p>
                  <div className="flex gap-2 mt-2">
                    {sm.states.map((s: any) => (
                      <span key={s.id} className="text-xs bg-blue-50 text-blue-700 px-2 py-0.5 rounded-full font-medium">
                        {s.name}, {s.country}
                      </span>
                    ))}
                  </div>
                </div>
                <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${sm.user.isActive ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                  {sm.user.isActive ? 'Active' : 'Inactive'}
                </span>
              </div>
            </div>
          ))}
          {!loading && managers.length === 0 && (
            <div className="text-center py-12 text-gray-400">
              <p className="text-4xl mb-2">👥</p>
              <p>No state managers yet</p>
            </div>
          )}
        </div>
      </main>
    </div>
  )
}
