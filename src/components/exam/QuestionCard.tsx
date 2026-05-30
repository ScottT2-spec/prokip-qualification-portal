'use client'

import { useState } from 'react'

interface Option { id: string; text: string; order: number }
interface Question { id: string; text: string; type: string; marks: number; scenarioText?: string; options: Option[] }
interface Answer { questionId: string; selectedOptions: string[]; textAnswer?: string }

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
      onAnswer(question.id, [optionId])
    } else if (question.type === 'MULTIPLE_ANSWERS') {
      const updated = current.includes(optionId) ? current.filter(id => id !== optionId) : [...current, optionId]
      onAnswer(question.id, updated)
    }
  }

  const handleTextChange = (value: string) => {
    setTextInput(value)
    onAnswer(question.id, [], value)
  }

  const isSelected = (optionId: string) => answer?.selectedOptions?.includes(optionId) || false

  const typeLabel: Record<string, string> = {
    MULTIPLE_CHOICE: 'Select one answer',
    MULTIPLE_ANSWERS: 'Select all that apply',
    TRUE_FALSE: 'True or False',
    SHORT_ANSWER: 'Type your answer',
    SCENARIO: 'Read the scenario and select the best answer',
  }

  return (
    <div className="animate-in">
      {question.scenarioText && (
        <div className="bg-[#FEF3C7] border border-[#F5B731]/30 rounded-[16px] p-4 mb-4">
          <div className="flex items-start gap-2">
            <span className="text-[#F5B731] text-lg">📋</span>
            <div>
              <p className="text-xs font-semibold text-[#1B2B4B] uppercase tracking-wider mb-1">Scenario</p>
              <p className="text-sm text-[#1B2B4B]/80 leading-relaxed">{question.scenarioText}</p>
            </div>
          </div>
        </div>
      )}

      <div className="bg-white rounded-[16px] shadow-[0_1px_3px_rgba(0,0,0,0.05)] border border-[#E2E8F0] overflow-hidden">
        <div className="p-6">
          <div className="flex items-start justify-between mb-4">
            <span className="inline-flex items-center px-2.5 py-1 rounded-lg bg-[#1B2B4B] text-white text-xs font-semibold">
              Q{questionNumber}
            </span>
            <span className="text-xs text-[#94A3B8]">{question.marks} {question.marks === 1 ? 'mark' : 'marks'}</span>
          </div>

          <h2 className="text-lg font-medium text-[#1B2B4B] leading-relaxed mb-2">{question.text}</h2>
          <p className="text-xs text-[#94A3B8] mb-6">{typeLabel[question.type] || ''}</p>

          {question.type !== 'SHORT_ANSWER' ? (
            <div className="space-y-3">
              {question.options.map((option, index) => {
                const selected = isSelected(option.id)
                const letter = String.fromCharCode(65 + index)
                return (
                  <button key={option.id} onClick={() => handleOptionSelect(option.id)}
                    className={`w-full text-left p-4 rounded-xl border-2 transition-all duration-200 group ${
                      selected ? 'border-[#F5B731] bg-[#FEF3C7]/50 shadow-sm' : 'border-[#E2E8F0] hover:border-[#CBD5E1] hover:bg-[#F8FAFC]'
                    }`}>
                    <div className="flex items-start gap-3">
                      <span className={`flex-shrink-0 w-8 h-8 rounded-lg flex items-center justify-center text-sm font-semibold transition-colors ${
                        selected ? 'bg-[#F5B731] text-[#1B2B4B]' : 'bg-[#F8FAFC] text-[#94A3B8] group-hover:bg-[#E2E8F0]'
                      }`}>
                        {question.type === 'MULTIPLE_ANSWERS' ? (selected ? '✓' : letter) : letter}
                      </span>
                      <span className={`text-sm leading-relaxed pt-1 ${selected ? 'text-[#1B2B4B] font-medium' : 'text-[#1B2B4B]/70'}`}>
                        {option.text}
                      </span>
                    </div>
                  </button>
                )
              })}
            </div>
          ) : (
            <textarea value={textInput} onChange={(e) => handleTextChange(e.target.value)} placeholder="Type your answer here..." rows={4}
              className="w-full bg-[#F8FAFC] border border-[#E2E8F0] rounded-xl px-4 py-3 text-[15px] text-[#1B2B4B] outline-none transition-all focus:border-[#1B2B4B] focus:ring-[3px] focus:ring-[#1B2B4B]/10 resize-none" />
          )}
        </div>
      </div>
    </div>
  )
}
