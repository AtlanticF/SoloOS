import type { Entry, Event, Project, Review } from '@soloos/shared'

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

export const api = {
  entries: {
    list: (status?: string) => get<Entry[]>(`/entries${status ? `?status=${status}` : ''}`),
    create: (body: { content: string; source?: string }) => post<Entry>('/entries', body),
  },
  events: {
    list: (params?: { pillar?: string; project_id?: string }) => {
      const q = new URLSearchParams(params as Record<string, string>).toString()
      return get<Event[]>(`/events${q ? `?${q}` : ''}`)
    },
  },
  projects: {
    list: () => get<Project[]>('/projects'),
  },
  reviews: {
    current: () => get<Review>('/reviews/current'),
    complete: (id: string, reflection: string) =>
      post<{ ok: boolean }>(`/reviews/${id}/complete`, { reflection }),
  },
}

export const queryKeys = {
  entries: (status?: string) => ['entries', status] as const,
  events: (params?: object) => ['events', params] as const,
  projects: () => ['projects'] as const,
  reviewCurrent: () => ['reviews', 'current'] as const,
}
