'use client'

import { useEffect, useMemo } from 'react'
import Link from 'next/link'
import { motion } from 'framer-motion'
import {
  Camera,
  Dumbbell,
  Moon,
  Bot,
  Flame,
  Trophy,
  ChevronRight,
  Star,
  Pill,
  CheckCircle2,
  Circle,
  BedDouble,
  Sunrise,
  Sparkles,
  CalendarDays,
  Zap,
  Droplets,
  Scale,
  TrendingDown as TrendDownIcon,
  TrendingUp as TrendUpIcon,
} from 'lucide-react'
import { useAppStore } from '@/store/app-store'
import { MacroRing } from '@/components/ui/macro-ring'
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { ProgressBar } from '@/components/ui/progress-bar'
import PageHeader from '@/components/layout/page-header'

import { getToday } from '@/lib/utils'
import type { WaterEntry, WeightLog } from '@/lib/database.types'

/* -------------------------------------------------------------------------- */
/*  Animation helpers                                                         */
/* -------------------------------------------------------------------------- */

const container = {
  hidden: { opacity: 0 },
  show: {
    opacity: 1,
    transition: { staggerChildren: 0.06, delayChildren: 0.08 },
  },
} as const

const item = {
  hidden: { opacity: 0, y: 14, filter: 'blur(4px)' },
  show: {
    opacity: 1,
    y: 0,
    filter: 'blur(0px)',
    transition: { type: 'spring' as const, stiffness: 120, damping: 18 },
  },
}

/* -------------------------------------------------------------------------- */
/*  Helpers                                                                   */
/* -------------------------------------------------------------------------- */

function getGreeting(): string {
  const h = new Date().getHours()
  if (h < 12) return 'Good morning'
  if (h < 17) return 'Good afternoon'
  return 'Good evening'
}

function formatTodayDate(): string {
  return new Date().toLocaleDateString('en-US', {
    weekday: 'long',
    month: 'long',
    day: 'numeric',
  })
}

function getDayName(): string {
  return new Date()
    .toLocaleDateString('en-US', { weekday: 'long' })
    .toLowerCase()
}

function formatTime24to12(time: string): string {
  try {
    const [h, m] = time.split(':').map(Number)
    const ampm = h >= 12 ? 'PM' : 'AM'
    const hour12 = h % 12 || 12
    return `${hour12}:${String(m).padStart(2, '0')} ${ampm}`
  } catch {
    return time
  }
}

function sleepDurationColor(hours: number): string {
  if (hours >= 7) return '#34D399'
  if (hours >= 6) return '#FBBF24'
  return '#F87171'
}

/* -------------------------------------------------------------------------- */
/*  Page component                                                            */
/* -------------------------------------------------------------------------- */

