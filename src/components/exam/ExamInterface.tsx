'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import { formatTime } from '@/lib/utils'
import QuestionCard from './QuestionCard'
import QuestionNavigator from './QuestionNavigator'
import ReviewScreen from './ReviewScreen'

interface Option {
  id: string
  text: string
  order: number
}

interface Question {
  id: string
  text: string
  type: string
  marks: number
  scenarioText?: string
  options: Option[]
}

interface QuizQuestion {
  id: string
  order: number
  question: Question
}

interface Quiz {
  id: string
  title: string
  duration: number
  allowBackNavigation: boolean
  randomizeOptions: boolean
  timePerQuestion?: number
  questions: QuizQuestion[]
}

interface Answer {
  questionId: string
  selectedOptions: string[]
  textAnswer?: string
}

interface ExamInterfaceProps {
  attemptId: string
  quiz: Quiz
  existingAnswers: Answer[]
  startedAt: string
  candidateName: string
}

export default function ExamInterface({
  attemptId,
  quiz,
  existingAnswers,
  startedAt,
  candidateName,
}: ExamInterfaceProps) {
  const [currentIndex, setCurrentIndex] = useState(0)
  const [answers, setAnswers] = useState<Map<string, Answer>>(new Map())
  const [timeLeft, setTimeLeft] = useState(0)
  const [showNavigator, setShowNavigator] = useState(false)
  const [showReview, setShowReview] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [submitted, setSubmitted] = useState(false)
  const [result, setResult] = useState<{ passed: boolean; percentageScore: number; showResult: boolean; showScoreOnly: boolean } | null>(null)
  const saveTimeoutRef = useRef<NodeJS.Timeout | null>(null)

  const totalQuestions = quiz.questions.length
  const currentQuestion = quiz.questions[currentIndex]

  // Initialize answers from existing
  useEffect(() => {
    const answerMap = new Map<string, Answer>()
    existingAnswers.forEach(a => {
      answerMap.set(a.questionId, a)
    })
    setAnswers(answerMap)
  }, [existingAnswers])

  // Timer
  useEffect(() => {
    const start = new Date(startedAt).getTime()
    const end = start + quiz.duration * 60 * 1000

    const tick = () => {
      const remaining = Math.max(0, Math.floor((end - Date.now()) / 1000))
      setTimeLeft(remaining)
      if (remaining <= 0) {
        handleSubmit()
      }
    }

    tick()
    const interval = setInterval(tick, 1000)
    return () => clearInterval(interval)
  }, [startedAt, quiz.duration])

  // Warn before leaving
  useEffect(() => {
    const handler = (e: BeforeUnloadEvent) => {
      if (!submitted) {
        e.preventDefault()
        e.returnValue = 'You have an active exam. Are you sure you want to leave?'
      }
    }
    window.addEventListener('beforeunload', handler)
    return () => window.removeEventListener('beforeunload', handler)
  }, [submitted])

  // Auto-save answer
  const saveAnswer = useCallback(async (questionId: string, answer: Answer) => {
    try {
      await fetch(`/api/attempts/${attemptId}/answer`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          questionId,
          selectedOptions: answer.selectedOptions,
          textAnswer: answer.textAnswer,
        }),
      })
    } catch (err) {
      console.error('Failed to save answer:', err)
    }
  }, [attemptId])

  const handleAnswer = useCallback((questionId: string, selectedOptions: string[], textAnswer?: string) => {
    const answer: Answer = { questionId, selectedOptions, textAnswer }
    setAnswers(prev => {
      const next = new Map(prev)
      next.set(questionId, answer)
      return next
    })

    // Debounced save
    if (saveTimeoutRef.current) clearTimeout(saveTimeoutRef.current)
    saveTimeoutRef.current = setTimeout(() => saveAnswer(questionId, answer), 500)
  }, [saveAnswer])

  const handleNext = () => {
    if (currentIndex < totalQuestions - 1) {
      setCurrentIndex(prev => prev + 1)
    }
  }

  const handlePrevious = () => {
    if (quiz.allowBackNavigation && currentIndex > 0) {
      setCurrentIndex(prev => prev - 1)
    }
  }

  const handleSubmit = async () => {
    if (isSubmitting) return
    setIsSubmitting(true)

    try {
      const res = await fetch(`/api/attempts/${attemptId}/submit`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
      })
      const data = await res.json()
      setSubmitted(true)
      setResult(data.result)
    } catch (err) {
      console.error('Submit failed:', err)
      setIsSubmitting(false)
    }
  }

  const answeredCount = answers.size
  const progress = totalQuestions > 0 ? Math.round((answeredCount / totalQuestions) * 100) : 0
  const isTimeCritical = timeLeft < 300 // Less than 5 minutes

  // Submitted result screen
  if (submitted && result) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50 flex items-center justify-center p-4">
        <div className="bg-white rounded-2xl shadow-xl p-8 max-w-md w-full text-center">
          <div className={`w-20 h-20 rounded-full mx-auto mb-6 flex items-center justify-center ${
            result.passed ? 'bg-green-100' : 'bg-red-100'
          }`}>
            <span className="text-4xl">{result.passed ? '🎉' : '😔'}</span>
          </div>
          <h2 className="text-2xl font-bold text-gray-900 mb-2">
            {result.passed ? 'Congratulations!' : 'Better luck next time'}
          </h2>
          {result.showResult && (
            <>
              <p className="text-gray-600 mb-4">
                {result.showScoreOnly
                  ? `You scored ${result.percentageScore}%`
                  : `Your score: ${result.percentageScore}%`}
              </p>
              <div className={`inline-block px-4 py-2 rounded-full text-sm font-semibold ${
                result.passed
                  ? 'bg-green-100 text-green-800'
                  : 'bg-red-100 text-red-800'
              }`}>
                {result.passed ? 'PASSED' : 'FAILED'}
              </div>
            </>
          )}
          {!result.showResult && (
            <p className="text-gray-600">Your result is being reviewed. You will be notified.</p>
          )}
          <button
            onClick={() => window.location.href = '/dashboard'}
            className="mt-8 w-full bg-blue-600 text-white py-3 rounded-xl font-semibold hover:bg-blue-700 transition-colors"
          >
            Back to Dashboard
          </button>
        </div>
      </div>
    )
  }

  // Review screen
  if (showReview) {
    return (
      <ReviewScreen
        questions={quiz.questions}
        answers={answers}
        onGoToQuestion={(i) => { setShowReview(false); setCurrentIndex(i) }}
        onSubmit={handleSubmit}
        onBack={() => setShowReview(false)}
        isSubmitting={isSubmitting}
      />
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50 flex flex-col">
      {/* Exam Header */}
      <header className="bg-white border-b border-gray-200 sticky top-0 z-50 shadow-sm">
        <div className="max-w-4xl mx-auto px-4 py-3">
          <div className="flex items-center justify-between">
            <div className="flex-1 min-w-0">
              <h1 className="text-sm font-semibold text-gray-900 truncate">{quiz.title}</h1>
              <p className="text-xs text-gray-500">{candidateName}</p>
            </div>
            <div className={`flex items-center gap-1 px-3 py-1.5 rounded-full text-sm font-mono font-bold ${
              isTimeCritical ? 'bg-red-100 text-red-700 animate-pulse' : 'bg-blue-100 text-blue-700'
            }`}>
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              {formatTime(timeLeft)}
            </div>
          </div>
          {/* Progress bar */}
          <div className="mt-2 flex items-center gap-3">
            <div className="flex-1 h-2 bg-gray-100 rounded-full overflow-hidden">
              <div
                className="h-full bg-blue-600 rounded-full transition-all duration-500"
                style={{ width: `${progress}%` }}
              />
            </div>
            <span className="text-xs text-gray-500 whitespace-nowrap">
              {currentIndex + 1} / {totalQuestions} · {progress}%
            </span>
          </div>
        </div>
      </header>

      {/* Question Area */}
      <main className="flex-1 max-w-4xl w-full mx-auto px-4 py-6">
        {currentQuestion && (
          <QuestionCard
            question={currentQuestion.question}
            questionNumber={currentIndex + 1}
            answer={answers.get(currentQuestion.question.id)}
            onAnswer={handleAnswer}
          />
        )}
      </main>

      {/* Navigation */}
      <footer className="bg-white border-t border-gray-200 sticky bottom-0 z-50">
        <div className="max-w-4xl mx-auto px-4 py-3">
          <div className="flex items-center justify-between gap-2">
            <button
              onClick={handlePrevious}
              disabled={!quiz.allowBackNavigation || currentIndex === 0}
              className="px-4 py-2.5 rounded-xl text-sm font-medium text-gray-700 bg-gray-100 hover:bg-gray-200 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
            >
              ← Previous
            </button>

            <button
              onClick={() => setShowNavigator(!showNavigator)}
              className="px-3 py-2.5 rounded-xl text-sm font-medium text-gray-600 hover:bg-gray-100 transition-colors"
            >
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 10h16M4 14h16M4 18h16" />
              </svg>
            </button>

            {currentIndex === totalQuestions - 1 ? (
              <button
                onClick={() => setShowReview(true)}
                className="px-6 py-2.5 rounded-xl text-sm font-semibold bg-green-600 text-white hover:bg-green-700 transition-colors"
              >
                Review & Submit
              </button>
            ) : (
              <button
                onClick={handleNext}
                className="px-6 py-2.5 rounded-xl text-sm font-semibold bg-blue-600 text-white hover:bg-blue-700 transition-colors"
              >
                Next →
              </button>
            )}
          </div>
        </div>

        {/* Question Navigator Grid */}
        {showNavigator && (
          <div className="border-t border-gray-100 px-4 py-4 bg-gray-50">
            <QuestionNavigator
              questions={quiz.questions}
              answers={answers}
              currentIndex={currentIndex}
              onSelect={(i) => {
                if (quiz.allowBackNavigation || i > currentIndex) {
                  setCurrentIndex(i)
                  setShowNavigator(false)
                }
              }}
            />
          </div>
        )}
      </footer>
    </div>
  )
}
