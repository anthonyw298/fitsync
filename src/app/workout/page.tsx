'use client'

import { useState, useEffect, useRef, useCallback, useMemo } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Dumbbell,
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
  Search,
  X,
  Trash2,
  ChevronRight,
  Bookmark,
  Sparkles,
  Wrench,
  ArrowLeft,
  Minus,
  Save,
  RotateCcw,
} from 'lucide-react'
import Link from 'next/link'
import { useAppStore } from '@/store/app-store'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Modal } from '@/components/ui/modal'
import PageHeader from '@/components/layout/page-header'
import { getToday } from '@/lib/utils'
import { db } from '@/lib/local-db'
import type { Exercise, ActualSet, WorkoutDay, LoggedExercise, SavedWorkout, CustomExerciseEntry } from '@/lib/database.types'
import {
  EXERCISES,
  CATEGORY_META,
  EQUIPMENT_META,
  searchExercises,
  getCategories,
  getEquipmentTypes,
  type ExerciseCategory,
  type EquipmentType,
  type GymExercise,
} from '@/lib/exercise-database'

/* ------------------------------------------------------------------ */
/*  Types & Constants                                                 */
/* ------------------------------------------------------------------ */

type PageView = 'select' | 'browse' | 'builder' | 'session'

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
/*  Rest Timer                                                        */
/* ------------------------------------------------------------------ */

function RestTimer({ initialSeconds, onDismiss }: { initialSeconds: number; onDismiss: () => void }) {
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
      osc.connect(gain); gain.connect(ctx.destination)
      osc.frequency.value = 880; osc.type = 'sine'; gain.gain.value = 0.3
      osc.start(); osc.stop(ctx.currentTime + 0.3)
    } catch { /* noop */ }
  }, [])

  useEffect(() => {
    if (paused) return
    intervalRef.current = setInterval(() => {
      setRemaining((prev) => {
        if (prev <= 1) {
          clearInterval(intervalRef.current!); playBeep()
          try { navigator.vibrate?.([200, 100, 200]) } catch { /* noop */ }
          setTimeout(onDismiss, 1500); return 0
        }
        return prev - 1
      })
    }, 1000)
    return () => { if (intervalRef.current) clearInterval(intervalRef.current) }
  }, [paused, onDismiss, playBeep])

  useEffect(() => { return () => { if (audioRef.current) audioRef.current.close().catch(() => {}) } }, [])

  const adjust = (delta: number) => {
    setRemaining((prev) => { const n = Math.max(0, prev + delta); totalSeconds.current = Math.max(totalSeconds.current, n); return n })
  }
  const progress = totalSeconds.current > 0 ? remaining / totalSeconds.current : 0
  const circumference = 2 * Math.PI * 54
  const strokeDashoffset = circumference * (1 - progress)
  const mins = Math.floor(remaining / 60)
  const secs = remaining % 60

  return (
    <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }} className="overflow-hidden">
      <Card className="border-[#A78BFA]/30 bg-[#A78BFA]/5">
        <CardContent className="flex flex-col items-center gap-4 py-6">
          <div className="relative flex h-32 w-32 items-center justify-center">
            <svg className="-rotate-90" width="128" height="128" viewBox="0 0 128 128">
              <circle cx="64" cy="64" r="54" fill="none" stroke="rgba(255,255,255,0.06)" strokeWidth="8" />
              <motion.circle cx="64" cy="64" r="54" fill="none" stroke={remaining === 0 ? '#34D399' : '#A78BFA'} strokeWidth="8" strokeLinecap="round" strokeDasharray={circumference} animate={{ strokeDashoffset }} transition={{ duration: 0.4, ease: 'easeOut' }} />
            </svg>
            <span className="absolute text-2xl font-bold tabular-nums text-[#EAEAF0]">
              {remaining === 0 ? <Check className="h-8 w-8 text-[#34D399]" /> : `${mins}:${secs.toString().padStart(2, '0')}`}
            </span>
          </div>
          <p className="text-xs font-medium uppercase tracking-wider text-[#6B6B8A]">Rest Timer</p>
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" onClick={() => adjust(-15)} disabled={remaining <= 0}>-15s</Button>
            <Button variant="outline" size="sm" onClick={() => setPaused((p) => !p)} disabled={remaining <= 0}>{paused ? <Play className="h-4 w-4" /> : <Pause className="h-4 w-4" />}</Button>
            <Button variant="outline" size="sm" onClick={() => adjust(15)} disabled={remaining <= 0}>+15s</Button>
            <Button variant="ghost" size="sm" onClick={onDismiss} className="text-[#6B6B8A]"><SkipForward className="h-4 w-4" /><span className="ml-1">Skip</span></Button>
          </div>
        </CardContent>
      </Card>
    </motion.div>
  )
}

/* ------------------------------------------------------------------ */
/*  Exercise Row (Session)                                            */
/* ------------------------------------------------------------------ */

