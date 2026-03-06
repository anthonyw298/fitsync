'use client'

import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Mail, Lock, LogIn, UserPlus, Activity, AlertCircle, Sparkles } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'

type Mode = 'login' | 'signup'

/* ── animation helpers ─────────────────────────────────── */
const stagger = {
  hidden: {},
  show: { transition: { staggerChildren: 0.08, delayChildren: 0.25 } },
}

const fadeUp = {
  hidden: { opacity: 0, y: 18, filter: 'blur(6px)' },
  show: {
    opacity: 1,
    y: 0,
    filter: 'blur(0px)',
    transition: { duration: 0.5, ease: [0.22, 1, 0.36, 1] as const },
  },
}

const scaleIn = {
  hidden: { opacity: 0, scale: 0.85 },
  show: {
    opacity: 1,
    scale: 1,
    transition: { duration: 0.6, ease: [0.22, 1, 0.36, 1] as const },
  },
}

export default function LoginPage() {
  const [mode, setMode] = useState<Mode>('login')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')

    if (!email || !password) {
      setError('Email and password are required')
      return
    }
    if (mode === 'signup' && password !== confirmPassword) {
      setError('Passwords do not match')
      return
    }
    if (mode === 'signup' && password.length < 6) {
      setError('Password must be at least 6 characters')
      return
    }

    setLoading(true)

    try {
      const endpoint = mode === 'login' ? '/api/auth/login' : '/api/auth/signup'
      const res = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      })

      const data = await res.json()

      if (!res.ok) {
        setError(data.error || 'Something went wrong')
        setLoading(false)
        return
      }

      // Redirect to dashboard
      window.location.href = '/'
    } catch {
      setError('Network error. Please try again.')
      setLoading(false)
    }
  }

  return (
    <div className="relative flex min-h-screen items-center justify-center bg-transparent px-4 overflow-hidden">
      {/* ── Decorative background orb ────────────────────── */}
      <div
        aria-hidden
        className="pointer-events-none absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2"
      >
        {/* Outer pulsing ring */}
        <motion.div
          initial={{ opacity: 0, scale: 0.6 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 1.2, ease: 'easeOut' }}
          className="absolute inset-0 -m-40 rounded-full"
          style={{
            background:
              'conic-gradient(from 180deg, rgba(167,139,250,0.06), rgba(56,189,248,0.04), rgba(52,211,153,0.06), rgba(167,139,250,0.06))',
          }}
        />
        <motion.div
          animate={{ rotate: 360 }}
          transition={{ duration: 60, repeat: Infinity, ease: 'linear' }}
          className="h-[520px] w-[520px] rounded-full opacity-[0.07]"
          style={{
            background:
              'conic-gradient(from 0deg, #A78BFA, #38BDF8, #34D399, #FBBF24, #A78BFA)',
            filter: 'blur(60px)',
          }}
        />
      </div>

      {/* ── Main card ────────────────────────────────────── */}
      <motion.div
        variants={stagger}
        initial="hidden"
        animate="show"
        className="relative z-10 w-full max-w-sm"
      >
        {/* ── Logo area ──────────────────────────────────── */}
        <motion.div variants={scaleIn} className="mb-10 text-center">
          {/* Glow behind icon */}
          <div className="relative mx-auto mb-5 h-20 w-20">
            <div
              className="absolute inset-0 rounded-2xl"
              style={{
                background:
                  'radial-gradient(circle at center, rgba(167,139,250,0.35) 0%, rgba(124,58,237,0.15) 50%, transparent 75%)',
                filter: 'blur(16px)',
                transform: 'scale(1.6)',
              }}
            />
            <div className="glass-dense relative flex h-20 w-20 items-center justify-center rounded-2xl glow-primary">
              <Activity className="h-9 w-9 text-[#A78BFA]" />
            </div>
          </div>

          <h1 className="text-gradient font-display text-3xl font-bold tracking-tight">
            FitSync
          </h1>
          <p className="mt-2 text-sm text-[#6B6B8A]">
            Your AI-powered fitness companion
          </p>
        </motion.div>

        {/* ── Tab switcher ───────────────────────────────── */}
        <motion.div variants={fadeUp} className="mb-6">
          <div className="glass flex rounded-2xl p-1.5">
            {(['login', 'signup'] as Mode[]).map((m) => (
              <button
                key={m}
                type="button"
                onClick={() => {
                  setMode(m)
                  setError('')
                }}
                className={`relative flex-1 rounded-xl py-2.5 text-sm font-semibold transition-all duration-300 ${
                  mode === m ? 'text-white' : 'text-[#6B6B8A] hover:text-[#EAEAF0]'
                }`}
              >
                {mode === m && (
                  <motion.div
                    layoutId="activeTab"
                    className="absolute inset-0 rounded-xl"
                    style={{
                      background:
                        'linear-gradient(135deg, #A78BFA 0%, #7C3AED 100%)',
                      boxShadow:
                        '0 4px 20px rgba(167,139,250,0.35), inset 0 1px 0 rgba(255,255,255,0.12)',
                    }}
                    transition={{
                      type: 'spring',
                      stiffness: 400,
                      damping: 30,
                    }}
                  />
                )}
                <span className="relative z-10">
                  {m === 'login' ? 'Sign In' : 'Sign Up'}
                </span>
              </button>
            ))}
          </div>
        </motion.div>

        {/* ── Form card ──────────────────────────────────── */}
        <motion.div variants={fadeUp}>
          <div className="glass gradient-border rounded-2xl p-5">
            <form onSubmit={handleSubmit} className="space-y-4">
              {/* Email */}
              <motion.div variants={fadeUp} className="flex items-start gap-3">
                <div className="mt-7 flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-white/[0.04] border border-white/[0.06]">
                  <Mail className="h-5 w-5 text-[#6B6B8A]" />
                </div>
                <Input
                  label="Email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="you@example.com"
                  autoComplete="email"
                />
              </motion.div>

              {/* Password */}
              <motion.div variants={fadeUp} className="flex items-start gap-3">
                <div className="mt-7 flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-white/[0.04] border border-white/[0.06]">
                  <Lock className="h-5 w-5 text-[#6B6B8A]" />
                </div>
                <Input
                  label="Password"
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="At least 6 characters"
                  autoComplete={
                    mode === 'login' ? 'current-password' : 'new-password'
                  }
                />
              </motion.div>

              {/* Confirm Password */}
              <AnimatePresence>
                {mode === 'signup' && (
                  <motion.div
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: 'auto', opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    transition={{ duration: 0.3, ease: [0.22, 1, 0.36, 1] }}
                    className="overflow-hidden"
                  >
                    <div className="flex items-start gap-3">
                      <div className="mt-7 flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-white/[0.04] border border-white/[0.06]">
                        <Lock className="h-5 w-5 text-[#6B6B8A]" />
                      </div>
                      <Input
                        label="Confirm Password"
                        type="password"
                        value={confirmPassword}
                        onChange={(e) => setConfirmPassword(e.target.value)}
                        placeholder="Repeat your password"
                        autoComplete="new-password"
                      />
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>

              {/* Error */}
              <AnimatePresence>
                {error && (
                  <motion.div
                    initial={{ opacity: 0, y: -4 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0 }}
                    className="flex items-center gap-2 rounded-xl border border-red-500/20 bg-red-500/10 px-4 py-3"
                  >
                    <AlertCircle className="h-4 w-4 shrink-0 text-red-400" />
                    <p className="text-sm text-red-400">{error}</p>
                  </motion.div>
                )}
              </AnimatePresence>

              {/* Submit */}
              <motion.div variants={fadeUp}>
                <Button
                  type="submit"
                  size="lg"
                  className="w-full"
                  disabled={loading}
                >
                  {loading ? (
                    <motion.div
                      animate={{ rotate: 360 }}
                      transition={{
                        duration: 1,
                        repeat: Infinity,
                        ease: 'linear',
                      }}
                    >
                      <Activity className="h-5 w-5" />
                    </motion.div>
                  ) : mode === 'login' ? (
                    <>
                      <LogIn className="h-5 w-5" />
                      Sign In
                    </>
                  ) : (
                    <>
                      <UserPlus className="h-5 w-5" />
                      Create Account
                    </>
                  )}
                </Button>
              </motion.div>
            </form>
          </div>
        </motion.div>

        {/* ── Footer ─────────────────────────────────────── */}
        <motion.p
          variants={fadeUp}
          className="mt-8 flex items-center justify-center gap-1.5 text-xs text-[#6B6B8A]/60"
        >
          <Sparkles className="h-3 w-3" />
          Powered by AI
        </motion.p>
      </motion.div>
    </div>
  )
}
