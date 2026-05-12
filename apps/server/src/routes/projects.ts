import { Hono } from 'hono'
import { eq } from 'drizzle-orm'
import { randomUUID } from 'crypto'
import type { DB } from '../db/index'
import * as schema from '../db/schema'
import { parseJsonColumn } from '../util/json-column'

export function projectsRouter(db: DB) {
  const app = new Hono()

  app.get('/', async (c) => {
    const rows = await db.select().from(schema.projects).orderBy(schema.projects.last_event_at)
    return c.json(rows.map(deserialize))
  })

  app.post('/', async (c) => {
    let body: { name?: string; match_rules?: Record<string, unknown> }
    try {
      body = await c.req.json()
    } catch {
      return c.json({ error: 'invalid JSON' }, 400)
    }
    if (!body?.name || typeof body.name !== 'string') {
      return c.json({ error: 'name is required' }, 400)
    }
    const now = Math.floor(Date.now() / 1000)
    const row = {
      id: randomUUID(),
      name: body.name,
      status: 'active' as const,
      match_rules: JSON.stringify(body.match_rules ?? {}),
      is_auto: 0,
      first_event_at: null,
      last_event_at: null,
      created_at: now,
    }
    await db.insert(schema.projects).values(row)
    return c.json(deserialize(row), 201)
  })

  return app
}

export async function findOrCreateProject(db: DB, repoName: string): Promise<string> {
  const all = await db.select().from(schema.projects).where(eq(schema.projects.status, 'active'))
  const matched = all.find(p => {
    const rules = parseJsonColumn<{ repos?: string[] }>(p.match_rules, {})
    return rules.repos?.includes(repoName)
  })
  if (matched) return matched.id

  const now = Math.floor(Date.now() / 1000)
  const newProject = {
    id: randomUUID(),
    name: repoName,
    status: 'active' as const,
    match_rules: JSON.stringify({ repos: [repoName] }),
    is_auto: 1,
    first_event_at: now,
    last_event_at: now,
    created_at: now,
  }
  await db.insert(schema.projects).values(newProject)
  return newProject.id
}

function deserialize(row: typeof schema.projects.$inferSelect) {
  return {
    ...row,
    match_rules: parseJsonColumn<Record<string, unknown>>(row.match_rules, {}),
    is_auto: row.is_auto === 1,
  }
}
