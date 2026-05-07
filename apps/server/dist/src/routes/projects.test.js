import { describe, it, expect, beforeEach } from 'vitest';
import { createApp } from '../index';
import { createTestDb } from '../db/index';
describe('GET /api/projects', () => {
    let app;
    beforeEach(() => {
        app = createApp(createTestDb());
    });
    it('returns empty array when no projects', async () => {
        const res = await app.request('/api/projects');
        expect(res.status).toBe(200);
        const body = await res.json();
        expect(body).toHaveLength(0);
    });
    it('POST creates a project and returns 201', async () => {
        const res = await app.request('/api/projects', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ name: 'TestProject', match_rules: { repos: ['test-repo'] } }),
        });
        expect(res.status).toBe(201);
        const body = await res.json();
        expect(body.name).toBe('TestProject');
        expect(body.is_auto).toBe(false);
    });
    it('POST with missing name returns 400', async () => {
        const res = await app.request('/api/projects', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({}),
        });
        expect(res.status).toBe(400);
    });
});
describe('findOrCreateProject', () => {
    let db;
    beforeEach(() => {
        db = createTestDb();
    });
    it('creates a new project for an unknown repo', async () => {
        const { findOrCreateProject } = await import('./projects');
        const id = await findOrCreateProject(db, 'new-repo');
        expect(typeof id).toBe('string');
    });
    it('returns the same project ID on second call', async () => {
        const { findOrCreateProject } = await import('./projects');
        const id1 = await findOrCreateProject(db, 'same-repo');
        const id2 = await findOrCreateProject(db, 'same-repo');
        expect(id1).toBe(id2);
    });
});
