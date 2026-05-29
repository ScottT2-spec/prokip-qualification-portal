'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'

interface Quiz {
  id: string
  title: string
  description: string
  duration: number
  status: string
  _count: { questions: number }
  attempts: Array<{
    id: string
    status: string
    percentageScore: number | null
    passed: boolean | null
  }>
}

interface User {
  id: string
  fullName: string
  email: string
  role: string
}

export default function AgentDashboard() {
  const router = useRouter()
  const [user, setUser] = useState<User | null>(null)
  const [quizzes, setQuizzes] = useState<Quiz[]>([])
  const [loading, setLoading] = useState(true)
  const [starting, setStarting] = useState<string | null>(null)

  useEffect(() => {
    async function load() {
      try {
        const [userRes, quizRes] = await Promise.all([
          fetch('/api/auth/me'),
          fetch('/api/quizzes'),
        ])
        if (userRes.ok) {
          const userData = await userRes.json()
          setUser(userData.user)
          // Redirect non-agents
          if (userData.user.role === 'ADMIN') router.push('/admin')
          if (userData.user.role === 'STATE_MANAGER') router.push('/manager')
        } else {
          router.push('/login')
          return
        }
        if (quizRes.ok) {
          const quizData = await quizRes.json()
          setQuizzes(quizData.quizzes)
        }
      } catch {
        router.push('/login')
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [router])

  const startQuiz = async (quizId: string) => {
    setStarting(quizId)
    try {
      const res = await fetch('/api/attempts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ quizId }),
      })
      const data = await res.json()
      if (res.ok) {
        router.push(`/exam/${data.attempt.id}`)
      } else {
        alert(data.error || 'Failed to start quiz')
      }
    } catch {
      alert('Network error')
    } finally {
      setStarting(null)
    }
  }

  const handleLogout = async () => {
    await fetch('/api/auth/logout', { method: 'POST' })
    router.push('/login')
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50 flex items-center justify-center">
        <div className="w-12 h-12 border-4 border-blue-200 border-t-blue-600 rounded-full animate-spin" />
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50">
      {/* Header */}
      <header className="bg-white border-b border-gray-200">
        <div className="max-w-4xl mx-auto px-4 py-4 flex items-center justify-between">
          <div>
            <h1 className="text-lg font-bold text-gray-900">🎓 Prokip Qualification</h1>
            <p className="text-sm text-gray-500">Welcome, {user?.fullName}</p>
          </div>
          <button
            onClick={handleLogout}
            className="text-sm text-gray-500 hover:text-gray-700 transition-colors"
          >
            Sign Out
          </button>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-4 py-8">
        <h2 className="text-xl font-bold text-gray-900 mb-6">Available Examinations</h2>

        {quizzes.length === 0 ? (
          <div className="bg-white rounded-2xl shadow-sm p-8 text-center">
            <span className="text-4xl mb-4 block">📝</span>
            <p className="text-gray-500">No examinations available at the moment.</p>
          </div>
        ) : (
          <div className="space-y-4">
            {quizzes.map(quiz => {
              const lastAttempt = quiz.attempts?.[0]
              const isSubmitted = lastAttempt?.status === 'SUBMITTED'
              const isInProgress = lastAttempt?.status === 'IN_PROGRESS'

              return (
                <div key={quiz.id} className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <h3 className="text-lg font-semibold text-gray-900">{quiz.title}</h3>
                      {quiz.description && (
                        <p className="text-sm text-gray-500 mt-1">{quiz.description}</p>
                      )}
                      <div className="flex flex-wrap items-center gap-3 mt-3">
                        <span className="inline-flex items-center gap-1 text-xs text-gray-500 bg-gray-50 px-2.5 py-1 rounded-lg">
                          ⏱ {quiz.duration} minutes
                        </span>
                        <span className="inline-flex items-center gap-1 text-xs text-gray-500 bg-gray-50 px-2.5 py-1 rounded-lg">
                          📝 {quiz._count.questions} questions
                        </span>
                        {isSubmitted && (
                          <span className={`inline-flex items-center gap-1 text-xs px-2.5 py-1 rounded-lg font-semibold ${
                            lastAttempt.passed
                              ? 'bg-green-100 text-green-700'
                              : 'bg-red-100 text-red-700'
                          }`}>
                            {lastAttempt.passed ? '✅ Passed' : '❌ Failed'}
                            {lastAttempt.percentageScore !== null && ` (${lastAttempt.percentageScore}%)`}
                          </span>
                        )}
                        {isInProgress && (
                          <span className="inline-flex items-center gap-1 text-xs bg-yellow-100 text-yellow-700 px-2.5 py-1 rounded-lg font-semibold">
                            🔄 In Progress
                          </span>
                        )}
                      </div>
                    </div>
                    <div className="ml-4">
                      {isSubmitted ? (
                        <span className="text-sm text-gray-400">Completed</span>
                      ) : (
                        <button
                          onClick={() => isInProgress ? router.push(`/exam/${lastAttempt.id}`) : startQuiz(quiz.id)}
                          disabled={starting === quiz.id}
                          className="bg-blue-600 text-white px-5 py-2.5 rounded-xl text-sm font-semibold hover:bg-blue-700 disabled:opacity-50 transition-colors whitespace-nowrap"
                        >
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
