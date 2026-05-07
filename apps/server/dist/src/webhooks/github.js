import { Hono } from 'hono';
import { randomUUID } from 'crypto';
import * as schema from '../db/schema';
import { findOrCreateProject } from '../routes/projects';
export function githubWebhook(db) {
    const app = new Hono();
    app.post('/', async (c) => {
        const event = c.req.header('X-GitHub-Event');
        if (event !== 'push')
            return c.json({ ok: true });
        const payload = await c.req.json();
        if (!payload.head_commit)
            return c.json({ ok: true });
        const now = Math.floor(Date.now() / 1000);
        const repoName = payload.repository.name;
        const commitMsg = payload.head_commit.message;
        const occurredAt = Math.floor(new Date(payload.head_commit.timestamp).getTime() / 1000);
        const entry = {
            id: randomUUID(),
            content: `[${repoName}] ${commitMsg}`,
            source: 'github',
            status: 'processed',
            quick_tags: '[]',
            created_at: now,
        };
        await db.insert(schema.entries).values(entry);
        const projectId = await findOrCreateProject(db, repoName);
        await db.insert(schema.events).values({
            id: randomUUID(),
            entry_id: entry.id,
            pillar: 'OUTPUT',
            project_id: projectId,
            impact_score: 1,
            classifier: 'rule',
            metadata: JSON.stringify({ repo: repoName, commit: commitMsg }),
            occurred_at: occurredAt,
            created_at: now,
        });
        return c.json({ ok: true });
    });
    return app;
}
