'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Dumbbell,
  Timer,
  Play,
  Pause,
  SkipForward,
  Check,
  Plus,
  RefreshCw,
  ChevronDown,
  ChevronUp,
  Zap,
  Clock,
} from 'lucide-react'
import Link from 'next/link'
import { useAppStore } from '@/store/app-store'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Modal } from '@/components/ui/modal'
import PageHeader from '@/components/layout/page-header'
import { db } from '@/lib/local-db'
import { getToday } from '@/lib/utils'
import type { Exercise, ActualSet, WorkoutDay, LoggedExercise } from '@/lib/database.types'

/* ------------------------------------------------------------------ */
/*  Constants                                                         */
/* ------------------------------------------------------------------ */

const DAYS_MAP: Record<number, string> = {
  0: 'Sunday',
  1: 'Monday',
  2: 'Tuesday',
  3: 'Wednesday',
  4: 'Thursday',
  5: 'Friday',
  6: 'Saturday',
}

/* ------------------------------------------------------------------ */
/*  Rest Timer Component                                              */
/* ------------------------------------------------------------------ */

function RestTimer({
  initialSeconds,
  onDismiss,
}: {
  initialSeconds: number
  onDismiss: () => void
}) {
  const [remaining, setRemaining] = useState(initialSeconds)
  const [paused, setPaused] = useState(false)
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const audioRef = useRef<AudioContext | null>(null)

  const totalSeconds = useRef(initialSeconds)

  const playBeep = useCallback(() => {
    try {
      const ctx = new (window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext)()
      audioRef.current = ctx
      const osc = ctx.createOscillator()
      const gain = ctx.createGain()
      osc.connect(gain)
      gain.connect(ctx.destination)
      osc.frequency.value = 880
      osc.type = 'sine'
      gain.gain.value = 0.3
      osc.start()
      osc.stop(ctx.currentTime + 0.3)
    } catch {
      // Audio not available
    }
  }, [])

  useEffect(() => {
    if (paused) return
    intervalRef.current = setInterval(() => {
      setRemaining((prev) => {
        if (prev <= 1) {
          clearInterval(intervalRef.current!)
          playBeep()
          try {
            navigator.vibrate?.([200, 100, 200])
          } catch {
            // Vibration not available
          }
          setTimeout(onDismiss, 1500)
          return 0
        }
        return prev - 1
      })
    }, 1000)

    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current)
    }
  }, [paused, onDismiss, playBeep])

  useEffect(() => {
    return () => {
      if (audioRef.current) {
        audioRef.current.close().catch(() => {})
      }
    }
  }, [])

  const adjust = (delta: number) => {
    setRemaining((prev) => {
      const next = Math.max(0, prev + delta)
      totalSeconds.current = Math.max(totalSeconds.current, next)
      return next
    })
  }

  const progress = totalSeconds.current > 0 ? remaining / totalSeconds.current : 0
  const circumference = 2 * Math.PI * 54
  const strokeDashoffset = circumference * (1 - progress)

  const mins = Math.floor(remaining / 60)
  const secs = remaining % 60

  return (
    <motion.div
      initial={{ height: 0, opacity: 0 }}
      animate={{ height: 'auto', opacity: 1 }}
      exit={{ height: 0, opacity: 0 }}
      className="overflow-hidden"
    >
      <Card className="border-[#8B5CF6]/30 bg-[#8B5CF6]/5">
        <CardContent className="flex flex-col items-center gap-4 py-6">
          {/* Circular timer */}
          <div className="relative flex h-32 w-32 items-center justify-center">
            <svg className="-rotate-90" width="128" height="128" viewBox="0 0 128 128">
              <circle
                cx="64"
                cy="64"
                r="54"
                fill="none"
                stroke="#1E1E2E"
                strokeWidth="8"
              />
              <motion.circle
                cx="64"
                cy="64"
                r="54"
                fill="none"
                stroke={remaining === 0 ? '#10B981' : '#8B5CF6'}
                strokeWidth="8"
                strokeLinecap="round"
                strokeDasharray={circumference}
                animate={{ strokeDashoffset }}
                transition={{ duration: 0.4, ease: 'easeOut' }}
              />
            </svg>
            <span className="absolute text-2xl font-bold tabular-nums text-[#F1F1F3]">
              {remaining === 0 ? (
                <Check className="h-8 w-8 text-[#10B981]" />
              ) : (
                `${mins}:${secs.toString().padStart(2, '0')}`
              )}
            </span>
          </div>

          <p className="text-xs font-medium uppercase tracking-wider text-[#8888A0]">
            Rest Timer
          </p>

          {/* Controls */}
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => adjust(-15)}
              disabled={remaining <= 0}
            >
              -15s
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setPaused((p) => !p)}
              disabled={remaining <= 0}
            >
              {paused ? <Play className="h-4 w-4" /> : <Pause className="h-4 w-4" />}
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => adjust(15)}
              disabled={remaining <= 0}
            >
              +15s
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={onDismiss}
              className="text-[#8888A0]"
            >
              <SkipForward className="h-4 w-4" />
              <span className="ml-1">Skip</span>
            </Button>
          </div>
        </CardContent>
      </Card>
    </motion.div>
  )
}

