import { Hono } from 'hono'
import { eq, and } from 'drizzle-orm'
import { randomUUID } from 'crypto'
import type { DB } from '../db/index'
import * as schema from '../db/schema'
import { parseJsonColumn } from '../util/json-column'

export function eventsRouter(db: DB) {
  const app = new Hono()

  app.get('/', async (c) => {
    const pillar = c.req.query('pillar')
    const projectId = c.req.query('project_id')

    const conditions = []
    if (pillar) conditions.push(eq(schema.events.pillar, pillar))
    if (projectId) conditions.push(eq(schema.events.project_id, projectId))

    const rows = conditions.length > 0
      ? await db.select().from(schema.events).where(and(...conditions)).orderBy(schema.events.occurred_at)
      : await db.select().from(schema.events).orderBy(schema.events.occurred_at)

    return c.json(rows.map(deserialize))
  })

  app.get('/:id', async (c) => {
    const id = c.req.param('id')
    const rows = await db.select().from(schema.events).where(eq(schema.events.id, id)).limit(1)
    if (!rows[0]) return c.json({ error: 'not_found' }, 404)
    return c.json(deserialize(rows[0]))
  })

  app.post('/batch', async (c) => {
    let items: Array<{
      entry_id: string
      pillar: string
      impact_score?: number
      classifier: string
      metadata?: Record<string, unknown>
    }>
    try {
      items = await c.req.json()
    } catch {
      return c.json({ error: 'invalid JSON' }, 400)
    }
    if (!Array.isArray(items) || items.length === 0) {
      return c.json({ error: 'items must be a non-empty array' }, 400)
    }
    // Validate required fields on each item
    for (const item of items) {
      if (!item.entry_id || !item.pillar || !item.classifier) {
        return c.json({ error: 'each item requires entry_id, pillar, and classifier' }, 400)
      }
    }

    const now = Math.floor(Date.now() / 1000)
    const rows = items.map(item => ({
      id: randomUUID(),
      entry_id: item.entry_id,
      title: `${item.pillar} event`,
      pillar: item.pillar,
      project_id: null,
      impact_score: item.impact_score ?? 1,
      classifier: item.classifier,
      metadata: JSON.stringify(item.metadata ?? {}),
      occurred_at: now,
      created_at: now,
    }))
    await db.insert(schema.events).values(rows)

    // Mark ALL referenced entries as processed
    const entryIds = [...new Set(items.map(i => i.entry_id))]
    for (const entryId of entryIds) {
      await db.update(schema.entries)
        .set({ status: 'processed' })
        .where(eq(schema.entries.id, entryId))
    }

    return c.json({ created: rows.length }, 201)
  })

  return app
}

function deserialize(row: typeof schema.events.$inferSelect) {
  return { ...row, metadata: parseJsonColumn<Record<string, unknown>>(row.metadata, {}) }
}
