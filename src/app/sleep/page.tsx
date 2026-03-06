'use client'

import { useState, useEffect, useMemo } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Moon,
  Sun,
  Star,
  AlertTriangle,
  TrendingUp,
  Clock,
  BedDouble,
} from 'lucide-react'
import {
  LineChart,
  Line,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  ReferenceLine,
} from 'recharts'
import { format } from 'date-fns'
import { useAppStore } from '@/store/app-store'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { ProgressBar } from '@/components/ui/progress-bar'
import PageHeader from '@/components/layout/page-header'
// Local storage - no Supabase needed
import { getToday } from '@/lib/utils'
import type { SleepLog } from '@/lib/database.types'

/* ------------------------------------------------------------------ */
/*  Helpers                                                           */
/* ------------------------------------------------------------------ */

function qualityColor(q: number): string {
  if (q >= 4) return '#34D399'
  if (q === 3) return '#FBBF24'
  return '#F87171'
}

function qualityLabel(q: number): string {
  if (q >= 5) return 'Excellent'
  if (q >= 4) return 'Good'
  if (q >= 3) return 'Fair'
  if (q >= 2) return 'Poor'
  return 'Terrible'
}

function calculateDuration(bedtime: string, wakeTime: string): number {
  // Both are HH:MM strings
  const [bh, bm] = bedtime.split(':').map(Number)
  const [wh, wm] = wakeTime.split(':').map(Number)
  let bedMinutes = bh * 60 + bm
  let wakeMinutes = wh * 60 + wm
  // If wake is earlier than bed, it's next day
  if (wakeMinutes <= bedMinutes) {
    wakeMinutes += 24 * 60
  }
  return parseFloat(((wakeMinutes - bedMinutes) / 60).toFixed(1))
}

function formatHours(h: number): string {
  const hours = Math.floor(h)
  const minutes = Math.round((h - hours) * 60)
  if (minutes === 0) return `${hours}h`
  return `${hours}h ${minutes}m`
}

/* ------------------------------------------------------------------ */
/*  Star Rating Component                                             */
/* ------------------------------------------------------------------ */

function StarRating({
  value,
  onChange,
  size = 'md',
  readOnly = false,
}: {
  value: number
  onChange?: (v: number) => void
  size?: 'sm' | 'md' | 'lg'
  readOnly?: boolean
}) {
  const sizeClasses = { sm: 'h-4 w-4', md: 'h-6 w-6', lg: 'h-8 w-8' }

  return (
    <div className="flex items-center gap-1">
      {[1, 2, 3, 4, 5].map((star) => (
        <button
          key={star}
          type="button"
          onClick={() => !readOnly && onChange?.(star)}
          disabled={readOnly}
          className={`transition-all duration-150 ${readOnly ? 'cursor-default' : 'cursor-pointer hover:scale-110 active:scale-95'}`}
        >
          <Star
            className={`${sizeClasses[size]} ${
              star <= value
                ? 'fill-[#FBBF24] text-[#FBBF24]'
                : 'fill-none text-white/[0.06]'
            }`}
          />
        </button>
      ))}
    </div>
  )
}

/* ------------------------------------------------------------------ */
/*  Custom Tooltips                                                   */
/* ------------------------------------------------------------------ */

function DurationTooltip({
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
      <p className="text-sm font-semibold text-[#38BDF8]">
        {formatHours(payload[0].value)}
      </p>
    </div>
  )
}

function QualityTooltip({
  active,
  payload,
  label,
}: {
  active?: boolean
  payload?: Array<{ value: number; payload: { fill: string } }>
  label?: string
}) {
  if (!active || !payload?.length) return null
  return (
    <div className="rounded-lg border border-white/[0.06] bg-[#0E0E18] px-3 py-2 shadow-lg">
      <p className="text-xs text-[#6B6B8A]">{label}</p>
      <p className="text-sm font-semibold" style={{ color: payload[0].payload.fill }}>
        {payload[0].value}/5 — {qualityLabel(payload[0].value)}
      </p>
    </div>
  )
}

/* ------------------------------------------------------------------ */
/*  Main Sleep Page                                                   */
/* ------------------------------------------------------------------ */

