import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { createApp } from '../index'
import { createTestDb } from '../db/index'

describe('manual agent cost events', () => {
  let app: ReturnType<typeof createApp>

  beforeEach(() => {
    app = createApp(createTestDb())
  })

  afterEach(() => {
    vi.unstubAllGlobals()
  })

  it('creates and lists a manual cost event', async () => {
    const usageStart = 1772380800
    const usageEnd = 1772467200
    const projectRes = await app.request('/api/projects', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: 'Agent Cost Project' }),
    })
    const project = await projectRes.json()

    const createRes = await app.request('/api/agent-cost/events', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        provider: 'manual',
        amount: '18.75',
        currency: 'usd',
        usage_start: usageStart,
        usage_end: usageEnd,
        tool_label: 'codex',
        line_item: 'weekly-codex-allocation',
        project_id: project.id,
        raw_metadata: { note: 'estimated weekly allocation' },
      }),
    })

    expect(createRes.status).toBe(201)
    const created = await createRes.json()
    expect(created).toMatchObject({
      provider: 'manual',
      source: 'manual',
      project_id: project.id,
      line_item: 'weekly-codex-allocation',
      tool_label: 'codex',
      amount: '18.75',
      currency: 'USD',
      usage_start: usageStart,
      usage_end: usageEnd,
      raw_metadata: { note: 'estimated weekly allocation' },
    })
    expect(created.id).toBeDefined()

    const listRes = await app.request('/api/agent-cost/events')

    expect(listRes.status).toBe(200)
    const page = await listRes.json()
    expect(page.next_cursor).toBeNull()
    expect(page.items).toHaveLength(1)
    expect(page.items[0]).toMatchObject({
      id: created.id,
      provider: 'manual',
      source: 'manual',
      amount: '18.75',
      currency: 'USD',
      usage_start: usageStart,
      usage_end: usageEnd,
    })
  })
})

