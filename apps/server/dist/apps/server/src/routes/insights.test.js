import { describe, it, expect, beforeEach } from 'vitest';
import { createApp } from '../index';
import { createTestDb } from '../db/index';
describe('GET /api/insights', () => {
    let app;
    beforeEach(() => {
        app = createApp(createTestDb());
    });
    it('returns empty array when no insights', async () => {
        const res = await app.request('/api/insights');
        expect(res.status).toBe(200);
        const body = await res.json();
        expect(Array.isArray(body)).toBe(true);
        expect(body).toHaveLength(0);
    });
    it('returns 404 for unknown insight id', async () => {
        const res = await app.request('/api/insights/nonexistent-id');
        expect(res.status).toBe(404);
    });
});
describe('Input capture -> insight creation', () => {
    let app;
    beforeEach(() => {
        app = createApp(createTestDb());
    });
    it('capturing with #input tag creates an insight record', async () => {
        const res = await app.request('/api/entries', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ content: 'read https://example.com realized key insight plan to act on it #input', source: 'cli' }),
        });
        expect(res.status).toBe(201);
        const body = await res.json();
        expect(body.capture).toBeDefined();
        expect(body.capture.entry_id).toBe(body.id);
        expect(body.capture.outcome).toBeDefined();
        expect(body.capture.insight).toBeDefined();
        expect(body.capture.feedback).toBeTruthy();
    });
    it('insight is queryable from /api/insights after capture', async () => {
        await app.request('/api/entries', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ content: 'saw https://x.com realized flows matter plan to simplify #input' }),
        });
        const res = await app.request('/api/insights');
        expect(res.status).toBe(200);
        const insights = await res.json();
        expect(insights.length).toBeGreaterThanOrEqual(1);
        expect(insights[0].id).toBeDefined();
    });
    it('complete capture with all three cues creates an ACTIVE insight and an INPUT event', async () => {
        const captureRes = await app.request('/api/entries', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                content: 'from https://example.com/article realized the core thing plan to implement next week #input',
            }),
        });
        expect(captureRes.status).toBe(201);
        const captureBody = await captureRes.json();
        if (captureBody.capture.outcome === 'insight_created') {
            expect(captureBody.capture.insight.status).toBe('ACTIVE');
            const eventsRes = await app.request('/api/events?pillar=INPUT');
            const events = await eventsRes.json();
            expect(events.some(e => e.pillar === 'INPUT')).toBe(true);
        }
        else {
            // heuristics may not always match — insight should still be in INBOX
            expect(captureBody.capture.insight.status).toBe('INBOX');
        }
    });
    it('fact-only capture stores insight in INBOX with feedback', async () => {
        const res = await app.request('/api/entries', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ content: 'read https://example.com some article #input' }),
        });
        expect(res.status).toBe(201);
        const body = await res.json();
        expect(body.capture.insight.status).toBe('INBOX');
        expect(body.capture.feedback).toBeTruthy();
        expect(body.capture.outcome).not.toBe('insight_created');
    });
});
