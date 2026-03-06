'use client'

import { useState, useEffect, useRef, useMemo } from 'react'
import { useChat } from '@ai-sdk/react'
import { DefaultChatTransport } from 'ai'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Send,
  Bot,
  User,
  Loader2,
  Sparkles,
  MessageCircle,
} from 'lucide-react'
import { useAppStore } from '@/store/app-store'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { db } from '@/lib/local-db'

/* -------------------------------------------------------------------------- */
/*  Types                                                                     */
/* -------------------------------------------------------------------------- */

interface StoredMessage {
  id: string
  role: 'user' | 'assistant'
  content: string
  created_at: string
}

/* -------------------------------------------------------------------------- */
/*  Quick suggestion chips                                                    */
/* -------------------------------------------------------------------------- */

const SUGGESTIONS = [
  'Analyze my macros today',
  'Suggest a meal for remaining macros',
  "How's my sleep pattern?",
  'Adjust my workout plan',
  'What supplements should I take?',
]

/* -------------------------------------------------------------------------- */
/*  Helpers                                                                   */
/* -------------------------------------------------------------------------- */

function formatTimestamp(date: Date | string): string {
  return new Date(date).toLocaleTimeString('en-US', {
    hour: 'numeric',
    minute: '2-digit',
  })
}

/* -------------------------------------------------------------------------- */
/*  Chat Page                                                                 */
/* -------------------------------------------------------------------------- */