describe('official cost provider config and sync', () => {
  let app: ReturnType<typeof createApp>

  beforeEach(() => {
    app = createApp(createTestDb())
  })

  afterEach(() => {
    vi.unstubAllGlobals()
  })

  it('saves, masks, tests, and deletes an OpenAI costs provider', async () => {
    const saveRes = await app.request('/api/agent-cost/providers/openai', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        label: 'OpenAI Admin',
        api_key: 'sk-admin-costs-secret1234',
      }),
    })

    expect(saveRes.status).toBe(200)
    const saved = await saveRes.json()
    expect(saved).toMatchObject({
      provider: 'openai',
      label: 'OpenAI Admin',
      status: 'untested',
      api_key_masked: '****1234',
    })
    expect(JSON.stringify(saved)).not.toContain('sk-admin-costs-secret1234')
    expect(saved.secret_ref).toBeUndefined()

    const fetchMock = vi.fn().mockResolvedValue(new Response(JSON.stringify({
      object: 'page',
      data: [],
      has_more: false,
      next_page: null,
    }), { status: 200, headers: { 'Content-Type': 'application/json' } }))
    vi.stubGlobal('fetch', fetchMock)

    const testRes = await app.request('/api/agent-cost/providers/openai/test', { method: 'POST' })

    expect(testRes.status).toBe(200)
    const testBody = await testRes.json()
    expect(testBody).toMatchObject({ ok: true, provider: 'openai', status: 'ok' })
    expect(fetchMock).toHaveBeenCalledTimes(1)
    const [url, init] = fetchMock.mock.calls[0]
    expect(String(url)).toContain('https://api.openai.com/v1/organization/costs')
    expect(String(url)).toContain('start_time=')
    expect(String(url)).toContain('limit=1')
    expect((init as RequestInit).headers).toMatchObject({
      Authorization: 'Bearer sk-admin-costs-secret1234',
      'Content-Type': 'application/json',
    })

    const listRes = await app.request('/api/agent-cost/providers')
    expect(listRes.status).toBe(200)
    const list = await listRes.json()
    expect(list).toHaveLength(1)
    expect(list[0]).toMatchObject({ provider: 'openai', status: 'ok', api_key_masked: '****1234' })
    expect(JSON.stringify(list)).not.toContain('sk-admin-costs-secret1234')

    const deleteRes = await app.request('/api/agent-cost/providers/openai', { method: 'DELETE' })
    expect(deleteRes.status).toBe(200)

    const emptyRes = await app.request('/api/agent-cost/providers')
    expect(await emptyRes.json()).toEqual([])
  })

  it('syncs OpenAI cost rows idempotently and records unassigned imports', async () => {
    await app.request('/api/agent-cost/providers/openai', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ label: 'OpenAI Admin', api_key: 'sk-admin-costs-secret1234' }),
    })

    const fetchMock = vi.fn().mockImplementation(async () => new Response(JSON.stringify({
      object: 'page',
      data: [
        {
          object: 'bucket',
          start_time: 1772380800,
          end_time: 1772467200,
          results: [
            {
              object: 'organization.costs.result',
              amount: { value: 1.23, currency: 'usd' },
              line_item: 'GPT-5 input tokens',
              project_id: 'proj_openai_123',
            },
            {
              object: 'organization.costs.result',
              amount: { value: 2.5, currency: 'usd' },
              line_item: 'Codex usage',
              project_id: null,
            },
          ],
        },
      ],
      has_more: false,
      next_page: null,
    }), { status: 200, headers: { 'Content-Type': 'application/json' } }))
    vi.stubGlobal('fetch', fetchMock)

    const firstSync = await app.request('/api/agent-cost/providers/openai/sync', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ start_time: 1772380800, end_time: 1772467200 }),
    })
    expect(firstSync.status).toBe(200)
    expect(await firstSync.json()).toMatchObject({
      provider: 'openai',
      imported: 2,
      skipped: 0,
      unassigned: 2,
      status: 'success',
    })

    const secondSync = await app.request('/api/agent-cost/providers/openai/sync', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ start_time: 1772380800, end_time: 1772467200 }),
    })
    expect(secondSync.status).toBe(200)
    expect(await secondSync.json()).toMatchObject({
      provider: 'openai',
      imported: 0,
      skipped: 2,
      unassigned: 2,
      status: 'success',
    })

    const listRes = await app.request('/api/agent-cost/events')
    const page = await listRes.json()
    expect(page.items).toHaveLength(2)
    expect(page.items[0]).toMatchObject({
      provider: 'openai',
      source: 'official_api',
      provider_project_id: 'proj_openai_123',
      line_item: 'GPT-5 input tokens',
      amount: '1.23',
      currency: 'USD',
      project_id: null,
    })
    expect(fetchMock).toHaveBeenCalledTimes(2)
  })

  it('saves, tests, and syncs Anthropic official cost rows idempotently', async () => {
    const saveRes = await app.request('/api/agent-cost/providers/anthropic', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ label: 'Anthropic Admin', api_key: 'sk-ant-admin-secret1234' }),
    })
    expect(saveRes.status).toBe(200)
    expect(await saveRes.json()).toMatchObject({
      provider: 'anthropic',
      label: 'Anthropic Admin',
      api_key_masked: '****1234',
    })

    const fetchMock = vi.fn().mockImplementation(async () => new Response(JSON.stringify({
      data: [
        {
          starting_at: '2026-05-01T00:00:00Z',
          ending_at: '2026-05-02T00:00:00Z',
          results: [
            {
              amount: '123',
              currency: 'USD',
              workspace_id: 'wrk_costs',
              description: 'Claude Sonnet usage',
            },
            {
              amount: '250',
              currency: 'USD',
              workspace_id: null,
              description: 'Code Execution Usage',
            },
          ],
        },
      ],
      has_more: false,
      next_page: null,
    }), { status: 200, headers: { 'Content-Type': 'application/json' } }))
    vi.stubGlobal('fetch', fetchMock)

    const testRes = await app.request('/api/agent-cost/providers/anthropic/test', { method: 'POST' })
    expect(testRes.status).toBe(200)
    expect(await testRes.json()).toMatchObject({ ok: true, provider: 'anthropic', status: 'ok' })
    const [testUrl, testInit] = fetchMock.mock.calls[0]
    expect(String(testUrl)).toContain('https://api.anthropic.com/v1/organizations/cost_report')
    expect((testInit as RequestInit).headers).toMatchObject({
      'x-api-key': 'sk-ant-admin-secret1234',
      'anthropic-version': '2023-06-01',
    })

    const firstSync = await app.request('/api/agent-cost/providers/anthropic/sync', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ start_time: 1772380800, end_time: 1772467200 }),
    })
    expect(firstSync.status).toBe(200)
    expect(await firstSync.json()).toMatchObject({
      provider: 'anthropic',
      imported: 2,
      skipped: 0,
      unassigned: 2,
      status: 'success',
    })

    const secondSync = await app.request('/api/agent-cost/providers/anthropic/sync', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ start_time: 1772380800, end_time: 1772467200 }),
    })
    expect(secondSync.status).toBe(200)
    expect(await secondSync.json()).toMatchObject({
      provider: 'anthropic',
      imported: 0,
      skipped: 2,
      unassigned: 2,
      status: 'success',
    })

    const page = await (await app.request('/api/agent-cost/events')).json()
    expect(page.items).toHaveLength(2)
    expect(page.items[0]).toMatchObject({
      provider: 'anthropic',
      source: 'official_api',
      provider_project_id: 'wrk_costs',
      line_item: 'Claude Sonnet usage',
      amount: '1.23',
      currency: 'USD',
    })
  })

  it('saves, tests, and syncs Cursor official usage events idempotently', async () => {
    const saveRes = await app.request('/api/agent-cost/providers/cursor', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ label: 'Cursor Team', api_key: 'key_cursor_secret1234' }),
    })
    expect(saveRes.status).toBe(200)
    expect(await saveRes.json()).toMatchObject({
      provider: 'cursor',
      label: 'Cursor Team',
      api_key_masked: '****1234',
    })

    const fetchMock = vi.fn().mockImplementation(async (url: URL | string) => {
      if (String(url).includes('/teams/spend')) {
        return new Response(JSON.stringify({
          teamMemberSpend: [
            {
              spendCents: 2450,
              fastPremiumRequests: 1250,
              name: 'Alex',
              email: 'alex@example.com',
              role: 'member',
              hardLimitOverrideDollars: 100,
            },
          ],
          subscriptionCycleStart: 1772380800000,
          totalMembers: 1,
          totalPages: 1,
        }), { status: 200, headers: { 'Content-Type': 'application/json' } })
      }
      return new Response(JSON.stringify({
        usageEvents: [
          {
            timestamp: '1772380800000',
            model: 'claude-4-opus',
            kind: 'Usage-based',
            maxMode: true,
            requestsCosts: 5,
            isTokenBasedCall: true,
            tokenUsage: {
              inputTokens: 126,
              outputTokens: 450,
              cacheWriteTokens: 6112,
              cacheReadTokens: 11964,
              totalCents: 20.18232,
            },
            userEmail: 'dev@example.com',
          },
          {
            timestamp: '1772384400000',
            model: 'gpt-5',
            kind: 'Included in Business',
            maxMode: false,
            requestsCosts: 1.4,
            isTokenBasedCall: false,
            userEmail: 'admin@example.com',
          },
        ],
        totalUsageEventsCount: 2,
        pagination: { numPages: 1, currentPage: 1, pageSize: 100, hasNextPage: false, hasPreviousPage: false },
        period: { startDate: 1772380800000, endDate: 1772467200000 },
      }), { status: 200, headers: { 'Content-Type': 'application/json' } })
    })
    vi.stubGlobal('fetch', fetchMock)

    const testRes = await app.request('/api/agent-cost/providers/cursor/test', { method: 'POST' })
    expect(testRes.status).toBe(200)
    expect(await testRes.json()).toMatchObject({ ok: true, provider: 'cursor', status: 'ok' })
    const [, testInit] = fetchMock.mock.calls[0]
    expect((testInit as RequestInit).headers).toMatchObject({
      Authorization: `Basic ${Buffer.from('key_cursor_secret1234:').toString('base64')}`,
      'Content-Type': 'application/json',
    })

    const firstSync = await app.request('/api/agent-cost/providers/cursor/sync', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ start_time: 1772380800, end_time: 1772467200 }),
    })
    expect(firstSync.status).toBe(200)
    expect(await firstSync.json()).toMatchObject({
      provider: 'cursor',
      imported: 3,
      skipped: 0,
      unassigned: 3,
      status: 'success',
    })

    const secondSync = await app.request('/api/agent-cost/providers/cursor/sync', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ start_time: 1772380800, end_time: 1772467200 }),
    })
    expect(secondSync.status).toBe(200)
    expect(await secondSync.json()).toMatchObject({
      provider: 'cursor',
      imported: 0,
      skipped: 3,
      unassigned: 3,
      status: 'success',
    })

    const page = await (await app.request('/api/agent-cost/events')).json()
    expect(page.items).toHaveLength(3)
    const usageBasedEvent = page.items.find((item: { provider_project_id: string }) => (
      item.provider_project_id === 'dev@example.com'
    ))
    expect(usageBasedEvent).toMatchObject({
      provider: 'cursor',
      source: 'official_api',
      provider_project_id: 'dev@example.com',
      line_item: 'Usage-based',
      model: 'claude-4-opus',
      amount: '0.20',
      currency: 'USD',
    })
    expect(page.items).toContainEqual(expect.objectContaining({
      provider: 'cursor',
      source: 'official_api',
      provider_project_id: 'alex@example.com',
      line_item: 'Team member spend',
      amount: '24.50',
      currency: 'USD',
    }))
  })
})

