'use client'

import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Calendar,
  Clock,
  Dumbbell,
  ChevronDown,
  ChevronUp,
  TrendingUp,
  Flame,
  Trash2,
  Check,
  X,
} from 'lucide-react'
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
} from 'recharts'
import { useAppStore } from '@/store/app-store'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import PageHeader from '@/components/layout/page-header'
import type { WorkoutLog } from '@/lib/database.types'

/* ------------------------------------------------------------------ */
/*  Helpers                                                           */
/* ------------------------------------------------------------------ */

function formatDate(dateStr: string): string {
  const d = new Date(dateStr + 'T00:00:00')
  return d.toLocaleDateString('en-US', {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
  })
}

function formatShortDay(dateStr: string): string {
  const d = new Date(dateStr + 'T00:00:00')
  return d.toLocaleDateString('en-US', { weekday: 'short' })
}

function calculateVolume(log: WorkoutLog): number {
  return log.exercises.reduce((total, ex) => {
    return (
      total +
      ex.sets.reduce((sum, s) => sum + (s.completed ? s.reps * s.weight : 0), 0)
    )
  }, 0)
}

function getLast7Days(): string[] {
  const days: string[] = []
  for (let i = 6; i >= 0; i--) {
    const d = new Date()
    d.setDate(d.getDate() - i)
    days.push(d.toISOString().split('T')[0])
  }
  return days
}

/* ------------------------------------------------------------------ */
/*  History Entry Component                                           */
/* ------------------------------------------------------------------ */

