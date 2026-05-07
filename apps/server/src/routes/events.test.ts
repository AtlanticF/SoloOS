import { describe, it, expect, beforeEach } from 'vitest'
import { createApp } from '../index'
import { createTestDb } from '../db/index'
import * as schema from '../db/schema'
import { randomUUID } from 'crypto'

describe('GET /api/events', () => {
  let app: ReturnType<typeof createApp>
  let db: ReturnType<typeof createTestDb>

  beforeEach(async () => {
    db = createTestDb()
    app = createApp(db)
    const now = Math.floor(Date.now() / 1000)
    await db.insert(schema.entries).values({ id: 'e1', content: 'test', source: 'cli', status: 'processed', quick_tags: '[]', created_at: now })
    await db.insert(schema.events).values({ id: randomUUID(), entry_id: 'e1', pillar: 'OUTPUT', project_id: null, impact_score: 1, classifier: 'rule', metadata: '{}', occurred_at: now, created_at: now })
  })

  it('returns all events', async () => {
    const res = await app.request('/api/events')
    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body).toHaveLength(1)
    expect(body[0].pillar).toBe('OUTPUT')
  })

  it('POST /api/events/batch writes multiple events', async () => {
    const now = Math.floor(Date.now() / 1000)
    await db.insert(schema.entries).values({ id: 'e2', content: 'pending', source: 'cli', status: 'pending', quick_tags: '[]', created_at: now })
    const res = await app.request('/api/events/batch', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify([
        { entry_id: 'e2', pillar: 'INPUT', impact_score: 2, classifier: 'api-key', metadata: {} },
      ]),
    })
    expect(res.status).toBe(201)
  })
})
