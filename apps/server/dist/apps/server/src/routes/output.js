import { Hono } from 'hono';
import { getOutputSummary, listOutputEvents, listRepoBindings, upsertRepoBinding, getSyncStatus, triggerSync, } from '../output/output-service';
const OUTPUT_STATES = ['DRAFT', 'ACTIVE', 'VALUATED', 'GHOST', 'ARCHIVED'];
export function outputRouter(db) {
    const app = new Hono();
    // GET /api/output/summary
    app.get('/summary', async (c) => {
        const summary = await getOutputSummary(db);
        return c.json(summary);
    });
    // GET /api/output/events
    app.get('/events', async (c) => {
        const cursor = c.req.query('cursor');
        const limitRaw = c.req.query('limit');
        const repoIdRaw = c.req.query('repo_id');
        const projectId = c.req.query('project_id');
        const state = c.req.query('state');
        const limit = limitRaw ? Number(limitRaw) : 50;
        if (isNaN(limit) || limit < 1 || limit > 100) {
            return c.json({ code: 'INVALID_BINDING', message: 'limit must be 1-100', retryable: false, hint: null }, 400);
        }
        const repoId = repoIdRaw ? Number(repoIdRaw) : undefined;
        if (repoIdRaw && isNaN(repoId)) {
            return c.json({ code: 'INVALID_BINDING', message: 'repo_id must be a number', retryable: false, hint: null }, 400);
        }
        if (state && !OUTPUT_STATES.includes(state)) {
            return c.json({ code: 'INVALID_BINDING', message: `state must be one of ${OUTPUT_STATES.join(', ')}`, retryable: false, hint: null }, 400);
        }
        const page = await listOutputEvents(db, { cursor, limit, repoId, projectId, state });
        return c.json(page);
    });
    // GET /api/output/sync-status
    app.get('/sync-status', async (c) => {
        const repos = await getSyncStatus(db);
        return c.json({ repos });
    });
    // POST /api/output/sync
    app.post('/sync', async (c) => {
        let body = {};
        try {
            const raw = await c.req.json().catch(() => null);
            if (raw && typeof raw === 'object')
                body = raw;
        }
        catch {
            // no body is fine
        }
        const repoId = body.repo_id ? Number(body.repo_id) : undefined;
        try {
            const result = await triggerSync(db, repoId);
            if (result.status === 'running' && !result.accepted) {
                return c.json({ code: 'SYNC_IN_PROGRESS', message: 'A sync is already running.', retryable: false, hint: 'Wait for it to finish.' }, 409);
            }
            return c.json(result);
        }
        catch (err) {
            const msg = err instanceof Error ? err.message : 'Unknown error';
            if (msg.includes('GITHUB_TOKEN')) {
                return c.json({ code: 'UNAUTHORIZED_GITHUB', message: 'GitHub token missing or invalid.', retryable: false, hint: 'Set GITHUB_TOKEN in your environment.' }, 401);
            }
            return c.json({ code: 'INTERNAL_ERROR', message: msg, retryable: true, hint: null }, 500);
        }
    });
    // GET /api/output/repo-bindings
    app.get('/repo-bindings', async (c) => {
        const bindings = await listRepoBindings(db);
        return c.json(bindings);
    });
    // POST /api/output/repo-bindings
    app.post('/repo-bindings', async (c) => {
        let body;
        try {
            body = await c.req.json();
        }
        catch {
            return c.json({ code: 'INVALID_BINDING', message: 'invalid JSON', retryable: false, hint: null }, 400);
        }
        if (!body.repo_id || typeof body.repo_id !== 'number') {
            return c.json({ code: 'INVALID_BINDING', message: 'repo_id is required and must be a number', retryable: false, hint: null }, 400);
        }
        if (!body.repo_name || typeof body.repo_name !== 'string') {
            return c.json({ code: 'INVALID_BINDING', message: 'repo_name is required', retryable: false, hint: null }, 400);
        }
        if (!body.repo_full_name || typeof body.repo_full_name !== 'string') {
            return c.json({ code: 'INVALID_BINDING', message: 'repo_full_name is required', retryable: false, hint: null }, 400);
        }
        const binding = await upsertRepoBinding(db, {
            repo_id: body.repo_id,
            repo_name: body.repo_name,
            repo_full_name: body.repo_full_name,
            project_id: body.project_id ?? null,
        });
        return c.json(binding);
    });
    return app;
}
