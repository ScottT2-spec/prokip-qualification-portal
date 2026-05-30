'use client'

interface QuizQuestion { id: string; order: number; question: { id: string } }
interface Answer { questionId: string; selectedOptions: string[]; textAnswer?: string }

interface QuestionNavigatorProps {
  questions: QuizQuestion[]
  answers: Map<string, Answer>
  currentIndex: number
  onSelect: (index: number) => void
}

export default function QuestionNavigator({ questions, answers, currentIndex, onSelect }: QuestionNavigatorProps) {
  return (
    <div>
      <p className="text-xs text-[#94A3B8] mb-3 font-semibold uppercase tracking-wider">Question Navigator</p>
      <div className="grid grid-cols-8 sm:grid-cols-10 gap-2">
        {questions.map((qq, index) => {
          const isAnswered = answers.has(qq.question.id)
          const isCurrent = index === currentIndex
          return (
            <button key={qq.id} onClick={() => onSelect(index)}
              className={`w-9 h-9 rounded-lg text-xs font-semibold transition-all duration-200 ${
                isCurrent ? 'bg-[#F5B731] text-[#1B2B4B] shadow-md scale-110'
                  : isAnswered ? 'bg-[#28a745] text-white'
                    : 'bg-[#E2E8F0] text-[#94A3B8] hover:bg-[#CBD5E1]'
              }`}>
              {index + 1}
            </button>
          )
        })}
      </div>
      <div className="flex items-center gap-4 mt-3 text-xs text-[#94A3B8]">
        <span className="flex items-center gap-1"><span className="w-3 h-3 rounded bg-[#F5B731]" /> Current</span>
        <span className="flex items-center gap-1"><span className="w-3 h-3 rounded bg-[#28a745]" /> Answered</span>
        <span className="flex items-center gap-1"><span className="w-3 h-3 rounded bg-[#E2E8F0]" /> Unanswered</span>
      </div>
    </div>
  )
}
