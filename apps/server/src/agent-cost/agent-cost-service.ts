import { and, desc, eq, gte, isNull, lt, lte } from 'drizzle-orm'
import { randomUUID } from 'crypto'
import type {
  AgentCostEvent,
  AgentCostEventsPage,
  AgentCostPeriodSummary,
  AgentCostProviderConfig,
  AgentCostProviderTestResult,
  AgentCostSyncResult,
  AssignAgentCostEventProjectRequest,
  CreateAgentCostProjectMappingRequest,
  CreateManualAgentCostEventRequest,
  OpenAIAgentCostSyncRequest,
  UpsertAgentCostProviderConfigRequest,
} from '@soloos/shared'
import type { DB } from '../db/index'
import * as schema from '../db/schema'
import { parseJsonColumn } from '../util/json-column'

type CostProvider = AgentCostProviderConfig['provider']
type CostMappingType = CreateAgentCostProjectMappingRequest['match_type']

const OPENAI_COSTS_URL = 'https://api.openai.com/v1/organization/costs'
const MAPPING_PRECEDENCE: CostMappingType[] = ['provider_project_id', 'api_key_id', 'line_item']

export async function listAgentCostProviderConfigs(db: DB): Promise<AgentCostProviderConfig[]> {
  const rows = await db.select().from(schema.agent_cost_provider_configs)
  return rows.map(deserializeProviderConfig)
}

export async function upsertAgentCostProviderConfig(
  db: DB,
  provider: CostProvider,
  input: UpsertAgentCostProviderConfigRequest,
): Promise<AgentCostProviderConfig> {
  const now = Math.floor(Date.now() / 1000)
  const existing = await db
    .select()
    .from(schema.agent_cost_provider_configs)
    .where(eq(schema.agent_cost_provider_configs.provider, provider))
    .limit(1)

  if (existing[0]) {
    await db
      .update(schema.agent_cost_provider_configs)
      .set({
        label: input.label,
        secret_ref: input.api_key,
        status: 'untested',
        last_tested_at: null,
        last_error: null,
        updated_at: now,
      })
      .where(eq(schema.agent_cost_provider_configs.id, existing[0].id))

    const updated = await db
      .select()
      .from(schema.agent_cost_provider_configs)
      .where(eq(schema.agent_cost_provider_configs.id, existing[0].id))
      .limit(1)
    return deserializeProviderConfig(updated[0])
  }

  const row = {
    id: `cost_provider_${randomUUID()}`,
    provider,
    label: input.label,
    secret_ref: input.api_key,
    status: 'untested',
    last_tested_at: null,
    last_error: null,
    created_at: now,
    updated_at: now,
  }
  await db.insert(schema.agent_cost_provider_configs).values(row)
  return deserializeProviderConfig(row)
}

export async function deleteAgentCostProviderConfig(db: DB, provider: CostProvider): Promise<void> {
  await db
    .delete(schema.agent_cost_provider_configs)
    .where(eq(schema.agent_cost_provider_configs.provider, provider))
}

export async function testAgentCostProviderConfig(db: DB, provider: CostProvider): Promise<AgentCostProviderTestResult> {
  const row = await getProviderConfigRaw(db, provider)
  if (!row) return { ok: false, provider, status: 'error', error: 'not_configured' }

  const result = provider === 'openai'
    ? await testOpenAICostsConnection(row.secret_ref)
    : { ok: false, provider, status: 'error' as const, error: 'unsupported_provider' }

  const now = Math.floor(Date.now() / 1000)
  await db
    .update(schema.agent_cost_provider_configs)
    .set({
      status: result.status,
      last_tested_at: now,
      last_error: result.ok ? null : result.error ?? 'connection_failed',
      updated_at: now,
    })
    .where(eq(schema.agent_cost_provider_configs.id, row.id))

  return result
}

