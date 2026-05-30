'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'

interface Question { id: string; text: string; type: string; category: string; difficulty: string; marks: number; options: Array<{ id: string; text: string; isCorrect: boolean }> }

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
    if (search) params.set('search', search); if (filterType) params.set('type', filterType); if (filterDifficulty) params.set('difficulty', filterDifficulty)
    try { const res = await fetch(`/api/questions?${params}`); if (res.ok) { const data = await res.json(); setQuestions(data.questions); setTotal(data.total) } } catch {} finally { setLoading(false) }
  }
  useEffect(() => { loadQuestions() }, [page, search, filterType, filterDifficulty])

  const typeColors: Record<string, string> = { MULTIPLE_CHOICE: 'bg-[#007bff]/10 text-[#007bff]', MULTIPLE_ANSWERS: 'bg-purple-50 text-purple-700', TRUE_FALSE: 'bg-[#28a745]/10 text-[#28a745]', SHORT_ANSWER: 'bg-[#F5B731]/10 text-[#F5B731]', SCENARIO: 'bg-[#dc3545]/10 text-[#dc3545]' }
  const inputClass = "bg-[#F8FAFC] border border-[#E2E8F0] rounded-xl px-3 py-2 text-sm text-[#1B2B4B] outline-none transition-all focus:border-[#1B2B4B] focus:ring-[3px] focus:ring-[#1B2B4B]/10"

  return (
    <div className="min-h-screen bg-[#F8FAFC]">
      <header className="bg-[#1B2B4B]">
        <div className="max-w-7xl mx-auto px-4 py-4 flex items-center justify-between">
          <div><h1 className="text-lg font-bold text-white">Question Bank</h1><p className="text-xs text-[#94A3B8]">{total} questions total</p></div>
          <Link href="/admin" className="text-sm text-[#94A3B8] hover:text-white transition-colors">← Dashboard</Link>
        </div>
      </header>
      <main className="max-w-7xl mx-auto px-4 py-6">
        <div className="bg-white rounded-[16px] border border-[#E2E8F0] shadow-[0_1px_3px_rgba(0,0,0,0.05)] p-4 mb-4 flex flex-wrap gap-3">
          <input type="text" value={search} onChange={e => { setSearch(e.target.value); setPage(1) }} placeholder="Search questions..." className={inputClass + " flex-1 min-w-[200px]"} />
          <select value={filterType} onChange={e => { setFilterType(e.target.value); setPage(1) }} className={inputClass}>
            <option value="">All Types</option><option value="MULTIPLE_CHOICE">Multiple Choice</option><option value="MULTIPLE_ANSWERS">Multiple Answers</option><option value="TRUE_FALSE">True/False</option><option value="SHORT_ANSWER">Short Answer</option><option value="SCENARIO">Scenario</option>
          </select>
          <select value={filterDifficulty} onChange={e => { setFilterDifficulty(e.target.value); setPage(1) }} className={inputClass}>
            <option value="">All Difficulties</option><option value="EASY">Easy</option><option value="MEDIUM">Medium</option><option value="HARD">Hard</option>
          </select>
        </div>
        <div className="space-y-3">
          {questions.map((q, i) => (
            <div key={q.id} className="bg-white rounded-[16px] border border-[#E2E8F0] shadow-[0_1px_3px_rgba(0,0,0,0.05)] p-4">
              <div className="flex items-start gap-3">
                <span className="text-xs font-mono text-[#94A3B8] mt-1">{(page - 1) * 20 + i + 1}</span>
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1 flex-wrap">
                    <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${typeColors[q.type] || 'bg-[#E2E8F0] text-[#94A3B8]'}`}>{q.type.replace(/_/g, ' ')}</span>
                    <span className="text-xs text-[#94A3B8]">{q.difficulty} · {q.marks}pt · {q.category}</span>
                  </div>
                  <p className="text-sm text-[#1B2B4B]">{q.text}</p>
                  {q.options.length > 0 && <div className="mt-2 flex flex-wrap gap-1">{q.options.map(opt => (<span key={opt.id} className={`text-xs px-2 py-0.5 rounded ${opt.isCorrect ? 'bg-[#28a745]/10 text-[#28a745]' : 'bg-[#F8FAFC] text-[#94A3B8]'}`}>{opt.isCorrect ? '✓' : '○'} {opt.text}</span>))}</div>}
                </div>
              </div>
            </div>
          ))}
        </div>
        {total > 20 && (
          <div className="flex items-center justify-center gap-2 mt-6">
            <button onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1} className="px-3 py-1.5 rounded-lg text-sm bg-white border border-[#E2E8F0] text-[#1B2B4B] disabled:opacity-30">← Prev</button>
            <span className="text-sm text-[#94A3B8]">Page {page} of {Math.ceil(total / 20)}</span>
            <button onClick={() => setPage(p => p + 1)} disabled={page >= Math.ceil(total / 20)} className="px-3 py-1.5 rounded-lg text-sm bg-white border border-[#E2E8F0] text-[#1B2B4B] disabled:opacity-30">Next →</button>
          </div>
        )}
      </main>
    </div>
  )
}
