const FACT_PATTERNS = [
    /https?:\/\/\S+/i,
    /(?:看了|读了|看到|read|saw|via|from|source:|来源[：:])\s*(.+?)(?:[,，。.!？?]|$)/i,
    /《.+?》/,
    /\b[\w\s]+(?:said|says|wrote|writes|argues|claims)\b/i,
];
const SYNTHESIS_PATTERNS = [
    /(?:意识到|发现|觉得|认为|感觉|realized|noticed|found|think|believe|key insight|the point is|core idea)[：:，,\s]*(.+?)(?:[，,。.!！?？]|$)/i,
    /(?:本质|核心|关键|重点|insight)[是：:]\s*(.+?)(?:[。.!！?？]|$)/i,
];
const VECTOR_PATTERNS = [
    /(?:打算|计划|准备|想要|want to|plan to|going to|will|next step|action|→|=>)[：:，,\s]*(.+?)(?:[，,。.!！?？]|$)/i,
    /(?:应该|需要|should|need to)\s*(.+?)(?:[。.!！?？]|$)/i,
];
function matchFirst(text, patterns) {
    for (const p of patterns) {
        const m = text.match(p);
        if (m)
            return (m[1] ?? m[0]).trim().slice(0, 300);
    }
    return '';
}
export function heuristicParse(raw) {
    const text = raw.trim();
    const fact = matchFirst(text, FACT_PATTERNS);
    const synthesis = matchFirst(text, SYNTHESIS_PATTERNS);
    const vector = matchFirst(text, VECTOR_PATTERNS);
    const missing = [];
    if (!fact)
        missing.push('fact');
    if (!synthesis)
        missing.push('synthesis');
    if (!vector)
        missing.push('vector');
    const certainty = (3 - missing.length) / 3;
    return { fact, synthesis, vector, certainty, missing };
}
export function deriveInsightType(content, raw) {
    const all = `${raw} ${content.fact} ${content.synthesis}`.toLowerCase();
    if (/strategy|strategic|business model|一人公司|商业|战略|framework|methodology/.test(all))
        return 'STRATEGY';
    if (/tech|code|implement|api|library|sdk|工程|技术|架构|architecture|pattern/.test(all))
        return 'TECHNIQUE';
    if (/market|user|pain|competitor|demand|product|市场|用户|痛点|竞争/.test(all))
        return 'MARKET';
    return 'SEED';
}
export function deriveOutcome(missing, certainty) {
    if (certainty === 1)
        return 'insight_created';
    if (missing.includes('vector'))
        return 'stored_in_inbox_missing_vector';
    if (missing.includes('synthesis'))
        return 'stored_in_inbox_missing_synthesis';
    if (missing.includes('fact'))
        return 'stored_in_inbox_missing_fact';
    return 'stored_pending';
}
export function buildFeedback(outcome, lang = 'en') {
    const messages = {
        insight_created: '✓ Insight captured and activated.',
        stored_in_inbox_missing_vector: '⚠ Captured to Inbox — missing Action Vector (what do you plan to do with this?).',
        stored_in_inbox_missing_synthesis: "⚠ Captured to Inbox — missing Synthesis (what's your key takeaway?).",
        stored_in_inbox_missing_fact: "⚠ Captured to Inbox — missing Source/Fact (where did this come from?).",
        stored_pending: '↳ Stored as pending entry.',
    };
    return messages[outcome];
}
