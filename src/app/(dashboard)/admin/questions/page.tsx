'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'

interface Question {
  id: string
  text: string
  type: string
  category: string
  difficulty: string
  marks: number
  options: Array<{ id: string; text: string; isCorrect: boolean }>
}

export default function QuestionsPage() {
  const [questions, setQuestions] = useState<Question[]>([])
  const [total, setTotal] = useState(0)
  const [page, setPage] = useState(1)
  const [search, setSearch] = useState('')
  const [filterType, setFilterType] = useState('')
  const [filterDifficulty, setFilterDifficulty] = useState('')
  const [loading, setLoading] = useState(true)

  const loadQuestions = async () => {
    const params = new URLSearchParams({ page: page.toString(), limit: '20' })
    if (search) params.set('search', search)
    if (filterType) params.set('type', filterType)
    if (filterDifficulty) params.set('difficulty', filterDifficulty)

    try {
      const res = await fetch(`/api/questions?${params}`)
      if (res.ok) {
        const data = await res.json()
        setQuestions(data.questions)
        setTotal(data.total)
      }
    } catch {} finally { setLoading(false) }
  }

  useEffect(() => { loadQuestions() }, [page, search, filterType, filterDifficulty])

  const typeColors: Record<string, string> = {
    MULTIPLE_CHOICE: 'bg-blue-50 text-blue-700',
    MULTIPLE_ANSWERS: 'bg-purple-50 text-purple-700',
    TRUE_FALSE: 'bg-green-50 text-green-700',
    SHORT_ANSWER: 'bg-orange-50 text-orange-700',
    SCENARIO: 'bg-red-50 text-red-700',
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 py-4 flex items-center justify-between">
          <div>
            <h1 className="text-lg font-bold text-gray-900">Question Bank</h1>
            <p className="text-xs text-gray-500">{total} questions total</p>
          </div>
          <Link href="/admin" className="text-sm text-gray-500 hover:text-gray-700">← Dashboard</Link>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 py-6">
        {/* Filters */}
        <div className="bg-white rounded-xl border border-gray-100 p-4 mb-4 flex flex-wrap gap-3">
          <input
            type="text"
            value={search}
            onChange={e => { setSearch(e.target.value); setPage(1) }}
            placeholder="Search questions..."
            className="flex-1 min-w-[200px] px-3 py-2 rounded-lg border border-gray-200 text-sm outline-none focus:border-blue-500"
          />
          <select
            value={filterType}
            onChange={e => { setFilterType(e.target.value); setPage(1) }}
            className="px-3 py-2 rounded-lg border border-gray-200 text-sm outline-none focus:border-blue-500"
          >
            <option value="">All Types</option>
            <option value="MULTIPLE_CHOICE">Multiple Choice</option>
            <option value="MULTIPLE_ANSWERS">Multiple Answers</option>
            <option value="TRUE_FALSE">True/False</option>
            <option value="SHORT_ANSWER">Short Answer</option>
            <option value="SCENARIO">Scenario</option>
          </select>
          <select
            value={filterDifficulty}
            onChange={e => { setFilterDifficulty(e.target.value); setPage(1) }}
            className="px-3 py-2 rounded-lg border border-gray-200 text-sm outline-none focus:border-blue-500"
          >
            <option value="">All Difficulties</option>
            <option value="EASY">Easy</option>
            <option value="MEDIUM">Medium</option>
            <option value="HARD">Hard</option>
          </select>
        </div>

        {/* Question List */}
        <div className="space-y-3">
          {questions.map((q, i) => (
            <div key={q.id} className="bg-white rounded-xl border border-gray-100 p-4">
              <div className="flex items-start gap-3">
                <span className="text-xs font-mono text-gray-400 mt-1">{(page - 1) * 20 + i + 1}</span>
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1 flex-wrap">
                    <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${typeColors[q.type] || 'bg-gray-100 text-gray-700'}`}>
                      {q.type.replace(/_/g, ' ')}
                    </span>
                    <span className="text-xs text-gray-400">{q.difficulty} · {q.marks}pt · {q.category}</span>
                  </div>
                  <p className="text-sm text-gray-900">{q.text}</p>
                  {q.options.length > 0 && (
                    <div className="mt-2 flex flex-wrap gap-1">
                      {q.options.map(opt => (
                        <span key={opt.id} className={`text-xs px-2 py-0.5 rounded ${opt.isCorrect ? 'bg-green-50 text-green-700' : 'bg-gray-50 text-gray-500'}`}>
                          {opt.isCorrect ? '✓' : '○'} {opt.text}
                        </span>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Pagination */}
        {total > 20 && (
          <div className="flex items-center justify-center gap-2 mt-6">
            <button onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1} className="px-3 py-1.5 rounded-lg text-sm bg-white border border-gray-200 disabled:opacity-30">← Prev</button>
            <span className="text-sm text-gray-500">Page {page} of {Math.ceil(total / 20)}</span>
            <button onClick={() => setPage(p => p + 1)} disabled={page >= Math.ceil(total / 20)} className="px-3 py-1.5 rounded-lg text-sm bg-white border border-gray-200 disabled:opacity-30">Next →</button>
          </div>
        )}
      </main>
    </div>
  )
}
