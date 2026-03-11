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
  { label: 'AI Laggard', multiplier: -1 },
  { label: 'AI Experimenting', multiplier: 1 },
  { label: 'AI Enabled', multiplier: 2 },
  { label: 'AI Leading', multiplier: 5 },
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
const RED  = '#ef4444'

interface Props {
  maturityLabel: MaturityLabel
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function CustomDot(props: any) {
  const { cx, cy, index, activeIndex, activeColor } = props
  if (index !== activeIndex) return null
  return (
    <g>
      <circle cx={cx} cy={cy} r={14} fill={activeColor} opacity={0.15} />
      <circle cx={cx} cy={cy} r={9}  fill={activeColor} opacity={0.3}  />
      <circle cx={cx} cy={cy} r={5}  fill={activeColor} stroke="#0a0a0a" strokeWidth={2} />
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

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function CustomTooltip({ active, payload, label }: any) {
  if (!active || !payload?.length) return null
  const value: number = payload[0].value
  const colour = value < 0 ? RED : TEAL
  return (
    <div style={{
      background: '#111',
      border: '1px solid #1a1a1a',
      borderRadius: 8,
      padding: '8px 12px',
      fontSize: 12,
    }}>
      <p style={{ color: colour, fontWeight: 600, marginBottom: 2 }}>{label}</p>
      <p style={{ color: colour }}>{value}x Multiplier</p>
    </div>
  )
}

export default function MaturityCurveChart({ maturityLabel }: Props) {
  const activeIndex  = STAGE_INDEX[maturityLabel] ?? 0
  const activeMultiplier = STAGES[activeIndex].multiplier
  const activeColor  = activeMultiplier < 0 ? RED : TEAL

  const data = STAGES.map((s, i) => ({
    name:  s.label,
    value: s.multiplier,
    index: i,
  }))

  return (
    <div style={{ width: '100%', height: 240 }}>
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart data={data} margin={{ top: 20, right: 20, bottom: 10, left: 10 }}>
          <defs>
            <linearGradient id="curveGradient" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%"  stopColor={TEAL} stopOpacity={0.15} />
              <stop offset="95%" stopColor={TEAL} stopOpacity={0}    />
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
            domain={[-2, 11]}
            ticks={[-1, 1, 2, 5, 10]}
            tick={{ fill: '#444', fontSize: 10 }}
            axisLine={false}
            tickLine={false}
            width={42}
          />

          <Tooltip content={<CustomTooltip />} cursor={{ stroke: '#333', strokeWidth: 1 }} />

          <Area
            type="monotone"
            dataKey="value"
            stroke={TEAL}
            strokeWidth={2}
            fill="url(#curveGradient)"
            dot={(props) => <CustomDot {...props} activeIndex={activeIndex} activeColor={activeColor} />}
            activeDot={false}
          />

          {/* Reference label for current stage */}
          <ReferenceDot
            x={maturityLabel}
            y={activeMultiplier}
            r={0}
            label={{
              value: `${activeMultiplier}x`,
              position: 'top',
              fill: activeColor,
              fontSize: 12,
              fontWeight: 700,
            }}
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  )
}
