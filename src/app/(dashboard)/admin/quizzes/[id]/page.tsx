'use client'

import { useEffect, useState } from 'react'
import { useParams } from 'next/navigation'
import Link from 'next/link'
import { LuPencil, LuTrash2, LuX, LuCheck, LuPlus, LuCircleMinus } from 'react-icons/lu'

interface EditForm {
  text: string; type: string; category: string; difficulty: string; marks: number; explanation: string; scenarioText: string
  options: { text: string; isCorrect: boolean }[]
}

const emptyForm: EditForm = { text: '', type: 'MULTIPLE_CHOICE', category: '', difficulty: 'MEDIUM', marks: 1, explanation: '', scenarioText: '', options: [{ text: '', isCorrect: false }] }

export default function ManageQuizPage() {
  const params = useParams()
  const quizId = params.id as string
  const [quiz, setQuiz] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [showAddQuestion, setShowAddQuestion] = useState(false)
  const [qForm, setQForm] = useState({
    text: '', type: 'MULTIPLE_CHOICE', category: 'General', difficulty: 'MEDIUM', marks: 1, explanation: '', scenarioText: '',
    options: [{ text: '', isCorrect: false }, { text: '', isCorrect: false }, { text: '', isCorrect: false }, { text: '', isCorrect: false }],
  })
  const [saving, setSaving] = useState(false)

  // Edit state
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editForm, setEditForm] = useState<EditForm>(emptyForm)
  const [editSaving, setEditSaving] = useState(false)
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null)
  const [deleting, setDeleting] = useState(false)

  const loadQuiz = async () => { try { const res = await fetch(`/api/quizzes/${quizId}`); if (res.ok) { const data = await res.json(); setQuiz(data.quiz) } } catch {} finally { setLoading(false) } }
  useEffect(() => { loadQuiz() }, [quizId])

  const addQuestion = async (e: React.FormEvent) => {
    e.preventDefault(); setSaving(true)
    try {
      const res = await fetch('/api/questions', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ ...qForm, quizId }) })
      if (res.ok) { setShowAddQuestion(false); setQForm({ text: '', type: 'MULTIPLE_CHOICE', category: 'General', difficulty: 'MEDIUM', marks: 1, explanation: '', scenarioText: '', options: [{ text: '', isCorrect: false }, { text: '', isCorrect: false }, { text: '', isCorrect: false }, { text: '', isCorrect: false }] }); loadQuiz() }
    } catch {} finally { setSaving(false) }
  }

  const updateOption = (index: number, field: string, value: string | boolean) => {
    setQForm(prev => {
      const options = [...prev.options]; options[index] = { ...options[index], [field]: value }
      if (field === 'isCorrect' && value === true && (prev.type === 'MULTIPLE_CHOICE' || prev.type === 'TRUE_FALSE' || prev.type === 'SCENARIO')) {
        options.forEach((o, i) => { if (i !== index) o.isCorrect = false })
      }
      return { ...prev, options }
    })
  }

  const addOption = () => setQForm(prev => ({ ...prev, options: [...prev.options, { text: '', isCorrect: false }] }))
  const removeOption = (index: number) => { if (qForm.options.length <= 2) return; setQForm(prev => ({ ...prev, options: prev.options.filter((_, i) => i !== index) })) }

  // ── Edit handlers ──
  const startEdit = (q: any) => {
    setEditingId(q.id)
    setEditForm({
      text: q.text,
      type: q.type,
      category: q.category || '',
      difficulty: q.difficulty,
      marks: q.marks,
      explanation: q.explanation || '',
      scenarioText: q.scenarioText || '',
      options: q.options?.length > 0 ? q.options.map((o: any) => ({ text: o.text, isCorrect: o.isCorrect })) : [{ text: '', isCorrect: false }],
    })
    setConfirmDeleteId(null)
  }

  const cancelEdit = () => { setEditingId(null); setEditForm(emptyForm) }

  const saveEdit = async () => {
    if (!editingId || !editForm.text.trim()) return
    setEditSaving(true)
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
      if (res.ok) { setEditingId(null); setEditForm(emptyForm); loadQuiz() }
    } catch {} finally { setEditSaving(false) }
  }

  const deleteQuestion = async (questionId: string) => {
    setDeleting(true)
    try {
      const res = await fetch(`/api/questions/${questionId}`, { method: 'DELETE' })
      if (res.ok) { setConfirmDeleteId(null); loadQuiz() }
    } catch {} finally { setDeleting(false) }
  }

  const editAddOption = () => setEditForm(prev => ({ ...prev, options: [...prev.options, { text: '', isCorrect: false }] }))
  const editRemoveOption = (i: number) => { if (editForm.options.length <= 1) return; setEditForm(prev => ({ ...prev, options: prev.options.filter((_, idx) => idx !== i) })) }
  const editUpdateOption = (i: number, field: 'text' | 'isCorrect', value: string | boolean) => {
    setEditForm(prev => {
      const options = prev.options.map((o, idx) => idx === i ? { ...o, [field]: value } : o)
      if (field === 'isCorrect' && value === true && ['MULTIPLE_CHOICE', 'TRUE_FALSE', 'SCENARIO'].includes(prev.type)) {
        options.forEach((o, idx) => { if (idx !== i) o.isCorrect = false })
      }
      return { ...prev, options }
    })
  }

  const inputClass = "w-full bg-[#F8FAFC] border border-[#E2E8F0] rounded-xl px-3 py-2.5 text-sm text-[#1B2B4B] outline-none transition-all focus:border-[#1B2B4B] focus:ring-[3px] focus:ring-[#1B2B4B]/10"
  const labelClass = "text-xs font-semibold tracking-wider uppercase text-[#1B2B4B] mb-1 block"

  if (loading) return <div className="min-h-screen bg-[#F8FAFC] flex items-center justify-center"><div className="w-12 h-12 border-4 border-[#E2E8F0] border-t-[#1B2B4B] rounded-full animate-spin" /></div>

  return (
    <div className="min-h-screen bg-[#F8FAFC]">
      <header className="bg-[#1B2B4B]">
        <div className="max-w-5xl mx-auto px-4 py-4 flex items-center justify-between">
          <div>
            <Link href="/admin/quizzes" className="text-sm text-[#94A3B8] hover:text-white transition-colors">← Back to Quizzes</Link>
            <h1 className="text-lg font-bold text-white mt-1">{quiz?.title}</h1>
          </div>
          <button onClick={() => setShowAddQuestion(!showAddQuestion)} className="bg-[#F5B731] text-[#1B2B4B] px-4 py-2 rounded-xl text-sm font-semibold hover:bg-[#F5B731]/90 transition-all">+ Add Question</button>
        </div>
      </header>

      <main className="max-w-5xl mx-auto px-4 py-6">
        {/* ── Add Question Form ── */}
        {showAddQuestion && (
          <div className="bg-white rounded-[16px] border border-[#E2E8F0] shadow-[0_1px_3px_rgba(0,0,0,0.05)] p-6 mb-6">
            <h3 className="font-semibold text-[#1B2B4B] mb-4">Add Question</h3>
            <form onSubmit={addQuestion} className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div><label className={labelClass}>Type</label>
                  <select value={qForm.type} onChange={e => { const type = e.target.value; let options = qForm.options; if (type === 'TRUE_FALSE') options = [{ text: 'True', isCorrect: false }, { text: 'False', isCorrect: false }]; setQForm(p => ({...p, type, options})) }} className={inputClass}>
                    <option value="MULTIPLE_CHOICE">Multiple Choice</option><option value="MULTIPLE_ANSWERS">Multiple Answers</option><option value="TRUE_FALSE">True/False</option><option value="SHORT_ANSWER">Short Answer</option><option value="SCENARIO">Scenario</option>
                  </select></div>
                <div><label className={labelClass}>Category</label><input type="text" value={qForm.category} onChange={e => setQForm(p => ({...p, category: e.target.value}))} className={inputClass} /></div>
                <div><label className={labelClass}>Difficulty</label>
                  <select value={qForm.difficulty} onChange={e => setQForm(p => ({...p, difficulty: e.target.value}))} className={inputClass}>
                    <option value="EASY">Easy</option><option value="MEDIUM">Medium</option><option value="HARD">Hard</option>
                  </select></div>
              </div>
              {qForm.type === 'SCENARIO' && <div><label className={labelClass}>Scenario Text</label><textarea value={qForm.scenarioText} onChange={e => setQForm(p => ({...p, scenarioText: e.target.value}))} rows={3} className={inputClass + " resize-none"} /></div>}
              <div><label className={labelClass}>Question</label><textarea value={qForm.text} onChange={e => setQForm(p => ({...p, text: e.target.value}))} required rows={2} className={inputClass + " resize-none"} /></div>
              {qForm.type !== 'SHORT_ANSWER' && (
                <div><label className={labelClass}>Options</label>
                  <div className="space-y-2">
                    {qForm.options.map((opt, i) => (
                      <div key={i} className="flex items-center gap-2">
                        <input type={qForm.type === 'MULTIPLE_ANSWERS' ? 'checkbox' : 'radio'} name="correct" checked={opt.isCorrect} onChange={e => updateOption(i, 'isCorrect', e.target.checked)} className="accent-[#F5B731]" />
                        <input type="text" value={opt.text} onChange={e => updateOption(i, 'text', e.target.value)} placeholder={`Option ${String.fromCharCode(65 + i)}`} required className="flex-1 bg-[#F8FAFC] border border-[#E2E8F0] rounded-lg px-3 py-2 text-sm text-[#1B2B4B] outline-none focus:border-[#1B2B4B]" />
                        {qForm.options.length > 2 && qForm.type !== 'TRUE_FALSE' && <button type="button" onClick={() => removeOption(i)} className="text-[#dc3545] hover:text-[#dc3545]/70 text-sm">✕</button>}
                      </div>
                    ))}
                  </div>
                  {qForm.type !== 'TRUE_FALSE' && <button type="button" onClick={addOption} className="text-sm text-[#F5B731] font-semibold hover:underline mt-2">+ Add Option</button>}
                </div>
              )}
              <div><label className={labelClass}>Explanation (optional)</label><input type="text" value={qForm.explanation} onChange={e => setQForm(p => ({...p, explanation: e.target.value}))} className={inputClass} /></div>
              <div className="flex gap-2">
                <button type="submit" disabled={saving} className="bg-[#0F1C32] text-white px-6 py-2.5 rounded-xl text-sm font-semibold hover:bg-[#1B2B4B] disabled:opacity-50 transition-all">{saving ? 'Saving...' : 'Add Question'}</button>
                <button type="button" onClick={() => setShowAddQuestion(false)} className="px-6 py-2.5 rounded-xl text-sm text-[#1B2B4B] bg-[#F8FAFC] border border-[#E2E8F0] hover:bg-white transition-all">Cancel</button>
              </div>
            </form>
          </div>
        )}

        {/* ── Questions List ── */}
        <h3 className="font-semibold text-[#1B2B4B] mb-3">Questions ({quiz?.questions?.length || 0})</h3>
        <div className="space-y-3">
          {quiz?.questions?.map((qq: any, i: number) => {
            const q = qq.question
            const isEditing = editingId === q.id

            return (
              <div key={qq.id} className="bg-white rounded-[16px] border border-[#E2E8F0] shadow-[0_1px_3px_rgba(0,0,0,0.05)] p-4">
                {isEditing ? (
                  /* ── Edit Mode ── */
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-semibold text-white bg-[#1B2B4B] px-2 py-0.5 rounded">Q{i + 1}</span>
                        <span className="text-xs font-semibold text-[#F5B731] uppercase tracking-wider">Editing</span>
                      </div>
                      <div className="flex items-center gap-1.5">
                        <button onClick={saveEdit} disabled={editSaving} className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-semibold bg-[#28a745] text-white hover:bg-[#28a745]/90 disabled:opacity-50 transition-all">
                          <LuCheck className="w-3.5 h-3.5" /> {editSaving ? 'Saving...' : 'Save'}
                        </button>
                        <button onClick={cancelEdit} className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-semibold bg-[#E2E8F0] text-[#1B2B4B] hover:bg-[#E2E8F0]/70 transition-all">
                          <LuX className="w-3.5 h-3.5" /> Cancel
                        </button>
                      </div>
                    </div>

                    <textarea
                      value={editForm.text}
                      onChange={e => setEditForm(prev => ({ ...prev, text: e.target.value }))}
                      className={inputClass + " min-h-[70px] resize-y"}
                      placeholder="Question text..."
                    />

                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                      <div>
                        <label className="text-[10px] font-semibold text-[#94A3B8] uppercase mb-1 block">Type</label>
                        <select value={editForm.type} onChange={e => setEditForm(prev => ({ ...prev, type: e.target.value }))} className={inputClass}>
                          <option value="MULTIPLE_CHOICE">Multiple Choice</option>
                          <option value="MULTIPLE_ANSWERS">Multiple Answers</option>
                          <option value="TRUE_FALSE">True/False</option>
                          <option value="SHORT_ANSWER">Short Answer</option>
                          <option value="SCENARIO">Scenario</option>
                        </select>
                      </div>
                      <div>
                        <label className="text-[10px] font-semibold text-[#94A3B8] uppercase mb-1 block">Difficulty</label>
                        <select value={editForm.difficulty} onChange={e => setEditForm(prev => ({ ...prev, difficulty: e.target.value }))} className={inputClass}>
                          <option value="EASY">Easy</option><option value="MEDIUM">Medium</option><option value="HARD">Hard</option>
                        </select>
                      </div>
                      <div>
                        <label className="text-[10px] font-semibold text-[#94A3B8] uppercase mb-1 block">Category</label>
                        <input type="text" value={editForm.category} onChange={e => setEditForm(prev => ({ ...prev, category: e.target.value }))} className={inputClass} />
                      </div>
                      <div>
                        <label className="text-[10px] font-semibold text-[#94A3B8] uppercase mb-1 block">Marks</label>
                        <input type="number" value={editForm.marks} onChange={e => setEditForm(prev => ({ ...prev, marks: parseFloat(e.target.value) || 1 }))} className={inputClass} min={0.5} step={0.5} />
                      </div>
                    </div>

                    <div>
                      <label className="text-[10px] font-semibold text-[#94A3B8] uppercase mb-1 block">Explanation (optional)</label>
                      <input type="text" value={editForm.explanation} onChange={e => setEditForm(prev => ({ ...prev, explanation: e.target.value }))} className={inputClass} placeholder="Why is this correct?" />
                    </div>

                    {(editForm.type === 'SCENARIO' || editForm.scenarioText) && (
                      <div>
                        <label className="text-[10px] font-semibold text-[#94A3B8] uppercase mb-1 block">Scenario Text</label>
                        <textarea value={editForm.scenarioText} onChange={e => setEditForm(prev => ({ ...prev, scenarioText: e.target.value }))} className={inputClass + " min-h-[60px] resize-y"} />
                      </div>
                    )}

                    {['MULTIPLE_CHOICE', 'MULTIPLE_ANSWERS', 'TRUE_FALSE', 'SCENARIO'].includes(editForm.type) && (
                      <div>
                        <div className="flex items-center justify-between mb-2">
                          <label className="text-[10px] font-semibold text-[#94A3B8] uppercase">Options</label>
                          {editForm.type !== 'TRUE_FALSE' && (
                            <button onClick={editAddOption} className="inline-flex items-center gap-1 text-xs text-[#007bff] hover:text-[#007bff]/80 font-semibold">
                              <LuPlus className="w-3.5 h-3.5" /> Add
                            </button>
                          )}
                        </div>
                        <div className="space-y-2">
                          {editForm.options.map((opt, oi) => (
                            <div key={oi} className="flex items-center gap-2">
                              <button
                                type="button"
                                onClick={() => editUpdateOption(oi, 'isCorrect', !opt.isCorrect)}
                                className={`w-6 h-6 rounded-full border-2 flex items-center justify-center flex-shrink-0 transition-all ${
                                  opt.isCorrect ? 'border-[#28a745] bg-[#28a745] text-white' : 'border-[#E2E8F0] hover:border-[#28a745]'
                                }`}
                              >
                                {opt.isCorrect && <LuCheck className="w-3.5 h-3.5" />}
                              </button>
                              <input
                                type="text"
                                value={opt.text}
                                onChange={e => editUpdateOption(oi, 'text', e.target.value)}
                                className="flex-1 bg-[#F8FAFC] border border-[#E2E8F0] rounded-lg px-3 py-2 text-sm text-[#1B2B4B] outline-none focus:border-[#1B2B4B]"
                                placeholder={`Option ${String.fromCharCode(65 + oi)}`}
                              />
                              {editForm.options.length > 1 && editForm.type !== 'TRUE_FALSE' && (
                                <button onClick={() => editRemoveOption(oi)} className="p-1.5 rounded-lg hover:bg-[#dc3545]/10 text-[#94A3B8] hover:text-[#dc3545] transition-colors">
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
                  <div>
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex items-start gap-2 flex-1">
                        <span className="text-xs font-semibold text-white bg-[#1B2B4B] px-2 py-0.5 rounded flex-shrink-0">Q{i + 1}</span>
                        <div className="flex-1">
                          <span className="text-xs text-[#94A3B8]">{q.type?.replace(/_/g, ' ')} · {q.difficulty} · {q.marks} mark(s){q.category ? ` · ${q.category}` : ''}</span>
                          <p className="text-sm text-[#1B2B4B] mt-0.5">{q.text}</p>
                        </div>
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
                    {q.options?.length > 0 && (
                      <div className="mt-2 ml-8 space-y-1">
                        {q.options.map((opt: any) => (
                          <div key={opt.id} className={`text-xs px-2 py-1 rounded ${opt.isCorrect ? 'bg-[#28a745]/10 text-[#28a745] font-medium' : 'text-[#94A3B8]'}`}>
                            {opt.isCorrect ? '✓' : '○'} {opt.text}
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </div>
            )
          })}
          {(!quiz?.questions || quiz.questions.length === 0) && (
            <div className="bg-white rounded-[16px] border border-[#E2E8F0] p-8 text-center text-sm text-[#94A3B8]">
              No questions yet. Click &quot;+ Add Question&quot; to get started.
            </div>
          )}
        </div>
      </main>
    </div>
  )
}
