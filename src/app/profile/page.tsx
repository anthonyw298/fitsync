'use client'

import { useState, useEffect, useMemo } from 'react'
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
} from 'lucide-react'
import { useAppStore } from '@/store/app-store'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Select } from '@/components/ui/select'
import { MacroRing } from '@/components/ui/macro-ring'
import { Modal } from '@/components/ui/modal'
import { Badge } from '@/components/ui/badge'
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

/* -------------------------------------------------------------------------- */
/*  Profile Page                                                              */
/* -------------------------------------------------------------------------- */

export default function ProfilePage() {
  /* ── Store ─────────────────────────────────────────────────────────────── */
  const { profile, profileLoading, fetchProfile, updateProfile } = useAppStore()

  /* ── Form state ────────────────────────────────────────────────────────── */
  const [age, setAge] = useState(25)
  const [heightIn, setHeightIn] = useState(69)
  const [weightLbs, setWeightLbs] = useState(165)
  const [gender, setGender] = useState<'male' | 'female'>('male')
  const [activityLevel, setActivityLevel] = useState('moderate')
  const [fitnessGoal, setFitnessGoal] = useState<'cut' | 'maintain' | 'bulk'>('maintain')
  const [workoutDays, setWorkoutDays] = useState(4)

  /* ── UI state ──────────────────────────────────────────────────────────── */
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const [resetOpen, setResetOpen] = useState(false)
  const [resetting, setResetting] = useState(false)

  /* ── Load profile on mount ─────────────────────────────────────────────── */
  useEffect(() => {
    fetchProfile()
  }, [fetchProfile])

  /* ── Populate form from profile ────────────────────────────────────────── */
  useEffect(() => {
    if (profile) {
      setAge(profile.age)
      setHeightIn(profile.height_in)
      setWeightLbs(profile.weight_lbs)
      setGender(profile.gender)
      setActivityLevel(profile.activity_level)
      setFitnessGoal(profile.fitness_goal)
      setWorkoutDays(profile.workout_days_per_week)
    }
  }, [profile])

  /* ── Live macro calculation ────────────────────────────────────────────── */
  const macros = useMemo(() => {
    if (!age || !heightIn || !weightLbs) return null
    const bmr = calculateBMR(weightLbs, heightIn, age, gender)
    const tdee = calculateTDEE(bmr, activityLevel)
    return calculateMacros(tdee, fitnessGoal, weightLbs)
  }, [age, heightIn, weightLbs, gender, activityLevel, fitnessGoal])

  /* ── Save handler ──────────────────────────────────────────────────────── */
  const handleSave = async () => {
    if (!macros) return
    setSaving(true)
    setSaved(false)

    await updateProfile({
      age,
      height_in: heightIn,
      weight_lbs: weightLbs,
      gender,
      activity_level: activityLevel as 'sedentary' | 'light' | 'moderate' | 'active' | 'very_active',
      fitness_goal: fitnessGoal,
      workout_days_per_week: workoutDays,
      daily_calories: macros.calories,
      daily_protein: macros.protein,
      daily_carbs: macros.carbs,
      daily_fats: macros.fats,
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
      weight_lbs: 165,
      gender: 'male',
      activity_level: 'moderate',
      fitness_goal: 'maintain',
      workout_days_per_week: 4,
      daily_calories: 2500,
      daily_protein: 150,
      daily_carbs: 300,
      daily_fats: 70,
    })
    setResetting(false)
    setResetOpen(false)
    fetchProfile()
  }

  /* ──────────────────────────────────────────────────────────────────────── */
  /*  Render                                                                 */
  /* ──────────────────────────────────────────────────────────────────────── */

  return (
    <div className="min-h-screen bg-[#0A0A0F]">
      {/* Header */}
      <header className="border-b border-[#1E1E2E] bg-[#13131A]/80 backdrop-blur-xl px-4 pt-[env(safe-area-inset-top,0px)]">
        <div className="mx-auto flex h-14 max-w-lg items-center gap-3">
          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-[#8B5CF6]/15">
            <User className="h-5 w-5 text-[#8B5CF6]" />
          </div>
          <h1 className="text-base font-semibold text-[#F1F1F3]">Profile</h1>
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
              <Activity className="h-6 w-6 text-[#8B5CF6]" />
            </motion.div>
          </div>
        )}

        {/* ── Current stats summary ──────────────────────────────────────── */}
        {profile && (
          <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}>
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Target className="h-4 w-4 text-[#8B5CF6]" />
                  Current Stats
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 gap-3">
                  <div className="rounded-xl bg-[#0A0A0F] p-3 border border-[#1E1E2E]">
                    <p className="text-[10px] uppercase tracking-wider text-[#8888A0]">Age</p>
                    <p className="mt-0.5 text-lg font-bold text-[#F1F1F3] tabular-nums">{profile.age}</p>
                  </div>
                  <div className="rounded-xl bg-[#0A0A0F] p-3 border border-[#1E1E2E]">
                    <p className="text-[10px] uppercase tracking-wider text-[#8888A0]">Weight</p>
                    <p className="mt-0.5 text-lg font-bold text-[#F1F1F3] tabular-nums">{profile.weight_lbs}<span className="text-xs font-normal text-[#8888A0] ml-0.5">lbs</span></p>
                  </div>
                  <div className="rounded-xl bg-[#0A0A0F] p-3 border border-[#1E1E2E]">
                    <p className="text-[10px] uppercase tracking-wider text-[#8888A0]">Height</p>
                    <p className="mt-0.5 text-lg font-bold text-[#F1F1F3] tabular-nums">{formatHeight(profile.height_in)}</p>
                  </div>
                  <div className="rounded-xl bg-[#0A0A0F] p-3 border border-[#1E1E2E]">
                    <p className="text-[10px] uppercase tracking-wider text-[#8888A0]">Activity</p>
                    <p className="mt-0.5 text-sm font-semibold text-[#F1F1F3]">{ACTIVITY_LABELS[profile.activity_level] || profile.activity_level}</p>
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

        {/* ── Profile form ───────────────────────────────────────────────── */}
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
        >
          <Card>
            <CardHeader>
              <CardTitle>Edit Profile</CardTitle>
            </CardHeader>
            <CardContent className="space-y-5">
              {/* Age */}
              <div className="flex items-start gap-3">
                <div className="mt-7 flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[#1E1E2E]">
                  <User className="h-5 w-5 text-[#8888A0]" />
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
                <div className="mt-7 flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[#1E1E2E]">
                  <Ruler className="h-5 w-5 text-[#8888A0]" />
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
                  <p className="mt-1 text-xs text-[#8888A0]">Total inches (e.g. 5&apos;10&quot; = 70)</p>
                </div>
              </div>

              {/* Weight */}
              <div className="flex items-start gap-3">
                <div className="mt-7 flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[#1E1E2E]">
                  <Weight className="h-5 w-5 text-[#8888A0]" />
                </div>
                <Input
                  label="Weight (lbs)"
                  type="number"
                  min={66}
                  max={660}
                  step={0.1}
                  value={weightLbs}
                  onChange={(e) => setWeightLbs(Number(e.target.value))}
                  placeholder="165"
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
                <div className="mt-7 flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[#1E1E2E]">
                  <Activity className="h-5 w-5 text-[#8888A0]" />
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
                <label className="text-sm font-medium text-[#F1F1F3]">Fitness Goal</label>
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
                            ? 'border-[#8B5CF6] bg-[#8B5CF6]/10 shadow-[0_0_20px_rgba(139,92,246,0.15)]'
                            : 'border-[#1E1E2E] bg-[#0A0A0F] hover:border-[#8B5CF6]/30'
                        }`}
                      >
                        <div
                          className={`flex h-10 w-10 items-center justify-center rounded-xl ${
                            selected ? 'bg-[#8B5CF6]/20' : 'bg-[#1E1E2E]'
                          }`}
                        >
                          <Icon
                            className={`h-5 w-5 ${
                              selected ? 'text-[#8B5CF6]' : 'text-[#8888A0]'
                            }`}
                          />
                        </div>
                        <span
                          className={`text-sm font-semibold ${
                            selected ? 'text-[#F1F1F3]' : 'text-[#8888A0]'
                          }`}
                        >
                          {goal.label}
                        </span>
                        <span className="text-[10px] leading-tight text-[#8888A0] text-center">
                          {goal.description}
                        </span>
                        {selected && (
                          <motion.div
                            layoutId="goal-ring"
                            className="absolute inset-0 rounded-xl ring-2 ring-[#8B5CF6]"
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
                <label className="text-sm font-medium text-[#F1F1F3]">
                  Workout Days Per Week
                </label>
                <div className="mt-2 flex items-center gap-3">
                  <input
                    type="range"
                    min={1}
                    max={7}
                    value={workoutDays}
                    onChange={(e) => setWorkoutDays(Number(e.target.value))}
                    className="h-2 flex-1 cursor-pointer appearance-none rounded-full bg-[#1E1E2E] accent-[#8B5CF6] [&::-webkit-slider-thumb]:h-5 [&::-webkit-slider-thumb]:w-5 [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-[#8B5CF6] [&::-webkit-slider-thumb]:shadow-[0_0_10px_rgba(139,92,246,0.4)]"
                  />
                  <span className="w-10 text-center text-lg font-bold tabular-nums text-[#F1F1F3]">
                    {workoutDays}
                  </span>
                </div>
                <div className="mt-1 flex justify-between px-0.5">
                  {[1, 2, 3, 4, 5, 6, 7].map((d) => (
                    <span
                      key={d}
                      className={`text-[10px] tabular-nums ${
                        d === workoutDays ? 'text-[#8B5CF6]' : 'text-[#8888A0]/40'
                      }`}
                    >
                      {d}
                    </span>
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
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Target className="h-4 w-4 text-[#8B5CF6]" />
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
                  <div className="rounded-lg bg-[#0A0A0F] border border-[#1E1E2E] p-2">
                    <p className="text-xs text-[#8888A0]">Calories</p>
                    <p className="text-sm font-bold text-[#10B981] tabular-nums">{macros.calories}</p>
                  </div>
                  <div className="rounded-lg bg-[#0A0A0F] border border-[#1E1E2E] p-2">
                    <p className="text-xs text-[#8888A0]">Protein</p>
                    <p className="text-sm font-bold text-[#8B5CF6] tabular-nums">{macros.protein}g</p>
                  </div>
                  <div className="rounded-lg bg-[#0A0A0F] border border-[#1E1E2E] p-2">
                    <p className="text-xs text-[#8888A0]">Carbs</p>
                    <p className="text-sm font-bold text-[#3B82F6] tabular-nums">{macros.carbs}g</p>
                  </div>
                  <div className="rounded-lg bg-[#0A0A0F] border border-[#1E1E2E] p-2">
                    <p className="text-xs text-[#8888A0]">Fats</p>
                    <p className="text-sm font-bold text-[#F59E0B] tabular-nums">{macros.fats}g</p>
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
                className="mt-2 text-center text-sm text-[#10B981]"
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
              <p className="text-sm text-[#8888A0] mb-4">
                This will reset your profile to default values. Your food, workout, and sleep logs will not be affected.
              </p>
              <Button
                variant="destructive"
                size="sm"
                onClick={() => setResetOpen(true)}
              >
                <Trash2 className="h-4 w-4" />
                Reset Profile Data
              </Button>
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
          <p className="text-center text-sm text-[#8888A0]">
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
