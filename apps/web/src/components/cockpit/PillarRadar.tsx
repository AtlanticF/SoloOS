import { Radar, RadarChart, PolarAngleAxis, ResponsiveContainer, PolarGrid } from 'recharts'
import { PILLAR_COLORS, type Pillar } from '@soloos/shared'
import { useTranslation } from 'react-i18next'

interface PillarScore { pillar: Pillar; score: number }

export function PillarRadar({ scores }: { scores: PillarScore[] }) {
  const { t } = useTranslation()
  const data = scores.map(({ pillar, score }) => ({
    pillar,
    score,
    fullMark: 100,
  }))

  return (
    <ResponsiveContainer width="100%" height={220}>
      <RadarChart data={data} outerRadius="78%" margin={{ top: 6, right: 10, bottom: 6, left: 10 }}>
        <PolarGrid stroke="#1e1e22" radialLines={false} />
        <PolarAngleAxis
          dataKey="pillar"
          tickSize={14}
          tick={({ x, y, payload }) => {
            const pillar = payload.value as Pillar
            return (
              <text x={x} y={y} textAnchor="middle" dominantBaseline="central"
                    fill={PILLAR_COLORS[pillar]} fontSize={11} fontWeight={800}
                    letterSpacing="0.08em">
                {t(`pillars.${pillar}`)}
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
