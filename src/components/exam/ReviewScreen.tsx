'use client'

import { LuAlertTriangle } from 'react-icons/lu'

interface QuizQuestion { id: string; order: number; question: { id: string; text: string } }
interface Answer { questionId: string; selectedOptions: string[]; textAnswer?: string }

interface ReviewScreenProps {
  questions: QuizQuestion[]
  answers: Map<string, Answer>
  onGoToQuestion: (index: number) => void
  onSubmit: () => void
  onBack: () => void
  isSubmitting: boolean
}

export default function ReviewScreen({ questions, answers, onGoToQuestion, onSubmit, onBack, isSubmitting }: ReviewScreenProps) {
  const answered = questions.filter(qq => answers.has(qq.question.id))
  const unanswered = questions.filter(qq => !answers.has(qq.question.id))

  return (
    <div className="min-h-screen bg-[#F8FAFC] flex flex-col items-center justify-center p-4">
      <div className="bg-white rounded-[24px] shadow-[0_25px_50px_rgba(0,0,0,0.15)] max-w-lg w-full overflow-hidden border border-[#E2E8F0]">
        <div className="bg-[#1B2B4B] text-white p-6">
          <h2 className="text-xl font-bold">Review Your Answers</h2>
          <p className="text-[#94A3B8] text-sm mt-1">Please review before submitting</p>
        </div>

        <div className="p-6 space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div className="bg-[#28a745]/10 rounded-[16px] p-4 text-center">
              <p className="text-2xl font-bold text-[#28a745]">{answered.length}</p>
              <p className="text-xs text-[#28a745] mt-1">Answered</p>
            </div>
            <div className="bg-[#F5B731]/10 rounded-[16px] p-4 text-center">
              <p className="text-2xl font-bold text-[#F5B731]">{unanswered.length}</p>
              <p className="text-xs text-[#F5B731] mt-1">Unanswered</p>
            </div>
          </div>

          {unanswered.length > 0 && (
            <div>
              <p className="text-sm font-semibold text-[#1B2B4B] mb-2 flex items-center gap-1.5"><LuAlertTriangle className="w-4 h-4 text-[#F5B731]" /> Unanswered Questions</p>
              <div className="space-y-1 max-h-40 overflow-y-auto">
                {unanswered.map((qq) => (
                  <button key={qq.id} onClick={() => onGoToQuestion(questions.indexOf(qq))}
                    className="w-full text-left px-3 py-2 rounded-lg text-sm text-[#F5B731] bg-[#FEF3C7] hover:bg-[#F5B731]/20 transition-colors truncate">
                    Q{questions.indexOf(qq) + 1}: {qq.question.text}
                  </button>
                ))}
              </div>
            </div>
          )}

          <div className="bg-[#dc3545]/10 border border-[#dc3545]/20 rounded-xl p-4">
            <p className="text-sm text-[#dc3545] font-medium flex items-center gap-1.5"><LuAlertTriangle className="w-4 h-4 flex-shrink-0" /> Once submitted, you cannot change your answers.</p>
          </div>

          <div className="flex gap-3 pt-2">
            <button onClick={onBack}
              className="flex-1 py-3 rounded-xl text-sm font-semibold text-[#1B2B4B] bg-[#F8FAFC] border border-[#E2E8F0] hover:bg-white transition-all">
              ← Go Back
            </button>
            <button onClick={onSubmit} disabled={isSubmitting}
              className="flex-1 py-3 rounded-xl text-sm font-semibold text-[#1B2B4B] bg-[#F5B731] hover:bg-[#F5B731]/90 disabled:opacity-50 disabled:cursor-not-allowed transition-all">
              {isSubmitting ? (
                <span className="flex items-center justify-center gap-2">
                  <svg className="w-4 h-4 animate-spin" viewBox="0 0 24 24" fill="none">
                    <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" className="opacity-25" />
                    <path fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" className="opacity-75" />
                  </svg>
                  Submitting...
                </span>
              ) : 'Submit Exam ✓'}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
