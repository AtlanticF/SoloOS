import { Hono } from 'hono'
import {
  AGENT_COST_PROVIDERS,
  type AgentCostProvider,
  type AgentCostMappingType,
  type AssignAgentCostEventProjectRequest,
  type CreateAgentCostProjectMappingRequest,
  type CreateManualAgentCostEventRequest,
  type OfficialAgentCostSyncRequest,
  type UpsertAgentCostProviderConfigRequest,
} from '@soloos/shared'
import type { DB } from '../db/index'
import {
  assignAgentCostEventProject,
  createAgentCostProjectMapping,
  createManualAgentCostEvent,
  deleteAgentCostProviderConfig,
  listAgentCostEvents,
  listAgentCostProviderConfigs,
  syncOfficialProviderCosts,
  testAgentCostProviderConfig,
  upsertAgentCostProviderConfig,
} from '../agent-cost/agent-cost-service'

const DECIMAL_AMOUNT = /^\d+(\.\d{1,6})?$/
const COST_MAPPING_TYPES: AgentCostMappingType[] = ['provider_project_id', 'api_key_id', 'line_item']

export function agentCostRouter(db: DB) {
  const app = new Hono()

  app.get('/providers', async (c) => {
    const providers = await listAgentCostProviderConfigs(db)
    return c.json(providers)
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

function parseOfficialProvider(provider: string): Exclude<AgentCostProvider, 'manual'> | null {
  return isNonManualProvider(provider) ? provider : null
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

function isNonManualProvider(value: unknown): value is Exclude<AgentCostProvider, 'manual'> {
  return isAgentCostProvider(value) && value !== 'manual'
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
