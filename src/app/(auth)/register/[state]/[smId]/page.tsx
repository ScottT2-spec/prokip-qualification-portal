'use client'

import { useState } from 'react'
import { useRouter, useParams } from 'next/navigation'
import {
  LuGraduationCap, LuMapPin
} from 'react-icons/lu'
import ExamIntegrityNotice from '@/components/ExamIntegrityNotice'

export default function RegisterPage() {
  const router = useRouter()
  const params = useParams()
  const state = decodeURIComponent(params.state as string)
  const smId = params.smId as string
  const referralCode = `${state}/${smId}`

  const [showNotice, setShowNotice] = useState(true)
  const [form, setForm] = useState({
    fullName: '',
    email: '',
    phone: '',
    password: '',
    confirmPassword: '',
    country: '',
    state: state.charAt(0).toUpperCase() + state.slice(1),
  })
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    setForm(prev => ({ ...prev, [e.target.name]: e.target.value }))
  }

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

    setLoading(true)
    try {
      const res = await fetch('/api/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          fullName: form.fullName, email: form.email, phone: form.phone,
          password: form.password, country: form.country, state: form.state,
          referralCode,
        }),
      })
      const data = await res.json()
      if (!res.ok) { setError(data.error || 'Registration failed'); setLoading(false); return }
      router.push('/dashboard')
    } catch {
      setError('Network error. Please try again.')
      setLoading(false)
    }
  }

  const inputClass = "w-full bg-[#F8FAFC] border border-[#E2E8F0] rounded-xl px-4 py-3 text-[15px] text-[#1B2B4B] outline-none transition-all focus:border-[#1B2B4B] focus:ring-[3px] focus:ring-[#1B2B4B]/10"
  const labelClass = "text-xs font-semibold tracking-wider uppercase text-[#1B2B4B] mb-2 block"

  if (showNotice) {
    return (
      <div className="min-h-screen bg-[#0F1C32] flex items-center justify-center p-4">
        <ExamIntegrityNotice onAccept={() => setShowNotice(false)} buttonLabel="Proceed to Registration" />
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-[#0F1C32] flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-6">
          <div className="inline-flex items-center justify-center w-14 h-14 bg-[#F5B731]/15 rounded-2xl mb-3">
            <LuGraduationCap className="w-7 h-7 text-[#F5B731]" />
          </div>
          <h1 className="text-xl font-bold text-white">Prokip Agent Registration</h1>
          <p className="text-[#94A3B8] text-sm mt-1">Register to take the qualification exam</p>
        </div>

        <div className="bg-white rounded-[24px] shadow-[0_25px_50px_rgba(0,0,0,0.15)] p-6 sm:p-8">
          {/* Referral badge */}
          <div className="bg-[#FEF3C7] rounded-xl p-3 mb-6 flex items-center gap-2">
            <LuMapPin className="w-4 h-4 text-[#F5B731] flex-shrink-0" />
            <span className="text-sm text-[#1B2B4B]">
              Registering for <strong>{form.state}</strong> via referral
            </span>
          </div>

          {error && (
            <div className="bg-red-50 border border-red-100 text-red-700 text-sm rounded-xl p-3 mb-4">{error}</div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className={labelClass}>Full Name</label>
              <input type="text" name="fullName" value={form.fullName} onChange={handleChange} required className={inputClass} placeholder="John Doe" />
            </div>
            <div>
              <label className={labelClass}>Email Address</label>
              <input type="email" name="email" value={form.email} onChange={handleChange} required className={inputClass} placeholder="you@example.com" />
            </div>
            <div>
              <label className={labelClass}>Phone Number</label>
              <input type="tel" name="phone" value={form.phone} onChange={handleChange} required className={inputClass} placeholder="+234 800 000 0000" />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className={labelClass}>Country</label>
                <select name="country" value={form.country} onChange={handleChange} required className={inputClass}>
                  <option value="">Select</option>
                  <option value="Nigeria">Nigeria</option>
                  <option value="Ghana">Ghana</option>
                  <option value="Kenya">Kenya</option>
                  <option value="South Africa">South Africa</option>
                  <option value="Tanzania">Tanzania</option>
                  <option value="Uganda">Uganda</option>
                  <option value="Rwanda">Rwanda</option>
                  <option value="Other">Other</option>
                </select>
              </div>
              <div>
                <label className={labelClass}>State / Region</label>
                <input type="text" name="state" value={form.state} onChange={handleChange} required className={inputClass} />
              </div>
            </div>
            <div>
              <label className={labelClass}>Password</label>
              <input type="password" name="password" value={form.password} onChange={handleChange} required minLength={6} className={inputClass} placeholder="Min 6 characters" />
            </div>
            <div>
              <label className={labelClass}>Confirm Password</label>
              <input type="password" name="confirmPassword" value={form.confirmPassword} onChange={handleChange} required className={inputClass} placeholder="••••••••" />
            </div>
            <button type="submit" disabled={loading} className="w-full bg-[#0F1C32] text-white py-3 rounded-xl font-semibold text-[15px] hover:bg-[#1B2B4B] hover:-translate-y-0.5 disabled:opacity-50 disabled:cursor-not-allowed transition-all">
              {loading ? 'Registering...' : 'Register & Start Exam'}
            </button>
          </form>

          <p className="text-center text-xs text-[#94A3B8] mt-4">
            Already registered? <a href="/login" className="text-[#F5B731] font-semibold hover:underline">Sign in</a>
          </p>
        </div>
      </div>
    </div>
  )
}
