import { randomUUID } from 'crypto';
import { eq } from 'drizzle-orm';
import * as schema from '../db/schema';
import { heuristicParse, deriveInsightType, deriveOutcome, buildFeedback } from './heuristic-parser';
import { agentParseInsight } from '../agent/insight-parser-agent';
import { getAgentConfigRaw } from '../agent/config-service';
function deserialize(row) {
    return {
        id: row.id,
        entry_id: row.entry_id,
        event_id: row.event_id ?? null,
        type: row.type,
        content: {
            fact: row.fact,
            synthesis: row.synthesis,
            vector: row.vector,
        },
        metrics: {
            value_score: row.value_score,
            shelf_life: row.shelf_life,
            certainty: row.certainty,
        },
        status: row.status,
        project_id: row.project_id ?? null,
        cluster_id: row.cluster_id ?? null,
        created_at: row.created_at,
        updated_at: row.updated_at,
    };
}
export async function processInputCapture(db, entry_id, raw) {
    const now = Math.floor(Date.now() / 1000);
    // Step 1: heuristic extraction
    let { fact, synthesis, vector, certainty, missing } = heuristicParse(raw);
    // Step 2: agent fallback for any missing fields
    if (missing.length > 0) {
        try {
            const agentConfig = await getAgentConfigRaw(db);
            if (agentConfig) {
                const agentResult = await agentParseInsight(raw, agentConfig);
                if (agentResult) {
                    if (!fact && agentResult.content.fact)
                        fact = agentResult.content.fact;
                    if (!synthesis && agentResult.content.synthesis)
                        synthesis = agentResult.content.synthesis;
                    if (!vector && agentResult.content.vector)
                        vector = agentResult.content.vector;
                    // recompute missing / certainty
                    missing = [];
                    if (!fact)
                        missing.push('fact');
                    if (!synthesis)
                        missing.push('synthesis');
                    if (!vector)
                        missing.push('vector');
                    certainty = (3 - missing.length) / 3;
                }
            }
        }
        catch {
            // agent unavailable — fall back to heuristic result silently
        }
    }
    const content = { fact, synthesis, vector };
    const type = deriveInsightType(content, raw);
    const outcome = deriveOutcome(missing, certainty);
    const status = outcome === 'insight_created' ? 'ACTIVE' : 'INBOX';
    // Step 3: persist insight regardless of completeness
    const insightId = randomUUID();
    await db.insert(schema.insights).values({
        id: insightId,
        entry_id,
        event_id: null,
        type,
        fact,
        synthesis,
        vector,
        value_score: 5,
        shelf_life: 'LONG',
        certainty,
        status,
        project_id: null,
        cluster_id: null,
        created_at: now,
        updated_at: now,
    });
    // Step 4: if complete, create an INPUT event and link it
    let eventId = null;
    if (outcome === 'insight_created') {
        eventId = randomUUID();
        await db.insert(schema.events).values({
            id: eventId,
            entry_id,
            pillar: 'INPUT',
            project_id: null,
            impact_score: 1,
            classifier: 'api-key',
            metadata: JSON.stringify({ insight_id: insightId }),
            occurred_at: now,
            created_at: now,
        });
        // link event back to insight
        await db.update(schema.insights)
            .set({ event_id: eventId })
            .where(eq(schema.insights.id, insightId));
        // mark entry processed
        await db.update(schema.entries)
            .set({ status: 'processed' })
            .where(eq(schema.entries.id, entry_id));
    }
    const rows = await db.select().from(schema.insights).where(eq(schema.insights.id, insightId));
    const insight = deserialize(rows[0]);
    return {
        entry_id,
        outcome,
        insight,
        feedback: buildFeedback(outcome),
    };
}
export async function getInsight(db, id) {
    const rows = await db.select().from(schema.insights).where(eq(schema.insights.id, id));
    return rows[0] ? deserialize(rows[0]) : null;
}
export async function listInsights(db, params) {
    const rows = await db.select().from(schema.insights).orderBy(schema.insights.created_at);
    return rows
        .filter(r => !params.status || r.status === params.status)
        .filter(r => !params.type || r.type === params.type)
        .slice(0, params.limit ?? 100)
        .map(deserialize);
}
