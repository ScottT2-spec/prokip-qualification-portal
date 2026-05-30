'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import Sidebar from './Sidebar'

interface NavItem { href: string; label: string; icon: React.ReactNode }

interface DashboardLayoutProps {
  children: React.ReactNode
  navItems: NavItem[]
  requiredRole?: string
}

export default function DashboardLayout({ children, navItems, requiredRole }: DashboardLayoutProps) {
  const router = useRouter()
  const [user, setUser] = useState<{ fullName: string; role: string } | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function checkAuth() {
      try {
        const res = await fetch('/api/auth/me')
        if (!res.ok) { router.push('/login'); return }
        const data = await res.json()
        if (requiredRole && data.user.role !== requiredRole) {
          router.push(data.user.role === 'ADMIN' ? '/admin' : data.user.role === 'STATE_MANAGER' ? '/manager' : '/dashboard')
          return
        }
        setUser(data.user)
      } catch { router.push('/login') }
      finally { setLoading(false) }
    }
    checkAuth()
  }, [router, requiredRole])

  if (loading) {
    return (
      <div className="min-h-screen bg-[#F8FAFC] flex items-center justify-center">
        <div className="w-12 h-12 border-4 border-[#E2E8F0] border-t-[#1B2B4B] rounded-full animate-spin" />
      </div>
    )
  }

  if (!user) return null

  return (
    <div className="min-h-screen bg-[#F8FAFC]">
      <Sidebar items={navItems} user={user} />
      <main className="lg:pl-64">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-6">
          {children}
        </div>
      </main>
    </div>
  )
}
