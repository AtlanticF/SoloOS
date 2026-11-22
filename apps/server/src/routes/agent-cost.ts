import { Hono } from 'hono'
import {
  AGENT_COST_PROVIDERS,
  OFFICIAL_AGENT_COST_PROVIDERS,
  type AgentCostProvider,
  type AgentCostMappingType,
  AGENT_COST_PERSONAL_PROVIDERS,
  type AssignAgentCostEventProjectRequest,
  type CreateAgentCostProjectMappingRequest,
  type CreateManualAgentCostEventRequest,
  type AgentCostPersonalProvider,
  type OfficialAgentCostProvider,
  type OfficialAgentCostSyncRequest,
  type SyncLocalAgentActivityRequest,
  type UpsertAgentCostPersonalSubscriptionRequest,
  type UpsertAgentCostProviderConfigRequest,
} from '@soloos/shared'
import type { DB } from '../db/index'
import {
  assignAgentCostEventProject,
  allocatePersonalSubscriptionDailyCosts,
  createAgentCostPersonalSubscription,
  createAgentCostProjectMapping,
  createManualAgentCostEvent,
  deleteAgentCostPersonalSubscription,
  deleteAgentCostProviderConfig,
  disableAgentCostPersonalSubscription,
  listAgentCostEvents,
  listAgentCostPersonalSubscriptions,
  localActivityMetadataHasContent,
  syncLocalAgentActivityMetadata,
  listAgentCostProviderConfigs,
  syncOfficialProviderCosts,
  testAgentCostProviderConfig,
  updateAgentCostPersonalSubscription,
  upsertAgentCostProviderConfig,
} from '../agent-cost/agent-cost-service'
import { detectLocalAgentCostConnectors } from '../agent-cost/local-connector-detection'

const DECIMAL_AMOUNT = /^\d+(\.\d{1,6})?$/
const COST_MAPPING_TYPES: AgentCostMappingType[] = ['provider_project_id', 'api_key_id', 'line_item']