export async function syncOpenAICosts(
  db: DB,
  input: OpenAIAgentCostSyncRequest,
): Promise<AgentCostSyncResult> {
  const row = await getProviderConfigRaw(db, 'openai')
  if (!row) {
    return { provider: 'openai', imported: 0, skipped: 0, unassigned: 0, status: 'failed', error: 'not_configured' }
  }

  await setSyncState(db, 'openai', 'running')

  try {
    const buckets = await fetchOpenAICostBuckets(row.secret_ref, input)
    let imported = 0
    let skipped = 0
    let unassigned = 0
    const now = Math.floor(Date.now() / 1000)

    for (const bucket of buckets) {
      for (const result of bucket.results) {
        const amount = formatAmount(result.amount.value)
        const idempotencyKey = [
          'openai',
          bucket.start_time,
          bucket.end_time,
          result.project_id ?? '',
          result.line_item ?? '',
          amount,
          result.amount.currency,
        ].join(':')
        const existing = await db
          .select({ id: schema.agent_cost_events.id })
          .from(schema.agent_cost_events)
          .where(eq(schema.agent_cost_events.idempotency_key, idempotencyKey))
          .limit(1)

        if (existing[0]) {
          skipped += 1
          if (!await hasAssignedProject(db, idempotencyKey)) unassigned += 1
          continue
        }

        const projectId = await resolveMappedProjectId(db, 'openai', {
          provider_project_id: result.project_id ?? null,
          api_key_id: null,
          line_item: result.line_item ?? null,
        })

        await db.insert(schema.agent_cost_events).values({
          id: `cost_${randomUUID()}`,
          provider: 'openai',
          source: 'official_api',
          project_id: projectId,
          provider_project_id: result.project_id ?? null,
          api_key_id: null,
          line_item: result.line_item ?? null,
          model: null,
          tool_label: 'openai',
          amount,
          currency: result.amount.currency.toUpperCase(),
          usage_start: bucket.start_time,
          usage_end: bucket.end_time,
          idempotency_key: idempotencyKey,
          raw_metadata: JSON.stringify({ bucket, result }),
          created_at: now,
          updated_at: now,
        })
        imported += 1
        if (!projectId) unassigned += 1
      }
    }

    await setSyncState(db, 'openai', 'success')
    return { provider: 'openai', imported, skipped, unassigned, status: 'success' }
  } catch (err) {
    const error = err instanceof Error ? err.message : 'sync_failed'
    await setSyncState(db, 'openai', 'failed', error)
    return { provider: 'openai', imported: 0, skipped: 0, unassigned: 0, status: 'failed', error }
  }
}

async function getProviderConfigRaw(db: DB, provider: CostProvider) {
  const rows = await db
    .select()
    .from(schema.agent_cost_provider_configs)
    .where(eq(schema.agent_cost_provider_configs.provider, provider))
    .limit(1)
  return rows[0] ?? null
}

