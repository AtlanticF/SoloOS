import { describe, it, expect, beforeEach } from 'vitest'
import { createApp } from './index'
import { createTestDb } from './db/index'

describe('GET /health', () => {
  let app: ReturnType<typeof createApp>

  beforeEach(() => {
    app = createApp(createTestDb())
  })

  it('returns a SoloOS identity signature so a remote client can confirm the server', async () => {
    const res = await app.request('/health')
    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body).toMatchObject({ ok: true, app: 'soloos' })
    expect(typeof body.version).toBe('string')
  })

  it('answers the Private Network Access preflight with the allow header', async () => {
    const res = await app.request('/health', {
      method: 'OPTIONS',
      headers: {
        Origin: 'http://localhost:5173',
        'Access-Control-Request-Method': 'GET',
        'Access-Control-Request-Private-Network': 'true',
      },
    })
    expect(res.headers.get('access-control-allow-private-network')).toBe('true')
  })
})