export default function DashboardPage() {
  const {
    profile,
    profileLoading,
    fetchProfile,
    todayFood,
    foodLoading,
    fetchTodayFood,
    activePlan,
    todayWorkout,
    workoutLoading,
    fetchActivePlan,
    fetchTodayWorkout,
    recentSleep,
    sleepLoading,
    fetchRecentSleep,
    streaks,
    fetchStreaks,
    supplements,
    todaySupplementLogs,
    supplementsLoading,
    fetchSupplements,
    fetchTodaySupplementLogs,
    todayWater,
    fetchWaterByDate,
    weightLogs,
    weightLoading,
    fetchWeightLogs,
  } = useAppStore()

  /* ── Fetch everything on mount ────────────────────────────────────────── */

  useEffect(() => {
    fetchProfile()
    fetchTodayFood()
    fetchActivePlan()
    fetchTodayWorkout()
    fetchRecentSleep()
    fetchStreaks()
    fetchSupplements()
    fetchTodaySupplementLogs()
    fetchWaterByDate(getToday())
    fetchWeightLogs()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  /* ── Derived data ─────────────────────────────────────────────────────── */

  const macros = useMemo(() => {
    const consumed = todayFood.reduce(
      (acc, f) => ({
        calories: acc.calories + (f.calories ?? 0),
        protein: acc.protein + (f.protein_g ?? 0),
        carbs: acc.carbs + (f.carbs_g ?? 0),
        fats: acc.fats + (f.fats_g ?? 0),
      }),
      { calories: 0, protein: 0, carbs: 0, fats: 0 }
    )

    return {
      consumed,
      target: {
        calories: profile?.daily_calories ?? 2000,
        protein: profile?.daily_protein ?? 150,
        carbs: profile?.daily_carbs ?? 250,
        fats: profile?.daily_fats ?? 65,
      },
    }
  }, [todayFood, profile])

  const remaining = macros.target.calories - Math.round(macros.consumed.calories)

  const overallStreak = useMemo(
    () => streaks.find((s) => s.streak_type === 'overall'),
    [streaks]
  )

  const todayPlanDay = useMemo(() => {
    if (!activePlan?.plan_data) return null
    const dayName = getDayName()
    return (
      activePlan.plan_data.find(
        (d) => d.day.toLowerCase() === dayName
      ) ?? null
    )
  }, [activePlan])

  const lastSleep = recentSleep[0] ?? null

  const supplementsTaken = useMemo(
    () => todaySupplementLogs.filter((l) => l.taken).length,
    [todaySupplementLogs]
  )

  /* ── Water derived data ───────────────────────────────────────────────── */

  const totalWater = useMemo(
    () => todayWater.reduce((sum: number, w: WaterEntry) => sum + w.amount_ml, 0),
    [todayWater]
  )
  const waterTarget = profile?.daily_water_ml ?? 2500
  const waterPercent = waterTarget > 0 ? Math.min((totalWater / waterTarget) * 100, 100) : 0

  /* ── Weight derived data ──────────────────────────────────────────────── */

  const latestWeight = weightLogs[0]?.weight_kg ?? null

  const weightTrend = useMemo(() => {
    if (weightLogs.length < 2) return null
    const now = new Date()
    const sevenDaysAgo = new Date(now)
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7)
    const sevenDaysAgoStr = sevenDaysAgo.toISOString().slice(0, 10)

    // Find the closest log to 7 days ago
    const olderLog = weightLogs.find(
      (w: WeightLog) => w.date <= sevenDaysAgoStr
    )
    if (!olderLog) return null

    const diff = weightLogs[0].weight_kg - olderLog.weight_kg
    if (Math.abs(diff) < 0.1) return null
    return diff > 0 ? 'up' : 'down'
  }, [weightLogs])

  const goalWeight = profile?.goal_weight_kg ?? null

  /* ── Loading / Onboarding gates ───────────────────────────────────────── */

  if (profileLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <motion.div
          className="flex flex-col items-center gap-4"
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
        >
          <div className="relative">
            <div className="h-12 w-12 animate-spin rounded-full border-2 border-[#A78BFA]/30 border-t-[#A78BFA]" />
            <div className="absolute inset-0 h-12 w-12 animate-spin rounded-full border-2 border-transparent border-b-[#38BDF8]/30" style={{ animationDuration: '1.5s', animationDirection: 'reverse' }} />
          </div>
          <p className="text-sm font-medium text-[#6B6B8A]">Loading FitSync...</p>
        </motion.div>
      </div>
    )
  }

  if (!profile) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center gap-6 px-6">
        <motion.div
          className="flex flex-col items-center gap-5 text-center"
          initial={{ opacity: 0, y: 24 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
        >
          <div className="relative">
            <div className="flex h-24 w-24 items-center justify-center rounded-3xl bg-gradient-to-br from-[#A78BFA]/20 to-[#38BDF8]/10 shadow-[0_0_40px_rgba(167,139,250,0.15)]">
              <Sparkles className="h-12 w-12 text-[#A78BFA]" />
            </div>
            <div className="absolute -inset-1 rounded-3xl bg-gradient-to-br from-[#A78BFA]/10 to-[#38BDF8]/5 blur-xl -z-10" />
          </div>
          <div>
            <h1 className="font-display text-3xl font-extrabold text-[#EAEAF0]">
              Welcome to <span className="text-gradient">FitSync</span>
            </h1>
            <p className="mt-2 max-w-xs text-sm leading-relaxed text-[#6B6B8A]">
              Set up your profile to unlock personalized macro targets, AI-driven
              workout plans, and smart tracking.
            </p>
          </div>
          <Link
            href="/profile"
            className="mt-1 inline-flex h-12 items-center gap-2 rounded-full bg-gradient-to-b from-[#A78BFA] to-[#7C3AED] px-8 text-sm font-semibold text-white shadow-[0_4px_24px_rgba(167,139,250,0.3),inset_0_1px_0_rgba(255,255,255,0.15)] transition-all duration-300 hover:shadow-[0_6px_32px_rgba(167,139,250,0.4)] hover:brightness-110 active:scale-[0.97]"
          >
            Get Started
            <ChevronRight className="h-4 w-4" />
          </Link>
          <button
            onClick={async () => {
              await fetch('/api/auth/logout', { method: 'POST' })
              window.location.href = '/login'
            }}
            className="mt-3 text-xs text-[#6B6B8A] underline underline-offset-2 transition-colors hover:text-[#EAEAF0]"
          >
            Not you? Sign out
          </button>
        </motion.div>
      </div>
    )
  }

  /* ── Render ────────────────────────────────────────────────────────────── */

  return (
    <div className="min-h-screen">
      <PageHeader title="FitSync" subtitle="Dashboard" />

      <motion.div
        className="mx-auto max-w-lg space-y-5 px-4 py-5"
        variants={container}
        initial="hidden"
        animate="show"
      >
        {/* ── 1. Greeting ─────────────────────────────────────────────── */}
        <motion.div variants={item}>
          <h2 className="font-display text-2xl font-extrabold text-[#EAEAF0]">
            {getGreeting()},{' '}
            <span className="text-gradient">
              Athlete
            </span>
          </h2>
          <p className="mt-1 flex items-center gap-1.5 text-sm text-[#6B6B8A]">
            <CalendarDays className="h-3.5 w-3.5" />
            {formatTodayDate()}
          </p>
        </motion.div>

        {/* ── 2. Streak Banner ────────────────────────────────────────── */}
        <motion.div variants={item}>
          <Card className="relative overflow-hidden">
            {/* Warm gradient accent */}
            <div className="absolute inset-0 bg-gradient-to-r from-[#FBBF24]/[0.06] via-transparent to-transparent pointer-events-none" />
            <div className="absolute left-0 top-0 bottom-0 w-1 bg-gradient-to-b from-[#FBBF24] to-[#F59E0B] rounded-l-2xl" />

            <CardContent className="flex items-center justify-between py-4 pl-6">
              <div className="flex items-center gap-3">
                <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-[#FBBF24]/10 shadow-[0_0_20px_rgba(251,191,36,0.1)]">
                  <Flame className="h-6 w-6 text-[#FBBF24]" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-display text-2xl font-extrabold tabular-nums text-[#EAEAF0]">
                      {overallStreak?.current_count ?? 0}
                    </span>
                    <span className="text-sm font-medium text-[#6B6B8A]">
                      day streak
                    </span>
                  </div>
                  <div className="mt-0.5 flex items-center gap-1.5">
                    <Badge variant="warning">Overall</Badge>
                    {overallStreak && overallStreak.current_count >= overallStreak.best_count && overallStreak.current_count > 0 && (
                      <Badge variant="success">Personal Best!</Badge>
                    )}
                  </div>
                </div>
              </div>
              <Trophy className="h-5 w-5 text-[#FBBF24]/30" />
            </CardContent>
          </Card>
        </motion.div>

        {/* ── 3. Macro Summary (4 Rings) + Remaining Calories ─────────── */}
        <motion.div variants={item}>
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle>Today&apos;s Nutrition</CardTitle>
                <Link
                  href="/food"
                  className="text-xs font-medium text-[#6B6B8A] transition-colors hover:text-[#EAEAF0]"
                >
                  Details <ChevronRight className="inline h-3 w-3" />
                </Link>
              </div>
            </CardHeader>
            <CardContent>
              {foodLoading ? (
                <div className="flex items-center justify-center py-6">
                  <div className="h-6 w-6 animate-spin rounded-full border-2 border-[#34D399]/30 border-t-[#34D399]" />
                </div>
              ) : (
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <MacroRing
                      value={macros.consumed.calories}
                      max={macros.target.calories}
                      color="#34D399"
                      size="sm"
                      label="Cal"
                    />
                    <MacroRing
                      value={macros.consumed.protein}
                      max={macros.target.protein}
                      color="#A78BFA"
                      size="sm"
                      label="Protein"
                      unit="g"
                    />
                    <MacroRing
                      value={macros.consumed.carbs}
                      max={macros.target.carbs}
                      color="#38BDF8"
                      size="sm"
                      label="Carbs"
                      unit="g"
                    />
                    <MacroRing
                      value={macros.consumed.fats}
                      max={macros.target.fats}
                      color="#FBBF24"
                      size="sm"
                      label="Fats"
                      unit="g"
                    />
                  </div>

                  {/* Remaining calories display */}
                  <div className="flex flex-col items-center gap-1 rounded-xl bg-white/[0.03] border border-white/[0.04] py-3">
                    <span
                      className="font-display text-2xl font-extrabold tabular-nums"
                      style={{ color: remaining >= 0 ? '#34D399' : '#F87171' }}
                    >
                      {remaining >= 0 ? remaining : Math.abs(remaining)}
                    </span>
                    <span className="text-xs text-[#6B6B8A]">
                      {remaining >= 0 ? 'Calories Remaining' : 'Calories Over'}
                    </span>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </motion.div>

        {/* ── 3b. Water Intake ────────────────────────────────────────── */}
        <motion.div variants={item}>
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="flex items-center gap-2">
                  <Droplets className="h-4 w-4 text-[#38BDF8]" />
                  Water Intake
                </CardTitle>
                <Link
                  href="/food"
                  className="text-xs font-medium text-[#6B6B8A] transition-colors hover:text-[#EAEAF0]"
                >
                  Log Water <ChevronRight className="inline h-3 w-3" />
                </Link>
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-[#38BDF8]/10">
                      <Droplets className="h-6 w-6 text-[#38BDF8]" />
                    </div>
                    <div>
                      <p className="text-sm font-medium text-[#EAEAF0]">
                        {totalWater}ml{' '}
                        <span className="text-[#6B6B8A] font-normal">
                          / {waterTarget}ml
                        </span>
                      </p>
                      <p className="text-xs text-[#6B6B8A]">
                        {waterPercent >= 100
                          ? 'Goal reached!'
                          : `${Math.round(waterTarget - totalWater)}ml to go`}
                      </p>
                    </div>
                  </div>
                  {waterPercent >= 100 && (
                    <Badge variant="success">Done</Badge>
                  )}
                </div>

                <ProgressBar
                  value={waterPercent}
                  color="#38BDF8"
                  height="sm"
                  showPercentage
                />

                <Link
                  href="/food"
                  className="flex h-9 items-center justify-center gap-1.5 rounded-xl border border-[#38BDF8]/20 bg-[#38BDF8]/[0.06] text-xs font-medium text-[#38BDF8] transition-all duration-300 hover:bg-[#38BDF8]/10 active:scale-[0.97]"
                >
                  <Droplets className="h-3.5 w-3.5" />
                  Quick Add Water
                </Link>
              </div>
            </CardContent>
          </Card>
        </motion.div>

        {/* ── 4. Today's Workout ──────────────────────────────────────── */}
        <motion.div variants={item}>
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="flex items-center gap-2">
                  <Dumbbell className="h-4 w-4 text-[#A78BFA]" />
                  Today&apos;s Workout
                </CardTitle>
                {todayWorkout?.completed && (
                  <Badge variant="success">Completed</Badge>
                )}
              </div>
            </CardHeader>
            <CardContent>
              {workoutLoading ? (
                <div className="flex items-center justify-center py-4">
                  <div className="h-6 w-6 animate-spin rounded-full border-2 border-[#A78BFA]/30 border-t-[#A78BFA]" />
                </div>
              ) : todayWorkout?.completed ? (
                <div className="space-y-2">
                  <p className="text-sm font-medium text-[#EAEAF0]">
                    {todayWorkout.workout_name}
                  </p>
                  <div className="flex items-center gap-4 text-xs text-[#6B6B8A]">
                    <span>{todayWorkout.duration_minutes} min</span>
                    <span>{todayWorkout.calories_burned} kcal burned</span>
                    <span>
                      {todayWorkout.exercises.length} exercise
                      {todayWorkout.exercises.length !== 1 ? 's' : ''}
                    </span>
                  </div>
                </div>
              ) : !activePlan ? (
                <Link
                  href="/workout"
                  className="flex items-center justify-center gap-2 rounded-xl border border-dashed border-white/[0.06] py-6 text-sm text-[#6B6B8A] transition-all duration-300 hover:border-[#A78BFA]/25 hover:text-[#EAEAF0] hover:bg-white/[0.02]"
                >
                  <Sparkles className="h-4 w-4 text-[#A78BFA]" />
                  Generate a Workout Plan
                </Link>
              ) : todayPlanDay?.rest_day ? (
                <div className="flex items-center gap-3 rounded-xl bg-white/[0.03] border border-white/[0.04] p-4">
                  <div className="flex h-10 w-10 items-center justify-center rounded-full bg-[#34D399]/10">
                    <BedDouble className="h-5 w-5 text-[#34D399]" />
                  </div>
                  <div>
                    <p className="text-sm font-medium text-[#EAEAF0]">
                      Rest Day - Recovery
                    </p>
                    <p className="text-xs text-[#6B6B8A]">
                      Focus on stretching and hydration
                    </p>
                  </div>
                </div>
              ) : todayPlanDay ? (
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-[#EAEAF0]">
                        {todayPlanDay.name}
                      </p>
                      <p className="text-xs text-[#6B6B8A]">
                        {todayPlanDay.exercises.length} exercise
                        {todayPlanDay.exercises.length !== 1 ? 's' : ''}
                      </p>
                    </div>
                  </div>
                  <div className="space-y-1.5">
                    {todayPlanDay.exercises.slice(0, 3).map((ex, i) => (
                      <div
                        key={i}
                        className="flex items-center justify-between text-xs"
                      >
                        <span className="text-[#6B6B8A]">{ex.name}</span>
                        <span className="tabular-nums text-[#6B6B8A]/60">
                          {ex.sets} x {ex.reps}
                        </span>
                      </div>
                    ))}
                    {todayPlanDay.exercises.length > 3 && (
                      <p className="text-xs text-[#6B6B8A]/50">
                        +{todayPlanDay.exercises.length - 3} more
                      </p>
                    )}
                  </div>
                  <Link
                    href="/workout"
                    className="flex h-10 items-center justify-center rounded-xl bg-gradient-to-b from-[#A78BFA] to-[#7C3AED] text-sm font-semibold text-white shadow-[0_2px_16px_rgba(167,139,250,0.3),inset_0_1px_0_rgba(255,255,255,0.15)] transition-all duration-300 hover:shadow-[0_4px_24px_rgba(167,139,250,0.4)] active:scale-[0.97]"
                  >
                    <Zap className="mr-1.5 h-4 w-4" />
                    Start Workout
                  </Link>
                </div>
              ) : (
                <Link
                  href="/workout"
                  className="flex items-center justify-center gap-2 rounded-xl border border-dashed border-white/[0.06] py-6 text-sm text-[#6B6B8A] transition-all duration-300 hover:border-[#A78BFA]/25 hover:text-[#EAEAF0] hover:bg-white/[0.02]"
                >
                  <Dumbbell className="h-4 w-4" />
                  No workout scheduled today
                </Link>
              )}
            </CardContent>
          </Card>
        </motion.div>

        {/* ── 5. Sleep Score ──────────────────────────────────────────── */}
        <motion.div variants={item}>
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="flex items-center gap-2">
                  <Moon className="h-4 w-4 text-[#818CF8]" />
                  Sleep Score
                </CardTitle>
                <Link
                  href="/sleep"
                  className="text-xs font-medium text-[#6B6B8A] transition-colors hover:text-[#EAEAF0]"
                >
                  History <ChevronRight className="inline h-3 w-3" />
                </Link>
              </div>
            </CardHeader>
            <CardContent>
              {sleepLoading ? (
                <div className="flex items-center justify-center py-4">
                  <div className="h-6 w-6 animate-spin rounded-full border-2 border-[#818CF8]/30 border-t-[#818CF8]" />
                </div>
              ) : lastSleep ? (
                <div className="space-y-3">
                  {/* Duration + quality row */}
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div
                        className="flex h-12 w-12 items-center justify-center rounded-xl"
                        style={{
                          backgroundColor: `${sleepDurationColor(lastSleep.duration_hours)}12`,
                        }}
                      >
                        <span
                          className="font-display text-lg font-bold tabular-nums"
                          style={{
                            color: sleepDurationColor(lastSleep.duration_hours),
                          }}
                        >
                          {lastSleep.duration_hours.toFixed(1)}
                        </span>
                      </div>
                      <div>
                        <p className="text-sm font-medium text-[#EAEAF0]">
                          {lastSleep.duration_hours.toFixed(1)} hours
                        </p>
                        <div className="mt-0.5 flex items-center gap-0.5">
                          {Array.from({ length: 5 }).map((_, i) => (
                            <Star
                              key={i}
                              className="h-3 w-3"
                              fill={
                                i < lastSleep.quality ? '#FBBF24' : 'transparent'
                              }
                              stroke={
                                i < lastSleep.quality ? '#FBBF24' : '#6B6B8A'
                              }
                              strokeWidth={1.5}
                            />
                          ))}
                        </div>
                      </div>
                    </div>
                    <Badge
                      variant={
                        lastSleep.duration_hours >= 7
                          ? 'success'
                          : lastSleep.duration_hours >= 6
                            ? 'warning'
                            : 'danger'
                      }
                    >
                      {lastSleep.duration_hours >= 7
                        ? 'Great'
                        : lastSleep.duration_hours >= 6
                          ? 'Fair'
                          : 'Poor'}
                    </Badge>
                  </div>

                  {/* Bedtime / wake row */}
                  <div className="flex items-center gap-4 rounded-xl bg-white/[0.03] border border-white/[0.04] px-3 py-2.5">
                    <div className="flex items-center gap-1.5">
                      <Moon className="h-3.5 w-3.5 text-[#818CF8]" />
                      <span className="text-xs text-[#6B6B8A]">
                        {formatTime24to12(lastSleep.bedtime)}
                      </span>
                    </div>
                    <div className="h-px flex-1 bg-gradient-to-r from-[#818CF8]/20 via-white/[0.06] to-[#FBBF24]/20" />
                    <div className="flex items-center gap-1.5">
                      <Sunrise className="h-3.5 w-3.5 text-[#FBBF24]" />
                      <span className="text-xs text-[#6B6B8A]">
                        {formatTime24to12(lastSleep.wake_time)}
                      </span>
                    </div>
                  </div>

                  {/* Sleep quality bar */}
                  <ProgressBar
                    value={(lastSleep.quality / 5) * 100}
                    color={sleepDurationColor(lastSleep.duration_hours)}
                    label="Quality"
                    showPercentage
                    height="sm"
                  />
                </div>
              ) : (
                <Link
                  href="/sleep"
                  className="flex items-center justify-center gap-2 rounded-xl border border-dashed border-white/[0.06] py-6 text-sm text-[#6B6B8A] transition-all duration-300 hover:border-[#818CF8]/25 hover:text-[#EAEAF0] hover:bg-white/[0.02]"
                >
                  <Moon className="h-4 w-4" />
                  Log last night&apos;s sleep
                </Link>
              )}
            </CardContent>
          </Card>
        </motion.div>

        {/* ── 5b. Weight Trend ────────────────────────────────────────── */}
        <motion.div variants={item}>
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="flex items-center gap-2">
                  <Scale className="h-4 w-4 text-[#A78BFA]" />
                  Weight
                </CardTitle>
                <Link
                  href="/profile"
                  className="text-xs font-medium text-[#6B6B8A] transition-colors hover:text-[#EAEAF0]"
                >
                  Full Chart <ChevronRight className="inline h-3 w-3" />
                </Link>
              </div>
            </CardHeader>
            <CardContent>
              {weightLoading ? (
                <div className="flex items-center justify-center py-4">
                  <div className="h-6 w-6 animate-spin rounded-full border-2 border-[#A78BFA]/30 border-t-[#A78BFA]" />
                </div>
              ) : latestWeight !== null ? (
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-[#A78BFA]/10">
                        <span className="font-display text-lg font-bold tabular-nums text-[#A78BFA]">
                          {latestWeight.toFixed(1)}
                        </span>
                      </div>
                      <div>
                        <div className="flex items-center gap-1.5">
                          <p className="text-sm font-medium text-[#EAEAF0]">
                            {latestWeight.toFixed(1)} lbs
                          </p>
                          {weightTrend === 'up' && (
                            <TrendUpIcon className="h-4 w-4 text-[#F87171]" />
                          )}
                          {weightTrend === 'down' && (
                            <TrendDownIcon className="h-4 w-4 text-[#34D399]" />
                          )}
                        </div>
                        <p className="text-xs text-[#6B6B8A]">
                          {weightTrend === 'up'
                            ? 'Up from last week'
                            : weightTrend === 'down'
                              ? 'Down from last week'
                              : 'Stable this week'}
                        </p>
                      </div>
                    </div>
                    {goalWeight !== null && (
                      <div className="text-right">
                        <p className="text-xs text-[#6B6B8A]">Goal</p>
                         <p className="text-sm font-semibold tabular-nums text-[#EAEAF0]">
                          {goalWeight} lbs
                         </p>
                      </div>
                    )}
                  </div>

                  {goalWeight !== null && (
                    <div className="rounded-xl bg-white/[0.03] border border-white/[0.04] px-3 py-2.5">
                      <div className="flex items-center justify-between text-xs text-[#6B6B8A]">
                        <span>
                          {Math.abs(latestWeight - goalWeight).toFixed(1)} lbs{' '}
                          {latestWeight > goalWeight ? 'to lose' : latestWeight < goalWeight ? 'to gain' : '- at goal!'}
                        </span>
                      </div>
                    </div>
                  )}
                </div>
              ) : (
                <Link
                  href="/profile"
                  className="flex items-center justify-center gap-2 rounded-xl border border-dashed border-white/[0.06] py-6 text-sm text-[#6B6B8A] transition-all duration-300 hover:border-[#A78BFA]/25 hover:text-[#EAEAF0] hover:bg-white/[0.02]"
                >
                  <Scale className="h-4 w-4" />
                  Log your weight
                </Link>
              )}
            </CardContent>
          </Card>
        </motion.div>

        {/* ── 6. Supplement Checklist Mini ─────────────────────────────── */}
        <motion.div variants={item}>
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="flex items-center gap-2">
                  <Pill className="h-4 w-4 text-[#34D399]" />
                  Supplements
                </CardTitle>
                <Link
                  href="/supplements"
                  className="text-xs font-medium text-[#6B6B8A] transition-colors hover:text-[#EAEAF0]"
                >
                  {supplements.length > 0
                    ? `${supplementsTaken}/${supplements.length}`
                    : 'Manage'}{' '}
                  <ChevronRight className="inline h-3 w-3" />
                </Link>
              </div>
            </CardHeader>
            <CardContent>
              {supplementsLoading ? (
                <div className="flex items-center justify-center py-4">
                  <div className="h-6 w-6 animate-spin rounded-full border-2 border-[#34D399]/30 border-t-[#34D399]" />
                </div>
              ) : supplements.length === 0 ? (
                <Link
                  href="/supplements"
                  className="flex items-center justify-center gap-2 rounded-xl border border-dashed border-white/[0.06] py-6 text-sm text-[#6B6B8A] transition-all duration-300 hover:border-[#34D399]/25 hover:text-[#EAEAF0] hover:bg-white/[0.02]"
                >
                  <Pill className="h-4 w-4" />
                  Add your supplements
                </Link>
              ) : (
                <div className="space-y-2">
                  {/* Progress */}
                  <ProgressBar
                    value={
                      supplements.length > 0
                        ? (supplementsTaken / supplements.length) * 100
                        : 0
                    }
                    color="#34D399"
                    height="sm"
                  />

                  {/* Compact list (max 5) */}
                  <div className="space-y-1.5 pt-1">
                    {supplements.slice(0, 5).map((supp) => {
                      const taken = todaySupplementLogs.some(
                        (l) => l.supplement_id === supp.id && l.taken
                      )
                      return (
                        <div
                          key={supp.id}
                          className="flex items-center justify-between text-xs"
                        >
                          <div className="flex items-center gap-2">
                            {taken ? (
                              <CheckCircle2 className="h-3.5 w-3.5 text-[#34D399]" />
                            ) : (
                              <Circle className="h-3.5 w-3.5 text-[#6B6B8A]/40" />
                            )}
                            <span
                              className={
                                taken
                                  ? 'text-[#6B6B8A] line-through'
                                  : 'text-[#EAEAF0]'
                              }
                            >
                              {supp.name}
                            </span>
                          </div>
                          <span className="text-[#6B6B8A]/50">
                            {supp.dosage}
                            {supp.unit}
                          </span>
                        </div>
                      )
                    })}
                    {supplements.length > 5 && (
                      <p className="pt-0.5 text-xs text-[#6B6B8A]/50">
                        +{supplements.length - 5} more
                      </p>
                    )}
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </motion.div>

        {/* ── 7. Quick Actions 2x2 Grid ───────────────────────────────── */}
        <motion.div variants={item}>
          <p className="mb-2.5 font-display text-xs font-semibold uppercase tracking-widest text-[#6B6B8A]">
            Quick Actions
          </p>
          <div className="grid grid-cols-2 gap-3">
            {[
              { href: '/food', icon: Camera, label: 'Log Food', color: '#34D399' },
              { href: '/workout', icon: Dumbbell, label: 'Start Workout', color: '#A78BFA' },
              { href: '/sleep', icon: Moon, label: 'Log Sleep', color: '#818CF8' },
              { href: '/chat', icon: Bot, label: 'Ask AI', color: '#FBBF24' },
            ].map(({ href, icon: Icon, label, color }) => (
              <Link key={href} href={href}>
                <Card className="group cursor-pointer transition-all duration-300 hover:shadow-[0_4px_32px_rgba(167,139,250,0.06)]">
                  <CardContent className="flex flex-col items-center gap-2.5 py-5">
                    <div
                      className="flex h-11 w-11 items-center justify-center rounded-xl transition-all duration-300 group-hover:scale-105"
                      style={{
                        backgroundColor: `${color}12`,
                        boxShadow: `0 0 0 0 ${color}00`,
                      }}
                    >
                      <Icon className="h-5 w-5 transition-colors duration-300" style={{ color }} />
                    </div>
                    <span className="text-xs font-medium text-[#EAEAF0]">
                      {label}
                    </span>
                  </CardContent>
                </Card>
              </Link>
            ))}
          </div>
        </motion.div>

        {/* Bottom spacer for scroll comfort */}
        <div className="h-2" />
      </motion.div>
    </div>
  )
}
