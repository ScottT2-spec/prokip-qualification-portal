'use client'

import { useState } from 'react'

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

interface Answer {
  questionId: string
  selectedOptions: string[]
  textAnswer?: string
}

interface QuestionCardProps {
  question: Question
  questionNumber: number
  answer?: Answer
  onAnswer: (questionId: string, selectedOptions: string[], textAnswer?: string) => void
}

export default function QuestionCard({ question, questionNumber, answer, onAnswer }: QuestionCardProps) {
  const [textInput, setTextInput] = useState(answer?.textAnswer || '')

  const handleOptionSelect = (optionId: string) => {
    const current = answer?.selectedOptions || []

    if (question.type === 'MULTIPLE_CHOICE' || question.type === 'TRUE_FALSE' || question.type === 'SCENARIO') {
      // Single select
      onAnswer(question.id, [optionId])
    } else if (question.type === 'MULTIPLE_ANSWERS') {
      // Multi select - toggle
      const updated = current.includes(optionId)
        ? current.filter(id => id !== optionId)
        : [...current, optionId]
      onAnswer(question.id, updated)
    }
  }

  const handleTextChange = (value: string) => {
    setTextInput(value)
    onAnswer(question.id, [], value)
  }

  const isSelected = (optionId: string) => {
    return answer?.selectedOptions?.includes(optionId) || false
  }

  const typeLabel = {
    MULTIPLE_CHOICE: 'Select one answer',
    MULTIPLE_ANSWERS: 'Select all that apply',
    TRUE_FALSE: 'True or False',
    SHORT_ANSWER: 'Type your answer',
    SCENARIO: 'Read the scenario and select the best answer',
  }[question.type] || ''

  return (
    <div className="animate-in fade-in slide-in-from-right-4 duration-300">
      {/* Scenario text if present */}
      {question.scenarioText && (
        <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 mb-4">
          <div className="flex items-start gap-2">
            <span className="text-amber-500 text-lg">📋</span>
            <div>
              <p className="text-xs font-semibold text-amber-700 uppercase tracking-wider mb-1">Scenario</p>
              <p className="text-sm text-amber-900 leading-relaxed">{question.scenarioText}</p>
            </div>
          </div>
        </div>
      )}

      {/* Question card */}
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
        <div className="p-6">
          {/* Question header */}
          <div className="flex items-start justify-between mb-4">
            <span className="inline-flex items-center px-2.5 py-1 rounded-lg bg-blue-50 text-blue-700 text-xs font-semibold">
              Q{questionNumber}
            </span>
            <span className="text-xs text-gray-400">
              {question.marks} {question.marks === 1 ? 'mark' : 'marks'}
            </span>
          </div>

          {/* Question text */}
          <h2 className="text-lg font-medium text-gray-900 leading-relaxed mb-2">
            {question.text}
          </h2>

          {/* Type hint */}
          <p className="text-xs text-gray-400 mb-6">{typeLabel}</p>

          {/* Options */}
          {question.type !== 'SHORT_ANSWER' ? (
            <div className="space-y-3">
              {question.options.map((option, index) => {
                const selected = isSelected(option.id)
                const letter = String.fromCharCode(65 + index) // A, B, C, D

                return (
                  <button
                    key={option.id}
                    onClick={() => handleOptionSelect(option.id)}
                    className={`w-full text-left p-4 rounded-xl border-2 transition-all duration-200 group ${
                      selected
                        ? 'border-blue-500 bg-blue-50 shadow-sm'
                        : 'border-gray-100 hover:border-gray-200 hover:bg-gray-50'
                    }`}
                  >
                    <div className="flex items-start gap-3">
                      <span className={`flex-shrink-0 w-8 h-8 rounded-lg flex items-center justify-center text-sm font-semibold transition-colors ${
                        selected
                          ? 'bg-blue-600 text-white'
                          : 'bg-gray-100 text-gray-500 group-hover:bg-gray-200'
                      }`}>
                        {question.type === 'MULTIPLE_ANSWERS' ? (
                          selected ? '✓' : letter
                        ) : (
                          letter
                        )}
                      </span>
                      <span className={`text-sm leading-relaxed pt-1 ${
                        selected ? 'text-blue-900 font-medium' : 'text-gray-700'
                      }`}>
                        {option.text}
                      </span>
                    </div>
                  </button>
                )
              })}
            </div>
          ) : (
            <textarea
              value={textInput}
              onChange={(e) => handleTextChange(e.target.value)}
              placeholder="Type your answer here..."
              rows={4}
              className="w-full p-4 rounded-xl border-2 border-gray-100 focus:border-blue-500 focus:ring-0 outline-none text-sm text-gray-900 placeholder-gray-400 resize-none transition-colors"
            />
          )}
        </div>
      </div>
    </div>
  )
}
