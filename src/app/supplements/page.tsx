'use client'

import { useState, useEffect, useMemo } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Pill,
  Plus,
  Check,
  Clock,
  Trash2,
  Sun,
  Sunset,
  Moon,
  X,
} from 'lucide-react'
import { useAppStore } from '@/store/app-store'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Select } from '@/components/ui/select'
import { Modal } from '@/components/ui/modal'
import { Badge } from '@/components/ui/badge'
import { ProgressBar } from '@/components/ui/progress-bar'
import { EmptyState } from '@/components/ui/empty-state'
import { getToday } from '@/lib/utils'
// Local storage - no Supabase needed

/* -------------------------------------------------------------------------- */
/*  Types & Constants                                                         */
/* -------------------------------------------------------------------------- */

interface PresetSupplement {
  name: string
  dosage: string
  unit: string
}

const PRESETS: PresetSupplement[] = [
  { name: 'Creatine', dosage: '5', unit: 'g' },
  { name: 'Protein', dosage: '30', unit: 'g' },
  { name: 'Multivitamin', dosage: '1', unit: 'tablet' },
  { name: 'Fish Oil', dosage: '1000', unit: 'mg' },
  { name: 'Vitamin D', dosage: '2000', unit: 'IU' },
  { name: 'Magnesium', dosage: '400', unit: 'mg' },
]

const TIME_OPTIONS = [
  { value: 'morning', label: 'Morning' },
  { value: 'afternoon', label: 'Afternoon' },
  { value: 'evening', label: 'Evening' },
  { value: 'with_meal', label: 'With Meal' },
]

const UNIT_OPTIONS = [
  { value: 'mg', label: 'mg' },
  { value: 'g', label: 'g' },
  { value: 'ml', label: 'ml' },
  { value: 'IU', label: 'IU' },
  { value: 'tablet', label: 'tablet' },
  { value: 'capsule', label: 'capsule' },
]

const TIME_ICON: Record<string, React.ElementType> = {
  morning: Sun,
  afternoon: Sunset,
  evening: Moon,
  with_meal: Clock,
}

const TIME_LABEL: Record<string, string> = {
  morning: 'Morning',
  afternoon: 'Afternoon',
  evening: 'Evening',
  with_meal: 'With Meal',
}

/* -------------------------------------------------------------------------- */
/*  Supplements Page                                                          */
/* -------------------------------------------------------------------------- */

