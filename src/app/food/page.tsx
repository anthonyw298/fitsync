'use client'

import { useState, useEffect, useRef, useCallback, Suspense } from 'react'
import { useSearchParams } from 'next/navigation'
import Link from 'next/link'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Camera,
  Plus,
  Trash2,
  ChevronLeft,
  ChevronRight,
  UtensilsCrossed,
  Upload,
  Loader2,
  Edit3,
  Check,
  X,
  ChevronDown,
  Coffee,
  Sun,
  Moon,
  Cookie,
  CalendarDays,
  Zap,
  Droplets,
  Scale,
  Copy,
  History,
  Clock,
  Pencil,
  StickyNote,
  BarChart3,
} from 'lucide-react'
import { useAppStore } from '@/store/app-store'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Modal } from '@/components/ui/modal'
import { ProgressBar } from '@/components/ui/progress-bar'
import { Badge } from '@/components/ui/badge'
// Local storage - no Supabase needed
import { getToday, getMacroColor } from '@/lib/utils'
import type { FoodEntry, WaterEntry } from '@/lib/database.types'

/* -------------------------------------------------------------------------- */
/*  Types                                                                     */
/* -------------------------------------------------------------------------- */

type MealType = 'breakfast' | 'lunch' | 'dinner' | 'snack'

interface AnalysisResult {
  food_name: string
  calories: number
  protein_g: number
  carbs_g: number
  fats_g: number
  fiber_g: number
  serving_size: string
  confidence: number
}

/* -------------------------------------------------------------------------- */
/*  Constants                                                                 */
/* -------------------------------------------------------------------------- */

const MEAL_CONFIG: Record<
  MealType,
  { label: string; icon: React.ElementType; gradient: string }
> = {
  breakfast: {
    label: 'Breakfast',
    icon: Coffee,
    gradient: 'from-amber-500/20 to-orange-500/10',
  },
  lunch: {
    label: 'Lunch',
    icon: Sun,
    gradient: 'from-emerald-500/20 to-teal-500/10',
  },
  dinner: {
    label: 'Dinner',
    icon: Moon,
    gradient: 'from-violet-500/20 to-indigo-500/10',
  },
  snack: {
    label: 'Snack',
    icon: Cookie,
    gradient: 'from-pink-500/20 to-rose-500/10',
  },
}

const MEAL_ORDER: MealType[] = ['breakfast', 'lunch', 'dinner', 'snack']

/* -------------------------------------------------------------------------- */
/*  Helpers                                                                   */
/* -------------------------------------------------------------------------- */

function formatNumber(n: number): string {
  return n.toLocaleString('en-US')
}

function formatDateDisplay(dateStr: string): string {
  const date = new Date(dateStr + 'T12:00:00')
  return date.toLocaleDateString('en-US', {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
  })
}

function addDays(dateStr: string, days: number): string {
  const d = new Date(dateStr + 'T12:00:00')
  d.setDate(d.getDate() + days)
  return d.toISOString().split('T')[0]
}

function fileToBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => resolve(reader.result as string)
    reader.onerror = reject
    reader.readAsDataURL(file)
  })
}

/* -------------------------------------------------------------------------- */
/*  Main Page Component                                                       */
/* -------------------------------------------------------------------------- */

export default function FoodPage() {
  return (
    <Suspense fallback={<div className="min-h-screen" />}>
      <FoodPageContent />
    </Suspense>
  )
}

