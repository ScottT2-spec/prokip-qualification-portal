'use client'

import { useState } from 'react'
import { LuShieldAlert } from 'react-icons/lu'

interface Props {
  onAccept: () => void
  buttonLabel?: string
}

export default function ExamIntegrityNotice({ onAccept, buttonLabel = 'Proceed' }: Props) {
  const [agreed, setAgreed] = useState(false)

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-[24px] shadow-[0_25px_50px_rgba(0,0,0,0.25)] max-w-lg w-full p-6 sm:p-8">
        <div className="flex items-center gap-3 mb-5">
          <div className="inline-flex items-center justify-center w-11 h-11 bg-[#F5B731]/15 rounded-xl flex-shrink-0">
            <LuShieldAlert className="w-6 h-6 text-[#F5B731]" />
          </div>
          <h2 className="text-xl font-bold text-[#1B2B4B]">Important Examination Notice</h2>
        </div>

        <div className="space-y-3 text-[15px] text-[#475569] leading-relaxed">
          <p className="font-semibold text-[#1B2B4B]">
            This qualification examination can only be taken once.
          </p>
          <p>
            Any attempt to create multiple accounts, use different email addresses,
            register multiple times, or bypass examination rules will be detected
            through our verification systems.
          </p>
          <p>
            Candidates found attempting to gain multiple attempts will be automatically
            disqualified and removed from the Prokip Agent Qualification Program.
          </p>
          <p>
            By proceeding, you agree to comply with all examination rules.
          </p>
        </div>

        <label className="flex items-start gap-3 mt-6 cursor-pointer select-none group">
          <input
            type="checkbox"
            checked={agreed}
            onChange={e => setAgreed(e.target.checked)}
            className="mt-0.5 w-5 h-5 rounded border-2 border-[#CBD5E1] text-[#1B2B4B] focus:ring-[#1B2B4B] focus:ring-offset-0 accent-[#1B2B4B] cursor-pointer"
          />
          <span className="text-sm text-[#1B2B4B] font-medium">
            I understand and agree to the examination rules.
          </span>
        </label>

        <button
          onClick={onAccept}
          disabled={!agreed}
          className="w-full mt-6 bg-[#0F1C32] text-white py-3 rounded-xl font-semibold text-[15px] hover:bg-[#1B2B4B] hover:-translate-y-0.5 disabled:opacity-40 disabled:cursor-not-allowed disabled:hover:translate-y-0 transition-all"
        >
          {buttonLabel}
        </button>
      </div>
    </div>
  )
}
