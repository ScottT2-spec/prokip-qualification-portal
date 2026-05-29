'use client'

interface QuizQuestion {
  id: string
  order: number
  question: {
    id: string
  }
}

interface Answer {
  questionId: string
  selectedOptions: string[]
  textAnswer?: string
}

interface QuestionNavigatorProps {
  questions: QuizQuestion[]
  answers: Map<string, Answer>
  currentIndex: number
  onSelect: (index: number) => void
}

export default function QuestionNavigator({
  questions,
  answers,
  currentIndex,
  onSelect,
}: QuestionNavigatorProps) {
  return (
    <div>
      <p className="text-xs text-gray-500 mb-3 font-medium">Question Navigator</p>
      <div className="grid grid-cols-8 sm:grid-cols-10 gap-2">
        {questions.map((qq, index) => {
          const isAnswered = answers.has(qq.question.id)
          const isCurrent = index === currentIndex

          return (
            <button
              key={qq.id}
              onClick={() => onSelect(index)}
              className={`w-9 h-9 rounded-lg text-xs font-semibold transition-all duration-200 ${
                isCurrent
                  ? 'bg-blue-600 text-white shadow-md scale-110'
                  : isAnswered
                    ? 'bg-green-500 text-white'
                    : 'bg-gray-200 text-gray-600 hover:bg-gray-300'
              }`}
            >
              {index + 1}
            </button>
          )
        })}
      </div>
      <div className="flex items-center gap-4 mt-3 text-xs text-gray-500">
        <span className="flex items-center gap-1">
          <span className="w-3 h-3 rounded bg-blue-600" /> Current
        </span>
        <span className="flex items-center gap-1">
          <span className="w-3 h-3 rounded bg-green-500" /> Answered
        </span>
        <span className="flex items-center gap-1">
          <span className="w-3 h-3 rounded bg-gray-200" /> Unanswered
        </span>
      </div>
    </div>
  )
}