function FoodPageContent() {
  const searchParams = useSearchParams()
  const dateParam = searchParams.get('date')

  const {
    todayFood,
    foodLoading,
    fetchTodayFood,
    fetchFoodByDate,
    addFoodEntry,
    updateFoodEntry,
    deleteFoodEntry,
    profile,
    fetchProfile,
    fetchWaterByDate,
    addWaterEntry,
    deleteWaterEntry,
    recentFoods,
    frequentFoods,
    fetchRecentFoods,
    fetchFrequentFoods,
  } = useAppStore()

  // Date navigation
  const [selectedDate, setSelectedDate] = useState(dateParam || getToday())
  const [foodEntries, setFoodEntries] = useState<FoodEntry[]>([])
  const [loading, setLoading] = useState(false)
  const isToday = selectedDate === getToday()

  // Meal section collapse state
  const [collapsedMeals, setCollapsedMeals] = useState<Record<MealType, boolean>>({
    breakfast: false,
    lunch: false,
    dinner: false,
    snack: false,
  })

  // Modal state
  const [modalOpen, setModalOpen] = useState(false)
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null)

  // Editing entry state
  const [editingEntry, setEditingEntry] = useState<FoodEntry | null>(null)

  // Water tracking state
  const [waterEntries, setWaterEntries] = useState<WaterEntry[]>([])
  const [waterLoading, setWaterLoading] = useState(false)
  const [customWaterOpen, setCustomWaterOpen] = useState(false)
  const [customWaterAmount, setCustomWaterAmount] = useState('')

  // Daily notes state
  const [notesExpanded, setNotesExpanded] = useState(false)
  const [dailyNotes, setDailyNotes] = useState('')
  const [notesSaving, setNotesSaving] = useState(false)
  const [notesLoaded, setNotesLoaded] = useState(false)

  // Copy meal loading state
  const [copyingMeal, setCopyingMeal] = useState<MealType | null>(null)

  // Load profile on mount
  useEffect(() => {
    if (!profile) fetchProfile()
  }, [profile, fetchProfile])

  // Load food entries based on selected date
  const loadFood = useCallback(async () => {
    if (isToday) {
      await fetchTodayFood()
    } else {
      setLoading(true)
      const data = await fetchFoodByDate(selectedDate)
      setFoodEntries(data)
      setLoading(false)
    }
  }, [isToday, selectedDate, fetchTodayFood, fetchFoodByDate])

  useEffect(() => {
    loadFood()
  }, [loadFood])

  // Load water entries when date changes
  const loadWater = useCallback(async () => {
    setWaterLoading(true)
    try {
      const data = await fetchWaterByDate(selectedDate)
      setWaterEntries(data)
    } catch {
      // silently fail
    } finally {
      setWaterLoading(false)
    }
  }, [selectedDate, fetchWaterByDate])

  useEffect(() => {
    loadWater()
  }, [loadWater])

  // Load daily notes when date changes
  useEffect(() => {
    setNotesLoaded(false)
    setDailyNotes('')
    const loadNotes = async () => {
      try {
        const res = await fetch(`/api/data/notes?date=${selectedDate}`)
        const json = await res.json()
        if (json.data?.content) {
          setDailyNotes(json.data.content)
        }
      } catch {
        // silently fail
      } finally {
        setNotesLoaded(true)
      }
    }
    loadNotes()
  }, [selectedDate])

  const entries = isToday ? todayFood : foodEntries
  const isLoading = isToday ? foodLoading : loading

  // Macro targets from profile
  const targets = {
    calories: profile?.daily_calories ?? 2500,
    protein: profile?.daily_protein ?? 150,
    carbs: profile?.daily_carbs ?? 250,
    fats: profile?.daily_fats ?? 70,
  }

  // Sum consumed macros
  const consumed = entries.reduce(
    (acc, e) => ({
      calories: acc.calories + e.calories,
      protein: acc.protein + e.protein_g,
      carbs: acc.carbs + e.carbs_g,
      fats: acc.fats + e.fats_g,
    }),
    { calories: 0, protein: 0, carbs: 0, fats: 0 }
  )

  // Remaining calories
  const remaining = targets.calories - Math.round(consumed.calories)

  // Macro calorie breakdown
  const totalCalConsumed = consumed.protein * 4 + consumed.carbs * 4 + consumed.fats * 9
  const proteinPct = totalCalConsumed > 0 ? Math.round((consumed.protein * 4 / totalCalConsumed) * 100) : 0
  const carbsPct = totalCalConsumed > 0 ? Math.round((consumed.carbs * 4 / totalCalConsumed) * 100) : 0
  const fatsPct = totalCalConsumed > 0 ? 100 - proteinPct - carbsPct : 0

  // Water totals
  const totalWaterMl = waterEntries.reduce((sum, w) => sum + w.amount_ml, 0)
  const targetWaterMl = profile?.daily_water_ml ?? 2500

  // Group entries by meal type
  const mealGroups = MEAL_ORDER.reduce(
    (acc, type) => {
      acc[type] = entries.filter((e) => e.meal_type === type)
      return acc
    },
    {} as Record<MealType, FoodEntry[]>
  )

  // Navigation
  const goToDate = (direction: -1 | 1) => {
    setSelectedDate((prev) => addDays(prev, direction))
  }

  const isFutureDate = selectedDate >= addDays(getToday(), 1)

  // Toggle collapse
  const toggleMeal = (type: MealType) => {
    setCollapsedMeals((prev) => ({ ...prev, [type]: !prev[type] }))
  }

  // Delete entry
  const handleDelete = async (id: string) => {
    await deleteFoodEntry(id)
    if (!isToday) {
      setFoodEntries((prev) => prev.filter((e) => e.id !== id))
    }
    setDeleteConfirm(null)
  }

  // Edit entry - open modal in edit mode
  const handleEditEntry = (entry: FoodEntry) => {
    setEditingEntry(entry)
    setModalOpen(true)
  }

  // After save in modal, refresh
  const handleSaveComplete = () => {
    setModalOpen(false)
    setEditingEntry(null)
    loadFood()
  }

  // Water add handler
  const handleAddWater = async (amount: number) => {
    try {
      await addWaterEntry(selectedDate, amount)
      await loadWater()
    } catch {
      // silently fail
    }
  }

  // Water delete handler
  const handleDeleteWater = async (id: string) => {
    try {
      await deleteWaterEntry(id)
      setWaterEntries((prev) => prev.filter((w) => w.id !== id))
    } catch {
      // silently fail
    }
  }

  // Copy meal from yesterday
  const handleCopyMealFromYesterday = async (mealType: MealType) => {
    setCopyingMeal(mealType)
    try {
      const yesterday = addDays(selectedDate, -1)
      const yesterdayEntries = await fetchFoodByDate(yesterday)
      const mealEntries = yesterdayEntries.filter((e) => e.meal_type === mealType)

      for (const entry of mealEntries) {
        await addFoodEntry({
          date: selectedDate,
          meal_type: mealType,
          food_name: entry.food_name,
          photo_url: null,
          calories: entry.calories,
          protein_g: entry.protein_g,
          carbs_g: entry.carbs_g,
          fats_g: entry.fats_g,
          fiber_g: entry.fiber_g,
          serving_size: entry.serving_size,
          number_of_servings: entry.number_of_servings,
          ai_confidence: 0,
        })
      }
      await loadFood()
    } catch {
      // silently fail
    } finally {
      setCopyingMeal(null)
    }
  }

  // Save daily notes on blur
  const handleSaveNotes = async () => {
    if (!notesLoaded) return
    setNotesSaving(true)
    try {
      await fetch('/api/data/notes', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ date: selectedDate, content: dailyNotes }),
      })
    } catch {
      // silently fail
    } finally {
      setNotesSaving(false)
    }
  }

  return (
    <div className="min-h-screen pb-28">
      {/* -- Header -- */}
      <header
        className="sticky top-0 z-40 border-b border-white/[0.06] glass-dense"
        style={{ paddingTop: 'env(safe-area-inset-top, 0px)' }}
      >
        <div className="flex h-14 items-center justify-between px-4">
          <div className="flex items-center gap-2">
            <UtensilsCrossed className="h-5 w-5 text-[#A78BFA]" />
            <h1 className="text-lg font-semibold text-[#EAEAF0]">Food Log</h1>
          </div>
          <div className="flex items-center gap-2">
            <Badge variant="default">
              <span className={remaining >= 0 ? 'text-emerald-400' : 'text-red-400'}>
                {formatNumber(remaining)} remaining
              </span>
            </Badge>
            <Link
              href="/food/calendar"
              className="rounded-lg p-1.5 text-[#6B6B8A] transition-colors hover:bg-white/[0.06] hover:text-[#EAEAF0]"
            >
              <CalendarDays className="h-5 w-5" />
            </Link>
          </div>
        </div>
      </header>

      <div className="mx-auto max-w-lg px-4 pt-4 space-y-4">
        {/* -- Date Navigation -- */}
        <div className="flex items-center justify-between">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => goToDate(-1)}
            aria-label="Previous day"
          >
            <ChevronLeft className="h-5 w-5" />
          </Button>

          <button
            onClick={() => setSelectedDate(getToday())}
            className="rounded-lg px-3 py-1.5 text-sm font-medium text-[#EAEAF0] transition-colors hover:bg-white/[0.06]"
          >
            {isToday ? 'Today' : formatDateDisplay(selectedDate)}
          </button>

          <Button
            variant="ghost"
            size="sm"
            onClick={() => goToDate(1)}
            disabled={isFutureDate}
            aria-label="Next day"
          >
            <ChevronRight className="h-5 w-5" />
          </Button>
        </div>

        {/* -- Daily Macro Summary -- */}
        <Card>
          <CardContent className="space-y-3">
            <h2 className="text-sm font-medium text-[#6B6B8A] uppercase tracking-wider">
              Daily Macros
            </h2>

            {/* Calories */}
            <div>
              <div className="flex items-center justify-between mb-1">
                <span className="text-xs font-medium text-[#EAEAF0]">Calories</span>
                <span className="text-xs tabular-nums text-[#6B6B8A]">
                  {formatNumber(Math.round(consumed.calories))} / {formatNumber(targets.calories)} cal
                </span>
              </div>
              <ProgressBar
                value={(consumed.calories / targets.calories) * 100}
                color={getMacroColor('calories')}
                height="sm"
              />
            </div>

            {/* Protein */}
            <div>
              <div className="flex items-center justify-between mb-1">
                <span className="text-xs font-medium text-[#EAEAF0]">Protein</span>
                <span className="text-xs tabular-nums text-[#6B6B8A]">
                  {Math.round(consumed.protein)}g / {targets.protein}g
                </span>
              </div>
              <ProgressBar
                value={(consumed.protein / targets.protein) * 100}
                color={getMacroColor('protein')}
                height="sm"
              />
            </div>

            {/* Carbs */}
            <div>
              <div className="flex items-center justify-between mb-1">
                <span className="text-xs font-medium text-[#EAEAF0]">Carbs</span>
                <span className="text-xs tabular-nums text-[#6B6B8A]">
                  {Math.round(consumed.carbs)}g / {targets.carbs}g
                </span>
              </div>
              <ProgressBar
                value={(consumed.carbs / targets.carbs) * 100}
                color={getMacroColor('carbs')}
                height="sm"
              />
            </div>

            {/* Fats */}
            <div>
              <div className="flex items-center justify-between mb-1">
                <span className="text-xs font-medium text-[#EAEAF0]">Fats</span>
                <span className="text-xs tabular-nums text-[#6B6B8A]">
                  {Math.round(consumed.fats)}g / {targets.fats}g
                </span>
              </div>
              <ProgressBar
                value={(consumed.fats / targets.fats) * 100}
                color={getMacroColor('fats')}
                height="sm"
              />
            </div>

            {/* Macro Breakdown Bar */}
            {totalCalConsumed > 0 && (
              <div className="pt-2 space-y-1.5">
                <div className="flex items-center gap-1.5">
                  <BarChart3 className="h-3.5 w-3.5 text-[#6B6B8A]" />
                  <span className="text-xs font-medium text-[#6B6B8A]">Calorie Distribution</span>
                </div>
                <div className="flex h-3 w-full overflow-hidden rounded-full">
                  <motion.div
                    className="h-full bg-[#A78BFA]"
                    initial={{ width: 0 }}
                    animate={{ width: `${proteinPct}%` }}
                    transition={{ type: 'spring', stiffness: 80, damping: 18 }}
                  />
                  <motion.div
                    className="h-full bg-[#38BDF8]"
                    initial={{ width: 0 }}
                    animate={{ width: `${carbsPct}%` }}
                    transition={{ type: 'spring', stiffness: 80, damping: 18 }}
                  />
                  <motion.div
                    className="h-full bg-[#FBBF24]"
                    initial={{ width: 0 }}
                    animate={{ width: `${fatsPct}%` }}
                    transition={{ type: 'spring', stiffness: 80, damping: 18 }}
                  />
                </div>
                <div className="flex items-center justify-center gap-2 text-[10px] font-medium text-[#6B6B8A]">
                  <span className="flex items-center gap-1">
                    <span className="inline-block h-2 w-2 rounded-full bg-[#A78BFA]" />
                    P {proteinPct}%
                  </span>
                  <span className="text-white/10">|</span>
                  <span className="flex items-center gap-1">
                    <span className="inline-block h-2 w-2 rounded-full bg-[#38BDF8]" />
                    C {carbsPct}%
                  </span>
                  <span className="text-white/10">|</span>
                  <span className="flex items-center gap-1">
                    <span className="inline-block h-2 w-2 rounded-full bg-[#FBBF24]" />
                    F {fatsPct}%
                  </span>
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* -- Water Tracking Section -- */}
        <Card>
          <CardContent className="space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Droplets className="h-4 w-4 text-blue-400" />
                <h2 className="text-sm font-medium text-[#6B6B8A] uppercase tracking-wider">
                  Water
                </h2>
              </div>
              {waterLoading && <Loader2 className="h-3.5 w-3.5 animate-spin text-[#6B6B8A]" />}
            </div>

            <ProgressBar
              value={(totalWaterMl / targetWaterMl) * 100}
              color="#38BDF8"
              height="sm"
            />

            <div className="flex items-center justify-between">
              <span className="text-xs tabular-nums text-[#6B6B8A]">
                {totalWaterMl}ml / {targetWaterMl}ml
              </span>
              {totalWaterMl >= targetWaterMl && (
                <Badge variant="success">Goal reached</Badge>
              )}
            </div>

            {/* Quick-add buttons */}
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                className="flex-1 gap-1.5 text-xs"
                onClick={() => handleAddWater(250)}
              >
                <Droplets className="h-3.5 w-3.5" />
                250ml
              </Button>
              <Button
                variant="outline"
                size="sm"
                className="flex-1 gap-1.5 text-xs"
                onClick={() => handleAddWater(500)}
              >
                <Droplets className="h-3.5 w-3.5" />
                500ml
              </Button>
              <Button
                variant="outline"
                size="sm"
                className="flex-1 gap-1.5 text-xs"
                onClick={() => setCustomWaterOpen(!customWaterOpen)}
              >
                <Plus className="h-3.5 w-3.5" />
                Custom
              </Button>
            </div>

            {/* Custom water input */}
            <AnimatePresence>
              {customWaterOpen && (
                <motion.div
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: 'auto', opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  className="overflow-hidden"
                >
                  <div className="flex items-center gap-2 pt-1">
                    <Input
                      type="number"
                      inputMode="numeric"
                      placeholder="Amount in ml"
                      value={customWaterAmount}
                      onChange={(e) => setCustomWaterAmount(e.target.value)}
                      className="flex-1"
                    />
                    <Button
                      size="sm"
                      disabled={!customWaterAmount || Number(customWaterAmount) <= 0}
                      onClick={() => {
                        handleAddWater(Number(customWaterAmount))
                        setCustomWaterAmount('')
                        setCustomWaterOpen(false)
                      }}
                    >
                      Add
                    </Button>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

            {/* Water entries list */}
            {waterEntries.length > 0 && (
              <div className="space-y-1 pt-1">
                {waterEntries.map((w) => (
                  <div
                    key={w.id}
                    className="group flex items-center justify-between rounded-lg px-2 py-1 text-xs text-[#6B6B8A] hover:bg-white/[0.06]"
                  >
                    <span>{w.amount_ml}ml</span>
                    <button
                      onClick={() => handleDeleteWater(w.id)}
                      className="rounded p-1 text-[#6B6B8A] opacity-0 transition-all group-hover:opacity-100 hover:text-red-400"
                      aria-label="Delete water entry"
                    >
                      <X className="h-3 w-3" />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* -- Loading State -- */}
        {isLoading && (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="h-6 w-6 animate-spin text-[#A78BFA]" />
          </div>
        )}

        {/* -- Meal Sections -- */}
        {!isLoading &&
          MEAL_ORDER.map((mealType) => {
            const config = MEAL_CONFIG[mealType]
            const Icon = config.icon
            const items = mealGroups[mealType]
            const mealCals = items.reduce((s, e) => s + e.calories, 0)
            const isCollapsed = collapsedMeals[mealType]

            return (
              <motion.div
                key={mealType}
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: MEAL_ORDER.indexOf(mealType) * 0.05 }}
              >
                <Card>
                  {/* Meal header - clickable to collapse */}
                  <button
                    onClick={() => toggleMeal(mealType)}
                    className={`flex w-full items-center justify-between p-4 rounded-t-2xl bg-gradient-to-r ${config.gradient} transition-colors`}
                  >
                    <div className="flex items-center gap-3">
                      <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-white/[0.06]">
                        <Icon className="h-4 w-4 text-[#EAEAF0]" />
                      </div>
                      <div className="text-left">
                        <p className="text-sm font-semibold text-[#EAEAF0]">
                          {config.label}
                        </p>
                        <p className="text-xs text-[#6B6B8A]">
                          {items.length} {items.length === 1 ? 'item' : 'items'}
                          {mealCals > 0 && ` \u00B7 ${formatNumber(mealCals)} cal`}
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center gap-1">
                      {/* Copy from yesterday button */}
                      <div
                        onClick={(e) => {
                          e.stopPropagation()
                          handleCopyMealFromYesterday(mealType)
                        }}
                        className="rounded-md p-1.5 text-[#6B6B8A] transition-colors hover:bg-white/[0.06] hover:text-[#EAEAF0]"
                        role="button"
                        aria-label={`Copy ${config.label} from yesterday`}
                      >
                        {copyingMeal === mealType ? (
                          <Loader2 className="h-4 w-4 animate-spin" />
                        ) : (
                          <Copy className="h-4 w-4" />
                        )}
                      </div>

                      <motion.div
                        animate={{ rotate: isCollapsed ? -90 : 0 }}
                        transition={{ duration: 0.2 }}
                      >
                        <ChevronDown className="h-4 w-4 text-[#6B6B8A]" />
                      </motion.div>
                    </div>
                  </button>

                  {/* Meal items */}
                  <AnimatePresence initial={false}>
                    {!isCollapsed && (
                      <motion.div
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: 'auto', opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        transition={{ duration: 0.25, ease: 'easeInOut' }}
                        className="overflow-hidden"
                      >
                        {items.length === 0 ? (
                          <div className="flex items-center justify-center py-6 text-xs text-[#6B6B8A]">
                            No {config.label.toLowerCase()} logged
                          </div>
                        ) : (
                          <div className="divide-y divide-white/[0.06]">
                            {items.map((entry) => (
                              <div
                                key={entry.id}
                                className="group flex items-center justify-between px-4 py-3 cursor-pointer transition-colors hover:bg-white/[0.06]/40"
                                onClick={() => handleEditEntry(entry)}
                              >
                                <div className="min-w-0 flex-1">
                                  <div className="flex items-center gap-1.5">
                                    <p className="truncate text-sm font-medium text-[#EAEAF0]">
                                      {entry.food_name}
                                    </p>
                                    {entry.number_of_servings > 1 && (
                                      <Badge variant="default">
                                        x{entry.number_of_servings}
                                      </Badge>
                                    )}
                                  </div>
                                  <div className="mt-0.5 flex items-center gap-2 text-xs text-[#6B6B8A]">
                                    <span>{entry.calories} cal</span>
                                    <span className="text-white/[0.06]">|</span>
                                    <span>P {entry.protein_g}g</span>
                                    <span>C {entry.carbs_g}g</span>
                                    <span>F {entry.fats_g}g</span>
                                  </div>
                                </div>

                                {/* Delete button */}
                                {deleteConfirm === entry.id ? (
                                  <div
                                    className="flex items-center gap-1 ml-2"
                                    onClick={(e) => e.stopPropagation()}
                                  >
                                    <button
                                      onClick={() => handleDelete(entry.id)}
                                      className="rounded-md p-1.5 text-red-400 transition-colors hover:bg-red-500/15"
                                      aria-label="Confirm delete"
                                    >
                                      <Check className="h-4 w-4" />
                                    </button>
                                    <button
                                      onClick={() => setDeleteConfirm(null)}
                                      className="rounded-md p-1.5 text-[#6B6B8A] transition-colors hover:bg-white/[0.06]"
                                      aria-label="Cancel delete"
                                    >
                                      <X className="h-4 w-4" />
                                    </button>
                                  </div>
                                ) : (
                                  <div
                                    className="flex items-center gap-1 ml-2"
                                    onClick={(e) => e.stopPropagation()}
                                  >
                                    <button
                                      onClick={() => handleEditEntry(entry)}
                                      className="rounded-md p-1.5 text-[#6B6B8A] opacity-0 transition-all group-hover:opacity-100 hover:bg-[#A78BFA]/15 hover:text-[#A78BFA] sm:opacity-100"
                                      aria-label="Edit entry"
                                    >
                                      <Pencil className="h-4 w-4" />
                                    </button>
                                    <button
                                      onClick={() => setDeleteConfirm(entry.id)}
                                      className="rounded-md p-1.5 text-[#6B6B8A] opacity-0 transition-all group-hover:opacity-100 hover:bg-red-500/15 hover:text-red-400 sm:opacity-100"
                                      aria-label="Delete entry"
                                    >
                                      <Trash2 className="h-4 w-4" />
                                    </button>
                                  </div>
                                )}
                              </div>
                            ))}
                          </div>
                        )}
                      </motion.div>
                    )}
                  </AnimatePresence>
                </Card>
              </motion.div>
            )
          })}

        {/* -- Empty state when no entries at all -- */}
        {!isLoading && entries.length === 0 && (
          <div className="flex flex-col items-center justify-center py-12 text-center">
            <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-[#A78BFA]/10">
              <UtensilsCrossed className="h-8 w-8 text-[#A78BFA]" />
            </div>
            <p className="text-sm font-medium text-[#EAEAF0]">No food logged</p>
            <p className="mt-1 text-xs text-[#6B6B8A]">
              Tap the camera button to log your first meal
            </p>
          </div>
        )}

        {/* -- Food Diary Notes -- */}
        <Card>
          <button
            onClick={() => setNotesExpanded(!notesExpanded)}
            className="flex w-full items-center justify-between p-4"
          >
            <div className="flex items-center gap-2">
              <StickyNote className="h-4 w-4 text-[#A78BFA]" />
              <span className="text-sm font-medium text-[#EAEAF0]">Food Diary Notes</span>
            </div>
            <div className="flex items-center gap-2">
              {notesSaving && <Loader2 className="h-3.5 w-3.5 animate-spin text-[#6B6B8A]" />}
              <motion.div
                animate={{ rotate: notesExpanded ? 0 : -90 }}
                transition={{ duration: 0.2 }}
              >
                <ChevronDown className="h-4 w-4 text-[#6B6B8A]" />
              </motion.div>
            </div>
          </button>
          <AnimatePresence initial={false}>
            {notesExpanded && (
              <motion.div
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: 'auto', opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                transition={{ duration: 0.25, ease: 'easeInOut' }}
                className="overflow-hidden"
              >
                <div className="px-4 pb-4">
                  <textarea
                    className="w-full min-h-[100px] rounded-xl border border-white/[0.06] bg-[#0E0E18] px-3 py-2.5 text-sm text-[#EAEAF0] placeholder:text-[#6B6B8A]/50 focus:border-[#A78BFA] focus:outline-none focus:ring-1 focus:ring-[#A78BFA] resize-none"
                    placeholder="How was your eating today? Any cravings or notes..."
                    value={dailyNotes}
                    onChange={(e) => setDailyNotes(e.target.value)}
                    onBlur={handleSaveNotes}
                  />
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </Card>
      </div>

      {/* -- Floating Action Button -- */}
      <motion.button
        onClick={() => {
          setEditingEntry(null)
          setModalOpen(true)
        }}
        className="fixed bottom-24 right-5 z-30 flex h-14 w-14 items-center justify-center rounded-full bg-[#A78BFA] text-white shadow-[0_0_30px_rgba(139,92,246,0.4)] transition-shadow hover:shadow-[0_0_40px_rgba(139,92,246,0.55)]"
        whileTap={{ scale: 0.92 }}
        aria-label="Add food entry"
      >
        <Camera className="h-6 w-6" />
      </motion.button>

      {/* -- Add Food Modal -- */}
      <AddFoodModal
        isOpen={modalOpen}
        onClose={() => {
          setModalOpen(false)
          setEditingEntry(null)
        }}
        onSave={handleSaveComplete}
        selectedDate={selectedDate}
        addFoodEntry={addFoodEntry}
        updateFoodEntry={updateFoodEntry}
        editEntry={editingEntry}
        recentFoods={recentFoods}
        frequentFoods={frequentFoods}
        fetchRecentFoods={fetchRecentFoods}
        fetchFrequentFoods={fetchFrequentFoods}
      />
    </div>
  )
}

/* -------------------------------------------------------------------------- */
/*  Add Food Modal Component                                                  */
/* -------------------------------------------------------------------------- */

interface AddFoodModalProps {
  isOpen: boolean
  onClose: () => void
  onSave: () => void
  selectedDate: string
  addFoodEntry: (entry: Omit<FoodEntry, 'id' | 'user_id' | 'created_at'>) => Promise<void>
  updateFoodEntry: (id: string, updates: Partial<FoodEntry>) => Promise<FoodEntry | null>
  editEntry: FoodEntry | null
  recentFoods: FoodEntry[]
  frequentFoods: (FoodEntry & { frequency?: number })[]
  fetchRecentFoods: () => Promise<void>
  fetchFrequentFoods: () => Promise<void>
}

function AddFoodModal({
  isOpen,
  onClose,
  onSave,
  selectedDate,
  addFoodEntry,
  updateFoodEntry,
  editEntry,
  recentFoods,
  frequentFoods,
  fetchRecentFoods,
  fetchFrequentFoods,
}: AddFoodModalProps) {
  const editMode = editEntry !== null

  // Mode
  const [mode, setMode] = useState<'choose' | 'photo' | 'manual' | 'quick'>('choose')

  // Photo state
  const [imagePreview, setImagePreview] = useState<string | null>(null)
  const [imageBase64, setImageBase64] = useState<string | null>(null)
  const [analyzing, setAnalyzing] = useState(false)
  const [analysisResult, setAnalysisResult] = useState<AnalysisResult | null>(null)
  const [analysisError, setAnalysisError] = useState<string | null>(null)

  // Form state (shared between photo-analysis-edit and manual)
  const [foodName, setFoodName] = useState('')
  const [calories, setCalories] = useState('')
  const [protein, setProtein] = useState('')
  const [carbs, setCarbs] = useState('')
  const [fats, setFats] = useState('')
  const [fiber, setFiber] = useState('')
  const [servingSize, setServingSize] = useState('')
  const [servings, setServings] = useState('1')
  const [mealType, setMealType] = useState<MealType>('lunch')
  const [saving, setSaving] = useState(false)

  // Editing AI results
  const [isEditing, setIsEditing] = useState(false)

  // Recent/Frequent tab state
  const [rfTab, setRfTab] = useState<'recent' | 'frequent'>('recent')
  const [rfLoaded, setRfLoaded] = useState(false)

  // Refs
  const cameraInputRef = useRef<HTMLInputElement>(null)
  const galleryInputRef = useRef<HTMLInputElement>(null)

  // Load recent/frequent foods when modal opens in choose mode
  useEffect(() => {
    if (isOpen && !editMode && !rfLoaded) {
      fetchRecentFoods()
      fetchFrequentFoods()
      setRfLoaded(true)
    }
  }, [isOpen, editMode, rfLoaded, fetchRecentFoods, fetchFrequentFoods])

  // When edit mode, pre-fill all fields
  useEffect(() => {
    if (isOpen && editEntry) {
      setMode('manual')
      setFoodName(editEntry.food_name)
      setCalories(String(editEntry.calories))
      setProtein(String(editEntry.protein_g))
      setCarbs(String(editEntry.carbs_g))
      setFats(String(editEntry.fats_g))
      setFiber(String(editEntry.fiber_g))
      setServingSize(editEntry.serving_size)
      setServings(String(editEntry.number_of_servings || 1))
      setMealType(editEntry.meal_type as MealType)
    }
  }, [isOpen, editEntry])

  // Reset everything when modal closes
  useEffect(() => {
    if (!isOpen) {
      setTimeout(() => {
        setMode('choose')
        setImagePreview(null)
        setImageBase64(null)
        setAnalyzing(false)
        setAnalysisResult(null)
        setAnalysisError(null)
        setFoodName('')
        setCalories('')
        setProtein('')
        setCarbs('')
        setFats('')
        setFiber('')
        setServingSize('')
        setServings('1')
        setMealType('lunch')
        setSaving(false)
        setIsEditing(false)
        setRfLoaded(false)
      }, 300)
    }
  }, [isOpen])

  // Handle image selection
  const handleImageSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    try {
      const base64 = await fileToBase64(file)
      setImagePreview(base64)
      setImageBase64(base64)
      setMode('photo')
      setAnalysisResult(null)
      setAnalysisError(null)
    } catch {
      setAnalysisError('Failed to read image file')
    }
  }

  // Analyze image via API
  const analyzeImage = async () => {
    if (!imageBase64) return

    setAnalyzing(true)
    setAnalysisError(null)

    try {
      const res = await fetch('/api/analyze-food', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ image: imageBase64 }),
      })

      const json = await res.json()

      if (json.success || json.data) {
        const data: AnalysisResult = json.data
        setAnalysisResult(data)
        // Populate form fields with results
        setFoodName(data.food_name)
        setCalories(String(data.calories))
        setProtein(String(data.protein_g))
        setCarbs(String(data.carbs_g))
        setFats(String(data.fats_g))
        setFiber(String(data.fiber_g))
        setServingSize(data.serving_size)
      } else {
        setAnalysisError(json.error || 'Failed to analyze image')
      }
    } catch (err) {
      setAnalysisError(
        err instanceof Error ? err.message : 'Network error - check your connection'
      )
    } finally {
      setAnalyzing(false)
    }
  }

  // Fill from a recent/frequent food item
  const fillFromEntry = (entry: FoodEntry) => {
    setFoodName(entry.food_name)
    setCalories(String(entry.calories))
    setProtein(String(entry.protein_g))
    setCarbs(String(entry.carbs_g))
    setFats(String(entry.fats_g))
    setFiber(String(entry.fiber_g))
    setServingSize(entry.serving_size)
    setServings(String(entry.number_of_servings || 1))
    setMealType(entry.meal_type as MealType)
    setMode('manual')
  }

  // Save food entry
  const handleSave = async () => {
    // Quick mode allows empty food name (defaults to meal type label)
    if (mode !== 'quick' && !foodName.trim()) return
    // Quick mode requires at least one macro value
    if (mode === 'quick' && !calories && !protein && !carbs && !fats) return

    const resolvedName =
      foodName.trim() ||
      (mode === 'quick' ? MEAL_CONFIG[mealType].label : '')
    if (!resolvedName) return

    const numServings = Math.max(1, Number(servings) || 1)

    setSaving(true)
    try {
      if (editMode && editEntry) {
        // Update existing entry
        await updateFoodEntry(editEntry.id, {
          meal_type: mealType,
          food_name: resolvedName,
          calories: (Number(calories) || 0) * numServings,
          protein_g: (Number(protein) || 0) * numServings,
          carbs_g: (Number(carbs) || 0) * numServings,
          fats_g: (Number(fats) || 0) * numServings,
          fiber_g: (Number(fiber) || 0) * numServings,
          serving_size: servingSize || '1 serving',
          number_of_servings: numServings,
        })
      } else {
        // Create new entry
        await addFoodEntry({
          date: selectedDate,
          meal_type: mealType,
          food_name: resolvedName,
          photo_url: null,
          calories: (Number(calories) || 0) * numServings,
          protein_g: (Number(protein) || 0) * numServings,
          carbs_g: (Number(carbs) || 0) * numServings,
          fats_g: (Number(fats) || 0) * numServings,
          fiber_g: (Number(fiber) || 0) * numServings,
          serving_size: servingSize || '1 serving',
          number_of_servings: numServings,
          ai_confidence: analysisResult?.confidence ?? 0,
        })
      }
      onSave()
    } catch {
      setAnalysisError('Failed to save entry')
    } finally {
      setSaving(false)
    }
  }

  // Guess the current meal based on time of day
  useEffect(() => {
    if (!editMode) {
      const h = new Date().getHours()
      if (h < 11) setMealType('breakfast')
      else if (h < 15) setMealType('lunch')
      else if (h < 20) setMealType('dinner')
      else setMealType('snack')
    }
  }, [isOpen, editMode])

  const saveButtonText = editMode ? 'Update Entry' : (saving ? 'Saving...' : 'Save Entry')
  const modalTitle = editMode ? 'Edit Food' : 'Add Food'

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={modalTitle}>
      {/* Hidden file inputs */}
      <input
        ref={cameraInputRef}
        type="file"
        accept="image/*"
        capture="environment"
        className="hidden"
        onChange={handleImageSelect}
      />
      <input
        ref={galleryInputRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={handleImageSelect}
      />

      <div className="space-y-4">
        {/* -- Choose mode -- */}
        {mode === 'choose' && !editMode && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="space-y-3"
          >
            <Button
              className="w-full justify-start gap-3"
              variant="outline"
              size="lg"
              onClick={() => cameraInputRef.current?.click()}
            >
              <Camera className="h-5 w-5 text-[#A78BFA]" />
              Take Photo
            </Button>

            <Button
              className="w-full justify-start gap-3"
              variant="outline"
              size="lg"
              onClick={() => galleryInputRef.current?.click()}
            >
              <Upload className="h-5 w-5 text-[#A78BFA]" />
              Upload Photo
            </Button>

            <div className="relative flex items-center py-2">
              <div className="flex-1 border-t border-white/[0.06]" />
              <span className="px-3 text-xs text-[#6B6B8A]">or</span>
              <div className="flex-1 border-t border-white/[0.06]" />
            </div>

            <Button
              className="w-full justify-start gap-3"
              variant="outline"
              size="lg"
              onClick={() => setMode('manual')}
            >
              <Edit3 className="h-5 w-5 text-[#A78BFA]" />
              Manual Entry
            </Button>

            <Button
              className="w-full justify-start gap-3"
              variant="outline"
              size="lg"
              onClick={() => setMode('quick')}
            >
              <Zap className="h-5 w-5 text-[#A78BFA]" />
              Quick Macros
            </Button>

            {/* Recent / Frequent Foods tabs */}
            <div className="pt-2 space-y-3">
              <div className="flex items-center rounded-xl border border-white/[0.06] bg-[#0E0E18] p-0.5">
                <button
                  onClick={() => setRfTab('recent')}
                  className={`flex-1 flex items-center justify-center gap-1.5 rounded-lg px-3 py-2 text-xs font-medium transition-all ${
                    rfTab === 'recent'
                      ? 'bg-[#A78BFA]/15 text-[#A78BFA]'
                      : 'text-[#6B6B8A] hover:text-[#EAEAF0]'
                  }`}
                >
                  <Clock className="h-3.5 w-3.5" />
                  Recent
                </button>
                <button
                  onClick={() => setRfTab('frequent')}
                  className={`flex-1 flex items-center justify-center gap-1.5 rounded-lg px-3 py-2 text-xs font-medium transition-all ${
                    rfTab === 'frequent'
                      ? 'bg-[#A78BFA]/15 text-[#A78BFA]'
                      : 'text-[#6B6B8A] hover:text-[#EAEAF0]'
                  }`}
                >
                  <History className="h-3.5 w-3.5" />
                  Frequent
                </button>
              </div>

              <div className="max-h-48 overflow-y-auto space-y-1">
                {rfTab === 'recent' && recentFoods.length === 0 && (
                  <p className="py-4 text-center text-xs text-[#6B6B8A]">No recent foods</p>
                )}
                {rfTab === 'frequent' && frequentFoods.length === 0 && (
                  <p className="py-4 text-center text-xs text-[#6B6B8A]">No frequent foods</p>
                )}
                {(rfTab === 'recent' ? recentFoods : frequentFoods).map((entry, idx) => (
                  <div
                    key={`${entry.id}-${idx}`}
                    className="flex items-center justify-between rounded-lg border border-white/[0.06] bg-[#0E0E18] px-3 py-2"
                  >
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-medium text-[#EAEAF0]">
                        {entry.food_name}
                      </p>
                      <p className="text-xs text-[#6B6B8A]">
                        {entry.calories} cal &middot; P {entry.protein_g}g C {entry.carbs_g}g F {entry.fats_g}g
                      </p>
                    </div>
                    <button
                      onClick={() => fillFromEntry(entry)}
                      className="ml-2 flex h-7 w-7 items-center justify-center rounded-lg bg-[#A78BFA]/15 text-[#A78BFA] transition-colors hover:bg-[#A78BFA]/25"
                      aria-label="Use this food"
                    >
                      <Plus className="h-4 w-4" />
                    </button>
                  </div>
                ))}
              </div>
            </div>
          </motion.div>
        )}

        {/* -- Photo mode -- */}
        {mode === 'photo' && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="space-y-4"
          >
            {/* Photo preview */}
            {imagePreview && (
              <div className="relative overflow-hidden rounded-xl border border-white/[0.06]">
                <img
                  src={imagePreview}
                  alt="Food preview"
                  className="h-48 w-full object-cover"
                />
                <button
                  onClick={() => {
                    setImagePreview(null)
                    setImageBase64(null)
                    setAnalysisResult(null)
                    setMode('choose')
                  }}
                  className="absolute right-2 top-2 rounded-full bg-black/60 p-1.5 text-white backdrop-blur-sm transition-colors hover:bg-black/80"
                  aria-label="Remove photo"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
            )}

            {/* Analyze button (before analysis) */}
            {!analysisResult && !analyzing && (
              <Button
                className="w-full"
                size="lg"
                onClick={analyzeImage}
                disabled={!imageBase64}
              >
                <UtensilsCrossed className="h-4 w-4 mr-2" />
                Analyze Food
              </Button>
            )}

            {/* Loading state */}
            {analyzing && (
              <div className="flex flex-col items-center justify-center py-8">
                <Loader2 className="h-8 w-8 animate-spin text-[#A78BFA]" />
                <p className="mt-3 text-sm text-[#6B6B8A]">
                  Analyzing your food...
                </p>
              </div>
            )}

            {/* Error state */}
            {analysisError && (
              <div className="rounded-xl border border-red-500/20 bg-red-500/10 px-4 py-3">
                <p className="text-sm text-red-400">{analysisError}</p>
                <Button
                  variant="ghost"
                  size="sm"
                  className="mt-2 text-red-400"
                  onClick={analyzeImage}
                >
                  Retry
                </Button>
              </div>
            )}

            {/* Analysis results */}
            {analysisResult && !isEditing && (
              <motion.div
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                className="space-y-4"
              >
                <Card>
                  <CardContent className="space-y-3">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm font-semibold text-[#EAEAF0]">
                          {foodName}
                        </p>
                        <p className="text-xs text-[#6B6B8A]">{servingSize}</p>
                      </div>
                      {analysisResult.confidence > 0 && (
                        <Badge
                          variant={
                            analysisResult.confidence >= 0.8
                              ? 'success'
                              : analysisResult.confidence >= 0.5
                                ? 'warning'
                                : 'danger'
                          }
                        >
                          {Math.round(analysisResult.confidence * 100)}% conf
                        </Badge>
                      )}
                    </div>

                    <div className="grid grid-cols-4 gap-2">
                      <div className="rounded-lg bg-white/[0.06] px-2 py-2 text-center">
                        <p className="text-xs text-[#6B6B8A]">Cal</p>
                        <p className="text-sm font-semibold text-[#34D399]">
                          {calories}
                        </p>
                      </div>
                      <div className="rounded-lg bg-white/[0.06] px-2 py-2 text-center">
                        <p className="text-xs text-[#6B6B8A]">Protein</p>
                        <p className="text-sm font-semibold text-[#A78BFA]">
                          {protein}g
                        </p>
                      </div>
                      <div className="rounded-lg bg-white/[0.06] px-2 py-2 text-center">
                        <p className="text-xs text-[#6B6B8A]">Carbs</p>
                        <p className="text-sm font-semibold text-[#38BDF8]">
                          {carbs}g
                        </p>
                      </div>
                      <div className="rounded-lg bg-white/[0.06] px-2 py-2 text-center">
                        <p className="text-xs text-[#6B6B8A]">Fats</p>
                        <p className="text-sm font-semibold text-[#FBBF24]">
                          {fats}g
                        </p>
                      </div>
                    </div>

                    <Button
                      variant="ghost"
                      size="sm"
                      className="w-full"
                      onClick={() => setIsEditing(true)}
                    >
                      <Edit3 className="h-3.5 w-3.5 mr-1.5" />
                      Edit Estimates
                    </Button>
                  </CardContent>
                </Card>

                {/* Servings */}
                <Input
                  label="Number of Servings"
                  type="number"
                  inputMode="decimal"
                  placeholder="1"
                  value={servings}
                  onChange={(e) => setServings(e.target.value)}
                />

                {/* Meal type selector */}
                <MealTypeSelector value={mealType} onChange={setMealType} />

                {/* Save button */}
                <Button
                  className="w-full"
                  size="lg"
                  onClick={handleSave}
                  disabled={saving || !foodName.trim()}
                >
                  {saving ? (
                    <Loader2 className="h-4 w-4 animate-spin mr-2" />
                  ) : (
                    <Plus className="h-4 w-4 mr-2" />
                  )}
                  {saving ? 'Saving...' : saveButtonText}
                </Button>
              </motion.div>
            )}

            {/* Edit fields for AI estimates */}
            {analysisResult && isEditing && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="space-y-4"
              >
                <NutritionForm
                  foodName={foodName}
                  setFoodName={setFoodName}
                  calories={calories}
                  setCalories={setCalories}
                  protein={protein}
                  setProtein={setProtein}
                  carbs={carbs}
                  setCarbs={setCarbs}
                  fats={fats}
                  setFats={setFats}
                  fiber={fiber}
                  setFiber={setFiber}
                  servingSize={servingSize}
                  setServingSize={setServingSize}
                  servings={servings}
                  setServings={setServings}
                />

                <Button
                  variant="outline"
                  className="w-full"
                  onClick={() => setIsEditing(false)}
                >
                  <Check className="h-4 w-4 mr-1.5" />
                  Done Editing
                </Button>
              </motion.div>
            )}
          </motion.div>
        )}

        {/* -- Manual mode -- */}
        {mode === 'manual' && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="space-y-4"
          >
            <NutritionForm
              foodName={foodName}
              setFoodName={setFoodName}
              calories={calories}
              setCalories={setCalories}
              protein={protein}
              setProtein={setProtein}
              carbs={carbs}
              setCarbs={setCarbs}
              fats={fats}
              setFats={setFats}
              fiber={fiber}
              setFiber={setFiber}
              servingSize={servingSize}
              setServingSize={setServingSize}
              servings={servings}
              setServings={setServings}
            />

            {/* Meal type selector */}
            <MealTypeSelector value={mealType} onChange={setMealType} />

            {/* Save button */}
            <Button
              className="w-full"
              size="lg"
              onClick={handleSave}
              disabled={saving || !foodName.trim()}
            >
              {saving ? (
                <Loader2 className="h-4 w-4 animate-spin mr-2" />
              ) : (
                <Plus className="h-4 w-4 mr-2" />
              )}
              {saving ? 'Saving...' : saveButtonText}
            </Button>

            {!editMode && (
              <Button
                variant="ghost"
                size="sm"
                className="w-full"
                onClick={() => setMode('choose')}
              >
                Back
              </Button>
            )}
          </motion.div>
        )}

        {/* -- Quick Macros mode -- */}
        {mode === 'quick' && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="space-y-4"
          >
            {/* Meal type selector first */}
            <MealTypeSelector value={mealType} onChange={setMealType} />

            {/* Optional meal name */}
            <Input
              label="Meal Name (optional)"
              placeholder={`e.g. ${MEAL_CONFIG[mealType].label} at restaurant`}
              value={foodName}
              onChange={(e) => setFoodName(e.target.value)}
            />

            {/* Core macro inputs in a 2x2 grid */}
            <div className="space-y-1.5">
              <label className="text-sm font-medium text-[#EAEAF0]">Macros</label>
              <div className="grid grid-cols-2 gap-3">
                <div className="relative">
                  <Input
                    label="Calories"
                    type="number"
                    inputMode="numeric"
                    placeholder="0"
                    value={calories}
                    onChange={(e) => setCalories(e.target.value)}
                  />
                  <div className="absolute right-3 top-[2.1rem] pointer-events-none">
                    <span className="text-[10px] font-medium text-[#34D399]">cal</span>
                  </div>
                </div>
                <div className="relative">
                  <Input
                    label="Protein"
                    type="number"
                    inputMode="decimal"
                    placeholder="0"
                    value={protein}
                    onChange={(e) => setProtein(e.target.value)}
                  />
                  <div className="absolute right-3 top-[2.1rem] pointer-events-none">
                    <span className="text-[10px] font-medium text-[#A78BFA]">g</span>
                  </div>
                </div>
                <div className="relative">
                  <Input
                    label="Carbs"
                    type="number"
                    inputMode="decimal"
                    placeholder="0"
                    value={carbs}
                    onChange={(e) => setCarbs(e.target.value)}
                  />
                  <div className="absolute right-3 top-[2.1rem] pointer-events-none">
                    <span className="text-[10px] font-medium text-[#38BDF8]">g</span>
                  </div>
                </div>
                <div className="relative">
                  <Input
                    label="Fats"
                    type="number"
                    inputMode="decimal"
                    placeholder="0"
                    value={fats}
                    onChange={(e) => setFats(e.target.value)}
                  />
                  <div className="absolute right-3 top-[2.1rem] pointer-events-none">
                    <span className="text-[10px] font-medium text-[#FBBF24]">g</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Number of Servings */}
            <Input
              label="Number of Servings"
              type="number"
              inputMode="decimal"
              placeholder="1"
              value={servings}
              onChange={(e) => setServings(e.target.value)}
            />

            {/* Save button */}
            <Button
              className="w-full"
              size="lg"
              onClick={handleSave}
              disabled={saving || (!calories && !protein && !carbs && !fats)}
            >
              {saving ? (
                <Loader2 className="h-4 w-4 animate-spin mr-2" />
              ) : (
                <Zap className="h-4 w-4 mr-2" />
              )}
              {saving ? 'Saving...' : 'Log Macros'}
            </Button>

            <Button
              variant="ghost"
              size="sm"
              className="w-full"
              onClick={() => setMode('choose')}
            >
              Back
            </Button>
          </motion.div>
        )}
      </div>
    </Modal>
  )
}

