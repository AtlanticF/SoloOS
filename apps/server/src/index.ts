import { Hono } from 'hono'
import { cors } from 'hono/cors'
import { serve } from '@hono/node-server'
import { readFileSync } from 'fs'
import { fileURLToPath } from 'url'
import type { DB } from './db/index'
import { getDb } from './db/index'
import { entriesRouter } from './routes/entries'
import { eventsRouter } from './routes/events'
import { projectsRouter } from './routes/projects'
import { reviewsRouter } from './routes/reviews'
import { insightsRouter } from './routes/insights'
import { agentConfigRouter } from './routes/agent-config'
import { outputRouter } from './routes/output'
import { githubConfigRouter } from './routes/github-config'
import { associationsRouter } from './routes/associations'
import { startOutputAutoSyncWorker } from './output/auto-sync-worker'
import { githubWebhook } from './webhooks/github'
import { stripeWebhook } from './webhooks/stripe'

export function createApp(db: DB) {
  const app = new Hono()
  const openapiPath = fileURLToPath(new URL('../openapi.yaml', import.meta.url))
  const openapiYaml = readFileSync(openapiPath, 'utf8')
  app.use('*', cors({ origin: 'http://localhost:5173' }))
  app.get('/health', (c) => c.json({ ok: true }))
  app.get('/openapi.yaml', (c) => c.text(openapiYaml, 200, { 'Content-Type': 'application/yaml; charset=utf-8' }))
  app.get('/docs', (c) => c.html(`<!doctype html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>SoloOS API Docs</title>
    <link rel="stylesheet" href="https://unpkg.com/swagger-ui-dist@5/swagger-ui.css" />
  </head>
  <body style="margin:0;background:#0b0b0c;">
    <div id="swagger-ui"></div>
    <script src="https://unpkg.com/swagger-ui-dist@5/swagger-ui-bundle.js"></script>
    <script>
      window.ui = SwaggerUIBundle({
        url: '/openapi.yaml',
        dom_id: '#swagger-ui',
        docExpansion: 'list',
        displayRequestDuration: true,
        tryItOutEnabled: true
      });
    </script>
  </body>
</html>`))
  app.route('/api/entries', entriesRouter(db))
  app.route('/api/events', eventsRouter(db))
  app.route('/api/projects', projectsRouter(db))
  app.route('/api/reviews', reviewsRouter(db))
  app.route('/api/insights', insightsRouter(db))
  app.route('/api/agent-config', agentConfigRouter(db))
  app.route('/api/output', outputRouter(db))
  app.route('/api/github-config', githubConfigRouter(db))
  app.route('/api/associations', associationsRouter(db))
  app.route('/webhooks/github', githubWebhook(db))
  app.route('/webhooks/stripe', stripeWebhook(db))
  return app
}

if (process.env.NODE_ENV !== 'test') {
  const db = getDb()
  const app = createApp(db)
  startOutputAutoSyncWorker(db)
  serve({ fetch: app.fetch, port: 3000 }, () => {
    console.log('SoloOS server running at http://localhost:3000')
  })
}
