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
} from 'date-fns'
import { useAppStore } from '@/store/app-store'
import { db } from '@/lib/local-db'
import { Card, CardContent } from '@/components/ui/card'
import PageHeader from '@/components/layout/page-header'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
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
    return { color: 'text-[#8888A0]/40', bg: 'bg-[#1E1E2E]/40', label: 'No data' }

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
      const rawData = db.getFoodByDateRange(startDate, endDate)

      const summaries: Record<string, DaySummary> = {}

      for (const raw of rawData || []) {
        const entry = raw as unknown as FoodEntry
        const key = entry.date as string
        if (!summaries[key]) {
          summaries[key] = { date: key, totalCalories: 0, entries: [] }
        }
        summaries[key].totalCalories += Number(entry.calories) || 0
        summaries[key].entries.push(entry)
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

  return (
    <div className="min-h-screen bg-[#0A0A0F] pb-28">
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
            <CalendarDays className="h-4 w-4 text-[#8B5CF6]" />
            <h2 className="text-base font-semibold text-[#F1F1F3]">
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
              <p className="text-lg font-bold text-[#F1F1F3]">
                {monthStats.loggedDays}
              </p>
              <p className="text-xs text-[#8888A0]">Days Logged</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="py-3 px-3 text-center">
              <p className="text-lg font-bold text-emerald-400">
                {monthStats.onTargetDays}
              </p>
              <p className="text-xs text-[#8888A0]">On Target</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="py-3 px-3 text-center">
              <p className="text-lg font-bold text-[#8B5CF6]">
                {monthStats.avgCalories.toLocaleString()}
              </p>
              <p className="text-xs text-[#8888A0]">Avg Cal</p>
            </CardContent>
          </Card>
        </div>

        {/* ── Legend ── */}
        <div className="flex items-center justify-center gap-4 text-xs text-[#8888A0]">
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
            <div className="h-2.5 w-2.5 rounded-full bg-[#1E1E2E]" />
            <span>No data</span>
          </div>
        </div>

        {/* ── Calendar Grid ── */}
        <Card>
          <CardContent className="p-3">
            {/* Weekday headers */}
            <div className="grid grid-cols-7 mb-1">
              {WEEKDAYS.map((day) => (
                <div
                  key={day}
                  className="flex items-center justify-center py-2 text-xs font-medium text-[#8888A0]"
                >
                  {day}
                </div>
              ))}
            </div>

            {/* Loading overlay */}
            {loading && (
              <div className="flex items-center justify-center py-16">
                <Loader2 className="h-6 w-6 animate-spin text-[#8B5CF6]" />
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
                            : 'cursor-pointer hover:bg-[#1E1E2E]/60 active:scale-95'
                      } ${
                        today
                          ? 'ring-1 ring-[#8B5CF6] bg-[#8B5CF6]/10'
                          : ''
                      }`}
                      whileTap={!isFuture && inMonth ? { scale: 0.92 } : undefined}
                    >
                      {/* Day number */}
                      <span
                        className={`text-xs font-medium leading-none ${
                          today
                            ? 'text-[#8B5CF6]'
                            : inMonth
                              ? 'text-[#F1F1F3]'
                              : 'text-[#8888A0]/50'
                        }`}
                      >
                        {format(date, 'd')}
                      </span>

                      {/* Calorie indicator */}
                      {inMonth && !isFuture && (
                        <div className="mt-1 flex flex-col items-center gap-0.5">
                          <div
                            className={`h-1.5 w-1.5 rounded-full ${
                              calories > 0 ? status.bg.replace('/20', '/60') : 'bg-[#1E1E2E]'
                            }`}
                            style={
                              calories > 0
                                ? {
                                    backgroundColor:
                                      status.color === 'text-emerald-400'
                                        ? 'rgba(16,185,129,0.6)'
                                        : status.color === 'text-amber-400'
                                          ? 'rgba(245,158,11,0.6)'
                                          : status.color === 'text-red-400'
                                            ? 'rgba(239,68,68,0.6)'
                                            : 'rgba(30,30,46,0.4)',
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
              className="relative z-10 w-full max-w-lg rounded-t-2xl sm:rounded-2xl border border-[#1E1E2E] bg-[#13131A] shadow-[0_-8px_40px_rgba(0,0,0,0.5)] max-h-[80vh] overflow-y-auto overscroll-contain"
            >
              {/* Drag handle */}
              <div className="flex justify-center pt-3 sm:hidden">
                <div className="h-1 w-10 rounded-full bg-[#1E1E2E]" />
              </div>

              {/* Header */}
              <div className="sticky top-0 z-10 flex items-center justify-between border-b border-[#1E1E2E] bg-[#13131A] px-5 py-4">
                <div>
                  <h2 className="text-base font-semibold text-[#F1F1F3]">
                    {format(
                      new Date(selectedDay.date + 'T12:00:00'),
                      'EEEE, MMM d'
                    )}
                  </h2>
                  <p className="text-xs text-[#8888A0]">
                    {selectedDay.totalCalories.toLocaleString()} calories total
                  </p>
                </div>
                <button
                  onClick={() => setDetailOpen(false)}
                  className="rounded-lg p-1.5 text-[#8888A0] transition-colors hover:bg-[#1E1E2E] hover:text-[#F1F1F3]"
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
                        <div className="rounded-lg bg-[#1E1E2E] px-2 py-2 text-center">
                          <p className="text-xs text-[#8888A0]">Cal</p>
                          <p className="text-sm font-semibold text-[#10B981]">
                            {totals.cal}
                          </p>
                        </div>
                        <div className="rounded-lg bg-[#1E1E2E] px-2 py-2 text-center">
                          <p className="text-xs text-[#8888A0]">Protein</p>
                          <p className="text-sm font-semibold text-[#8B5CF6]">
                            {Math.round(totals.p)}g
                          </p>
                        </div>
                        <div className="rounded-lg bg-[#1E1E2E] px-2 py-2 text-center">
                          <p className="text-xs text-[#8888A0]">Carbs</p>
                          <p className="text-sm font-semibold text-[#3B82F6]">
                            {Math.round(totals.c)}g
                          </p>
                        </div>
                        <div className="rounded-lg bg-[#1E1E2E] px-2 py-2 text-center">
                          <p className="text-xs text-[#8888A0]">Fats</p>
                          <p className="text-sm font-semibold text-[#F59E0B]">
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
                      <h3 className="mb-2 text-xs font-medium uppercase tracking-wider text-[#8888A0]">
                        {mealLabel}
                      </h3>
                      <div className="space-y-1">
                        {mealEntries.map((entry) => (
                          <div
                            key={entry.id}
                            className="flex items-center justify-between rounded-xl bg-[#0A0A0F] px-3 py-2.5"
                          >
                            <div className="min-w-0 flex-1">
                              <p className="truncate text-sm font-medium text-[#F1F1F3]">
                                {entry.food_name}
                              </p>
                              <p className="text-xs text-[#8888A0]">
                                P {entry.protein_g}g &middot; C {entry.carbs_g}g
                                &middot; F {entry.fats_g}g
                              </p>
                            </div>
                            <span className="ml-2 text-sm font-medium tabular-nums text-[#8888A0]">
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
