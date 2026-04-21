import { describe, it, expect, beforeEach } from 'vitest'
import { createApp } from '../index'
import { createTestDb } from '../db/index'

describe('POST /api/entries', () => {
  let app: ReturnType<typeof createApp>

  beforeEach(() => {
    app = createApp(createTestDb())
  })

  it('creates an entry and returns 201', async () => {
    const res = await app.request('/api/entries', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ content: 'learned about vector embeddings' }),
    })
    expect(res.status).toBe(201)
    const body = await res.json()
    expect(body.id).toBeDefined()
    expect(body.status).toBe('pending')
  })

  it('creates an entry with pillar tag and returns status processed', async () => {
    const res = await app.request('/api/entries', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ content: 'shipped v2 #output', source: 'cli' }),
    })
    expect(res.status).toBe(201)
    const body = await res.json()
    expect(body.status).toBe('processed')
  })

  it('GET /api/entries?status=pending returns only pending entries', async () => {
    await app.request('/api/entries', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ content: 'no tag here' }),
    })
    const res = await app.request('/api/entries?status=pending')
    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body).toHaveLength(1)
  })
})