export function agentCostRouter(db: DB) {
  const app = new Hono()

  app.get('/providers', async (c) => {
    const providers = await listAgentCostProviderConfigs(db)
    return c.json(providers)
  })

  app.get('/personal-subscriptions', async (c) => {
    const subscriptions = await listAgentCostPersonalSubscriptions(db)
    return c.json(subscriptions)
  })

  app.get('/personal-connectors', async (c) => {
    const connectors = await detectLocalAgentCostConnectors()
    return c.json(connectors)
  })

  app.post('/personal-subscriptions', async (c) => {
    let body: unknown
    try {
      body = await c.req.json()
    } catch {
      return c.json({ error: 'invalid JSON' }, 400)
    }

    const input = parsePersonalSubscription(body)
    if ('error' in input) return c.json({ error: input.error }, 400)

    const subscription = await createAgentCostPersonalSubscription(db, input.value)
    return c.json(subscription, 201)
  })

  app.post('/personal-activity/sync', async (c) => {
    let body: unknown
    try {
      body = await c.req.json()
    } catch {
      return c.json({ error: 'invalid JSON' }, 400)
    }

    const input = parseLocalActivitySync(body)
    if ('error' in input) return c.json({ error: input.error }, 400)

    const result = await syncLocalAgentActivityMetadata(db, input.value)
    return c.json(result)
  })

  app.post('/personal-activity/allocate', async (c) => {
    let body: unknown
    try {
      body = await c.req.json()
    } catch {
      return c.json({ error: 'invalid JSON' }, 400)
    }

    const input = parsePersonalActivityAllocation(body)
    if ('error' in input) return c.json({ error: input.error }, 400)

    const result = await allocatePersonalSubscriptionDailyCosts(db, input.value.day_start)
    return c.json(result)
  })

  app.put('/personal-subscriptions/:id', async (c) => {
    const { id } = c.req.param()
    let body: unknown
    try {
      body = await c.req.json()
    } catch {
      return c.json({ error: 'invalid JSON' }, 400)
    }

    const input = parsePersonalSubscription(body)
    if ('error' in input) return c.json({ error: input.error }, 400)

    const subscription = await updateAgentCostPersonalSubscription(db, id, input.value)
    if (!subscription) return c.json({ error: 'subscription not found' }, 404)
    return c.json(subscription)
  })

  app.post('/personal-subscriptions/:id/disable', async (c) => {
    const { id } = c.req.param()
    const subscription = await disableAgentCostPersonalSubscription(db, id)
    if (!subscription) return c.json({ error: 'subscription not found' }, 404)
    return c.json(subscription)
  })

  app.delete('/personal-subscriptions/:id', async (c) => {
    const { id } = c.req.param()
    await deleteAgentCostPersonalSubscription(db, id)
    return c.json({ ok: true })
  })

  app.post('/mappings', async (c) => {
    let body: unknown
    try {
      body = await c.req.json()
    } catch {
      return c.json({ error: 'invalid JSON' }, 400)
    }

    const input = parseMappingRequest(body)
    if ('error' in input) return c.json({ error: input.error }, 400)

    const mapping = await createAgentCostProjectMapping(db, input.value)
    return c.json(mapping, 201)
  })

  app.put('/providers/:provider', async (c) => {
    const provider = parseOfficialProvider(c.req.param('provider'))
    if (!provider) return c.json({ error: 'provider is invalid' }, 400)

    let body: unknown
    try {
      body = await c.req.json()
    } catch {
      return c.json({ error: 'invalid JSON' }, 400)
    }

    const input = parseProviderConfig(body)
    if ('error' in input) return c.json({ error: input.error }, 400)

    const config = await upsertAgentCostProviderConfig(db, provider, input.value)
    return c.json(config)
  })

  app.delete('/providers/:provider', async (c) => {
    const provider = parseOfficialProvider(c.req.param('provider'))
    if (!provider) return c.json({ error: 'provider is invalid' }, 400)

    await deleteAgentCostProviderConfig(db, provider)
    return c.json({ ok: true })
  })

  app.post('/providers/:provider/test', async (c) => {
    const provider = parseOfficialProvider(c.req.param('provider'))
    if (!provider) return c.json({ error: 'provider is invalid' }, 400)

    const result = await testAgentCostProviderConfig(db, provider)
    return c.json(result, result.ok ? 200 : 400)
  })

  app.post('/providers/:provider/sync', async (c) => {
    const provider = parseOfficialProvider(c.req.param('provider'))
    if (!provider) return c.json({ error: 'provider is invalid' }, 400)

    let body: unknown
    try {
      body = await c.req.json()
    } catch {
      return c.json({ error: 'invalid JSON' }, 400)
    }

    const input = parseOpenAISyncRequest(body)
    if ('error' in input) return c.json({ error: input.error }, 400)

    const result = await syncOfficialProviderCosts(db, provider, input.value)
    return c.json(result, result.status === 'success' ? 200 : 400)
  })

  app.get('/events', async (c) => {
    const cursor = c.req.query('cursor')
    const limit = c.req.query('limit')
    const assignment = c.req.query('assignment')
    let cursorNumber: number | undefined
    let limitNumber: number | undefined

    if (cursor) {
      cursorNumber = Number(cursor)
      if (!Number.isInteger(cursorNumber) || cursorNumber <= 0) {
        return c.json({ error: 'cursor must be a unix timestamp' }, 400)
      }
    }
    if (limit) {
      limitNumber = Number(limit)
      if (!Number.isInteger(limitNumber) || limitNumber <= 0) {
        return c.json({ error: 'limit must be a positive integer' }, 400)
      }
    }
    if (assignment !== undefined && assignment !== 'unassigned') {
      return c.json({ error: 'assignment must be unassigned' }, 400)
    }

    const page = await listAgentCostEvents(db, {
      cursor: cursorNumber,
      limit: limitNumber,
      assignment: assignment === 'unassigned' ? 'unassigned' : undefined,
    })
    return c.json(page)
  })

  app.put('/events/:id/project', async (c) => {
    const { id } = c.req.param()
    let body: unknown
    try {
      body = await c.req.json()
    } catch {
      return c.json({ error: 'invalid JSON' }, 400)
    }

    const input = parseAssignProjectRequest(body)
    if ('error' in input) return c.json({ error: input.error }, 400)

    const event = await assignAgentCostEventProject(db, id, input.value)
    if (!event) return c.json({ error: 'event not found' }, 404)
    return c.json(event)
  })

  app.post('/events', async (c) => {
    let body: unknown
    try {
      body = await c.req.json()
    } catch {
      return c.json({ error: 'invalid JSON' }, 400)
    }

    const input = parseManualCostEvent(body)
    if ('error' in input) return c.json({ error: input.error }, 400)

    const event = await createManualAgentCostEvent(db, input.value)
    return c.json(event, 201)
  })

  return app
}

