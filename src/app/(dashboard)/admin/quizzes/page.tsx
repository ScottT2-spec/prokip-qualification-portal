'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'

interface Quiz {
  id: string
  title: string
  description: string
  status: string
  duration: number
  passMark: number
  maxAttempts: number
  createdAt: string
  _count: { questions: number; attempts: number }
}

export default function QuizzesPage() {
  const router = useRouter()
  const [quizzes, setQuizzes] = useState<Quiz[]>([])
  const [loading, setLoading] = useState(true)
  const [showCreate, setShowCreate] = useState(false)
  const [form, setForm] = useState({
    title: '',
    description: '',
    duration: 30,
    passMark: 70,
    maxAttempts: 1,
    randomizeQuestions: false,
    randomizeOptions: false,
    allowBackNavigation: true,
    showResultToAgent: true,
    showScoreOnly: true,
  })
  const [saving, setSaving] = useState(false)

  const loadQuizzes = async () => {
    try {
      const res = await fetch('/api/quizzes')
      if (res.ok) {
        const data = await res.json()
        setQuizzes(data.quizzes)
      }
    } catch {} finally { setLoading(false) }
  }

  useEffect(() => { loadQuizzes() }, [])

  const createQuiz = async (e: React.FormEvent) => {
    e.preventDefault()
    setSaving(true)
    try {
      const res = await fetch('/api/quizzes', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      })
      if (res.ok) {
        setShowCreate(false)
        setForm({ title: '', description: '', duration: 30, passMark: 70, maxAttempts: 1, randomizeQuestions: false, randomizeOptions: false, allowBackNavigation: true, showResultToAgent: true, showScoreOnly: true })
        loadQuizzes()
      }
    } catch {} finally { setSaving(false) }
  }

  const updateStatus = async (id: string, status: string) => {
    await fetch(`/api/quizzes/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status }),
    })
    loadQuizzes()
  }

  const statusColors: Record<string, string> = {
    DRAFT: 'bg-gray-100 text-gray-700',
    PUBLISHED: 'bg-green-100 text-green-700',
    CLOSED: 'bg-red-100 text-red-700',
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 py-4 flex items-center justify-between">
          <div>
            <h1 className="text-lg font-bold text-gray-900">Quiz Management</h1>
            <p className="text-xs text-gray-500">Create and manage examinations</p>
          </div>
          <div className="flex items-center gap-2">
            <Link href="/admin" className="text-sm text-gray-500 hover:text-gray-700">← Dashboard</Link>
            <button
              onClick={() => setShowCreate(!showCreate)}
              className="bg-blue-600 text-white px-4 py-2 rounded-xl text-sm font-semibold hover:bg-blue-700 transition-colors"
            >
              + New Quiz
            </button>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 py-6">
        {/* Create Quiz Form */}
        {showCreate && (
          <div className="bg-white rounded-xl border border-gray-100 p-6 mb-6">
            <h3 className="font-semibold text-gray-900 mb-4">Create New Quiz</h3>
            <form onSubmit={createQuiz} className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Title</label>
                  <input type="text" value={form.title} onChange={e => setForm(p => ({...p, title: e.target.value}))} required className="w-full px-4 py-2.5 rounded-xl border border-gray-200 text-sm outline-none focus:border-blue-500" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Duration (minutes)</label>
                  <input type="number" value={form.duration} onChange={e => setForm(p => ({...p, duration: parseInt(e.target.value)}))} min={1} className="w-full px-4 py-2.5 rounded-xl border border-gray-200 text-sm outline-none focus:border-blue-500" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Pass Mark (%)</label>
                  <input type="number" value={form.passMark} onChange={e => setForm(p => ({...p, passMark: parseInt(e.target.value)}))} min={1} max={100} className="w-full px-4 py-2.5 rounded-xl border border-gray-200 text-sm outline-none focus:border-blue-500" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Max Attempts</label>
                  <input type="number" value={form.maxAttempts} onChange={e => setForm(p => ({...p, maxAttempts: parseInt(e.target.value)}))} min={1} className="w-full px-4 py-2.5 rounded-xl border border-gray-200 text-sm outline-none focus:border-blue-500" />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
                <textarea value={form.description} onChange={e => setForm(p => ({...p, description: e.target.value}))} rows={2} className="w-full px-4 py-2.5 rounded-xl border border-gray-200 text-sm outline-none focus:border-blue-500 resize-none" />
              </div>
              <div className="flex flex-wrap gap-4">
                {[
                  { key: 'randomizeQuestions', label: 'Randomize Questions' },
                  { key: 'randomizeOptions', label: 'Randomize Options' },
                  { key: 'allowBackNavigation', label: 'Allow Back Navigation' },
                  { key: 'showResultToAgent', label: 'Show Result to Agent' },
                ].map(opt => (
                  <label key={opt.key} className="flex items-center gap-2 text-sm text-gray-700">
                    <input type="checkbox" checked={(form as any)[opt.key]} onChange={e => setForm(p => ({...p, [opt.key]: e.target.checked}))} className="rounded" />
                    {opt.label}
                  </label>
                ))}
              </div>
              <div className="flex gap-2">
                <button type="submit" disabled={saving} className="bg-blue-600 text-white px-6 py-2.5 rounded-xl text-sm font-semibold hover:bg-blue-700 disabled:opacity-50 transition-colors">
                  {saving ? 'Creating...' : 'Create Quiz'}
                </button>
                <button type="button" onClick={() => setShowCreate(false)} className="px-6 py-2.5 rounded-xl text-sm text-gray-600 bg-gray-100 hover:bg-gray-200 transition-colors">
                  Cancel
                </button>
              </div>
            </form>
          </div>
        )}

        {/* Quiz list */}
        <div className="space-y-3">
          {quizzes.map(quiz => (
            <div key={quiz.id} className="bg-white rounded-xl border border-gray-100 p-5">
              <div className="flex items-start justify-between">
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <h3 className="font-semibold text-gray-900">{quiz.title}</h3>
                    <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${statusColors[quiz.status]}`}>{quiz.status}</span>
                  </div>
                  <p className="text-sm text-gray-500">{quiz.description}</p>
                  <div className="flex gap-3 mt-2 text-xs text-gray-400">
                    <span>⏱ {quiz.duration}min</span>
                    <span>📝 {quiz._count.questions} questions</span>
                    <span>👥 {quiz._count.attempts} attempts</span>
                    <span>🎯 Pass: {quiz.passMark}%</span>
                  </div>
                </div>
                <div className="flex gap-2">
                  <Link href={`/admin/quizzes/${quiz.id}`} className="text-sm text-blue-600 hover:underline">Manage</Link>
                  {quiz.status === 'DRAFT' && (
                    <button onClick={() => updateStatus(quiz.id, 'PUBLISHED')} className="text-sm text-green-600 hover:underline">Publish</button>
                  )}
                  {quiz.status === 'PUBLISHED' && (
                    <button onClick={() => updateStatus(quiz.id, 'CLOSED')} className="text-sm text-red-600 hover:underline">Close</button>
                  )}
                </div>
              </div>
            </div>
          ))}
          {!loading && quizzes.length === 0 && (
            <div className="text-center py-12 text-gray-400">
              <p className="text-4xl mb-2">📝</p>
              <p>No quizzes yet. Create your first one!</p>
            </div>
          )}
        </div>
      </main>
    </div>
  )
}
