import { Hono } from 'hono'
import type { DB } from '../db/index'
import type { AgentConfigInput, AgentProvider } from '@soloos/shared'
import { getAgentConfig, upsertAgentConfig, deleteAgentConfig, getAgentConfigRaw } from '../agent/config-service'
import { testConnection } from '../agent/llm-client'

const VALID_PROVIDERS: AgentProvider[] = ['openai', 'anthropic', 'google', 'groq', 'ollama', 'custom']

export function agentConfigRouter(db: DB) {
  const app = new Hono()

  app.get('/', async (c) => {
    const config = await getAgentConfig(db)
    if (!config) return c.json(null)
    return c.json(config)
  })

  app.put('/', async (c) => {
    let body: AgentConfigInput
    try {
      body = await c.req.json()
    } catch {
      return c.json({ error: 'invalid JSON' }, 400)
    }

    if (!body?.provider || !VALID_PROVIDERS.includes(body.provider as AgentProvider)) {
      return c.json({ error: `provider must be one of: ${VALID_PROVIDERS.join(', ')}` }, 400)
    }
    if (!body?.model || typeof body.model !== 'string' || !body.model.trim()) {
      return c.json({ error: 'model is required' }, 400)
    }
    if (!body?.api_key || typeof body.api_key !== 'string' || !body.api_key.trim()) {
      return c.json({ error: 'api_key is required' }, 400)
    }

    const config = await upsertAgentConfig(db, body)
    return c.json(config)
  })

  app.delete('/', async (c) => {
    await deleteAgentConfig(db)
    return c.json({ ok: true })
  })

  app.post('/test', async (c) => {
    const raw = await getAgentConfigRaw(db)
    if (!raw) return c.json({ ok: false, error: 'not_configured' }, 400)
    const result = await testConnection(raw)
    return c.json(result, result.ok ? 200 : 200)
  })

  return app
}
