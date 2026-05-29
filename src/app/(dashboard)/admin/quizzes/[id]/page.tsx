'use client'

import { useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import Link from 'next/link'

interface Option {
  id: string
  text: string
  isCorrect: boolean
  order: number
}

interface Question {
  id: string
  text: string
  type: string
  category: string
  difficulty: string
  marks: number
  explanation: string
  options: Option[]
}

export default function ManageQuizPage() {
  const params = useParams()
  const router = useRouter()
  const quizId = params.id as string
  const [quiz, setQuiz] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [showAddQuestion, setShowAddQuestion] = useState(false)
  const [qForm, setQForm] = useState({
    text: '',
    type: 'MULTIPLE_CHOICE',
    category: 'General',
    difficulty: 'MEDIUM',
    marks: 1,
    explanation: '',
    scenarioText: '',
    options: [
      { text: '', isCorrect: false },
      { text: '', isCorrect: false },
      { text: '', isCorrect: false },
      { text: '', isCorrect: false },
    ],
  })
  const [saving, setSaving] = useState(false)

  const loadQuiz = async () => {
    try {
      const res = await fetch(`/api/quizzes/${quizId}`)
      if (res.ok) {
        const data = await res.json()
        setQuiz(data.quiz)
      }
    } catch {} finally { setLoading(false) }
  }

  useEffect(() => { loadQuiz() }, [quizId])

  const addQuestion = async (e: React.FormEvent) => {
    e.preventDefault()
    setSaving(true)
    try {
      const res = await fetch('/api/questions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...qForm, quizId }),
      })
      if (res.ok) {
        setShowAddQuestion(false)
        setQForm({
          text: '', type: 'MULTIPLE_CHOICE', category: 'General', difficulty: 'MEDIUM', marks: 1, explanation: '', scenarioText: '',
          options: [{ text: '', isCorrect: false }, { text: '', isCorrect: false }, { text: '', isCorrect: false }, { text: '', isCorrect: false }],
        })
        loadQuiz()
      }
    } catch {} finally { setSaving(false) }
  }

  const updateOption = (index: number, field: string, value: string | boolean) => {
    setQForm(prev => {
      const options = [...prev.options]
      options[index] = { ...options[index], [field]: value }
      // For single-choice, uncheck others
      if (field === 'isCorrect' && value === true && (prev.type === 'MULTIPLE_CHOICE' || prev.type === 'TRUE_FALSE' || prev.type === 'SCENARIO')) {
        options.forEach((o, i) => { if (i !== index) o.isCorrect = false })
      }
      return { ...prev, options }
    })
  }

  const addOption = () => {
    setQForm(prev => ({ ...prev, options: [...prev.options, { text: '', isCorrect: false }] }))
  }

  const removeOption = (index: number) => {
    if (qForm.options.length <= 2) return
    setQForm(prev => ({ ...prev, options: prev.options.filter((_, i) => i !== index) }))
  }

  if (loading) {
    return <div className="min-h-screen bg-gray-50 flex items-center justify-center"><div className="w-12 h-12 border-4 border-blue-200 border-t-blue-600 rounded-full animate-spin" /></div>
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white border-b border-gray-200">
        <div className="max-w-5xl mx-auto px-4 py-4 flex items-center justify-between">
          <div>
            <Link href="/admin/quizzes" className="text-sm text-gray-500 hover:text-gray-700">← Back to Quizzes</Link>
            <h1 className="text-lg font-bold text-gray-900 mt-1">{quiz?.title}</h1>
          </div>
          <button onClick={() => setShowAddQuestion(!showAddQuestion)} className="bg-blue-600 text-white px-4 py-2 rounded-xl text-sm font-semibold hover:bg-blue-700">
            + Add Question
          </button>
        </div>
      </header>

      <main className="max-w-5xl mx-auto px-4 py-6">
        {/* Add Question Form */}
        {showAddQuestion && (
          <div className="bg-white rounded-xl border border-gray-100 p-6 mb-6">
            <h3 className="font-semibold text-gray-900 mb-4">Add Question</h3>
            <form onSubmit={addQuestion} className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Type</label>
                  <select value={qForm.type} onChange={e => {
                    const type = e.target.value
                    let options = qForm.options
                    if (type === 'TRUE_FALSE') {
                      options = [{ text: 'True', isCorrect: false }, { text: 'False', isCorrect: false }]
                    }
                    setQForm(p => ({...p, type, options}))
                  }} className="w-full px-3 py-2.5 rounded-xl border border-gray-200 text-sm outline-none focus:border-blue-500">
                    <option value="MULTIPLE_CHOICE">Multiple Choice</option>
                    <option value="MULTIPLE_ANSWERS">Multiple Answers</option>
                    <option value="TRUE_FALSE">True/False</option>
                    <option value="SHORT_ANSWER">Short Answer</option>
                    <option value="SCENARIO">Scenario</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Category</label>
                  <input type="text" value={qForm.category} onChange={e => setQForm(p => ({...p, category: e.target.value}))} className="w-full px-3 py-2.5 rounded-xl border border-gray-200 text-sm outline-none focus:border-blue-500" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Difficulty</label>
                  <select value={qForm.difficulty} onChange={e => setQForm(p => ({...p, difficulty: e.target.value}))} className="w-full px-3 py-2.5 rounded-xl border border-gray-200 text-sm outline-none focus:border-blue-500">
                    <option value="EASY">Easy</option>
                    <option value="MEDIUM">Medium</option>
                    <option value="HARD">Hard</option>
                  </select>
                </div>
              </div>

              {qForm.type === 'SCENARIO' && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Scenario Text</label>
                  <textarea value={qForm.scenarioText} onChange={e => setQForm(p => ({...p, scenarioText: e.target.value}))} rows={3} className="w-full px-3 py-2.5 rounded-xl border border-gray-200 text-sm outline-none focus:border-blue-500 resize-none" />
                </div>
              )}

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Question</label>
                <textarea value={qForm.text} onChange={e => setQForm(p => ({...p, text: e.target.value}))} required rows={2} className="w-full px-3 py-2.5 rounded-xl border border-gray-200 text-sm outline-none focus:border-blue-500 resize-none" />
              </div>

              {qForm.type !== 'SHORT_ANSWER' && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Options</label>
                  <div className="space-y-2">
                    {qForm.options.map((opt, i) => (
                      <div key={i} className="flex items-center gap-2">
                        <input type={qForm.type === 'MULTIPLE_ANSWERS' ? 'checkbox' : 'radio'} name="correct" checked={opt.isCorrect} onChange={e => updateOption(i, 'isCorrect', e.target.checked)} className="mt-0.5" />
                        <input type="text" value={opt.text} onChange={e => updateOption(i, 'text', e.target.value)} placeholder={`Option ${String.fromCharCode(65 + i)}`} required className="flex-1 px-3 py-2 rounded-lg border border-gray-200 text-sm outline-none focus:border-blue-500" />
                        {qForm.options.length > 2 && qForm.type !== 'TRUE_FALSE' && (
                          <button type="button" onClick={() => removeOption(i)} className="text-red-400 hover:text-red-600 text-sm">✕</button>
                        )}
                      </div>
                    ))}
                  </div>
                  {qForm.type !== 'TRUE_FALSE' && (
                    <button type="button" onClick={addOption} className="text-sm text-blue-600 hover:underline mt-2">+ Add Option</button>
                  )}
                </div>
              )}

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Explanation (optional)</label>
                <input type="text" value={qForm.explanation} onChange={e => setQForm(p => ({...p, explanation: e.target.value}))} className="w-full px-3 py-2.5 rounded-xl border border-gray-200 text-sm outline-none focus:border-blue-500" />
              </div>

              <div className="flex gap-2">
                <button type="submit" disabled={saving} className="bg-blue-600 text-white px-6 py-2.5 rounded-xl text-sm font-semibold hover:bg-blue-700 disabled:opacity-50">{saving ? 'Saving...' : 'Add Question'}</button>
                <button type="button" onClick={() => setShowAddQuestion(false)} className="px-6 py-2.5 rounded-xl text-sm text-gray-600 bg-gray-100 hover:bg-gray-200">Cancel</button>
              </div>
            </form>
          </div>
        )}

        {/* Question List */}
        <h3 className="font-semibold text-gray-900 mb-3">Questions ({quiz?.questions?.length || 0})</h3>
        <div className="space-y-3">
          {quiz?.questions?.map((qq: any, i: number) => (
            <div key={qq.id} className="bg-white rounded-xl border border-gray-100 p-4">
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-xs font-semibold text-blue-600 bg-blue-50 px-2 py-0.5 rounded">Q{i + 1}</span>
                    <span className="text-xs text-gray-400">{qq.question.type} · {qq.question.difficulty} · {qq.question.marks} mark(s)</span>
                  </div>
                  <p className="text-sm text-gray-900">{qq.question.text}</p>
                  <div className="mt-2 space-y-1">
                    {qq.question.options?.map((opt: any) => (
                      <div key={opt.id} className={`text-xs px-2 py-1 rounded ${opt.isCorrect ? 'bg-green-50 text-green-700 font-medium' : 'text-gray-500'}`}>
                        {opt.isCorrect ? '✓' : '○'} {opt.text}
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </main>
    </div>
  )
}
