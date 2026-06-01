import { describe, it, expect, beforeEach } from 'vitest'
import { eq } from 'drizzle-orm'
import { createTestDb } from '../db/index'
import type { DB } from '../db/index'
import * as schema from '../db/schema'
import { recordSocialSnapshot } from './audience-service'

function audienceEvents(db: DB) {
  return db.select().from(schema.events).where(eq(schema.events.pillar, 'AUDIENCE'))
}

describe('recordSocialSnapshot', () => {
  let db: DB

  beforeEach(() => {
    db = createTestDb()
  })

  it('creates no event on the first (baseline) snapshot', async () => {
    const res = await recordSocialSnapshot(db, 'me/repo', { stars: 10, watchers: 4, forks: 2 })
    expect(res.baseline).toBe(true)
    expect(res.event_created).toBe(false)
    expect(await audienceEvents(db)).toHaveLength(0)
  })

  it('emits an AUDIENCE event for a positive delta since the last snapshot', async () => {
    await recordSocialSnapshot(db, 'me/repo', { stars: 10, watchers: 4, forks: 2 })
    const res = await recordSocialSnapshot(db, 'me/repo', { stars: 13, watchers: 4, forks: 2 })
    expect(res.event_created).toBe(true)
    expect(res.delta).toBe(3)
    const events = await audienceEvents(db)
    expect(events).toHaveLength(1)
    expect(events[0].impact_score).toBe(3)
  })

  it('is idempotent when counts are unchanged', async () => {
    await recordSocialSnapshot(db, 'me/repo', { stars: 10, watchers: 4, forks: 2 })
    await recordSocialSnapshot(db, 'me/repo', { stars: 10, watchers: 4, forks: 2 })
    expect(await audienceEvents(db)).toHaveLength(0)
  })

  it('sums deltas across stars, watchers and forks', async () => {
    await recordSocialSnapshot(db, 'me/repo', { stars: 10, watchers: 4, forks: 2 })
    const res = await recordSocialSnapshot(db, 'me/repo', { stars: 12, watchers: 5, forks: 2 })
    expect(res.delta).toBe(3)
    const events = await audienceEvents(db)
    expect(events).toHaveLength(1)
    expect(events[0].impact_score).toBe(3)
  })

  it('ignores negative deltas (unstars do not create events)', async () => {
    await recordSocialSnapshot(db, 'me/repo', { stars: 13, watchers: 4, forks: 2 })
    const res = await recordSocialSnapshot(db, 'me/repo', { stars: 10, watchers: 4, forks: 2 })
    expect(res.event_created).toBe(false)
    expect(await audienceEvents(db)).toHaveLength(0)
  })
})
