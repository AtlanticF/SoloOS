import { Hono } from 'hono'
import { cors } from 'hono/cors'
import { serve } from '@hono/node-server'
import type { DB } from './db/index'
import { getDb } from './db/index'
import { entriesRouter } from './routes/entries'
import { eventsRouter } from './routes/events'
import { projectsRouter } from './routes/projects'
import { reviewsRouter } from './routes/reviews'
import { githubWebhook } from './webhooks/github'
import { stripeWebhook } from './webhooks/stripe'

export function createApp(db: DB) {
  const app = new Hono()
  app.use('*', cors({ origin: 'http://localhost:5173' }))
  app.get('/health', (c) => c.json({ ok: true }))
  app.route('/api/entries', entriesRouter(db))
  app.route('/api/events', eventsRouter(db))
  app.route('/api/projects', projectsRouter(db))
  app.route('/api/reviews', reviewsRouter(db))
  app.route('/webhooks/github', githubWebhook(db))
  app.route('/webhooks/stripe', stripeWebhook(db))
  return app
}

if (process.env.NODE_ENV !== 'test') {
  const app = createApp(getDb())
  serve({ fetch: app.fetch, port: 3000 }, () => {
    console.log('SoloOS server running at http://localhost:3000')
  })
}
