import { Hono } from 'hono'
import { randomUUID } from 'crypto'
import type { DB } from '../db/index'
import * as schema from '../db/schema'

export function stripeWebhook(db: DB) {
  const app = new Hono()

  app.post('/', async (c) => {
    const payload = await c.req.json<{
      type: string
      data: {
        object: {
          amount?: number         // charge.succeeded, payment_intent.succeeded
          amount_paid?: number    // invoice.paid
          currency: string
          description?: string
        }
      }
    }>()

    if (!['payment_intent.succeeded', 'charge.succeeded', 'invoice.paid'].includes(payload.type)) {
      return c.json({ ok: true })
    }

    const obj = payload.data.object
    const rawAmount = obj.amount ?? obj.amount_paid ?? 0
    const amountDollars = rawAmount / 100
    if (amountDollars <= 0) return c.json({ ok: true })
    const now = Math.floor(Date.now() / 1000)

    const entry = {
      id: randomUUID(),
      content: `Stripe: +$${amountDollars.toFixed(2)} — ${obj.description ?? payload.type}`,
      source: 'stripe' as const,
      status: 'processed' as const,
      quick_tags: '[]',
      created_at: now,
    }
    await db.insert(schema.entries).values(entry)

    await db.insert(schema.events).values({
      id: randomUUID(),
      entry_id: entry.id,
      title: `+$${amountDollars.toFixed(2)} ${payload.type}`.slice(0, 80),
      pillar: 'FINANCIAL',
      project_id: null,
      impact_score: Math.min(10, Math.ceil(amountDollars / 10)),
      classifier: 'rule',
      metadata: JSON.stringify({ amount: amountDollars, currency: obj.currency, type: payload.type }),
      occurred_at: now,
      created_at: now,
    })

    return c.json({ ok: true })
  })

  return app
}
