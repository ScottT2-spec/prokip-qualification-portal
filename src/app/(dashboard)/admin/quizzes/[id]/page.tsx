'use client'

import { useEffect, useState, useRef } from 'react'
import { useParams } from 'next/navigation'
import Link from 'next/link'
import { LuX, LuPlus, LuTrash2, LuCircleCheck, LuCircleAlert, LuUpload } from 'react-icons/lu'

interface BulkQuestion {
  text: string; type: string; category: string; difficulty: string; marks: number; explanation: string
  options: Array<{ text: string; isCorrect: boolean }>
}

const emptyQuestion = (): BulkQuestion => ({
  text: '', type: 'MULTIPLE_CHOICE', category: '', difficulty: 'MEDIUM', marks: 1, explanation: '',
  options: [{ text: '', isCorrect: true }, { text: '', isCorrect: false }, { text: '', isCorrect: false }, { text: '', isCorrect: false }],
})

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

  // Bulk Add state
  const [showBulk, setShowBulk] = useState(false)
  const [bulkQuestions, setBulkQuestions] = useState<BulkQuestion[]>([emptyQuestion()])
  const [bulkSubmitting, setBulkSubmitting] = useState(false)
  const [bulkResult, setBulkResult] = useState<{ success: boolean; message: string } | null>(null)
  const [showJsonPaste, setShowJsonPaste] = useState(false)
  const [jsonText, setJsonText] = useState('')
  const jsonRef = useRef<HTMLTextAreaElement>(null)

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

  // Bulk Add handlers
  const updateBulkQ = (idx: number, field: string, value: any) => {
    setBulkQuestions(prev => { const next = [...prev]; (next[idx] as any)[field] = value; return next })
  }
  const updateBulkOption = (qIdx: number, oIdx: number, field: string, value: any) => {
    setBulkQuestions(prev => {
      const next = [...prev]; const opts = [...next[qIdx].options]; (opts[oIdx] as any)[field] = value
      if (field === 'isCorrect' && value && next[qIdx].type !== 'MULTIPLE_ANSWERS') opts.forEach((o, i) => { if (i !== oIdx) o.isCorrect = false })
      next[qIdx].options = opts; return next
    })
  }
  const addBulkOption = (qIdx: number) => setBulkQuestions(prev => { const next = [...prev]; next[qIdx].options.push({ text: '', isCorrect: false }); return next })
  const removeBulkOption = (qIdx: number, oIdx: number) => setBulkQuestions(prev => { const next = [...prev]; next[qIdx].options.splice(oIdx, 1); return next })
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
        body: JSON.stringify({ questions: bulkQuestions, quizId }),
      })
      const data = await res.json()
      if (res.ok) {
        setBulkResult({ success: true, message: `${data.created} questions created successfully!` })
        setBulkQuestions([emptyQuestion()]); loadQuiz()
      } else { setBulkResult({ success: false, message: data.error || 'Failed to create questions' }) }
    } catch { setBulkResult({ success: false, message: 'Network error' }) } finally { setBulkSubmitting(false) }
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
          <div className="flex gap-2">
            <button onClick={() => setShowAddQuestion(!showAddQuestion)} className="bg-[#F5B731] text-[#1B2B4B] px-4 py-2 rounded-xl text-sm font-semibold hover:bg-[#F5B731]/90 transition-all">+ Add Question</button>
            <button onClick={() => { setShowBulk(true); setBulkResult(null); setBulkQuestions([emptyQuestion()]) }} className="flex items-center gap-1.5 bg-white text-[#1B2B4B] px-4 py-2 rounded-xl text-sm font-semibold hover:bg-white/90 transition-all">
              <LuUpload className="w-4 h-4" /> Bulk Add
            </button>
          </div>
        </div>
      </header>

      <main className="max-w-5xl mx-auto px-4 py-6">
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

        <h3 className="font-semibold text-[#1B2B4B] mb-3">Questions ({quiz?.questions?.length || 0})</h3>
        <div className="space-y-3">
          {quiz?.questions?.map((qq: any, i: number) => (
            <div key={qq.id} className="bg-white rounded-[16px] border border-[#E2E8F0] shadow-[0_1px_3px_rgba(0,0,0,0.05)] p-4">
              <div className="flex items-start gap-2 mb-1">
                <span className="text-xs font-semibold text-white bg-[#1B2B4B] px-2 py-0.5 rounded">Q{i + 1}</span>
                <span className="text-xs text-[#94A3B8]">{qq.question.type} · {qq.question.difficulty} · {qq.question.marks} mark(s)</span>
              </div>
              <p className="text-sm text-[#1B2B4B] ml-8">{qq.question.text}</p>
              <div className="mt-2 ml-8 space-y-1">
                {qq.question.options?.map((opt: any) => (
                  <div key={opt.id} className={`text-xs px-2 py-1 rounded ${opt.isCorrect ? 'bg-[#28a745]/10 text-[#28a745] font-medium' : 'text-[#94A3B8]'}`}>
                    {opt.isCorrect ? '✓' : '○'} {opt.text}
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>

        {/* Bulk Add Modal */}
        {showBulk && (
          <div className="fixed inset-0 bg-black/50 z-50 flex items-start justify-center p-4 overflow-y-auto">
            <div className="bg-white rounded-[20px] w-full max-w-3xl my-8 shadow-2xl">
              <div className="flex items-center justify-between px-6 py-4 border-b border-[#E2E8F0]">
                <h2 className="text-lg font-bold text-[#1B2B4B]">Bulk Add Questions</h2>
                <button onClick={() => setShowBulk(false)} className="text-[#94A3B8] hover:text-[#1B2B4B]"><LuX className="w-5 h-5" /></button>
              </div>
              <div className="px-6 py-4 border-b border-[#E2E8F0] flex flex-wrap gap-3 items-center">
                <span className="text-sm text-[#1B2B4B] font-medium">Adding to: <span className="text-[#F5B731]">{quiz?.title}</span></span>
                <button onClick={() => setShowJsonPaste(!showJsonPaste)} className="text-sm text-[#007bff] hover:underline ml-auto">
                  {showJsonPaste ? 'Hide' : '📋 Paste JSON'}
                </button>
                <span className="text-xs text-[#94A3B8]">{bulkQuestions.length} question{bulkQuestions.length !== 1 ? 's' : ''}</span>
              </div>

              {showJsonPaste && (
                <div className="px-6 py-4 border-b border-[#E2E8F0] bg-[#F8FAFC]">
                  <p className="text-xs text-[#94A3B8] mb-2">Paste a JSON array of questions. Format: [{`{ "text": "...", "type": "MULTIPLE_CHOICE", "options": [{ "text": "...", "isCorrect": true }] }`}]</p>
                  <textarea ref={jsonRef} value={jsonText} onChange={e => setJsonText(e.target.value)} rows={6} className={inputClass + " font-mono text-xs"} placeholder='[{"text": "What is...?", "type": "MULTIPLE_CHOICE", "category": "General", "options": [{"text": "Option A", "isCorrect": true}, {"text": "Option B", "isCorrect": false}]}]' />
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
                    <textarea value={q.text} onChange={e => updateBulkQ(qi, 'text', e.target.value)} rows={2} className={inputClass + " mb-2"} placeholder="Question text..." />
                    <div className="flex flex-wrap gap-2 mb-3">
                      <select value={q.type} onChange={e => updateBulkQ(qi, 'type', e.target.value)} className={inputClass + " !w-auto text-xs"}>
                        <option value="MULTIPLE_CHOICE">Multiple Choice</option><option value="MULTIPLE_ANSWERS">Multiple Answers</option>
                        <option value="TRUE_FALSE">True/False</option><option value="SHORT_ANSWER">Short Answer</option><option value="SCENARIO">Scenario</option>
                      </select>
                      <input value={q.category} onChange={e => updateBulkQ(qi, 'category', e.target.value)} className={inputClass + " !w-28 text-xs"} placeholder="Category" />
                      <select value={q.difficulty} onChange={e => updateBulkQ(qi, 'difficulty', e.target.value)} className={inputClass + " !w-auto text-xs"}>
                        <option value="EASY">Easy</option><option value="MEDIUM">Medium</option><option value="HARD">Hard</option>
                      </select>
                      <input type="number" value={q.marks} onChange={e => updateBulkQ(qi, 'marks', Number(e.target.value))} className={inputClass + " !w-16 text-xs"} min={1} />
                    </div>
                    {q.type !== 'SHORT_ANSWER' && (
                      <div className="space-y-1.5">
                        {q.options.map((opt, oi) => (
                          <div key={oi} className="flex items-center gap-2">
                            <button onClick={() => updateBulkOption(qi, oi, 'isCorrect', !opt.isCorrect)}
                              className={`w-5 h-5 rounded-full border-2 flex items-center justify-center flex-shrink-0 ${opt.isCorrect ? 'border-[#28a745] bg-[#28a745]' : 'border-[#E2E8F0]'}`}>
                              {opt.isCorrect && <span className="text-white text-xs">✓</span>}
                            </button>
                            <input value={opt.text} onChange={e => updateBulkOption(qi, oi, 'text', e.target.value)} className={inputClass + " flex-1 text-xs"} placeholder={`Option ${oi + 1}`} />
                            {q.options.length > 2 && <button onClick={() => removeBulkOption(qi, oi)} className="text-[#94A3B8] hover:text-[#dc3545]"><LuX className="w-3.5 h-3.5" /></button>}
                          </div>
                        ))}
                        <button onClick={() => addBulkOption(qi)} className="text-xs text-[#007bff] hover:underline mt-1">+ Add option</button>
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
