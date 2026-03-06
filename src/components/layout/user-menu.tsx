'use client'

import { useState, useEffect, useRef } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { motion, AnimatePresence } from 'framer-motion'
import { User, LogOut, Settings, ChevronDown } from 'lucide-react'

interface AuthUser {
  userId: string
  email: string
}

export default function UserMenu() {
  const router = useRouter()
  const [user, setUser] = useState<AuthUser | null>(null)
  const [open, setOpen] = useState(false)
  const [loggingOut, setLoggingOut] = useState(false)
  const menuRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    fetch('/api/auth/me')
      .then((r) => (r.ok ? r.json() : null))
      .then((data) => {
        if (data?.user) setUser(data.user)
      })
      .catch(() => {})
  }, [])

  // Close on outside click
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setOpen(false)
      }
    }
    if (open) document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [open])

  const handleLogout = async () => {
    setLoggingOut(true)
    try {
      await fetch('/api/auth/logout', { method: 'POST' })
      router.push('/login')
    } catch {
      setLoggingOut(false)
    }
  }

  if (!user) return null

  const initials = user.email
    .split('@')[0]
    .slice(0, 2)
    .toUpperCase()

  return (
    <div ref={menuRef} className="relative">
      <button
        onClick={() => setOpen(!open)}
        className="flex items-center gap-1.5 rounded-xl px-2 py-1.5 transition-colors hover:bg-white/[0.06]"
      >
        <div className="flex h-7 w-7 items-center justify-center rounded-full bg-[#A78BFA]/20 text-xs font-bold text-[#A78BFA]">
          {initials}
        </div>
        <ChevronDown
          className={`h-3.5 w-3.5 text-[#6B6B8A] transition-transform duration-200 ${open ? 'rotate-180' : ''}`}
        />
      </button>

      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, y: -8, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -8, scale: 0.95 }}
            transition={{ duration: 0.15 }}
            className="absolute right-0 top-full z-50 mt-2 w-56 overflow-hidden rounded-xl border border-white/[0.06] bg-[#13131A] shadow-xl shadow-black/40"
          >
            {/* User info */}
            <div className="border-b border-white/[0.06] px-4 py-3">
              <div className="flex items-center gap-2.5">
                <div className="flex h-9 w-9 items-center justify-center rounded-full bg-[#A78BFA]/20 text-sm font-bold text-[#A78BFA]">
                  {initials}
                </div>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium text-[#EAEAF0]">
                    {user.email.split('@')[0]}
                  </p>
                  <p className="truncate text-[11px] text-[#6B6B8A]">
                    {user.email}
                  </p>
                </div>
              </div>
            </div>

            {/* Menu items */}
            <div className="py-1.5">
              <Link
                href="/profile"
                onClick={() => setOpen(false)}
                className="flex items-center gap-2.5 px-4 py-2.5 text-sm text-[#EAEAF0] transition-colors hover:bg-white/[0.04]"
              >
                <Settings className="h-4 w-4 text-[#6B6B8A]" />
                Profile & Settings
              </Link>

              <button
                onClick={handleLogout}
                disabled={loggingOut}
                className="flex w-full items-center gap-2.5 px-4 py-2.5 text-sm text-red-400 transition-colors hover:bg-red-500/[0.06] disabled:opacity-50"
              >
                <LogOut className="h-4 w-4" />
                {loggingOut ? 'Signing out...' : 'Sign Out'}
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
