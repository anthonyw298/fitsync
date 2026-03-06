'use client'

import { useState, useEffect, useMemo, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  User,
  Ruler,
  Weight,
  Target,
  Activity,
  Save,
  TrendingDown,
  Minus,
  TrendingUp,
  AlertTriangle,
  Trash2,
  Download,
  Plus,
  Scale as ScaleIcon,
  Calendar,
} from 'lucide-react'
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  ReferenceLine,
} from 'recharts'
import { useAppStore } from '@/store/app-store'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Select } from '@/components/ui/select'
import { MacroRing } from '@/components/ui/macro-ring'
import { Modal } from '@/components/ui/modal'
import { Badge } from '@/components/ui/badge'
import type { WeightLog } from '@/lib/database.types'
import {
  calculateBMR,
  calculateTDEE,
  calculateMacros,
  getMacroColor,
  formatHeight,
} from '@/lib/utils'

/* -------------------------------------------------------------------------- */
/*  Constants                                                                 */
/* -------------------------------------------------------------------------- */

const ACTIVITY_OPTIONS = [
  { value: 'sedentary', label: 'Sedentary (office job, little exercise)' },
  { value: 'light', label: 'Light (1-3 days/week)' },
  { value: 'moderate', label: 'Moderate (3-5 days/week)' },
  { value: 'active', label: 'Active (6-7 days/week)' },
  { value: 'very_active', label: 'Very Active (2x/day, physical job)' },
]

const GENDER_OPTIONS = [
  { value: 'male', label: 'Male' },
  { value: 'female', label: 'Female' },
]

interface GoalOption {
  value: 'cut' | 'maintain' | 'bulk'
  label: string
  description: string
  icon: React.ElementType
}

const GOAL_OPTIONS: GoalOption[] = [
  {
    value: 'cut',
    label: 'Cut',
    description: 'Lose fat while preserving muscle. 20% calorie deficit.',
    icon: TrendingDown,
  },
  {
    value: 'maintain',
    label: 'Maintain',
    description: 'Maintain current weight and body composition.',
    icon: Minus,
  },
  {
    value: 'bulk',
    label: 'Bulk',
    description: 'Build muscle with a controlled surplus. +15% calories.',
    icon: TrendingUp,
  },
]

const ACTIVITY_LABELS: Record<string, string> = {
  sedentary: 'Sedentary',
  light: 'Light',
  moderate: 'Moderate',
  active: 'Active',
  very_active: 'Very Active',
}

const WATER_PRESETS = [2000, 2500, 3000]

/* -------------------------------------------------------------------------- */
/*  Custom Tooltip for Recharts                                               */
/* -------------------------------------------------------------------------- */

function WeightTooltip({ active, payload, label }: { active?: boolean; payload?: Array<{ value: number }>; label?: string }) {
  if (!active || !payload?.length) return null
  return (
    <div className="rounded-lg border border-white/[0.06] glass-dense px-3 py-2 shadow-xl">
      <p className="text-xs text-[#6B6B8A]">{label}</p>
      <p className="text-sm font-bold text-[#EAEAF0]">{payload[0].value} kg</p>
    </div>
  )
}

/* -------------------------------------------------------------------------- */
/*  Profile Page                                                              */
/* -------------------------------------------------------------------------- */