/* -------------------------------------------------------------------------- */
/*  Nutrition Form                                                            */
/* -------------------------------------------------------------------------- */

interface NutritionFormProps {
  foodName: string
  setFoodName: (v: string) => void
  calories: string
  setCalories: (v: string) => void
  protein: string
  setProtein: (v: string) => void
  carbs: string
  setCarbs: (v: string) => void
  fats: string
  setFats: (v: string) => void
  fiber: string
  setFiber: (v: string) => void
  servingSize: string
  setServingSize: (v: string) => void
  servings: string
  setServings: (v: string) => void
}

function NutritionForm({
  foodName,
  setFoodName,
  calories,
  setCalories,
  protein,
  setProtein,
  carbs,
  setCarbs,
  fats,
  setFats,
  fiber,
  setFiber,
  servingSize,
  setServingSize,
  servings,
  setServings,
}: NutritionFormProps) {
  return (
    <div className="space-y-3">
      <Input
        label="Food Name"
        placeholder="e.g. Grilled Chicken Salad"
        value={foodName}
        onChange={(e) => setFoodName(e.target.value)}
      />
      <div className="grid grid-cols-2 gap-3">
        <Input
          label="Serving Size"
          placeholder="e.g. 1 bowl, 200g"
          value={servingSize}
          onChange={(e) => setServingSize(e.target.value)}
        />
        <Input
          label="Number of Servings"
          type="number"
          inputMode="decimal"
          placeholder="1"
          value={servings}
          onChange={(e) => setServings(e.target.value)}
        />
      </div>
      <div className="grid grid-cols-2 gap-3">
        <Input
          label="Calories"
          type="number"
          inputMode="numeric"
          placeholder="0"
          value={calories}
          onChange={(e) => setCalories(e.target.value)}
        />
        <Input
          label="Protein (g)"
          type="number"
          inputMode="decimal"
          placeholder="0"
          value={protein}
          onChange={(e) => setProtein(e.target.value)}
        />
        <Input
          label="Carbs (g)"
          type="number"
          inputMode="decimal"
          placeholder="0"
          value={carbs}
          onChange={(e) => setCarbs(e.target.value)}
        />
        <Input
          label="Fats (g)"
          type="number"
          inputMode="decimal"
          placeholder="0"
          value={fats}
          onChange={(e) => setFats(e.target.value)}
        />
      </div>
      <Input
        label="Fiber (g)"
        type="number"
        inputMode="decimal"
        placeholder="0"
        value={fiber}
        onChange={(e) => setFiber(e.target.value)}
      />
    </div>
  )
}

/* -------------------------------------------------------------------------- */
/*  Meal Type Selector                                                        */
/* -------------------------------------------------------------------------- */

interface MealTypeSelectorProps {
  value: MealType
  onChange: (type: MealType) => void
}

function MealTypeSelector({ value, onChange }: MealTypeSelectorProps) {
  return (
    <div className="space-y-1.5">
      <label className="text-sm font-medium text-[#EAEAF0]">Meal Type</label>
      <div className="grid grid-cols-4 gap-2">
        {MEAL_ORDER.map((type) => {
          const config = MEAL_CONFIG[type]
          const Icon = config.icon
          const isActive = value === type

          return (
            <button
              key={type}
              onClick={() => onChange(type)}
              className={`flex flex-col items-center gap-1 rounded-xl border px-2 py-2.5 text-xs font-medium transition-all ${
                isActive
                  ? 'border-[#A78BFA] bg-[#A78BFA]/15 text-[#A78BFA]'
                  : 'border-white/[0.06] bg-[#0E0E18] text-[#6B6B8A] hover:border-[#A78BFA]/30'
              }`}
            >
              <Icon className="h-4 w-4" />
              {config.label}
            </button>
          )
        })}
      </div>
    </div>
  )
}
