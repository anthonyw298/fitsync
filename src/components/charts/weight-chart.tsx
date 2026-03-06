'use client'

import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  ReferenceLine,
} from 'recharts'

interface ChartData {
  date: string
  weight: number
}

function WeightTooltip({ active, payload, label }: { active?: boolean; payload?: Array<{ value: number }>; label?: string }) {
  if (!active || !payload?.length) return null
  return (
    <div className="rounded-lg border border-white/[0.06] glass-dense px-3 py-2 shadow-xl">
      <p className="text-xs text-[#6B6B8A]">{label}</p>
      <p className="text-sm font-bold text-[#EAEAF0]">{payload[0].value} lbs</p>
    </div>
  )
}

interface WeightChartProps {
  data: ChartData[]
  goalWeight?: number | ''
}

export default function WeightChart({ data, goalWeight }: WeightChartProps) {
  return (
    <ResponsiveContainer width="100%" height={180}>
      <LineChart data={data} margin={{ top: 5, right: 10, left: -15, bottom: 0 }}>
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
  )
}
