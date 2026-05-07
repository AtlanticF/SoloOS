import { describe, it, expect, beforeEach } from 'vitest'
import { createApp } from '../index'
import { createTestDb } from '../db/index'

describe('GET /api/reviews/current', () => {
  let app: ReturnType<typeof createApp>

  beforeEach(() => {
    app = createApp(createTestDb())
  })

  it('creates and returns the current weekly review', async () => {
    const res = await app.request('/api/reviews/current')
    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body.period).toBe('weekly')
    expect(body.completed_at).toBeNull()
    expect(Array.isArray(body.snapshot)).toBe(true)
  })

  it('returns the same review on second call (idempotent)', async () => {
    const res1 = await app.request('/api/reviews/current')
    const body1 = await res1.json() as { id: string }
    const res2 = await app.request('/api/reviews/current')
    const body2 = await res2.json() as { id: string }
    expect(body1.id).toBe(body2.id)
  })

  it('POST /api/reviews/:id/complete marks review as complete', async () => {
    const res1 = await app.request('/api/reviews/current')
    const review = await res1.json() as { id: string }

    const res2 = await app.request(`/api/reviews/${review.id}/complete`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ reflection: 'Good week, shipped pricing feature' }),
    })
    expect(res2.status).toBe(200)

    const res3 = await app.request('/api/reviews/current')
    const updated = await res3.json() as { completed_at: number | null }
    expect(updated.completed_at).not.toBeNull()
  })
})
