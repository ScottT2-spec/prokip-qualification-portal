'use client'

import { useEffect, useState } from 'react'
import { useRouter, useParams } from 'next/navigation'
import { LuGraduationCap, LuCircleCheck, LuCircleX } from 'react-icons/lu'

export default function SmRegisterPage() {
  const router = useRouter()
  const params = useParams()
  const code = params.code as string

  const [inviteValid, setInviteValid] = useState<boolean | null>(null)
  const [inviteError, setInviteError] = useState('')
  const [states, setStates] = useState<{ name: string; country: string }[]>([])
  const [form, setForm] = useState({ fullName: '', email: '', phone: '', password: '', confirmPassword: '' })
  const [error, setError] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [success, setSuccess] = useState(false)

  useEffect(() => {
    async function validate() {
      try {
        const res = await fetch(`/api/sm-invites/${code}`)
        const data = await res.json()
        if (res.ok && data.valid) {
          setInviteValid(true)
          setStates(data.states)
        } else {
          setInviteValid(false)
          setInviteError(data.error || 'Invalid invitation link')
        }
      } catch {
        setInviteValid(false)
        setInviteError('Failed to validate invitation link')
      }
    }
    validate()
  }, [code])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')

    if (form.password !== form.confirmPassword) {
      setError('Passwords do not match')
      return
    }
    if (form.password.length < 6) {
      setError('Password must be at least 6 characters')
      return
    }

    setSubmitting(true)
    try {
      const res = await fetch(`/api/sm-invites/${code}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          fullName: form.fullName,
          email: form.email,
          phone: form.phone,
          password: form.password,
        }),
      })
      const data = await res.json()

      if (!res.ok) {
        setError(data.error || 'Registration failed')
        setSubmitting(false)
        return
      }

      setSuccess(true)
      setTimeout(() => router.push('/manager'), 2000)
    } catch {
      setError('Network error. Please try again.')
    } finally {
      setSubmitting(false)
    }
  }

  const inputClass = "w-full bg-[#F8FAFC] border border-[#E2E8F0] rounded-xl px-3 py-2.5 text-sm text-[#1B2B4B] outline-none transition-all focus:border-[#1B2B4B] focus:ring-[3px] focus:ring-[#1B2B4B]/10"

  // Loading
  if (inviteValid === null) {
    return (
      <div className="min-h-screen bg-[#F8FAFC] flex items-center justify-center">
        <div className="w-12 h-12 border-4 border-[#E2E8F0] border-t-[#1B2B4B] rounded-full animate-spin" />
      </div>
    )
  }

  // Invalid invite
  if (!inviteValid) {
    return (
      <div className="min-h-screen bg-[#F8FAFC] flex items-center justify-center px-4">
        <div className="bg-white rounded-[20px] border border-[#E2E8F0] shadow-[0_4px_24px_rgba(0,0,0,0.08)] p-8 max-w-md w-full text-center">
          <LuCircleX className="w-16 h-16 text-[#dc3545] mx-auto mb-4" />
          <h1 className="text-xl font-bold text-[#1B2B4B] mb-2">Invalid Invitation</h1>
          <p className="text-sm text-[#94A3B8] mb-6">{inviteError}</p>
          <button onClick={() => router.push('/login')} className="bg-[#1B2B4B] text-white px-6 py-2.5 rounded-xl text-sm font-semibold hover:bg-[#0F1C32] transition-all">
            Go to Login
          </button>
        </div>
      </div>
    )
  }

  // Success
  if (success) {
    return (
      <div className="min-h-screen bg-[#F8FAFC] flex items-center justify-center px-4">
        <div className="bg-white rounded-[20px] border border-[#E2E8F0] shadow-[0_4px_24px_rgba(0,0,0,0.08)] p-8 max-w-md w-full text-center">
          <LuCircleCheck className="w-16 h-16 text-[#28a745] mx-auto mb-4" />
          <h1 className="text-xl font-bold text-[#1B2B4B] mb-2">Registration Successful!</h1>
          <p className="text-sm text-[#94A3B8]">Redirecting to your dashboard...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-[#F8FAFC] flex items-center justify-center px-4 py-8">
      <div className="bg-white rounded-[20px] border border-[#E2E8F0] shadow-[0_4px_24px_rgba(0,0,0,0.08)] p-6 sm:p-8 max-w-md w-full">
        <div className="text-center mb-6">
          <LuGraduationCap className="w-10 h-10 text-[#F5B731] mx-auto mb-3" />
          <h1 className="text-xl font-bold text-[#1B2B4B]">State Manager Registration</h1>
          <p className="text-sm text-[#94A3B8] mt-1">Complete your registration to manage agents</p>
        </div>

        {/* Assigned States */}
        <div className="bg-[#F8FAFC] rounded-xl border border-[#E2E8F0] p-4 mb-6">
          <p className="text-xs font-semibold tracking-wider uppercase text-[#94A3B8] mb-2">Assigned States</p>
          <div className="flex flex-wrap gap-2">
            {states.map((s, i) => (
              <span key={i} className="inline-flex items-center gap-1 bg-[#F5B731]/10 text-[#1B2B4B] text-sm font-semibold px-3 py-1 rounded-full">
                <LuCircleCheck className="w-3.5 h-3.5 text-[#28a745]" />
                {s.name}, {s.country}
              </span>
            ))}
          </div>
        </div>

        {error && <div className="bg-[#dc3545]/10 text-[#dc3545] text-sm rounded-xl p-3 mb-4">{error}</div>}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="text-xs font-semibold tracking-wider uppercase text-[#1B2B4B] mb-1 block">Full Name</label>
            <input type="text" value={form.fullName} onChange={e => setForm(p => ({ ...p, fullName: e.target.value }))} required placeholder="Enter your full name" className={inputClass} />
          </div>
          <div>
            <label className="text-xs font-semibold tracking-wider uppercase text-[#1B2B4B] mb-1 block">Email Address</label>
            <input type="email" value={form.email} onChange={e => setForm(p => ({ ...p, email: e.target.value }))} required placeholder="you@example.com" className={inputClass} />
          </div>
          <div>
            <label className="text-xs font-semibold tracking-wider uppercase text-[#1B2B4B] mb-1 block">WhatsApp Number</label>
            <input type="tel" value={form.phone} onChange={e => setForm(p => ({ ...p, phone: e.target.value }))} required placeholder="+234 xxx xxxx xxx" className={inputClass} />
          </div>
          <div>
            <label className="text-xs font-semibold tracking-wider uppercase text-[#1B2B4B] mb-1 block">Password</label>
            <input type="password" value={form.password} onChange={e => setForm(p => ({ ...p, password: e.target.value }))} required placeholder="Min. 6 characters" className={inputClass} />
          </div>
          <div>
            <label className="text-xs font-semibold tracking-wider uppercase text-[#1B2B4B] mb-1 block">Confirm Password</label>
            <input type="password" value={form.confirmPassword} onChange={e => setForm(p => ({ ...p, confirmPassword: e.target.value }))} required placeholder="Re-enter password" className={inputClass} />
          </div>
          <button type="submit" disabled={submitting} className="w-full bg-[#1B2B4B] text-white py-3 rounded-xl text-sm font-semibold hover:bg-[#0F1C32] disabled:opacity-50 transition-all">
            {submitting ? 'Registering...' : 'Complete Registration'}
          </button>
        </form>

        <p className="text-center text-xs text-[#94A3B8] mt-4">
          Already registered? <a href="/login" className="text-[#F5B731] font-semibold hover:underline">Sign in</a>
        </p>
      </div>
    </div>
  )
}