export default function SleepPage() {
  const {
    recentSleep,
    sleepLoading,
    fetchRecentSleep,
    addSleepLog,
  } = useAppStore()

  // Form state
  const [bedtime, setBedtime] = useState('23:00')
  const [wakeTime, setWakeTime] = useState('07:00')
  const [quality, setQuality] = useState<1 | 2 | 3 | 4 | 5>(4)
  const [notes, setNotes] = useState('')
  const [saving, setSaving] = useState(false)
  const [showForm, setShowForm] = useState(false)

  useEffect(() => {
    fetchRecentSleep()
  }, [fetchRecentSleep])

  // Derived data
  const lastNight = recentSleep[0] ?? null
  const duration = calculateDuration(bedtime, wakeTime)

  // Chart data (last 14 days)
  const last14 = useMemo(() => {
    const days: { date: string; label: string; duration: number; quality: number; fill: string }[] =
      []
    for (let i = 13; i >= 0; i--) {
      const d = new Date()
      d.setDate(d.getDate() - i)
      const dateStr = d.toISOString().split('T')[0]
      const label = format(d, 'MMM d')
      const log = recentSleep.find((s) => s.date === dateStr)
      days.push({
        date: dateStr,
        label,
        duration: log?.duration_hours ?? 0,
        quality: log?.quality ?? 0,
        fill: log ? qualityColor(log.quality) : 'rgba(255,255,255,0.06)',
      })
    }
    return days
  }, [recentSleep])

  // Statistics (last 30 days)
  const stats = useMemo(() => {
    const logs = recentSleep.filter((s) => s.duration_hours > 0)
    if (logs.length === 0) {
      return {
        avgDuration: 0,
        avgQuality: 0,
        bestNight: null as SleepLog | null,
        worstNight: null as SleepLog | null,
      }
    }
    const avgDuration = logs.reduce((s, l) => s + l.duration_hours, 0) / logs.length
    const avgQuality = logs.reduce((s, l) => s + l.quality, 0) / logs.length
    const sorted = [...logs].sort((a, b) => b.duration_hours - a.duration_hours)
    return {
      avgDuration: parseFloat(avgDuration.toFixed(1)),
      avgQuality: parseFloat(avgQuality.toFixed(1)),
      bestNight: sorted[0] ?? null,
      worstNight: sorted[sorted.length - 1] ?? null,
    }
  }, [recentSleep])

  // Pattern alerts
  const alerts = useMemo(() => {
    const result: { type: 'warning' | 'info'; title: string; message: string }[] = []

    // Check for 3+ consecutive nights below 6 hours
    if (recentSleep.length >= 3) {
      const recent3 = recentSleep.slice(0, 3)
      const allBelow6 = recent3.every((s) => s.duration_hours < 6)
      if (allBelow6) {
        result.push({
          type: 'warning',
          title: 'Sleep Deficit Detected',
          message:
            'You have slept less than 6 hours for 3+ consecutive nights. Consider reducing workout intensity and prioritizing recovery.',
        })
      }
    }

    // Check bedtime consistency (>2 hour variance)
    if (recentSleep.length >= 3) {
      const bedtimes = recentSleep.slice(0, 7).map((s) => {
        const [h, m] = s.bedtime.split(':').map(Number)
        let mins = h * 60 + m
        // Normalize: if bedtime is before 6pm, treat as next-day (e.g. 1:00 AM = 25:00)
        if (mins < 18 * 60) mins += 24 * 60
        return mins
      })
      const minBed = Math.min(...bedtimes)
      const maxBed = Math.max(...bedtimes)
      if (maxBed - minBed > 120) {
        result.push({
          type: 'info',
          title: 'Inconsistent Bedtime',
          message: `Your bedtime has varied by ${Math.round((maxBed - minBed) / 60)}+ hours this week. A consistent sleep schedule improves recovery and performance.`,
        })
      }
    }

    return result
  }, [recentSleep])

  // Save sleep log
  const handleSave = async () => {
    setSaving(true)
    try {
      await addSleepLog({
        date: getToday(),
        bedtime,
        wake_time: wakeTime,
        duration_hours: duration,
        quality,
        notes,
        pattern_alert: alerts.length > 0 ? alerts[0].title : null,
      })
      setShowForm(false)
      setNotes('')
    } catch (err) {
      console.error('Failed to save sleep log:', err)
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="min-h-screen bg-transparent pb-28">
      <PageHeader
        title="Sleep"
        subtitle="Track & optimize your rest"
        rightAction={
          <Button variant="outline" size="sm" onClick={() => setShowForm(!showForm)}>
            {showForm ? 'Cancel' : 'Log Sleep'}
          </Button>
        }
      />

      <div className="flex flex-col gap-4 px-4 pt-4">
        {/* ============================================================ */}
        {/*  Last Night's Sleep Card                                     */}
        {/* ============================================================ */}
        <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}>
          <Card
            className="border-l-4"
            style={{
              borderLeftColor: lastNight ? qualityColor(lastNight.quality) : 'rgba(255,255,255,0.06)',
            }}
          >
            <CardContent>
              {lastNight ? (
                <div className="flex items-start justify-between">
                  <div className="flex flex-col gap-2">
                    <p className="text-xs font-medium uppercase tracking-wider text-[#6B6B8A]">
                      Last Night
                    </p>
                    <p className="text-4xl font-bold tabular-nums text-[#EAEAF0]">
                      {formatHours(lastNight.duration_hours)}
                    </p>
                    <StarRating value={lastNight.quality} readOnly size="sm" />
                    <div className="mt-1 flex items-center gap-4 text-xs text-[#6B6B8A]">
                      <span className="flex items-center gap-1">
                        <Moon className="h-3 w-3 text-[#A78BFA]" />
                        {lastNight.bedtime}
                      </span>
                      <span className="flex items-center gap-1">
                        <Sun className="h-3 w-3 text-[#FBBF24]" />
                        {lastNight.wake_time}
                      </span>
                    </div>
                  </div>
                  <div
                    className="flex h-14 w-14 items-center justify-center rounded-2xl shadow-[0_0_20px_rgba(129,140,248,0.15)]"
                    style={{
                      backgroundColor: `${qualityColor(lastNight.quality)}15`,
                    }}
                  >
                    <BedDouble
                      className="h-7 w-7"
                      style={{ color: qualityColor(lastNight.quality) }}
                    />
                  </div>
                </div>
              ) : (
                <div className="flex flex-col items-center gap-3 py-4">
                  <Moon className="h-10 w-10 text-[#6B6B8A]" />
                  <p className="text-sm text-[#6B6B8A]">No sleep data yet</p>
                  <Button size="sm" onClick={() => setShowForm(true)}>
                    Log Your First Night
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>
        </motion.div>

        {/* ============================================================ */}
        {/*  Log Sleep Form                                              */}
        {/* ============================================================ */}
        <AnimatePresence>
          {showForm && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              className="overflow-hidden"
            >
              <Card className="border-[#818CF8]/30 glow-primary">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Moon className="h-4 w-4 text-[#A78BFA]" />
                    Log Sleep
                  </CardTitle>
                </CardHeader>
                <CardContent className="flex flex-col gap-4">
                  <div className="grid grid-cols-2 gap-3">
                    <div className="flex flex-col gap-1.5">
                      <label className="text-xs font-medium text-[#6B6B8A]">
                        Bedtime
                      </label>
                      <input
                        type="time"
                        value={bedtime}
                        onChange={(e) => setBedtime(e.target.value)}
                        className="flex h-10 w-full rounded-xl border border-white/[0.06] bg-[#0E0E18] px-3 py-2 text-sm text-[#EAEAF0] transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#A78BFA]/50 [color-scheme:dark]"
                      />
                    </div>
                    <div className="flex flex-col gap-1.5">
                      <label className="text-xs font-medium text-[#6B6B8A]">
                        Wake Time
                      </label>
                      <input
                        type="time"
                        value={wakeTime}
                        onChange={(e) => setWakeTime(e.target.value)}
                        className="flex h-10 w-full rounded-xl border border-white/[0.06] bg-[#0E0E18] px-3 py-2 text-sm text-[#EAEAF0] transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#A78BFA]/50 [color-scheme:dark]"
                      />
                    </div>
                  </div>

                  {/* Duration preview */}
                  <div className="flex items-center justify-center gap-2 rounded-xl bg-transparent py-3">
                    <Clock className="h-4 w-4 text-[#38BDF8]" />
                    <span className="text-lg font-semibold text-[#EAEAF0]">
                      {formatHours(duration)}
                    </span>
                    <Badge variant={duration >= 7 ? 'success' : duration >= 6 ? 'warning' : 'danger'}>
                      {duration >= 8 ? 'Great' : duration >= 7 ? 'Good' : duration >= 6 ? 'Fair' : 'Low'}
                    </Badge>
                  </div>

                  {/* Quality rating */}
                  <div className="flex flex-col items-center gap-2">
                    <label className="text-xs font-medium text-[#6B6B8A]">
                      Sleep Quality
                    </label>
                    <StarRating
                      value={quality}
                      onChange={(v) => setQuality(v as 1 | 2 | 3 | 4 | 5)}
                      size="lg"
                    />
                    <span
                      className="text-xs font-medium"
                      style={{ color: qualityColor(quality) }}
                    >
                      {qualityLabel(quality)}
                    </span>
                  </div>

                  {/* Notes */}
                  <Input
                    placeholder="Any notes about your sleep..."
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                  />

                  <Button
                    size="lg"
                    onClick={handleSave}
                    disabled={saving}
                    className="w-full"
                  >
                    {saving ? 'Saving...' : 'Save Sleep Log'}
                  </Button>
                </CardContent>
              </Card>
            </motion.div>
          )}
        </AnimatePresence>

        {/* ============================================================ */}
        {/*  Pattern Alerts                                              */}
        {/* ============================================================ */}
        {alerts.map((alert, i) => (
          <motion.div
            key={`alert-${i}`}
            initial={{ opacity: 0, x: -12 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.2 + i * 0.1 }}
          >
            <Card
              className={`border-l-4 ${
                alert.type === 'warning'
                  ? 'border-l-[#F87171] bg-[#F87171]/5'
                  : 'border-l-[#FBBF24] bg-[#FBBF24]/5'
              }`}
            >
              <CardContent>
                <div className="flex items-start gap-3">
                  <AlertTriangle
                    className={`mt-0.5 h-5 w-5 flex-shrink-0 ${
                      alert.type === 'warning' ? 'text-[#F87171]' : 'text-[#FBBF24]'
                    }`}
                  />
                  <div>
                    <p className="text-sm font-semibold text-[#EAEAF0]">{alert.title}</p>
                    <p className="mt-1 text-xs leading-relaxed text-[#6B6B8A]">
                      {alert.message}
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </motion.div>
        ))}

        {/* ============================================================ */}
        {/*  Sleep Duration Chart (14 days)                              */}
        {/* ============================================================ */}
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.15 }}
        >
          <Card className="gradient-border">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <TrendingUp className="h-4 w-4 text-[#38BDF8]" />
                Sleep Duration
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="h-52">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart
                    data={last14.filter((d) => d.duration > 0)}
                    margin={{ top: 5, right: 5, left: -10, bottom: 5 }}
                  >
                    <XAxis
                      dataKey="label"
                      axisLine={false}
                      tickLine={false}
                      tick={{ fill: '#6B6B8A', fontSize: 10 }}
                      interval="preserveStartEnd"
                    />
                    <YAxis
                      domain={[0, 12]}
                      axisLine={false}
                      tickLine={false}
                      tick={{ fill: '#6B6B8A', fontSize: 10 }}
                      width={35}
                      tickFormatter={(v: number) => `${v}h`}
                    />
                    <ReferenceLine
                      y={7}
                      stroke="#6B6B8A"
                      strokeDasharray="4 4"
                      strokeOpacity={0.4}
                      label={{
                        value: '7h goal',
                        fill: '#6B6B8A',
                        fontSize: 10,
                        position: 'right',
                      }}
                    />
                    <Tooltip content={<DurationTooltip />} />
                    <Line
                      type="monotone"
                      dataKey="duration"
                      stroke="#38BDF8"
                      strokeWidth={2.5}
                      dot={{ fill: '#38BDF8', r: 3, strokeWidth: 0 }}
                      activeDot={{ fill: '#38BDF8', r: 5, strokeWidth: 2, stroke: '#0E0E18' }}
                      animationDuration={800}
                    />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>
        </motion.div>

        {/* ============================================================ */}
        {/*  Sleep Quality Chart (14 days)                               */}
        {/* ============================================================ */}
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
        >
          <Card className="gradient-border">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Star className="h-4 w-4 text-[#FBBF24]" />
                Sleep Quality
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="h-44">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart
                    data={last14.filter((d) => d.quality > 0)}
                    barSize={16}
                    margin={{ top: 5, right: 5, left: -10, bottom: 5 }}
                  >
                    <XAxis
                      dataKey="label"
                      axisLine={false}
                      tickLine={false}
                      tick={{ fill: '#6B6B8A', fontSize: 10 }}
                      interval="preserveStartEnd"
                    />
                    <YAxis
                      domain={[0, 5]}
                      ticks={[1, 2, 3, 4, 5]}
                      axisLine={false}
                      tickLine={false}
                      tick={{ fill: '#6B6B8A', fontSize: 10 }}
                      width={25}
                    />
                    <Tooltip content={<QualityTooltip />} cursor={false} />
                    <Bar
                      dataKey="quality"
                      radius={[4, 4, 0, 0]}
                      animationDuration={800}
                    >
                      {last14
                        .filter((d) => d.quality > 0)
                        .map((entry, idx) => (
                          <rect key={`cell-${idx}`} fill={entry.fill} />
                        ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>
        </motion.div>

        {/* ============================================================ */}
        {/*  Sleep Statistics (30 days)                                  */}
        {/* ============================================================ */}
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.25 }}
        >
          <Card>
            <CardHeader>
              <CardTitle>30-Day Statistics</CardTitle>
            </CardHeader>
            <CardContent className="flex flex-col gap-4">
              <div className="grid grid-cols-2 gap-4">
                {/* Avg Duration */}
                <div className="glass-subtle rounded-xl border border-white/[0.06] p-4">
                  <div className="flex items-center gap-2">
                    <Clock className="h-4 w-4 text-[#38BDF8]" />
                    <span className="text-[10px] uppercase tracking-wider text-[#6B6B8A]">
                      Avg Duration
                    </span>
                  </div>
                  <p className="mt-2 text-2xl font-bold tabular-nums text-[#EAEAF0]">
                    {stats.avgDuration > 0 ? formatHours(stats.avgDuration) : '--'}
                  </p>
                  <ProgressBar
                    value={stats.avgDuration > 0 ? (stats.avgDuration / 9) * 100 : 0}
                    color="#38BDF8"
                    height="sm"
                    className="mt-2"
                  />
                </div>

                {/* Avg Quality */}
                <div className="glass-subtle rounded-xl border border-white/[0.06] p-4">
                  <div className="flex items-center gap-2">
                    <Star className="h-4 w-4 text-[#FBBF24]" />
                    <span className="text-[10px] uppercase tracking-wider text-[#6B6B8A]">
                      Avg Quality
                    </span>
                  </div>
                  <p className="mt-2 text-2xl font-bold tabular-nums text-[#EAEAF0]">
                    {stats.avgQuality > 0 ? `${stats.avgQuality}/5` : '--'}
                  </p>
                  <ProgressBar
                    value={stats.avgQuality > 0 ? (stats.avgQuality / 5) * 100 : 0}
                    color="#FBBF24"
                    height="sm"
                    className="mt-2"
                  />
                </div>

                {/* Best Night */}
                <div className="glass-subtle rounded-xl border border-white/[0.06] p-4">
                  <div className="flex items-center gap-2">
                    <TrendingUp className="h-4 w-4 text-[#34D399]" />
                    <span className="text-[10px] uppercase tracking-wider text-[#6B6B8A]">
                      Best Night
                    </span>
                  </div>
                  {stats.bestNight ? (
                    <>
                      <p className="mt-2 text-xl font-bold text-[#34D399]">
                        {formatHours(stats.bestNight.duration_hours)}
                      </p>
                      <p className="text-[10px] text-[#6B6B8A]">
                        {format(new Date(stats.bestNight.date + 'T00:00:00'), 'MMM d')}
                      </p>
                    </>
                  ) : (
                    <p className="mt-2 text-xl font-bold text-[#6B6B8A]">--</p>
                  )}
                </div>

                {/* Worst Night */}
                <div className="glass-subtle rounded-xl border border-white/[0.06] p-4">
                  <div className="flex items-center gap-2">
                    <AlertTriangle className="h-4 w-4 text-[#F87171]" />
                    <span className="text-[10px] uppercase tracking-wider text-[#6B6B8A]">
                      Worst Night
                    </span>
                  </div>
                  {stats.worstNight ? (
                    <>
                      <p className="mt-2 text-xl font-bold text-[#F87171]">
                        {formatHours(stats.worstNight.duration_hours)}
                      </p>
                      <p className="text-[10px] text-[#6B6B8A]">
                        {format(new Date(stats.worstNight.date + 'T00:00:00'), 'MMM d')}
                      </p>
                    </>
                  ) : (
                    <p className="mt-2 text-xl font-bold text-[#6B6B8A]">--</p>
                  )}
                </div>
              </div>

              {/* Total nights logged */}
              <div className="flex items-center justify-between rounded-xl bg-transparent px-4 py-3">
                <span className="text-xs text-[#6B6B8A]">Nights tracked (30 days)</span>
                <Badge>
                  {recentSleep.length} / 30
                </Badge>
              </div>
            </CardContent>
          </Card>
        </motion.div>
      </div>
    </div>
  )
}
