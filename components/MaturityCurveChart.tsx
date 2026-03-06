'use client'

import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip,
  ReferenceDot,
  ResponsiveContainer,
  CartesianGrid,
} from 'recharts'
import type { MaturityLabel } from '@/lib/results-content'

const STAGES: { label: MaturityLabel; multiplier: number }[] = [
  { label: 'AI Laggard', multiplier: 1 },
  { label: 'AI Experimenting', multiplier: 2.5 },
  { label: 'AI Enabled', multiplier: 5 },
  { label: 'AI Leading', multiplier: 7.5 },
  { label: 'AI Native', multiplier: 10 },
]

const STAGE_INDEX: Record<MaturityLabel, number> = {
  'AI Laggard': 0,
  'AI Experimenting': 1,
  'AI Enabled': 2,
  'AI Leading': 3,
  'AI Native': 4,
}

const TEAL = '#00C4A1'

interface Props {
  maturityLabel: MaturityLabel
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function CustomDot(props: any) {
  const { cx, cy, index, activeIndex } = props
  if (index !== activeIndex) return null
  return (
    <g>
      {/* Outer glow ring */}
      <circle cx={cx} cy={cy} r={14} fill={TEAL} opacity={0.15} />
      <circle cx={cx} cy={cy} r={9} fill={TEAL} opacity={0.3} />
      {/* Inner dot */}
      <circle cx={cx} cy={cy} r={5} fill={TEAL} stroke="#0a0a0a" strokeWidth={2} />
    </g>
  )
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function CustomXAxisTick(props: any) {
  const { x, y, payload, activeIndex } = props
  const isActive = payload.index === activeIndex
  return (
    <g transform={`translate(${x},${y})`}>
      <text
        x={0}
        y={0}
        dy={16}
        textAnchor="middle"
        fill={isActive ? TEAL : '#555'}
        fontSize={11}
        fontWeight={isActive ? 600 : 400}
      >
        {payload.value}
      </text>
    </g>
  )
}

export default function MaturityCurveChart({ maturityLabel }: Props) {
  const activeIndex = STAGE_INDEX[maturityLabel] ?? 0

  const data = STAGES.map((s, i) => ({
    name: s.label,
    value: s.multiplier,
    index: i,
  }))

  return (
    <div style={{ width: '100%', height: 240 }}>
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart data={data} margin={{ top: 20, right: 20, bottom: 10, left: 10 }}>
          <defs>
            <linearGradient id="curveGradient" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor={TEAL} stopOpacity={0.15} />
              <stop offset="95%" stopColor={TEAL} stopOpacity={0} />
            </linearGradient>
          </defs>

          <CartesianGrid vertical={false} stroke="#1a1a1a" />

          <XAxis
            dataKey="name"
            tick={(props) => <CustomXAxisTick {...props} activeIndex={activeIndex} />}
            axisLine={false}
            tickLine={false}
            interval={0}
          />

          <YAxis
            label={{
              value: 'AI Productivity Multiplier',
              angle: -90,
              position: 'insideLeft',
              offset: 10,
              style: { fill: '#444', fontSize: 10 },
            }}
            tickFormatter={(v) => `${v}x`}
            domain={[0, 11]}
            ticks={[1, 2.5, 5, 7.5, 10]}
            tick={{ fill: '#444', fontSize: 10 }}
            axisLine={false}
            tickLine={false}
            width={42}
          />

          <Tooltip
            contentStyle={{
              background: '#111',
              border: '1px solid #1a1a1a',
              borderRadius: 8,
              fontSize: 12,
              color: '#fff',
            }}
            formatter={(value: number | undefined) => [`${value ?? 0}x`, 'Multiplier']}
            labelStyle={{ color: TEAL, fontWeight: 600 }}
            cursor={{ stroke: '#333', strokeWidth: 1 }}
          />

          <Area
            type="monotone"
            dataKey="value"
            stroke={TEAL}
            strokeWidth={2}
            fill="url(#curveGradient)"
            dot={(props) => <CustomDot {...props} activeIndex={activeIndex} />}
            activeDot={false}
          />

          {/* Reference dot for current stage — larger persistent marker */}
          <ReferenceDot
            x={maturityLabel}
            y={STAGES[activeIndex].multiplier}
            r={0}
            label={{
              value: `${STAGES[activeIndex].multiplier}x`,
              position: 'top',
              fill: TEAL,
              fontSize: 12,
              fontWeight: 700,
            }}
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  )
}
