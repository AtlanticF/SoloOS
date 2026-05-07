import { describe, it, expect, beforeEach } from 'vitest'
import { createApp } from '../index'
import { createTestDb } from '../db/index'
import type { DB } from '../db/index'
import * as schema from '../db/schema'
import { eq } from 'drizzle-orm'

// ── Helpers ────────────────────────────────────────────────────────────────────

async function seedProject(db: DB): Promise<string> {
  const id = `proj_test_${Math.random().toString(36).slice(2)}`
  const now = Math.floor(Date.now() / 1000)
  await db.insert(schema.projects).values({
    id,
    name: 'Test Project',
    status: 'active',
    match_rules: '{}',
    is_auto: 0,
    created_at: now,
  })
  return id
}

async function seedEntry(db: DB): Promise<string> {
  const id = `entry_${Math.random().toString(36).slice(2)}`
  const now = Math.floor(Date.now() / 1000)
  await db.insert(schema.entries).values({
    id,
    content: 'test entry',
    source: 'cli',
    status: 'processed',
    quick_tags: '[]',
    created_at: now,
  })
  return id
}

async function seedInsight(db: DB, entryId: string, status = 'ACTIVE'): Promise<string> {
  const id = `insight_${Math.random().toString(36).slice(2)}`
  const now = Math.floor(Date.now() / 1000)
  await db.insert(schema.insights).values({
    id,
    entry_id: entryId,
    event_id: null,
    type: 'STRATEGY',
    fact: 'test fact',
    synthesis: 'test synthesis',
    vector: 'test vector',
    value_score: 7,
    shelf_life: 'LONG',
    certainty: 0.9,
    status,
    project_id: null,
    cluster_id: null,
    created_at: now,
    updated_at: now,
  })
  return id
}

async function seedInputEvent(db: DB, entryId: string): Promise<string> {
  const id = `evt_in_${Math.random().toString(36).slice(2)}`
  const now = Math.floor(Date.now() / 1000)
  await db.insert(schema.events).values({
    id,
    entry_id: entryId,
    pillar: 'INPUT',
    project_id: null,
    impact_score: 2,
    classifier: 'rule',
    metadata: '{}',
    occurred_at: now,
    created_at: now,
  })
  return id
}

async function attachInsightToEvent(db: DB, insightId: string, eventId: string): Promise<void> {
  await db.update(schema.insights).set({ event_id: eventId }).where(eq(schema.insights.id, insightId))
}

async function seedOutputMetadata(db: DB, projectId: string): Promise<{ metaId: string; eventId: string }> {
  const now = Math.floor(Date.now() / 1000)
  const entryId = `ent_gh_${Math.random().toString(36).slice(2)}`
  const eventId = `evt_gh_${Math.random().toString(36).slice(2)}`
  const metaId = `om_${Math.random().toString(36).slice(2)}`

  await db.insert(schema.entries).values({
    id: entryId,
    content: 'feat: add login flow',
    source: 'github',
    status: 'processed',
    quick_tags: '[]',
    created_at: now,
  })
  await db.insert(schema.events).values({
    id: eventId,
    entry_id: entryId,
    pillar: 'OUTPUT',
    project_id: projectId,
    impact_score: 3,
    classifier: 'rule',
    metadata: '{}',
    occurred_at: now,
    created_at: now,
  })
  await db.insert(schema.output_metadata).values({
    id: metaId,
    event_id: eventId,
    repo_id: 1,
    repo_name: 'test-repo',
    commit_sha: `sha_${Math.random().toString(36).slice(2)}`,
    commit_message: 'feat: add login flow',
    author: 'testuser',
    committed_at: now,
    state: 'ACTIVE',
    project_id: projectId,
    project_name_snapshot: 'Test Project',
    additions: 100,
    deletions: 10,
    files_changed: 5,
    allocated_cost: '4.50',
    realized_revenue: '0.00',
    sync_version: 1,
    created_at: now,
    updated_at: now,
  })

  return { metaId, eventId }
}

async function seedAssociation(
  db: DB,
  projectId: string,
  sourceId: string,
  targetId: string,
  status = 'PENDING_REVIEW',
): Promise<string> {
  const id = `assoc_${Math.random().toString(36).slice(2)}`
  const now = Math.floor(Date.now() / 1000)
  await db.insert(schema.associations).values({
    id,
    project_id: projectId,
    source_id: sourceId,
    target_id: targetId,
    match_score: 0.87,
    reasoning: 'The insight directly describes the commit work.',
    status,
    created_at: now,
    updated_at: now,
  })
  return id
}

// ── Tests ──────────────────────────────────────────────────────────────────────

