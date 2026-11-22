import { and, gte, lte } from 'drizzle-orm'
import type { DB } from '../db/index'
import * as schema from '../db/schema'
import { PILLARS, type Pillar, type PillarSnapshot } from '@soloos/shared'

const WEEK = 7 * 24 * 60 * 60
const TRAILING_WEEKS = 8

function currentWeekStartSec(nowMs: number): number {
  const d = new Date(nowMs)
  const day = d.getUTCDay()
  const monday = new Date(d)
  monday.setUTCDate(d.getUTCDate() - ((day + 6) % 7))
  monday.setUTCHours(0, 0, 0, 0)
  return Math.floor(monday.getTime() / 1000)
}

const clamp = (n: number) => Math.min(100, Math.max(0, n))

/**
 * Per-pillar balance for the current week, normalized 0-100.
 *
 * Flow pillars (Input/Output/Audience/Financial) score the current week's
 * impact against that pillar's own trailing weekly max (last 8 weeks) — the
 * radar answers "where am I vs my own recent peak?". Energy is a state, not a
 * flux: its score is the period mean self-rating mapped 1-5 -> 0-100.
 */
export async function computePillarBalance(db: DB, nowMs: number = Date.now()): Promise<PillarSnapshot[]> {
  const curStart = currentWeekStartSec(nowMs)
  const curEnd = curStart + WEEK - 1
  const windowStart = curStart - (TRAILING_WEEKS - 1) * WEEK

  const rows = await db
    .select()
    .from(schema.events)
    .where(and(gte(schema.events.occurred_at, windowStart), lte(schema.events.occurred_at, curEnd)))

  const weeklyImpact: Record<number, Record<string, number>> = {}
  const curImpact: Record<string, number> = {}
  const curCount: Record<string, number> = {}
  const curEnergyRatings: number[] = []
  for (const p of PILLARS) {
    curImpact[p] = 0
    curCount[p] = 0
  }

  for (const e of rows) {
    const pillar = e.pillar as Pillar
    const impact = Math.max(0, e.impact_score)
    const weekIdx = Math.floor((e.occurred_at - windowStart) / WEEK)
    weeklyImpact[weekIdx] ??= {}
    weeklyImpact[weekIdx][pillar] = (weeklyImpact[weekIdx][pillar] ?? 0) + impact
    if (e.occurred_at >= curStart) {
      curImpact[pillar] += impact
      curCount[pillar] += 1
      if (pillar === 'ENERGY') curEnergyRatings.push(e.impact_score)
    }
  }

  const weeklyMax: Record<string, number> = {}
  for (const p of PILLARS) weeklyMax[p] = 0
  for (const week of Object.values(weeklyImpact)) {
    for (const p of PILLARS) {
      if ((week[p] ?? 0) > weeklyMax[p]) weeklyMax[p] = week[p] ?? 0
    }
  }

  return PILLARS.map((pillar): PillarSnapshot => {
    if (pillar === 'ENERGY') {
      const count = curEnergyRatings.length
      const sum = curEnergyRatings.reduce((a, b) => a + b, 0)
      const mean = count ? sum / count : 0
      const score = count ? clamp(Math.round(((mean - 1) / 4) * 100)) : 0
      return { pillar, event_count: count, impact_sum: sum, score }
    }
    const impactSum = curImpact[pillar]
    const score = clamp(Math.round((impactSum / Math.max(1, weeklyMax[pillar])) * 100))
    return { pillar, event_count: curCount[pillar], impact_sum: impactSum, score }
  })
}
