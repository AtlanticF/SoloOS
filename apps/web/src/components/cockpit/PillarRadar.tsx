import { Radar, RadarChart, PolarAngleAxis, ResponsiveContainer, PolarGrid } from 'recharts'
import { PILLAR_COLORS, type Pillar } from '@soloos/shared'

interface PillarScore { pillar: Pillar; score: number }

export function PillarRadar({ scores }: { scores: PillarScore[] }) {
  const data = scores.map(({ pillar, score }) => ({
    pillar,
    score,
    fullMark: 100,
  }))

  return (
    <ResponsiveContainer width="100%" height={220}>
      <RadarChart data={data} margin={{ top: 16, right: 24, bottom: 16, left: 24 }}>
        <PolarGrid stroke="#1e1e22" radialLines={false} />
        <PolarAngleAxis
          dataKey="pillar"
          tick={({ x, y, payload }) => {
            const pillar = payload.value as Pillar
            return (
              <text x={x} y={y} textAnchor="middle" dominantBaseline="central"
                    fill={PILLAR_COLORS[pillar]} fontSize={9} fontWeight={700}
                    letterSpacing="0.06em">
                {pillar}
              </text>
            )
          }}
        />
        <Radar dataKey="score" stroke="#6366f1" fill="#6366f1" fillOpacity={0.12}
               strokeWidth={1.5} dot={false} />
      </RadarChart>
    </ResponsiveContainer>
  )
}
