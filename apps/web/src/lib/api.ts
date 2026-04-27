import type {
  Entry, Event, Project, Review, Insight, CaptureResult, AgentConfig, AgentConfigInput, Pillar,
  OutputEvent, OutputSummary, OutputEventsPage, RepoBinding, RepoSyncState,
  TriggerSyncResponse, UpsertRepoBindingRequest, OutputLifecycleState, GithubConfig, GithubRepo,
  Association, AssociationsPage, BatchReviewRequest, BatchReviewResponse,
} from '@soloos/shared'

const BASE = '/api'

async function get<T>(path: string): Promise<T> {
  const res = await fetch(`${BASE}${path}`)
  if (!res.ok) throw new Error(`API error: ${res.status}`)
  return res.json()
}

async function post<T>(path: string, body: unknown): Promise<T> {
  const res = await fetch(`${BASE}${path}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  })
  if (!res.ok) throw new Error(`API error: ${res.status}`)
  return res.json()
}

async function put<T>(path: string, body: unknown): Promise<T> {
  const res = await fetch(`${BASE}${path}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  })
  if (!res.ok) throw new Error(`API error: ${res.status}`)
  return res.json()
}

async function del<T>(path: string): Promise<T> {
  const res = await fetch(`${BASE}${path}`, { method: 'DELETE' })
  if (!res.ok) throw new Error(`API error: ${res.status}`)
  return res.json()
}

export type EntryWithCapture = Entry & { capture?: CaptureResult }

export const api = {
  entries: {
    list: (status?: string) => get<Entry[]>(`/entries${status ? `?status=${status}` : ''}`),
    capture: (content: string, pillar: Pillar = 'INPUT') =>
      post<EntryWithCapture>('/entries', { content, source: 'browser-ext', pillar }),
  },
  events: {
    list: (params?: { pillar?: string; project_id?: string }) => {
      const q = new URLSearchParams(
        Object.fromEntries(
          Object.entries(params ?? {}).filter(([, v]) => v !== undefined)
        ) as Record<string, string>
      ).toString()
      return get<Event[]>(`/events${q ? `?${q}` : ''}`)
    },
    get: (id: string) => get<Event>(`/events/${id}`),
  },
  projects: {
    list: () => get<Project[]>('/projects'),
  },
  reviews: {
    current: () => get<Review>('/reviews/current'),
    complete: (id: string, reflection: string) =>
      post<{ ok: boolean }>(`/reviews/${id}/complete`, { reflection }),
  },
  insights: {
    list: (params?: { status?: string; type?: string }) => {
      const q = new URLSearchParams(
        Object.fromEntries(
          Object.entries(params ?? {}).filter(([, v]) => v !== undefined)
        ) as Record<string, string>
      ).toString()
      return get<Insight[]>(`/insights${q ? `?${q}` : ''}`)
    },
    get: (id: string) => get<Insight>(`/insights/${id}`),
  },
  agentConfig: {
    get: () => get<AgentConfig | null>('/agent-config'),
    save: (body: AgentConfigInput) => put<AgentConfig>('/agent-config', body),
    delete: () => del<{ ok: boolean }>('/agent-config'),
    test: () => post<AgentTestResult>('/agent-config/test', {}),
  },
  output: {
    summary: () => get<OutputSummary>('/output/summary'),
    eventById: (eventId: string) => get<OutputEvent>(`/output/events/${eventId}`),
    events: (params?: { cursor?: string; limit?: number; repoId?: number; projectId?: string; state?: OutputLifecycleState }) => {
      const q = new URLSearchParams(
        Object.fromEntries(
          Object.entries({
            cursor: params?.cursor,
            limit: params?.limit?.toString(),
            repo_id: params?.repoId?.toString(),
            project_id: params?.projectId,
            state: params?.state,
          }).filter(([, v]) => v !== undefined)
        ) as Record<string, string>
      ).toString()
      return get<OutputEventsPage>(`/output/events${q ? `?${q}` : ''}`)
    },
    syncStatus: () => get<{ repos: RepoSyncState[] }>('/output/sync-status'),
    triggerSync: (repoId?: number) =>
      post<TriggerSyncResponse>('/output/sync', repoId !== undefined ? { repo_id: repoId } : {}),
    listBindings: () => get<RepoBinding[]>('/output/repo-bindings'),
    upsertBinding: (body: UpsertRepoBindingRequest) =>
      post<RepoBinding>('/output/repo-bindings', body),
  },
  githubConfig: {
    get: () => get<GithubConfig | null>('/github-config'),
    save: (token: string) => put<GithubConfig>('/github-config', { token }),
    setAutoSync: (enabled: boolean) => put<GithubConfig>('/github-config/auto-sync', { enabled }),
    delete: () => del<{ ok: boolean }>('/github-config'),
    test: () => post<{ ok: boolean; login?: string; scopes?: string; error?: string }>('/github-config/test', {}),
    repos: () => get<{ repos: GithubRepo[] }>('/github-config/repos'),
  },
  associations: {
    list: (params: { project_id: string; status?: string; cursor?: string; limit?: number }) => {
      const q = new URLSearchParams(
        Object.fromEntries(
          Object.entries(params).filter(([, v]) => v !== undefined)
        ) as Record<string, string>
      ).toString()
      return get<AssociationsPage>(`/associations${q ? `?${q}` : ''}`)
    },
    confirm: (id: string) =>
      post<{ association: Association; insight: Insight }>(`/associations/${id}/confirm`, {}),
    reject: (id: string) =>
      post<{ association: Association }>(`/associations/${id}/reject`, {}),
    batchReview: (body: BatchReviewRequest) =>
      post<BatchReviewResponse>('/associations/batch-review', body),
  },
}

export interface AgentTestResult {
  ok: boolean
  url?: string
  request_body?: string
  response_status?: number
  response_body?: string
  error?: string
}

export const queryKeys = {
  entries: (status?: string) => ['entries', status] as const,
  events: (params?: object) => ['events', params] as const,
  projects: () => ['projects'] as const,
  reviewCurrent: () => ['reviews', 'current'] as const,
  insights: (params?: object) => ['insights', params] as const,
  agentConfig: () => ['agent-config'] as const,
  agentHealth: () => ['agent-health'] as const,
  outputSummary: () => ['output', 'summary'] as const,
  outputEvents: (params?: object) => ['output', 'events', params] as const,
  outputSyncStatus: () => ['output', 'sync-status'] as const,
  outputBindings: () => ['output', 'repo-bindings'] as const,
  githubConfig: () => ['github-config'] as const,
  githubRepos: () => ['github-config', 'repos'] as const,
  associations: (params?: object) => ['associations', params] as const,
}

export type { OutputLifecycleState, OutputEvent, OutputSummary, RepoBinding, RepoSyncState, GithubConfig, GithubRepo, Association, AssociationsPage, BatchReviewRequest, BatchReviewResponse }
