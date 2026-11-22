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

  it('uses explicit pillar when provided and returns processed', async () => {
    const res = await app.request('/api/entries', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ content: 'plain text without hashtags', source: 'cli', pillar: 'OUTPUT' }),
    })
    expect(res.status).toBe(201)
    const body = await res.json()
    expect(body.status).toBe('processed')
  })

})

describe('POST /api/entries — energy rating', () => {
  let app: ReturnType<typeof createApp>

  beforeEach(() => {
    app = createApp(createTestDb())
  })

  it('records an ENERGY event carrying the rating as impact_score', async () => {
    const res = await app.request('/api/entries', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ content: 'steady focus', source: 'cli', pillar: 'ENERGY', impact_score: 3 }),
    })
    expect(res.status).toBe(201)

    const events = await (await app.request('/api/events?pillar=ENERGY')).json()
    expect(events).toHaveLength(1)
    expect(events[0].pillar).toBe('ENERGY')
    expect(events[0].impact_score).toBe(3)
  })

  it('rejects an energy rating above 5', async () => {
    const res = await app.request('/api/entries', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ content: 'wired', source: 'cli', pillar: 'ENERGY', impact_score: 6 }),
    })
    expect(res.status).toBe(400)
  })

  it('rejects a non-integer energy rating', async () => {
    const res = await app.request('/api/entries', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ content: 'meh', source: 'cli', pillar: 'ENERGY', impact_score: 2.5 }),
    })
    expect(res.status).toBe(400)
  })

  it('requires a rating for an explicit energy entry', async () => {
    const res = await app.request('/api/entries', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ content: 'no rating', source: 'cli', pillar: 'ENERGY' }),
    })
    expect(res.status).toBe(400)
  })
})

describe('GET /api/entries', () => {
  let app: ReturnType<typeof createApp>

  beforeEach(() => {
    app = createApp(createTestDb())
  })

  it('returns only entries matching status filter', async () => {
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

describe('error handling', () => {
  let app: ReturnType<typeof createApp>

  beforeEach(() => {
    app = createApp(createTestDb())
  })

  it('POST with missing content returns 400', async () => {
    const res = await app.request('/api/entries', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({}),
    })
    expect(res.status).toBe(400)
  })

  it('POST with invalid JSON returns 400', async () => {
    const res = await app.request('/api/entries', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: 'not json',
    })
    expect(res.status).toBe(400)
  })

  it('POST with invalid pillar returns 400', async () => {
    const res = await app.request('/api/entries', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ content: 'test', pillar: 'INVALID_PILLAR' }),
    })
    expect(res.status).toBe(400)
  })

  it('GET with invalid status returns 400', async () => {
    const res = await app.request('/api/entries?status=garbage')
    expect(res.status).toBe(400)
  })
})
