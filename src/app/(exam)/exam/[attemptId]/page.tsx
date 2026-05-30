'use client'

import { useEffect, useState } from 'react'
import { useParams } from 'next/navigation'
import ExamInterface from '@/components/exam/ExamInterface'
import { LuXCircle, LuCheckCircle } from 'react-icons/lu'

export default function ExamPage() {
  const params = useParams()
  const attemptId = params.attemptId as string
  const [data, setData] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    async function loadAttempt() {
      try {
        const res = await fetch(`/api/attempts/${attemptId}`)
        if (!res.ok) {
          setError('Failed to load exam')
          setLoading(false)
          return
        }
        const json = await res.json()
        setData(json.attempt)
      } catch {
        setError('Network error')
      } finally {
        setLoading(false)
      }
    }
    loadAttempt()
  }, [attemptId])

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50 flex items-center justify-center">
        <div className="text-center">
          <div className="w-12 h-12 border-4 border-blue-200 border-t-blue-600 rounded-full animate-spin mx-auto mb-4" />
          <p className="text-gray-500 text-sm">Loading exam...</p>
        </div>
      </div>
    )
  }

  if (error || !data) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50 flex items-center justify-center p-4">
        <div className="bg-white rounded-2xl shadow-xl p-8 max-w-md w-full text-center">
          <span className="flex justify-center mb-4"><LuXCircle className="w-10 h-10 text-[#dc3545]" /></span>
          <h2 className="text-xl font-bold text-gray-900 mb-2">Error</h2>
          <p className="text-gray-600">{error || 'Could not load exam'}</p>
          <a href="/dashboard" className="inline-block mt-6 bg-blue-600 text-white px-6 py-3 rounded-xl font-semibold hover:bg-blue-700 transition-colors">
            Back to Dashboard
          </a>
        </div>
      </div>
    )
  }

  if (data.status === 'SUBMITTED') {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50 flex items-center justify-center p-4">
        <div className="bg-white rounded-2xl shadow-xl p-8 max-w-md w-full text-center">
          <span className="flex justify-center mb-4"><LuCheckCircle className="w-10 h-10 text-[#28a745]" /></span>
          <h2 className="text-xl font-bold text-gray-900 mb-2">Already Submitted</h2>
          <p className="text-gray-600">This exam has already been submitted.</p>
          <a href="/dashboard" className="inline-block mt-6 bg-blue-600 text-white px-6 py-3 rounded-xl font-semibold hover:bg-blue-700 transition-colors">
            Back to Dashboard
          </a>
        </div>
      </div>
    )
  }

  return (
    <ExamInterface
      attemptId={attemptId}
      quiz={data.quiz}
      existingAnswers={data.answers || []}
      startedAt={data.startedAt}
      candidateName={data.user?.fullName || 'Candidate'}
    />
  )
}