function ExerciseRow({ exercise, exerciseIndex, sets, onSetUpdate, onSetComplete }: {
  exercise: Exercise; exerciseIndex: number; sets: ActualSet[]
  onSetUpdate: (ei: number, si: number, f: 'reps' | 'weight', v: number) => void
  onSetComplete: (ei: number, si: number) => void
}) {
  const [expanded, setExpanded] = useState(false)
  const completedSets = sets.filter((s) => s.completed).length
  const dbEx = EXERCISES.find((e) => e.name.toLowerCase() === exercise.name.toLowerCase())
  const catColor = dbEx ? CATEGORY_META[dbEx.category].color : '#A78BFA'

  return (
    <motion.div layout initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: exerciseIndex * 0.05 }}>
      <Card>
        <button type="button" onClick={() => setExpanded(!expanded)} className="flex w-full items-center justify-between p-4 text-left">
          <div className="flex min-w-0 flex-1 items-center gap-3">
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg" style={{ backgroundColor: `${catColor}15` }}>
              <Dumbbell className="h-4 w-4" style={{ color: catColor }} />
            </div>
            <div className="flex min-w-0 flex-1 flex-col gap-0.5">
              <span className="font-medium text-[#EAEAF0]">{exercise.name}</span>
              <span className="text-xs text-[#6B6B8A]">{exercise.sets} x {exercise.reps}{exercise.notes ? ` — ${exercise.notes}` : ''}</span>
            </div>
          </div>
          <div className="ml-3 flex items-center gap-2">
            <Badge variant={completedSets === exercise.sets ? 'success' : 'default'}>{completedSets}/{exercise.sets}</Badge>
            {expanded ? <ChevronUp className="h-4 w-4 text-[#6B6B8A]" /> : <ChevronDown className="h-4 w-4 text-[#6B6B8A]" />}
          </div>
        </button>
        <AnimatePresence>
          {expanded && (
            <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }} className="overflow-hidden">
              <div className="border-t border-white/[0.06] px-4 pb-4 pt-3">
                <div className="mb-2 grid grid-cols-[auto_1fr_1fr_auto] gap-2 text-[10px] font-medium uppercase tracking-wider text-[#6B6B8A]">
                  <span className="w-8 text-center">Set</span><span>Reps</span><span>Weight (kg)</span><span className="w-9 text-center">Done</span>
                </div>
                {sets.map((set, si) => (
                  <div key={si} className="mb-1.5 grid grid-cols-[auto_1fr_1fr_auto] items-center gap-2">
                    <span className="w-8 text-center text-sm font-medium text-[#6B6B8A]">{si + 1}</span>
                    <Input type="number" inputMode="numeric" placeholder={exercise.reps} value={set.reps || ''} onChange={(e) => onSetUpdate(exerciseIndex, si, 'reps', parseInt(e.target.value) || 0)} disabled={set.completed} className="h-9 text-center" />
                    <Input type="number" inputMode="decimal" placeholder="0" value={set.weight || ''} onChange={(e) => onSetUpdate(exerciseIndex, si, 'weight', parseFloat(e.target.value) || 0)} disabled={set.completed} className="h-9 text-center" />
                    <button type="button" onClick={() => onSetComplete(exerciseIndex, si)} className={`flex h-9 w-9 items-center justify-center rounded-xl border transition-all duration-200 ${set.completed ? 'border-[#34D399]/40 bg-[#34D399]/15 text-[#34D399]' : 'border-white/[0.06] bg-[#0E0E18] text-[#6B6B8A] hover:border-[#A78BFA]/40'}`}>
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
/*  Exercise Browse Card                                              */
/* ------------------------------------------------------------------ */

function ExerciseBrowseCard({ exercise, selected, onToggle }: { exercise: GymExercise; selected: boolean; onToggle: () => void }) {
  const cat = CATEGORY_META[exercise.category]
  return (
    <motion.button type="button" onClick={onToggle} whileTap={{ scale: 0.97 }}
      className={`flex w-full items-start gap-3 rounded-2xl border p-3.5 text-left transition-all duration-200 ${selected ? 'border-[#A78BFA]/50 bg-[#A78BFA]/8 shadow-[0_0_12px_rgba(139,92,246,0.12)]' : 'border-white/[0.06] bg-[#0E0E18]/80 hover:border-white/[0.08]'}`}>
      <div className="mt-0.5 flex h-10 w-10 shrink-0 items-center justify-center rounded-xl" style={{ backgroundColor: cat.bg }}>
        <Dumbbell className="h-5 w-5" style={{ color: cat.color }} />
      </div>
      <div className="flex min-w-0 flex-1 flex-col gap-1">
        <div className="flex items-start justify-between gap-2">
          <span className="text-sm font-medium text-[#EAEAF0]">{exercise.name}</span>
          {selected && <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }} className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-[#A78BFA]"><Check className="h-3 w-3 text-white" /></motion.div>}
        </div>
        <div className="flex flex-wrap items-center gap-1.5">
          <span className="rounded-md px-1.5 py-0.5 text-[10px] font-medium" style={{ backgroundColor: cat.bg, color: cat.color }}>{cat.label}</span>
          <span className="rounded-md bg-white/[0.06] px-1.5 py-0.5 text-[10px] font-medium text-[#6B6B8A]">{EQUIPMENT_META[exercise.equipment].label}</span>
          <span className="rounded-md bg-white/[0.06] px-1.5 py-0.5 text-[10px] font-medium text-[#6B6B8A] capitalize">{exercise.difficulty}</span>
        </div>
        <p className="text-[11px] leading-relaxed text-[#6B6B8A]">
          {exercise.primaryMuscles.join(', ')}
          {exercise.secondaryMuscles.length > 0 && <span className="text-[#6B6B8A/50]"> + {exercise.secondaryMuscles.join(', ')}</span>}
        </p>
      </div>
    </motion.button>
  )
}

/* ------------------------------------------------------------------ */
/*  Builder Exercise Card                                             */
/* ------------------------------------------------------------------ */

function BuilderExerciseCard({ entry, index, onChange, onRemove }: {
  entry: CustomExerciseEntry; index: number
  onChange: (i: number, u: Partial<CustomExerciseEntry>) => void
  onRemove: (i: number) => void
}) {
  const dbEx = EXERCISES.find((e) => e.id === entry.exercise_id)
  const cat = dbEx ? CATEGORY_META[dbEx.category] : null

  return (
    <motion.div layout initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: 20 }} transition={{ delay: index * 0.03 }}>
      <Card>
        <CardContent className="p-3.5">
          <div className="mb-3 flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              {cat && <div className="flex h-8 w-8 items-center justify-center rounded-lg" style={{ backgroundColor: cat.bg }}><Dumbbell className="h-4 w-4" style={{ color: cat.color }} /></div>}
              <div>
                <p className="text-sm font-medium text-[#EAEAF0]">{entry.name}</p>
                {dbEx && <p className="text-[10px] text-[#6B6B8A]">{dbEx.primaryMuscles.join(', ')}</p>}
              </div>
            </div>
            <button type="button" onClick={() => onRemove(index)} className="rounded-lg p-1.5 text-[#6B6B8A] transition-colors hover:bg-white/[0.06] hover:text-[#F87171]"><Trash2 className="h-4 w-4" /></button>
          </div>
          <div className="grid grid-cols-4 gap-2">
            <div>
              <label className="mb-1 block text-[10px] font-medium uppercase tracking-wider text-[#6B6B8A]">Sets</label>
              <div className="flex items-center gap-1">
                <button type="button" onClick={() => onChange(index, { sets: Math.max(1, entry.sets - 1) })} className="flex h-8 w-8 items-center justify-center rounded-lg border border-white/[0.06] bg-[#0E0E18] text-[#6B6B8A] hover:text-[#EAEAF0]"><Minus className="h-3 w-3" /></button>
                <span className="flex-1 text-center text-sm font-semibold tabular-nums text-[#EAEAF0]">{entry.sets}</span>
                <button type="button" onClick={() => onChange(index, { sets: entry.sets + 1 })} className="flex h-8 w-8 items-center justify-center rounded-lg border border-white/[0.06] bg-[#0E0E18] text-[#6B6B8A] hover:text-[#EAEAF0]"><Plus className="h-3 w-3" /></button>
              </div>
            </div>
            <div>
              <label className="mb-1 block text-[10px] font-medium uppercase tracking-wider text-[#6B6B8A]">Reps</label>
              <Input type="text" value={entry.reps} onChange={(e) => onChange(index, { reps: e.target.value })} className="h-8 text-center text-sm" placeholder="8-10" />
            </div>
            <div>
              <label className="mb-1 block text-[10px] font-medium uppercase tracking-wider text-[#6B6B8A]">Weight</label>
              <Input type="number" inputMode="decimal" value={entry.weight ?? ''} onChange={(e) => onChange(index, { weight: parseFloat(e.target.value) || null })} className="h-8 text-center text-sm" placeholder="kg" />
            </div>
            <div>
              <label className="mb-1 block text-[10px] font-medium uppercase tracking-wider text-[#6B6B8A]">Rest</label>
              <Input type="number" inputMode="numeric" value={entry.rest_seconds} onChange={(e) => onChange(index, { rest_seconds: parseInt(e.target.value) || 60 })} className="h-8 text-center text-sm" placeholder="sec" />
            </div>
          </div>
        </CardContent>
      </Card>
    </motion.div>
  )
}

/* ================================================================== */
/*  MAIN WORKOUT PAGE                                                 */
/* ================================================================== */

export default function WorkoutPage() {
  const { activePlan, todayWorkout, profile, recentSleep, workoutLoading, fetchActivePlan, fetchTodayWorkout, fetchProfile, fetchRecentSleep, addWorkoutLog } = useAppStore()

  const [view, setView] = useState<PageView>('select')
  const [searchQuery, setSearchQuery] = useState('')
  const [categoryFilter, setCategoryFilter] = useState<ExerciseCategory | null>(null)
  const [equipmentFilter, setEquipmentFilter] = useState<EquipmentType | null>(null)
  const [selectedExercises, setSelectedExercises] = useState<GymExercise[]>([])
  const [workoutName, setWorkoutName] = useState('')
  const [builderExercises, setBuilderExercises] = useState<CustomExerciseEntry[]>([])
  const [saveAsTemplate, setSaveAsTemplate] = useState(false)
  const [savedWorkouts, setSavedWorkouts] = useState<SavedWorkout[]>([])
  const [showSavedModal, setShowSavedModal] = useState(false)
  const [sessionExercises, setSessionExercises] = useState<Exercise[]>([])
  const [sessionName, setSessionName] = useState('')
  const [exerciseSets, setExerciseSets] = useState<ActualSet[][]>([])
  const [restTimer, setRestTimer] = useState<{ active: boolean; seconds: number }>({ active: false, seconds: 0 })
  const [workoutStartTime, setWorkoutStartTime] = useState<Date>(new Date())
  const [showSummary, setShowSummary] = useState(false)
  const [saving, setSaving] = useState(false)
  const [showCompletion, setShowCompletion] = useState(false)
  const [sessionSource, setSessionSource] = useState<'custom' | 'plan' | 'saved'>('custom')
  const [generating, setGenerating] = useState(false)

  useEffect(() => {
    fetchActivePlan(); fetchTodayWorkout(); fetchProfile(); fetchRecentSleep()
    setSavedWorkouts(db.getSavedWorkouts() as unknown as SavedWorkout[])
  }, [fetchActivePlan, fetchTodayWorkout, fetchProfile, fetchRecentSleep])

  const todayName = DAYS_MAP[new Date().getDay()]
  const todayPlan: WorkoutDay | undefined = activePlan?.plan_data?.find((d) => d.day === todayName)

  const filteredExercises = useMemo(() => searchExercises(searchQuery, { category: categoryFilter, equipment: equipmentFilter }), [searchQuery, categoryFilter, equipmentFilter])

  const toggleExercise = useCallback((exercise: GymExercise) => {
    setSelectedExercises((prev) => prev.find((e) => e.id === exercise.id) ? prev.filter((e) => e.id !== exercise.id) : [...prev, exercise])
  }, [])

  const proceedToBuilder = useCallback(() => {
    const entries: CustomExerciseEntry[] = selectedExercises.map((ex) => ({
      exercise_id: ex.id, name: ex.name, sets: ex.defaultSets, reps: ex.defaultReps,
      weight: db.getLastWeightForExercise(ex.name), rest_seconds: ex.defaultRest, notes: '',
    }))
    setBuilderExercises(entries); setWorkoutName(''); setView('builder')
  }, [selectedExercises])

  const updateBuilderExercise = useCallback((index: number, updates: Partial<CustomExerciseEntry>) => {
    setBuilderExercises((prev) => { const c = [...prev]; c[index] = { ...c[index], ...updates }; return c })
  }, [])

  const removeBuilderExercise = useCallback((index: number) => {
    setBuilderExercises((prev) => {
      const removed = prev[index]
      setSelectedExercises((sel) => sel.filter((e) => e.id !== removed?.exercise_id))
      return prev.filter((_, i) => i !== index)
    })
  }, [])

  const startCustomSession = useCallback(() => {
    const exercises: Exercise[] = builderExercises.map((e) => ({ name: e.name, sets: e.sets, reps: e.reps, weight: e.weight, rest_seconds: e.rest_seconds, notes: e.notes }))
    if (saveAsTemplate && workoutName.trim()) {
      const saved = db.saveWorkout({ name: workoutName.trim(), exercises: builderExercises })
      setSavedWorkouts((prev) => [saved as unknown as SavedWorkout, ...prev])
    }
    setSessionExercises(exercises); setSessionName(workoutName.trim() || 'Custom Workout'); setSessionSource('custom')
    setWorkoutStartTime(new Date())
    setExerciseSets(exercises.map((ex) => Array.from({ length: ex.sets }, () => ({ reps: 0, weight: ex.weight ?? 0, completed: false }))))
    setView('session')
  }, [builderExercises, saveAsTemplate, workoutName])

  const startPlanSession = useCallback(() => {
    if (!todayPlan || todayPlan.rest_day) return
    setSessionExercises(todayPlan.exercises); setSessionName(todayPlan.name); setSessionSource('plan')
    setWorkoutStartTime(new Date())
    setExerciseSets(todayPlan.exercises.map((ex) => Array.from({ length: ex.sets }, () => ({ reps: 0, weight: ex.weight ?? 0, completed: false }))))
    setView('session')
  }, [todayPlan])

  const startSavedSession = useCallback((saved: SavedWorkout) => {
    const exercises: Exercise[] = saved.exercises.map((e) => ({
      name: e.name, sets: e.sets, reps: e.reps, weight: db.getLastWeightForExercise(e.name) ?? e.weight, rest_seconds: e.rest_seconds, notes: e.notes,
    }))
    db.markSavedWorkoutUsed(saved.id)
    setSessionExercises(exercises); setSessionName(saved.name); setSessionSource('saved')
    setWorkoutStartTime(new Date())
    setExerciseSets(exercises.map((ex) => Array.from({ length: ex.sets }, () => ({ reps: 0, weight: ex.weight ?? 0, completed: false }))))
    setShowSavedModal(false); setView('session')
  }, [])

  const deleteSavedWorkout = useCallback((id: string) => { db.deleteSavedWorkout(id); setSavedWorkouts((p) => p.filter((w) => w.id !== id)) }, [])

  const handleSetUpdate = useCallback((ei: number, si: number, field: 'reps' | 'weight', value: number) => {
    setExerciseSets((prev) => { const c = prev.map((ex) => ex.map((s) => ({ ...s }))); if (c[ei]?.[si]) c[ei][si][field] = value; return c })
  }, [])

  const handleSetComplete = useCallback((ei: number, si: number) => {
    setExerciseSets((prev) => {
      const c = prev.map((ex) => ex.map((s) => ({ ...s })))
      if (c[ei]?.[si]) {
        const was = c[ei][si].completed; c[ei][si].completed = !was
        if (!was) { const r = sessionExercises[ei]?.rest_seconds ?? 90; setRestTimer({ active: true, seconds: r }) }
      }
      return c
    })
  }, [sessionExercises])

  const allComplete = exerciseSets.length > 0 && exerciseSets.every((es) => es.every((s) => s.completed))
  const totalVolume = exerciseSets.reduce((t, es) => t + es.filter((s) => s.completed).reduce((s, c) => s + c.reps * c.weight, 0), 0)
  const totalSets = exerciseSets.reduce((t, es) => t + es.filter((s) => s.completed).length, 0)
  const totalPossibleSets = exerciseSets.reduce((a, s) => a + s.length, 0)
  const durationMinutes = Math.round((new Date().getTime() - workoutStartTime.getTime()) / 60000)
  const estimatedCalories = Math.round(durationMinutes * 6.5 + totalVolume * 0.002)

  useEffect(() => { if (allComplete && exerciseSets.length > 0 && view === 'session') setShowSummary(true) }, [allComplete, exerciseSets.length, view])

  const handleGeneratePlan = async () => {
    if (!profile) return; setGenerating(true)
    try {
      const sleepPayload = recentSleep.slice(0, 7).map((s) => ({ date: s.date, hours: s.duration_hours, quality: s.quality }))
      const res = await fetch('/api/generate-plan', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ profile, sleepData: sleepPayload, currentPlan: activePlan ? { days: activePlan.plan_data, name: activePlan.split_type } : null }),
      })
      const data = await res.json()
      if (data.plan) {
        const st = data.plan.filter((d: WorkoutDay) => !d.rest_day).length <= 3 ? 'Full Body' : data.plan.filter((d: WorkoutDay) => !d.rest_day).length <= 4 ? 'Upper/Lower' : 'PPL'
        await fetch('/api/data/workout/plans', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ week_number: activePlan ? activePlan.week_number + 1 : 1, plan_data: data.plan, split_type: st, days_per_week: data.plan.filter((d: WorkoutDay) => !d.rest_day).length, adjusted_for_sleep: !!data.sleep_analysis?.recommendation?.includes('reduce'), adjustment_notes: data.sleep_analysis?.recommendation ?? null, active: true }),
        })
        await fetchActivePlan()
      }
    } catch (err) { console.error('Failed to generate plan:', err) } finally { setGenerating(false) }
  }

  const handleFinishWorkout = async () => {
    setSaving(true)
    const loggedExercises: LoggedExercise[] = sessionExercises.map((ex, i) => ({ name: ex.name, sets: exerciseSets[i]?.filter((s) => s.completed) ?? [] }))
    try {
      await addWorkoutLog({ date: getToday(), plan_id: sessionSource === 'plan' ? activePlan?.id ?? null : null, workout_name: sessionName, exercises: loggedExercises, duration_minutes: durationMinutes, calories_burned: estimatedCalories, notes: sessionSource === 'saved' ? `Saved template: ${sessionName}` : '', completed: allComplete })
      setShowSummary(false); setShowCompletion(true)
      setTimeout(() => { setShowCompletion(false); fetchTodayWorkout() }, 3000)
    } catch (err) { console.error('Failed to save workout:', err) } finally { setSaving(false) }
  }

  const resetToSelect = useCallback(() => {
    setView('select'); setSelectedExercises([]); setBuilderExercises([]); setSearchQuery('')
    setCategoryFilter(null); setEquipmentFilter(null); setWorkoutName(''); setSaveAsTemplate(false)
  }, [])

  /* ── Completed today ── */
  if (todayWorkout?.completed) {
    return (
      <div className="min-h-screen bg-transparent">
        <PageHeader title="Workout" subtitle="Today" rightAction={<Link href="/workout/history" className="flex h-9 w-9 items-center justify-center rounded-xl border border-white/[0.06] text-[#6B6B8A] hover:text-[#EAEAF0] transition-colors"><Clock className="h-5 w-5" /></Link>} />
        <div className="flex flex-col items-center gap-4 px-4 pt-20">
          <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }} className="flex h-20 w-20 items-center justify-center rounded-full bg-[#34D399]/15"><Check className="h-10 w-10 text-[#34D399]" /></motion.div>
          <h2 className="text-xl font-semibold text-[#EAEAF0]">Workout Complete!</h2>
          <p className="text-sm text-[#6B6B8A]">{todayWorkout.workout_name} — {todayWorkout.duration_minutes} min</p>
          <div className="mt-2 flex gap-4">
            <div className="text-center"><p className="text-lg font-bold text-[#A78BFA]">{todayWorkout.exercises.length}</p><p className="text-xs text-[#6B6B8A]">Exercises</p></div>
            <div className="text-center"><p className="text-lg font-bold text-[#38BDF8]">{todayWorkout.calories_burned}</p><p className="text-xs text-[#6B6B8A]">Calories</p></div>
            <div className="text-center"><p className="text-lg font-bold text-[#34D399]">{todayWorkout.duration_minutes}m</p><p className="text-xs text-[#6B6B8A]">Duration</p></div>
          </div>
        </div>
      </div>
    )
  }

  /* ── Loading ── */
  if (workoutLoading && view === 'select') {
    return (<div className="min-h-screen bg-transparent"><PageHeader title="Workout" /><div className="flex items-center justify-center pt-32"><RefreshCw className="h-6 w-6 animate-spin text-[#A78BFA]" /></div></div>)
  }

  /* ── Select Mode ── */
  if (view === 'select') {
    return (
      <div className="min-h-screen bg-transparent pb-28">
        <PageHeader title="Workout" subtitle={todayName} rightAction={<Link href="/workout/history" className="flex h-9 w-9 items-center justify-center rounded-xl border border-white/[0.06] text-[#6B6B8A] hover:text-[#EAEAF0] transition-colors"><Clock className="h-5 w-5" /></Link>} />
        <div className="flex flex-col gap-4 px-4 pt-4">
          {/* Hero */}
          <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}>
            <div className="relative overflow-hidden rounded-2xl border border-white/[0.06] bg-gradient-to-br from-[#A78BFA]/8 via-[#0E0E18] to-[#38BDF8]/5 p-5">
              <div className="absolute -right-4 -top-4 h-24 w-24 rounded-full bg-[#A78BFA]/5 blur-2xl" />
              <div className="absolute -bottom-4 -left-4 h-20 w-20 rounded-full bg-[#38BDF8]/5 blur-2xl" />
              <div className="relative"><h2 className="text-lg font-semibold text-[#EAEAF0]">Start Your Workout</h2><p className="mt-1 text-sm text-[#6B6B8A]">Build your own or let AI generate one for you</p></div>
            </div>
          </motion.div>

          {/* Today's plan */}
          {activePlan && todayPlan && !todayPlan.rest_day && (
            <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.05 }}>
              <button type="button" onClick={startPlanSession} className="flex w-full items-center gap-4 rounded-2xl border border-[#A78BFA]/20 bg-[#A78BFA]/5 p-4 text-left transition-all active:scale-[0.98] hover:border-[#A78BFA]/40">
                <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-[#A78BFA]/15"><Zap className="h-6 w-6 text-[#A78BFA]" /></div>
                <div className="flex-1"><p className="text-sm font-semibold text-[#EAEAF0]">Today&apos;s Plan: {todayPlan.name}</p><p className="text-xs text-[#6B6B8A]">{todayPlan.exercises.length} exercises — {activePlan.split_type}</p></div>
                <ChevronRight className="h-5 w-5 text-[#6B6B8A]" />
              </button>
            </motion.div>
          )}

          {/* Rest day */}
          {activePlan && todayPlan?.rest_day && (
            <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.05 }}>
              <Card className="border-[#38BDF8]/20 bg-[#38BDF8]/5">
                <CardContent className="flex items-center gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#38BDF8]/15"><Pause className="h-5 w-5 text-[#38BDF8]" /></div>
                  <div><p className="text-sm font-semibold text-[#EAEAF0]">Rest Day (from plan)</p><p className="text-xs text-[#6B6B8A]">You can still do a custom workout below</p></div>
                </CardContent>
              </Card>
            </motion.div>
          )}

          {/* Action cards */}
          <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }} className="grid grid-cols-2 gap-3">
            <button type="button" onClick={() => setView('browse')} className="flex flex-col items-center gap-3 rounded-2xl border border-white/[0.06] bg-[#0E0E18]/80 p-5 transition-all active:scale-[0.97] hover:border-[#34D399]/30">
              <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-[#34D399]/10"><Wrench className="h-7 w-7 text-[#34D399]" /></div>
              <div className="text-center"><p className="text-sm font-semibold text-[#EAEAF0]">Build My Own</p><p className="mt-0.5 text-[11px] text-[#6B6B8A]">Choose from {EXERCISES.length}+ exercises</p></div>
            </button>
            <button type="button" onClick={handleGeneratePlan} disabled={generating || !profile} className="flex flex-col items-center gap-3 rounded-2xl border border-white/[0.06] bg-[#0E0E18]/80 p-5 transition-all active:scale-[0.97] hover:border-[#A78BFA]/30 disabled:opacity-50">
              <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-[#A78BFA]/10">
                {generating ? <RefreshCw className="h-7 w-7 animate-spin text-[#A78BFA]" /> : <Sparkles className="h-7 w-7 text-[#A78BFA]" />}
              </div>
              <div className="text-center"><p className="text-sm font-semibold text-[#EAEAF0]">{generating ? 'Generating...' : 'AI Generate'}</p><p className="mt-0.5 text-[11px] text-[#6B6B8A]">{activePlan ? 'New weekly plan' : 'Smart plan for you'}</p></div>
            </button>
          </motion.div>
          {!profile && <p className="text-center text-xs text-[#FBBF24]">Complete your profile to generate AI plans.</p>}

          {/* Saved workouts */}
          {savedWorkouts.length > 0 && (
            <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.15 }}>
              <div className="mb-2 flex items-center justify-between px-1">
                <h3 className="text-sm font-semibold text-[#EAEAF0]">Saved Workouts</h3>
                {savedWorkouts.length > 3 && <button type="button" onClick={() => setShowSavedModal(true)} className="text-xs font-medium text-[#A78BFA]">See All</button>}
              </div>
              <div className="flex flex-col gap-2">
                {savedWorkouts.slice(0, 3).map((saved, i) => (
                  <motion.div key={saved.id} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 + i * 0.04 }}>
                    <div className="flex items-center gap-3 rounded-2xl border border-white/[0.06] bg-[#0E0E18]/80 p-3.5">
                      <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#FBBF24]/10"><Bookmark className="h-5 w-5 text-[#FBBF24]" /></div>
                      <div className="flex-1"><p className="text-sm font-medium text-[#EAEAF0]">{saved.name}</p><p className="text-[11px] text-[#6B6B8A]">{saved.exercises.length} exercises</p></div>
                      <div className="flex items-center gap-1.5">
                        <button type="button" onClick={() => deleteSavedWorkout(saved.id)} className="rounded-lg p-1.5 text-[#6B6B8A] transition-colors hover:text-[#F87171]"><Trash2 className="h-4 w-4" /></button>
                        <Button size="sm" onClick={() => startSavedSession(saved)}><Play className="h-3.5 w-3.5" />Start</Button>
                      </div>
                    </div>
                  </motion.div>
                ))}
              </div>
            </motion.div>
          )}

          {/* Active plan info */}
          {activePlan && (
            <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}>
              <Card><CardContent><div className="flex items-center justify-between"><div><p className="text-xs font-medium uppercase tracking-wider text-[#6B6B8A]">Active Plan</p><p className="mt-0.5 text-sm font-semibold text-[#EAEAF0]">{activePlan.split_type} — Week {activePlan.week_number}</p></div><Badge>{activePlan.days_per_week} days/wk</Badge></div></CardContent></Card>
            </motion.div>
          )}
        </div>

        <Modal isOpen={showSavedModal} onClose={() => setShowSavedModal(false)} title="Saved Workouts">
          <div className="flex flex-col gap-3">
            {savedWorkouts.map((saved) => (
              <div key={saved.id} className="flex items-center gap-3 rounded-xl border border-white/[0.06] bg-[#0E0E18] p-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#FBBF24]/10"><Bookmark className="h-5 w-5 text-[#FBBF24]" /></div>
                <div className="flex-1"><p className="text-sm font-medium text-[#EAEAF0]">{saved.name}</p><p className="text-[11px] text-[#6B6B8A]">{saved.exercises.length} exercises{saved.last_used && ` — Last used ${new Date(saved.last_used).toLocaleDateString()}`}</p></div>
                <div className="flex items-center gap-1.5">
                  <button type="button" onClick={() => deleteSavedWorkout(saved.id)} className="rounded-lg p-1.5 text-[#6B6B8A] transition-colors hover:text-[#F87171]"><Trash2 className="h-4 w-4" /></button>
                  <Button size="sm" onClick={() => startSavedSession(saved)}><Play className="h-3.5 w-3.5" />Start</Button>
                </div>
              </div>
            ))}
          </div>
        </Modal>
      </div>
    )
  }

  /* ── Exercise Browser ── */
  if (view === 'browse') {
    return (
      <div className="min-h-screen bg-transparent pb-32">
        <PageHeader title="Choose Exercises" subtitle={`${selectedExercises.length} selected`} rightAction={<button type="button" onClick={resetToSelect} className="flex h-9 w-9 items-center justify-center rounded-xl border border-white/[0.06] text-[#6B6B8A] hover:text-[#EAEAF0] transition-colors"><ArrowLeft className="h-5 w-5" /></button>} />
        <div className="flex flex-col gap-3 px-4 pt-3">
          {/* Search */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[#6B6B8A]" />
            <input type="text" placeholder="Search exercises, muscles, equipment..." value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} className="h-10 w-full rounded-xl border border-white/[0.06] bg-[#0E0E18] pl-10 pr-10 text-sm text-[#EAEAF0] placeholder-[#6B6B8A] outline-none transition-colors focus:border-[#A78BFA]/50" />
            {searchQuery && <button type="button" onClick={() => setSearchQuery('')} className="absolute right-3 top-1/2 -translate-y-1/2 text-[#6B6B8A] hover:text-[#EAEAF0]"><X className="h-4 w-4" /></button>}
          </div>

          {/* Category filters */}
          <div className="flex gap-1.5 overflow-x-auto pb-1 scrollbar-none">
            <button type="button" onClick={() => setCategoryFilter(null)} className={`shrink-0 rounded-lg px-3 py-1.5 text-xs font-medium transition-colors ${categoryFilter === null ? 'bg-[#A78BFA] text-white' : 'bg-white/[0.06] text-[#6B6B8A] hover:text-[#EAEAF0]'}`}>All</button>
            {getCategories().map((cat) => {
              const meta = CATEGORY_META[cat]; const isA = categoryFilter === cat
              return <button key={cat} type="button" onClick={() => setCategoryFilter(isA ? null : cat)} className="shrink-0 rounded-lg px-3 py-1.5 text-xs font-medium transition-colors" style={{ backgroundColor: isA ? meta.color : 'rgba(255,255,255,0.06)', color: isA ? '#fff' : '#6B6B8A' }}>{meta.label}</button>
            })}
          </div>

          {/* Equipment filters */}
          <div className="flex gap-1.5 overflow-x-auto pb-1 scrollbar-none">
            <button type="button" onClick={() => setEquipmentFilter(null)} className={`shrink-0 rounded-lg px-2.5 py-1 text-[11px] font-medium transition-colors ${equipmentFilter === null ? 'bg-[#EAEAF0]/15 text-[#EAEAF0]' : 'bg-[#0E0E18] text-[#6B6B8A] hover:text-[#6B6B8A]'}`}>All Gear</button>
            {getEquipmentTypes().map((eq) => {
              const isA = equipmentFilter === eq
              return <button key={eq} type="button" onClick={() => setEquipmentFilter(isA ? null : eq)} className={`shrink-0 rounded-lg px-2.5 py-1 text-[11px] font-medium transition-colors ${isA ? 'bg-[#EAEAF0]/15 text-[#EAEAF0]' : 'bg-[#0E0E18] text-[#6B6B8A] hover:text-[#6B6B8A]'}`}>{EQUIPMENT_META[eq].label}</button>
            })}
          </div>

          <p className="px-1 text-xs text-[#6B6B8A]">{filteredExercises.length} exercise{filteredExercises.length !== 1 ? 's' : ''}</p>

          <div className="flex flex-col gap-2">
            {filteredExercises.map((exercise) => (
              <ExerciseBrowseCard key={exercise.id} exercise={exercise} selected={selectedExercises.some((e) => e.id === exercise.id)} onToggle={() => toggleExercise(exercise)} />
            ))}
            {filteredExercises.length === 0 && (
              <div className="flex flex-col items-center gap-3 py-12">
                <div className="flex h-14 w-14 items-center justify-center rounded-full bg-white/[0.06]"><Search className="h-7 w-7 text-[#6B6B8A]" /></div>
                <p className="text-sm text-[#6B6B8A]">No exercises found</p><p className="text-xs text-[#6B6B8A]">Try different search terms or filters</p>
              </div>
            )}
          </div>
        </div>

        {/* Bottom bar */}
        <AnimatePresence>
          {selectedExercises.length > 0 && (
            <motion.div initial={{ y: 100, opacity: 0 }} animate={{ y: 0, opacity: 1 }} exit={{ y: 100, opacity: 0 }} className="fixed bottom-20 left-0 right-0 z-40 px-4 pb-2">
              <div className="flex items-center gap-3 rounded-2xl border border-[#A78BFA]/30 bg-[#0E0E18]/95 p-3 shadow-[0_-4px_24px_rgba(0,0,0,0.6)] backdrop-blur-xl">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#A78BFA]/15"><span className="text-sm font-bold text-[#A78BFA]">{selectedExercises.length}</span></div>
                <div className="flex-1"><p className="text-sm font-medium text-[#EAEAF0]">{selectedExercises.length} exercise{selectedExercises.length !== 1 ? 's' : ''} selected</p></div>
                <Button size="sm" onClick={proceedToBuilder}>Next<ChevronRight className="h-4 w-4" /></Button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    )
  }

  /* ── Builder ── */
  if (view === 'builder') {
    return (
      <div className="min-h-screen bg-transparent pb-28">
        <PageHeader title="Build Workout" subtitle={`${builderExercises.length} exercises`} rightAction={<button type="button" onClick={() => setView('browse')} className="flex h-9 w-9 items-center justify-center rounded-xl border border-white/[0.06] text-[#6B6B8A] hover:text-[#EAEAF0] transition-colors"><ArrowLeft className="h-5 w-5" /></button>} />
        <div className="flex flex-col gap-4 px-4 pt-4">
          <div>
            <label className="mb-1.5 block text-xs font-medium uppercase tracking-wider text-[#6B6B8A]">Workout Name</label>
            <input type="text" value={workoutName} onChange={(e) => setWorkoutName(e.target.value)} placeholder="e.g. Push Day, Leg Blast, Upper Body..." className="h-11 w-full rounded-xl border border-white/[0.06] bg-[#0E0E18] px-4 text-sm text-[#EAEAF0] placeholder-[#6B6B8A] outline-none transition-colors focus:border-[#A78BFA]/50" />
          </div>

          <div className="flex flex-col gap-3">
            <AnimatePresence>
              {builderExercises.map((entry, i) => <BuilderExerciseCard key={entry.exercise_id} entry={entry} index={i} onChange={updateBuilderExercise} onRemove={removeBuilderExercise} />)}
            </AnimatePresence>
          </div>

          <button type="button" onClick={() => setView('browse')} className="flex items-center justify-center gap-2 rounded-2xl border border-dashed border-white/[0.08] py-4 text-sm font-medium text-[#6B6B8A] transition-colors hover:border-[#A78BFA]/40 hover:text-[#A78BFA]">
            <Plus className="h-4 w-4" />Add More Exercises
          </button>

          <button type="button" onClick={() => setSaveAsTemplate((p) => !p)} className={`flex items-center gap-3 rounded-xl border p-3 transition-all ${saveAsTemplate ? 'border-[#FBBF24]/30 bg-[#FBBF24]/5' : 'border-white/[0.06] bg-[#0E0E18]/80'}`}>
            <div className={`flex h-5 w-5 items-center justify-center rounded-md border transition-colors ${saveAsTemplate ? 'border-[#FBBF24] bg-[#FBBF24]' : 'border-white/[0.10]'}`}>{saveAsTemplate && <Check className="h-3 w-3 text-[#0E0E18]" />}</div>
            <div className="flex-1 text-left"><p className="text-sm font-medium text-[#EAEAF0]">Save as Template</p><p className="text-[11px] text-[#6B6B8A]">Reuse this workout later</p></div>
            <Save className="h-4 w-4 text-[#6B6B8A]" />
          </button>

          <Button size="lg" onClick={startCustomSession} disabled={builderExercises.length === 0} className="w-full"><Play className="h-4 w-4" />Start Workout</Button>
        </div>
      </div>
    )
  }

  /* ── Active Session ── */
  return (
    <div className="min-h-screen bg-transparent pb-28">
      <PageHeader title="Workout" subtitle={todayName} rightAction={
        <div className="flex items-center gap-2">
          <Link href="/workout/history" className="flex h-9 w-9 items-center justify-center rounded-xl border border-white/[0.06] text-[#6B6B8A] hover:text-[#EAEAF0] transition-colors"><Clock className="h-5 w-5" /></Link>
          <button type="button" onClick={resetToSelect} className="flex h-9 w-9 items-center justify-center rounded-xl border border-white/[0.06] text-[#6B6B8A] hover:text-[#EAEAF0] transition-colors" title="Back to selection"><RotateCcw className="h-4 w-4" /></button>
        </div>
      } />
      <div className="flex flex-col gap-4 px-4 pt-4">
        {/* Session header */}
        <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}>
          <Card><CardContent className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#A78BFA]/15"><Dumbbell className="h-5 w-5 text-[#A78BFA]" /></div>
              <div><h2 className="text-base font-semibold text-[#EAEAF0]">{sessionName}</h2><p className="text-xs text-[#6B6B8A]">{sessionExercises.length} exercises — {todayName}</p></div>
            </div>
            <Badge>{sessionSource === 'plan' ? activePlan?.split_type ?? 'Plan' : sessionSource === 'saved' ? 'Saved' : 'Custom'}</Badge>
          </CardContent></Card>
        </motion.div>

        {/* Progress */}
        <div className="flex items-center gap-3 px-1">
          <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-white/[0.06]">
            <motion.div className="h-full rounded-full bg-[#A78BFA]" animate={{ width: `${totalPossibleSets > 0 ? (totalSets / totalPossibleSets) * 100 : 0}%` }} transition={{ type: 'spring' as const, stiffness: 80, damping: 18 }} />
          </div>
          <span className="text-xs tabular-nums text-[#6B6B8A]">{totalSets}/{totalPossibleSets} sets</span>
        </div>

        <AnimatePresence>{restTimer.active && <RestTimer initialSeconds={restTimer.seconds} onDismiss={() => setRestTimer({ active: false, seconds: 0 })} />}</AnimatePresence>

        <div className="flex flex-col gap-3">
          {sessionExercises.map((exercise, idx) => (
            <ExerciseRow key={`${exercise.name}-${idx}`} exercise={exercise} exerciseIndex={idx} sets={exerciseSets[idx] ?? []} onSetUpdate={handleSetUpdate} onSetComplete={handleSetComplete} />
          ))}
        </div>

        {/* Stats */}
        <Card><CardContent><div className="grid grid-cols-3 gap-4 text-center">
          <div><p className="text-lg font-bold tabular-nums text-[#A78BFA]">{totalVolume.toLocaleString()}</p><p className="text-[10px] uppercase tracking-wider text-[#6B6B8A]">Volume (lbs)</p></div>
          <div><p className="text-lg font-bold tabular-nums text-[#38BDF8]">{durationMinutes}</p><p className="text-[10px] uppercase tracking-wider text-[#6B6B8A]">Minutes</p></div>
          <div><p className="text-lg font-bold tabular-nums text-[#34D399]">{estimatedCalories}</p><p className="text-[10px] uppercase tracking-wider text-[#6B6B8A]">Calories</p></div>
        </div></CardContent></Card>

        <Button size="lg" onClick={() => allComplete ? handleFinishWorkout() : setShowSummary(true)} disabled={saving || totalSets === 0} className="w-full">
          {saving ? <><RefreshCw className="h-4 w-4 animate-spin" />Saving...</> : <><Check className="h-4 w-4" />{allComplete ? 'Finish Workout' : 'Review & Finish'}</>}
        </Button>
      </div>

      {/* Summary modal */}
      <Modal isOpen={showSummary && !showCompletion} onClose={() => setShowSummary(false)} title="Workout Summary">
        <div className="flex flex-col gap-5">
          <div className="grid grid-cols-2 gap-4">
            <div className="rounded-xl border border-white/[0.06] bg-[#0E0E18] p-4 text-center"><p className="text-2xl font-bold text-[#A78BFA]">{totalVolume.toLocaleString()}</p><p className="mt-1 text-xs text-[#6B6B8A]">Total Volume (lbs)</p></div>
            <div className="rounded-xl border border-white/[0.06] bg-[#0E0E18] p-4 text-center"><p className="text-2xl font-bold text-[#38BDF8]">{durationMinutes}</p><p className="mt-1 text-xs text-[#6B6B8A]">Duration (min)</p></div>
            <div className="rounded-xl border border-white/[0.06] bg-[#0E0E18] p-4 text-center"><p className="text-2xl font-bold text-[#34D399]">{estimatedCalories}</p><p className="mt-1 text-xs text-[#6B6B8A]">Est. Calories</p></div>
            <div className="rounded-xl border border-white/[0.06] bg-[#0E0E18] p-4 text-center"><p className="text-2xl font-bold text-[#FBBF24]">{totalSets}</p><p className="mt-1 text-xs text-[#6B6B8A]">Sets Completed</p></div>
          </div>
          <div className="flex flex-col gap-2">
            {sessionExercises.map((ex, i) => {
              const exS = exerciseSets[i] ?? []; const completed = exS.filter((s) => s.completed)
              const exV = completed.reduce((s, c) => s + c.reps * c.weight, 0)
              return <div key={`summary-${i}`} className="flex items-center justify-between rounded-lg bg-[#0E0E18] px-3 py-2"><span className="text-sm text-[#EAEAF0]">{ex.name}</span><span className="text-xs tabular-nums text-[#6B6B8A]">{completed.length}/{exS.length} sets · {exV.toLocaleString()} lbs</span></div>
            })}
          </div>
          {!allComplete && <p className="text-center text-xs text-[#FBBF24]">Some sets are incomplete. You can still save your progress.</p>}
          <Button size="lg" onClick={handleFinishWorkout} disabled={saving} className="w-full">
            {saving ? <><RefreshCw className="h-4 w-4 animate-spin" />Saving...</> : <><Check className="h-4 w-4" />Save Workout</>}
          </Button>
        </div>
      </Modal>

      {/* Completion overlay */}
      <AnimatePresence>
        {showCompletion && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 z-[60] flex flex-col items-center justify-center bg-[#0E0E18]/95 backdrop-blur-md">
            <motion.div initial={{ scale: 0, rotate: -180 }} animate={{ scale: 1, rotate: 0 }} transition={{ type: 'spring' as const, stiffness: 200, damping: 15 }} className="flex h-28 w-28 items-center justify-center rounded-full bg-[#34D399]/20"><Zap className="h-14 w-14 text-[#34D399]" /></motion.div>
            <motion.h2 initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }} className="mt-6 text-2xl font-bold text-[#EAEAF0]">Workout Saved!</motion.h2>
            <motion.p initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.5 }} className="mt-2 text-sm text-[#6B6B8A]">Great work today. Keep the momentum going!</motion.p>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
