'use client'

import { useState, useEffect, useCallback, useMemo } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  ChevronLeft,
  ChevronRight,
  CalendarDays,
  Loader2,
  X,
  UtensilsCrossed,
} from 'lucide-react'
import { useRouter } from 'next/navigation'
import {
  startOfMonth,
  endOfMonth,
  format,
  addMonths,
  subMonths,
  eachDayOfInterval,
  isSameMonth,
  isToday,
  startOfWeek,
  endOfWeek,
  isSameDay,
  startOfISOWeek,
  endOfISOWeek,
} from 'date-fns'
import { useAppStore } from '@/store/app-store'
import { Card, CardContent } from '@/components/ui/card'
import PageHeader from '@/components/layout/page-header'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { ProgressBar } from '@/components/ui/progress-bar'
import type { FoodEntry } from '@/lib/database.types'

/* -------------------------------------------------------------------------- */
/*  Types                                                                     */
/* -------------------------------------------------------------------------- */

interface DaySummary {
  date: string
  totalCalories: number
  entries: FoodEntry[]
}

/* -------------------------------------------------------------------------- */
/*  Constants                                                                 */
/* -------------------------------------------------------------------------- */

const WEEKDAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']

/* -------------------------------------------------------------------------- */
/*  Helpers                                                                   */
/* -------------------------------------------------------------------------- */

function getCalorieStatus(
  calories: number,
  target: number
): { color: string; bg: string; label: string } {
  if (calories === 0)
    return { color: 'text-[#6B6B8A]/40', bg: 'bg-white/[0.06]/40', label: 'No data' }

  const ratio = calories / target

  if (ratio >= 0.9 && ratio <= 1.1)
    return {
      color: 'text-emerald-400',
      bg: 'bg-emerald-500/20',
      label: 'On target',
    }

  if (ratio >= 0.75 && ratio < 0.9)
    return {
      color: 'text-amber-400',
      bg: 'bg-amber-500/20',
      label: 'Close',
    }

  if (ratio > 1.1 && ratio <= 1.25)
    return {
      color: 'text-amber-400',
      bg: 'bg-amber-500/20',
      label: 'Over',
    }

  return {
    color: 'text-red-400',
    bg: 'bg-red-500/20',
    label: ratio < 0.75 ? 'Under' : 'Over',
  }
}

/* -------------------------------------------------------------------------- */
/*  Main Page Component                                                       */
/* -------------------------------------------------------------------------- */