function HistoryEntry({ log, onDelete }: { log: WorkoutLog; onDelete: (id: string) => void }) {
  const [expanded, setExpanded] = useState(false)
  const [deleteConfirm, setDeleteConfirm] = useState(false)
  const volume = calculateVolume(log)

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
    >
      <Card>
        <button
          type="button"
          onClick={() => setExpanded(!expanded)}
          className="flex w-full items-center justify-between p-4 text-left"
        >
          <div className="flex items-center gap-3">
            <div
              className={`flex h-10 w-10 items-center justify-center rounded-xl ${
                log.completed
                  ? 'bg-[#34D399]/15 text-[#34D399]'
                  : 'bg-[#FBBF24]/15 text-[#FBBF24]'
              }`}
            >
              <Dumbbell className="h-5 w-5" />
            </div>
            <div className="flex min-w-0 flex-col">
              <span className="font-medium text-[#EAEAF0]">
                {log.workout_name}
              </span>
              <div className="flex items-center gap-2 text-xs text-[#6B6B8A]">
                <span className="flex items-center gap-1">
                  <Calendar className="h-3 w-3" />
                  {formatDate(log.date)}
                </span>
                <span className="flex items-center gap-1">
                  <Clock className="h-3 w-3" />
                  {log.duration_minutes}m
                </span>
              </div>
            </div>
          </div>

          <div className="ml-3 flex items-center gap-2">
            <div className="text-right">
              <p className="text-sm font-semibold tabular-nums text-[#A78BFA]">
                {volume.toLocaleString()}
              </p>
              <p className="text-[10px] text-[#6B6B8A]">kg vol</p>
            </div>
            {expanded ? (
              <ChevronUp className="h-4 w-4 text-[#6B6B8A]" />
            ) : (
              <ChevronDown className="h-4 w-4 text-[#6B6B8A]" />
            )}
          </div>
        </button>

        <AnimatePresence>
          {expanded && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              className="overflow-hidden"
            >
              <div className="border-t border-white/[0.06] px-4 pb-4 pt-3">
                <div className="flex flex-col gap-2">
                  {log.exercises.map((ex, i) => {
                    const exVolume = ex.sets
                      .filter((s) => s.completed)
                      .reduce((sum, s) => sum + s.reps * s.weight, 0)
                    const completedSets = ex.sets.filter((s) => s.completed).length
                    return (
                      <div
                        key={`${log.id}-ex-${i}`}
                        className="flex items-center justify-between rounded-lg bg-transparent px-3 py-2"
                      >
                        <div className="flex flex-col">
                          <span className="text-sm text-[#EAEAF0]">{ex.name}</span>
                          <span className="text-[10px] text-[#6B6B8A]">
                            {completedSets} sets completed
                          </span>
                        </div>
                        <div className="flex flex-col items-end">
                          {ex.sets.filter((s) => s.completed).map((s, si) => (
                            <span
                              key={`set-${si}`}
                              className="text-[10px] tabular-nums text-[#6B6B8A]"
                            >
                              {s.reps} reps x {s.weight} kg
                            </span>
                          ))}
                          <span className="mt-0.5 text-xs font-medium tabular-nums text-[#A78BFA]">
                            {exVolume.toLocaleString()} kg
                          </span>
                        </div>
                      </div>
                    )
                  })}
                </div>

                {log.notes && (
                  <p className="mt-3 text-xs italic text-[#6B6B8A]">{log.notes}</p>
                )}

                <div className="mt-3 flex items-center justify-between">
                  <div className="flex items-center gap-4 text-xs text-[#6B6B8A]">
                    <span className="flex items-center gap-1">
                      <Flame className="h-3 w-3 text-[#FBBF24]" />
                      {log.calories_burned} cal
                    </span>
                    <Badge variant={log.completed ? 'success' : 'warning'}>
                      {log.completed ? 'Complete' : 'Partial'}
                    </Badge>
                  </div>

                  {/* Delete with confirmation */}
                  {deleteConfirm ? (
                    <div className="flex items-center gap-1" onClick={(e) => e.stopPropagation()}>
                      <button
                        onClick={() => onDelete(log.id)}
                        className="rounded-md p-1.5 text-red-400 transition-colors hover:bg-red-500/15"
                        aria-label="Confirm delete"
                      >
                        <Check className="h-4 w-4" />
                      </button>
                      <button
                        onClick={() => setDeleteConfirm(false)}
                        className="rounded-md p-1.5 text-[#6B6B8A] transition-colors hover:bg-white/[0.06]"
                        aria-label="Cancel delete"
                      >
                        <X className="h-4 w-4" />
                      </button>
                    </div>
                  ) : (
                    <button
                      onClick={(e) => { e.stopPropagation(); setDeleteConfirm(true) }}
                      className="rounded-md p-1.5 text-[#6B6B8A] transition-colors hover:bg-red-500/10 hover:text-red-400"
                      aria-label="Delete workout log"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  )}
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </Card>
    </motion.div>
  )
}

/* ------------------------------------------------------------------ */
/*  Custom Tooltip                                                    */
/* ------------------------------------------------------------------ */

function ChartTooltip({
  active,
  payload,
  label,
}: {
  active?: boolean
  payload?: Array<{ value: number }>
  label?: string
}) {
  if (!active || !payload?.length) return null
  return (
    <div className="rounded-lg border border-white/[0.06] bg-[#0E0E18] px-3 py-2 shadow-lg">
      <p className="text-xs text-[#6B6B8A]">{label}</p>
      <p className="text-sm font-semibold text-[#A78BFA]">
        {payload[0].value.toLocaleString()} kg
      </p>
    </div>
  )
}

/* ------------------------------------------------------------------ */
/*  Main History Page                                                 */
/* ------------------------------------------------------------------ */

