export type AssociationStatus = 'PENDING_REVIEW' | 'CONFIRMED' | 'REJECTED'

export interface AssociationSourceSummary {
  id: string
  synthesis: string
  status: string
}

export interface AssociationTargetSummary {
  id: string
  commit_sha: string
  commit_message: string
  /** Decimal string, e.g. "4.75" */
  allocated_cost: string
  /** Unix seconds */
  committed_at: number
}

export interface Association {
  id: string
  project_id: string
  source_id: string
  target_id: string
  match_score: number | null
  reasoning: string | null
  status: AssociationStatus
  source: AssociationSourceSummary
  target: AssociationTargetSummary
  created_at: number
  updated_at: number
}

export interface AssociationsPage {
  items: Association[]
  next_cursor: string | null
}

export interface BatchReviewRequest {
  confirm_ids?: string[]
  reject_ids?: string[]
}

export interface BatchReviewError {
  id: string
  code: string
  message: string
}

export interface BatchReviewResponse {
  confirmed: number
  rejected: number
  errors: BatchReviewError[]
}