describe('GET /api/associations', () => {
  let app: ReturnType<typeof createApp>
  let db: DB

  beforeEach(() => {
    db = createTestDb()
    app = createApp(db)
  })

  it('requires project_id query param', async () => {
    const res = await app.request('/api/associations')
    expect(res.status).toBe(400)
  })

  it('returns empty page for a new project', async () => {
    const projId = await seedProject(db)
    const res = await app.request(`/api/associations?project_id=${projId}`)
    expect(res.status).toBe(200)
    const body = await res.json() as { items: unknown[]; next_cursor: null }
    expect(body.items).toHaveLength(0)
    expect(body.next_cursor).toBeNull()
  })

  it('returns associations for a project with joined source/target', async () => {
    const projId = await seedProject(db)
    const entryId = await seedEntry(db)
    const insightId = await seedInsight(db, entryId)
    const { metaId } = await seedOutputMetadata(db, projId)
    await seedAssociation(db, projId, insightId, metaId)

    const res = await app.request(`/api/associations?project_id=${projId}`)
    expect(res.status).toBe(200)
    const body = await res.json() as { items: Array<{ source: { synthesis: string }; target: { commit_sha: string }; status: string }> }
    expect(body.items).toHaveLength(1)
    expect(body.items[0].source.synthesis).toBe('test synthesis')
    expect(body.items[0].status).toBe('PENDING_REVIEW')
  })

  it('filters by status', async () => {
    const projId = await seedProject(db)
    const entryId = await seedEntry(db)
    const insightId = await seedInsight(db, entryId)
    const { metaId } = await seedOutputMetadata(db, projId)
    await seedAssociation(db, projId, insightId, metaId, 'CONFIRMED')
    await seedAssociation(db, projId, insightId, metaId + '_2', 'REJECTED')

    const pendingRes = await app.request(`/api/associations?project_id=${projId}&status=PENDING_REVIEW`)
    const pendingBody = await pendingRes.json() as { items: unknown[] }
    expect(pendingBody.items).toHaveLength(0)

    const confirmedRes = await app.request(`/api/associations?project_id=${projId}&status=CONFIRMED`)
    const confirmedBody = await confirmedRes.json() as { items: unknown[] }
    expect(confirmedBody.items).toHaveLength(1)
  })
})

describe('POST /api/associations/:id/confirm', () => {
  let app: ReturnType<typeof createApp>
  let db: DB

  beforeEach(() => {
    db = createTestDb()
    app = createApp(db)
  })

  it('returns 404 for unknown id', async () => {
    const res = await app.request('/api/associations/nonexistent/confirm', { method: 'POST' })
    expect(res.status).toBe(404)
  })

  it('confirms a PENDING_REVIEW association and transitions insight to CONVERTED', async () => {
    const projId = await seedProject(db)
    const entryId = await seedEntry(db)
    const inputEventId = await seedInputEvent(db, entryId)
    const insightId = await seedInsight(db, entryId, 'ACTIVE')
    await attachInsightToEvent(db, insightId, inputEventId)
    const { metaId } = await seedOutputMetadata(db, projId)
    const assocId = await seedAssociation(db, projId, insightId, metaId)

    const res = await app.request(`/api/associations/${assocId}/confirm`, { method: 'POST' })
    expect(res.status).toBe(200)

    const body = await res.json() as { association: { status: string }; insight: { status: string } }
    expect(body.association.status).toBe('CONFIRMED')
    expect(body.insight.status).toBe('CONVERTED')

    const inputEventRows = await db.select().from(schema.events).where(eq(schema.events.id, inputEventId)).limit(1)
    expect(inputEventRows[0]?.project_id).toBe(projId)
  })

  it('returns 409 ASSOCIATION_TERMINAL when confirming an already-confirmed association', async () => {
    const projId = await seedProject(db)
    const entryId = await seedEntry(db)
    const insightId = await seedInsight(db, entryId)
    const { metaId } = await seedOutputMetadata(db, projId)
    const assocId = await seedAssociation(db, projId, insightId, metaId, 'CONFIRMED')

    const res = await app.request(`/api/associations/${assocId}/confirm`, { method: 'POST' })
    expect(res.status).toBe(409)
    const body = await res.json() as { code: string }
    expect(body.code).toBe('ASSOCIATION_TERMINAL')
  })
})

