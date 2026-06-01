import { describe, it, expect, beforeEach } from 'vitest'
import { createApp } from '../index'
import { createTestDb } from '../db/index'

describe('POST /api/audience/sync', () => {
  let app: ReturnType<typeof createApp>

  beforeEach(() => {
    app = createApp(createTestDb())
  })

  it('returns 400 when no github token is configured', async () => {
    const res = await app.request('/api/audience/sync', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: '{}',
    })
    expect(res.status).toBe(400)
    expect(await res.json()).toMatchObject({ error: 'github token not configured' })
  })
})
