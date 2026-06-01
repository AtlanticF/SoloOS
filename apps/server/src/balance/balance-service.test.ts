import { describe, it, expect, beforeEach } from 'vitest'
import { randomUUID } from 'crypto'
import { createTestDb } from '../db/index'
import type { DB } from '../db/index'
import * as schema from '../db/schema'
import type { Pillar } from '@soloos/shared'
import { computePillarBalance } from './balance-service'

const NOW = Date.UTC(2026, 4, 13, 12, 0, 0) // fixed midweek instant
const NOW_SEC = Math.floor(NOW / 1000)
const WEEK = 7 * 24 * 60 * 60

async function addEvent(db: DB, pillar: Pillar, impact: number, occurredAt: number) {
  const entryId = randomUUID()
  await db.insert(schema.entries).values({
    id: entryId,
    content: 'x',
    source: 'cli',
    status: 'processed',
    quick_tags: '[]',
    created_at: occurredAt,
  })
  await db.insert(schema.events).values({
    id: randomUUID(),
    entry_id: entryId,
    title: '',
    pillar,
    project_id: null,
    impact_score: impact,
    classifier: 'rule',
    metadata: '{}',
    occurred_at: occurredAt,
    created_at: occurredAt,
  })
}

function scoreOf(balance: { pillar: Pillar; score: number }[], pillar: Pillar): number {
  return balance.find((b) => b.pillar === pillar)!.score
}

describe('computePillarBalance', () => {
  let db: DB

  beforeEach(() => {
    db = createTestDb()
  })

  it('returns zero scores for every pillar when there are no events', async () => {
    const balance = await computePillarBalance(db, NOW)
    expect(balance).toHaveLength(5)
    for (const b of balance) expect(b.score).toBe(0)
  })

  it('scores Energy as the period mean rating mapped 1-5 -> 0-100', async () => {
    await addEvent(db, 'ENERGY', 2, NOW_SEC)
    await addEvent(db, 'ENERGY', 4, NOW_SEC)
    const balance = await computePillarBalance(db, NOW)
    // mean rating 3 -> (3-1)/4*100 = 50
    expect(scoreOf(balance, 'ENERGY')).toBe(50)
  })

  it('normalizes a flow pillar against its trailing weekly max', async () => {
    await addEvent(db, 'OUTPUT', 10, NOW_SEC - WEEK) // previous week peak
    await addEvent(db, 'OUTPUT', 5, NOW_SEC) // current week
    const balance = await computePillarBalance(db, NOW)
    expect(scoreOf(balance, 'OUTPUT')).toBe(50)
  })

  it('scores a flow pillar at 100 when the current week is its own peak', async () => {
    await addEvent(db, 'OUTPUT', 5, NOW_SEC)
    const balance = await computePillarBalance(db, NOW)
    expect(scoreOf(balance, 'OUTPUT')).toBe(100)
  })
})
