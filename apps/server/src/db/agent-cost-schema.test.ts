import { describe, expect, it } from 'vitest'
import { eq } from 'drizzle-orm'
import { createTestDb } from './index'
import * as schema from './schema'
import {
  AGENT_COST_PROVIDERS,
  AGENT_COST_PERSONAL_PROVIDERS,
  AGENT_COST_SOURCES,
  type AgentCostEvent,
  type AgentCostPersonalSubscription,
  type AgentCostProvider,
  type AgentCostPersonalProvider,
  type AgentCostSource,
  type OfficialAgentCostProvider,
} from '@soloos/shared'

describe('Agent Cost Ledger schema', () => {
  it('exports shared provider and source types for all MVP cost sources', () => {
    expect(AGENT_COST_PROVIDERS).toEqual(['openai', 'anthropic', 'cursor', 'codex', 'manual'])
    expect(AGENT_COST_PERSONAL_PROVIDERS).toEqual(['anthropic', 'cursor', 'codex'])
    expect(AGENT_COST_SOURCES).toEqual(['official_api', 'official_export', 'sdk_estimate', 'manual'])

    const provider: AgentCostProvider = 'openai'
    const officialProvider: OfficialAgentCostProvider = 'cursor'
    const personalProvider: AgentCostPersonalProvider = 'codex'
    const source: AgentCostSource = 'official_api'
    const manual: AgentCostSource = 'manual'

    expect(provider).toBe('openai')
    expect(officialProvider).toBe('cursor')
    expect(personalProvider).toBe('codex')
    expect(source).toBe('official_api')
    expect(manual).toBe('manual')
  })

  it('stores official, estimated, and manual cost events with nullable project attribution', async () => {
    const db = createTestDb()
    const now = Math.floor(Date.now() / 1000)

    await db.insert(schema.agent_cost_events).values([
      {
        id: 'cost_openai_official',
        provider: 'openai',
        source: 'official_api',
        project_id: null,
        provider_project_id: 'proj_openai_123',
        api_key_id: 'key_123',
        line_item: 'gpt-5-mini',
        model: 'gpt-5-mini',
        tool_label: null,
        amount: '12.34',
        currency: 'usd',
        usage_start: now - 86400,
        usage_end: now,
        idempotency_key: 'openai:official:1',
        raw_metadata: JSON.stringify({ bucket: 'daily' }),
        created_at: now,
        updated_at: now,
      },
      {
        id: 'cost_claude_estimate',
        provider: 'anthropic',
        source: 'sdk_estimate',
        project_id: null,
        provider_project_id: null,
        api_key_id: null,
        line_item: null,
        model: 'claude-sonnet',
        tool_label: 'claude-code',
        amount: '3.21',
        currency: 'usd',
        usage_start: now - 3600,
        usage_end: now,
        idempotency_key: 'anthropic:estimate:1',
        raw_metadata: '{}',
        created_at: now,
        updated_at: now,
      },
      {
        id: 'cost_manual_subscription',
        provider: 'manual',
        source: 'manual',
        project_id: null,
        provider_project_id: null,
        api_key_id: null,
        line_item: 'codex-subscription-allocation',
        model: null,
        tool_label: 'codex',
        amount: '20.00',
        currency: 'usd',
        usage_start: now - 604800,
        usage_end: now,
        idempotency_key: 'manual:subscription:1',
        raw_metadata: '{}',
        created_at: now,
        updated_at: now,
      },
    ])

    const rows = await db.select().from(schema.agent_cost_events)
    expect(rows).toHaveLength(3)
    expect(rows.map((row) => row.source).sort()).toEqual(['manual', 'official_api', 'sdk_estimate'])
    expect(rows.every((row) => row.project_id === null)).toBe(true)

    const dto: AgentCostEvent = {
      id: rows[0].id,
      provider: rows[0].provider as AgentCostProvider,
      source: rows[0].source as AgentCostSource,
      project_id: rows[0].project_id,
      provider_project_id: rows[0].provider_project_id,
      api_key_id: rows[0].api_key_id,
      line_item: rows[0].line_item,
      model: rows[0].model,
      tool_label: rows[0].tool_label,
      amount: rows[0].amount,
      currency: rows[0].currency,
      usage_start: rows[0].usage_start,
      usage_end: rows[0].usage_end,
      raw_metadata: {},
      created_at: rows[0].created_at,
      updated_at: rows[0].updated_at,
    }
    expect(dto.amount).toBe(rows[0].amount)
  })

  it('stores provider configs, project mappings, and sync status metadata', async () => {
    const db = createTestDb()
    const now = Math.floor(Date.now() / 1000)

    await db.insert(schema.projects).values({
      id: 'proj_agent_cost',
      name: 'Agent Cost MVP',
      status: 'active',
      match_rules: '{}',
      is_auto: 0,
      first_event_at: null,
      last_event_at: null,
      created_at: now,
    })

    await db.insert(schema.agent_cost_provider_configs).values({
      id: 'provider_openai',
      provider: 'openai',
      label: 'OpenAI org costs',
      secret_ref: 'secret_ref_openai',
      status: 'untested',
      last_tested_at: null,
      last_error: null,
      created_at: now,
      updated_at: now,
    })

    await db.insert(schema.agent_cost_project_mappings).values({
      id: 'map_openai_project',
      provider: 'openai',
      match_type: 'provider_project_id',
      match_value: 'proj_openai_123',
      project_id: 'proj_agent_cost',
      created_at: now,
      updated_at: now,
    })

    await db.insert(schema.agent_cost_sync_state).values({
      id: 'sync_openai',
      provider: 'openai',
      last_synced_at: now,
      sync_status: 'success',
      error_message: null,
      created_at: now,
      updated_at: now,
    })

    const [mapping] = await db
      .select()
      .from(schema.agent_cost_project_mappings)
      .where(eq(schema.agent_cost_project_mappings.match_value, 'proj_openai_123'))

    const [syncState] = await db.select().from(schema.agent_cost_sync_state)

    expect(mapping.project_id).toBe('proj_agent_cost')
    expect(syncState.sync_status).toBe('success')
  })

  it('stores personal subscription metadata per provider', async () => {
    const db = createTestDb()
    const now = Math.floor(Date.now() / 1000)

    await db.insert(schema.agent_cost_personal_subscriptions).values([
      {
        id: 'personal_claude_pro',
        provider: 'anthropic',
        account_type: 'claude-pro',
        billing_status: 'paid',
        monthly_amount: '20.00',
        currency: 'usd',
        effective_start: now,
        effective_end: null,
        source: 'user_configured',
        confidence: 'user_confirmed',
        enabled: 1,
        created_at: now,
        updated_at: now,
      },
      {
        id: 'personal_cursor_free',
        provider: 'cursor',
        account_type: 'cursor-free',
        billing_status: 'free',
        monthly_amount: '0.00',
        currency: 'usd',
        effective_start: now,
        effective_end: null,
        source: 'user_configured',
        confidence: 'user_confirmed',
        enabled: 1,
        created_at: now,
        updated_at: now,
      },
    ])

    const rows = await db.select().from(schema.agent_cost_personal_subscriptions)
    expect(rows).toHaveLength(2)
    expect(rows.map((row) => row.provider).sort()).toEqual(['anthropic', 'cursor'])
    expect(rows.map((row) => row.billing_status).sort()).toEqual(['free', 'paid'])

    const dto: AgentCostPersonalSubscription = {
      id: rows[0].id,
      provider: rows[0].provider as AgentCostPersonalProvider,
      account_type: rows[0].account_type,
      billing_status: rows[0].billing_status as AgentCostPersonalSubscription['billing_status'],
      monthly_amount: rows[0].monthly_amount,
      currency: rows[0].currency,
      effective_start: rows[0].effective_start,
      effective_end: rows[0].effective_end,
      source: rows[0].source as AgentCostPersonalSubscription['source'],
      confidence: rows[0].confidence as AgentCostPersonalSubscription['confidence'],
      enabled: Boolean(rows[0].enabled),
      created_at: rows[0].created_at,
      updated_at: rows[0].updated_at,
    }
    expect(dto.confidence).toBe('user_confirmed')
  })
})