function parseMappingRequest(body: unknown): { value: CreateAgentCostProjectMappingRequest } | { error: string } {
  if (!isRecord(body)) return { error: 'body must be an object' }
  if (!isNonManualProvider(body.provider)) return { error: 'provider is invalid' }
  if (!isCostMappingType(body.match_type)) return { error: 'match_type is invalid' }
  if (typeof body.match_value !== 'string' || !body.match_value.trim()) {
    return { error: 'match_value is required' }
  }
  if (typeof body.project_id !== 'string' || !body.project_id.trim()) {
    return { error: 'project_id is required' }
  }
  return {
    value: {
      provider: body.provider,
      match_type: body.match_type,
      match_value: body.match_value.trim(),
      project_id: body.project_id.trim(),
    },
  }
}

function parseOfficialProvider(provider: string): OfficialAgentCostProvider | null {
  return isOfficialAgentCostProvider(provider) ? provider : null
}

function parseAssignProjectRequest(body: unknown): { value: AssignAgentCostEventProjectRequest } | { error: string } {
  if (!isRecord(body)) return { error: 'body must be an object' }
  if (typeof body.project_id !== 'string' || !body.project_id.trim()) {
    return { error: 'project_id is required' }
  }
  return { value: { project_id: body.project_id.trim() } }
}

function parseProviderConfig(body: unknown): { value: UpsertAgentCostProviderConfigRequest } | { error: string } {
  if (!isRecord(body)) return { error: 'body must be an object' }
  if (typeof body.label !== 'string' || !body.label.trim()) {
    return { error: 'label is required' }
  }
  if (typeof body.api_key !== 'string' || !body.api_key.trim()) {
    return { error: 'api_key is required' }
  }
  return {
    value: {
      label: body.label.trim(),
      api_key: body.api_key.trim(),
    },
  }
}