async function testOpenAICostsConnection(apiKey: string): Promise<AgentCostProviderTestResult> {
  const startTime = Math.floor(Date.now() / 1000) - 7 * 24 * 60 * 60
  const url = new URL(OPENAI_COSTS_URL)
  url.searchParams.set('start_time', String(startTime))
  url.searchParams.set('limit', '1')

  try {
    const res = await fetch(url.toString(), {
      headers: {
        Authorization: `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
    })
    if (!res.ok) {
      return { ok: false, provider: 'openai', status: 'error', error: `openai_costs_${res.status}` }
    }

    const data = await res.json() as { data?: unknown }
    if (!Array.isArray(data.data)) {
      return { ok: false, provider: 'openai', status: 'error', error: 'invalid_openai_costs_response' }
    }
    return { ok: true, provider: 'openai', status: 'ok' }
  } catch (err) {
    return { ok: false, provider: 'openai', status: 'error', error: err instanceof Error ? err.message : 'network_error' }
  }
}

async function fetchOpenAICostBuckets(
  apiKey: string,
  input: OpenAIAgentCostSyncRequest,
): Promise<OpenAICostBucket[]> {
  const buckets: OpenAICostBucket[] = []
  let page: string | null = null

  do {
    const url = new URL(OPENAI_COSTS_URL)
    url.searchParams.set('start_time', String(input.start_time))
    if (input.end_time) url.searchParams.set('end_time', String(input.end_time))
    url.searchParams.set('limit', '180')
    url.searchParams.append('group_by', 'project_id')
    url.searchParams.append('group_by', 'line_item')
    if (page) url.searchParams.set('page', page)

    const res = await fetch(url.toString(), {
      headers: {
        Authorization: `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
    })
    if (!res.ok) throw new Error(`openai_costs_${res.status}`)

    const body = await res.json() as OpenAICostsResponse
    if (!Array.isArray(body.data)) throw new Error('invalid_openai_costs_response')
    buckets.push(...body.data)
    page = body.has_more ? body.next_page ?? null : null
  } while (page)

  return buckets
}

async function hasAssignedProject(db: DB, idempotencyKey: string): Promise<boolean> {
  const rows = await db
    .select({ project_id: schema.agent_cost_events.project_id })
    .from(schema.agent_cost_events)
    .where(eq(schema.agent_cost_events.idempotency_key, idempotencyKey))
    .limit(1)
  return Boolean(rows[0]?.project_id)
}

async function setSyncState(
  db: DB,
  provider: CostProvider,
  syncStatus: AgentCostSyncResult['status'],
  errorMessage: string | null = null,
): Promise<void> {
  const now = Math.floor(Date.now() / 1000)
  const existing = await db
    .select()
    .from(schema.agent_cost_sync_state)
    .where(eq(schema.agent_cost_sync_state.provider, provider))
    .limit(1)

  if (existing[0]) {
    await db
      .update(schema.agent_cost_sync_state)
      .set({
        last_synced_at: syncStatus === 'success' ? now : existing[0].last_synced_at,
        sync_status: syncStatus,
        error_message: errorMessage,
        updated_at: now,
      })
      .where(eq(schema.agent_cost_sync_state.id, existing[0].id))
    return
  }

  await db.insert(schema.agent_cost_sync_state).values({
    id: `cost_sync_${randomUUID()}`,
    provider,
    last_synced_at: syncStatus === 'success' ? now : null,
    sync_status: syncStatus,
    error_message: errorMessage,
    created_at: now,
    updated_at: now,
  })
}

export async function createManualAgentCostEvent(
  db: DB,
  input: CreateManualAgentCostEventRequest,
): Promise<AgentCostEvent> {
  const now = Math.floor(Date.now() / 1000)
  const provider = input.provider ?? 'manual'
  const projectId = input.project_id ?? await resolveMappedProjectId(db, provider, input)
  const row = {
    id: `cost_${randomUUID()}`,
    provider,
    source: 'manual',
    project_id: projectId,
    provider_project_id: input.provider_project_id ?? null,
    api_key_id: input.api_key_id ?? null,
    line_item: input.line_item ?? null,
    model: input.model ?? null,
    tool_label: input.tool_label ?? null,
    amount: input.amount,
    currency: input.currency.toUpperCase(),
    usage_start: input.usage_start,
    usage_end: input.usage_end,
    idempotency_key: `manual:${randomUUID()}`,
    raw_metadata: JSON.stringify(input.raw_metadata ?? {}),
    created_at: now,
    updated_at: now,
  }

  await db.insert(schema.agent_cost_events).values(row)
  return deserializeAgentCostEvent(row)
}

export async function listAgentCostEvents(
  db: DB,
  opts: { cursor?: number; limit?: number; assignment?: 'unassigned' } = {},
): Promise<AgentCostEventsPage> {
  const limit = Math.min(opts.limit ?? 50, 100)
  const conditions = []
  if (opts.cursor) conditions.push(lt(schema.agent_cost_events.usage_start, opts.cursor))
  if (opts.assignment === 'unassigned') conditions.push(isNull(schema.agent_cost_events.project_id))
  const rows = await db
    .select()
    .from(schema.agent_cost_events)
    .where(conditions.length > 0 ? and(...conditions) : undefined)
    .orderBy(desc(schema.agent_cost_events.usage_start), desc(schema.agent_cost_events.created_at))
    .limit(limit + 1)

  const hasMore = rows.length > limit
  const items = rows.slice(0, limit)

  return {
    items: items.map(deserializeAgentCostEvent),
    next_cursor: hasMore ? String(items[items.length - 1].usage_start) : null,
  }
}

export async function createAgentCostProjectMapping(
  db: DB,
  input: CreateAgentCostProjectMappingRequest,
) {
  const now = Math.floor(Date.now() / 1000)
  const row = {
    id: `cost_mapping_${randomUUID()}`,
    provider: input.provider,
    match_type: input.match_type,
    match_value: input.match_value,
    project_id: input.project_id,
    created_at: now,
    updated_at: now,
  }
  await db.insert(schema.agent_cost_project_mappings).values(row)
  return row
}

export async function assignAgentCostEventProject(
  db: DB,
  eventId: string,
  input: AssignAgentCostEventProjectRequest,
): Promise<AgentCostEvent | null> {
  const now = Math.floor(Date.now() / 1000)
  const updated = await db
    .update(schema.agent_cost_events)
    .set({ project_id: input.project_id, updated_at: now })
    .where(eq(schema.agent_cost_events.id, eventId))
    .returning()
  return updated[0] ? deserializeAgentCostEvent(updated[0]) : null
}

export async function summarizeAgentCostsForPeriod(
  db: DB,
  periodStart: number,
  periodEnd: number,
): Promise<AgentCostPeriodSummary> {
  const rows = await db
    .select()
    .from(schema.agent_cost_events)
    .where(and(
      gte(schema.agent_cost_events.usage_start, periodStart),
      lte(schema.agent_cost_events.usage_end, periodEnd),
    ))

  const currency = rows[0]?.currency ?? 'USD'
  let totalCents = 0
  let assignedCents = 0
  let unassignedCents = 0
  const projectCents = new Map<string, number>()

  for (const row of rows) {
    const cents = toCents(row.amount)
    totalCents += cents
    if (row.project_id) {
      assignedCents += cents
      projectCents.set(row.project_id, (projectCents.get(row.project_id) ?? 0) + cents)
    } else {
      unassignedCents += cents
    }
  }

  return {
    currency,
    total_amount: fromCents(totalCents),
    assigned_amount: fromCents(assignedCents),
    unassigned_amount: fromCents(unassignedCents),
    project_costs: [...projectCents.entries()].map(([project_id, amount]) => ({
      project_id,
      amount: fromCents(amount),
      currency,
    })),
  }
}

async function resolveMappedProjectId(
  db: DB,
  provider: string,
  keys: {
    provider_project_id?: string | null
    api_key_id?: string | null
    line_item?: string | null
  },
): Promise<string | null> {
  if (provider === 'manual') return null

  for (const matchType of MAPPING_PRECEDENCE) {
    const matchValue = keys[matchType]
    if (!matchValue) continue

    const rows = await db
      .select()
      .from(schema.agent_cost_project_mappings)
      .where(and(
        eq(schema.agent_cost_project_mappings.provider, provider),
        eq(schema.agent_cost_project_mappings.match_type, matchType),
        eq(schema.agent_cost_project_mappings.match_value, matchValue),
      ))
      .limit(2)

    if (rows.length === 1) return rows[0].project_id
    if (rows.length > 1) return null
  }

  return null
}

function deserializeAgentCostEvent(row: typeof schema.agent_cost_events.$inferSelect): AgentCostEvent {
  return {
    id: row.id,
    provider: row.provider as AgentCostEvent['provider'],
    source: row.source as AgentCostEvent['source'],
    project_id: row.project_id,
    provider_project_id: row.provider_project_id,
    api_key_id: row.api_key_id,
    line_item: row.line_item,
    model: row.model,
    tool_label: row.tool_label,
    amount: row.amount,
    currency: row.currency,
    usage_start: row.usage_start,
    usage_end: row.usage_end,
    raw_metadata: parseJsonColumn<Record<string, unknown>>(row.raw_metadata, {}),
    created_at: row.created_at,
    updated_at: row.updated_at,
  }
}

function deserializeProviderConfig(row: typeof schema.agent_cost_provider_configs.$inferSelect): AgentCostProviderConfig {
  return {
    id: row.id,
    provider: row.provider as CostProvider,
    label: row.label,
    api_key_masked: maskKey(row.secret_ref),
    status: row.status as AgentCostProviderConfig['status'],
    last_tested_at: row.last_tested_at,
    last_error: row.last_error,
    created_at: row.created_at,
    updated_at: row.updated_at,
  }
}

function maskKey(key: string): string {
  if (key.length <= 4) return '****'
  return `****${key.slice(-4)}`
}

function toCents(amount: string): number {
  return Math.round(Number(amount) * 100)
}

function fromCents(cents: number): string {
  return (cents / 100).toFixed(2)
}

function formatAmount(value: number): string {
  return value.toFixed(6).replace(/\.?0+$/, '')
}

interface OpenAICostsResponse {
  data?: OpenAICostBucket[]
  has_more?: boolean
  next_page?: string | null
}

interface OpenAICostBucket {
  start_time: number
  end_time: number
  results: OpenAICostResult[]
}

interface OpenAICostResult {
  amount: {
    value: number
    currency: string
  }
  line_item: string | null
  project_id: string | null
}
