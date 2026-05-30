'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { LuGraduationCap } from 'react-icons/lu'

export default function LoginPage() {
  const router = useRouter()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setLoading(true)

    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      })

      const data = await res.json()
      if (!res.ok) {
        setError(data.error || 'Login failed')
        setLoading(false)
        return
      }

      switch (data.user.role) {
        case 'ADMIN': router.push('/admin'); break
        case 'STATE_MANAGER': router.push('/manager'); break
        default: router.push('/dashboard')
      }
    } catch {
      setError('Network error. Please try again.')
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-[#0F1C32] flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        {/* Logo */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-[#F5B731]/15 rounded-2xl mb-4">
            <LuGraduationCap className="w-8 h-8 text-[#F5B731]" />
          </div>
          <h1 className="text-2xl font-bold text-white">Prokip Qualification</h1>
          <p className="text-[#94A3B8] text-sm mt-1">Agent Examination Portal</p>
        </div>

        {/* Login Card */}
        <div className="bg-white rounded-[24px] shadow-[0_25px_50px_rgba(0,0,0,0.15)] p-8">
          <h2 className="text-xl font-bold text-[#1B2B4B] mb-6">Sign In</h2>

          {error && (
            <div className="bg-red-50 border border-red-100 text-red-700 text-sm rounded-xl p-3 mb-4">
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="text-xs font-semibold tracking-wider uppercase text-[#1B2B4B] mb-2 block">Email</label>
              <input
                type="email"
                value={email}
                onChange={e => setEmail(e.target.value)}
                required
                className="w-full bg-[#F8FAFC] border border-[#E2E8F0] rounded-xl px-4 py-3 text-[15px] text-[#1B2B4B] outline-none transition-all focus:border-[#1B2B4B] focus:ring-[3px] focus:ring-[#1B2B4B]/10"
                placeholder="you@example.com"
              />
            </div>
            <div>
              <label className="text-xs font-semibold tracking-wider uppercase text-[#1B2B4B] mb-2 block">Password</label>
              <input
                type="password"
                value={password}
                onChange={e => setPassword(e.target.value)}
                required
                className="w-full bg-[#F8FAFC] border border-[#E2E8F0] rounded-xl px-4 py-3 text-[15px] text-[#1B2B4B] outline-none transition-all focus:border-[#1B2B4B] focus:ring-[3px] focus:ring-[#1B2B4B]/10"
                placeholder="••••••••"
              />
            </div>
            <button
              type="submit"
              disabled={loading}
              className="w-full bg-[#0F1C32] text-white py-3 rounded-xl font-semibold text-[15px] hover:bg-[#1B2B4B] hover:-translate-y-0.5 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:translate-y-0 transition-all"
            >
              {loading ? 'Signing in...' : 'Sign In'}
            </button>
          </form>
        </div>
      </div>
    </div>
  )
}