describe('POST /api/associations/:id/reject', () => {
  let app: ReturnType<typeof createApp>
  let db: DB

  beforeEach(() => {
    db = createTestDb()
    app = createApp(db)
  })

  it('returns 404 for unknown id', async () => {
    const res = await app.request('/api/associations/nonexistent/reject', { method: 'POST' })
    expect(res.status).toBe(404)
  })

  it('rejects a PENDING_REVIEW association and leaves insight status unchanged', async () => {
    const projId = await seedProject(db)
    const entryId = await seedEntry(db)
    const insightId = await seedInsight(db, entryId, 'ACTIVE')
    const { metaId } = await seedOutputMetadata(db, projId)
    const assocId = await seedAssociation(db, projId, insightId, metaId)

    const res = await app.request(`/api/associations/${assocId}/reject`, { method: 'POST' })
    expect(res.status).toBe(200)
    const body = await res.json() as { association: { status: string } }
    expect(body.association.status).toBe('REJECTED')

    // Insight must remain ACTIVE
    const insightRes = await app.request(`/api/insights/${insightId}`)
    const insight = await insightRes.json() as { status: string }
    expect(insight.status).toBe('ACTIVE')
  })

  it('returns 409 ASSOCIATION_TERMINAL when rejecting an already-rejected association', async () => {
    const projId = await seedProject(db)
    const entryId = await seedEntry(db)
    const insightId = await seedInsight(db, entryId)
    const { metaId } = await seedOutputMetadata(db, projId)
    const assocId = await seedAssociation(db, projId, insightId, metaId, 'REJECTED')

    const res = await app.request(`/api/associations/${assocId}/reject`, { method: 'POST' })
    expect(res.status).toBe(409)
    const body = await res.json() as { code: string }
    expect(body.code).toBe('ASSOCIATION_TERMINAL')
  })
})

describe('POST /api/associations/batch-review', () => {
  let app: ReturnType<typeof createApp>
  let db: DB

  beforeEach(() => {
    db = createTestDb()
    app = createApp(db)
  })

  it('confirms and rejects in a single batch', async () => {
    const projId = await seedProject(db)
    const entryId = await seedEntry(db)
    const inputEvent1 = await seedInputEvent(db, entryId)
    const inputEvent2 = await seedInputEvent(db, entryId)
    const i1 = await seedInsight(db, entryId)
    const i2 = await seedInsight(db, entryId)
    await attachInsightToEvent(db, i1, inputEvent1)
    await attachInsightToEvent(db, i2, inputEvent2)
    const { metaId: m1 } = await seedOutputMetadata(db, projId)
    const { metaId: m2 } = await seedOutputMetadata(db, projId)
    const a1 = await seedAssociation(db, projId, i1, m1)
    const a2 = await seedAssociation(db, projId, i2, m2)

    const res = await app.request('/api/associations/batch-review', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ confirm_ids: [a1], reject_ids: [a2] }),
    })
    expect(res.status).toBe(200)
    const body = await res.json() as { confirmed: number; rejected: number; errors: unknown[] }
    expect(body.confirmed).toBe(1)
    expect(body.rejected).toBe(1)
    expect(body.errors).toHaveLength(0)

    const e1 = await db.select().from(schema.events).where(eq(schema.events.id, inputEvent1)).limit(1)
    const e2 = await db.select().from(schema.events).where(eq(schema.events.id, inputEvent2)).limit(1)
    expect(e1[0]?.project_id).toBe(projId)
    expect(e2[0]?.project_id).toBeNull()
  })

  it('handles partial success: includes error for terminal-state ids', async () => {
    const projId = await seedProject(db)
    const entryId = await seedEntry(db)
    const i1 = await seedInsight(db, entryId)
    const { metaId } = await seedOutputMetadata(db, projId)
    const alreadyConfirmed = await seedAssociation(db, projId, i1, metaId, 'CONFIRMED')
    const fresh = await seedAssociation(db, projId, i1, metaId + '_2', 'PENDING_REVIEW')

    const res = await app.request('/api/associations/batch-review', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ confirm_ids: [alreadyConfirmed, fresh] }),
    })
    expect(res.status).toBe(200)
    const body = await res.json() as { confirmed: number; errors: Array<{ code: string; id: string }> }
    expect(body.confirmed).toBe(1)
    expect(body.errors).toHaveLength(1)
    expect(body.errors[0].code).toBe('ASSOCIATION_TERMINAL')
    expect(body.errors[0].id).toBe(alreadyConfirmed)
  })

  it('idempotency: duplicate suggestion insert does not create second row', async () => {
    const projId = await seedProject(db)
    const entryId = await seedEntry(db)
    const i1 = await seedInsight(db, entryId)
    const { metaId } = await seedOutputMetadata(db, projId)

    // Seed twice with same source/target
    await seedAssociation(db, projId, i1, metaId)

    // Direct service call to simulate agent insert-or-ignore
    const { upsertAssociationSuggestion } = await import('../associations/association-service')
    await upsertAssociationSuggestion(db, {
      project_id: projId,
      source_id: i1,
      target_id: metaId,
      match_score: 0.9,
      reasoning: 'duplicate attempt',
    })

    const rows = await db.select().from(schema.associations)
    // Should still be exactly 1 row for this source/target pair
    const matching = rows.filter((r) => r.source_id === i1 && r.target_id === metaId)
    expect(matching).toHaveLength(1)
  })

  it('handles empty batch gracefully', async () => {
    const res = await app.request('/api/associations/batch-review', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({}),
    })
    expect(res.status).toBe(200)
    const body = await res.json() as { confirmed: number; rejected: number; errors: unknown[] }
    expect(body.confirmed).toBe(0)
    expect(body.rejected).toBe(0)
    expect(body.errors).toHaveLength(0)
  })
})
