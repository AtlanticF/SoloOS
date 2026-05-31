import type { Pillar } from './pillar.js'
import type { AgentCostPeriodSummary } from './agent-cost.js'

export type ReviewPeriod = 'weekly' | 'monthly'
export type AgentCostDecision = 'continue' | 'pause' | 'kill' | 'double_down'

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
  agent_cost_summary: AgentCostPeriodSummary
  completed_at: number | null
  created_at: number
}

export interface CompleteReviewRequest {
  reflection: string
  agent_cost_decision?: AgentCostDecision
}
