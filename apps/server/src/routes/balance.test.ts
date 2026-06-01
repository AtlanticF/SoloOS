import { describe, it, expect, beforeEach } from 'vitest'
import { createApp } from '../index'
import { createTestDb } from '../db/index'

describe('GET /api/balance', () => {
  let app: ReturnType<typeof createApp>

  beforeEach(() => {
    app = createApp(createTestDb())
  })

  it('returns a score for all five pillars', async () => {
    const res = await app.request('/api/balance')
    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body).toHaveLength(5)
    for (const b of body) {
      expect(typeof b.pillar).toBe('string')
      expect(typeof b.score).toBe('number')
    }
  })
})
