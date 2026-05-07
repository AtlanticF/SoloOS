import { eq, and, gt, inArray } from 'drizzle-orm'
import { randomUUID } from 'crypto'
import type { DB } from '../db/index'
import * as schema from '../db/schema'
import type {
  Association,
  AssociationStatus,
  AssociationsPage,
  BatchReviewResponse,
} from '@soloos/shared'

// ── Deserializer ──────────────────────────────────────────────────────────────

function deserialize(
  row: typeof schema.associations.$inferSelect,
  sourceRow: typeof schema.insights.$inferSelect,
  targetRow: typeof schema.output_metadata.$inferSelect,
): Association {
  return {
    id: row.id,
    project_id: row.project_id,
    source_id: row.source_id,
    target_id: row.target_id,
    match_score: row.match_score ?? null,
    reasoning: row.reasoning ?? null,
    status: row.status as AssociationStatus,
    source: {
      id: sourceRow.id,
      synthesis: sourceRow.synthesis,
      status: sourceRow.status,
    },
    target: {
      id: targetRow.id,
      commit_sha: targetRow.commit_sha,
      commit_message: targetRow.commit_message,
      allocated_cost: targetRow.allocated_cost,
      committed_at: targetRow.committed_at,
    },
    created_at: row.created_at,
    updated_at: row.updated_at,
  }
}

// ── List ──────────────────────────────────────────────────────────────────────

export async function listAssociations(
  db: DB,
  opts: { project_id: string; status?: string; cursor?: string; limit?: number },
): Promise<AssociationsPage> {
  const limit = Math.min(opts.limit ?? 50, 100)
  const conditions: ReturnType<typeof eq>[] = [
    eq(schema.associations.project_id, opts.project_id),
  ]
  if (opts.status) conditions.push(eq(schema.associations.status, opts.status))
  if (opts.cursor) conditions.push(gt(schema.associations.id, opts.cursor))

  const rows = await db
    .select()
    .from(schema.associations)
    .where(and(...conditions))
    .orderBy(schema.associations.created_at)
    .limit(limit + 1)

  const hasMore = rows.length > limit
  const items = rows.slice(0, limit)

  if (items.length === 0) {
    return { items: [], next_cursor: null }
  }

  const sourceIds = [...new Set(items.map((r) => r.source_id))]
  const targetIds = [...new Set(items.map((r) => r.target_id))]

  const [sourceRows, targetRows] = await Promise.all([
    db.select().from(schema.insights).where(inArray(schema.insights.id, sourceIds)),
    db.select().from(schema.output_metadata).where(inArray(schema.output_metadata.id, targetIds)),
  ])

  const sourceMap = new Map(sourceRows.map((r) => [r.id, r]))
  const targetMap = new Map(targetRows.map((r) => [r.id, r]))

  const associations: Association[] = []
  for (const row of items) {
    const src = sourceMap.get(row.source_id)
    const tgt = targetMap.get(row.target_id)
    if (src && tgt) associations.push(deserialize(row, src, tgt))
  }

  return {
    items: associations,
    next_cursor: hasMore ? items[items.length - 1].id : null,
  }
}

// ── Get single ────────────────────────────────────────────────────────────────

async function getAssociationById(db: DB, id: string) {
  const rows = await db
    .select()
    .from(schema.associations)
    .where(eq(schema.associations.id, id))
    .limit(1)
  return rows[0] ?? null
}

async function getAssociationFull(db: DB, id: string): Promise<Association | null> {
  const row = await getAssociationById(db, id)
  if (!row) return null

  const [srcRows, tgtRows] = await Promise.all([
    db.select().from(schema.insights).where(eq(schema.insights.id, row.source_id)).limit(1),
    db.select().from(schema.output_metadata).where(eq(schema.output_metadata.id, row.target_id)).limit(1),
  ])

  const src = srcRows[0]
  const tgt = tgtRows[0]
  if (!src || !tgt) return null

  return deserialize(row, src, tgt)
}

async function syncInputEventProjectFromInsight(
  db: DB,
  sourceInsightId: string,
  projectId: string,
  updatedAt: number,
): Promise<void> {
  const insightRows = await db
    .select()
    .from(schema.insights)
    .where(eq(schema.insights.id, sourceInsightId))
    .limit(1)

  const insight = insightRows[0]
  if (!insight?.event_id) return

  await db
    .update(schema.events)
    .set({ project_id: projectId })
    .where(and(
      eq(schema.events.id, insight.event_id),
      eq(schema.events.pillar, 'INPUT'),
    ))

  await db
    .update(schema.insights)
    .set({ updated_at: updatedAt })
    .where(eq(schema.insights.id, sourceInsightId))
}

