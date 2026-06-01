import { Hono } from 'hono'
import type { DB } from '../db/index'
import { computePillarBalance } from '../balance/balance-service'

export function balanceRouter(db: DB) {
  const app = new Hono()

  app.get('/', async (c) => {
    const balance = await computePillarBalance(db)
    return c.json(balance)
  })

  return app
}