function parsePersonalSubscription(body: unknown): { value: UpsertAgentCostPersonalSubscriptionRequest } | { error: string } {
  if (!isRecord(body)) return { error: 'body must be an object' }
  if (!isPersonalAgentCostProvider(body.provider)) return { error: 'provider is invalid' }
  if (typeof body.account_type !== 'string' || !body.account_type.trim()) {
    return { error: 'account_type is required' }
  }
  if (body.billing_status !== 'free' && body.billing_status !== 'paid' && body.billing_status !== 'unpaid') {
    return { error: 'billing_status is invalid' }
  }

  const monthlyAmount = typeof body.monthly_amount === 'number' ? String(body.monthly_amount) : body.monthly_amount
  if (typeof monthlyAmount !== 'string' || !DECIMAL_AMOUNT.test(monthlyAmount)) {
    return { error: 'monthly_amount must be a decimal string' }
  }
  if (body.billing_status === 'free' && Number(monthlyAmount) !== 0) {
    return { error: 'free accounts must have zero monthly_amount' }
  }
  if (body.billing_status !== 'free' && Number(monthlyAmount) <= 0) {
    return { error: 'paid accounts must have positive monthly_amount' }
  }

  const currency = body.currency
  if (typeof currency !== 'string' || !/^[a-zA-Z]{3}$/.test(currency)) {
    return { error: 'currency must be a three-letter code' }
  }
  if (!isPositiveUnixTimestamp(body.effective_start)) {
    return { error: 'effective_start must be a unix timestamp' }
  }
  if (body.effective_end !== undefined && body.effective_end !== null && !isPositiveUnixTimestamp(body.effective_end)) {
    return { error: 'effective_end must be a unix timestamp' }
  }
  if (typeof body.effective_end === 'number' && body.effective_end <= body.effective_start) {
    return { error: 'effective_end must be greater than effective_start' }
  }

  return {
    value: {
      provider: body.provider,
      account_type: body.account_type.trim(),
      billing_status: body.billing_status,
      monthly_amount: Number(monthlyAmount).toFixed(2),
      currency: currency.toUpperCase(),
      effective_start: body.effective_start,
      effective_end: typeof body.effective_end === 'number' ? body.effective_end : null,
    },
  }
}

function parseLocalActivitySync(body: unknown): { value: SyncLocalAgentActivityRequest } | { error: string } {
  if (!isRecord(body)) return { error: 'body must be an object' }
  if (!isPersonalAgentCostProvider(body.provider)) return { error: 'provider is invalid' }
  if (!Array.isArray(body.events) || body.events.length === 0) return { error: 'events is required' }

  const events: SyncLocalAgentActivityRequest['events'] = []
  for (const event of body.events) {
    if (!isRecord(event)) return { error: 'event must be an object' }
    const occurredAt = event.occurred_at
    const projectPath = event.project_path
    const eventCount = event.event_count
    const inputTokens = event.input_tokens
    const outputTokens = event.output_tokens

    if (!isPositiveUnixTimestamp(occurredAt)) {
      return { error: 'occurred_at must be a unix timestamp' }
    }
    if (typeof projectPath !== 'string' || !projectPath.trim()) {
      return { error: 'project_path is required' }
    }
    if (typeof eventCount !== 'number' || !Number.isInteger(eventCount) || eventCount <= 0) {
      return { error: 'event_count must be a positive integer' }
    }
    if (inputTokens !== undefined && inputTokens !== null && (typeof inputTokens !== 'number' || !Number.isInteger(inputTokens) || inputTokens < 0)) {
      return { error: 'input_tokens must be a non-negative integer' }
    }
    if (outputTokens !== undefined && outputTokens !== null && (typeof outputTokens !== 'number' || !Number.isInteger(outputTokens) || outputTokens < 0)) {
      return { error: 'output_tokens must be a non-negative integer' }
    }
    if (event.raw_metadata !== undefined && !isRecord(event.raw_metadata)) {
      return { error: 'raw_metadata must be an object' }
    }
    if (localActivityMetadataHasContent(event.raw_metadata ?? {})) {
      return { error: 'local activity metadata must not include prompt or response content' }
    }

    events.push({
      occurred_at: occurredAt,
      project_path: projectPath.trim(),
      event_count: eventCount,
      input_tokens: typeof inputTokens === 'number' ? inputTokens : null,
      output_tokens: typeof outputTokens === 'number' ? outputTokens : null,
      raw_metadata: event.raw_metadata ?? {},
    })
  }

  return { value: { provider: body.provider, events } }
}

function parsePersonalActivityAllocation(body: unknown): { value: { day_start: number } } | { error: string } {
  if (!isRecord(body)) return { error: 'body must be an object' }
  if (!isPositiveUnixTimestamp(body.day_start)) {
    return { error: 'day_start must be a unix timestamp' }
  }
  return { value: { day_start: body.day_start } }
}

