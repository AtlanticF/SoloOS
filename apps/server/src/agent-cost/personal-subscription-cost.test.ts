import { describe, expect, it } from 'vitest'
import { createTestDb } from '../db/index'
import * as schema from '../db/schema'
import { allocatePersonalSubscriptionDailyCosts, calculatePersonalSubscriptionDailyCosts, summarizeAgentCostsForPeriod, syncLocalAgentActivityMetadata } from './agent-cost-service'

describe('calculatePersonalSubscriptionDailyCosts', () => {
  it('calculates daily average cost for active paid subscriptions by calendar month', async () => {
    const db = createTestDb()
    const mayFirst2026 = 1777593600

    await insertSubscription(db, {
      id: 'sub_codex_paid',
      provider: 'codex',
      billing_status: 'paid',
      monthly_amount: '20.00',
      effective_start: mayFirst2026,
      enabled: 1,
    })

    const costs = await calculatePersonalSubscriptionDailyCosts(db, mayFirst2026)

    expect(costs).toEqual([
      {
        subscription_id: 'sub_codex_paid',
        provider: 'codex',
        amount: '0.65',
        currency: 'USD',
        usage_start: mayFirst2026,
        usage_end: mayFirst2026 + 86399,
      },
    ])
  })

  it('treats a subscription created during the day as active for that day', async () => {
    const db = createTestDb()
    const mayFirst2026 = 1777593600

    await insertSubscription(db, {
      id: 'sub_codex_paid_midday',
      provider: 'codex',
      billing_status: 'paid',
      monthly_amount: '31.00',
      effective_start: mayFirst2026 + 12 * 60 * 60,
      enabled: 1,
    })

    await expect(calculatePersonalSubscriptionDailyCosts(db, mayFirst2026)).resolves.toMatchObject([
      {
        subscription_id: 'sub_codex_paid_midday',
        amount: '1.00',
      },
    ])
  })

  it('excludes free, unpaid, disabled, and inactive subscriptions', async () => {
    const db = createTestDb()
    const mayFirst2026 = 1777593600

    await insertSubscription(db, {
      id: 'sub_cursor_free',
      provider: 'cursor',
      billing_status: 'free',
      monthly_amount: '0.00',
      effective_start: mayFirst2026,
      enabled: 1,
    })
    await insertSubscription(db, {
      id: 'sub_claude_unpaid',
      provider: 'anthropic',
      billing_status: 'unpaid',
      monthly_amount: '20.00',
      effective_start: mayFirst2026,
      enabled: 1,
    })
    await insertSubscription(db, {
      id: 'sub_codex_disabled',
      provider: 'codex',
      billing_status: 'paid',
      monthly_amount: '20.00',
      effective_start: mayFirst2026,
      enabled: 0,
    })
    await insertSubscription(db, {
      id: 'sub_codex_expired',
      provider: 'codex',
      billing_status: 'paid',
      monthly_amount: '20.00',
      effective_start: mayFirst2026 - 86400 * 30,
      effective_end: mayFirst2026 - 1,
      enabled: 1,
    })

    await expect(calculatePersonalSubscriptionDailyCosts(db, mayFirst2026)).resolves.toEqual([])
  })
})

describe('allocatePersonalSubscriptionDailyCosts', () => {
  it('allocates daily subscription cost by project activity share and keeps unmatched activity unallocated', async () => {
    const db = createTestDb()
    const mayFirst2026 = 1777593600

    await db.insert(schema.projects).values({
      id: 'proj_soloos',
      name: 'SoloOS',
      status: 'active',
      match_rules: JSON.stringify({ paths: ['/Users/matt/AI/SoloOS'] }),
      is_auto: 0,
      first_event_at: mayFirst2026,
      last_event_at: mayFirst2026,
      created_at: mayFirst2026,
    })
    await insertSubscription(db, {
      id: 'sub_codex_paid',
      provider: 'codex',
      billing_status: 'paid',
      monthly_amount: '31.00',
      effective_start: mayFirst2026,
      enabled: 1,
    })
    await syncLocalAgentActivityMetadata(db, {
      provider: 'codex',
      events: [
        {
          occurred_at: mayFirst2026,
          project_path: '/Users/matt/AI/SoloOS',
          event_count: 3,
          raw_metadata: { session_id: 'matched' },
        },
        {
          occurred_at: mayFirst2026,
          project_path: '/tmp/unknown',
          event_count: 1,
          raw_metadata: { session_id: 'unmatched' },
        },
      ],
    })

    const first = await allocatePersonalSubscriptionDailyCosts(db, mayFirst2026)
    const second = await allocatePersonalSubscriptionDailyCosts(db, mayFirst2026)

    expect(first).toEqual({ imported: 2, skipped: 0, unallocated: 1 })
    expect(second).toEqual({ imported: 0, skipped: 2, unallocated: 1 })

    const rows = await db.select().from(schema.agent_cost_events)
    expect(rows.map((row) => ({
      provider: row.provider,
      source: row.source,
      project_id: row.project_id,
      amount: row.amount,
      line_item: row.line_item,
    }))).toEqual([
      {
        provider: 'codex',
        source: 'sdk_estimate',
        project_id: 'proj_soloos',
        amount: '0.75',
        line_item: 'personal-subscription-allocation',
      },
      {
        provider: 'codex',
        source: 'sdk_estimate',
        project_id: null,
        amount: '0.25',
        line_item: 'personal-subscription-unallocated',
      },
    ])

    await db.insert(schema.agent_cost_events).values({
      id: 'official_cursor_cost',
      provider: 'cursor',
      source: 'official_api',
      project_id: 'proj_soloos',
      provider_project_id: null,
      api_key_id: null,
      line_item: 'cursor-spend',
      model: null,
      tool_label: 'cursor',
      amount: '2.00',
      currency: 'USD',
      usage_start: mayFirst2026,
      usage_end: mayFirst2026 + 86399,
      idempotency_key: 'official_cursor_cost',
      raw_metadata: '{}',
      created_at: mayFirst2026,
      updated_at: mayFirst2026,
    })

    await expect(summarizeAgentCostsForPeriod(db, mayFirst2026, mayFirst2026 + 86399)).resolves.toMatchObject({
      total_amount: '3.00',
      official_api_amount: '2.00',
      personal_subscription_allocated_amount: '0.75',
      personal_subscription_unallocated_amount: '0.25',
    })
  })
})

async function insertSubscription(
  db: ReturnType<typeof createTestDb>,
  input: {
    id: string
    provider: string
    billing_status: string
    monthly_amount: string
    effective_start: number
    effective_end?: number | null
    enabled: number
  },
) {
  await db.insert(schema.agent_cost_personal_subscriptions).values({
    id: input.id,
    provider: input.provider,
    account_type: `${input.provider} account`,
    billing_status: input.billing_status,
    monthly_amount: input.monthly_amount,
    currency: 'USD',
    effective_start: input.effective_start,
    effective_end: input.effective_end ?? null,
    source: 'user_configured',
    confidence: 'user_confirmed',
    enabled: input.enabled,
    created_at: input.effective_start,
    updated_at: input.effective_start,
  })
}
