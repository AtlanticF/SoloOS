import { Hono } from 'hono'
import type { DB } from '../db/index'
import type { Insight, InsightStatus, InsightType } from '@soloos/shared'
import {
  listAssociations,
  confirmAssociation,
  rejectAssociation,
  batchReviewAssociations,
} from '../associations/association-service'
import * as schema from '../db/schema'

function deserializeInsight(row: typeof schema.insights.$inferSelect): Insight {
  return {
    id: row.id,
    entry_id: row.entry_id,
    event_id: row.event_id ?? null,
    type: row.type as InsightType,
    content: {
      fact: row.fact,
      synthesis: row.synthesis,
      vector: row.vector,
    },
    metrics: {
      value_score: row.value_score,
      shelf_life: row.shelf_life as 'LONG' | 'SHORT',
      certainty: row.certainty,
    },
    status: row.status as InsightStatus,
    project_id: row.project_id ?? null,
    cluster_id: row.cluster_id ?? null,
    created_at: row.created_at,
    updated_at: row.updated_at,
  }
}

export function associationsRouter(db: DB) {
  const app = new Hono()

  // GET /api/associations
  app.get('/', async (c) => {
    const projectId = c.req.query('project_id')
    if (!projectId) {
      return c.json({ error: 'project_id is required' }, 400)
    }

    const status = c.req.query('status')
    const cursor = c.req.query('cursor')
    const limitRaw = c.req.query('limit')
    const limit = limitRaw ? Number(limitRaw) : 50

    if (isNaN(limit) || limit < 1 || limit > 100) {
      return c.json({ error: 'limit must be 1-100' }, 400)
    }

    const VALID_STATUSES = ['PENDING_REVIEW', 'CONFIRMED', 'REJECTED']
    if (status && !VALID_STATUSES.includes(status)) {
      return c.json({ error: `status must be one of ${VALID_STATUSES.join(', ')}` }, 400)
    }

    const page = await listAssociations(db, { project_id: projectId, status, cursor, limit })
    return c.json(page)
  })

  // POST /api/associations/batch-review  (must be before /:id routes)
  app.post('/batch-review', async (c) => {
    let body: { confirm_ids?: string[]; reject_ids?: string[] } = {}
    try {
      const raw = await c.req.json().catch(() => null)
      if (raw && typeof raw === 'object') body = raw
    } catch {
      return c.json({ error: 'invalid JSON' }, 400)
    }

    const confirmIds = Array.isArray(body.confirm_ids) ? body.confirm_ids : []
    const rejectIds = Array.isArray(body.reject_ids) ? body.reject_ids : []

    const result = await batchReviewAssociations(db, confirmIds, rejectIds)
    return c.json(result)
  })

  // POST /api/associations/:id/confirm
  app.post('/:id/confirm', async (c) => {
    const id = c.req.param('id')
    const result = await confirmAssociation(db, id)

    if (result === null) {
      return c.json({ error: 'Association not found' }, 404)
    }
    if ('code' in result) {
      return c.json({ error: result.error, code: result.code }, 409)
    }

    return c.json({
      association: result.association,
      insight: deserializeInsight(result.insight),
    })
  })

  // POST /api/associations/:id/reject
  app.post('/:id/reject', async (c) => {
    const id = c.req.param('id')
    const result = await rejectAssociation(db, id)

    if (result === null) {
      return c.json({ error: 'Association not found' }, 404)
    }
    if ('code' in result) {
      return c.json({ error: result.error, code: result.code }, 409)
    }

    return c.json({ association: result.association })
  })

  return app
}