// ── Confirm ───────────────────────────────────────────────────────────────────

export async function confirmAssociation(
  db: DB,
  id: string,
): Promise<{ association: Association; insight: typeof schema.insights.$inferSelect } | { error: string; code: string } | null> {
  const row = await getAssociationById(db, id)
  if (!row) return null

  if (row.status !== 'PENDING_REVIEW') {
    return { error: `Association is already in terminal state: ${row.status}`, code: 'ASSOCIATION_TERMINAL' }
  }

  const now = Math.floor(Date.now() / 1000)

  await db
    .update(schema.associations)
    .set({ status: 'CONFIRMED', updated_at: now })
    .where(eq(schema.associations.id, id))

  // Transition insight to CONVERTED
  await db
    .update(schema.insights)
    .set({ status: 'CONVERTED', updated_at: now })
    .where(eq(schema.insights.id, row.source_id))

  await syncInputEventProjectFromInsight(db, row.source_id, row.project_id, now)

  const full = await getAssociationFull(db, id)
  const insightRows = await db
    .select()
    .from(schema.insights)
    .where(eq(schema.insights.id, row.source_id))
    .limit(1)

  return { association: full!, insight: insightRows[0] }
}

// ── Reject ────────────────────────────────────────────────────────────────────

export async function rejectAssociation(
  db: DB,
  id: string,
): Promise<{ association: Association } | { error: string; code: string } | null> {
  const row = await getAssociationById(db, id)
  if (!row) return null

  if (row.status !== 'PENDING_REVIEW') {
    return { error: `Association is already in terminal state: ${row.status}`, code: 'ASSOCIATION_TERMINAL' }
  }

  const now = Math.floor(Date.now() / 1000)

  await db
    .update(schema.associations)
    .set({ status: 'REJECTED', updated_at: now })
    .where(eq(schema.associations.id, id))

  const full = await getAssociationFull(db, id)
  return { association: full! }
}

// ── Batch review ──────────────────────────────────────────────────────────────

export async function batchReviewAssociations(
  db: DB,
  confirmIds: string[],
  rejectIds: string[],
): Promise<BatchReviewResponse> {
  const now = Math.floor(Date.now() / 1000)
  let confirmed = 0
  let rejected = 0
  const errors: BatchReviewResponse['errors'] = []

  for (const id of confirmIds) {
    const row = await getAssociationById(db, id)
    if (!row) {
      errors.push({ id, code: 'NOT_FOUND', message: 'Association not found' })
      continue
    }
    if (row.status !== 'PENDING_REVIEW') {
      errors.push({ id, code: 'ASSOCIATION_TERMINAL', message: `Already in terminal state: ${row.status}` })
      continue
    }
    await db
      .update(schema.associations)
      .set({ status: 'CONFIRMED', updated_at: now })
      .where(eq(schema.associations.id, id))
    await db
      .update(schema.insights)
      .set({ status: 'CONVERTED', updated_at: now })
      .where(eq(schema.insights.id, row.source_id))
    await syncInputEventProjectFromInsight(db, row.source_id, row.project_id, now)
    confirmed++
  }

  for (const id of rejectIds) {
    const row = await getAssociationById(db, id)
    if (!row) {
      errors.push({ id, code: 'NOT_FOUND', message: 'Association not found' })
      continue
    }
    if (row.status !== 'PENDING_REVIEW') {
      errors.push({ id, code: 'ASSOCIATION_TERMINAL', message: `Already in terminal state: ${row.status}` })
      continue
    }
    await db
      .update(schema.associations)
      .set({ status: 'REJECTED', updated_at: now })
      .where(eq(schema.associations.id, id))
    rejected++
  }

  return { confirmed, rejected, errors }
}

// ── Create suggestion (used by async worker) ──────────────────────────────────

export async function upsertAssociationSuggestion(
  db: DB,
  opts: {
    project_id: string
    source_id: string
    target_id: string
    match_score: number
    reasoning: string
  },
): Promise<void> {
  const now = Math.floor(Date.now() / 1000)
  const id = `assoc_${randomUUID()}`

  // INSERT OR IGNORE via onConflictDoNothing for idempotency
  await db
    .insert(schema.associations)
    .values({
      id,
      project_id: opts.project_id,
      source_id: opts.source_id,
      target_id: opts.target_id,
      match_score: opts.match_score,
      reasoning: opts.reasoning,
      status: 'PENDING_REVIEW',
      created_at: now,
      updated_at: now,
    })
    .onConflictDoNothing()
}
