'use client'

import { useEffect, useState, useRef } from 'react'
import Link from 'next/link'
import { LuUpload, LuX, LuPlus, LuTrash2, LuCircleCheck, LuCircleAlert } from 'react-icons/lu'

interface Question { id: string; text: string; type: string; category: string; difficulty: string; marks: number; options: Array<{ id: string; text: string; isCorrect: boolean }> }

interface BulkQuestion {
  text: string; type: string; category: string; difficulty: string; marks: number; explanation: string
  options: Array<{ text: string; isCorrect: boolean }>
}

const emptyQuestion = (): BulkQuestion => ({
  text: '', type: 'MULTIPLE_CHOICE', category: '', difficulty: 'MEDIUM', marks: 1, explanation: '',
  options: [{ text: '', isCorrect: true }, { text: '', isCorrect: false }, { text: '', isCorrect: false }, { text: '', isCorrect: false }],
})

export default function QuestionsPage() {
  const [questions, setQuestions] = useState<Question[]>([])
  const [total, setTotal] = useState(0)
  const [page, setPage] = useState(1)
  const [search, setSearch] = useState('')
  const [filterType, setFilterType] = useState('')
  const [filterDifficulty, setFilterDifficulty] = useState('')
  const [loading, setLoading] = useState(true)
  const [showBulk, setShowBulk] = useState(false)
  const [bulkQuestions, setBulkQuestions] = useState<BulkQuestion[]>([emptyQuestion()])
  const [bulkQuizId, setBulkQuizId] = useState('')
  const [bulkSubmitting, setBulkSubmitting] = useState(false)
  const [bulkResult, setBulkResult] = useState<{ success: boolean; message: string } | null>(null)
  const [quizzes, setQuizzes] = useState<Array<{ id: string; title: string }>>([])
  const [showJsonPaste, setShowJsonPaste] = useState(false)
  const [jsonText, setJsonText] = useState('')
  const jsonRef = useRef<HTMLTextAreaElement>(null)

  const loadQuestions = async () => {
    const params = new URLSearchParams({ page: page.toString(), limit: '20' })
    if (search) params.set('search', search); if (filterType) params.set('filter_type', filterType); if (filterDifficulty) params.set('filter_difficulty', filterDifficulty)
    try { const res = await fetch(`/api/questions?${params}`); if (res.ok) { const json = await res.json(); setQuestions(json.data || json.questions || []); setTotal(json.pagination?.total ?? json.total ?? 0) } } catch {} finally { setLoading(false) }
  }
  useEffect(() => { loadQuestions() }, [page, search, filterType, filterDifficulty])
  useEffect(() => { if (showBulk) fetch('/api/quizzes').then(r => r.json()).then(d => setQuizzes(d.quizzes || [])).catch(() => {}) }, [showBulk])

  const updateBulkQ = (idx: number, field: string, value: any) => {
    setBulkQuestions(prev => { const next = [...prev]; (next[idx] as any)[field] = value; return next })
  }
  const updateOption = (qIdx: number, oIdx: number, field: string, value: any) => {
    setBulkQuestions(prev => {
      const next = [...prev]; const opts = [...next[qIdx].options]; (opts[oIdx] as any)[field] = value
      if (field === 'isCorrect' && value && next[qIdx].type !== 'MULTIPLE_ANSWERS') opts.forEach((o, i) => { if (i !== oIdx) o.isCorrect = false })
      next[qIdx].options = opts; return next
    })
  }
  const addOption = (qIdx: number) => setBulkQuestions(prev => { const next = [...prev]; next[qIdx].options.push({ text: '', isCorrect: false }); return next })
  const removeOption = (qIdx: number, oIdx: number) => setBulkQuestions(prev => { const next = [...prev]; next[qIdx].options.splice(oIdx, 1); return next })
  const addBulkQuestion = () => setBulkQuestions(prev => [...prev, emptyQuestion()])
  const removeBulkQuestion = (idx: number) => setBulkQuestions(prev => prev.filter((_, i) => i !== idx))
  const handleJsonPaste = () => {
    try {
      const parsed = JSON.parse(jsonText)
      const qs: BulkQuestion[] = (Array.isArray(parsed) ? parsed : parsed.questions || []).map((q: any) => ({
        text: q.text || q.question || '', type: q.type || 'MULTIPLE_CHOICE', category: q.category || '', difficulty: q.difficulty || 'MEDIUM',
        marks: q.marks || 1, explanation: q.explanation || '',
        options: (q.options || q.answers || []).map((o: any) => typeof o === 'string' ? { text: o, isCorrect: false } : { text: o.text || o.answer || '', isCorrect: !!o.isCorrect || !!o.correct }),
      }))
      if (qs.length === 0) { setBulkResult({ success: false, message: 'No questions found in JSON' }); return }
      setBulkQuestions(qs); setShowJsonPaste(false); setJsonText(''); setBulkResult({ success: true, message: `${qs.length} questions loaded from JSON` })
    } catch { setBulkResult({ success: false, message: 'Invalid JSON format' }) }
  }
  const submitBulk = async () => {
    setBulkSubmitting(true); setBulkResult(null)
    try {
      const res = await fetch('/api/questions/bulk', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ questions: bulkQuestions, quizId: bulkQuizId || undefined }),
      })
      const data = await res.json()
      if (res.ok) {
        setBulkResult({ success: true, message: `${data.created} questions created successfully!` })
        setBulkQuestions([emptyQuestion()]); loadQuestions()
      } else { setBulkResult({ success: false, message: data.error || 'Failed to create questions' }) }
    } catch { setBulkResult({ success: false, message: 'Network error' }) } finally { setBulkSubmitting(false) }
  }

  const typeColors: Record<string, string> = { MULTIPLE_CHOICE: 'bg-[#007bff]/10 text-[#007bff]', MULTIPLE_ANSWERS: 'bg-purple-50 text-purple-700', TRUE_FALSE: 'bg-[#28a745]/10 text-[#28a745]', SHORT_ANSWER: 'bg-[#F5B731]/10 text-[#F5B731]', SCENARIO: 'bg-[#dc3545]/10 text-[#dc3545]' }
  const inputClass = "bg-[#F8FAFC] border border-[#E2E8F0] rounded-xl px-3 py-2 text-sm text-[#1B2B4B] outline-none transition-all focus:border-[#1B2B4B] focus:ring-[3px] focus:ring-[#1B2B4B]/10"

  return (
    <div className="min-h-screen bg-[#F8FAFC]">
      <header className="bg-[#1B2B4B]">
        <div className="max-w-7xl mx-auto px-4 py-4 flex items-center justify-between">
          <div><h1 className="text-lg font-bold text-white">Question Bank</h1><p className="text-xs text-[#94A3B8]">{total} questions total</p></div>
          <div className="flex items-center gap-3">
            <button onClick={() => { setShowBulk(true); setBulkResult(null) }} className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium bg-[#F5B731] text-[#1B2B4B] hover:bg-[#F5B731]/90 transition-colors"><LuUpload className="w-4 h-4" /> Bulk Add</button>
            <Link href="/admin" className="text-sm text-[#94A3B8] hover:text-white transition-colors">← Dashboard</Link>
          </div>
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
        {/* Bulk Add Modal */}
        {showBulk && (
          <div className="fixed inset-0 bg-black/50 z-50 flex items-start justify-center p-4 overflow-y-auto">
            <div className="bg-white rounded-[20px] w-full max-w-3xl my-8 shadow-2xl">
              <div className="flex items-center justify-between px-6 py-4 border-b border-[#E2E8F0]">
                <h2 className="text-lg font-bold text-[#1B2B4B]">Bulk Add Questions</h2>
                <button onClick={() => setShowBulk(false)} className="text-[#94A3B8] hover:text-[#1B2B4B]"><LuX className="w-5 h-5" /></button>
              </div>
              <div className="px-6 py-4 border-b border-[#E2E8F0] flex flex-wrap gap-3 items-center">
                <select value={bulkQuizId} onChange={e => setBulkQuizId(e.target.value)} className={inputClass}>
                  <option value="">No quiz (question bank only)</option>
                  {quizzes.map(q => <option key={q.id} value={q.id}>{q.title}</option>)}
                </select>
                <button onClick={() => setShowJsonPaste(!showJsonPaste)} className="text-sm text-[#007bff] hover:underline">
                  {showJsonPaste ? 'Hide' : '📋 Paste JSON'}
                </button>
                <span className="text-xs text-[#94A3B8] ml-auto">{bulkQuestions.length} question{bulkQuestions.length !== 1 ? 's' : ''}</span>
              </div>

              {showJsonPaste && (
                <div className="px-6 py-4 border-b border-[#E2E8F0] bg-[#F8FAFC]">
                  <p className="text-xs text-[#94A3B8] mb-2">Paste a JSON array of questions. Format: [{`{ "text": "...", "type": "MULTIPLE_CHOICE", "options": [{ "text": "...", "isCorrect": true }] }`}]</p>
                  <textarea ref={jsonRef} value={jsonText} onChange={e => setJsonText(e.target.value)} rows={6} className={inputClass + " w-full font-mono text-xs"} placeholder='[{"text": "What is...?", "type": "MULTIPLE_CHOICE", "category": "General", "options": [{"text": "Option A", "isCorrect": true}, {"text": "Option B", "isCorrect": false}]}]' />
                  <button onClick={handleJsonPaste} className="mt-2 px-4 py-1.5 rounded-lg text-sm font-medium bg-[#1B2B4B] text-white hover:bg-[#0F1C32]">Parse JSON</button>
                </div>
              )}

              {bulkResult && (
                <div className={`mx-6 mt-4 flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm ${bulkResult.success ? 'bg-[#28a745]/10 text-[#28a745]' : 'bg-[#dc3545]/10 text-[#dc3545]'}`}>
                  {bulkResult.success ? <LuCircleCheck className="w-4 h-4" /> : <LuCircleAlert className="w-4 h-4" />} {bulkResult.message}
                </div>
              )}

              <div className="px-6 py-4 max-h-[60vh] overflow-y-auto space-y-4">
                {bulkQuestions.map((q, qi) => (
                  <div key={qi} className="border border-[#E2E8F0] rounded-[16px] p-4 bg-[#F8FAFC]">
                    <div className="flex items-center justify-between mb-3">
                      <span className="text-sm font-semibold text-[#1B2B4B]">Question {qi + 1}</span>
                      {bulkQuestions.length > 1 && <button onClick={() => removeBulkQuestion(qi)} className="text-[#dc3545] hover:text-[#dc3545]/80"><LuTrash2 className="w-4 h-4" /></button>}
                    </div>
                    <textarea value={q.text} onChange={e => updateBulkQ(qi, 'text', e.target.value)} rows={2} className={inputClass + " w-full mb-2"} placeholder="Question text..." />
                    <div className="flex flex-wrap gap-2 mb-3">
                      <select value={q.type} onChange={e => updateBulkQ(qi, 'type', e.target.value)} className={inputClass + " text-xs"}>
                        <option value="MULTIPLE_CHOICE">Multiple Choice</option><option value="MULTIPLE_ANSWERS">Multiple Answers</option>
                        <option value="TRUE_FALSE">True/False</option><option value="SHORT_ANSWER">Short Answer</option><option value="SCENARIO">Scenario</option>
                      </select>
                      <input value={q.category} onChange={e => updateBulkQ(qi, 'category', e.target.value)} className={inputClass + " text-xs w-28"} placeholder="Category" />
                      <select value={q.difficulty} onChange={e => updateBulkQ(qi, 'difficulty', e.target.value)} className={inputClass + " text-xs"}>
                        <option value="EASY">Easy</option><option value="MEDIUM">Medium</option><option value="HARD">Hard</option>
                      </select>
                      <input type="number" value={q.marks} onChange={e => updateBulkQ(qi, 'marks', Number(e.target.value))} className={inputClass + " text-xs w-16"} min={1} />
                    </div>
                    {q.type !== 'SHORT_ANSWER' && (
                      <div className="space-y-1.5">
                        {q.options.map((opt, oi) => (
                          <div key={oi} className="flex items-center gap-2">
                            <button onClick={() => updateOption(qi, oi, 'isCorrect', !opt.isCorrect)}
                              className={`w-5 h-5 rounded-full border-2 flex items-center justify-center flex-shrink-0 ${opt.isCorrect ? 'border-[#28a745] bg-[#28a745]' : 'border-[#E2E8F0]'}`}>
                              {opt.isCorrect && <span className="text-white text-xs">✓</span>}
                            </button>
                            <input value={opt.text} onChange={e => updateOption(qi, oi, 'text', e.target.value)} className={inputClass + " flex-1 text-xs"} placeholder={`Option ${oi + 1}`} />
                            {q.options.length > 2 && <button onClick={() => removeOption(qi, oi)} className="text-[#94A3B8] hover:text-[#dc3545]"><LuX className="w-3.5 h-3.5" /></button>}
                          </div>
                        ))}
                        <button onClick={() => addOption(qi)} className="text-xs text-[#007bff] hover:underline mt-1">+ Add option</button>
                      </div>
                    )}
                  </div>
                ))}
              </div>
              <div className="px-6 py-4 border-t border-[#E2E8F0] flex items-center justify-between">
                <button onClick={addBulkQuestion} className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-sm font-medium text-[#1B2B4B] bg-[#F8FAFC] border border-[#E2E8F0] hover:bg-white"><LuPlus className="w-4 h-4" /> Add Question</button>
                <button onClick={submitBulk} disabled={bulkSubmitting || bulkQuestions.every(q => !q.text)}
                  className="px-6 py-2.5 rounded-xl text-sm font-semibold bg-[#0F1C32] text-white hover:bg-[#1B2B4B] disabled:opacity-50 transition-all">
                  {bulkSubmitting ? 'Saving...' : `Save ${bulkQuestions.length} Question${bulkQuestions.length !== 1 ? 's' : ''}`}
                </button>
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  )
}