/* ------------------------------------------------------------------ */
/*  Exercise Row Component                                            */
/* ------------------------------------------------------------------ */

function ExerciseRow({
  exercise,
  exerciseIndex,
  sets,
  onSetUpdate,
  onSetComplete,
}: {
  exercise: Exercise
  exerciseIndex: number
  sets: ActualSet[]
  onSetUpdate: (exerciseIndex: number, setIndex: number, field: 'reps' | 'weight', value: number) => void
  onSetComplete: (exerciseIndex: number, setIndex: number) => void
}) {
  const [expanded, setExpanded] = useState(false)
  const completedSets = sets.filter((s) => s.completed).length

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: exerciseIndex * 0.05 }}
    >
      <Card>
        {/* Exercise header - tap to expand */}
        <button
          type="button"
          onClick={() => setExpanded(!expanded)}
          className="flex w-full items-center justify-between p-4 text-left"
        >
          <div className="flex min-w-0 flex-1 flex-col gap-0.5">
            <span className="font-medium text-[#F1F1F3]">{exercise.name}</span>
            <span className="text-xs text-[#8888A0]">
              {exercise.sets} x {exercise.reps}
              {exercise.notes ? ` — ${exercise.notes}` : ''}
            </span>
          </div>
          <div className="ml-3 flex items-center gap-2">
            <Badge variant={completedSets === exercise.sets ? 'success' : 'default'}>
              {completedSets}/{exercise.sets}
            </Badge>
            {expanded ? (
              <ChevronUp className="h-4 w-4 text-[#8888A0]" />
            ) : (
              <ChevronDown className="h-4 w-4 text-[#8888A0]" />
            )}
          </div>
        </button>

        {/* Expanded sets */}
        <AnimatePresence>
          {expanded && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              className="overflow-hidden"
            >
              <div className="border-t border-[#1E1E2E] px-4 pb-4 pt-3">
                {/* Column headers */}
                <div className="mb-2 grid grid-cols-[auto_1fr_1fr_auto] gap-2 text-[10px] font-medium uppercase tracking-wider text-[#8888A0]">
                  <span className="w-8 text-center">Set</span>
                  <span>Reps</span>
                  <span>Weight (lbs)</span>
                  <span className="w-9 text-center">Done</span>
                </div>

                {sets.map((set, si) => (
                  <div
                    key={si}
                    className="mb-1.5 grid grid-cols-[auto_1fr_1fr_auto] items-center gap-2"
                  >
                    <span className="w-8 text-center text-sm font-medium text-[#8888A0]">
                      {si + 1}
                    </span>
                    <Input
                      type="number"
                      inputMode="numeric"
                      placeholder={exercise.reps}
                      value={set.reps || ''}
                      onChange={(e) =>
                        onSetUpdate(exerciseIndex, si, 'reps', parseInt(e.target.value) || 0)
                      }
                      disabled={set.completed}
                      className="h-9 text-center"
                    />
                    <Input
                      type="number"
                      inputMode="decimal"
                      placeholder="0"
                      value={set.weight || ''}
                      onChange={(e) =>
                        onSetUpdate(exerciseIndex, si, 'weight', parseFloat(e.target.value) || 0)
                      }
                      disabled={set.completed}
                      className="h-9 text-center"
                    />
                    <button
                      type="button"
                      onClick={() => onSetComplete(exerciseIndex, si)}
                      className={`flex h-9 w-9 items-center justify-center rounded-xl border transition-all duration-200 ${
                        set.completed
                          ? 'border-[#10B981]/40 bg-[#10B981]/15 text-[#10B981]'
                          : 'border-[#1E1E2E] bg-[#13131A] text-[#8888A0] hover:border-[#8B5CF6]/40'
                      }`}
                    >
                      <Check className="h-4 w-4" />
                    </button>
                  </div>
                ))}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </Card>
    </motion.div>
  )
}

