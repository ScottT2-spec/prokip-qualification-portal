'use client'

import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { useState } from 'react'
import { LuChartBar, LuFileText, LuCircleHelp, LuUsers, LuTrendingUp, LuLogOut, LuGraduationCap, LuMenu, LuX } from 'react-icons/lu'

interface NavItem {
  href: string
  label: string
  icon: React.ReactNode
}

interface SidebarProps {
  items: NavItem[]
  user: { fullName: string; role: string }
}

export default function Sidebar({ items, user }: SidebarProps) {
  const pathname = usePathname()
  const router = useRouter()
  const [mobileOpen, setMobileOpen] = useState(false)

  const handleLogout = async () => {
    await fetch('/api/auth/logout', { method: 'POST' })
    router.push('/login')
  }

  const roleLabel: Record<string, string> = {
    ADMIN: 'Administrator',
    STATE_MANAGER: 'State Manager',
    AGENT: 'Agent',
  }

  const nav = (
    <div className="flex flex-col h-full">
      {/* Logo */}
      <div className="px-5 py-6 border-b border-white/10">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-[#F5B731]/15 flex items-center justify-center">
            <LuGraduationCap className="w-5 h-5 text-[#F5B731]" />
          </div>
          <div>
            <h1 className="text-sm font-bold text-white">Prokip</h1>
            <p className="text-[10px] text-[#94A3B8] uppercase tracking-wider">Qualification Portal</p>
          </div>
        </div>
      </div>

      {/* Nav Items */}
      <nav className="flex-1 px-3 py-4 space-y-1 overflow-y-auto">
        {items.map(item => {
          const isActive = pathname === item.href
          return (
            <Link key={item.href} href={item.href} onClick={() => setMobileOpen(false)}
              className={`flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all ${
                isActive
                  ? 'bg-[#F5B731] text-[#1B2B4B] shadow-sm'
                  : 'text-[#94A3B8] hover:text-white hover:bg-white/5'
              }`}>
              <span className="text-base">{item.icon}</span>
              {item.label}
            </Link>
          )
        })}
      </nav>

      {/* User + Logout */}
      <div className="px-3 py-4 border-t border-white/10">
        <div className="px-3 py-2">
          <p className="text-sm font-medium text-white truncate">{user.fullName}</p>
          <p className="text-[11px] text-[#94A3B8]">{roleLabel[user.role] || user.role}</p>
        </div>
        <button onClick={handleLogout}
          className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium text-[#94A3B8] hover:text-white hover:bg-white/5 transition-all mt-1">
          <LuLogOut className="w-4 h-4" /> Sign Out
        </button>
      </div>
    </div>
  )

  return (
    <>
      {/* Desktop sidebar */}
      <aside className="hidden lg:flex lg:w-64 lg:flex-col lg:fixed lg:inset-y-0 bg-[#0F1C32]">
        {nav}
      </aside>

      {/* Mobile header */}
      <div className="lg:hidden sticky top-0 z-50 bg-[#1B2B4B] border-b border-white/10">
        <div className="flex items-center justify-between px-4 py-3">
          <div className="flex items-center gap-2">
            <LuGraduationCap className="w-5 h-5 text-[#F5B731]" />
            <span className="text-sm font-bold text-white">Prokip</span>
          </div>
          <button onClick={() => setMobileOpen(!mobileOpen)} className="text-white p-1">
            {mobileOpen ? <LuX className="w-6 h-6" /> : <LuMenu className="w-6 h-6" />}
          </button>
        </div>
      </div>

      {/* Mobile overlay */}
      {mobileOpen && (
        <>
          <div className="lg:hidden fixed inset-0 z-40 bg-black/50" onClick={() => setMobileOpen(false)} />
          <div className="lg:hidden fixed inset-y-0 left-0 z-50 w-64 bg-[#0F1C32]">
            {nav}
          </div>
        </>
      )}
    </>
  )
}
