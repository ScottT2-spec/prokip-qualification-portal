'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { LuPencil, LuTrash2, LuX, LuCheck, LuPlus, LuCircleMinus } from 'react-icons/lu'

interface Option { id: string; text: string; isCorrect: boolean }
interface Question { id: string; text: string; type: string; category: string; difficulty: string; marks: number; explanation?: string; scenarioText?: string; options: Option[] }

interface EditForm {
  text: string; type: string; category: string; difficulty: string; marks: number; explanation: string; scenarioText: string
  options: { text: string; isCorrect: boolean }[]
}

const emptyForm: EditForm = { text: '', type: 'MULTIPLE_CHOICE', category: '', difficulty: 'MEDIUM', marks: 1, explanation: '', scenarioText: '', options: [{ text: '', isCorrect: false }] }

export default function QuestionsPage() {
  const [questions, setQuestions] = useState<Question[]>([])
  const [total, setTotal] = useState(0)
  const [page, setPage] = useState(1)
  const [search, setSearch] = useState('')
  const [filterType, setFilterType] = useState('')
  const [filterDifficulty, setFilterDifficulty] = useState('')
  const [loading, setLoading] = useState(true)

  // Edit/Delete state
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editForm, setEditForm] = useState<EditForm>(emptyForm)
  const [saving, setSaving] = useState(false)
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null)
  const [deleting, setDeleting] = useState(false)

  const loadQuestions = async () => {
    const params = new URLSearchParams({ page: page.toString(), limit: '20' })
    if (search) params.set('search', search)
    if (filterType) params.set('filter_type', filterType)
    if (filterDifficulty) params.set('filter_difficulty', filterDifficulty)
    try {
      const res = await fetch(`/api/questions?${params}`)
      if (res.ok) {
        const json = await res.json()
        setQuestions(json.data || json.questions || [])
        setTotal(json.pagination?.total ?? json.total ?? 0)
      }
    } catch {} finally { setLoading(false) }
  }
  useEffect(() => { loadQuestions() }, [page, search, filterType, filterDifficulty])

  const startEdit = (q: Question) => {
    setEditingId(q.id)
    setEditForm({
      text: q.text,
      type: q.type,
      category: q.category || '',
      difficulty: q.difficulty,
      marks: q.marks,
      explanation: q.explanation || '',
      scenarioText: q.scenarioText || '',
      options: q.options.length > 0 ? q.options.map(o => ({ text: o.text, isCorrect: o.isCorrect })) : [{ text: '', isCorrect: false }],
    })
    setConfirmDeleteId(null)
  }

  const cancelEdit = () => { setEditingId(null); setEditForm(emptyForm) }

  const saveEdit = async () => {
    if (!editingId || !editForm.text.trim()) return
    setSaving(true)
    try {
      const res = await fetch(`/api/questions/${editingId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          text: editForm.text,
          type: editForm.type,
          category: editForm.category,
          difficulty: editForm.difficulty,
          marks: editForm.marks,
          explanation: editForm.explanation || null,
          scenarioText: editForm.scenarioText || null,
          options: editForm.options.filter(o => o.text.trim()),
        }),
      })
      if (res.ok) {
        const json = await res.json()
        setQuestions(prev => prev.map(q => q.id === editingId ? json.question : q))
        setEditingId(null)
        setEditForm(emptyForm)
      }
    } catch {} finally { setSaving(false) }
  }

  const deleteQuestion = async (id: string) => {
    setDeleting(true)
    try {
      const res = await fetch(`/api/questions/${id}`, { method: 'DELETE' })
      if (res.ok) {
        setQuestions(prev => prev.filter(q => q.id !== id))
        setTotal(prev => prev - 1)
        setConfirmDeleteId(null)
      }
    } catch {} finally { setDeleting(false) }
  }

  const addOption = () => setEditForm(prev => ({ ...prev, options: [...prev.options, { text: '', isCorrect: false }] }))
  const removeOption = (i: number) => setEditForm(prev => ({ ...prev, options: prev.options.filter((_, idx) => idx !== i) }))
  const updateOption = (i: number, field: 'text' | 'isCorrect', value: string | boolean) => {
    setEditForm(prev => ({
      ...prev,
      options: prev.options.map((o, idx) => idx === i ? { ...o, [field]: value } : o),
    }))
  }

  const typeColors: Record<string, string> = {
    MULTIPLE_CHOICE: 'bg-[#007bff]/10 text-[#007bff]',
    MULTIPLE_ANSWERS: 'bg-purple-50 text-purple-700',
    TRUE_FALSE: 'bg-[#28a745]/10 text-[#28a745]',
    SHORT_ANSWER: 'bg-[#F5B731]/10 text-[#F5B731]',
    SCENARIO: 'bg-[#dc3545]/10 text-[#dc3545]',
  }
  const inputClass = "bg-[#F8FAFC] border border-[#E2E8F0] rounded-xl px-3 py-2 text-sm text-[#1B2B4B] outline-none transition-all focus:border-[#1B2B4B] focus:ring-[3px] focus:ring-[#1B2B4B]/10"

  return (
    <div className="min-h-screen bg-[#F8FAFC]">
      <header className="bg-[#1B2B4B]">
        <div className="max-w-7xl mx-auto px-4 py-4 flex items-center justify-between">
          <div>
            <h1 className="text-lg font-bold text-white">Question Bank</h1>
            <p className="text-xs text-[#94A3B8]">{total} questions total</p>
          </div>
          <Link href="/admin" className="text-sm text-[#94A3B8] hover:text-white transition-colors">← Dashboard</Link>
        </div>
      </header>
      <main className="max-w-7xl mx-auto px-4 py-6">
        {/* Filters */}
        <div className="bg-white rounded-[16px] border border-[#E2E8F0] shadow-[0_1px_3px_rgba(0,0,0,0.05)] p-4 mb-4 flex flex-wrap gap-3">
          <input type="text" value={search} onChange={e => { setSearch(e.target.value); setPage(1) }} placeholder="Search questions..." className={inputClass + " flex-1 min-w-[200px]"} />
          <select value={filterType} onChange={e => { setFilterType(e.target.value); setPage(1) }} className={inputClass}>
            <option value="">All Types</option>
            <option value="MULTIPLE_CHOICE">Multiple Choice</option>
            <option value="MULTIPLE_ANSWERS">Multiple Answers</option>
            <option value="TRUE_FALSE">True/False</option>
            <option value="SHORT_ANSWER">Short Answer</option>
            <option value="SCENARIO">Scenario</option>
          </select>
          <select value={filterDifficulty} onChange={e => { setFilterDifficulty(e.target.value); setPage(1) }} className={inputClass}>
            <option value="">All Difficulties</option>
            <option value="EASY">Easy</option>
            <option value="MEDIUM">Medium</option>
            <option value="HARD">Hard</option>
          </select>
        </div>

        {/* Questions */}
        <div className="space-y-3">
          {questions.map((q, i) => (
            <div key={q.id} className="bg-white rounded-[16px] border border-[#E2E8F0] shadow-[0_1px_3px_rgba(0,0,0,0.05)] p-4">
              {editingId === q.id ? (
                /* ── Edit Mode ── */
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-semibold text-[#F5B731] uppercase tracking-wider">Editing Question</span>
                    <div className="flex items-center gap-1.5">
                      <button onClick={saveEdit} disabled={saving} className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-semibold bg-[#28a745] text-white hover:bg-[#28a745]/90 disabled:opacity-50 transition-all">
                        <LuCheck className="w-3.5 h-3.5" /> {saving ? 'Saving...' : 'Save'}
                      </button>
                      <button onClick={cancelEdit} className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-semibold bg-[#E2E8F0] text-[#1B2B4B] hover:bg-[#E2E8F0]/70 transition-all">
                        <LuX className="w-3.5 h-3.5" /> Cancel
                      </button>
                    </div>
                  </div>

                  {/* Question text */}
                  <textarea
                    value={editForm.text}
                    onChange={e => setEditForm(prev => ({ ...prev, text: e.target.value }))}
                    className={inputClass + " w-full min-h-[80px] resize-y"}
                    placeholder="Question text..."
                  />

                  {/* Meta row */}
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                    <div>
                      <label className="text-[10px] font-semibold text-[#94A3B8] uppercase mb-1 block">Type</label>
                      <select value={editForm.type} onChange={e => setEditForm(prev => ({ ...prev, type: e.target.value }))} className={inputClass + " w-full"}>
                        <option value="MULTIPLE_CHOICE">Multiple Choice</option>
                        <option value="MULTIPLE_ANSWERS">Multiple Answers</option>
                        <option value="TRUE_FALSE">True/False</option>
                        <option value="SHORT_ANSWER">Short Answer</option>
                        <option value="SCENARIO">Scenario</option>
                      </select>
                    </div>
                    <div>
                      <label className="text-[10px] font-semibold text-[#94A3B8] uppercase mb-1 block">Difficulty</label>
                      <select value={editForm.difficulty} onChange={e => setEditForm(prev => ({ ...prev, difficulty: e.target.value }))} className={inputClass + " w-full"}>
                        <option value="EASY">Easy</option>
                        <option value="MEDIUM">Medium</option>
                        <option value="HARD">Hard</option>
                      </select>
                    </div>
                    <div>
                      <label className="text-[10px] font-semibold text-[#94A3B8] uppercase mb-1 block">Category</label>
                      <input type="text" value={editForm.category} onChange={e => setEditForm(prev => ({ ...prev, category: e.target.value }))} className={inputClass + " w-full"} placeholder="Category" />
                    </div>
                    <div>
                      <label className="text-[10px] font-semibold text-[#94A3B8] uppercase mb-1 block">Marks</label>
                      <input type="number" value={editForm.marks} onChange={e => setEditForm(prev => ({ ...prev, marks: parseFloat(e.target.value) || 1 }))} className={inputClass + " w-full"} min={0.5} step={0.5} />
                    </div>
                  </div>

                  {/* Explanation */}
                  <div>
                    <label className="text-[10px] font-semibold text-[#94A3B8] uppercase mb-1 block">Explanation (optional)</label>
                    <input type="text" value={editForm.explanation} onChange={e => setEditForm(prev => ({ ...prev, explanation: e.target.value }))} className={inputClass + " w-full"} placeholder="Why is this the correct answer?" />
                  </div>

                  {/* Scenario text */}
                  {(editForm.type === 'SCENARIO' || editForm.scenarioText) && (
                    <div>
                      <label className="text-[10px] font-semibold text-[#94A3B8] uppercase mb-1 block">Scenario Text</label>
                      <textarea value={editForm.scenarioText} onChange={e => setEditForm(prev => ({ ...prev, scenarioText: e.target.value }))} className={inputClass + " w-full min-h-[60px] resize-y"} placeholder="Describe the scenario..." />
                    </div>
                  )}

                  {/* Options */}
                  {['MULTIPLE_CHOICE', 'MULTIPLE_ANSWERS', 'TRUE_FALSE'].includes(editForm.type) && (
                    <div>
                      <div className="flex items-center justify-between mb-2">
                        <label className="text-[10px] font-semibold text-[#94A3B8] uppercase">Options</label>
                        <button onClick={addOption} className="inline-flex items-center gap-1 text-xs text-[#007bff] hover:text-[#007bff]/80 font-semibold">
                          <LuPlus className="w-3.5 h-3.5" /> Add Option
                        </button>
                      </div>
                      <div className="space-y-2">
                        {editForm.options.map((opt, oi) => (
                          <div key={oi} className="flex items-center gap-2">
                            <button
                              type="button"
                              onClick={() => updateOption(oi, 'isCorrect', !opt.isCorrect)}
                              className={`w-6 h-6 rounded-full border-2 flex items-center justify-center flex-shrink-0 transition-all ${
                                opt.isCorrect ? 'border-[#28a745] bg-[#28a745] text-white' : 'border-[#E2E8F0] hover:border-[#28a745]'
                              }`}
                              title={opt.isCorrect ? 'Correct' : 'Mark as correct'}
                            >
                              {opt.isCorrect && <LuCheck className="w-3.5 h-3.5" />}
                            </button>
                            <input
                              type="text"
                              value={opt.text}
                              onChange={e => updateOption(oi, 'text', e.target.value)}
                              className={inputClass + " flex-1"}
                              placeholder={`Option ${oi + 1}`}
                            />
                            {editForm.options.length > 1 && (
                              <button onClick={() => removeOption(oi)} className="p-1.5 rounded-lg hover:bg-[#dc3545]/10 text-[#94A3B8] hover:text-[#dc3545] transition-colors">
                                <LuCircleMinus className="w-4 h-4" />
                              </button>
                            )}
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              ) : (
                /* ── View Mode ── */
                <div className="flex items-start gap-3">
                  <span className="text-xs font-mono text-[#94A3B8] mt-1">{(page - 1) * 20 + i + 1}</span>
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1 flex-wrap">
                      <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${typeColors[q.type] || 'bg-[#E2E8F0] text-[#94A3B8]'}`}>{q.type.replace(/_/g, ' ')}</span>
                      <span className="text-xs text-[#94A3B8]">{q.difficulty} · {q.marks}pt{q.category ? ` · ${q.category}` : ''}</span>
                    </div>
                    <p className="text-sm text-[#1B2B4B]">{q.text}</p>
                    {q.options.length > 0 && (
                      <div className="mt-2 flex flex-wrap gap-1">
                        {q.options.map(opt => (
                          <span key={opt.id} className={`text-xs px-2 py-0.5 rounded ${opt.isCorrect ? 'bg-[#28a745]/10 text-[#28a745]' : 'bg-[#F8FAFC] text-[#94A3B8]'}`}>
                            {opt.isCorrect ? '✓' : '○'} {opt.text}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>
                  {/* Action buttons */}
                  <div className="flex items-center gap-1 flex-shrink-0">
                    <button onClick={() => startEdit(q)} className="p-2 rounded-lg hover:bg-[#007bff]/10 text-[#94A3B8] hover:text-[#007bff] transition-colors" title="Edit question">
                      <LuPencil className="w-4 h-4" />
                    </button>
                    {confirmDeleteId === q.id ? (
                      <div className="flex items-center gap-1">
                        <button onClick={() => deleteQuestion(q.id)} disabled={deleting} className="px-2 py-1 rounded-lg text-xs font-semibold bg-[#dc3545] text-white hover:bg-[#dc3545]/90 disabled:opacity-50 transition-all">
                          {deleting ? '...' : 'Delete'}
                        </button>
                        <button onClick={() => setConfirmDeleteId(null)} className="px-2 py-1 rounded-lg text-xs font-semibold bg-[#E2E8F0] text-[#1B2B4B] hover:bg-[#E2E8F0]/70 transition-all">
                          No
                        </button>
                      </div>
                    ) : (
                      <button onClick={() => { setConfirmDeleteId(q.id); setEditingId(null) }} className="p-2 rounded-lg hover:bg-[#dc3545]/10 text-[#94A3B8] hover:text-[#dc3545] transition-colors" title="Delete question">
                        <LuTrash2 className="w-4 h-4" />
                      </button>
                    )}
                  </div>
                </div>
              )}
            </div>
          ))}
          {questions.length === 0 && !loading && (
            <div className="bg-white rounded-[16px] border border-[#E2E8F0] p-8 text-center text-sm text-[#94A3B8]">No questions found</div>
          )}
        </div>

        {/* Pagination */}
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