export default function WorkoutHistoryPage() {
  const {
    workoutLogs: logs,
    fetchWorkoutLogs,
    deleteWorkoutLog,
  } = useAppStore()
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function fetchLogs() {
      setLoading(true)
      await fetchWorkoutLogs(50)
      setLoading(false)
    }
    fetchLogs()
  }, [fetchWorkoutLogs])

  const handleDelete = async (id: string) => {
    await deleteWorkoutLog(id)
  }

  // Build weekly volume chart data
  const last7 = getLast7Days()
  const chartData = last7.map((date) => {
    const dayLogs = logs.filter((l) => l.date === date)
    const dayVolume = dayLogs.reduce((sum, l) => sum + calculateVolume(l), 0)
    return {
      day: formatShortDay(date),
      volume: dayVolume,
    }
  })

  const totalWeeklyVolume = chartData.reduce((sum, d) => sum + d.volume, 0)
  const workoutCount = logs.filter((l) => {
    const logDate = new Date(l.date + 'T00:00:00')
    const weekAgo = new Date()
    weekAgo.setDate(weekAgo.getDate() - 7)
    return logDate >= weekAgo
  }).length

  return (
    <div className="min-h-screen pb-28">
      <PageHeader title="Workout History" subtitle={`${logs.length} workouts logged`} />

      <div className="flex flex-col gap-4 px-4 pt-4">
        {/* Weekly stats */}
        <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}>
          <Card className="gradient-border">
            <CardContent>
              <div className="grid grid-cols-2 gap-4 text-center">
                <div>
                  <p className="text-2xl font-bold tabular-nums text-[#A78BFA]">
                    {totalWeeklyVolume.toLocaleString()}
                  </p>
                  <p className="text-[10px] uppercase tracking-wider text-[#6B6B8A]">
                    Weekly Volume (kg)
                  </p>
                </div>
                <div>
                  <p className="text-2xl font-bold tabular-nums text-[#34D399]">
                    {workoutCount}
                  </p>
                  <p className="text-[10px] uppercase tracking-wider text-[#6B6B8A]">
                    Workouts This Week
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </motion.div>

        {/* Weekly Volume Chart */}
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
        >
          <Card className="gradient-border">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <TrendingUp className="h-4 w-4 text-[#A78BFA]" />
                Weekly Volume
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="h-48">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={chartData} barSize={28}>
                    <XAxis
                      dataKey="day"
                      axisLine={false}
                      tickLine={false}
                      tick={{ fill: '#6B6B8A', fontSize: 11 }}
                    />
                    <YAxis
                      axisLine={false}
                      tickLine={false}
                      tick={{ fill: '#6B6B8A', fontSize: 11 }}
                      width={45}
                      tickFormatter={(v: number) =>
                        v >= 1000 ? `${(v / 1000).toFixed(1)}k` : String(v)
                      }
                    />
                    <Tooltip
                      content={<ChartTooltip />}
                      cursor={{ fill: 'rgba(139, 92, 246, 0.08)' }}
                    />
                    <Bar
                      dataKey="volume"
                      fill="#A78BFA"
                      radius={[6, 6, 0, 0]}
                      animationDuration={800}
                    />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>
        </motion.div>

        {/* Workout Logs List */}
        <div className="flex flex-col gap-3">
          <h3 className="px-1 text-sm font-semibold text-[#EAEAF0]">
            All Workouts
          </h3>

          {loading ? (
            <div className="flex items-center justify-center py-12">
              <div className="h-6 w-6 animate-spin rounded-full border-2 border-[#A78BFA] border-t-transparent" />
            </div>
          ) : logs.length === 0 ? (
            <Card>
              <CardContent className="flex flex-col items-center gap-3 py-8">
                <div className="flex h-14 w-14 items-center justify-center rounded-full bg-white/[0.06]">
                  <Dumbbell className="h-7 w-7 text-[#6B6B8A]" />
                </div>
                <p className="text-sm text-[#6B6B8A]">
                  No workouts logged yet. Complete your first workout!
                </p>
              </CardContent>
            </Card>
          ) : (
            logs.map((log, i) => (
              <motion.div
                key={log.id}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.04 }}
              >
                <HistoryEntry log={log} onDelete={handleDelete} />
              </motion.div>
            ))
          )}
        </div>
      </div>
    </div>
  )
}
