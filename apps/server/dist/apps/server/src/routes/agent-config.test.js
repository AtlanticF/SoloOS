import { describe, it, expect, beforeEach } from 'vitest';
import { createApp } from '../index';
import { createTestDb } from '../db/index';
describe('GET /api/agent-config', () => {
    let app;
    beforeEach(() => {
        app = createApp(createTestDb());
    });
    it('returns null when no config exists', async () => {
        const res = await app.request('/api/agent-config');
        expect(res.status).toBe(200);
        const body = await res.json();
        expect(body).toBeNull();
    });
});
describe('PUT /api/agent-config', () => {
    let app;
    beforeEach(() => {
        app = createApp(createTestDb());
    });
    it('creates and returns masked config', async () => {
        const res = await app.request('/api/agent-config', {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                provider: 'openai',
                model: 'gpt-4o-mini',
                api_key: 'sk-test-abc1234',
            }),
        });
        expect(res.status).toBe(200);
        const body = await res.json();
        expect(body.provider).toBe('openai');
        expect(body.model).toBe('gpt-4o-mini');
        expect(body.api_key_masked).not.toContain('sk-test-abc1234');
        expect(body.api_key_masked).toContain('****');
    });
    it('overwrites existing config on second PUT', async () => {
        await app.request('/api/agent-config', {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ provider: 'openai', model: 'gpt-4o-mini', api_key: 'sk-first' }),
        });
        const res = await app.request('/api/agent-config', {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ provider: 'anthropic', model: 'claude-3-5-haiku-latest', api_key: 'sk-second' }),
        });
        expect(res.status).toBe(200);
        const body = await res.json();
        expect(body.provider).toBe('anthropic');
    });
    it('returns 400 for invalid provider', async () => {
        const res = await app.request('/api/agent-config', {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ provider: 'invalid-provider', model: 'x', api_key: 'key' }),
        });
        expect(res.status).toBe(400);
    });
    it('returns 400 when api_key missing', async () => {
        const res = await app.request('/api/agent-config', {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ provider: 'openai', model: 'gpt-4o' }),
        });
        expect(res.status).toBe(400);
    });
});
describe('DELETE /api/agent-config', () => {
    let app;
    beforeEach(() => {
        app = createApp(createTestDb());
    });
    it('deletes config and subsequent GET returns null', async () => {
        await app.request('/api/agent-config', {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ provider: 'openai', model: 'gpt-4o-mini', api_key: 'sk-test' }),
        });
        await app.request('/api/agent-config', { method: 'DELETE' });
        const res = await app.request('/api/agent-config');
        expect(res.status).toBe(200);
        expect(await res.json()).toBeNull();
    });
});
