const BASE = '/api';
async function get(path) {
    const res = await fetch(`${BASE}${path}`);
    if (!res.ok)
        throw new Error(`API error: ${res.status}`);
    return res.json();
}
async function post(path, body) {
    const res = await fetch(`${BASE}${path}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
    });
    if (!res.ok)
        throw new Error(`API error: ${res.status}`);
    return res.json();
}
async function put(path, body) {
    const res = await fetch(`${BASE}${path}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
    });
    if (!res.ok)
        throw new Error(`API error: ${res.status}`);
    return res.json();
}
async function del(path) {
    const res = await fetch(`${BASE}${path}`, { method: 'DELETE' });
    if (!res.ok)
        throw new Error(`API error: ${res.status}`);
    return res.json();
}
export const api = {
    entries: {
        list: (status) => get(`/entries${status ? `?status=${status}` : ''}`),
        capture: (content, pillar = 'INPUT') => post('/entries', { content, source: 'browser-ext', pillar }),
    },
    events: {
        list: (params) => {
            const q = new URLSearchParams(Object.fromEntries(Object.entries(params ?? {}).filter(([, v]) => v !== undefined))).toString();
            return get(`/events${q ? `?${q}` : ''}`);
        },
        get: (id) => get(`/events/${id}`),
    },
    projects: {
        list: () => get('/projects'),
    },
    reviews: {
        current: () => get('/reviews/current'),
        complete: (id, reflection) => post(`/reviews/${id}/complete`, { reflection }),
    },
    insights: {
        list: (params) => {
            const q = new URLSearchParams(Object.fromEntries(Object.entries(params ?? {}).filter(([, v]) => v !== undefined))).toString();
            return get(`/insights${q ? `?${q}` : ''}`);
        },
        get: (id) => get(`/insights/${id}`),
    },
    agentConfig: {
        get: () => get('/agent-config'),
        save: (body) => put('/agent-config', body),
        delete: () => del('/agent-config'),
        test: () => post('/agent-config/test', {}),
    },
    output: {
        summary: () => get('/output/summary'),
        eventById: (eventId) => get(`/output/events/${eventId}`),
        events: (params) => {
            const q = new URLSearchParams(Object.fromEntries(Object.entries({
                cursor: params?.cursor,
                limit: params?.limit?.toString(),
                repo_id: params?.repoId?.toString(),
                project_id: params?.projectId,
                state: params?.state,
            }).filter(([, v]) => v !== undefined))).toString();
            return get(`/output/events${q ? `?${q}` : ''}`);
        },
        syncStatus: () => get('/output/sync-status'),
        triggerSync: (repoId) => post('/output/sync', repoId !== undefined ? { repo_id: repoId } : {}),
        listBindings: () => get('/output/repo-bindings'),
        upsertBinding: (body) => post('/output/repo-bindings', body),
    },
    githubConfig: {
        get: () => get('/github-config'),
        save: (token) => put('/github-config', { token }),
        setAutoSync: (enabled) => put('/github-config/auto-sync', { enabled }),
        delete: () => del('/github-config'),
        test: () => post('/github-config/test', {}),
        repos: () => get('/github-config/repos'),
    },
    associations: {
        list: (params) => {
            const q = new URLSearchParams(Object.fromEntries(Object.entries(params).filter(([, v]) => v !== undefined))).toString();
            return get(`/associations${q ? `?${q}` : ''}`);
        },
        confirm: (id) => post(`/associations/${id}/confirm`, {}),
        reject: (id) => post(`/associations/${id}/reject`, {}),
        batchReview: (body) => post('/associations/batch-review', body),
    },
};
export const queryKeys = {
    entries: (status) => ['entries', status],
    events: (params) => ['events', params],
    projects: () => ['projects'],
    reviewCurrent: () => ['reviews', 'current'],
    insights: (params) => ['insights', params],
    agentConfig: () => ['agent-config'],
    agentHealth: () => ['agent-health'],
    outputSummary: () => ['output', 'summary'],
    outputEvents: (params) => ['output', 'events', params],
    outputSyncStatus: () => ['output', 'sync-status'],
    outputBindings: () => ['output', 'repo-bindings'],
    githubConfig: () => ['github-config'],
    githubRepos: () => ['github-config', 'repos'],
    associations: (params) => ['associations', params],
};
