import { describe, it, expect, beforeEach } from 'vitest'
import { createApp } from '../index'
import { createTestDb } from '../db/index'
import * as schema from '../db/schema'

describe('POST /webhooks/github', () => {
  let app: ReturnType<typeof createApp>
  let db: ReturnType<typeof createTestDb>

  beforeEach(() => {
    db = createTestDb()
    app = createApp(db)
  })

  it('creates an entry and event for a push event', async () => {
    const payload = {
      ref: 'refs/heads/main',
      repository: { name: 'amigogo-app', full_name: 'matt/amigogo-app' },
      head_commit: { message: 'feat: add checkout flow', timestamp: '2026-04-21T10:00:00Z' },
      pusher: { name: 'matt' },
    }

    const res = await app.request('/webhooks/github', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'X-GitHub-Event': 'push' },
      body: JSON.stringify(payload),
    })

    expect(res.status).toBe(200)

    const events = await db.select().from(schema.events)
    expect(events).toHaveLength(1)
    expect(events[0].pillar).toBe('OUTPUT')

    const projects = await db.select().from(schema.projects)
    expect(projects).toHaveLength(1)
    expect(projects[0].name).toBe('amigogo-app')
    expect(events[0].project_id).toBe(projects[0].id)
  })
})
