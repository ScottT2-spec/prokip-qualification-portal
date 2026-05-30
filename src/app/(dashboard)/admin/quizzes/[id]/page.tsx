'use client'

import { useEffect, useState } from 'react'
import { useParams } from 'next/navigation'
import Link from 'next/link'

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
      </main>
    </div>
  )
}
