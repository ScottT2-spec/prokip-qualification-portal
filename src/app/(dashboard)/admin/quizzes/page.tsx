'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import {
  LuClock, LuFileText, LuUsers, LuCircleDot
} from 'react-icons/lu'

interface Quiz { id: string; title: string; description: string; status: string; duration: number; passMark: number; maxAttempts: number; createdAt: string; _count: { questions: number; attempts: number } }

export default function QuizzesPage() {
  const [quizzes, setQuizzes] = useState<Quiz[]>([])
  const [loading, setLoading] = useState(true)
  const [showCreate, setShowCreate] = useState(false)
  const [form, setForm] = useState({ title: '', description: '', duration: 30, passMark: 70, maxAttempts: 1, randomizeQuestions: false, randomizeOptions: false, allowBackNavigation: true, showResultToAgent: true, showScoreOnly: true })
  const [saving, setSaving] = useState(false)

  const loadQuizzes = async () => { try { const res = await fetch('/api/quizzes'); if (res.ok) { const data = await res.json(); setQuizzes(data.quizzes) } } catch {} finally { setLoading(false) } }
  useEffect(() => { loadQuizzes() }, [])

  const createQuiz = async (e: React.FormEvent) => {
    e.preventDefault(); setSaving(true)
    try { const res = await fetch('/api/quizzes', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(form) }); if (res.ok) { setShowCreate(false); loadQuizzes() } } catch {} finally { setSaving(false) }
  }

  const updateStatus = async (id: string, status: string) => {
    await fetch(`/api/quizzes/${id}`, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ status }) }); loadQuizzes()
  }

  const statusColors: Record<string, string> = { DRAFT: 'bg-[#E2E8F0] text-[#94A3B8]', PUBLISHED: 'bg-[#28a745]/10 text-[#28a745]', CLOSED: 'bg-[#dc3545]/10 text-[#dc3545]' }
  const inputClass = "w-full bg-[#F8FAFC] border border-[#E2E8F0] rounded-xl px-4 py-2.5 text-sm text-[#1B2B4B] outline-none transition-all focus:border-[#1B2B4B] focus:ring-[3px] focus:ring-[#1B2B4B]/10"
  const labelClass = "text-xs font-semibold tracking-wider uppercase text-[#1B2B4B] mb-1 block"

  return (
    <div className="min-h-screen bg-[#F8FAFC]">
      <header className="bg-[#1B2B4B]">
        <div className="max-w-7xl mx-auto px-4 py-4 flex items-center justify-between">
          <div><h1 className="text-lg font-bold text-white">Quiz Management</h1><p className="text-xs text-[#94A3B8]">Create and manage examinations</p></div>
          <div className="flex items-center gap-3">
            <Link href="/admin" className="text-sm text-[#94A3B8] hover:text-white transition-colors">← Dashboard</Link>
            <button onClick={() => setShowCreate(!showCreate)} className="bg-[#F5B731] text-[#1B2B4B] px-4 py-2 rounded-xl text-sm font-semibold hover:bg-[#F5B731]/90 transition-all">+ New Quiz</button>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 py-6">
        {showCreate && (
          <div className="bg-white rounded-[16px] border border-[#E2E8F0] shadow-[0_1px_3px_rgba(0,0,0,0.05)] p-6 mb-6">
            <h3 className="font-semibold text-[#1B2B4B] mb-4">Create New Quiz</h3>
            <form onSubmit={createQuiz} className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div><label className={labelClass}>Title</label><input type="text" value={form.title} onChange={e => setForm(p => ({...p, title: e.target.value}))} required className={inputClass} /></div>
                <div><label className={labelClass}>Duration (minutes)</label><input type="number" value={form.duration} onChange={e => setForm(p => ({...p, duration: parseInt(e.target.value)}))} min={1} className={inputClass} /></div>
                <div><label className={labelClass}>Pass Mark (%)</label><input type="number" value={form.passMark} onChange={e => setForm(p => ({...p, passMark: parseInt(e.target.value)}))} min={1} max={100} className={inputClass} /></div>
                <div><label className={labelClass}>Max Attempts</label><input type="number" value={form.maxAttempts} onChange={e => setForm(p => ({...p, maxAttempts: parseInt(e.target.value)}))} min={1} className={inputClass} /></div>
              </div>
              <div><label className={labelClass}>Description</label><textarea value={form.description} onChange={e => setForm(p => ({...p, description: e.target.value}))} rows={2} className={inputClass + " resize-none"} /></div>
              <div className="flex flex-wrap gap-4">
                {[{ key: 'randomizeQuestions', label: 'Randomize Questions' }, { key: 'randomizeOptions', label: 'Randomize Options' }, { key: 'allowBackNavigation', label: 'Allow Back Navigation' }, { key: 'showResultToAgent', label: 'Show Result to Agent' }].map(opt => (
                  <label key={opt.key} className="flex items-center gap-2 text-sm text-[#1B2B4B]">
                    <input type="checkbox" checked={(form as any)[opt.key]} onChange={e => setForm(p => ({...p, [opt.key]: e.target.checked}))} className="rounded accent-[#F5B731]" />{opt.label}
                  </label>
                ))}
              </div>
              <div className="flex gap-2">
                <button type="submit" disabled={saving} className="bg-[#0F1C32] text-white px-6 py-2.5 rounded-xl text-sm font-semibold hover:bg-[#1B2B4B] disabled:opacity-50 transition-all">{saving ? 'Creating...' : 'Create Quiz'}</button>
                <button type="button" onClick={() => setShowCreate(false)} className="px-6 py-2.5 rounded-xl text-sm text-[#1B2B4B] bg-[#F8FAFC] border border-[#E2E8F0] hover:bg-white transition-all">Cancel</button>
              </div>
            </form>
          </div>
        )}

        <div className="space-y-3">
          {quizzes.map(quiz => (
            <div key={quiz.id} className="bg-white rounded-[16px] border border-[#E2E8F0] shadow-[0_1px_3px_rgba(0,0,0,0.05)] p-5 hover:shadow-[0_4px_6px_rgba(0,0,0,0.07)] transition-shadow">
              <div className="flex items-start justify-between">
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <h3 className="font-semibold text-[#1B2B4B]">{quiz.title}</h3>
                    <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${statusColors[quiz.status]}`}>{quiz.status}</span>
                  </div>
                  <p className="text-sm text-[#94A3B8]">{quiz.description}</p>
                  <div className="flex gap-3 mt-2 text-xs text-[#94A3B8]">
                    <span className="inline-flex items-center gap-1"><LuClock className="w-3.5 h-3.5" /> {quiz.duration}min</span><span className="inline-flex items-center gap-1"><LuFileText className="w-3.5 h-3.5" /> {quiz._count.questions} questions</span><span className="inline-flex items-center gap-1"><LuUsers className="w-3.5 h-3.5" /> {quiz._count.attempts} attempts</span><span className="inline-flex items-center gap-1"><LuCircleDot className="w-3.5 h-3.5" /> Pass: {quiz.passMark}%</span>
                  </div>
                </div>
                <div className="flex gap-2">
                  <Link href={`/admin/quizzes/${quiz.id}`} className="text-sm text-[#F5B731] font-semibold hover:underline">Manage</Link>
                  {quiz.status === 'DRAFT' && <button onClick={() => updateStatus(quiz.id, 'PUBLISHED')} className="text-sm text-[#28a745] font-semibold hover:underline">Publish</button>}
                  {quiz.status === 'PUBLISHED' && <button onClick={() => updateStatus(quiz.id, 'CLOSED')} className="text-sm text-[#dc3545] font-semibold hover:underline">Close</button>}
                </div>
              </div>
            </div>
          ))}
          {!loading && quizzes.length === 0 && <div className="text-center py-12 text-[#94A3B8]"><p className="flex justify-center mb-2"><LuFileText className="w-10 h-10" /></p><p>No quizzes yet. Create your first one!</p></div>}
        </div>
      </main>
    </div>
  )
}
