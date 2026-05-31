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

  it('requires an agent cost decision when current review has non-zero agent cost', async () => {
    const { start, end } = currentWeekBounds()
    await app.request('/api/agent-cost/events', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        provider: 'manual',
        amount: '8.00',
        currency: 'usd',
        usage_start: start,
        usage_end: end,
        tool_label: 'codex',
      }),
    })

    const currentRes = await app.request('/api/reviews/current')
    const review = await currentRes.json() as { id: string }
    const missingDecision = await app.request(`/api/reviews/${review.id}/complete`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ reflection: 'Good week, but agent spend needs an explicit product decision.' }),
    })
    expect(missingDecision.status).toBe(400)
    expect(await missingDecision.json()).toMatchObject({ error: 'agent_cost_decision is required' })

    const validDecision = await app.request(`/api/reviews/${review.id}/complete`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        reflection: 'Good week, but agent spend needs an explicit product decision.',
        agent_cost_decision: 'pause',
      }),
    })
    expect(validDecision.status).toBe(200)
  })

  it('includes manual agent cost totals for the current week', async () => {
    const projectRes = await app.request('/api/projects', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: 'Costed Project' }),
    })
    const project = await projectRes.json()
    const { start, end } = currentWeekBounds()

    await app.request('/api/agent-cost/events', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        provider: 'manual',
        amount: '12.50',
        currency: 'usd',
        usage_start: start,
        usage_end: end,
        project_id: project.id,
        tool_label: 'codex',
      }),
    })
    await app.request('/api/agent-cost/events', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        provider: 'manual',
        amount: '7.25',
        currency: 'usd',
        usage_start: start,
        usage_end: end,
        tool_label: 'claude-code',
      }),
    })

    const res = await app.request('/api/reviews/current')

    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body.agent_cost_summary).toMatchObject({
      currency: 'USD',
      total_amount: '19.75',
      assigned_amount: '12.50',
      unassigned_amount: '7.25',
    })
    expect(body.agent_cost_summary.project_costs).toEqual([
      { project_id: project.id, amount: '12.50', currency: 'USD' },
    ])
  })
})

function currentWeekBounds(now = Date.now()): { start: number; end: number } {
  const d = new Date(now)
  const day = d.getUTCDay()
  const monday = new Date(d)
  monday.setUTCDate(d.getUTCDate() - ((day + 6) % 7))
  monday.setUTCHours(0, 0, 0, 0)
  const sunday = new Date(monday)
  sunday.setUTCDate(monday.getUTCDate() + 6)
  sunday.setUTCHours(23, 59, 59, 999)
  return {
    start: Math.floor(monday.getTime() / 1000),
    end: Math.floor(sunday.getTime() / 1000),
  }
}
