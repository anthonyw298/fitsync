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
import type { FoodEntry } from '@/lib/database.types'

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
    <Suspense fallback={<div className="min-h-screen bg-[#0A0A0F]" />}>
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
    deleteFoodEntry,
    profile,
    fetchProfile,
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

  // After save in modal, refresh
  const handleSaveComplete = () => {
    setModalOpen(false)
    loadFood()
  }

  return (
    <div className="min-h-screen bg-[#0A0A0F] pb-28">
      {/* ── Header ── */}
      <header
        className="sticky top-0 z-40 border-b border-[#1E1E2E] bg-[#0A0A0F]/90 backdrop-blur-lg"
        style={{ paddingTop: 'env(safe-area-inset-top, 0px)' }}
      >
        <div className="flex h-14 items-center justify-between px-4">
          <div className="flex items-center gap-2">
            <UtensilsCrossed className="h-5 w-5 text-[#8B5CF6]" />
            <h1 className="text-lg font-semibold text-[#F1F1F3]">Food Log</h1>
          </div>
          <div className="flex items-center gap-2">
            <Badge variant="default">
              {formatNumber(consumed.calories)} cal
            </Badge>
            <Link
              href="/food/calendar"
              className="rounded-lg p-1.5 text-[#8888A0] transition-colors hover:bg-[#1E1E2E] hover:text-[#F1F1F3]"
            >
              <CalendarDays className="h-5 w-5" />
            </Link>
          </div>
        </div>
      </header>

      <div className="mx-auto max-w-lg px-4 pt-4 space-y-4">
        {/* ── Date Navigation ── */}
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
            className="rounded-lg px-3 py-1.5 text-sm font-medium text-[#F1F1F3] transition-colors hover:bg-[#1E1E2E]"
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

        {/* ── Daily Macro Summary ── */}
        <Card>
          <CardContent className="space-y-3">
            <h2 className="text-sm font-medium text-[#8888A0] uppercase tracking-wider">
              Daily Macros
            </h2>

            {/* Calories */}
            <div>
              <div className="flex items-center justify-between mb-1">
                <span className="text-xs font-medium text-[#F1F1F3]">Calories</span>
                <span className="text-xs tabular-nums text-[#8888A0]">
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
                <span className="text-xs font-medium text-[#F1F1F3]">Protein</span>
                <span className="text-xs tabular-nums text-[#8888A0]">
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
                <span className="text-xs font-medium text-[#F1F1F3]">Carbs</span>
                <span className="text-xs tabular-nums text-[#8888A0]">
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
                <span className="text-xs font-medium text-[#F1F1F3]">Fats</span>
                <span className="text-xs tabular-nums text-[#8888A0]">
                  {Math.round(consumed.fats)}g / {targets.fats}g
                </span>
              </div>
              <ProgressBar
                value={(consumed.fats / targets.fats) * 100}
                color={getMacroColor('fats')}
                height="sm"
              />
            </div>
          </CardContent>
        </Card>

        {/* ── Loading State ── */}
        {isLoading && (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="h-6 w-6 animate-spin text-[#8B5CF6]" />
          </div>
        )}

        {/* ── Meal Sections ── */}
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
                      <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-[#1E1E2E]">
                        <Icon className="h-4 w-4 text-[#F1F1F3]" />
                      </div>
                      <div className="text-left">
                        <p className="text-sm font-semibold text-[#F1F1F3]">
                          {config.label}
                        </p>
                        <p className="text-xs text-[#8888A0]">
                          {items.length} {items.length === 1 ? 'item' : 'items'}
                          {mealCals > 0 && ` \u00B7 ${formatNumber(mealCals)} cal`}
                        </p>
                      </div>
                    </div>

                    <motion.div
                      animate={{ rotate: isCollapsed ? -90 : 0 }}
                      transition={{ duration: 0.2 }}
                    >
                      <ChevronDown className="h-4 w-4 text-[#8888A0]" />
                    </motion.div>
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
                          <div className="flex items-center justify-center py-6 text-xs text-[#8888A0]">
                            No {config.label.toLowerCase()} logged
                          </div>
                        ) : (
                          <div className="divide-y divide-[#1E1E2E]">
                            {items.map((entry) => (
                              <div
                                key={entry.id}
                                className="group flex items-center justify-between px-4 py-3"
                              >
                                <div className="min-w-0 flex-1">
                                  <p className="truncate text-sm font-medium text-[#F1F1F3]">
                                    {entry.food_name}
                                  </p>
                                  <div className="mt-0.5 flex items-center gap-2 text-xs text-[#8888A0]">
                                    <span>{entry.calories} cal</span>
                                    <span className="text-[#1E1E2E]">|</span>
                                    <span>P {entry.protein_g}g</span>
                                    <span>C {entry.carbs_g}g</span>
                                    <span>F {entry.fats_g}g</span>
                                  </div>
                                </div>

                                {/* Delete button */}
                                {deleteConfirm === entry.id ? (
                                  <div className="flex items-center gap-1 ml-2">
                                    <button
                                      onClick={() => handleDelete(entry.id)}
                                      className="rounded-md p-1.5 text-red-400 transition-colors hover:bg-red-500/15"
                                      aria-label="Confirm delete"
                                    >
                                      <Check className="h-4 w-4" />
                                    </button>
                                    <button
                                      onClick={() => setDeleteConfirm(null)}
                                      className="rounded-md p-1.5 text-[#8888A0] transition-colors hover:bg-[#1E1E2E]"
                                      aria-label="Cancel delete"
                                    >
                                      <X className="h-4 w-4" />
                                    </button>
                                  </div>
                                ) : (
                                  <button
                                    onClick={() => setDeleteConfirm(entry.id)}
                                    className="ml-2 rounded-md p-1.5 text-[#8888A0] opacity-0 transition-all group-hover:opacity-100 hover:bg-red-500/15 hover:text-red-400 sm:opacity-100"
                                    aria-label="Delete entry"
                                  >
                                    <Trash2 className="h-4 w-4" />
                                  </button>
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

        {/* ── Empty state when no entries at all ── */}
        {!isLoading && entries.length === 0 && (
          <div className="flex flex-col items-center justify-center py-12 text-center">
            <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-[#8B5CF6]/10">
              <UtensilsCrossed className="h-8 w-8 text-[#8B5CF6]" />
            </div>
            <p className="text-sm font-medium text-[#F1F1F3]">No food logged</p>
            <p className="mt-1 text-xs text-[#8888A0]">
              Tap the camera button to log your first meal
            </p>
          </div>
        )}
      </div>

      {/* ── Floating Action Button ── */}
      <motion.button
        onClick={() => setModalOpen(true)}
        className="fixed bottom-24 right-5 z-30 flex h-14 w-14 items-center justify-center rounded-full bg-[#8B5CF6] text-white shadow-[0_0_30px_rgba(139,92,246,0.4)] transition-shadow hover:shadow-[0_0_40px_rgba(139,92,246,0.55)]"
        whileTap={{ scale: 0.92 }}
        aria-label="Add food entry"
      >
        <Camera className="h-6 w-6" />
      </motion.button>

      {/* ── Add Food Modal ── */}
      <AddFoodModal
        isOpen={modalOpen}
        onClose={() => setModalOpen(false)}
        onSave={handleSaveComplete}
        selectedDate={selectedDate}
        addFoodEntry={addFoodEntry}
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
  addFoodEntry: (entry: Omit<FoodEntry, 'id' | 'created_at'>) => Promise<void>
}

function AddFoodModal({
  isOpen,
  onClose,
  onSave,
  selectedDate,
  addFoodEntry,
}: AddFoodModalProps) {
  // Mode
  const [mode, setMode] = useState<'choose' | 'photo' | 'manual'>('choose')

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
  const [mealType, setMealType] = useState<MealType>('lunch')
  const [saving, setSaving] = useState(false)

  // Editing AI results
  const [isEditing, setIsEditing] = useState(false)

  // Refs
  const cameraInputRef = useRef<HTMLInputElement>(null)
  const galleryInputRef = useRef<HTMLInputElement>(null)

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
        setMealType('lunch')
        setSaving(false)
        setIsEditing(false)
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

  // Save food entry
  const handleSave = async () => {
    if (!foodName.trim()) return

    setSaving(true)
    try {
      await addFoodEntry({
        date: selectedDate,
        meal_type: mealType,
        food_name: foodName.trim(),
        photo_url: null,
        calories: Number(calories) || 0,
        protein_g: Number(protein) || 0,
        carbs_g: Number(carbs) || 0,
        fats_g: Number(fats) || 0,
        fiber_g: Number(fiber) || 0,
        serving_size: servingSize || '1 serving',
        ai_confidence: analysisResult?.confidence ?? 0,
      })
      onSave()
    } catch {
      setAnalysisError('Failed to save entry')
    } finally {
      setSaving(false)
    }
  }

  // Guess the current meal based on time of day
  useEffect(() => {
    const h = new Date().getHours()
    if (h < 11) setMealType('breakfast')
    else if (h < 15) setMealType('lunch')
    else if (h < 20) setMealType('dinner')
    else setMealType('snack')
  }, [isOpen])

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Add Food">
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
        {/* ── Choose mode ── */}
        {mode === 'choose' && (
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
              <Camera className="h-5 w-5 text-[#8B5CF6]" />
              Take Photo
            </Button>

            <Button
              className="w-full justify-start gap-3"
              variant="outline"
              size="lg"
              onClick={() => galleryInputRef.current?.click()}
            >
              <Upload className="h-5 w-5 text-[#8B5CF6]" />
              Upload Photo
            </Button>

            <div className="relative flex items-center py-2">
              <div className="flex-1 border-t border-[#1E1E2E]" />
              <span className="px-3 text-xs text-[#8888A0]">or</span>
              <div className="flex-1 border-t border-[#1E1E2E]" />
            </div>

            <Button
              className="w-full justify-start gap-3"
              variant="outline"
              size="lg"
              onClick={() => setMode('manual')}
            >
              <Edit3 className="h-5 w-5 text-[#8B5CF6]" />
              Manual Entry
            </Button>
          </motion.div>
        )}

        {/* ── Photo mode ── */}
        {mode === 'photo' && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="space-y-4"
          >
            {/* Photo preview */}
            {imagePreview && (
              <div className="relative overflow-hidden rounded-xl border border-[#1E1E2E]">
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
                <Loader2 className="h-8 w-8 animate-spin text-[#8B5CF6]" />
                <p className="mt-3 text-sm text-[#8888A0]">
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
                        <p className="text-sm font-semibold text-[#F1F1F3]">
                          {foodName}
                        </p>
                        <p className="text-xs text-[#8888A0]">{servingSize}</p>
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
                      <div className="rounded-lg bg-[#1E1E2E] px-2 py-2 text-center">
                        <p className="text-xs text-[#8888A0]">Cal</p>
                        <p className="text-sm font-semibold text-[#10B981]">
                          {calories}
                        </p>
                      </div>
                      <div className="rounded-lg bg-[#1E1E2E] px-2 py-2 text-center">
                        <p className="text-xs text-[#8888A0]">Protein</p>
                        <p className="text-sm font-semibold text-[#8B5CF6]">
                          {protein}g
                        </p>
                      </div>
                      <div className="rounded-lg bg-[#1E1E2E] px-2 py-2 text-center">
                        <p className="text-xs text-[#8888A0]">Carbs</p>
                        <p className="text-sm font-semibold text-[#3B82F6]">
                          {carbs}g
                        </p>
                      </div>
                      <div className="rounded-lg bg-[#1E1E2E] px-2 py-2 text-center">
                        <p className="text-xs text-[#8888A0]">Fats</p>
                        <p className="text-sm font-semibold text-[#F59E0B]">
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
                  {saving ? 'Saving...' : 'Save Entry'}
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

        {/* ── Manual mode ── */}
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
              {saving ? 'Saving...' : 'Save Entry'}
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
}: NutritionFormProps) {
  return (
    <div className="space-y-3">
      <Input
        label="Food Name"
        placeholder="e.g. Grilled Chicken Salad"
        value={foodName}
        onChange={(e) => setFoodName(e.target.value)}
      />
      <Input
        label="Serving Size"
        placeholder="e.g. 1 bowl, 200g"
        value={servingSize}
        onChange={(e) => setServingSize(e.target.value)}
      />
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
      <label className="text-sm font-medium text-[#F1F1F3]">Meal Type</label>
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
                  ? 'border-[#8B5CF6] bg-[#8B5CF6]/15 text-[#A78BFA]'
                  : 'border-[#1E1E2E] bg-[#13131A] text-[#8888A0] hover:border-[#8B5CF6]/30'
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
