import { Hono } from 'hono'
import { eq } from 'drizzle-orm'
import { randomUUID } from 'crypto'
import type { DB } from '../db/index'
import type { EntrySource } from '@soloos/shared'
import * as schema from '../db/schema'
import { applyRules } from '../classifiers/rules'

export function entriesRouter(db: DB) {
  const app = new Hono()

  app.get('/', async (c) => {
    const status = c.req.query('status')
    if (status && status !== 'pending' && status !== 'processed') {
      return c.json({ error: 'invalid status' }, 400)
    }
    const rows = status
      ? await db.select().from(schema.entries).where(eq(schema.entries.status, status))
      : await db.select().from(schema.entries)
    return c.json(rows.map(deserialize))
  })

  app.post('/', async (c) => {
    let body: { content?: string; source?: EntrySource; quick_tags?: string[] }
    try {
      body = await c.req.json()
    } catch {
      return c.json({ error: 'invalid JSON' }, 400)
    }
    if (!body?.content || typeof body.content !== 'string') {
      return c.json({ error: 'content is required' }, 400)
    }
    const now = Math.floor(Date.now() / 1000)
    const pillar = applyRules({ content: body.content, source: body.source ?? 'cli' })
    const status = pillar ? 'processed' : 'pending'

    const entry = {
      id: randomUUID(),
      content: body.content,
      source: body.source ?? 'cli',
      status,
      quick_tags: JSON.stringify(body.quick_tags ?? []),
      created_at: now,
    }

    await db.insert(schema.entries).values(entry)

    if (pillar) {
      await db.insert(schema.events).values({
        id: randomUUID(),
        entry_id: entry.id,
        pillar,
        project_id: null,
        impact_score: 1,
        classifier: 'rule',
        metadata: '{}',
        occurred_at: now,
        created_at: now,
      })
    }

    return c.json(deserialize(entry), 201)
  })

  return app
}

function deserialize(row: typeof schema.entries.$inferSelect) {
  return {
    ...row,
    quick_tags: JSON.parse(row.quick_tags),
  }
}
