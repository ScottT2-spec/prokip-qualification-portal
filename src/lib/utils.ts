import { type ClassValue, clsx } from 'clsx'

export function cn(...inputs: ClassValue[]) {
  return inputs.filter(Boolean).join(' ')
}

export function formatTime(seconds: number): string {
  const mins = Math.floor(seconds / 60)
  const secs = seconds % 60
  return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`
}

export function generateReferralCode(state: string, managerId: string): string {
  const stateSlug = state.toLowerCase().replace(/\s+/g, '-')
  const shortId = managerId.slice(-6)
  return `${stateSlug}/${shortId}`
}

export function calculatePercentage(score: number, total: number): number {
  if (total === 0) return 0
  return Math.round((score / total) * 100 * 100) / 100
}