/* ------------------------------------------------------------------ */
/*  Main Workout Page                                                 */
/* ------------------------------------------------------------------ */

export default function WorkoutPage() {
  const {
    activePlan,
    todayWorkout,
    profile,
    recentSleep,
    workoutLoading,
    fetchActivePlan,
    fetchTodayWorkout,
    fetchProfile,
    fetchRecentSleep,
    addWorkoutLog,
  } = useAppStore()

  // Local workout state
  const [exerciseSets, setExerciseSets] = useState<ActualSet[][]>([])
  const [restTimer, setRestTimer] = useState<{ active: boolean; seconds: number }>({
    active: false,
    seconds: 0,
  })
  const [generating, setGenerating] = useState(false)
  const [workoutStartTime] = useState<Date>(new Date())
  const [showSummary, setShowSummary] = useState(false)
  const [saving, setSaving] = useState(false)
  const [showCompletion, setShowCompletion] = useState(false)

  // Fetch data on mount
  useEffect(() => {
    fetchActivePlan()
    fetchTodayWorkout()
    fetchProfile()
    fetchRecentSleep()
  }, [fetchActivePlan, fetchTodayWorkout, fetchProfile, fetchRecentSleep])

  // Determine today's workout from the plan
  const todayName = DAYS_MAP[new Date().getDay()]
  const todayPlan: WorkoutDay | undefined = activePlan?.plan_data?.find(
    (d) => d.day === todayName
  )

  // Initialize exercise sets when plan loads
  useEffect(() => {
    if (todayPlan && !todayPlan.rest_day && exerciseSets.length === 0) {
      const initial = todayPlan.exercises.map((ex) =>
        Array.from({ length: ex.sets }, () => ({
          reps: 0,
          weight: 0,
          completed: false,
        }))
      )
      setExerciseSets(initial)
    }
  }, [todayPlan, exerciseSets.length])

  // Update a set's reps or weight
  const handleSetUpdate = useCallback(
    (exerciseIdx: number, setIdx: number, field: 'reps' | 'weight', value: number) => {
      setExerciseSets((prev) => {
        const copy = prev.map((ex) => ex.map((s) => ({ ...s })))
        if (copy[exerciseIdx]?.[setIdx]) {
          copy[exerciseIdx][setIdx][field] = value
        }
        return copy
      })
    },
    []
  )

  // Mark a set complete and start rest timer
  const handleSetComplete = useCallback(
    (exerciseIdx: number, setIdx: number) => {
      setExerciseSets((prev) => {
        const copy = prev.map((ex) => ex.map((s) => ({ ...s })))
        if (copy[exerciseIdx]?.[setIdx]) {
          const wasCompleted = copy[exerciseIdx][setIdx].completed
          copy[exerciseIdx][setIdx].completed = !wasCompleted

          // Start rest timer when marking complete (not un-completing)
          if (!wasCompleted && todayPlan) {
            const restSec = todayPlan.exercises[exerciseIdx]?.rest_seconds ?? 90
            setRestTimer({ active: true, seconds: restSec })
          }
        }
        return copy
      })
    },
    [todayPlan]
  )

  // Check if all exercises are complete
  const allComplete =
    exerciseSets.length > 0 &&
    exerciseSets.every((exSets) => exSets.every((s) => s.completed))

  // Calculate workout summary stats
  const totalVolume = exerciseSets.reduce((total, exSets) => {
    return (
      total +
      exSets
        .filter((s) => s.completed)
        .reduce((sum, s) => sum + s.reps * s.weight, 0)
    )
  }, 0)

  const totalSets = exerciseSets.reduce(
    (total, exSets) => total + exSets.filter((s) => s.completed).length,
    0
  )

  const durationMinutes = Math.round(
    (new Date().getTime() - workoutStartTime.getTime()) / 60000
  )

  const estimatedCalories = Math.round(durationMinutes * 6.5 + totalVolume * 0.002)

  // Show summary automatically when all complete
  useEffect(() => {
    if (allComplete && exerciseSets.length > 0) {
      setShowSummary(true)
    }
  }, [allComplete, exerciseSets.length])

  // Generate plan
  const handleGeneratePlan = async () => {
    if (!profile) return
    setGenerating(true)
    try {
      const sleepPayload = recentSleep.slice(0, 7).map((s) => ({
        date: s.date,
        hours: s.duration_hours,
        quality: s.quality,
      }))

      const res = await fetch('/api/generate-plan', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          profile,
          sleepData: sleepPayload,
          currentPlan: activePlan
            ? { days: activePlan.plan_data, name: activePlan.split_type }
            : null,
        }),
      })

      const data = await res.json()
      if (data.plan) {
        // Save plan to local storage
        const splitType =
          data.plan.filter((d: WorkoutDay) => !d.rest_day).length <= 3
            ? 'Full Body'
            : data.plan.filter((d: WorkoutDay) => !d.rest_day).length <= 4
              ? 'Upper/Lower'
              : 'PPL'

        // Save plan to local storage (auto-deactivates old plans)
        db.savePlan({
          week_number: activePlan ? activePlan.week_number + 1 : 1,
          plan_data: data.plan,
          split_type: splitType,
          days_per_week: data.plan.filter((d: WorkoutDay) => !d.rest_day).length,
          adjusted_for_sleep: !!data.sleep_analysis?.recommendation?.includes('reduce'),
          adjustment_notes: data.sleep_analysis?.recommendation ?? null,
        })

        await fetchActivePlan()
      }
    } catch (err) {
      console.error('Failed to generate plan:', err)
    } finally {
      setGenerating(false)
    }
  }

  // Finish workout
  const handleFinishWorkout = async () => {
    if (!todayPlan) return
    setSaving(true)

    const loggedExercises: LoggedExercise[] = todayPlan.exercises.map((ex, i) => ({
      name: ex.name,
      sets: exerciseSets[i]?.filter((s) => s.completed) ?? [],
    }))

    try {
      await addWorkoutLog({
        date: getToday(),
        plan_id: activePlan?.id ?? null,
        workout_name: todayPlan.name,
        exercises: loggedExercises,
        duration_minutes: durationMinutes,
        calories_burned: estimatedCalories,
        notes: '',
        completed: allComplete,
      })

      setShowCompletion(true)
      setTimeout(() => setShowCompletion(false), 3000)
    } catch (err) {
      console.error('Failed to save workout:', err)
    } finally {
      setSaving(false)
    }
  }

  /* -------- Render -------- */

  // Already logged today
  if (todayWorkout?.completed) {
    return (
      <div className="min-h-screen bg-[#0A0A0F]">
        <PageHeader title="Workout" subtitle="Today" />
        <div className="flex flex-col items-center gap-4 px-4 pt-20">
          <motion.div
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            className="flex h-20 w-20 items-center justify-center rounded-full bg-[#10B981]/15"
          >
            <Check className="h-10 w-10 text-[#10B981]" />
          </motion.div>
          <h2 className="text-xl font-semibold text-[#F1F1F3]">Workout Complete!</h2>
          <p className="text-sm text-[#8888A0]">
            {todayWorkout.workout_name} — {todayWorkout.duration_minutes} min
          </p>
          <div className="mt-2 flex gap-4">
            <div className="text-center">
              <p className="text-lg font-bold text-[#8B5CF6]">{todayWorkout.exercises.length}</p>
              <p className="text-xs text-[#8888A0]">Exercises</p>
            </div>
            <div className="text-center">
              <p className="text-lg font-bold text-[#3B82F6]">
                {todayWorkout.calories_burned}
              </p>
              <p className="text-xs text-[#8888A0]">Calories</p>
            </div>
            <div className="text-center">
              <p className="text-lg font-bold text-[#10B981]">
                {todayWorkout.duration_minutes}m
              </p>
              <p className="text-xs text-[#8888A0]">Duration</p>
            </div>
          </div>
        </div>
      </div>
    )
  }

  // No active plan
  if (!workoutLoading && !activePlan) {
    return (
      <div className="min-h-screen bg-[#0A0A0F]">
        <PageHeader title="Workout" subtitle="No plan active" />
        <div className="flex flex-col items-center gap-6 px-4 pt-20">
          <motion.div
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            className="flex h-24 w-24 items-center justify-center rounded-full bg-[#8B5CF6]/10"
          >
            <Dumbbell className="h-12 w-12 text-[#8B5CF6]" />
          </motion.div>
          <div className="text-center">
            <h2 className="text-xl font-semibold text-[#F1F1F3]">No Workout Plan</h2>
            <p className="mt-1 text-sm text-[#8888A0]">
              Generate an AI-powered plan based on your profile and sleep data.
            </p>
          </div>
          <Button
            size="lg"
            onClick={handleGeneratePlan}
            disabled={generating || !profile}
            className="w-full max-w-xs"
          >
            {generating ? (
              <>
                <RefreshCw className="h-4 w-4 animate-spin" />
                Generating Plan...
              </>
            ) : (
              <>
                <Zap className="h-4 w-4" />
                Generate AI Plan
              </>
            )}
          </Button>
          {!profile && (
            <p className="text-xs text-red-400">
              Complete your profile first to generate a plan.
            </p>
          )}
        </div>
      </div>
    )
  }

  // Rest day
  if (todayPlan?.rest_day) {
    return (
      <div className="min-h-screen bg-[#0A0A0F]">
        <PageHeader title="Workout" subtitle={todayName} />
        <div className="flex flex-col items-center gap-4 px-4 pt-20">
          <motion.div
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            className="flex h-20 w-20 items-center justify-center rounded-full bg-[#3B82F6]/10"
          >
            <Pause className="h-10 w-10 text-[#3B82F6]" />
          </motion.div>
          <h2 className="text-xl font-semibold text-[#F1F1F3]">Rest Day</h2>
          <p className="text-sm text-[#8888A0]">
            Recovery is just as important as training. Stretch, hydrate, sleep well.
          </p>
        </div>
      </div>
    )
  }

  // Loading
  if (workoutLoading || !todayPlan) {
    return (
      <div className="min-h-screen bg-[#0A0A0F]">
        <PageHeader title="Workout" />
        <div className="flex items-center justify-center pt-32">
          <RefreshCw className="h-6 w-6 animate-spin text-[#8B5CF6]" />
        </div>
      </div>
    )
  }

  /* ---- Active workout session ---- */
  return (
    <div className="min-h-screen bg-[#0A0A0F] pb-28">
      <PageHeader
        title="Workout"
        subtitle={todayName}
        rightAction={
          <div className="flex items-center gap-2">
            <Link href="/workout/history" className="flex h-9 w-9 items-center justify-center rounded-xl border border-[#1E1E2E] text-[#8888A0] hover:text-[#F1F1F3] transition-colors">
              <Clock className="h-5 w-5" />
            </Link>
            <Button
              variant="outline"
              size="sm"
              onClick={handleGeneratePlan}
              disabled={generating}
            >
              <RefreshCw className={`h-3.5 w-3.5 ${generating ? 'animate-spin' : ''}`} />
            </Button>
          </div>
        }
      />

      <div className="flex flex-col gap-4 px-4 pt-4">
        {/* Today's Workout Header */}
        <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}>
          <Card>
            <CardContent className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#8B5CF6]/15">
                  <Dumbbell className="h-5 w-5 text-[#8B5CF6]" />
                </div>
                <div>
                  <h2 className="text-base font-semibold text-[#F1F1F3]">
                    {todayPlan.name}
                  </h2>
                  <p className="text-xs text-[#8888A0]">
                    {todayPlan.exercises.length} exercises — {todayName}
                  </p>
                </div>
              </div>
              <Badge>{activePlan?.split_type ?? 'Custom'}</Badge>
            </CardContent>
          </Card>
        </motion.div>

        {/* Progress bar */}
        <div className="flex items-center gap-3 px-1">
          <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-[#1E1E2E]">
            <motion.div
              className="h-full rounded-full bg-[#8B5CF6]"
              animate={{
                width: `${exerciseSets.length > 0 ? (totalSets / exerciseSets.reduce((a, s) => a + s.length, 0)) * 100 : 0}%`,
              }}
              transition={{ type: 'spring' as const, stiffness: 80, damping: 18 }}
            />
          </div>
          <span className="text-xs tabular-nums text-[#8888A0]">
            {totalSets}/{exerciseSets.reduce((a, s) => a + s.length, 0)} sets
          </span>
        </div>

        {/* Rest Timer */}
        <AnimatePresence>
          {restTimer.active && (
            <RestTimer
              initialSeconds={restTimer.seconds}
              onDismiss={() => setRestTimer({ active: false, seconds: 0 })}
            />
          )}
        </AnimatePresence>

        {/* Exercise List */}
        <div className="flex flex-col gap-3">
          {todayPlan.exercises.map((exercise, idx) => (
            <ExerciseRow
              key={`${exercise.name}-${idx}`}
              exercise={exercise}
              exerciseIndex={idx}
              sets={exerciseSets[idx] ?? []}
              onSetUpdate={handleSetUpdate}
              onSetComplete={handleSetComplete}
            />
          ))}
        </div>

        {/* Quick stats */}
        <Card>
          <CardContent>
            <div className="grid grid-cols-3 gap-4 text-center">
              <div>
                <p className="text-lg font-bold tabular-nums text-[#8B5CF6]">
                  {totalVolume.toLocaleString()}
                </p>
                <p className="text-[10px] uppercase tracking-wider text-[#8888A0]">
                  Volume (lbs)
                </p>
              </div>
              <div>
                <p className="text-lg font-bold tabular-nums text-[#3B82F6]">
                  {durationMinutes}
                </p>
                <p className="text-[10px] uppercase tracking-wider text-[#8888A0]">
                  Minutes
                </p>
              </div>
              <div>
                <p className="text-lg font-bold tabular-nums text-[#10B981]">
                  {estimatedCalories}
                </p>
                <p className="text-[10px] uppercase tracking-wider text-[#8888A0]">
                  Calories
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Finish Workout Button */}
        <Button
          size="lg"
          onClick={() => (allComplete ? handleFinishWorkout() : setShowSummary(true))}
          disabled={saving || totalSets === 0}
          className="w-full"
        >
          {saving ? (
            <>
              <RefreshCw className="h-4 w-4 animate-spin" />
              Saving...
            </>
          ) : (
            <>
              <Check className="h-4 w-4" />
              {allComplete ? 'Finish Workout' : 'Review & Finish'}
            </>
          )}
        </Button>
      </div>

      {/* Workout Summary Modal */}
      <Modal
        isOpen={showSummary && !showCompletion}
        onClose={() => setShowSummary(false)}
        title="Workout Summary"
      >
        <div className="flex flex-col gap-5">
          <div className="grid grid-cols-2 gap-4">
            <div className="rounded-xl border border-[#1E1E2E] bg-[#0A0A0F] p-4 text-center">
              <p className="text-2xl font-bold text-[#8B5CF6]">
                {totalVolume.toLocaleString()}
              </p>
              <p className="mt-1 text-xs text-[#8888A0]">Total Volume (lbs)</p>
            </div>
            <div className="rounded-xl border border-[#1E1E2E] bg-[#0A0A0F] p-4 text-center">
              <p className="text-2xl font-bold text-[#3B82F6]">{durationMinutes}</p>
              <p className="mt-1 text-xs text-[#8888A0]">Duration (min)</p>
            </div>
            <div className="rounded-xl border border-[#1E1E2E] bg-[#0A0A0F] p-4 text-center">
              <p className="text-2xl font-bold text-[#10B981]">{estimatedCalories}</p>
              <p className="mt-1 text-xs text-[#8888A0]">Est. Calories</p>
            </div>
            <div className="rounded-xl border border-[#1E1E2E] bg-[#0A0A0F] p-4 text-center">
              <p className="text-2xl font-bold text-[#F59E0B]">{totalSets}</p>
              <p className="mt-1 text-xs text-[#8888A0]">Sets Completed</p>
            </div>
          </div>

          {/* Per-exercise breakdown */}
          <div className="flex flex-col gap-2">
            {todayPlan.exercises.map((ex, i) => {
              const exSets = exerciseSets[i] ?? []
              const completed = exSets.filter((s) => s.completed)
              const exVolume = completed.reduce((s, c) => s + c.reps * c.weight, 0)
              return (
                <div
                  key={`summary-${i}`}
                  className="flex items-center justify-between rounded-lg bg-[#0A0A0F] px-3 py-2"
                >
                  <span className="text-sm text-[#F1F1F3]">{ex.name}</span>
                  <span className="text-xs tabular-nums text-[#8888A0]">
                    {completed.length}/{exSets.length} sets · {exVolume.toLocaleString()} lbs
                  </span>
                </div>
              )
            })}
          </div>

          {!allComplete && (
            <p className="text-center text-xs text-[#F59E0B]">
              Some sets are incomplete. You can still save your progress.
            </p>
          )}

          <Button
            size="lg"
            onClick={handleFinishWorkout}
            disabled={saving}
            className="w-full"
          >
            {saving ? (
              <>
                <RefreshCw className="h-4 w-4 animate-spin" />
                Saving...
              </>
            ) : (
              <>
                <Check className="h-4 w-4" />
                Save Workout
              </>
            )}
          </Button>
        </div>
      </Modal>

      {/* Completion animation overlay */}
      <AnimatePresence>
        {showCompletion && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[60] flex flex-col items-center justify-center bg-[#0A0A0F]/95 backdrop-blur-md"
          >
            <motion.div
              initial={{ scale: 0, rotate: -180 }}
              animate={{ scale: 1, rotate: 0 }}
              transition={{ type: 'spring' as const, stiffness: 200, damping: 15 }}
              className="flex h-28 w-28 items-center justify-center rounded-full bg-[#10B981]/20"
            >
              <Zap className="h-14 w-14 text-[#10B981]" />
            </motion.div>
            <motion.h2
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3 }}
              className="mt-6 text-2xl font-bold text-[#F1F1F3]"
            >
              Workout Saved!
            </motion.h2>
            <motion.p
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.5 }}
              className="mt-2 text-sm text-[#8888A0]"
            >
              Great work today. Keep the momentum going!
            </motion.p>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
