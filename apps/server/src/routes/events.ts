import { Hono } from 'hono'
import { eq } from 'drizzle-orm'
import { randomUUID } from 'crypto'
import type { DB } from '../db/index'
import * as schema from '../db/schema'

export function eventsRouter(db: DB) {
  const app = new Hono()

  app.get('/', async (c) => {
    const pillar = c.req.query('pillar')
    const projectId = c.req.query('project_id')
    let query = db.select().from(schema.events)
    if (pillar) query = query.where(eq(schema.events.pillar, pillar)) as typeof query
    if (projectId) query = query.where(eq(schema.events.project_id, projectId)) as typeof query
    const rows = await query.orderBy(schema.events.occurred_at)
    return c.json(rows.map(deserialize))
  })

  app.post('/batch', async (c) => {
    const items = await c.req.json<Array<{
      entry_id: string
      pillar: string
      impact_score?: number
      classifier: string
      metadata?: Record<string, unknown>
    }>>()
    const now = Math.floor(Date.now() / 1000)
    const rows = items.map(item => ({
      id: randomUUID(),
      entry_id: item.entry_id,
      pillar: item.pillar,
      project_id: null,
      impact_score: item.impact_score ?? 1,
      classifier: item.classifier,
      metadata: JSON.stringify(item.metadata ?? {}),
      occurred_at: now,
      created_at: now,
    }))
    await db.insert(schema.events).values(rows)
    await db.update(schema.entries)
      .set({ status: 'processed' })
      .where(eq(schema.entries.id, items[0].entry_id))
    return c.json({ created: rows.length }, 201)
  })

  return app
}

function deserialize(row: typeof schema.events.$inferSelect) {
  return { ...row, metadata: JSON.parse(row.metadata) }
}