export default function ChatPage() {
  /* ── Store ─────────────────────────────────────────────────────────────── */
  const {
    profile,
    todayFood,
    recentSleep,
    supplements,
    todaySupplementLogs,
    fetchProfile,
    fetchTodayFood,
    fetchRecentSleep,
    fetchSupplements,
    fetchTodaySupplementLogs,
  } = useAppStore()

  /* ── Local state ───────────────────────────────────────────────────────── */
  const [history, setHistory] = useState<StoredMessage[]>([])
  const [historyLoaded, setHistoryLoaded] = useState(false)
  const scrollRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  /* ── Build context body for the AI ─────────────────────────────────────── */
  const foodTotals = todayFood.reduce(
    (acc, f) => ({
      calories: acc.calories + f.calories,
      protein: acc.protein + f.protein_g,
      carbs: acc.carbs + f.carbs_g,
      fats: acc.fats + f.fats_g,
    }),
    { calories: 0, protein: 0, carbs: 0, fats: 0 },
  )

  const takenIds = new Set(
    todaySupplementLogs.filter((l) => l.taken).map((l) => l.supplement_id),
  )

  const contextBody = {
    context: {
      profile: profile
        ? {
            age: profile.age,
            weight_kg: profile.weight_kg,
            height_in: profile.height_in,
            gender: profile.gender,
            activity_level: profile.activity_level,
            fitness_goal: profile.fitness_goal,
            daily_calories: profile.daily_calories,
            daily_protein: profile.daily_protein,
            daily_carbs: profile.daily_carbs,
            daily_fats: profile.daily_fats,
          }
        : null,
      todayFood: foodTotals,
      recentWorkouts: [],
      recentSleep: recentSleep.slice(0, 7).map((s) => ({
        date: s.date,
        duration_hours: s.duration_hours,
        quality: s.quality,
      })),
      supplements: supplements.map((s) => ({
        name: s.name,
        dosage: s.dosage,
        unit: s.unit,
        taken: takenIds.has(s.id),
      })),
    },
  }

  /* ── Vercel AI SDK chat hook ───────────────────────────────────────────── */
  const [chatInput, setChatInput] = useState('')

  const transport = useMemo(
    () => new DefaultChatTransport({ api: '/api/chat', body: contextBody }),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [JSON.stringify(contextBody)]
  )

  const {
    messages,
    status,
    setMessages,
    sendMessage,
  } = useChat({
    transport,
    onFinish: async ({ message: finishedMessage }) => {
      // Save assistant message to local DB
      const textContent = finishedMessage.parts
        ?.filter((p): p is { type: 'text'; text: string } => p.type === 'text')
        .map((p) => p.text)
        .join('') ?? ''
      if (textContent) {
        await db.addChatMessage({ role: 'assistant', content: textContent, context_type: 'general' })
      }
    },
  })

  const isLoading = status === 'streaming' || status === 'submitted'

  /* ── Load data on mount ────────────────────────────────────────────────── */
  useEffect(() => {
    fetchProfile()
    fetchTodayFood()
    fetchRecentSleep()
    fetchSupplements()
    fetchTodaySupplementLogs()
  }, [fetchProfile, fetchTodayFood, fetchRecentSleep, fetchSupplements, fetchTodaySupplementLogs])

  /* ── Load chat history from local storage ────────────────────────────── */
  useEffect(() => {
    async function loadHistory() {
      const rawData = db.getChatHistory(50)
      const data = rawData as unknown as StoredMessage[]

      if (data && data.length > 0) {
        setHistory(data)
        setMessages(
          data.map((m) => ({
            id: m.id,
            role: m.role as 'user' | 'assistant',
            parts: [{ type: 'text' as const, text: m.content }],
          })),
        )
      }
      setHistoryLoaded(true)
    }
    loadHistory()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  /* ── Auto-scroll to bottom ─────────────────────────────────────────────── */
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight
    }
  }, [messages, isLoading])

  /* ── Send via suggestion chip ──────────────────────────────────────────── */
  const handleSuggestion = async (text: string) => {
    await db.addChatMessage({ role: 'user', content: text, context_type: 'general' })
    sendMessage({ text })
  }

  /* ── Custom submit handler ─────────────────────────────────────────────── */
  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!chatInput.trim() || isLoading) return

    const userMsg = chatInput.trim()
    setChatInput('')

    await db.addChatMessage({ role: 'user', content: userMsg, context_type: 'general' })
    sendMessage({ text: userMsg })
  }

  /* ── Timestamp lookup for history messages ─────────────────────────────── */
  const getTimestamp = (msgId: string): string | null => {
    const found = history.find((h) => h.id === msgId)
    return found ? found.created_at : null
  }

  /* ── Determine which context items are available ───────────────────────── */
  const contextItems: string[] = []
  if (profile) contextItems.push('Profile')
  if (todayFood.length > 0) contextItems.push("Today's meals")
  if (recentSleep.length > 0) contextItems.push('Sleep')
  if (supplements.length > 0) contextItems.push('Supplements')

  const isEmpty = messages.length === 0

  /* ──────────────────────────────────────────────────────────────────────── */
  /*  Render                                                                 */
  /* ──────────────────────────────────────────────────────────────────────── */

  return (
    <div className="flex h-[100dvh] flex-col">
      {/* ── Header ───────────────────────────────────────────────────────── */}
      <header className="shrink-0 glass-dense px-4 pt-[env(safe-area-inset-top,0px)]">
        <div className="absolute inset-x-0 bottom-0 h-px bg-gradient-to-r from-transparent via-[#A78BFA]/15 to-transparent" />
        <div className="mx-auto flex h-14 max-w-lg items-center gap-3">
          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-[#A78BFA]/15 to-[#38BDF8]/10 shadow-[0_0_16px_rgba(167,139,250,0.1)]">
            <Sparkles className="h-5 w-5 text-[#A78BFA]" />
          </div>
          <div className="flex-1">
            <h1 className="font-display text-base font-semibold text-[#EAEAF0]">
              AI Coach
            </h1>
            {contextItems.length > 0 && (
              <div className="mt-0.5 flex flex-wrap gap-1">
                <span className="text-[10px] text-[#6B6B8A]">AI knows:</span>
                {contextItems.map((item) => (
                  <Badge key={item} variant="default" className="text-[9px] px-1.5 py-0">
                    {item}
                  </Badge>
                ))}
              </div>
            )}
          </div>
        </div>
      </header>

      {/* ── Messages area ────────────────────────────────────────────────── */}
      <div
        ref={scrollRef}
        className="flex-1 overflow-y-auto overscroll-contain px-4 py-4"
      >
        <div className="mx-auto max-w-lg space-y-4">
          {/* Empty state */}
          {isEmpty && historyLoaded && (
            <motion.div
              initial={{ opacity: 0, y: 20, filter: 'blur(4px)' }}
              animate={{ opacity: 1, y: 0, filter: 'blur(0px)' }}
              transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
              className="flex flex-col items-center justify-center py-20 text-center"
            >
              <div className="relative mb-6">
                <div className="flex h-20 w-20 items-center justify-center rounded-3xl bg-gradient-to-br from-[#A78BFA]/10 to-[#38BDF8]/5 ring-1 ring-[#A78BFA]/15">
                  <MessageCircle className="h-10 w-10 text-[#A78BFA]" />
                </div>
                <div className="absolute -inset-2 rounded-3xl bg-gradient-to-br from-[#A78BFA]/5 to-transparent blur-xl -z-10" />
              </div>
              <h2 className="font-display text-lg font-semibold text-[#EAEAF0]">
                Hi! I&apos;m your FitSync AI coach.
              </h2>
              <p className="mt-2 max-w-xs text-sm leading-relaxed text-[#6B6B8A]">
                Ask me anything about your nutrition, workouts, or sleep. I have
                access to your data and can give personalized advice.
              </p>
            </motion.div>
          )}

          {/* Messages */}
          <AnimatePresence initial={false}>
            {messages.map((message) => {
              const isUser = message.role === 'user'
              const ts = getTimestamp(message.id)
              const textContent = message.parts
                ?.filter((p): p is { type: 'text'; text: string } => p.type === 'text')
                .map((p) => p.text)
                .join('') ?? ''

              return (
                <motion.div
                  key={message.id}
                  initial={{ opacity: 0, y: 10, scale: 0.97 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.95 }}
                  transition={{ duration: 0.25, ease: [0.22, 1, 0.36, 1] }}
                  className={`flex gap-2.5 ${isUser ? 'flex-row-reverse' : 'flex-row'}`}
                >
                  {/* Avatar */}
                  <div
                    className={`mt-1 flex h-8 w-8 shrink-0 items-center justify-center rounded-xl ${
                      isUser
                        ? 'bg-gradient-to-br from-[#A78BFA]/20 to-[#7C3AED]/10'
                        : 'bg-white/[0.04] border border-white/[0.06]'
                    }`}
                  >
                    {isUser ? (
                      <User className="h-4 w-4 text-[#A78BFA]" />
                    ) : (
                      <Bot className="h-4 w-4 text-[#6B6B8A]" />
                    )}
                  </div>

                  {/* Bubble */}
                  <div
                    className={`max-w-[80%] rounded-2xl px-4 py-3 ${
                      isUser
                        ? 'bg-gradient-to-br from-[#A78BFA] to-[#7C3AED] text-white rounded-br-md shadow-[0_2px_16px_rgba(167,139,250,0.2)]'
                        : 'glass text-[#EAEAF0] rounded-bl-md'
                    }`}
                  >
                    <p className="whitespace-pre-wrap text-sm leading-relaxed">
                      {textContent}
                    </p>
                    {ts && (
                      <p
                        className={`mt-1.5 text-[10px] ${
                          isUser ? 'text-white/40' : 'text-[#6B6B8A]/50'
                        }`}
                      >
                        {formatTimestamp(ts)}
                      </p>
                    )}
                  </div>
                </motion.div>
              )
            })}
          </AnimatePresence>

          {/* Typing indicator */}
          {isLoading && (
            <motion.div
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              className="flex gap-2.5"
            >
              <div className="mt-1 flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-white/[0.04] border border-white/[0.06]">
                <Bot className="h-4 w-4 text-[#6B6B8A]" />
              </div>
              <div className="glass rounded-2xl rounded-bl-md px-4 py-3">
                <div className="flex items-center gap-1.5">
                  <motion.span
                    className="h-1.5 w-1.5 rounded-full bg-[#A78BFA]"
                    animate={{ opacity: [0.3, 1, 0.3], scale: [0.8, 1.1, 0.8] }}
                    transition={{ duration: 1.4, repeat: Infinity, delay: 0 }}
                  />
                  <motion.span
                    className="h-1.5 w-1.5 rounded-full bg-[#38BDF8]"
                    animate={{ opacity: [0.3, 1, 0.3], scale: [0.8, 1.1, 0.8] }}
                    transition={{ duration: 1.4, repeat: Infinity, delay: 0.2 }}
                  />
                  <motion.span
                    className="h-1.5 w-1.5 rounded-full bg-[#34D399]"
                    animate={{ opacity: [0.3, 1, 0.3], scale: [0.8, 1.1, 0.8] }}
                    transition={{ duration: 1.4, repeat: Infinity, delay: 0.4 }}
                  />
                </div>
              </div>
            </motion.div>
          )}
        </div>
      </div>

      {/* ── Bottom input area ────────────────────────────────────────────── */}
      <div className="shrink-0 glass-dense pb-[calc(70px+env(safe-area-inset-bottom,0px))]">
        <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-white/[0.06] to-transparent" />

        {/* Suggestion chips */}
        {isEmpty && historyLoaded && (
          <div className="overflow-x-auto px-4 pt-3 pb-1 scrollbar-hide">
            <div className="mx-auto flex max-w-lg gap-2">
              {SUGGESTIONS.map((suggestion) => (
                <button
                  key={suggestion}
                  onClick={() => handleSuggestion(suggestion)}
                  disabled={isLoading}
                  className="shrink-0 rounded-xl border border-white/[0.06] bg-white/[0.02] px-3.5 py-2 text-xs text-[#6B6B8A] backdrop-blur-sm transition-all duration-250 hover:border-[#A78BFA]/25 hover:text-[#EAEAF0] hover:bg-white/[0.04] active:scale-95 disabled:opacity-40"
                >
                  {suggestion}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Input form */}
        <form onSubmit={onSubmit} className="px-4 py-3">
          <div className="mx-auto flex max-w-lg items-center gap-2">
            <div className="relative flex-1">
              <input
                ref={inputRef}
                value={chatInput}
                onChange={(e) => setChatInput(e.target.value)}
                placeholder="Ask your AI coach..."
                disabled={isLoading}
                className="h-11 w-full rounded-xl border border-white/[0.08] bg-white/[0.03] px-4 pr-12 text-sm text-[#EAEAF0] placeholder:text-[#6B6B8A]/50 backdrop-blur-sm transition-all duration-250 focus:border-[#A78BFA]/30 focus:outline-none focus:ring-2 focus:ring-[#A78BFA]/15 hover:border-[#A78BFA]/20 disabled:opacity-40"
              />
            </div>
            <Button
              type="submit"
              size="default"
              disabled={!chatInput.trim() || isLoading}
              className="h-11 w-11 shrink-0 rounded-xl p-0"
            >
              {isLoading ? (
                <Loader2 className="h-5 w-5 animate-spin" />
              ) : (
                <Send className="h-5 w-5" />
              )}
            </Button>
          </div>
        </form>
      </div>
    </div>
  )
}