export default function ProfilePage() {
  /* ── Store ─────────────────────────────────────────────────────────────── */
  const {
    profile,
    profileLoading,
    fetchProfile,
    updateProfile,
    weightLogs,
    weightLoading,
    fetchWeightLogs,
    addWeightLog,
    deleteWeightLog,
  } = useAppStore()

  /* ── Form state ────────────────────────────────────────────────────────── */
  const [age, setAge] = useState(25)
  const [heightIn, setHeightIn] = useState(69)
  const [weightKg, setWeightKg] = useState(75)
  const [gender, setGender] = useState<'male' | 'female'>('male')
  const [activityLevel, setActivityLevel] = useState('moderate')
  const [fitnessGoal, setFitnessGoal] = useState<'cut' | 'maintain' | 'bulk'>('maintain')
  const [workoutDays, setWorkoutDays] = useState(4)
  const [goalWeight, setGoalWeight] = useState<number | ''>('')
  const [dailyWaterMl, setDailyWaterMl] = useState(2500)

  /* ── Weight log state ──────────────────────────────────────────────────── */
  const [newWeight, setNewWeight] = useState<number | ''>('')
  const [newNote, setNewNote] = useState('')
  const [loggingWeight, setLoggingWeight] = useState(false)

  /* ── UI state ──────────────────────────────────────────────────────────── */
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const [resetOpen, setResetOpen] = useState(false)
  const [resetting, setResetting] = useState(false)

  /* ── Load profile & weight logs on mount ───────────────────────────────── */
  useEffect(() => {
    fetchProfile()
    fetchWeightLogs()
  }, [fetchProfile, fetchWeightLogs])

  /* ── Populate form from profile ────────────────────────────────────────── */
  useEffect(() => {
    if (profile) {
      setAge(profile.age)
      setHeightIn(profile.height_in)
      setWeightKg(profile.weight_kg)
      setGender(profile.gender)
      setActivityLevel(profile.activity_level)
      setFitnessGoal(profile.fitness_goal)
      setWorkoutDays(profile.workout_days_per_week)
      setGoalWeight(profile.goal_weight_kg ?? '')
      setDailyWaterMl(profile.daily_water_ml ?? 2500)
    }
  }, [profile])

  /* ── Live macro calculation ────────────────────────────────────────────── */
  const macros = useMemo(() => {
    if (!age || !heightIn || !weightKg) return null
    const bmr = calculateBMR(weightKg, heightIn, age, gender)
    const tdee = calculateTDEE(bmr, activityLevel)
    return calculateMacros(tdee, fitnessGoal, weightKg)
  }, [age, heightIn, weightKg, gender, activityLevel, fitnessGoal])

  /* ── Chart data (last 30 days, ascending by date) ──────────────────────── */
  const chartData = useMemo(() => {
    const sorted = [...weightLogs]
      .sort((a, b) => a.date.localeCompare(b.date))
      .slice(-30)
    return sorted.map((w) => ({
      date: new Date(w.date + 'T00:00:00').toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
      }),
      weight: w.weight_kg,
    }))
  }, [weightLogs])

  /* ── Weight stats ──────────────────────────────────────────────────────── */
  const weightStats = useMemo(() => {
    if (!weightLogs.length) return null
    const sorted = [...weightLogs].sort((a, b) => a.date.localeCompare(b.date))
    const first = sorted[0]
    const last = sorted[sorted.length - 1]
    const change = +(last.weight_kg - first.weight_kg).toFixed(1)
    return {
      current: last.weight_kg,
      change,
      goal: goalWeight || null,
    }
  }, [weightLogs, goalWeight])

  /* ── Save handler ──────────────────────────────────────────────────────── */
  const handleSave = async () => {
    if (!macros) return
    setSaving(true)
    setSaved(false)

    await updateProfile({
      age,
      height_in: heightIn,
      weight_kg: weightKg,
      gender,
      activity_level: activityLevel as 'sedentary' | 'light' | 'moderate' | 'active' | 'very_active',
      fitness_goal: fitnessGoal,
      workout_days_per_week: workoutDays,
      daily_calories: macros.calories,
      daily_protein: macros.protein,
      daily_carbs: macros.carbs,
      daily_fats: macros.fats,
      goal_weight_kg: goalWeight || null,
      daily_water_ml: dailyWaterMl,
    })

    setSaving(false)
    setSaved(true)
    setTimeout(() => setSaved(false), 2500)
  }

  /* ── Reset handler ─────────────────────────────────────────────────────── */
  const handleReset = async () => {
    setResetting(true)
    await updateProfile({
      age: 25,
      height_in: 69,
      weight_kg: 75,
      gender: 'male',
      activity_level: 'moderate',
      fitness_goal: 'maintain',
      workout_days_per_week: 4,
      daily_calories: 2500,
      daily_protein: 150,
      daily_carbs: 300,
      daily_fats: 70,
      goal_weight_kg: null,
      daily_water_ml: 2500,
    })
    setResetting(false)
    setResetOpen(false)
    fetchProfile()
  }

  /* ── Weight log handler ────────────────────────────────────────────────── */
  const handleLogWeight = async () => {
    if (!newWeight) return
    setLoggingWeight(true)
    const today = new Date().toISOString().split('T')[0]
    await addWeightLog(today, Number(newWeight), newNote || undefined)
    setNewWeight('')
    setNewNote('')
    setLoggingWeight(false)
  }

  /* ── Export data ───────────────────────────────────────────────────────── */
  const handleExportData = useCallback(() => {
    const data = {
      exportedAt: new Date().toISOString(),
      profile: profile ?? null,
      weightLogs: weightLogs,
    }
    const blob = new Blob([JSON.stringify(data, null, 2)], {
      type: 'application/json',
    })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `fitsync-export-${new Date().toISOString().split('T')[0]}.json`
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    URL.revokeObjectURL(url)
  }, [profile, weightLogs])

  /* ──────────────────────────────────────────────────────────────────────── */
  /*  Render                                                                 */
  /* ──────────────────────────────────────────────────────────────────────── */

  return (
    <div className="min-h-screen bg-transparent">
      {/* Header */}
      <header className="border-b border-white/[0.06] glass-dense px-4 pt-[env(safe-area-inset-top,0px)]">
        <div className="mx-auto flex h-14 max-w-lg items-center gap-3">
          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-[#A78BFA]/15">
            <User className="h-5 w-5 text-[#A78BFA]" />
          </div>
          <h1 className="text-base font-semibold text-[#EAEAF0]">Profile</h1>
        </div>
      </header>

      <div className="mx-auto max-w-lg px-4 py-5 space-y-5">
        {/* ── Loading state ──────────────────────────────────────────────── */}
        {profileLoading && !profile && (
          <div className="flex items-center justify-center py-20">
            <motion.div
              animate={{ rotate: 360 }}
              transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
            >
              <Activity className="h-6 w-6 text-[#A78BFA]" />
            </motion.div>
          </div>
        )}

        {/* ── Current stats summary ──────────────────────────────────────── */}
        {profile && (
          <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}>
            <Card className="gradient-border">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Target className="h-4 w-4 text-[#A78BFA]" />
                  Current Stats
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 gap-3">
                  <div className="rounded-xl bg-transparent p-3 border border-white/[0.06]">
                    <p className="text-[10px] uppercase tracking-wider text-[#6B6B8A]">Age</p>
                    <p className="mt-0.5 text-lg font-bold text-[#EAEAF0] tabular-nums">{profile.age}</p>
                  </div>
                  <div className="rounded-xl bg-transparent p-3 border border-white/[0.06]">
                    <p className="text-[10px] uppercase tracking-wider text-[#6B6B8A]">Weight</p>
                    <p className="mt-0.5 text-lg font-bold text-[#EAEAF0] tabular-nums">{profile.weight_kg}<span className="text-xs font-normal text-[#6B6B8A] ml-0.5">kg</span></p>
                  </div>
                  <div className="rounded-xl bg-transparent p-3 border border-white/[0.06]">
                    <p className="text-[10px] uppercase tracking-wider text-[#6B6B8A]">Height</p>
                    <p className="mt-0.5 text-lg font-bold text-[#EAEAF0] tabular-nums">{formatHeight(profile.height_in)}</p>
                  </div>
                  <div className="rounded-xl bg-transparent p-3 border border-white/[0.06]">
                    <p className="text-[10px] uppercase tracking-wider text-[#6B6B8A]">Activity</p>
                    <p className="mt-0.5 text-sm font-semibold text-[#EAEAF0]">{ACTIVITY_LABELS[profile.activity_level] || profile.activity_level}</p>
                  </div>
                </div>

                <div className="mt-4 flex items-center gap-2">
                  <Badge variant={profile.fitness_goal === 'cut' ? 'danger' : profile.fitness_goal === 'bulk' ? 'success' : 'default'}>
                    {profile.fitness_goal.charAt(0).toUpperCase() + profile.fitness_goal.slice(1)}
                  </Badge>
                  <Badge variant="default">
                    {profile.workout_days_per_week} days/week
                  </Badge>
                  <Badge variant="default">
                    {profile.gender === 'male' ? 'Male' : 'Female'}
                  </Badge>
                </div>
              </CardContent>
            </Card>
          </motion.div>
        )}

        {/* ── Weight Tracker ─────────────────────────────────────────────── */}
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.05 }}
        >
          <Card className="gradient-border">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <ScaleIcon className="h-4 w-4 text-[#A78BFA]" />
                Weight Tracker
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Quick log form */}
              <div className="flex items-end gap-2">
                <div className="flex-1">
                  <label className="text-xs font-medium text-[#6B6B8A] mb-1 block">Weight (kg)</label>
                  <input
                    type="number"
                    min={50}
                    max={600}
                    step={0.1}
                    value={newWeight}
                    onChange={(e) => setNewWeight(e.target.value ? Number(e.target.value) : '')}
                    placeholder="e.g. 175"
                    className="w-full rounded-xl border border-white/[0.06] bg-transparent px-3 py-2.5 text-sm text-[#EAEAF0] placeholder:text-[#6B6B8A]/50 focus:border-[#A78BFA] focus:outline-none focus:ring-1 focus:ring-[#A78BFA] tabular-nums"
                  />
                </div>
                <div className="flex-1">
                  <label className="text-xs font-medium text-[#6B6B8A] mb-1 block">Note (optional)</label>
                  <input
                    type="text"
                    value={newNote}
                    onChange={(e) => setNewNote(e.target.value)}
                    placeholder="e.g. morning"
                    className="w-full rounded-xl border border-white/[0.06] bg-transparent px-3 py-2.5 text-sm text-[#EAEAF0] placeholder:text-[#6B6B8A]/50 focus:border-[#A78BFA] focus:outline-none focus:ring-1 focus:ring-[#A78BFA]"
                  />
                </div>
                <Button
                  size="sm"
                  onClick={handleLogWeight}
                  disabled={!newWeight || loggingWeight}
                  className="shrink-0"
                >
                  {loggingWeight ? (
                    <motion.div
                      animate={{ rotate: 360 }}
                      transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
                    >
                      <Activity className="h-4 w-4" />
                    </motion.div>
                  ) : (
                    <>
                      <Plus className="h-4 w-4" />
                      Log
                    </>
                  )}
                </Button>
              </div>

              {/* 30-day trend chart */}
              {chartData.length >= 2 && (
                <div className="rounded-xl border border-white/[0.06] bg-transparent p-3">
                  <p className="text-xs font-medium text-[#6B6B8A] mb-2">30-Day Trend</p>
                  <ResponsiveContainer width="100%" height={180}>
                    <LineChart data={chartData} margin={{ top: 5, right: 10, left: -15, bottom: 0 }}>
                      <XAxis
                        dataKey="date"
                        tick={{ fontSize: 10, fill: '#6B6B8A' }}
                        axisLine={{ stroke: 'rgba(255,255,255,0.06)' }}
                        tickLine={false}
                        interval="preserveStartEnd"
                      />
                      <YAxis
                        domain={['dataMin - 2', 'dataMax + 2']}
                        tick={{ fontSize: 10, fill: '#6B6B8A' }}
                        axisLine={false}
                        tickLine={false}
                        width={40}
                      />
                      <Tooltip content={<WeightTooltip />} />
                      {goalWeight && (
                        <ReferenceLine
                          y={Number(goalWeight)}
                          stroke="#A78BFA"
                          strokeDasharray="6 4"
                          strokeOpacity={0.5}
                          label={{
                            value: 'Goal',
                            position: 'right',
                            fill: '#A78BFA',
                            fontSize: 10,
                          }}
                        />
                      )}
                      <Line
                        type="monotone"
                        dataKey="weight"
                        stroke="#A78BFA"
                        strokeWidth={2}
                        dot={{ fill: '#A78BFA', r: 3, strokeWidth: 0 }}
                        activeDot={{ r: 5, fill: '#A78BFA', strokeWidth: 2, stroke: '#0E0E18' }}
                      />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              )}

              {chartData.length > 0 && chartData.length < 2 && (
                <div className="rounded-xl border border-white/[0.06] bg-transparent p-6 text-center">
                  <p className="text-xs text-[#6B6B8A]">Log at least 2 entries to see your trend chart</p>
                </div>
              )}

              {/* Stats row */}
              {weightStats && (
                <div className="grid grid-cols-3 gap-2">
                  <div className="rounded-xl bg-transparent border border-white/[0.06] p-3 text-center">
                    <p className="text-[10px] uppercase tracking-wider text-[#6B6B8A]">Current</p>
                    <p className="mt-0.5 text-lg font-bold text-[#EAEAF0] tabular-nums">
                      {weightStats.current}
                      <span className="text-xs font-normal text-[#6B6B8A] ml-0.5">kg</span>
                    </p>
                  </div>
                  <div className="rounded-xl bg-transparent border border-white/[0.06] p-3 text-center">
                    <p className="text-[10px] uppercase tracking-wider text-[#6B6B8A]">Change</p>
                    <p className={`mt-0.5 text-lg font-bold tabular-nums ${
                      weightStats.change < 0 ? 'text-[#34D399]' : weightStats.change > 0 ? 'text-[#F87171]' : 'text-[#EAEAF0]'
                    }`}>
                      {weightStats.change > 0 ? '+' : ''}{weightStats.change}
                      <span className="text-xs font-normal text-[#6B6B8A] ml-0.5">kg</span>
                    </p>
                  </div>
                  <div className="rounded-xl bg-transparent border border-white/[0.06] p-3 text-center">
                    <p className="text-[10px] uppercase tracking-wider text-[#6B6B8A]">Goal</p>
                    <p className="mt-0.5 text-lg font-bold text-[#A78BFA] tabular-nums">
                      {weightStats.goal ? (
                        <>{weightStats.goal}<span className="text-xs font-normal text-[#6B6B8A] ml-0.5">kg</span></>
                      ) : (
                        <span className="text-sm text-[#6B6B8A]">--</span>
                      )}
                    </p>
                  </div>
                </div>
              )}

              {/* Recent entries */}
              {weightLogs.length > 0 && (
                <div>
                  <p className="text-xs font-medium text-[#6B6B8A] mb-2">Recent Entries</p>
                  <div className="space-y-1.5">
                    {weightLogs.slice(0, 5).map((log) => (
                      <div
                        key={log.id}
                        className="flex items-center justify-between rounded-lg border border-white/[0.06] bg-transparent px-3 py-2"
                      >
                        <div className="flex items-center gap-3">
                          <Calendar className="h-3.5 w-3.5 text-[#6B6B8A]" />
                          <span className="text-xs text-[#6B6B8A]">
                            {new Date(log.date + 'T00:00:00').toLocaleDateString('en-US', {
                              month: 'short',
                              day: 'numeric',
                              year: 'numeric',
                            })}
                          </span>
                          <span className="text-sm font-semibold text-[#EAEAF0] tabular-nums">
                            {log.weight_kg} kg
                          </span>
                          {log.notes && (
                            <span className="text-xs text-[#6B6B8A] italic truncate max-w-[80px]">
                              {log.notes}
                            </span>
                          )}
                        </div>
                        <button
                          onClick={() => deleteWeightLog(log.id)}
                          className="rounded-lg p-1.5 text-[#6B6B8A] hover:bg-red-500/10 hover:text-red-400 transition-colors"
                          aria-label="Delete weight log"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Empty state */}
              {!weightLoading && weightLogs.length === 0 && (
                <div className="rounded-xl border border-white/[0.06] bg-transparent p-6 text-center">
                  <ScaleIcon className="h-8 w-8 text-[#6B6B8A]/30 mx-auto mb-2" />
                  <p className="text-sm text-[#6B6B8A]">No weight entries yet</p>
                  <p className="text-xs text-[#6B6B8A]/60 mt-1">Log your first weigh-in above</p>
                </div>
              )}
            </CardContent>
          </Card>
        </motion.div>

        {/* ── Profile form ───────────────────────────────────────────────── */}
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
        >
          <Card className="gradient-border">
            <CardHeader>
              <CardTitle>Edit Profile</CardTitle>
            </CardHeader>
            <CardContent className="space-y-5">
              {/* Age */}
              <div className="flex items-start gap-3">
                <div className="mt-7 flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-white/[0.06]">
                  <User className="h-5 w-5 text-[#6B6B8A]" />
                </div>
                <Input
                  label="Age"
                  type="number"
                  min={13}
                  max={100}
                  value={age}
                  onChange={(e) => setAge(Number(e.target.value))}
                  placeholder="25"
                />
              </div>

              {/* Height */}
              <div className="flex items-start gap-3">
                <div className="mt-7 flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-white/[0.06]">
                  <Ruler className="h-5 w-5 text-[#6B6B8A]" />
                </div>
                <div className="w-full">
                  <Input
                    label="Height (inches)"
                    type="number"
                    min={36}
                    max={96}
                    value={heightIn}
                    onChange={(e) => setHeightIn(Number(e.target.value))}
                    placeholder="69"
                  />
                  <p className="mt-1 text-xs text-[#6B6B8A]">Total inches (e.g. 5&apos;10&quot; = 70)</p>
                </div>
              </div>

              {/* Weight */}
              <div className="flex items-start gap-3">
                <div className="mt-7 flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-white/[0.06]">
                  <Weight className="h-5 w-5 text-[#6B6B8A]" />
                </div>
                <Input
                  label="Weight (kg)"
                  type="number"
                  min={30}
                  max={300}
                  step={0.1}
                  value={weightKg}
                  onChange={(e) => setWeightKg(Number(e.target.value))}
                  placeholder="75"
                />
              </div>

              {/* Gender */}
              <Select
                label="Gender"
                options={GENDER_OPTIONS}
                value={gender}
                onChange={(e) => setGender(e.target.value as 'male' | 'female')}
              />

              {/* Activity level */}
              <div className="flex items-start gap-3">
                <div className="mt-7 flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-white/[0.06]">
                  <Activity className="h-5 w-5 text-[#6B6B8A]" />
                </div>
                <Select
                  label="Activity Level"
                  options={ACTIVITY_OPTIONS}
                  value={activityLevel}
                  onChange={(e) => setActivityLevel(e.target.value)}
                />
              </div>

              {/* Fitness Goal - selectable cards */}
              <div>
                <label className="text-sm font-medium text-[#EAEAF0]">Fitness Goal</label>
                <div className="mt-2 grid grid-cols-3 gap-2">
                  {GOAL_OPTIONS.map((goal) => {
                    const Icon = goal.icon
                    const selected = fitnessGoal === goal.value
                    return (
                      <motion.button
                        key={goal.value}
                        type="button"
                        onClick={() => setFitnessGoal(goal.value)}
                        whileTap={{ scale: 0.97 }}
                        className={`relative flex flex-col items-center gap-2 rounded-xl border p-4 transition-all duration-200 ${
                          selected
                            ? 'border-[#A78BFA] bg-[#A78BFA]/10 shadow-[0_0_20px_rgba(139,92,246,0.15)]'
                            : 'border-white/[0.06] bg-transparent hover:border-[#A78BFA]/30'
                        }`}
                      >
                        <div
                          className={`flex h-10 w-10 items-center justify-center rounded-xl ${
                            selected ? 'bg-[#A78BFA]/20' : 'bg-white/[0.06]'
                          }`}
                        >
                          <Icon
                            className={`h-5 w-5 ${
                              selected ? 'text-[#A78BFA]' : 'text-[#6B6B8A]'
                            }`}
                          />
                        </div>
                        <span
                          className={`text-sm font-semibold ${
                            selected ? 'text-[#EAEAF0]' : 'text-[#6B6B8A]'
                          }`}
                        >
                          {goal.label}
                        </span>
                        <span className="text-[10px] leading-tight text-[#6B6B8A] text-center">
                          {goal.description}
                        </span>
                        {selected && (
                          <motion.div
                            layoutId="goal-ring"
                            className="absolute inset-0 rounded-xl ring-2 ring-[#A78BFA]"
                            transition={{ type: 'spring' as const, stiffness: 400, damping: 30 }}
                          />
                        )}
                      </motion.button>
                    )
                  })}
                </div>
              </div>

              {/* Workout days per week */}
              <div>
                <label className="text-sm font-medium text-[#EAEAF0]">
                  Workout Days Per Week
                </label>
                <div className="mt-2 flex items-center gap-3">
                  <input
                    type="range"
                    min={1}
                    max={7}
                    value={workoutDays}
                    onChange={(e) => setWorkoutDays(Number(e.target.value))}
                    className="h-2 flex-1 cursor-pointer appearance-none rounded-full bg-white/[0.06] accent-[#A78BFA] [&::-webkit-slider-thumb]:h-5 [&::-webkit-slider-thumb]:w-5 [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-[#A78BFA] [&::-webkit-slider-thumb]:shadow-[0_0_10px_rgba(139,92,246,0.4)]"
                  />
                  <span className="w-10 text-center text-lg font-bold tabular-nums text-[#EAEAF0]">
                    {workoutDays}
                  </span>
                </div>
                <div className="mt-1 flex justify-between px-0.5">
                  {[1, 2, 3, 4, 5, 6, 7].map((d) => (
                    <span
                      key={d}
                      className={`text-[10px] tabular-nums ${
                        d === workoutDays ? 'text-[#A78BFA]' : 'text-[#6B6B8A]/40'
                      }`}
                    >
                      {d}
                    </span>
                  ))}
                </div>
              </div>

              {/* Goal Weight */}
              <div className="flex items-start gap-3">
                <div className="mt-7 flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-white/[0.06]">
                  <ScaleIcon className="h-5 w-5 text-[#6B6B8A]" />
                </div>
                <div className="w-full">
                  <Input
                    label="Goal Weight (kg)"
                    type="number"
                    min={50}
                    max={600}
                    step={0.1}
                    value={goalWeight}
                    onChange={(e) => setGoalWeight(e.target.value ? Number(e.target.value) : '')}
                    placeholder="Optional"
                  />
                  <p className="mt-1 text-xs text-[#6B6B8A]">Leave blank if no specific goal</p>
                </div>
              </div>

              {/* Daily Water Target */}
              <div>
                <label className="text-sm font-medium text-[#EAEAF0]">Daily Water Target (ml)</label>
                <div className="mt-2 flex items-center gap-2">
                  <input
                    type="number"
                    min={500}
                    max={10000}
                    step={100}
                    value={dailyWaterMl}
                    onChange={(e) => setDailyWaterMl(Number(e.target.value))}
                    className="flex-1 rounded-xl border border-white/[0.06] bg-transparent px-3 py-2.5 text-sm text-[#EAEAF0] placeholder:text-[#6B6B8A]/50 focus:border-[#A78BFA] focus:outline-none focus:ring-1 focus:ring-[#A78BFA] tabular-nums"
                  />
                </div>
                <div className="mt-2 flex gap-2">
                  {WATER_PRESETS.map((ml) => (
                    <button
                      key={ml}
                      type="button"
                      onClick={() => setDailyWaterMl(ml)}
                      className={`rounded-lg border px-3 py-1.5 text-xs font-medium transition-colors ${
                        dailyWaterMl === ml
                          ? 'border-[#A78BFA] bg-[#A78BFA]/10 text-[#A78BFA]'
                          : 'border-white/[0.06] bg-transparent text-[#6B6B8A] hover:border-[#A78BFA]/30'
                      }`}
                    >
                      {ml}ml
                    </button>
                  ))}
                </div>
              </div>
            </CardContent>
          </Card>
        </motion.div>

        {/* ── Macro Preview ──────────────────────────────────────────────── */}
        {macros && (
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
          >
            <Card className="gradient-border glow-primary">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Target className="h-4 w-4 text-[#A78BFA]" />
                  Daily Macro Targets
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex items-center justify-center gap-4">
                  <MacroRing
                    value={macros.calories}
                    max={macros.calories}
                    color={getMacroColor('calories')}
                    size="lg"
                    label="Calories"
                    unit="kcal"
                  />
                </div>

                <div className="mt-5 flex items-center justify-around">
                  <MacroRing
                    value={macros.protein}
                    max={macros.protein}
                    color={getMacroColor('protein')}
                    size="sm"
                    label="Protein"
                    unit="g"
                  />
                  <MacroRing
                    value={macros.carbs}
                    max={macros.carbs}
                    color={getMacroColor('carbs')}
                    size="sm"
                    label="Carbs"
                    unit="g"
                  />
                  <MacroRing
                    value={macros.fats}
                    max={macros.fats}
                    color={getMacroColor('fats')}
                    size="sm"
                    label="Fats"
                    unit="g"
                  />
                </div>

                <div className="mt-4 grid grid-cols-4 gap-2 text-center">
                  <div className="rounded-lg bg-transparent border border-white/[0.06] p-2">
                    <p className="text-xs text-[#6B6B8A]">Calories</p>
                    <p className="text-sm font-bold text-[#34D399] tabular-nums">{macros.calories}</p>
                  </div>
                  <div className="rounded-lg bg-transparent border border-white/[0.06] p-2">
                    <p className="text-xs text-[#6B6B8A]">Protein</p>
                    <p className="text-sm font-bold text-[#A78BFA] tabular-nums">{macros.protein}g</p>
                  </div>
                  <div className="rounded-lg bg-transparent border border-white/[0.06] p-2">
                    <p className="text-xs text-[#6B6B8A]">Carbs</p>
                    <p className="text-sm font-bold text-[#38BDF8] tabular-nums">{macros.carbs}g</p>
                  </div>
                  <div className="rounded-lg bg-transparent border border-white/[0.06] p-2">
                    <p className="text-xs text-[#6B6B8A]">Fats</p>
                    <p className="text-sm font-bold text-[#FBBF24] tabular-nums">{macros.fats}g</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </motion.div>
        )}

        {/* ── Save button ────────────────────────────────────────────────── */}
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
        >
          <Button
            size="lg"
            className="w-full"
            onClick={handleSave}
            disabled={saving || !macros}
          >
            {saving ? (
              <motion.div
                animate={{ rotate: 360 }}
                transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
              >
                <Activity className="h-5 w-5" />
              </motion.div>
            ) : saved ? (
              <>
                <motion.div
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  transition={{ type: 'spring' as const, stiffness: 500, damping: 15 }}
                >
                  <Save className="h-5 w-5" />
                </motion.div>
                Profile Saved!
              </>
            ) : (
              <>
                <Save className="h-5 w-5" />
                Save Profile
              </>
            )}
          </Button>

          {/* Success animation */}
          <AnimatePresence>
            {saved && (
              <motion.p
                initial={{ opacity: 0, y: -4 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0 }}
                className="mt-2 text-center text-sm text-[#34D399]"
              >
                Your macros and profile have been updated.
              </motion.p>
            )}
          </AnimatePresence>
        </motion.div>

        {/* ── Danger Zone ────────────────────────────────────────────────── */}
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
        >
          <Card className="border-red-500/20">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-red-400">
                <AlertTriangle className="h-4 w-4" />
                Danger Zone
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-[#6B6B8A] mb-4">
                This will reset your profile to default values. Your food, workout, and sleep logs will not be affected.
              </p>
              <div className="flex gap-3">
                <Button
                  variant="destructive"
                  size="sm"
                  onClick={() => setResetOpen(true)}
                >
                  <Trash2 className="h-4 w-4" />
                  Reset Profile Data
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleExportData}
                >
                  <Download className="h-4 w-4" />
                  Export Data
                </Button>
              </div>
            </CardContent>
          </Card>
        </motion.div>

        {/* Spacer for bottom nav */}
        <div className="h-4" />
      </div>

      {/* ── Reset confirmation modal ─────────────────────────────────────── */}
      <Modal
        isOpen={resetOpen}
        onClose={() => setResetOpen(false)}
        title="Reset Profile?"
      >
        <div className="space-y-4">
          <div className="flex items-center justify-center">
            <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-red-500/10">
              <AlertTriangle className="h-8 w-8 text-red-400" />
            </div>
          </div>
          <p className="text-center text-sm text-[#6B6B8A]">
            This will reset all your profile settings to their default values.
            This action cannot be undone.
          </p>
          <div className="flex gap-3">
            <Button
              variant="outline"
              className="flex-1"
              onClick={() => setResetOpen(false)}
            >
              Cancel
            </Button>
            <Button
              variant="destructive"
              className="flex-1"
              onClick={handleReset}
              disabled={resetting}
            >
              {resetting ? (
                <motion.div
                  animate={{ rotate: 360 }}
                  transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
                >
                  <Activity className="h-4 w-4" />
                </motion.div>
              ) : (
                <>
                  <Trash2 className="h-4 w-4" />
                  Reset
                </>
              )}
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  )
}