export default function SupplementsPage() {
  /* ── Store ─────────────────────────────────────────────────────────────── */
  const {
    supplements,
    todaySupplementLogs,
    supplementsLoading,
    fetchSupplements,
    fetchTodaySupplementLogs,
    addSupplement,
    toggleSupplementTaken,
    deleteSupplement,
  } = useAppStore()

  /* ── UI state ──────────────────────────────────────────────────────────── */
  const [addOpen, setAddOpen] = useState(false)
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null)

  /* ── Form state ────────────────────────────────────────────────────────── */
  const [name, setName] = useState('')
  const [dosage, setDosage] = useState('')
  const [unit, setUnit] = useState('mg')
  const [timeOfDay, setTimeOfDay] = useState('morning')
  const [addingItem, setAddingItem] = useState(false)

  /* ── Load on mount ─────────────────────────────────────────────────────── */
  useEffect(() => {
    fetchSupplements()
    fetchTodaySupplementLogs()
  }, [fetchSupplements, fetchTodaySupplementLogs])

  /* ── Derived data ──────────────────────────────────────────────────────── */
  const today = getToday()

  const takenMap = useMemo(() => {
    const map = new Map<string, boolean>()
    todaySupplementLogs.forEach((log) => {
      if (log.taken) map.set(log.supplement_id, true)
    })
    return map
  }, [todaySupplementLogs])

  const takenCount = supplements.filter((s) => takenMap.has(s.id)).length
  const totalCount = supplements.length
  const progressPct = totalCount > 0 ? (takenCount / totalCount) * 100 : 0

  /* ── Group by time of day ──────────────────────────────────────────────── */
  const grouped = useMemo(() => {
    const groups: Record<string, typeof supplements> = {
      morning: [],
      afternoon: [],
      evening: [],
      with_meal: [],
    }
    supplements.forEach((s) => {
      const key = s.time_of_day || 'morning'
      if (groups[key]) groups[key].push(s)
      else groups.morning.push(s)
    })
    return groups
  }, [supplements])

  /* ── Handlers ──────────────────────────────────────────────────────────── */
  const resetForm = () => {
    setName('')
    setDosage('')
    setUnit('mg')
    setTimeOfDay('morning')
  }

  const handleAdd = async () => {
    if (!name.trim() || !dosage.trim()) return
    setAddingItem(true)

    await addSupplement({
      name: name.trim(),
      dosage: dosage.trim(),
      unit,
      time_of_day: timeOfDay as 'morning' | 'afternoon' | 'evening' | 'with_meal',
      active: true,
    })

    setAddingItem(false)
    resetForm()
    setAddOpen(false)
  }

  const handlePreset = (preset: PresetSupplement) => {
    setName(preset.name)
    setDosage(preset.dosage)
    setUnit(preset.unit)
  }

  const handleToggle = async (supplementId: string) => {
    await toggleSupplementTaken(supplementId, today)
  }

  const handleDelete = async (id: string) => {
    await deleteSupplement(id)
    setDeleteConfirmId(null)
  }

  /* ──────────────────────────────────────────────────────────────────────── */
  /*  Render                                                                 */
  /* ──────────────────────────────────────────────────────────────────────── */

  return (
    <div className="min-h-screen bg-[#0A0A0F]">
      {/* ── Header ───────────────────────────────────────────────────────── */}
      <header className="border-b border-[#1E1E2E] bg-[#13131A]/80 backdrop-blur-xl px-4 pt-[env(safe-area-inset-top,0px)]">
        <div className="mx-auto flex h-14 max-w-lg items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-[#8B5CF6]/15">
              <Pill className="h-5 w-5 text-[#8B5CF6]" />
            </div>
            <h1 className="text-base font-semibold text-[#F1F1F3]">
              Supplements
            </h1>
          </div>
          <Button size="sm" onClick={() => setAddOpen(true)}>
            <Plus className="h-4 w-4" />
            Add
          </Button>
        </div>
      </header>

      <div className="mx-auto max-w-lg px-4 py-5 space-y-5">
        {/* ── Loading ────────────────────────────────────────────────────── */}
        {supplementsLoading && supplements.length === 0 && (
          <div className="flex items-center justify-center py-20">
            <motion.div
              animate={{ rotate: 360 }}
              transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
            >
              <Pill className="h-6 w-6 text-[#8B5CF6]" />
            </motion.div>
          </div>
        )}

        {/* ── Empty state ────────────────────────────────────────────────── */}
        {!supplementsLoading && supplements.length === 0 && (
          <EmptyState
            icon={Pill}
            title="No Supplements Yet"
            description="Add your daily supplements to track them. Tap the Add button above to get started."
            action={{
              label: 'Add Supplement',
              onClick: () => setAddOpen(true),
            }}
          />
        )}

        {/* ── Progress bar ───────────────────────────────────────────────── */}
        {totalCount > 0 && (
          <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}>
            <Card>
              <CardContent className="pt-5">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm font-medium text-[#F1F1F3]">
                    Today&apos;s Progress
                  </span>
                  <span className="text-sm font-bold tabular-nums text-[#8B5CF6]">
                    {takenCount}/{totalCount}
                  </span>
                </div>
                <ProgressBar
                  value={progressPct}
                  color={progressPct === 100 ? '#10B981' : '#8B5CF6'}
                  height="md"
                />
                {progressPct === 100 && (
                  <motion.p
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    className="mt-2 text-center text-xs text-[#10B981]"
                  >
                    All supplements taken today!
                  </motion.p>
                )}
              </CardContent>
            </Card>
          </motion.div>
        )}

        {/* ── Schedule Timeline ───────────────────────────────────────────── */}
        {totalCount > 0 && (
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
          >
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Clock className="h-4 w-4 text-[#8B5CF6]" />
                  Schedule
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {(['morning', 'afternoon', 'evening', 'with_meal'] as const).map((timeSlot) => {
                  const items = grouped[timeSlot]
                  if (!items || items.length === 0) return null

                  const TimeIcon = TIME_ICON[timeSlot]

                  return (
                    <div key={timeSlot} className="relative">
                      {/* Time label */}
                      <div className="flex items-center gap-2 mb-2">
                        <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-[#1E1E2E]">
                          <TimeIcon className="h-3.5 w-3.5 text-[#8888A0]" />
                        </div>
                        <span className="text-xs font-semibold uppercase tracking-wider text-[#8888A0]">
                          {TIME_LABEL[timeSlot]}
                        </span>
                        <Badge variant="default" className="text-[9px]">
                          {items.filter((s) => takenMap.has(s.id)).length}/{items.length}
                        </Badge>
                      </div>

                      {/* Supplement items */}
                      <div className="ml-3.5 border-l border-[#1E1E2E] pl-5 space-y-2">
                        <AnimatePresence>
                          {items.map((supp) => {
                            const taken = takenMap.has(supp.id)
                            return (
                              <motion.div
                                key={supp.id}
                                layout
                                initial={{ opacity: 0, x: -12 }}
                                animate={{ opacity: 1, x: 0 }}
                                exit={{ opacity: 0, x: 12 }}
                                className={`group flex items-center gap-3 rounded-xl border p-3 transition-all duration-200 ${
                                  taken
                                    ? 'border-[#10B981]/30 bg-[#10B981]/5'
                                    : 'border-[#1E1E2E] bg-[#0A0A0F] hover:border-[#8B5CF6]/30'
                                }`}
                              >
                                {/* Checkbox */}
                                <button
                                  type="button"
                                  onClick={() => handleToggle(supp.id)}
                                  className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-lg transition-all duration-200 ${
                                    taken
                                      ? 'bg-[#10B981] shadow-[0_0_12px_rgba(16,185,129,0.3)]'
                                      : 'border border-[#1E1E2E] bg-transparent hover:border-[#8B5CF6]/40'
                                  }`}
                                >
                                  {taken && (
                                    <motion.div
                                      initial={{ scale: 0 }}
                                      animate={{ scale: 1 }}
                                      transition={{ type: 'spring' as const, stiffness: 500, damping: 15 }}
                                    >
                                      <Check className="h-4 w-4 text-white" />
                                    </motion.div>
                                  )}
                                </button>

                                {/* Info */}
                                <div className="flex-1 min-w-0">
                                  <p
                                    className={`text-sm font-medium transition-all duration-200 ${
                                      taken
                                        ? 'text-[#8888A0] line-through'
                                        : 'text-[#F1F1F3]'
                                    }`}
                                  >
                                    {supp.name}
                                  </p>
                                  <p className="text-xs text-[#8888A0]">
                                    {supp.dosage} {supp.unit}
                                  </p>
                                </div>

                                {/* Delete button */}
                                <button
                                  type="button"
                                  onClick={() => setDeleteConfirmId(supp.id)}
                                  className="shrink-0 rounded-lg p-1.5 text-[#8888A0]/0 transition-all duration-200 group-hover:text-[#8888A0] hover:bg-red-500/10 hover:text-red-400"
                                >
                                  <Trash2 className="h-4 w-4" />
                                </button>
                              </motion.div>
                            )
                          })}
                        </AnimatePresence>
                      </div>
                    </div>
                  )
                })}
              </CardContent>
            </Card>
          </motion.div>
        )}

        {/* ── Today's Checklist (flat list) ───────────────────────────────── */}
        {totalCount > 0 && (
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
          >
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Check className="h-4 w-4 text-[#10B981]" />
                  Today&apos;s Checklist
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                {supplements.map((supp) => {
                  const taken = takenMap.has(supp.id)
                  const TimeIcon = TIME_ICON[supp.time_of_day] || Clock

                  return (
                    <motion.button
                      key={supp.id}
                      type="button"
                      onClick={() => handleToggle(supp.id)}
                      whileTap={{ scale: 0.98 }}
                      className={`flex w-full items-center gap-3 rounded-xl border p-3 text-left transition-all duration-200 ${
                        taken
                          ? 'border-[#10B981]/20 bg-[#10B981]/5'
                          : 'border-[#1E1E2E] bg-[#0A0A0F] hover:border-[#8B5CF6]/30'
                      }`}
                    >
                      {/* Checkbox */}
                      <div
                        className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-md transition-all duration-200 ${
                          taken
                            ? 'bg-[#10B981]'
                            : 'border border-[#1E1E2E]'
                        }`}
                      >
                        {taken && <Check className="h-3.5 w-3.5 text-white" />}
                      </div>

                      {/* Name + dosage */}
                      <div className="flex-1 min-w-0">
                        <span
                          className={`text-sm font-medium ${
                            taken ? 'text-[#8888A0] line-through' : 'text-[#F1F1F3]'
                          }`}
                        >
                          {supp.name}
                        </span>
                        <span className="ml-1.5 text-xs text-[#8888A0]">
                          {supp.dosage}{supp.unit}
                        </span>
                      </div>

                      {/* Time badge */}
                      <Badge variant={taken ? 'success' : 'default'} className="gap-1">
                        <TimeIcon className="h-3 w-3" />
                        {TIME_LABEL[supp.time_of_day]}
                      </Badge>
                    </motion.button>
                  )
                })}
              </CardContent>
            </Card>
          </motion.div>
        )}

        {/* Spacer for bottom nav */}
        <div className="h-4" />
      </div>

      {/* ── Add Supplement Modal ──────────────────────────────────────────── */}
      <Modal
        isOpen={addOpen}
        onClose={() => { setAddOpen(false); resetForm() }}
        title="Add Supplement"
      >
        <div className="space-y-5">
          {/* Quick presets */}
          <div>
            <label className="text-xs font-semibold uppercase tracking-wider text-[#8888A0]">
              Quick Add
            </label>
            <div className="mt-2 grid grid-cols-3 gap-2">
              {PRESETS.map((preset) => (
                <motion.button
                  key={preset.name}
                  type="button"
                  whileTap={{ scale: 0.95 }}
                  onClick={() => handlePreset(preset)}
                  className={`rounded-xl border p-2.5 text-center transition-all duration-150 ${
                    name === preset.name
                      ? 'border-[#8B5CF6] bg-[#8B5CF6]/10'
                      : 'border-[#1E1E2E] bg-[#0A0A0F] hover:border-[#8B5CF6]/30'
                  }`}
                >
                  <p className="text-xs font-semibold text-[#F1F1F3]">
                    {preset.name}
                  </p>
                  <p className="text-[10px] text-[#8888A0]">
                    {preset.dosage}{preset.unit}
                  </p>
                </motion.button>
              ))}
            </div>
          </div>

          {/* Name */}
          <Input
            label="Supplement Name"
            placeholder="e.g. Creatine"
            value={name}
            onChange={(e) => setName(e.target.value)}
          />

          {/* Dosage + unit */}
          <div className="grid grid-cols-2 gap-3">
            <Input
              label="Dosage"
              type="number"
              placeholder="5"
              value={dosage}
              onChange={(e) => setDosage(e.target.value)}
            />
            <Select
              label="Unit"
              options={UNIT_OPTIONS}
              value={unit}
              onChange={(e) => setUnit(e.target.value)}
            />
          </div>

          {/* Time of day */}
          <Select
            label="Time of Day"
            options={TIME_OPTIONS}
            value={timeOfDay}
            onChange={(e) => setTimeOfDay(e.target.value)}
          />

          {/* Submit */}
          <Button
            className="w-full"
            onClick={handleAdd}
            disabled={!name.trim() || !dosage.trim() || addingItem}
          >
            {addingItem ? (
              <motion.div
                animate={{ rotate: 360 }}
                transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
              >
                <Pill className="h-5 w-5" />
              </motion.div>
            ) : (
              <>
                <Plus className="h-5 w-5" />
                Add Supplement
              </>
            )}
          </Button>
        </div>
      </Modal>

      {/* ── Delete Confirmation Modal ─────────────────────────────────────── */}
      <Modal
        isOpen={!!deleteConfirmId}
        onClose={() => setDeleteConfirmId(null)}
        title="Delete Supplement?"
      >
        <div className="space-y-4">
          <div className="flex items-center justify-center">
            <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-red-500/10">
              <Trash2 className="h-7 w-7 text-red-400" />
            </div>
          </div>
          <p className="text-center text-sm text-[#8888A0]">
            This supplement will be removed from your daily tracking. This cannot be undone.
          </p>
          <div className="flex gap-3">
            <Button
              variant="outline"
              className="flex-1"
              onClick={() => setDeleteConfirmId(null)}
            >
              Cancel
            </Button>
            <Button
              variant="destructive"
              className="flex-1"
              onClick={() => deleteConfirmId && handleDelete(deleteConfirmId)}
            >
              <Trash2 className="h-4 w-4" />
              Delete
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  )
}