export default function FoodCalendarPage() {
  const router = useRouter()
  const { profile, fetchProfile } = useAppStore()

  const [currentMonth, setCurrentMonth] = useState(new Date())
  const [daySummaries, setDaySummaries] = useState<Record<string, DaySummary>>({})
  const [loading, setLoading] = useState(false)
  const [selectedDay, setSelectedDay] = useState<DaySummary | null>(null)
  const [detailOpen, setDetailOpen] = useState(false)

  const calorieTarget = profile?.daily_calories ?? 2500

  // Load profile
  useEffect(() => {
    if (!profile) fetchProfile()
  }, [profile, fetchProfile])

  // Calendar grid dates
  const calendarDays = useMemo(() => {
    const monthStart = startOfMonth(currentMonth)
    const monthEnd = endOfMonth(currentMonth)
    const calStart = startOfWeek(monthStart, { weekStartsOn: 0 })
    const calEnd = endOfWeek(monthEnd, { weekStartsOn: 0 })

    return eachDayOfInterval({ start: calStart, end: calEnd })
  }, [currentMonth])

  // Fetch food data for visible month
  const fetchMonthData = useCallback(async () => {
    setLoading(true)

    const startDate = format(calendarDays[0], 'yyyy-MM-dd')
    const endDate = format(calendarDays[calendarDays.length - 1], 'yyyy-MM-dd')

    try {
      const res = await fetch(`/api/data/food?start=${startDate}&end=${endDate}`)
      if (!res.ok) throw new Error('Failed to fetch')
      const json = await res.json()
      const rawData: FoodEntry[] = json.data ?? []

      const summaries: Record<string, DaySummary> = {}

      for (const entry of rawData) {
        // Normalize date from Postgres ISO format
        const key = entry.date.length > 10 ? entry.date.slice(0, 10) : entry.date
        if (!summaries[key]) {
          summaries[key] = { date: key, totalCalories: 0, entries: [] }
        }
        summaries[key].totalCalories += Number(entry.calories) || 0
        summaries[key].entries.push({ ...entry, date: key })
      }

      setDaySummaries(summaries)
    } catch (err) {
      console.error('Error fetching month data:', err)
    } finally {
      setLoading(false)
    }
  }, [calendarDays])

  useEffect(() => {
    fetchMonthData()
  }, [fetchMonthData])

  // Navigation
  const goToPreviousMonth = () => setCurrentMonth((prev) => subMonths(prev, 1))
  const goToNextMonth = () => setCurrentMonth((prev) => addMonths(prev, 1))
  const goToToday = () => setCurrentMonth(new Date())

  // Day tap handler
  const handleDayTap = (date: Date) => {
    const dateStr = format(date, 'yyyy-MM-dd')
    const summary = daySummaries[dateStr]

    if (summary && summary.entries.length > 0) {
      setSelectedDay(summary)
      setDetailOpen(true)
    } else {
      // Navigate to food page with that date
      router.push(`/food?date=${dateStr}`)
    }
  }

  // Navigate to food page from detail modal
  const navigateToFoodPage = (dateStr: string) => {
    setDetailOpen(false)
    router.push(`/food?date=${dateStr}`)
  }

  // Month stats
  const monthStats = useMemo(() => {
    const daysInMonth = eachDayOfInterval({
      start: startOfMonth(currentMonth),
      end: endOfMonth(currentMonth),
    })

    let loggedDays = 0
    let onTargetDays = 0
    let totalCalories = 0

    for (const day of daysInMonth) {
      const key = format(day, 'yyyy-MM-dd')
      const summary = daySummaries[key]
      if (summary && summary.totalCalories > 0) {
        loggedDays++
        totalCalories += summary.totalCalories
        const ratio = summary.totalCalories / calorieTarget
        if (ratio >= 0.9 && ratio <= 1.1) onTargetDays++
      }
    }

    return {
      loggedDays,
      onTargetDays,
      avgCalories: loggedDays > 0 ? Math.round(totalCalories / loggedDays) : 0,
    }
  }, [currentMonth, daySummaries, calorieTarget])

  // Weekly stats (Mon-Sun of current week)
  const weeklyStats = useMemo(() => {
    const today = new Date()
    const weekStart = startOfISOWeek(today)
    const weekEnd = endOfISOWeek(today)
    const daysOfWeek = eachDayOfInterval({ start: weekStart, end: weekEnd })

    const WEEK_LABELS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']

    let loggedDays = 0
    let totalCalories = 0
    let totalProtein = 0
    let totalCarbs = 0
    let totalFats = 0

    const dailyCalories = daysOfWeek.map((day, i) => {
      const key = format(day, 'yyyy-MM-dd')
      const summary = daySummaries[key]
      const cals = summary?.totalCalories ?? 0

      if (summary && cals > 0) {
        loggedDays++
        totalCalories += cals

        for (const entry of summary.entries) {
          totalProtein += entry.protein_g
          totalCarbs += entry.carbs_g
          totalFats += entry.fats_g
        }
      }

      return {
        label: WEEK_LABELS[i],
        calories: cals,
        date: key,
      }
    })

    const maxCal = Math.max(...dailyCalories.map((d) => d.calories), 1)

    return {
      loggedDays,
      avgCalories: loggedDays > 0 ? Math.round(totalCalories / loggedDays) : 0,
      avgProtein: loggedDays > 0 ? Math.round(totalProtein / loggedDays) : 0,
      avgCarbs: loggedDays > 0 ? Math.round(totalCarbs / loggedDays) : 0,
      avgFats: loggedDays > 0 ? Math.round(totalFats / loggedDays) : 0,
      dailyCalories,
      maxCal,
      weekRange: `${format(weekStart, 'MMM d')} – ${format(weekEnd, 'MMM d')}`,
    }
  }, [daySummaries])

  return (
    <div className="min-h-screen pb-28">
      {/* ── Header ── */}
      <PageHeader
        title="Food Calendar"
        subtitle="Monthly overview"
        rightAction={
          <Button variant="ghost" size="sm" onClick={goToToday}>
            Today
          </Button>
        }
      />

      <div className="mx-auto max-w-lg px-4 pt-4 space-y-4">
        {/* ── Month Navigation ── */}
        <div className="flex items-center justify-between">
          <Button
            variant="ghost"
            size="sm"
            onClick={goToPreviousMonth}
            aria-label="Previous month"
          >
            <ChevronLeft className="h-5 w-5" />
          </Button>

          <div className="flex items-center gap-2">
            <CalendarDays className="h-4 w-4 text-[#A78BFA]" />
            <h2 className="text-base font-semibold text-[#EAEAF0]">
              {format(currentMonth, 'MMMM yyyy')}
            </h2>
          </div>

          <Button
            variant="ghost"
            size="sm"
            onClick={goToNextMonth}
            aria-label="Next month"
          >
            <ChevronRight className="h-5 w-5" />
          </Button>
        </div>

        {/* ── Month Stats ── */}
        <div className="grid grid-cols-3 gap-3">
          <Card>
            <CardContent className="py-3 px-3 text-center">
              <p className="text-lg font-bold text-[#EAEAF0]">
                {monthStats.loggedDays}
              </p>
              <p className="text-xs text-[#6B6B8A]">Days Logged</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="py-3 px-3 text-center">
              <p className="text-lg font-bold text-emerald-400">
                {monthStats.onTargetDays}
              </p>
              <p className="text-xs text-[#6B6B8A]">On Target</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="py-3 px-3 text-center">
              <p className="text-lg font-bold text-[#A78BFA]">
                {monthStats.avgCalories.toLocaleString()}
              </p>
              <p className="text-xs text-[#6B6B8A]">Avg Cal</p>
            </CardContent>
          </Card>
        </div>

        {/* ── Legend ── */}
        <div className="flex items-center justify-center gap-4 text-xs text-[#6B6B8A]">
          <div className="flex items-center gap-1.5">
            <div className="h-2.5 w-2.5 rounded-full bg-emerald-500/60" />
            <span>On target</span>
          </div>
          <div className="flex items-center gap-1.5">
            <div className="h-2.5 w-2.5 rounded-full bg-amber-500/60" />
            <span>Close</span>
          </div>
          <div className="flex items-center gap-1.5">
            <div className="h-2.5 w-2.5 rounded-full bg-red-500/60" />
            <span>Missed</span>
          </div>
          <div className="flex items-center gap-1.5">
            <div className="h-2.5 w-2.5 rounded-full bg-white/[0.06]" />
            <span>No data</span>
          </div>
        </div>

        {/* ── Calendar Grid ── */}
        <Card className="gradient-border">
          <CardContent className="p-3">
            {/* Weekday headers */}
            <div className="grid grid-cols-7 mb-1">
              {WEEKDAYS.map((day) => (
                <div
                  key={day}
                  className="flex items-center justify-center py-2 text-xs font-medium text-[#6B6B8A]"
                >
                  {day}
                </div>
              ))}
            </div>

            {/* Loading overlay */}
            {loading && (
              <div className="flex items-center justify-center py-16">
                <Loader2 className="h-6 w-6 animate-spin text-[#A78BFA]" />
              </div>
            )}

            {/* Day cells */}
            {!loading && (
              <div className="grid grid-cols-7 gap-1">
                {calendarDays.map((date) => {
                  const dateStr = format(date, 'yyyy-MM-dd')
                  const inMonth = isSameMonth(date, currentMonth)
                  const today = isToday(date)
                  const summary = daySummaries[dateStr]
                  const calories = summary?.totalCalories ?? 0
                  const status = getCalorieStatus(calories, calorieTarget)
                  const isFuture = date > new Date()

                  return (
                    <motion.button
                      key={dateStr}
                      onClick={() => !isFuture && handleDayTap(date)}
                      disabled={isFuture}
                      className={`relative flex flex-col items-center justify-center rounded-xl py-2 px-1 transition-all ${
                        !inMonth
                          ? 'opacity-30'
                          : isFuture
                            ? 'opacity-40 cursor-default'
                            : 'cursor-pointer hover:bg-white/[0.06]/60 active:scale-95'
                      } ${
                        today
                          ? 'ring-1 ring-[#A78BFA] bg-[#A78BFA]/10'
                          : ''
                      }`}
                      whileTap={!isFuture && inMonth ? { scale: 0.92 } : undefined}
                    >
                      {/* Day number */}
                      <span
                        className={`text-xs font-medium leading-none ${
                          today
                            ? 'text-[#A78BFA]'
                            : inMonth
                              ? 'text-[#EAEAF0]'
                              : 'text-[#6B6B8A]/50'
                        }`}
                      >
                        {format(date, 'd')}
                      </span>

                      {/* Calorie indicator */}
                      {inMonth && !isFuture && (
                        <div className="mt-1 flex flex-col items-center gap-0.5">
                          <div
                            className={`h-1.5 w-1.5 rounded-full ${
                              calories > 0 ? status.bg.replace('/20', '/60') : 'bg-white/[0.06]'
                            }`}
                            style={
                              calories > 0
                                ? {
                                    backgroundColor:
                                      status.color === 'text-emerald-400'
                                        ? 'rgba(52,211,153,0.6)'
                                        : status.color === 'text-amber-400'
                                          ? 'rgba(251,191,36,0.6)'
                                          : status.color === 'text-red-400'
                                            ? 'rgba(248,113,113,0.6)'
                                            : 'rgba(255,255,255,0.06)',
                                  }
                                : undefined
                            }
                          />
                          {calories > 0 && (
                            <span
                              className={`text-[9px] tabular-nums leading-none ${status.color}`}
                            >
                              {calories >= 1000
                                ? `${(calories / 1000).toFixed(1)}k`
                                : calories}
                            </span>
                          )}
                        </div>
                      )}
                    </motion.button>
                  )
                })}
              </div>
            )}
          </CardContent>
        </Card>

        {/* ── Weekly Summary ── */}
        <Card className="gradient-border">
          <CardContent className="p-4 space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-semibold text-[#EAEAF0]">
                Weekly Summary
              </h3>
              <Badge variant="default" className="text-xs">
                {weeklyStats.weekRange}
              </Badge>
            </div>

            {/* Average stats row */}
            <div className="grid grid-cols-2 gap-3">
              <div className="rounded-xl bg-white/[0.06] px-3 py-2.5">
                <p className="text-xs text-[#6B6B8A]">Avg Daily Calories</p>
                <p className="text-lg font-bold text-[#A78BFA]">
                  {weeklyStats.avgCalories.toLocaleString()}
                </p>
              </div>
              <div className="rounded-xl bg-white/[0.06] px-3 py-2.5">
                <p className="text-xs text-[#6B6B8A]">Days Logged</p>
                <p className="text-lg font-bold text-[#EAEAF0]">
                  {weeklyStats.loggedDays}
                  <span className="text-sm font-normal text-[#6B6B8A]"> / 7</span>
                </p>
              </div>
            </div>

            {/* Average macros */}
            <div className="space-y-2.5">
              <p className="text-xs font-medium text-[#6B6B8A] uppercase tracking-wider">
                Avg Daily Macros
              </p>
              <div className="space-y-2">
                <div className="flex items-center justify-between text-xs">
                  <span className="text-[#EAEAF0]">Protein</span>
                  <span className="tabular-nums text-[#A78BFA] font-medium">
                    {weeklyStats.avgProtein}g
                  </span>
                </div>
                <ProgressBar
                  value={Math.min(100, (weeklyStats.avgProtein / (profile?.daily_protein ?? 150)) * 100)}
                  color="#A78BFA"
                  height="sm"
                />
                <div className="flex items-center justify-between text-xs">
                  <span className="text-[#EAEAF0]">Carbs</span>
                  <span className="tabular-nums text-[#38BDF8] font-medium">
                    {weeklyStats.avgCarbs}g
                  </span>
                </div>
                <ProgressBar
                  value={Math.min(100, (weeklyStats.avgCarbs / (profile?.daily_carbs ?? 250)) * 100)}
                  color="#38BDF8"
                  height="sm"
                />
                <div className="flex items-center justify-between text-xs">
                  <span className="text-[#EAEAF0]">Fats</span>
                  <span className="tabular-nums text-[#FBBF24] font-medium">
                    {weeklyStats.avgFats}g
                  </span>
                </div>
                <ProgressBar
                  value={Math.min(100, (weeklyStats.avgFats / (profile?.daily_fats ?? 80)) * 100)}
                  color="#FBBF24"
                  height="sm"
                />
              </div>
            </div>

            {/* Daily calories bar chart */}
            <div className="space-y-2.5">
              <p className="text-xs font-medium text-[#6B6B8A] uppercase tracking-wider">
                Daily Calories
              </p>
              <div className="flex items-end justify-between gap-1.5" style={{ height: 80 }}>
                {weeklyStats.dailyCalories.map((day) => {
                  const barHeight =
                    day.calories > 0
                      ? Math.max(8, (day.calories / weeklyStats.maxCal) * 100)
                      : 4
                  const isOverTarget = day.calories > calorieTarget * 1.1
                  const isOnTarget =
                    day.calories >= calorieTarget * 0.9 &&
                    day.calories <= calorieTarget * 1.1
                  const barColor = day.calories === 0
                    ? 'bg-white/[0.06]'
                    : isOnTarget
                      ? 'bg-emerald-500/60'
                      : isOverTarget
                        ? 'bg-red-400/60'
                        : 'bg-amber-400/60'

                  return (
                    <div
                      key={day.label}
                      className="flex flex-1 flex-col items-center gap-1"
                    >
                      <span className="text-[9px] tabular-nums text-[#6B6B8A]">
                        {day.calories > 0 ? day.calories : '–'}
                      </span>
                      <div
                        className={`w-full rounded-t-md transition-all ${barColor}`}
                        style={{ height: `${barHeight}%` }}
                      />
                      <span className="text-[10px] font-medium text-[#6B6B8A]">
                        {day.label}
                      </span>
                    </div>
                  )
                })}
              </div>
              {/* Target line label */}
              <div className="flex items-center justify-end gap-1.5">
                <div className="h-px w-3 bg-[#6B6B8A]/40" />
                <span className="text-[9px] text-[#6B6B8A]">
                  Target: {calorieTarget.toLocaleString()} cal
                </span>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* ── Day Detail Modal ── */}
      <AnimatePresence>
        {detailOpen && selectedDay && (
          <div className="fixed inset-0 z-50 flex items-end justify-center sm:items-center">
            {/* Backdrop */}
            <motion.div
              className="absolute inset-0 bg-black/60 backdrop-blur-sm"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setDetailOpen(false)}
            />

            {/* Panel */}
            <motion.div
              initial={{ y: '100%' }}
              animate={{
                y: 0,
                transition: { type: 'spring' as const, damping: 30, stiffness: 300 },
              }}
              exit={{
                y: '100%',
                transition: { type: 'tween' as const, duration: 0.22, ease: 'easeIn' as const },
              }}
              className="relative z-10 w-full max-w-lg rounded-t-2xl sm:rounded-2xl border border-white/[0.06] bg-[#0E0E18] shadow-[0_-8px_40px_rgba(0,0,0,0.5)] max-h-[80vh] overflow-y-auto overscroll-contain"
            >
              {/* Drag handle */}
              <div className="flex justify-center pt-3 sm:hidden">
                <div className="h-1 w-10 rounded-full bg-white/[0.06]" />
              </div>

              {/* Header */}
              <div className="sticky top-0 z-10 flex items-center justify-between border-b border-white/[0.06] bg-[#0E0E18] px-5 py-4">
                <div>
                  <h2 className="text-base font-semibold text-[#EAEAF0]">
                    {format(
                      new Date(selectedDay.date + 'T12:00:00'),
                      'EEEE, MMM d'
                    )}
                  </h2>
                  <p className="text-xs text-[#6B6B8A]">
                    {selectedDay.totalCalories.toLocaleString()} calories total
                  </p>
                </div>
                <button
                  onClick={() => setDetailOpen(false)}
                  className="rounded-lg p-1.5 text-[#6B6B8A] transition-colors hover:bg-white/[0.06] hover:text-[#EAEAF0]"
                  aria-label="Close"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>

              {/* Entries by meal */}
              <div className="p-5 space-y-4">
                {/* Macro summary */}
                <div className="grid grid-cols-4 gap-2">
                  {(() => {
                    const totals = selectedDay.entries.reduce(
                      (acc, e) => ({
                        cal: acc.cal + e.calories,
                        p: acc.p + e.protein_g,
                        c: acc.c + e.carbs_g,
                        f: acc.f + e.fats_g,
                      }),
                      { cal: 0, p: 0, c: 0, f: 0 }
                    )
                    return (
                      <>
                        <div className="rounded-lg bg-white/[0.06] px-2 py-2 text-center">
                          <p className="text-xs text-[#6B6B8A]">Cal</p>
                          <p className="text-sm font-semibold text-[#34D399]">
                            {totals.cal}
                          </p>
                        </div>
                        <div className="rounded-lg bg-white/[0.06] px-2 py-2 text-center">
                          <p className="text-xs text-[#6B6B8A]">Protein</p>
                          <p className="text-sm font-semibold text-[#A78BFA]">
                            {Math.round(totals.p)}g
                          </p>
                        </div>
                        <div className="rounded-lg bg-white/[0.06] px-2 py-2 text-center">
                          <p className="text-xs text-[#6B6B8A]">Carbs</p>
                          <p className="text-sm font-semibold text-[#38BDF8]">
                            {Math.round(totals.c)}g
                          </p>
                        </div>
                        <div className="rounded-lg bg-white/[0.06] px-2 py-2 text-center">
                          <p className="text-xs text-[#6B6B8A]">Fats</p>
                          <p className="text-sm font-semibold text-[#FBBF24]">
                            {Math.round(totals.f)}g
                          </p>
                        </div>
                      </>
                    )
                  })()}
                </div>

                {/* Entries grouped by meal */}
                {(
                  ['breakfast', 'lunch', 'dinner', 'snack'] as const
                ).map((mealType) => {
                  const mealEntries = selectedDay.entries.filter(
                    (e) => e.meal_type === mealType
                  )
                  if (mealEntries.length === 0) return null

                  const mealLabel =
                    mealType.charAt(0).toUpperCase() + mealType.slice(1)

                  return (
                    <div key={mealType}>
                      <h3 className="mb-2 text-xs font-medium uppercase tracking-wider text-[#6B6B8A]">
                        {mealLabel}
                      </h3>
                      <div className="space-y-1">
                        {mealEntries.map((entry) => (
                          <div
                            key={entry.id}
                            className="flex items-center justify-between rounded-xl bg-transparent px-3 py-2.5"
                          >
                            <div className="min-w-0 flex-1">
                              <p className="truncate text-sm font-medium text-[#EAEAF0]">
                                {entry.food_name}
                              </p>
                              <p className="text-xs text-[#6B6B8A]">
                                P {entry.protein_g}g &middot; C {entry.carbs_g}g
                                &middot; F {entry.fats_g}g
                              </p>
                            </div>
                            <span className="ml-2 text-sm font-medium tabular-nums text-[#6B6B8A]">
                              {entry.calories} cal
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )
                })}

                {/* View full day button */}
                <Button
                  variant="outline"
                  className="w-full"
                  onClick={() => navigateToFoodPage(selectedDay.date)}
                >
                  <UtensilsCrossed className="h-4 w-4 mr-2" />
                  View Full Day
                </Button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  )
}
