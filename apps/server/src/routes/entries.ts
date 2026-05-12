import { Hono } from 'hono'
import { eq } from 'drizzle-orm'
import { randomUUID } from 'crypto'
import type { DB } from '../db/index'
import type { EntrySource, Pillar } from '@soloos/shared'
import * as schema from '../db/schema'
import { applyRules } from '../classifiers/rules'
import { processInputCapture } from '../input/insight-service'
import { parseJsonColumn } from '../util/json-column'

const VALID_PILLARS: readonly Pillar[] = ['INPUT', 'OUTPUT', 'AUDIENCE', 'FINANCIAL', 'ENERGY']

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
    let body: { content?: string; source?: EntrySource; pillar?: Pillar; quick_tags?: string[] }
    try {
      body = await c.req.json()
    } catch {
      return c.json({ error: 'invalid JSON' }, 400)
    }
    if (!body?.content || typeof body.content !== 'string') {
      return c.json({ error: 'content is required' }, 400)
    }
    if (body.pillar && !VALID_PILLARS.includes(body.pillar)) {
      return c.json({ error: 'invalid pillar' }, 400)
    }
    const now = Math.floor(Date.now() / 1000)
    const source = body.source ?? 'cli'

    // Explicit pillar has priority; fallback to rule-based detection
    const rulePillar = applyRules({ content: body.content, source })
    const pillar = body.pillar ?? rulePillar

    const entry = {
      id: randomUUID(),
      content: body.content,
      source,
      status: pillar ? 'processed' : 'pending',
      quick_tags: JSON.stringify(body.quick_tags ?? []),
      created_at: now,
    }

    await db.insert(schema.entries).values(entry)

    // INPUT captures go through the semantic parser pipeline
    if (pillar === 'INPUT') {
      const capture = await processInputCapture(db, entry.id, body.content)
      const entryRow = await db.select().from(schema.entries).where(eq(schema.entries.id, entry.id))
      return c.json({ ...deserialize(entryRow[0]), capture }, 201)
    }

    // Non-INPUT pillars use the original event creation path
    if (pillar) {
      const fallbackTitle = body.content.trim().slice(0, 60) || `Captured ${pillar.toLowerCase()} event`
      await db.insert(schema.events).values({
        id: randomUUID(),
        entry_id: entry.id,
        title: fallbackTitle,
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
    quick_tags: parseJsonColumn<string[]>(row.quick_tags, []),
  }
}