function parseOpenAISyncRequest(body: unknown): { value: OfficialAgentCostSyncRequest } | { error: string } {
  if (!isRecord(body)) return { error: 'body must be an object' }
  if (!isPositiveUnixTimestamp(body.start_time)) {
    return { error: 'start_time must be a unix timestamp' }
  }
  if (body.end_time !== undefined && !isPositiveUnixTimestamp(body.end_time)) {
    return { error: 'end_time must be a unix timestamp' }
  }
  if (typeof body.end_time === 'number' && body.end_time <= body.start_time) {
    return { error: 'end_time must be greater than start_time' }
  }
  return {
    value: {
      start_time: body.start_time,
      end_time: typeof body.end_time === 'number' ? body.end_time : undefined,
    },
  }
}

function parseManualCostEvent(body: unknown): { value: CreateManualAgentCostEventRequest } | { error: string } {
  if (!isRecord(body)) return { error: 'body must be an object' }

  const provider = body.provider ?? 'manual'
  if (!isAgentCostProvider(provider)) return { error: 'provider is invalid' }

  const amount = typeof body.amount === 'number' ? String(body.amount) : body.amount
  if (typeof amount !== 'string' || !DECIMAL_AMOUNT.test(amount) || Number(amount) <= 0) {
    return { error: 'amount must be a positive decimal string' }
  }

  const currency = body.currency
  if (typeof currency !== 'string' || !/^[a-zA-Z]{3}$/.test(currency)) {
    return { error: 'currency must be a three-letter code' }
  }

  const usageStart = body.usage_start
  const usageEnd = body.usage_end
  if (!isPositiveUnixTimestamp(usageStart)) {
    return { error: 'usage_start must be a unix timestamp' }
  }
  if (!isPositiveUnixTimestamp(usageEnd)) {
    return { error: 'usage_end must be a unix timestamp' }
  }
  if (usageEnd < usageStart) {
    return { error: 'usage_end must be greater than or equal to usage_start' }
  }

  if (body.raw_metadata !== undefined && !isRecord(body.raw_metadata)) {
    return { error: 'raw_metadata must be an object' }
  }

  return {
    value: {
      provider,
      project_id: nullableString(body.project_id),
      provider_project_id: nullableString(body.provider_project_id),
      api_key_id: nullableString(body.api_key_id),
      line_item: nullableString(body.line_item),
      model: nullableString(body.model),
      tool_label: nullableString(body.tool_label),
      amount,
      currency: currency.toUpperCase(),
      usage_start: usageStart,
      usage_end: usageEnd,
      raw_metadata: body.raw_metadata,
    },
  }
}

function isAgentCostProvider(value: unknown): value is AgentCostProvider {
  return typeof value === 'string' && AGENT_COST_PROVIDERS.includes(value as AgentCostProvider)
}

function isOfficialAgentCostProvider(value: unknown): value is OfficialAgentCostProvider {
  return typeof value === 'string' && OFFICIAL_AGENT_COST_PROVIDERS.includes(value as OfficialAgentCostProvider)
}

function isPersonalAgentCostProvider(value: unknown): value is AgentCostPersonalProvider {
  return typeof value === 'string' && AGENT_COST_PERSONAL_PROVIDERS.includes(value as AgentCostPersonalProvider)
}

function isNonManualProvider(value: unknown): value is OfficialAgentCostProvider {
  return isOfficialAgentCostProvider(value)
}

function isCostMappingType(value: unknown): value is AgentCostMappingType {
  return typeof value === 'string' && COST_MAPPING_TYPES.includes(value as AgentCostMappingType)
}

function isPositiveUnixTimestamp(value: unknown): value is number {
  return typeof value === 'number' && Number.isInteger(value) && value > 0
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

function nullableString(value: unknown): string | null {
  return typeof value === 'string' && value.trim() ? value.trim() : null
}
