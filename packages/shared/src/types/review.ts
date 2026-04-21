import type { Pillar } from './pillar'

export type ReviewPeriod = 'weekly' | 'monthly'

export interface PillarSnapshot {
  pillar: Pillar
  event_count: number
  impact_sum: number
  score: number
}

export interface Review {
  id: string
  period: ReviewPeriod
  period_start: number
  period_end: number
  snapshot: PillarSnapshot[]
  reflection: string | null
  ai_insight: string | null
  completed_at: number | null
  created_at: number
}
