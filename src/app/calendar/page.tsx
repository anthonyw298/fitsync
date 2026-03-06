'use client'

import { useState, useEffect, useCallback, useMemo } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  ChevronLeft,
  ChevronRight,
  Dumbbell,
  UtensilsCrossed,
  Moon,
  Pill,
  ZoomIn,
  ZoomOut,
  Loader2,
} from 'lucide-react'
import Link from 'next/link'
import PageHeader from '@/components/layout/page-header'
import { Card, CardContent } from '@/components/ui/card'

/* -------------------------------------------------------------------------- */
/*  Types                                                                     */
/* -------------------------------------------------------------------------- */

interface DaySummary {
  date: string
  workout: number
  food: number
  sleep: number
  supplements: number
}

type ViewLevel = 'month' | 'week' | 'day'

const MONTHS = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December']
const MONTHS_SHORT = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']
const WEEKDAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']

const CATEGORIES = [
  { key: 'workout' as const, label: 'Workout', icon: Dumbbell, color: '#A78BFA', link: '/workout' },
  { key: 'food' as const, label: 'Diet', icon: UtensilsCrossed, color: '#34D399', link: '/food' },
  { key: 'sleep' as const, label: 'Sleep', icon: Moon, color: '#38BDF8', link: '/sleep' },
  { key: 'supplements' as const, label: 'Supps', icon: Pill, color: '#FBBF24', link: '/supplements' },
]

/* -------------------------------------------------------------------------- */
/*  Helpers                                                                   */
/* -------------------------------------------------------------------------- */

function getToday(): string {
  return new Date().toISOString().split('T')[0]
}

function getMonthStart(year: number, month: number): string {
  return `${year}-${String(month + 1).padStart(2, '0')}-01`
}

