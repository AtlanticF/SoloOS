export const AGENT_COST_PROVIDERS = ['openai', 'anthropic', 'cursor', 'manual'] as const
export type AgentCostProvider = typeof AGENT_COST_PROVIDERS[number]

export const AGENT_COST_SOURCES = ['official_api', 'official_export', 'sdk_estimate', 'manual'] as const
export type AgentCostSource = typeof AGENT_COST_SOURCES[number]

export type AgentCostProviderStatus = 'untested' | 'ok' | 'error'
export type AgentCostSyncStatus = 'idle' | 'running' | 'failed' | 'success'
export type AgentCostMappingType = 'provider_project_id' | 'api_key_id' | 'line_item'

export interface AgentCostProviderConfig {
  id: string
  provider: Exclude<AgentCostProvider, 'manual'>
  label: string
  api_key_masked: string
  status: AgentCostProviderStatus
  last_tested_at: number | null
  last_error: string | null
  created_at: number
  updated_at: number
}

export interface UpsertAgentCostProviderConfigRequest {
  label: string
  api_key: string
}

export interface AgentCostProviderTestResult {
  ok: boolean
  provider: Exclude<AgentCostProvider, 'manual'>
  status: AgentCostProviderStatus
  error?: string
}

export interface OfficialAgentCostSyncRequest {
  start_time: number
  end_time?: number
}
export type OpenAIAgentCostSyncRequest = OfficialAgentCostSyncRequest

export interface AgentCostSyncResult {
  provider: Exclude<AgentCostProvider, 'manual'>
  imported: number
  skipped: number
  unassigned: number
  status: AgentCostSyncStatus
  error?: string
}

export interface AgentCostEvent {
  id: string
  provider: AgentCostProvider
  source: AgentCostSource
  project_id: string | null
  provider_project_id: string | null
  api_key_id: string | null
  line_item: string | null
  model: string | null
  tool_label: string | null
  /** Decimal string, e.g. "12.34" */
  amount: string
  currency: string
  usage_start: number
  usage_end: number
  raw_metadata: Record<string, unknown>
  created_at: number
  updated_at: number
}

export interface CreateManualAgentCostEventRequest {
  provider?: AgentCostProvider
  project_id?: string | null
  provider_project_id?: string | null
  api_key_id?: string | null
  line_item?: string | null
  model?: string | null
  tool_label?: string | null
  amount: string
  currency: string
  usage_start: number
  usage_end: number
  raw_metadata?: Record<string, unknown>
}

export interface AgentCostEventsPage {
  items: AgentCostEvent[]
  next_cursor: string | null
}

export interface AgentCostProjectSummary {
  project_id: string
  amount: string
  currency: string
}

export interface AgentCostPeriodSummary {
  currency: string
  total_amount: string
  assigned_amount: string
  unassigned_amount: string
  project_costs: AgentCostProjectSummary[]
}

export interface AgentCostProjectMapping {
  id: string
  provider: Exclude<AgentCostProvider, 'manual'>
  match_type: AgentCostMappingType
  match_value: string
  project_id: string
  created_at: number
  updated_at: number
}

export interface CreateAgentCostProjectMappingRequest {
  provider: Exclude<AgentCostProvider, 'manual'>
  match_type: AgentCostMappingType
  match_value: string
  project_id: string
}

export interface AssignAgentCostEventProjectRequest {
  project_id: string
}

export interface AgentCostSyncState {
  id: string
  provider: Exclude<AgentCostProvider, 'manual'>
  last_synced_at: number | null
  sync_status: AgentCostSyncStatus
  error_message: string | null
  created_at: number
  updated_at: number
}
