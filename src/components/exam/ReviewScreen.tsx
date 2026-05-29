'use client'

interface QuizQuestion {
  id: string
  order: number
  question: {
    id: string
    text: string
  }
}

interface Answer {
  questionId: string
  selectedOptions: string[]
  textAnswer?: string
}

interface ReviewScreenProps {
  questions: QuizQuestion[]
  answers: Map<string, Answer>
  onGoToQuestion: (index: number) => void
  onSubmit: () => void
  onBack: () => void
  isSubmitting: boolean
}

export default function ReviewScreen({
  questions,
  answers,
  onGoToQuestion,
  onSubmit,
  onBack,
  isSubmitting,
}: ReviewScreenProps) {
  const answered = questions.filter(qq => answers.has(qq.question.id))
  const unanswered = questions.filter(qq => !answers.has(qq.question.id))

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50 flex flex-col items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-xl max-w-lg w-full overflow-hidden">
        <div className="bg-blue-600 text-white p-6">
          <h2 className="text-xl font-bold">Review Your Answers</h2>
          <p className="text-blue-100 text-sm mt-1">Please review before submitting</p>
        </div>

        <div className="p-6 space-y-4">
          {/* Summary */}
          <div className="grid grid-cols-2 gap-3">
            <div className="bg-green-50 rounded-xl p-4 text-center">
              <p className="text-2xl font-bold text-green-700">{answered.length}</p>
              <p className="text-xs text-green-600 mt-1">Answered</p>
            </div>
            <div className="bg-orange-50 rounded-xl p-4 text-center">
              <p className="text-2xl font-bold text-orange-700">{unanswered.length}</p>
              <p className="text-xs text-orange-600 mt-1">Unanswered</p>
            </div>
          </div>

          {/* Unanswered questions */}
          {unanswered.length > 0 && (
            <div>
              <p className="text-sm font-semibold text-gray-700 mb-2">⚠️ Unanswered Questions</p>
              <div className="space-y-1 max-h-40 overflow-y-auto">
                {unanswered.map((qq, i) => (
                  <button
                    key={qq.id}
                    onClick={() => onGoToQuestion(questions.indexOf(qq))}
                    className="w-full text-left px-3 py-2 rounded-lg text-sm text-orange-700 bg-orange-50 hover:bg-orange-100 transition-colors truncate"
                  >
                    Q{questions.indexOf(qq) + 1}: {qq.question.text}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Warning */}
          <div className="bg-red-50 border border-red-100 rounded-xl p-4">
            <p className="text-sm text-red-800 font-medium">
              ⚠️ Once submitted, you cannot change your answers.
            </p>
          </div>

          {/* Actions */}
          <div className="flex gap-3 pt-2">
            <button
              onClick={onBack}
              className="flex-1 py-3 rounded-xl text-sm font-semibold text-gray-700 bg-gray-100 hover:bg-gray-200 transition-colors"
            >
              ← Go Back
            </button>
            <button
              onClick={onSubmit}
              disabled={isSubmitting}
              className="flex-1 py-3 rounded-xl text-sm font-semibold text-white bg-green-600 hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              {isSubmitting ? (
                <span className="flex items-center justify-center gap-2">
                  <svg className="w-4 h-4 animate-spin" viewBox="0 0 24 24" fill="none">
                    <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" className="opacity-25" />
                    <path fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" className="opacity-75" />
                  </svg>
                  Submitting...
                </span>
              ) : (
                'Submit Exam ✓'
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
