import { describe, expect, it } from 'vitest'
import { createTestDb } from '../db/index'
import * as schema from '../db/schema'
import { listProjectEconomics } from './output-service'

describe('listProjectEconomics', () => {
  it('computes project margin from revenue, output cost, and agent cost', async () => {
    const db = createTestDb()
    const now = 1772380800
    await db.insert(schema.projects).values({
      id: 'proj_economics',
      name: 'Economics Project',
      status: 'active',
      match_rules: '{}',
      is_auto: 0,
      first_event_at: now,
      last_event_at: now,
      created_at: now,
    })
    await db.insert(schema.entries).values({
      id: 'entry_economics',
      content: 'shipped revenue feature',
      source: 'cli',
      status: 'processed',
      quick_tags: '[]',
      created_at: now,
    })
    await db.insert(schema.events).values({
      id: 'event_economics',
      entry_id: 'entry_economics',
      title: 'Revenue feature',
      pillar: 'OUTPUT',
      project_id: 'proj_economics',
      impact_score: 5,
      classifier: 'rule',
      metadata: '{}',
      occurred_at: now,
      created_at: now,
    })
    await db.insert(schema.output_metadata).values({
      id: 'out_economics',
      event_id: 'event_economics',
      repo_id: 123,
      repo_name: 'soloos',
      commit_sha: 'abc123',
      commit_message: 'ship revenue feature',
      author: 'matt',
      committed_at: now,
      state: 'VALUATED',
      project_id: 'proj_economics',
      project_name_snapshot: 'Economics Project',
      additions: 10,
      deletions: 5,
      files_changed: 2,
      allocated_cost: '10.00',
      realized_revenue: '25.00',
      sync_version: 1,
      created_at: now,
      updated_at: now,
    })
    await db.insert(schema.agent_cost_events).values({
      id: 'cost_economics',
      provider: 'manual',
      source: 'manual',
      project_id: 'proj_economics',
      provider_project_id: null,
      api_key_id: null,
      line_item: 'weekly allocation',
      model: null,
      tool_label: 'codex',
      amount: '7.50',
      currency: 'USD',
      usage_start: now,
      usage_end: now + 3600,
      idempotency_key: 'manual:economics',
      raw_metadata: '{}',
      created_at: now,
      updated_at: now,
    })

    const rows = await listProjectEconomics(db)

    expect(rows).toEqual([
      {
        project_id: 'proj_economics',
        project_name: 'Economics Project',
        realized_revenue: '25.00',
        output_allocated_cost: '10.00',
        agent_cost: '7.50',
        margin: '7.50',
      },
    ])
  })
})
