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
} from 'lucide-react'
import { useAppStore } from '@/store/app-store'
import { MacroRing } from '@/components/ui/macro-ring'
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { ProgressBar } from '@/components/ui/progress-bar'
import PageHeader from '@/components/layout/page-header'

/* -------------------------------------------------------------------------- */
/*  Animation helpers                                                         */
/* -------------------------------------------------------------------------- */

const container = {
  hidden: { opacity: 0 },
  show: {
    opacity: 1,
    transition: { staggerChildren: 0.08, delayChildren: 0.1 },
  },
} as const

const item = {
  hidden: { opacity: 0, y: 16 },
  show: {
    opacity: 1,
    y: 0,
    transition: { type: 'spring' as const, stiffness: 100, damping: 16 },
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
  if (hours >= 7) return '#10B981'
  if (hours >= 6) return '#F59E0B'
  return '#EF4444'
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

  /* ── Loading / Onboarding gates ───────────────────────────────────────── */

  if (profileLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#0A0A0F]">
        <motion.div
          className="flex flex-col items-center gap-3"
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
        >
          <div className="h-10 w-10 animate-spin rounded-full border-2 border-[#8B5CF6] border-t-transparent" />
          <p className="text-sm text-[#8888A0]">Loading FitSync...</p>
        </motion.div>
      </div>
    )
  }

  if (!profile) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center gap-6 bg-[#0A0A0F] px-6">
        <motion.div
          className="flex flex-col items-center gap-4 text-center"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
        >
          <div className="flex h-20 w-20 items-center justify-center rounded-full bg-[#8B5CF6]/15">
            <Sparkles className="h-10 w-10 text-[#8B5CF6]" />
          </div>
          <h1 className="text-2xl font-bold text-[#F1F1F3]">
            Welcome to FitSync
          </h1>
          <p className="max-w-xs text-sm text-[#8888A0]">
            Set up your profile to unlock personalized macro targets, AI-driven
            workout plans, and smart tracking.
          </p>
          <Link
            href="/profile"
            className="mt-2 inline-flex h-12 items-center gap-2 rounded-full bg-[#8B5CF6] px-8 text-sm font-semibold text-white transition-colors hover:bg-[#7C3AED]"
          >
            Get Started
            <ChevronRight className="h-4 w-4" />
          </Link>
        </motion.div>
      </div>
    )
  }

  /* ── Render ────────────────────────────────────────────────────────────── */

  return (
    <div className="min-h-screen bg-[#0A0A0F]">
      <PageHeader title="FitSync" subtitle="Dashboard" />

      <motion.div
        className="mx-auto max-w-lg space-y-5 px-4 py-5"
        variants={container}
        initial="hidden"
        animate="show"
      >
        {/* ── 1. Greeting ─────────────────────────────────────────────── */}
        <motion.div variants={item}>
          <h2 className="text-2xl font-bold text-[#F1F1F3]">
            {getGreeting()} 👋
          </h2>
          <p className="mt-0.5 flex items-center gap-1.5 text-sm text-[#8888A0]">
            <CalendarDays className="h-3.5 w-3.5" />
            {formatTodayDate()}
          </p>
        </motion.div>

        {/* ── 2. Streak Banner ────────────────────────────────────────── */}
        <motion.div variants={item}>
          <Card className="relative overflow-hidden border-[#F59E0B]/20 bg-gradient-to-r from-[#F59E0B]/10 via-[#13131A]/80 to-[#13131A]/80">
            <CardContent className="flex items-center justify-between py-4">
              <div className="flex items-center gap-3">
                <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-[#F59E0B]/15">
                  <Flame className="h-6 w-6 text-[#F59E0B]" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-2xl font-bold tabular-nums text-[#F1F1F3]">
                      {overallStreak?.current_count ?? 0}
                    </span>
                    <span className="text-sm font-medium text-[#8888A0]">
                      day streak 🔥
                    </span>
                  </div>
                  <div className="mt-0.5 flex items-center gap-1.5">
                    <Badge variant="warning">
                      {overallStreak?.streak_type === 'overall'
                        ? 'Overall'
                        : (overallStreak?.streak_type ?? 'Overall')}
                    </Badge>
                    {overallStreak && overallStreak.current_count >= overallStreak.best_count && overallStreak.current_count > 0 && (
                      <Badge variant="success">Personal Best!</Badge>
                    )}
                  </div>
                </div>
              </div>
              <div className="flex items-center gap-1 text-xs text-[#8888A0]">
                <Trophy className="h-4 w-4" />
              </div>
            </CardContent>
          </Card>
        </motion.div>

        {/* ── 3. Macro Summary (4 Rings) ──────────────────────────────── */}
        <motion.div variants={item}>
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle>Today&apos;s Nutrition</CardTitle>
                <Link
                  href="/food"
                  className="text-xs text-[#8888A0] transition-colors hover:text-[#F1F1F3]"
                >
                  Details →
                </Link>
              </div>
            </CardHeader>
            <CardContent>
              {foodLoading ? (
                <div className="flex items-center justify-center py-6">
                  <div className="h-6 w-6 animate-spin rounded-full border-2 border-[#8B5CF6] border-t-transparent" />
                </div>
              ) : (
                <div className="flex items-center justify-between">
                  <MacroRing
                    value={macros.consumed.calories}
                    max={macros.target.calories}
                    color="#10B981"
                    size="sm"
                    label="Cal"
                  />
                  <MacroRing
                    value={macros.consumed.protein}
                    max={macros.target.protein}
                    color="#8B5CF6"
                    size="sm"
                    label="Protein"
                    unit="g"
                  />
                  <MacroRing
                    value={macros.consumed.carbs}
                    max={macros.target.carbs}
                    color="#3B82F6"
                    size="sm"
                    label="Carbs"
                    unit="g"
                  />
                  <MacroRing
                    value={macros.consumed.fats}
                    max={macros.target.fats}
                    color="#F59E0B"
                    size="sm"
                    label="Fats"
                    unit="g"
                  />
                </div>
              )}
            </CardContent>
          </Card>
        </motion.div>

        {/* ── 4. Today's Workout ──────────────────────────────────────── */}
        <motion.div variants={item}>
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="flex items-center gap-2">
                  <Dumbbell className="h-4 w-4 text-[#8B5CF6]" />
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
                  <div className="h-6 w-6 animate-spin rounded-full border-2 border-[#8B5CF6] border-t-transparent" />
                </div>
              ) : todayWorkout?.completed ? (
                <div className="space-y-2">
                  <p className="text-sm font-medium text-[#F1F1F3]">
                    {todayWorkout.workout_name}
                  </p>
                  <div className="flex items-center gap-4 text-xs text-[#8888A0]">
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
                  className="flex items-center justify-center gap-2 rounded-xl border border-dashed border-[#1E1E2E] py-6 text-sm text-[#8888A0] transition-colors hover:border-[#8B5CF6]/40 hover:text-[#F1F1F3]"
                >
                  <Sparkles className="h-4 w-4 text-[#8B5CF6]" />
                  Generate a Workout Plan
                </Link>
              ) : todayPlanDay?.rest_day ? (
                <div className="flex items-center gap-3 rounded-xl bg-[#1E1E2E]/50 p-4">
                  <div className="flex h-10 w-10 items-center justify-center rounded-full bg-[#10B981]/15">
                    <BedDouble className="h-5 w-5 text-[#10B981]" />
                  </div>
                  <div>
                    <p className="text-sm font-medium text-[#F1F1F3]">
                      Rest Day - Recovery
                    </p>
                    <p className="text-xs text-[#8888A0]">
                      Focus on stretching and hydration
                    </p>
                  </div>
                </div>
              ) : todayPlanDay ? (
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-[#F1F1F3]">
                        {todayPlanDay.name}
                      </p>
                      <p className="text-xs text-[#8888A0]">
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
                        <span className="text-[#8888A0]">{ex.name}</span>
                        <span className="tabular-nums text-[#8888A0]/70">
                          {ex.sets} x {ex.reps}
                        </span>
                      </div>
                    ))}
                    {todayPlanDay.exercises.length > 3 && (
                      <p className="text-xs text-[#8888A0]/60">
                        +{todayPlanDay.exercises.length - 3} more
                      </p>
                    )}
                  </div>
                  <Link
                    href="/workout"
                    className="flex h-10 items-center justify-center rounded-xl bg-[#8B5CF6] text-sm font-semibold text-white transition-colors hover:bg-[#7C3AED]"
                  >
                    <Zap className="mr-1.5 h-4 w-4" />
                    Start Workout
                  </Link>
                </div>
              ) : (
                <Link
                  href="/workout"
                  className="flex items-center justify-center gap-2 rounded-xl border border-dashed border-[#1E1E2E] py-6 text-sm text-[#8888A0] transition-colors hover:border-[#8B5CF6]/40 hover:text-[#F1F1F3]"
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
                  <Moon className="h-4 w-4 text-[#6366F1]" />
                  Sleep Score
                </CardTitle>
                <Link
                  href="/sleep"
                  className="text-xs text-[#8888A0] transition-colors hover:text-[#F1F1F3]"
                >
                  History →
                </Link>
              </div>
            </CardHeader>
            <CardContent>
              {sleepLoading ? (
                <div className="flex items-center justify-center py-4">
                  <div className="h-6 w-6 animate-spin rounded-full border-2 border-[#6366F1] border-t-transparent" />
                </div>
              ) : lastSleep ? (
                <div className="space-y-3">
                  {/* Duration + quality row */}
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div
                        className="flex h-12 w-12 items-center justify-center rounded-xl"
                        style={{
                          backgroundColor: `${sleepDurationColor(lastSleep.duration_hours)}15`,
                        }}
                      >
                        <span
                          className="text-lg font-bold tabular-nums"
                          style={{
                            color: sleepDurationColor(lastSleep.duration_hours),
                          }}
                        >
                          {lastSleep.duration_hours.toFixed(1)}
                        </span>
                      </div>
                      <div>
                        <p className="text-sm font-medium text-[#F1F1F3]">
                          {lastSleep.duration_hours.toFixed(1)} hours
                        </p>
                        <div className="mt-0.5 flex items-center gap-0.5">
                          {Array.from({ length: 5 }).map((_, i) => (
                            <Star
                              key={i}
                              className="h-3 w-3"
                              fill={
                                i < lastSleep.quality ? '#F59E0B' : 'transparent'
                              }
                              stroke={
                                i < lastSleep.quality ? '#F59E0B' : '#8888A0'
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
                  <div className="flex items-center gap-4 rounded-xl bg-[#1E1E2E]/50 px-3 py-2.5">
                    <div className="flex items-center gap-1.5">
                      <Moon className="h-3.5 w-3.5 text-[#6366F1]" />
                      <span className="text-xs text-[#8888A0]">
                        {formatTime24to12(lastSleep.bedtime)}
                      </span>
                    </div>
                    <div className="h-px flex-1 bg-[#1E1E2E]" />
                    <div className="flex items-center gap-1.5">
                      <Sunrise className="h-3.5 w-3.5 text-[#F59E0B]" />
                      <span className="text-xs text-[#8888A0]">
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
                  className="flex items-center justify-center gap-2 rounded-xl border border-dashed border-[#1E1E2E] py-6 text-sm text-[#8888A0] transition-colors hover:border-[#6366F1]/40 hover:text-[#F1F1F3]"
                >
                  <Moon className="h-4 w-4" />
                  Log last night&apos;s sleep
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
                  <Pill className="h-4 w-4 text-[#10B981]" />
                  Supplements
                </CardTitle>
                <Link
                  href="/supplements"
                  className="text-xs text-[#8888A0] transition-colors hover:text-[#F1F1F3]"
                >
                  {supplements.length > 0
                    ? `${supplementsTaken}/${supplements.length}`
                    : 'Manage'}{' '}
                  →
                </Link>
              </div>
            </CardHeader>
            <CardContent>
              {supplementsLoading ? (
                <div className="flex items-center justify-center py-4">
                  <div className="h-6 w-6 animate-spin rounded-full border-2 border-[#10B981] border-t-transparent" />
                </div>
              ) : supplements.length === 0 ? (
                <Link
                  href="/supplements"
                  className="flex items-center justify-center gap-2 rounded-xl border border-dashed border-[#1E1E2E] py-6 text-sm text-[#8888A0] transition-colors hover:border-[#10B981]/40 hover:text-[#F1F1F3]"
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
                    color="#10B981"
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
                              <CheckCircle2 className="h-3.5 w-3.5 text-[#10B981]" />
                            ) : (
                              <Circle className="h-3.5 w-3.5 text-[#8888A0]/50" />
                            )}
                            <span
                              className={
                                taken
                                  ? 'text-[#8888A0] line-through'
                                  : 'text-[#F1F1F3]'
                              }
                            >
                              {supp.name}
                            </span>
                          </div>
                          <span className="text-[#8888A0]/60">
                            {supp.dosage}
                            {supp.unit}
                          </span>
                        </div>
                      )
                    })}
                    {supplements.length > 5 && (
                      <p className="pt-0.5 text-xs text-[#8888A0]/60">
                        +{supplements.length - 5} more
                      </p>
                    )}
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </motion.div>

        {/* ── 7. Quick Actions 2×2 Grid ───────────────────────────────── */}
        <motion.div variants={item}>
          <p className="mb-2.5 text-xs font-medium uppercase tracking-wider text-[#8888A0]">
            Quick Actions
          </p>
          <div className="grid grid-cols-2 gap-3">
            {/* Log Food */}
            <Link href="/food">
              <Card className="group cursor-pointer transition-colors hover:border-[#10B981]/30">
                <CardContent className="flex flex-col items-center gap-2 py-5">
                  <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#10B981]/15 transition-colors group-hover:bg-[#10B981]/25">
                    <Camera className="h-5 w-5 text-[#10B981]" />
                  </div>
                  <span className="text-xs font-medium text-[#F1F1F3]">
                    Log Food
                  </span>
                </CardContent>
              </Card>
            </Link>

            {/* Start Workout */}
            <Link href="/workout">
              <Card className="group cursor-pointer transition-colors hover:border-[#8B5CF6]/30">
                <CardContent className="flex flex-col items-center gap-2 py-5">
                  <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#8B5CF6]/15 transition-colors group-hover:bg-[#8B5CF6]/25">
                    <Dumbbell className="h-5 w-5 text-[#8B5CF6]" />
                  </div>
                  <span className="text-xs font-medium text-[#F1F1F3]">
                    Start Workout
                  </span>
                </CardContent>
              </Card>
            </Link>

            {/* Log Sleep */}
            <Link href="/sleep">
              <Card className="group cursor-pointer transition-colors hover:border-[#6366F1]/30">
                <CardContent className="flex flex-col items-center gap-2 py-5">
                  <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#6366F1]/15 transition-colors group-hover:bg-[#6366F1]/25">
                    <Moon className="h-5 w-5 text-[#6366F1]" />
                  </div>
                  <span className="text-xs font-medium text-[#F1F1F3]">
                    Log Sleep
                  </span>
                </CardContent>
              </Card>
            </Link>

            {/* Ask AI */}
            <Link href="/chat">
              <Card className="group cursor-pointer transition-colors hover:border-[#F59E0B]/30">
                <CardContent className="flex flex-col items-center gap-2 py-5">
                  <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#F59E0B]/15 transition-colors group-hover:bg-[#F59E0B]/25">
                    <Bot className="h-5 w-5 text-[#F59E0B]" />
                  </div>
                  <span className="text-xs font-medium text-[#F1F1F3]">
                    Ask AI
                  </span>
                </CardContent>
              </Card>
            </Link>
          </div>
        </motion.div>

        {/* Bottom spacer for scroll comfort */}
        <div className="h-2" />
      </motion.div>
    </div>
  )
}
