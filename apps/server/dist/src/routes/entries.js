import { Hono } from 'hono';
import { eq } from 'drizzle-orm';
import { randomUUID } from 'crypto';
import * as schema from '../db/schema';
import { applyRules } from '../classifiers/rules';
import { processInputCapture } from '../input/insight-service';
export function entriesRouter(db) {
    const app = new Hono();
    app.get('/', async (c) => {
        const status = c.req.query('status');
        if (status && status !== 'pending' && status !== 'processed') {
            return c.json({ error: 'invalid status' }, 400);
        }
        const rows = status
            ? await db.select().from(schema.entries).where(eq(schema.entries.status, status))
            : await db.select().from(schema.entries);
        return c.json(rows.map(deserialize));
    });
    app.post('/', async (c) => {
        let body;
        try {
            body = await c.req.json();
        }
        catch {
            return c.json({ error: 'invalid JSON' }, 400);
        }
        if (!body?.content || typeof body.content !== 'string') {
            return c.json({ error: 'content is required' }, 400);
        }
        const now = Math.floor(Date.now() / 1000);
        const source = body.source ?? 'cli';
        // Detect pillar via rules first
        const pillar = applyRules({ content: body.content, source });
        const entry = {
            id: randomUUID(),
            content: body.content,
            source,
            status: pillar ? 'processed' : 'pending',
            quick_tags: JSON.stringify(body.quick_tags ?? []),
            created_at: now,
        };
        await db.insert(schema.entries).values(entry);
        // INPUT captures go through the semantic parser pipeline
        if (pillar === 'INPUT') {
            const capture = await processInputCapture(db, entry.id, body.content);
            const entryRow = await db.select().from(schema.entries).where(eq(schema.entries.id, entry.id));
            return c.json({ ...deserialize(entryRow[0]), capture }, 201);
        }
        // Non-INPUT pillars use the original event creation path
        if (pillar) {
            await db.insert(schema.events).values({
                id: randomUUID(),
                entry_id: entry.id,
                pillar,
                project_id: null,
                impact_score: 1,
                classifier: 'rule',
                metadata: '{}',
                occurred_at: now,
                created_at: now,
            });
        }
        return c.json(deserialize(entry), 201);
    });
    return app;
}
function deserialize(row) {
    return {
        ...row,
        quick_tags: JSON.parse(row.quick_tags),
    };
}
