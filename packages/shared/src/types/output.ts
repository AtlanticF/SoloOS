export type OutputLifecycleState = 'DRAFT' | 'ACTIVE' | 'VALUATED' | 'GHOST' | 'ARCHIVED'

export interface OutputEvent {
  id: string
  event_id: string
  repo_id: number
  repo_name: string
  commit_sha: string
  commit_message: string
  author: string
  committed_at: number
  state: OutputLifecycleState
  project_id: string | null
  project_name_snapshot: string | null
  additions: number
  deletions: number
  files_changed: number
  /** Decimal string, e.g. "4.75" */
  allocated_cost: string
  /** Decimal string, e.g. "0.00" */
  realized_revenue: string
  created_at: number
  updated_at: number
}

export interface OutputSummary {
  counts: Record<OutputLifecycleState, number>
  totals: {
    allocated_cost: string
    realized_revenue: string
  }
  sync_status: SyncStatusValue
  last_synced_at: number | null
}

export type SyncStatusValue = 'idle' | 'running' | 'deferred_rate_limited' | 'failed' | 'success'

export interface RepoSyncState {
  repo_id: number
  repo_full_name: string
  status: SyncStatusValue
  last_synced_at: number | null
  last_synced_sha: string | null
  next_safe_sync_at: number | null
  error_message: string | null
}

export interface RepoBinding {
  id: string
  repo_id: number
  repo_name: string
  repo_full_name: string
  project_id: string | null
  effective_from: 'future_commits_only'
  created_at: number
  updated_at: number
}

export interface GithubConfig {
  id: string
  token_masked: string
  auto_sync_enabled: boolean
  created_at: number
  updated_at: number
}

export interface GithubRepo {
  id: number
  name: string
  full_name: string
  private: boolean
  pushed_at: string | null
}

export interface OutputEventsPage {
  items: OutputEvent[]
  next_cursor: string | null
}

export interface TriggerSyncResponse {
  accepted: boolean
  status: SyncStatusValue
  next_safe_sync_at: number | null
}

export interface UpsertRepoBindingRequest {
  repo_id: number
  repo_name: string
  repo_full_name: string
  project_id: string | null
}

export interface OutputErrorResponse {
  code: 'RATE_LIMITED' | 'UNAUTHORIZED_GITHUB' | 'INVALID_BINDING' | 'SYNC_IN_PROGRESS' | 'INTERNAL_ERROR'
  message: string
  retryable: boolean
  hint: string | null
}
