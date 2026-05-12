import { Hono } from 'hono'
import { and, eq, gte, lte } from 'drizzle-orm'
import { randomUUID } from 'crypto'
import type { DB } from '../db/index'
import * as schema from '../db/schema'
import { parseJsonColumn } from '../util/json-column'

function getWeekBounds(now = Date.now()): { start: number; end: number } {
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

export function reviewsRouter(db: DB) {
  const app = new Hono()

  app.get('/current', async (c) => {
    const { start, end } = getWeekBounds()
    let review = await db.query.reviews.findFirst({
      where: and(
        eq(schema.reviews.period, 'weekly'),
        gte(schema.reviews.period_start, start),
        lte(schema.reviews.period_end, end),
      ),
    })

    if (!review) {
      const now = Math.floor(Date.now() / 1000)
      const newReview = {
        id: randomUUID(),
        period: 'weekly' as const,
        period_start: start,
        period_end: end,
        snapshot: '[]',
        reflection: null,
        ai_insight: null,
        completed_at: null,
        created_at: now,
      }
      await db.insert(schema.reviews).values(newReview)
      review = newReview
    }

    return c.json(deserialize(review))
  })

  app.post('/:id/complete', async (c) => {
    const { id } = c.req.param()
    let body: { reflection: string }
    try {
      body = await c.req.json()
    } catch {
      return c.json({ error: 'invalid JSON' }, 400)
    }
    const now = Math.floor(Date.now() / 1000)
    const updated = await db.update(schema.reviews)
      .set({ reflection: body.reflection, completed_at: now })
      .where(eq(schema.reviews.id, id))
      .returning({ id: schema.reviews.id })
    if (updated.length === 0) {
      return c.json({ error: 'review not found' }, 404)
    }
    return c.json({ ok: true })
  })

  return app
}

function deserialize(row: typeof schema.reviews.$inferSelect) {
  return { ...row, snapshot: parseJsonColumn<unknown[]>(row.snapshot, []) }
}