describe('personal agent cost subscriptions', () => {
  let app: ReturnType<typeof createApp>

  beforeEach(() => {
    app = createApp(createTestDb())
  })

  it('creates, lists, updates, disables, and deletes a personal subscription', async () => {
    const createRes = await app.request('/api/agent-cost/personal-subscriptions', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        provider: 'codex',
        account_type: 'ChatGPT Plus',
        billing_status: 'paid',
        monthly_amount: '20.00',
        currency: 'usd',
        effective_start: 1772380800,
      }),
    })

    expect(createRes.status).toBe(201)
    const created = await createRes.json()
    expect(created).toMatchObject({
      provider: 'codex',
      account_type: 'ChatGPT Plus',
      billing_status: 'paid',
      monthly_amount: '20.00',
      currency: 'USD',
      effective_start: 1772380800,
      effective_end: null,
      source: 'user_configured',
      confidence: 'user_confirmed',
      enabled: true,
    })
    expect(created.id).toBeDefined()

    const listRes = await app.request('/api/agent-cost/personal-subscriptions')
    expect(listRes.status).toBe(200)
    expect(await listRes.json()).toEqual([created])

    const updateRes = await app.request(`/api/agent-cost/personal-subscriptions/${created.id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        provider: 'codex',
        account_type: 'ChatGPT Pro',
        billing_status: 'paid',
        monthly_amount: '200.00',
        currency: 'usd',
        effective_start: 1772380800,
        effective_end: 1774972800,
      }),
    })
    expect(updateRes.status).toBe(200)
    const updated = await updateRes.json()
    expect(updated).toMatchObject({
      id: created.id,
      account_type: 'ChatGPT Pro',
      monthly_amount: '200.00',
      effective_end: 1774972800,
      enabled: true,
    })

    const disableRes = await app.request(`/api/agent-cost/personal-subscriptions/${created.id}/disable`, {
      method: 'POST',
    })
    expect(disableRes.status).toBe(200)
    expect(await disableRes.json()).toMatchObject({ id: created.id, enabled: false })

    const deleteRes = await app.request(`/api/agent-cost/personal-subscriptions/${created.id}`, { method: 'DELETE' })
    expect(deleteRes.status).toBe(200)
    expect(await deleteRes.json()).toEqual({ ok: true })

    const emptyRes = await app.request('/api/agent-cost/personal-subscriptions')
    expect(await emptyRes.json()).toEqual([])
  })

  it('rejects free personal subscriptions with non-zero monthly cost', async () => {
    const res = await app.request('/api/agent-cost/personal-subscriptions', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        provider: 'cursor',
        account_type: 'Cursor Free',
        billing_status: 'free',
        monthly_amount: '20.00',
        currency: 'usd',
        effective_start: 1772380800,
      }),
    })

    expect(res.status).toBe(400)
    expect(await res.json()).toEqual({ error: 'free accounts must have zero monthly_amount' })
  })
})

describe('local agent cost connector detection', () => {
  let app: ReturnType<typeof createApp>

  beforeEach(() => {
    app = createApp(createTestDb())
  })

  it('reports detection state for supported personal agent CLIs', async () => {
    const res = await app.request('/api/agent-cost/personal-connectors')

    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body.map((connector: { provider: string }) => connector.provider)).toEqual(['anthropic', 'cursor', 'codex'])
    expect(body.every((connector: { status: string }) => ['installed', 'missing', 'unsupported'].includes(connector.status))).toBe(true)
  })
})

describe('local agent activity metadata sync', () => {
  let app: ReturnType<typeof createApp>

  beforeEach(() => {
    app = createApp(createTestDb())
  })

  it('imports local activity metadata without transcript content', async () => {
    const res = await app.request('/api/agent-cost/personal-activity/sync', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        provider: 'codex',
        events: [
          {
            occurred_at: 1777593600,
            project_path: '/Users/matt/AI/SoloOS',
            event_count: 3,
            input_tokens: 100,
            output_tokens: 50,
            raw_metadata: { session_id: 'sess_123' },
          },
        ],
      }),
    })

    expect(res.status).toBe(200)
    expect(await res.json()).toMatchObject({
      provider: 'codex',
      imported: 1,
      skipped: 0,
    })
  })

  it('rejects local activity payloads that contain prompt or response content', async () => {
    const res = await app.request('/api/agent-cost/personal-activity/sync', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        provider: 'anthropic',
        events: [
          {
            occurred_at: 1777593600,
            project_path: '/Users/matt/AI/SoloOS',
            event_count: 1,
            raw_metadata: { prompt: 'summarize this private file' },
          },
        ],
      }),
    })

    expect(res.status).toBe(400)
    expect(await res.json()).toEqual({ error: 'local activity metadata must not include prompt or response content' })
  })

  it('allocates synced personal activity into daily cost events', async () => {
    const createRes = await app.request('/api/agent-cost/personal-subscriptions', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        provider: 'codex',
        account_type: 'ChatGPT Plus',
        billing_status: 'paid',
        monthly_amount: '31.00',
        currency: 'usd',
        effective_start: 1777593600,
      }),
    })
    expect(createRes.status).toBe(201)

    const res = await app.request('/api/agent-cost/personal-activity/allocate', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ day_start: 1777593600 }),
    })

    expect(res.status).toBe(200)
    expect(await res.json()).toEqual({ imported: 1, skipped: 0, unallocated: 1 })
  })
})

describe('agent cost project mappings', () => {
  let app: ReturnType<typeof createApp>

  beforeEach(() => {
    app = createApp(createTestDb())
  })

  afterEach(() => {
    vi.unstubAllGlobals()
  })

  it('applies mapping precedence and exposes the unassigned queue', async () => {
    const providerProject = await createProject(app, 'Provider Project Match')
    const apiKeyProject = await createProject(app, 'API Key Match')
    const lineItemProject = await createProject(app, 'Line Item Match')

    await createMapping(app, {
      provider: 'openai',
      match_type: 'line_item',
      match_value: 'Codex usage',
      project_id: lineItemProject.id,
    })
    await createMapping(app, {
      provider: 'openai',
      match_type: 'api_key_id',
      match_value: 'key_agent',
      project_id: apiKeyProject.id,
    })
    await createMapping(app, {
      provider: 'openai',
      match_type: 'provider_project_id',
      match_value: 'proj_openai_123',
      project_id: providerProject.id,
    })

    const providerProjectEvent = await createCostEvent(app, {
      provider_project_id: 'proj_openai_123',
      api_key_id: 'key_agent',
      line_item: 'Codex usage',
    })
    expect(providerProjectEvent.project_id).toBe(providerProject.id)

    const apiKeyEvent = await createCostEvent(app, {
      api_key_id: 'key_agent',
      line_item: 'Codex usage',
    })
    expect(apiKeyEvent.project_id).toBe(apiKeyProject.id)

    const lineItemEvent = await createCostEvent(app, {
      line_item: 'Codex usage',
    })
    expect(lineItemEvent.project_id).toBe(lineItemProject.id)

    const unmappedEvent = await createCostEvent(app, {
      line_item: 'Unmapped usage',
    })
    expect(unmappedEvent.project_id).toBeNull()

    const unassignedRes = await app.request('/api/agent-cost/events?assignment=unassigned')
    expect(unassignedRes.status).toBe(200)
    const unassignedPage = await unassignedRes.json()
    expect(unassignedPage.items).toHaveLength(1)
    expect(unassignedPage.items[0].id).toBe(unmappedEvent.id)

    const assignRes = await app.request(`/api/agent-cost/events/${unmappedEvent.id}/project`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ project_id: lineItemProject.id }),
    })
    expect(assignRes.status).toBe(200)
    expect(await assignRes.json()).toMatchObject({ id: unmappedEvent.id, project_id: lineItemProject.id })

    const emptyUnassignedRes = await app.request('/api/agent-cost/events?assignment=unassigned')
    expect((await emptyUnassignedRes.json()).items).toEqual([])
  })
})

async function createProject(app: ReturnType<typeof createApp>, name: string): Promise<{ id: string }> {
  const res = await app.request('/api/projects', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ name }),
  })
  expect(res.status).toBe(201)
  return await res.json()
}

async function createMapping(
  app: ReturnType<typeof createApp>,
  body: { provider: string; match_type: string; match_value: string; project_id: string },
): Promise<void> {
  const res = await app.request('/api/agent-cost/mappings', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  })
  expect(res.status).toBe(201)
}

async function createCostEvent(
  app: ReturnType<typeof createApp>,
  keys: { provider_project_id?: string; api_key_id?: string; line_item?: string },
): Promise<{ id: string; project_id: string | null }> {
  const res = await app.request('/api/agent-cost/events', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      provider: 'openai',
      amount: '4.00',
      currency: 'usd',
      usage_start: 1772380800,
      usage_end: 1772467200,
      ...keys,
    }),
  })
  expect(res.status).toBe(201)
  return await res.json()
}