function getMonthEnd(year: number, month: number): string {
  const d = new Date(year, month + 1, 0)
  return `${year}-${String(month + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

function getWeekStart(dateStr: string): string {
  const d = new Date(dateStr + 'T12:00:00')
  const day = d.getDay()
  const diff = day === 0 ? -6 : 1 - day // Monday start
  d.setDate(d.getDate() + diff)
  return d.toISOString().split('T')[0]
}

function getWeekDates(weekStartStr: string): string[] {
  const dates: string[] = []
  const d = new Date(weekStartStr + 'T12:00:00')
  for (let i = 0; i < 7; i++) {
    dates.push(d.toISOString().split('T')[0])
    d.setDate(d.getDate() + 1)
  }
  return dates
}

function getWeeksInMonth(year: number, month: number): string[][] {
  const weeks: string[][] = []
  const firstDay = new Date(year, month, 1)
  const lastDay = new Date(year, month + 1, 0)

  // Find the Monday of the first week
  let current = new Date(firstDay)
  const dayOfWeek = current.getDay()
  const diff = dayOfWeek === 0 ? -6 : 1 - dayOfWeek
  current.setDate(current.getDate() + diff)

  while (current <= lastDay || weeks.length === 0) {
    const week: string[] = []
    for (let i = 0; i < 7; i++) {
      week.push(current.toISOString().split('T')[0])
      current.setDate(current.getDate() + 1)
    }
    weeks.push(week)
    if (current > lastDay && week[6] >= getMonthEnd(year, month)) break
  }
  return weeks
}

function formatDateNice(dateStr: string): string {
  const d = new Date(dateStr + 'T12:00:00')
  return d.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })
}

/* -------------------------------------------------------------------------- */
/*  Activity Ring (SVG circle with fill)                                      */
/* -------------------------------------------------------------------------- */

function ActivityRing({
  value,
  color,
  size = 32,
  strokeWidth = 3,
  icon: Icon,
  showIcon = true,
}: {
  value: number
  color: string
  size?: number
  strokeWidth?: number
  icon: React.ElementType
  showIcon?: boolean
}) {
  const radius = (size - strokeWidth) / 2
  const circumference = 2 * Math.PI * radius
  const filled = Math.min(1, Math.max(0, value))
  const offset = circumference * (1 - filled)

  return (
    <div className="relative flex items-center justify-center" style={{ width: size, height: size }}>
      <svg width={size} height={size} className="rotate-[-90deg]">
        {/* Background ring */}
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke="rgba(255,255,255,0.06)"
          strokeWidth={strokeWidth}
        />
        {/* Filled ring */}
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke={color}
          strokeWidth={strokeWidth}
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          strokeLinecap="round"
          className="transition-all duration-500"
          style={{ opacity: filled > 0 ? 1 : 0.15 }}
        />
      </svg>
      {showIcon && (
        <div className="absolute inset-0 flex items-center justify-center">
          <Icon size={size * 0.35} style={{ color }} strokeWidth={2} />
        </div>
      )}
    </div>
  )
}

/* -------------------------------------------------------------------------- */
/*  Mini dot for month view                                                   */
/* -------------------------------------------------------------------------- */

function MiniDots({ data }: { data: DaySummary }) {
  return (
    <div className="flex items-center gap-[2px]">
      {CATEGORIES.map((cat) => (
        <div
          key={cat.key}
          className="h-[5px] w-[5px] rounded-full transition-colors"
          style={{
            backgroundColor: data[cat.key] > 0 ? cat.color : 'rgba(255,255,255,0.06)',
            opacity: data[cat.key] > 0 ? Math.max(0.4, data[cat.key]) : 1,
          }}
        />
      ))}
    </div>
  )
}

/* -------------------------------------------------------------------------- */
/*  Page Component                                                            */
/* -------------------------------------------------------------------------- */

export default function CalendarPage() {
  const today = getToday()
  const todayParts = today.split('-')

  const [year, setYear] = useState(Number(todayParts[0]))
  const [month, setMonth] = useState(Number(todayParts[1]) - 1)
  const [selectedWeek, setSelectedWeek] = useState<string | null>(null)
  const [selectedDay, setSelectedDay] = useState<string | null>(null)
  const [view, setView] = useState<ViewLevel>('month')
  const [data, setData] = useState<Map<string, DaySummary>>(new Map())
  const [loading, setLoading] = useState(true)

  // Determine date range to fetch based on view
  const fetchRange = useMemo(() => {
    // Always fetch full month (plus overflow weeks)
    const start = new Date(year, month, 1)
    const dayOfWeek = start.getDay()
    const diff = dayOfWeek === 0 ? -6 : 1 - dayOfWeek
    start.setDate(start.getDate() + diff)

    const end = new Date(year, month + 1, 0)
    const endDay = end.getDay()
    if (endDay !== 0) end.setDate(end.getDate() + (7 - endDay))

    return {
      start: start.toISOString().split('T')[0],
      end: end.toISOString().split('T')[0],
    }
  }, [year, month])

  // Fetch data
  const fetchData = useCallback(async () => {
    setLoading(true)
    try {
      const res = await fetch(`/api/data/calendar-summary?start=${fetchRange.start}&end=${fetchRange.end}`)
      const json = await res.json()
      if (json.data) {
        const map = new Map<string, DaySummary>()
        for (const d of json.data as DaySummary[]) {
          map.set(d.date, d)
        }
        setData(map)
      }
    } catch {
      // silently fail
    } finally {
      setLoading(false)
    }
  }, [fetchRange])

  useEffect(() => {
    fetchData()
  }, [fetchData])

  // Navigation
  const prevMonth = () => {
    if (month === 0) { setYear(year - 1); setMonth(11) }
    else setMonth(month - 1)
    setView('month'); setSelectedWeek(null); setSelectedDay(null)
  }

  const nextMonth = () => {
    if (month === 11) { setYear(year + 1); setMonth(0) }
    else setMonth(month + 1)
    setView('month'); setSelectedWeek(null); setSelectedDay(null)
  }

  const goToToday = () => {
    setYear(Number(todayParts[0])); setMonth(Number(todayParts[1]) - 1)
    setView('month'); setSelectedWeek(null); setSelectedDay(null)
  }

  const drillIntoWeek = (weekStart: string) => {
    setSelectedWeek(weekStart); setSelectedDay(null); setView('week')
  }

  const drillIntoDay = (dateStr: string) => {
    setSelectedDay(dateStr); setView('day')
  }

  const zoomOut = () => {
    if (view === 'day') { setSelectedDay(null); setView('week') }
    else if (view === 'week') { setSelectedWeek(null); setView('month') }
  }

  // Weeks data for month view
  const weeks = useMemo(() => getWeeksInMonth(year, month), [year, month])

  // Week dates for week view
  const weekDates = useMemo(() => {
    if (!selectedWeek) return []
    return getWeekDates(selectedWeek)
  }, [selectedWeek])

  // Selected day data
  const dayData = selectedDay ? data.get(selectedDay) : null

  // Week summary helper
  const getWeekSummary = (weekDays: string[]) => {
    const summaries = weekDays.map((d) => data.get(d)).filter(Boolean) as DaySummary[]
    if (summaries.length === 0) return { workout: 0, food: 0, sleep: 0, supplements: 0 }
    return {
      workout: summaries.filter((s) => s.workout > 0).length,
      food: summaries.reduce((sum, s) => sum + s.food, 0) / summaries.length,
      sleep: summaries.reduce((sum, s) => sum + s.sleep, 0) / summaries.length,
      supplements: summaries.reduce((sum, s) => sum + s.supplements, 0) / summaries.length,
    }
  }

  return (
    <div className="min-h-screen pb-28">
      <PageHeader
        title="Calendar"
        subtitle={view === 'month' ? `${MONTHS[month]} ${year}` : view === 'week' ? 'Week View' : formatDateNice(selectedDay ?? today)}
      />

      <div className="mx-auto max-w-lg px-4 pt-4 space-y-4">
        {/* ── Navigation Bar ──────────────────────────────────────────────── */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-1">
            {view !== 'month' && (
              <button
                onClick={zoomOut}
                className="flex items-center gap-1 rounded-lg px-2.5 py-1.5 text-xs font-medium text-[#A78BFA] transition-colors hover:bg-[#A78BFA]/10"
              >
                <ZoomOut className="h-3.5 w-3.5" />
                Back
              </button>
            )}
          </div>

          {view === 'month' && (
            <div className="flex items-center gap-2">
              <button
                onClick={prevMonth}
                className="rounded-lg p-1.5 text-[#6B6B8A] transition-colors hover:bg-white/[0.06] hover:text-[#EAEAF0]"
              >
                <ChevronLeft className="h-5 w-5" />
              </button>
              <button
                onClick={goToToday}
                className="rounded-lg px-3 py-1.5 text-sm font-medium text-[#EAEAF0] transition-colors hover:bg-white/[0.06]"
              >
                {MONTHS[month]} {year}
              </button>
              <button
                onClick={nextMonth}
                className="rounded-lg p-1.5 text-[#6B6B8A] transition-colors hover:bg-white/[0.06] hover:text-[#EAEAF0]"
              >
                <ChevronRight className="h-5 w-5" />
              </button>
            </div>
          )}

          {view === 'month' && (
            <button
              onClick={goToToday}
              className="rounded-lg px-2.5 py-1.5 text-xs font-medium text-[#6B6B8A] transition-colors hover:bg-white/[0.06] hover:text-[#EAEAF0]"
            >
              Today
            </button>
          )}
        </div>

        {loading && (
          <div className="flex items-center justify-center py-16">
            <Loader2 className="h-6 w-6 animate-spin text-[#A78BFA]" />
          </div>
        )}

        {/* ── MONTH VIEW ──────────────────────────────────────────────────── */}
        <AnimatePresence mode="wait">
          {!loading && view === 'month' && (
            <motion.div
              key={`month-${year}-${month}`}
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              transition={{ duration: 0.2 }}
              className="space-y-1"
            >
              {/* Weekday headers */}
              <div className="grid grid-cols-7 gap-1 mb-2">
                {WEEKDAYS.map((d) => (
                  <div key={d} className="text-center text-[10px] font-medium text-[#6B6B8A] uppercase tracking-wider">
                    {d}
                  </div>
                ))}
              </div>

              {/* Week rows — clickable */}
              {weeks.map((week, wi) => {
                const weekSummary = getWeekSummary(week)
                const weekStart = week[0]
                const hasData = week.some((d) => {
                  const s = data.get(d)
                  return s && (s.workout > 0 || s.food > 0 || s.sleep > 0 || s.supplements > 0)
                })

                return (
                  <button
                    key={wi}
                    onClick={() => drillIntoWeek(weekStart)}
                    className="group flex w-full items-center gap-2 rounded-xl border border-transparent px-1 py-1.5 transition-all hover:border-white/[0.06] hover:bg-white/[0.02]"
                  >
                    {/* Day cells */}
                    <div className="grid flex-1 grid-cols-7 gap-1">
                      {week.map((dateStr) => {
                        const dayNum = Number(dateStr.split('-')[2])
                        const isCurrentMonth = Number(dateStr.split('-')[1]) - 1 === month
                        const isToday = dateStr === today
                        const dayInfo = data.get(dateStr)

                        return (
                          <div
                            key={dateStr}
                            className={`flex flex-col items-center gap-0.5 rounded-lg py-1 ${
                              isToday
                                ? 'bg-[#A78BFA]/15 ring-1 ring-[#A78BFA]/30'
                                : ''
                            }`}
                          >
                            <span
                              className={`text-xs tabular-nums ${
                                isToday
                                  ? 'font-bold text-[#A78BFA]'
                                  : isCurrentMonth
                                    ? 'text-[#EAEAF0]'
                                    : 'text-[#6B6B8A]/40'
                              }`}
                            >
                              {dayNum}
                            </span>
                            {dayInfo && isCurrentMonth && <MiniDots data={dayInfo} />}
                          </div>
                        )
                      })}
                    </div>

                    {/* Week summary indicator */}
                    <div className="flex items-center opacity-0 group-hover:opacity-100 transition-opacity">
                      <ZoomIn className="h-3.5 w-3.5 text-[#6B6B8A]" />
                    </div>
                  </button>
                )
              })}

              {/* Legend */}
              <div className="flex items-center justify-center gap-4 pt-3">
                {CATEGORIES.map((cat) => (
                  <div key={cat.key} className="flex items-center gap-1.5">
                    <div className="h-2 w-2 rounded-full" style={{ backgroundColor: cat.color }} />
                    <span className="text-[10px] text-[#6B6B8A]">{cat.label}</span>
                  </div>
                ))}
              </div>

              <p className="text-center text-[10px] text-[#6B6B8A]/60 pt-1">
                Tap a week to zoom in
              </p>
            </motion.div>
          )}

          {/* ── WEEK VIEW ─────────────────────────────────────────────────── */}
          {!loading && view === 'week' && selectedWeek && (
            <motion.div
              key={`week-${selectedWeek}`}
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              transition={{ duration: 0.2 }}
              className="space-y-2"
            >
              {/* Week date range header */}
              <div className="text-center">
                <p className="text-sm font-medium text-[#EAEAF0]">
                  {(() => {
                    const s = new Date(weekDates[0] + 'T12:00:00')
                    const e = new Date(weekDates[6] + 'T12:00:00')
                    return `${MONTHS_SHORT[s.getMonth()]} ${s.getDate()} – ${MONTHS_SHORT[e.getMonth()]} ${e.getDate()}`
                  })()}
                </p>
              </div>

              {/* Day cards */}
              <div className="space-y-2">
                {weekDates.map((dateStr, i) => {
                  const d = data.get(dateStr)
                  const dayDate = new Date(dateStr + 'T12:00:00')
                  const isToday = dateStr === today
                  const hasActivity = d && (d.workout > 0 || d.food > 0 || d.sleep > 0 || d.supplements > 0)

                  return (
                    <motion.div
                      key={dateStr}
                      initial={{ opacity: 0, y: 8 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: i * 0.03 }}
                    >
                      <button
                        onClick={() => drillIntoDay(dateStr)}
                        className={`w-full rounded-xl border p-3 text-left transition-all hover:bg-white/[0.02] ${
                          isToday
                            ? 'border-[#A78BFA]/30 bg-[#A78BFA]/[0.04]'
                            : 'border-white/[0.06]'
                        }`}
                      >
                        <div className="flex items-center justify-between">
                          {/* Day name + date */}
                          <div className="flex items-center gap-3">
                            <div className={`flex h-10 w-10 flex-col items-center justify-center rounded-lg ${
                              isToday ? 'bg-[#A78BFA]/15' : 'bg-white/[0.04]'
                            }`}>
                              <span className={`text-[10px] font-medium leading-none ${
                                isToday ? 'text-[#A78BFA]' : 'text-[#6B6B8A]'
                              }`}>
                                {WEEKDAYS[i]}
                              </span>
                              <span className={`text-sm font-bold leading-tight ${
                                isToday ? 'text-[#A78BFA]' : 'text-[#EAEAF0]'
                              }`}>
                                {dayDate.getDate()}
                              </span>
                            </div>
                            <div>
                              <p className={`text-sm font-medium ${isToday ? 'text-[#A78BFA]' : 'text-[#EAEAF0]'}`}>
                                {isToday ? 'Today' : WEEKDAYS[i]}
                              </p>
                              <p className="text-[10px] text-[#6B6B8A]">
                                {MONTHS_SHORT[dayDate.getMonth()]} {dayDate.getDate()}
                              </p>
                            </div>
                          </div>

                          {/* Activity rings */}
                          <div className="flex items-center gap-1.5">
                            {CATEGORIES.map((cat) => (
                              <ActivityRing
                                key={cat.key}
                                value={d?.[cat.key] ?? 0}
                                color={cat.color}
                                icon={cat.icon}
                                size={32}
                                strokeWidth={2.5}
                              />
                            ))}
                          </div>
                        </div>
                      </button>
                    </motion.div>
                  )
                })}
              </div>

              <p className="text-center text-[10px] text-[#6B6B8A]/60 pt-1">
                Tap a day for details
              </p>
            </motion.div>
          )}

          {/* ── DAY VIEW ──────────────────────────────────────────────────── */}
          {!loading && view === 'day' && selectedDay && (
            <motion.div
              key={`day-${selectedDay}`}
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              transition={{ duration: 0.2 }}
              className="space-y-4"
            >
              {/* Date header */}
              <div className="text-center py-2">
                <p className="text-lg font-semibold text-[#EAEAF0]">
                  {formatDateNice(selectedDay)}
                </p>
                {selectedDay === today && (
                  <span className="text-xs font-medium text-[#A78BFA]">Today</span>
                )}
              </div>

              {/* Big activity rings */}
              <Card>
                <CardContent className="py-6">
                  <div className="grid grid-cols-4 gap-4">
                    {CATEGORIES.map((cat) => {
                      const val = dayData?.[cat.key] ?? 0

                      return (
                        <Link
                          key={cat.key}
                          href={`${cat.link}${cat.key === 'food' ? `?date=${selectedDay}` : ''}`}
                          className="flex flex-col items-center gap-2 group"
                        >
                          <ActivityRing
                            value={val}
                            color={cat.color}
                            icon={cat.icon}
                            size={56}
                            strokeWidth={4}
                          />
                          <div className="text-center">
                            <p className="text-xs font-medium text-[#EAEAF0] group-hover:text-[#A78BFA] transition-colors">
                              {cat.label}
                            </p>
                            <p className="text-[10px] tabular-nums text-[#6B6B8A]">
                              {cat.key === 'workout'
                                ? val > 0 ? 'Done' : 'Rest'
                                : `${Math.round(val * 100)}%`
                              }
                            </p>
                          </div>
                        </Link>
                      )
                    })}
                  </div>
                </CardContent>
              </Card>

              {/* Detail cards */}
              <div className="space-y-2">
                {CATEGORIES.map((cat) => {
                  const val = dayData?.[cat.key] ?? 0
                  const Icon = cat.icon
                  const pct = Math.round(val * 100)

                  return (
                    <Link key={cat.key} href={`${cat.link}${cat.key === 'food' ? `?date=${selectedDay}` : ''}`}>
                      <div className="flex items-center gap-3 rounded-xl border border-white/[0.06] px-4 py-3 transition-colors hover:bg-white/[0.02]">
                        <div
                          className="flex h-9 w-9 items-center justify-center rounded-lg"
                          style={{ backgroundColor: `${cat.color}15` }}
                        >
                          <Icon size={18} style={{ color: cat.color }} />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium text-[#EAEAF0]">{cat.label}</p>
                          <p className="text-xs text-[#6B6B8A]">
                            {cat.key === 'workout'
                              ? val > 0 ? 'Workout completed' : 'No workout logged'
                              : cat.key === 'food'
                                ? `${pct}% of daily calorie target`
                                : cat.key === 'sleep'
                                  ? val > 0 ? `${(val * 8).toFixed(1)}h of sleep` : 'No sleep logged'
                                  : `${pct}% of supplements taken`
                            }
                          </p>
                        </div>
                        {/* Mini progress bar */}
                        <div className="w-16">
                          <div className="h-1.5 w-full overflow-hidden rounded-full bg-white/[0.06]">
                            <motion.div
                              className="h-full rounded-full"
                              style={{ backgroundColor: cat.color }}
                              initial={{ width: 0 }}
                              animate={{ width: `${Math.min(100, pct)}%` }}
                              transition={{ duration: 0.5, delay: 0.1 }}
                            />
                          </div>
                        </div>
                      </div>
                    </Link>
                  )
                })}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  )
}
