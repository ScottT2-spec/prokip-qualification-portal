'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import {
  LuGraduationCap, LuFileText, LuCircleCheck, LuCircleX, LuClock, LuRefreshCw
} from 'react-icons/lu'


interface Quiz {
  id: string; title: string; description: string; duration: number; status: string
  _count: { questions: number }
  attempts: Array<{ id: string; status: string; percentageScore: number | null; passed: boolean | null }>
}
interface User { id: string; fullName: string; email: string; role: string }

export default function AgentDashboard() {
  const router = useRouter()
  const [user, setUser] = useState<User | null>(null)
  const [quizzes, setQuizzes] = useState<Quiz[]>([])
  const [loading, setLoading] = useState(true)
  const [starting, setStarting] = useState<string | null>(null)


  useEffect(() => {
    async function load() {
      try {
        const [userRes, quizRes] = await Promise.all([fetch('/api/auth/me'), fetch('/api/quizzes')])
        if (userRes.ok) {
          const userData = await userRes.json()
          setUser(userData.user)
          if (userData.user.role === 'ADMIN') router.push('/admin')
          if (userData.user.role === 'STATE_MANAGER') router.push('/manager')
        } else { router.push('/login'); return }
        if (quizRes.ok) { const quizData = await quizRes.json(); setQuizzes(quizData.quizzes) }
      } catch { router.push('/login') } finally { setLoading(false) }
    }
    load()
  }, [router])

  const startQuiz = async (quizId: string) => {
    setStarting(quizId)
    try {
      const res = await fetch('/api/attempts', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ quizId }) })
      const data = await res.json()
      if (res.ok) router.push(`/exam/${data.attempt.id}`)
      else alert(data.error || 'Failed to start quiz')
    } catch { alert('Network error') } finally { setStarting(null) }
  }

  const handleLogout = async () => { await fetch('/api/auth/logout', { method: 'POST' }); router.push('/login') }

  if (loading) return <div className="min-h-screen bg-[#F8FAFC] flex items-center justify-center"><div className="w-12 h-12 border-4 border-[#E2E8F0] border-t-[#1B2B4B] rounded-full animate-spin" /></div>

  return (
    <div className="min-h-screen bg-[#F8FAFC]">
      <header className="bg-[#1B2B4B]">
        <div className="max-w-4xl mx-auto px-4 py-4 flex items-center justify-between">
          <div>
            <h1 className="text-lg font-bold text-white flex items-center gap-2"><LuGraduationCap className="w-5 h-5 text-[#F5B731]" /> Prokip Qualification</h1>
            <p className="text-sm text-[#94A3B8]">Welcome, {user?.fullName}</p>
          </div>
          <button onClick={handleLogout} className="text-sm text-[#94A3B8] hover:text-white transition-colors">Sign Out</button>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-4 py-8">
        <h2 className="text-xl font-bold text-[#1B2B4B] mb-6">Available Examinations</h2>
        {quizzes.length === 0 ? (
          <div className="bg-white rounded-[16px] shadow-[0_1px_3px_rgba(0,0,0,0.05)] border border-[#E2E8F0] p-8 text-center">
            <span className="flex justify-center mb-4"><LuFileText className="w-10 h-10 text-[#94A3B8]" /></span>
            <p className="text-[#94A3B8]">No examinations available at the moment.</p>
          </div>
        ) : (
          <div className="space-y-4">
            {quizzes.map(quiz => {
              const lastAttempt = quiz.attempts?.[0]
              const isSubmitted = lastAttempt?.status === 'SUBMITTED'
              const isInProgress = lastAttempt?.status === 'IN_PROGRESS'
              return (
                <div key={quiz.id} className="bg-white rounded-[16px] shadow-[0_1px_3px_rgba(0,0,0,0.05)] border border-[#E2E8F0] p-6 hover:shadow-[0_4px_6px_rgba(0,0,0,0.07)] transition-shadow">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <h3 className="text-lg font-semibold text-[#1B2B4B]">{quiz.title}</h3>
                      {quiz.description && <p className="text-sm text-[#94A3B8] mt-1">{quiz.description}</p>}
                      <div className="flex flex-wrap items-center gap-3 mt-3">
                        <span className="inline-flex items-center gap-1 text-xs text-[#94A3B8] bg-[#F8FAFC] border border-[#E2E8F0] px-2.5 py-1 rounded-lg"><LuClock className="w-3.5 h-3.5" /> {quiz.duration} minutes</span>
                        <span className="inline-flex items-center gap-1 text-xs text-[#94A3B8] bg-[#F8FAFC] border border-[#E2E8F0] px-2.5 py-1 rounded-lg"><LuFileText className="w-3.5 h-3.5" /> {quiz._count.questions} questions</span>
                        {isSubmitted && (
                          <span className={`inline-flex items-center gap-1 text-xs px-2.5 py-1 rounded-lg font-semibold ${
                            lastAttempt.passed ? 'bg-[#28a745]/10 text-[#28a745]' : 'bg-[#dc3545]/10 text-[#dc3545]'
                          }`}>
                            <span className="inline-flex items-center gap-1">{lastAttempt.passed ? <><LuCircleCheck className="w-3.5 h-3.5" /> Passed</> : <><LuCircleX className="w-3.5 h-3.5" /> Failed</>}{lastAttempt.percentageScore !== null && ` (${lastAttempt.percentageScore}%)`}</span>
                          </span>
                        )}
                        {isInProgress && <span className="inline-flex items-center gap-1 text-xs bg-[#FEF3C7] text-[#F5B731] px-2.5 py-1 rounded-lg font-semibold"><LuRefreshCw className="w-3.5 h-3.5" /> In Progress</span>}
                      </div>
                    </div>
                    <div className="ml-4">
                      {isSubmitted ? (
                        <span className="text-sm text-[#94A3B8]">Completed</span>
                      ) : (
                        <button onClick={() => isInProgress ? router.push(`/exam/${lastAttempt.id}`) : startQuiz(quiz.id)} disabled={starting === quiz.id}
                          className="bg-[#0F1C32] text-white px-5 py-2.5 rounded-xl text-sm font-semibold hover:bg-[#1B2B4B] hover:-translate-y-0.5 disabled:opacity-50 transition-all whitespace-nowrap">
                          {starting === quiz.id ? 'Starting...' : isInProgress ? 'Continue' : 'Start Exam'}
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </main>
    </div>
  )
}
