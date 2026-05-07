import { Hono } from 'hono';
import { getInsight, listInsights } from '../input/insight-service';
export function insightsRouter(db) {
    const app = new Hono();
    app.get('/', async (c) => {
        const status = c.req.query('status');
        const type = c.req.query('type');
        const limit = c.req.query('limit') ? Number(c.req.query('limit')) : 100;
        const insights = await listInsights(db, { status, type, limit });
        return c.json(insights);
    });
    app.get('/:id', async (c) => {
        const insight = await getInsight(db, c.req.param('id'));
        if (!insight)
            return c.json({ error: 'not found' }, 404);
        return c.json(insight);
    });
    return app;
}
