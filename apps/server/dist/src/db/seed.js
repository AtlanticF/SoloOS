import { getDb } from './index';
import * as schema from './schema';
const db = getDb();
// Timestamps — all relative to 2026-04-21 (today)
const now = () => Math.floor(Date.now() / 1000);
const daysAgo = (d, h = 0) => now() - d * 86400 - h * 3600;
// ─── Projects ────────────────────────────────────────────────────────────────
const projects = [
    {
        id: 'proj_soloos',
        name: 'SoloOS',
        status: 'active',
        match_rules: JSON.stringify({ keywords: ['soloos', 'solo os', 'business loop'] }),
        is_auto: 1,
        first_event_at: daysAgo(30),
        last_event_at: daysAgo(0, 2),
        created_at: daysAgo(30),
    },
    {
        id: 'proj_newsletter',
        name: 'Indie Dispatch',
        status: 'active',
        match_rules: JSON.stringify({ keywords: ['newsletter', 'indie dispatch', 'subscribers'] }),
        is_auto: 1,
        first_event_at: daysAgo(21),
        last_event_at: daysAgo(1),
        created_at: daysAgo(21),
    },
    {
        id: 'proj_consulting',
        name: 'Consulting',
        status: 'active',
        match_rules: JSON.stringify({ keywords: ['client', 'consulting', 'retainer'] }),
        is_auto: 1,
        first_event_at: daysAgo(28),
        last_event_at: daysAgo(3),
        created_at: daysAgo(28),
    },
    {
        id: 'proj_oss_plugin',
        name: 'shadcn-timeline',
        status: 'active',
        match_rules: JSON.stringify({ keywords: ['shadcn-timeline', 'timeline plugin', 'npm publish'] }),
        is_auto: 1,
        first_event_at: daysAgo(14),
        last_event_at: daysAgo(2),
        created_at: daysAgo(14),
    },
    {
        id: 'proj_course',
        name: 'Local-First Dev Course',
        status: 'dormant',
        match_rules: JSON.stringify({ keywords: ['course', 'local-first', 'drizzle course'] }),
        is_auto: 1,
        first_event_at: daysAgo(60),
        last_event_at: daysAgo(18),
        created_at: daysAgo(60),
    },
];
// ─── Entries ─────────────────────────────────────────────────────────────────
const entries = [
    // INPUT — research & reading
    {
        id: 'ent_001',
        content: 'Read "Shape Up" by Ryan Singer — strong framing around appetite vs estimate. Will adopt fixed-time cycles. #input',
        source: 'cli',
        status: 'processed',
        quick_tags: JSON.stringify(['#input', 'reading']),
        created_at: daysAgo(20),
    },
    {
        id: 'ent_002',
        content: 'Watched full Remix v3 talk — nested routes and progressive enhancement philosophy resonates. #input',
        source: 'cli',
        status: 'processed',
        quick_tags: JSON.stringify(['#input', 'video']),
        created_at: daysAgo(17),
    },
    {
        id: 'ent_003',
        content: 'Read Paul Graham "Do Things That Don\'t Scale" — direct application to current newsletter cold outreach strategy. #input',
        source: 'cli',
        status: 'processed',
        quick_tags: JSON.stringify(['#input', 'reading', 'strategy']),
        created_at: daysAgo(12),
    },
    {
        id: 'ent_004',
        content: 'Finished Drizzle ORM docs end-to-end. Relational queries API is clean. Switching project from Prisma. #input',
        source: 'cli',
        status: 'processed',
        quick_tags: JSON.stringify(['#input', 'docs', 'drizzle']),
        created_at: daysAgo(9),
    },
    {
        id: 'ent_005',
        content: 'Studied Stripe webhook signature verification in depth — idempotency key patterns are critical for financial events. #input',
        source: 'cli',
        status: 'processed',
        quick_tags: JSON.stringify(['#input', 'stripe', 'webhooks']),
        created_at: daysAgo(6),
    },
    // OUTPUT — commits via GitHub webhook
    {
        id: 'ent_006',
        content: 'feat: implement entries API with Drizzle ORM and SQLite',
        source: 'github',
        status: 'processed',
        quick_tags: JSON.stringify([]),
        created_at: daysAgo(19),
    },
    {
        id: 'ent_007',
        content: 'feat: add event batch processing endpoint with pillar classification',
        source: 'github',
        status: 'processed',
        quick_tags: JSON.stringify([]),
        created_at: daysAgo(16),
    },
    {
        id: 'ent_008',
        content: 'fix: correct filter chaining in events route using and() combinator',
        source: 'github',
        status: 'processed',
        quick_tags: JSON.stringify([]),
        created_at: daysAgo(15),
    },
    {
        id: 'ent_009',
        content: 'feat: add Cockpit page with PulseCards and RadarChart',
        source: 'github',
        status: 'processed',
        quick_tags: JSON.stringify([]),
        created_at: daysAgo(11),
    },
    {
        id: 'ent_010',
        content: 'feat: implement NodeSheet slide-over with RelationChain and Calibration',
        source: 'github',
        status: 'processed',
        quick_tags: JSON.stringify([]),
        created_at: daysAgo(8),
    },
    {
        id: 'ent_011',
        content: 'feat: publish shadcn-timeline v0.2.1 with keyboard navigation',
        source: 'github',
        status: 'processed',
        quick_tags: JSON.stringify([]),
        created_at: daysAgo(7),
    },
    {
        id: 'ent_012',
        content: 'feat: weekly review page with reflection gate',
        source: 'github',
        status: 'processed',
        quick_tags: JSON.stringify([]),
        created_at: daysAgo(4),
    },
    {
        id: 'ent_013',
        content: 'fix: ESM/CJS mismatch in tailwind.config.js breaks Vite dev server',
        source: 'github',
        status: 'processed',
        quick_tags: JSON.stringify([]),
        created_at: daysAgo(0, 3),
    },
    // AUDIENCE — growth & meetings
    {
        id: 'ent_014',
        content: 'Indie Dispatch hit 500 subscribers today. Steady 8% WoW growth for last 6 weeks. #audience',
        source: 'cli',
        status: 'processed',
        quick_tags: JSON.stringify(['#audience', 'newsletter', 'milestone']),
        created_at: daysAgo(18),
    },
    {
        id: 'ent_015',
        content: 'Cold outreach to 12 indie founders — 4 replied, 2 booked calls. Better than expected 33% response rate. #audience',
        source: 'cli',
        status: 'processed',
        quick_tags: JSON.stringify(['#audience', 'outreach']),
        created_at: daysAgo(13),
    },
    {
        id: 'ent_016',
        content: 'Published "Building a Business Loop OS" thread on X. 840 impressions, 23 new followers, 6 newsletter signups. #audience',
        source: 'cli',
        status: 'processed',
        quick_tags: JSON.stringify(['#audience', 'social', 'thread']),
        created_at: daysAgo(10),
    },
    {
        id: 'ent_017',
        content: 'Podcast appearance on Indie Bites — episode drops next Thursday. Discussed local-first software philosophy. #audience',
        source: 'cli',
        status: 'processed',
        quick_tags: JSON.stringify(['#audience', 'podcast']),
        created_at: daysAgo(5),
    },
    {
        id: 'ent_018',
        content: 'Newsletter issue #34 sent — 62% open rate, 9% click-through on SoloOS waitlist CTA. 18 new signups. #audience',
        source: 'cli',
        status: 'processed',
        quick_tags: JSON.stringify(['#audience', 'newsletter', 'send']),
        created_at: daysAgo(2),
    },
    // FINANCIAL — Stripe webhooks
    {
        id: 'ent_019',
        content: 'charge.succeeded: amount=120000 currency=usd customer=cus_abc123 description=Monthly Retainer - Acme Corp',
        source: 'stripe',
        status: 'processed',
        quick_tags: JSON.stringify([]),
        created_at: daysAgo(21),
    },
    {
        id: 'ent_020',
        content: 'invoice.paid: amount_paid=49900 currency=usd customer=cus_def456 subscription=sub_ghi789 plan=Consulting Pro',
        source: 'stripe',
        status: 'processed',
        quick_tags: JSON.stringify([]),
        created_at: daysAgo(14),
    },
    {
        id: 'ent_021',
        content: 'charge.succeeded: amount=29700 currency=usd customer=cus_jkl012 description=Local-First Dev Course — Annual',
        source: 'stripe',
        status: 'processed',
        quick_tags: JSON.stringify([]),
        created_at: daysAgo(10),
    },
    {
        id: 'ent_022',
        content: 'invoice.paid: amount_paid=120000 currency=usd customer=cus_abc123 description=Monthly Retainer - Acme Corp',
        source: 'stripe',
        status: 'processed',
        quick_tags: JSON.stringify([]),
        created_at: daysAgo(0, 4),
    },
    // ENERGY — personal state
    {
        id: 'ent_023',
        content: 'Deep work session, 4 hours straight. Best focus week in a month. Sleep consistent at 7.5h. #energy',
        source: 'cli',
        status: 'processed',
        quick_tags: JSON.stringify(['#energy', 'focus', 'sleep']),
        created_at: daysAgo(22),
    },
    {
        id: 'ent_024',
        content: 'Scattered day — too many context switches between consulting and SoloOS. Need to block mornings. #energy',
        source: 'cli',
        status: 'processed',
        quick_tags: JSON.stringify(['#energy', 'focus', 'warning']),
        created_at: daysAgo(16),
    },
    {
        id: 'ent_025',
        content: 'Took Friday off completely — hiked, no screens after noon. Energy restored. Back at 95%. #energy',
        source: 'cli',
        status: 'processed',
        quick_tags: JSON.stringify(['#energy', 'recovery', 'rest']),
        created_at: daysAgo(9),
    },
    {
        id: 'ent_026',
        content: 'Woke at 5:30 three days in a row — natural, not alarm. Peak output window is 5:30–9:00 AM confirmed. #energy',
        source: 'cli',
        status: 'processed',
        quick_tags: JSON.stringify(['#energy', 'sleep', 'routine']),
        created_at: daysAgo(3),
    },
    // PENDING (unprocessed) entries
    {
        id: 'ent_027',
        content: 'Interesting idea: SoloOS could auto-generate weekly email summaries from the review data. #input',
        source: 'cli',
        status: 'pending',
        quick_tags: JSON.stringify(['#input', 'idea']),
        created_at: daysAgo(0, 1),
    },
    {
        id: 'ent_028',
        content: 'Call with potential enterprise client — they want a custom instance of SoloOS for a 5-person team. #audience',
        source: 'cli',
        status: 'pending',
        quick_tags: JSON.stringify(['#audience', 'sales', 'enterprise']),
        created_at: daysAgo(0, 0),
    },
];
// ─── Events ──────────────────────────────────────────────────────────────────
const events = [
    // INPUT
    {
        id: 'evt_001',
        entry_id: 'ent_001',
        pillar: 'INPUT',
        project_id: 'proj_soloos',
        impact_score: 3,
        classifier: 'rule',
        metadata: JSON.stringify({ tag: '#input', category: 'reading' }),
        occurred_at: daysAgo(20),
        created_at: daysAgo(20),
    },
    {
        id: 'evt_002',
        entry_id: 'ent_002',
        pillar: 'INPUT',
        project_id: null,
        impact_score: 2,
        classifier: 'rule',
        metadata: JSON.stringify({ tag: '#input', category: 'video' }),
        occurred_at: daysAgo(17),
        created_at: daysAgo(17),
    },
    {
        id: 'evt_003',
        entry_id: 'ent_003',
        pillar: 'INPUT',
        project_id: 'proj_newsletter',
        impact_score: 3,
        classifier: 'rule',
        metadata: JSON.stringify({ tag: '#input', category: 'reading', applied_to: 'newsletter strategy' }),
        occurred_at: daysAgo(12),
        created_at: daysAgo(12),
    },
    {
        id: 'evt_004',
        entry_id: 'ent_004',
        pillar: 'INPUT',
        project_id: 'proj_soloos',
        impact_score: 4,
        classifier: 'rule',
        metadata: JSON.stringify({ tag: '#input', category: 'docs', library: 'drizzle' }),
        occurred_at: daysAgo(9),
        created_at: daysAgo(9),
    },
    {
        id: 'evt_005',
        entry_id: 'ent_005',
        pillar: 'INPUT',
        project_id: 'proj_soloos',
        impact_score: 3,
        classifier: 'rule',
        metadata: JSON.stringify({ tag: '#input', category: 'docs', library: 'stripe' }),
        occurred_at: daysAgo(6),
        created_at: daysAgo(6),
    },
    // OUTPUT
    {
        id: 'evt_006',
        entry_id: 'ent_006',
        pillar: 'OUTPUT',
        project_id: 'proj_soloos',
        impact_score: 4,
        classifier: 'rule',
        metadata: JSON.stringify({ source: 'github', repo: 'soloos', branch: 'main' }),
        occurred_at: daysAgo(19),
        created_at: daysAgo(19),
    },
    {
        id: 'evt_007',
        entry_id: 'ent_007',
        pillar: 'OUTPUT',
        project_id: 'proj_soloos',
        impact_score: 4,
        classifier: 'rule',
        metadata: JSON.stringify({ source: 'github', repo: 'soloos', branch: 'main' }),
        occurred_at: daysAgo(16),
        created_at: daysAgo(16),
    },
    {
        id: 'evt_008',
        entry_id: 'ent_008',
        pillar: 'OUTPUT',
        project_id: 'proj_soloos',
        impact_score: 2,
        classifier: 'rule',
        metadata: JSON.stringify({ source: 'github', repo: 'soloos', branch: 'main', type: 'fix' }),
        occurred_at: daysAgo(15),
        created_at: daysAgo(15),
    },
    {
        id: 'evt_009',
        entry_id: 'ent_009',
        pillar: 'OUTPUT',
        project_id: 'proj_soloos',
        impact_score: 5,
        classifier: 'rule',
        metadata: JSON.stringify({ source: 'github', repo: 'soloos', branch: 'main' }),
        occurred_at: daysAgo(11),
        created_at: daysAgo(11),
    },
    {
        id: 'evt_010',
        entry_id: 'ent_010',
        pillar: 'OUTPUT',
        project_id: 'proj_soloos',
        impact_score: 5,
        classifier: 'rule',
        metadata: JSON.stringify({ source: 'github', repo: 'soloos', branch: 'main' }),
        occurred_at: daysAgo(8),
        created_at: daysAgo(8),
    },
    {
        id: 'evt_011',
        entry_id: 'ent_011',
        pillar: 'OUTPUT',
        project_id: 'proj_oss_plugin',
        impact_score: 4,
        classifier: 'rule',
        metadata: JSON.stringify({ source: 'github', repo: 'shadcn-timeline', version: '0.2.1' }),
        occurred_at: daysAgo(7),
        created_at: daysAgo(7),
    },
    {
        id: 'evt_012',
        entry_id: 'ent_012',
        pillar: 'OUTPUT',
        project_id: 'proj_soloos',
        impact_score: 4,
        classifier: 'rule',
        metadata: JSON.stringify({ source: 'github', repo: 'soloos', branch: 'main' }),
        occurred_at: daysAgo(4),
        created_at: daysAgo(4),
    },
    {
        id: 'evt_013',
        entry_id: 'ent_013',
        pillar: 'OUTPUT',
        project_id: 'proj_soloos',
        impact_score: 2,
        classifier: 'rule',
        metadata: JSON.stringify({ source: 'github', repo: 'soloos', branch: 'main', type: 'fix' }),
        occurred_at: daysAgo(0, 3),
        created_at: daysAgo(0, 3),
    },
    // AUDIENCE
    {
        id: 'evt_014',
        entry_id: 'ent_014',
        pillar: 'AUDIENCE',
        project_id: 'proj_newsletter',
        impact_score: 5,
        classifier: 'rule',
        metadata: JSON.stringify({ tag: '#audience', milestone: '500 subscribers', growth_rate: '8%' }),
        occurred_at: daysAgo(18),
        created_at: daysAgo(18),
    },
    {
        id: 'evt_015',
        entry_id: 'ent_015',
        pillar: 'AUDIENCE',
        project_id: 'proj_consulting',
        impact_score: 3,
        classifier: 'rule',
        metadata: JSON.stringify({ tag: '#audience', outreach_count: 12, reply_rate: '33%' }),
        occurred_at: daysAgo(13),
        created_at: daysAgo(13),
    },
    {
        id: 'evt_016',
        entry_id: 'ent_016',
        pillar: 'AUDIENCE',
        project_id: 'proj_soloos',
        impact_score: 4,
        classifier: 'rule',
        metadata: JSON.stringify({ tag: '#audience', platform: 'twitter', impressions: 840, new_followers: 23, newsletter_signups: 6 }),
        occurred_at: daysAgo(10),
        created_at: daysAgo(10),
    },
    {
        id: 'evt_017',
        entry_id: 'ent_017',
        pillar: 'AUDIENCE',
        project_id: 'proj_soloos',
        impact_score: 4,
        classifier: 'rule',
        metadata: JSON.stringify({ tag: '#audience', platform: 'podcast', show: 'Indie Bites', air_date: '2026-04-28' }),
        occurred_at: daysAgo(5),
        created_at: daysAgo(5),
    },
    {
        id: 'evt_018',
        entry_id: 'ent_018',
        pillar: 'AUDIENCE',
        project_id: 'proj_newsletter',
        impact_score: 4,
        classifier: 'rule',
        metadata: JSON.stringify({ tag: '#audience', issue: 34, open_rate: '62%', ctr: '9%', new_signups: 18 }),
        occurred_at: daysAgo(2),
        created_at: daysAgo(2),
    },
    // FINANCIAL
    {
        id: 'evt_019',
        entry_id: 'ent_019',
        pillar: 'FINANCIAL',
        project_id: 'proj_consulting',
        impact_score: 5,
        classifier: 'rule',
        metadata: JSON.stringify({ source: 'stripe', amount: 1200, currency: 'usd', type: 'retainer', client: 'Acme Corp' }),
        occurred_at: daysAgo(21),
        created_at: daysAgo(21),
    },
    {
        id: 'evt_020',
        entry_id: 'ent_020',
        pillar: 'FINANCIAL',
        project_id: 'proj_consulting',
        impact_score: 5,
        classifier: 'rule',
        metadata: JSON.stringify({ source: 'stripe', amount: 499, currency: 'usd', type: 'subscription', plan: 'Consulting Pro' }),
        occurred_at: daysAgo(14),
        created_at: daysAgo(14),
    },
    {
        id: 'evt_021',
        entry_id: 'ent_021',
        pillar: 'FINANCIAL',
        project_id: 'proj_course',
        impact_score: 3,
        classifier: 'rule',
        metadata: JSON.stringify({ source: 'stripe', amount: 297, currency: 'usd', type: 'one-time', product: 'Annual Course' }),
        occurred_at: daysAgo(10),
        created_at: daysAgo(10),
    },
    {
        id: 'evt_022',
        entry_id: 'ent_022',
        pillar: 'FINANCIAL',
        project_id: 'proj_consulting',
        impact_score: 5,
        classifier: 'rule',
        metadata: JSON.stringify({ source: 'stripe', amount: 1200, currency: 'usd', type: 'retainer', client: 'Acme Corp', month: 2 }),
        occurred_at: daysAgo(0, 4),
        created_at: daysAgo(0, 4),
    },
    // ENERGY
    {
        id: 'evt_023',
        entry_id: 'ent_023',
        pillar: 'ENERGY',
        project_id: null,
        impact_score: 5,
        classifier: 'rule',
        metadata: JSON.stringify({ tag: '#energy', level: 'high', sleep_hours: 7.5, focus_hours: 4 }),
        occurred_at: daysAgo(22),
        created_at: daysAgo(22),
    },
    {
        id: 'evt_024',
        entry_id: 'ent_024',
        pillar: 'ENERGY',
        project_id: null,
        impact_score: 2,
        classifier: 'rule',
        metadata: JSON.stringify({ tag: '#energy', level: 'low', cause: 'context_switching', context_switches: 7 }),
        occurred_at: daysAgo(16),
        created_at: daysAgo(16),
    },
    {
        id: 'evt_025',
        entry_id: 'ent_025',
        pillar: 'ENERGY',
        project_id: null,
        impact_score: 4,
        classifier: 'rule',
        metadata: JSON.stringify({ tag: '#energy', level: 'restored', activity: 'hiking', screen_off: '12pm' }),
        occurred_at: daysAgo(9),
        created_at: daysAgo(9),
    },
    {
        id: 'evt_026',
        entry_id: 'ent_026',
        pillar: 'ENERGY',
        project_id: null,
        impact_score: 5,
        classifier: 'rule',
        metadata: JSON.stringify({ tag: '#energy', level: 'peak', wake_time: '05:30', peak_window: '05:30-09:00' }),
        occurred_at: daysAgo(3),
        created_at: daysAgo(3),
    },
];
// ─── Reviews ─────────────────────────────────────────────────────────────────
// Week of Apr 7–13 — completed
const week1Start = daysAgo(14);
const week1End = daysAgo(8);
// Week of Apr 14–20 — current, incomplete
const week2Start = daysAgo(7);
const week2End = daysAgo(1);
const reviews = [
    {
        id: 'rev_001',
        period: 'week',
        period_start: week1Start,
        period_end: week1End,
        snapshot: JSON.stringify([
            { pillar: 'OUTPUT', count: 4, total_impact: 15 },
            { pillar: 'INPUT', count: 3, total_impact: 9 },
            { pillar: 'AUDIENCE', count: 2, total_impact: 8 },
            { pillar: 'FINANCIAL', count: 1, total_impact: 5 },
            { pillar: 'ENERGY', count: 1, total_impact: 2 },
        ]),
        reflection: 'Strong shipping week — Cockpit and NodeSheet both landed. The low energy signal on Wednesday came from too many async communication threads open at once. Need to batch Slack/email into 2 blocks per day instead of reacting continuously. The 500-subscriber milestone for Indie Dispatch was a genuine high point. Financial is healthy with the retainer renewal. Next week: focus on the review system and start thinking about the waitlist page.',
        ai_insight: 'Output velocity is high relative to your 30-day baseline (+40%). Energy dipped mid-week but recovered — the pattern matches previous weeks where consulting calls cluster on Wednesdays. Consider protecting Wednesday mornings.',
        completed_at: daysAgo(7, 6),
        created_at: week1Start,
    },
    {
        id: 'rev_002',
        period: 'week',
        period_start: week2Start,
        period_end: week2End,
        snapshot: JSON.stringify([
            { pillar: 'OUTPUT', count: 3, total_impact: 10 },
            { pillar: 'INPUT', count: 1, total_impact: 3 },
            { pillar: 'AUDIENCE', count: 2, total_impact: 8 },
            { pillar: 'FINANCIAL', count: 1, total_impact: 3 },
            { pillar: 'ENERGY', count: 2, total_impact: 9 },
        ]),
        reflection: null,
        ai_insight: null,
        completed_at: null,
        created_at: week2Start,
    },
];
// ─── Event Links ─────────────────────────────────────────────────────────────
const event_links = [
    // Reading Drizzle docs → led to Entries API commit
    {
        source_event_id: 'evt_004',
        target_event_id: 'evt_006',
        link_type: 'informed',
        confidence: 0.85,
        created_by: 'ai',
    },
    // Reading Stripe docs → led to Stripe webhook implementation (evt_013 is related fix)
    {
        source_event_id: 'evt_005',
        target_event_id: 'evt_022',
        link_type: 'informed',
        confidence: 0.72,
        created_by: 'ai',
    },
    // Twitter thread → newsletter signups → newsletter milestone
    {
        source_event_id: 'evt_016',
        target_event_id: 'evt_018',
        link_type: 'contributed_to',
        confidence: 0.68,
        created_by: 'ai',
    },
    // Low energy → fix commit (context switching → small fix, not big feature)
    {
        source_event_id: 'evt_024',
        target_event_id: 'evt_008',
        link_type: 'context',
        confidence: 0.55,
        created_by: 'ai',
    },
    // Retainer month 1 → retainer month 2 (recurring revenue link)
    {
        source_event_id: 'evt_019',
        target_event_id: 'evt_022',
        link_type: 'recurs',
        confidence: 0.95,
        created_by: 'ai',
    },
    // NodeSheet OUTPUT → Cockpit OUTPUT (same project, sequential features)
    {
        source_event_id: 'evt_009',
        target_event_id: 'evt_010',
        link_type: 'followed_by',
        confidence: 0.90,
        created_by: 'ai',
    },
    // Podcast AUDIENCE → potential enterprise inquiry (speculative)
    {
        source_event_id: 'evt_017',
        target_event_id: 'evt_016',
        link_type: 'followed_by',
        confidence: 0.40,
        created_by: 'ai',
    },
    // Rest day → peak energy pattern
    {
        source_event_id: 'evt_025',
        target_event_id: 'evt_026',
        link_type: 'contributed_to',
        confidence: 0.78,
        created_by: 'ai',
    },
];
// ─── Insert ───────────────────────────────────────────────────────────────────
async function seed() {
    console.log('Clearing existing data...');
    await db.delete(schema.event_links);
    await db.delete(schema.events);
    await db.delete(schema.reviews);
    await db.delete(schema.entries);
    await db.delete(schema.projects);
    console.log('Inserting projects...');
    await db.insert(schema.projects).values(projects);
    console.log('Inserting entries...');
    await db.insert(schema.entries).values(entries);
    console.log('Inserting events...');
    await db.insert(schema.events).values(events);
    console.log('Inserting reviews...');
    await db.insert(schema.reviews).values(reviews);
    console.log('Inserting event_links...');
    await db.insert(schema.event_links).values(event_links);
    console.log(`
Done.
  ${projects.length} projects
  ${entries.length} entries  (${entries.filter(e => e.status === 'pending').length} pending)
  ${events.length} events    (INPUT:${events.filter(e => e.pillar === 'INPUT').length} OUTPUT:${events.filter(e => e.pillar === 'OUTPUT').length} AUDIENCE:${events.filter(e => e.pillar === 'AUDIENCE').length} FINANCIAL:${events.filter(e => e.pillar === 'FINANCIAL').length} ENERGY:${events.filter(e => e.pillar === 'ENERGY').length})
  ${reviews.length} reviews  (1 completed, 1 pending)
  ${event_links.length} event_links
  `);
}
seed().catch((err) => {
    console.error(err);
    process.exit(1);
});
