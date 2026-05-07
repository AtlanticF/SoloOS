export type InsightType = 'STRATEGY' | 'TECHNIQUE' | 'MARKET' | 'SEED'

export type InsightStatus = 'INBOX' | 'ACTIVE' | 'INCUBATING' | 'PROJECTIZED' | 'CONVERTED'

export type ShelfLife = 'LONG' | 'SHORT'

export interface InsightContent {
  fact: string
  synthesis: string
  vector: string
}

export interface InsightMetrics {
  value_score: number    // 1-10
  shelf_life: ShelfLife
  certainty: number      // 0-1
}

export interface Insight {
  id: string
  entry_id: string
  event_id: string | null
  type: InsightType
  content: InsightContent
  metrics: InsightMetrics
  status: InsightStatus
  project_id: string | null
  cluster_id: string | null
  created_at: number
  updated_at: number
}

export interface CreateInsightInput {
  entry_id: string
  event_id?: string
  type: InsightType
  content: InsightContent
  metrics?: Partial<InsightMetrics>
  status?: InsightStatus
}

export type ParseOutcome =
  | 'insight_created'
  | 'stored_in_inbox_missing_vector'
  | 'stored_in_inbox_missing_synthesis'
  | 'stored_in_inbox_missing_fact'
  | 'stored_pending'

export interface CaptureResult {
  entry_id: string
  outcome: ParseOutcome
  insight?: Insight
  feedback: string
}
