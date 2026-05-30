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
  const [showBulkAdd, setShowBulkAdd] = useState(false)
  const [qForm, setQForm] = useState({
    text: '', type: 'MULTIPLE_CHOICE', category: 'General', difficulty: 'MEDIUM', marks: 1, explanation: '', scenarioText: '',
    options: [{ text: '', isCorrect: false }, { text: '', isCorrect: false }, { text: '', isCorrect: false }, { text: '', isCorrect: false }],
  })
  const [saving, setSaving] = useState(false)

  // Bulk add state
  const [bulkText, setBulkText] = useState('')
  const [bulkCategory, setBulkCategory] = useState('General')
  const [bulkDifficulty, setBulkDifficulty] = useState('MEDIUM')
  const [bulkSaving, setBulkSaving] = useState(false)
  const [bulkResult, setBulkResult] = useState<string | null>(null)

  const parseBulkQuestions = (text: string) => {
    const blocks = text.split(/\n\s*\n/).filter(b => b.trim())
    return blocks.map(block => {
      const lines = block.split('\n').map(l => l.trim()).filter(Boolean)
      if (lines.length < 3) return null

      const questionText = lines[0].replace(/^\d+[\.\)]\s*/, '')
      const options: { text: string; isCorrect: boolean }[] = []
      let answerLine = ''

      for (let i = 1; i < lines.length; i++) {
        const line = lines[i]
        if (/^(Answer|Correct|Ans)[\s:]/i.test(line)) {
          answerLine = line.replace(/^(Answer|Correct|Ans)[\s:]+/i, '').trim().toUpperCase()
        } else if (/^[A-Z][\.\)]\s/.test(line)) {
          options.push({ text: line.replace(/^[A-Z][\.\)]\s*/, ''), isCorrect: false })
        }
      }

      if (answerLine && options.length > 0) {
        const answers = answerLine.split(/[,;]/).map(a => a.trim())
        answers.forEach(a => {
          const idx = a.charCodeAt(0) - 65
          if (options[idx]) options[idx].isCorrect = true
        })
      }

      if (!questionText || options.length < 2) return null
      return {
        text: questionText,
        type: options.length > 0 ? 'MULTIPLE_CHOICE' : 'SHORT_ANSWER',
        category: bulkCategory,
        difficulty: bulkDifficulty,
        marks: 1,
        options,
      }
    }).filter(Boolean)
  }

  const handleBulkAdd = async () => {
    const questions = parseBulkQuestions(bulkText)
    if (questions.length === 0) { setBulkResult('❌ No valid questions found. Check the format.'); return }
    setBulkSaving(true); setBulkResult(null)
    try {
      const res = await fetch('/api/questions/bulk', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ quizId, questions }),
      })
      const data = await res.json()
      if (res.ok) {
        setBulkResult(`✅ ${data.created || questions.length} questions added`)
        setBulkText('')
        loadQuiz()
      } else {
        setBulkResult(`❌ ${data.error}`)
      }
    } catch { setBulkResult('❌ Failed to add questions') }
    finally { setBulkSaving(false) }
  }

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
          <div className="flex gap-2">
            <button onClick={() => { setShowAddQuestion(!showAddQuestion); setShowBulkAdd(false) }} className="bg-[#F5B731] text-[#1B2B4B] px-4 py-2 rounded-xl text-sm font-semibold hover:bg-[#F5B731]/90 transition-all">+ Add Question</button>
            <button onClick={() => { setShowBulkAdd(!showBulkAdd); setShowAddQuestion(false) }} className="bg-white text-[#1B2B4B] px-4 py-2 rounded-xl text-sm font-semibold hover:bg-white/90 transition-all">📋 Bulk Add</button>
          </div>
        </div>
      </header>

      <main className="max-w-5xl mx-auto px-4 py-6">
        {bulkResult && (
          <div className={`rounded-xl p-3 mb-4 text-sm ${bulkResult.startsWith('✅') ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-700'}`}>
            {bulkResult} <button onClick={() => setBulkResult(null)} className="ml-2 underline">dismiss</button>
          </div>
        )}

        {/* Bulk Add Section */}
        {showBulkAdd && (
          <div className="bg-white rounded-[16px] border border-[#E2E8F0] shadow-[0_1px_3px_rgba(0,0,0,0.05)] p-6 mb-6">
            <h3 className="font-semibold text-[#1B2B4B] mb-1">Bulk Add Questions</h3>
            <p className="text-xs text-[#94A3B8] mb-4">Paste multiple questions in this format (separate each question with a blank line):</p>
            <div className="bg-[#F8FAFC] rounded-xl p-3 mb-4 text-xs text-[#94A3B8] font-mono whitespace-pre-line border border-[#E2E8F0]">
{`1. What is the capital of Nigeria?
A. Lagos
B. Abuja
C. Kano
D. Port Harcourt
Answer: B

2. Which river is the longest in Africa?
A. Congo
B. Nile
C. Niger
D. Zambezi
Answer: B`}
            </div>
            <div className="grid grid-cols-2 gap-4 mb-4">
              <div>
                <label className={labelClass}>Category (for all)</label>
                <input type="text" value={bulkCategory} onChange={e => setBulkCategory(e.target.value)} className={inputClass} />
              </div>
              <div>
                <label className={labelClass}>Difficulty (for all)</label>
                <select value={bulkDifficulty} onChange={e => setBulkDifficulty(e.target.value)} className={inputClass}>
                  <option value="EASY">Easy</option><option value="MEDIUM">Medium</option><option value="HARD">Hard</option>
                </select>
              </div>
            </div>
            <div className="mb-4">
              <label className={labelClass}>Paste Questions Here</label>
              <textarea
                value={bulkText}
                onChange={e => setBulkText(e.target.value)}
                rows={12}
                placeholder="Paste your questions here..."
                className={inputClass + " resize-y font-mono text-xs"}
              />
            </div>
            <div className="flex items-center gap-3">
              <button
                onClick={handleBulkAdd}
                disabled={bulkSaving || !bulkText.trim()}
                className="bg-[#0F1C32] text-white px-6 py-2.5 rounded-xl text-sm font-semibold hover:bg-[#1B2B4B] disabled:opacity-50 transition-all"
              >
                {bulkSaving ? 'Adding...' : `Add Questions`}
              </button>
              <button onClick={() => setShowBulkAdd(false)} className="px-6 py-2.5 rounded-xl text-sm text-[#1B2B4B] bg-[#F8FAFC] border border-[#E2E8F0] hover:bg-white transition-all">Cancel</button>
              {bulkText.trim() && (
                <span className="text-xs text-[#94A3B8]">{parseBulkQuestions(bulkText).length} question(s) detected</span>
              )}
            </div>
          </div>
        )}

        {/* Single Add Section */}
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
