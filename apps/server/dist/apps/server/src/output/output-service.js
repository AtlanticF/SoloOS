import { eq, and, desc, gt, sql } from 'drizzle-orm';
import { randomUUID } from 'crypto';
import * as schema from '../db/schema';
import { getGithubTokenRaw } from '../github/github-config-service';
// ── Cost allocation ───────────────────────────────────────────────────────────
const DEFAULT_DAILY_BURN = 30.0;
/**
 * Compute allocated_cost for a commit using weighted diff volume.
 * If total diff for the day is 0 (e.g. empty commits), falls back to even split.
 */
export function computeAllocatedCost(additions, deletions, dayTotalDiff, dayCommitCount, dailyBurn = DEFAULT_DAILY_BURN) {
    const commitDiff = additions + deletions;
    if (dayTotalDiff > 0 && commitDiff > 0) {
        return (commitDiff / dayTotalDiff * dailyBurn).toFixed(2);
    }
    if (dayCommitCount > 0) {
        return (dailyBurn / dayCommitCount).toFixed(2);
    }
    return '0.00';
}
// ── Summary ───────────────────────────────────────────────────────────────────
export async function getOutputSummary(db) {
    const rows = await db.select().from(schema.output_metadata);
    const counts = {
        DRAFT: 0, ACTIVE: 0, VALUATED: 0, GHOST: 0, ARCHIVED: 0,
    };
    let allocatedTotal = 0;
    let revenueTotal = 0;
    for (const row of rows) {
        const s = row.state;
        if (s in counts)
            counts[s]++;
        allocatedTotal += parseFloat(row.allocated_cost);
        revenueTotal += parseFloat(row.realized_revenue);
    }
    const syncStates = await db.select().from(schema.github_sync_state);
    let syncStatus = 'idle';
    let lastSyncedAt = null;
    for (const s of syncStates) {
        if (s.sync_status === 'running') {
            syncStatus = 'running';
            break;
        }
        if (s.sync_status === 'deferred_rate_limited')
            syncStatus = 'deferred_rate_limited';
        if (s.last_synced_at && (!lastSyncedAt || s.last_synced_at > lastSyncedAt)) {
            lastSyncedAt = s.last_synced_at;
        }
    }
    return {
        counts,
        totals: {
            allocated_cost: allocatedTotal.toFixed(2),
            realized_revenue: revenueTotal.toFixed(2),
        },
        sync_status: syncStatus,
        last_synced_at: lastSyncedAt,
    };
}
// ── Events list ───────────────────────────────────────────────────────────────
export async function listOutputEvents(db, opts) {
    const limit = Math.min(opts.limit ?? 50, 100);
    const conditions = [];
    if (opts.cursor)
        conditions.push(gt(schema.output_metadata.id, opts.cursor));
    if (opts.repoId)
        conditions.push(eq(schema.output_metadata.repo_id, opts.repoId));
    if (opts.projectId)
        conditions.push(eq(schema.output_metadata.project_id, opts.projectId));
    if (opts.state)
        conditions.push(eq(schema.output_metadata.state, opts.state));
    const rows = await db
        .select()
        .from(schema.output_metadata)
        .where(conditions.length > 0 ? and(...conditions) : undefined)
        .orderBy(desc(schema.output_metadata.committed_at))
        .limit(limit + 1);
    const hasMore = rows.length > limit;
    const items = rows.slice(0, limit);
    return {
        items: items.map(deserializeOutputEvent),
        next_cursor: hasMore ? items[items.length - 1].id : null,
    };
}
// ── Repo bindings ─────────────────────────────────────────────────────────────
export async function listRepoBindings(db) {
    const rows = await db.select().from(schema.github_repo_bindings);
    return rows.map(deserializeBinding);
}
export async function upsertRepoBinding(db, body) {
    const now = Math.floor(Date.now() / 1000);
    const existing = await db
        .select()
        .from(schema.github_repo_bindings)
        .where(eq(schema.github_repo_bindings.repo_id, body.repo_id));
    if (existing.length > 0) {
        await db
            .update(schema.github_repo_bindings)
            .set({
            repo_name: body.repo_name,
            repo_full_name: body.repo_full_name,
            project_id: body.project_id ?? null,
            updated_at: now,
        })
            .where(eq(schema.github_repo_bindings.repo_id, body.repo_id));
        const updated = await db
            .select()
            .from(schema.github_repo_bindings)
            .where(eq(schema.github_repo_bindings.repo_id, body.repo_id));
        return deserializeBinding(updated[0]);
    }
    const id = `bind_${randomUUID()}`;
    await db.insert(schema.github_repo_bindings).values({
        id,
        repo_id: body.repo_id,
        repo_name: body.repo_name,
        repo_full_name: body.repo_full_name,
        project_id: body.project_id ?? null,
        created_at: now,
        updated_at: now,
    });
    // Initialise sync state row for the new repo
    const existingSync = await db
        .select()
        .from(schema.github_sync_state)
        .where(eq(schema.github_sync_state.repo_id, body.repo_id));
    if (existingSync.length === 0) {
        await db.insert(schema.github_sync_state).values({
            id: `sync_${randomUUID()}`,
            repo_id: body.repo_id,
            last_synced_sha: null,
            last_synced_at: null,
            next_safe_sync_at: null,
            sync_status: 'idle',
            error_message: null,
            created_at: now,
            updated_at: now,
        });
    }
    const created = await db
        .select()
        .from(schema.github_repo_bindings)
        .where(eq(schema.github_repo_bindings.id, id));
    return deserializeBinding(created[0]);
}
// ── Sync status ───────────────────────────────────────────────────────────────
export async function getSyncStatus(db) {
    const syncRows = await db.select().from(schema.github_sync_state);
    const bindingRows = await db.select().from(schema.github_repo_bindings);
    const bindingMap = new Map(bindingRows.map(b => [b.repo_id, b.repo_full_name]));
    return syncRows.map(row => ({
        repo_id: row.repo_id,
        repo_full_name: bindingMap.get(row.repo_id) ?? `repo:${row.repo_id}`,
        status: row.sync_status,
        last_synced_at: row.last_synced_at ?? null,
        last_synced_sha: row.last_synced_sha ?? null,
        next_safe_sync_at: row.next_safe_sync_at ?? null,
        error_message: row.error_message ?? null,
    }));
}
// ── Manual sync trigger ───────────────────────────────────────────────────────
export async function triggerSync(db, repoId) {
    const now = Math.floor(Date.now() / 1000);
    const conditions = repoId
        ? [eq(schema.github_sync_state.repo_id, repoId)]
        : [];
    const syncRows = await db
        .select()
        .from(schema.github_sync_state)
        .where(conditions.length > 0 ? and(...conditions) : undefined);
    if (syncRows.length === 0) {
        return { accepted: false, status: 'idle', next_safe_sync_at: null };
    }
    // Check if any target repo is already running
    const running = syncRows.find(r => r.sync_status === 'running');
    if (running) {
        return { accepted: false, status: 'running', next_safe_sync_at: null };
    }
    // Check rate limiting
    const rateLimited = syncRows.find(r => r.next_safe_sync_at !== null && r.next_safe_sync_at > now);
    if (rateLimited) {
        return {
            accepted: false,
            status: 'deferred_rate_limited',
            next_safe_sync_at: rateLimited.next_safe_sync_at,
        };
    }
    // Mark as running; actual GitHub sync is deferred to the sync worker
    const targetIds = repoId
        ? [repoId]
        : syncRows.map(r => r.repo_id);
    for (const id of targetIds) {
        await db
            .update(schema.github_sync_state)
            .set({ sync_status: 'running', updated_at: now })
            .where(eq(schema.github_sync_state.repo_id, id));
    }
    // Perform the actual ingest synchronously for MVP (no job queue)
    syncOutputCommits(db, targetIds).catch(() => {
        // errors are handled inside syncOutputCommits
    });
    return { accepted: true, status: 'running', next_safe_sync_at: null };
}
// ── GitHub sync implementation ────────────────────────────────────────────────
export async function syncOutputCommits(db, repoIds) {
    const now = Math.floor(Date.now() / 1000);
    for (const repoId of repoIds) {
        try {
            const [syncState] = await db
                .select()
                .from(schema.github_sync_state)
                .where(eq(schema.github_sync_state.repo_id, repoId));
            const [binding] = await db
                .select()
                .from(schema.github_repo_bindings)
                .where(eq(schema.github_repo_bindings.repo_id, repoId));
            if (!binding)
                continue;
            const [owner, repo] = binding.repo_full_name.split('/');
            const token = await getGithubTokenRaw(db) ?? process.env.GITHUB_TOKEN ?? null;
            if (!token)
                throw new Error('GITHUB_TOKEN not set');
            const sinceParam = syncState?.last_synced_at
                ? `&since=${new Date(syncState.last_synced_at * 1000).toISOString()}`
                : '';
            const response = await fetch(`https://api.github.com/repos/${owner}/${repo}/commits?per_page=100${sinceParam}`, {
                headers: {
                    Authorization: `Bearer ${token}`,
                    Accept: 'application/vnd.github+json',
                    'X-GitHub-Api-Version': '2022-11-28',
                },
            });
            // Handle rate limiting
            const remaining = parseInt(response.headers.get('X-RateLimit-Remaining') ?? '60');
            const resetTs = parseInt(response.headers.get('X-RateLimit-Reset') ?? '0');
            if (remaining <= 10 && resetTs > 0) {
                await db
                    .update(schema.github_sync_state)
                    .set({
                    sync_status: 'deferred_rate_limited',
                    next_safe_sync_at: resetTs,
                    updated_at: now,
                })
                    .where(eq(schema.github_sync_state.repo_id, repoId));
                continue;
            }
            if (!response.ok) {
                const errorMsg = response.status === 401 ? 'Unauthorized — check GITHUB_TOKEN' : `GitHub API error: ${response.status}`;
                await db
                    .update(schema.github_sync_state)
                    .set({ sync_status: 'failed', error_message: errorMsg, updated_at: now })
                    .where(eq(schema.github_sync_state.repo_id, repoId));
                continue;
            }
            const commits = await response.json();
            if (!Array.isArray(commits) || commits.length === 0) {
                await db
                    .update(schema.github_sync_state)
                    .set({ sync_status: 'success', error_message: null, last_synced_at: now, updated_at: now })
                    .where(eq(schema.github_sync_state.repo_id, repoId));
                continue;
            }
            // Compute daily diff totals for cost allocation
            const dayDiffMap = new Map();
            const commitDetails = [];
            for (const c of commits) {
                const committedAt = Math.floor(new Date(c.commit.author.date).getTime() / 1000);
                const dayKey = new Date(committedAt * 1000).toISOString().slice(0, 10);
                // Fetch stats if not present in list response
                let additions = 0, deletions = 0, filesChanged = 0;
                if (c.stats) {
                    additions = c.stats.additions;
                    deletions = c.stats.deletions;
                    filesChanged = c.files?.length ?? 0;
                }
                else {
                    const detail = await fetchCommitDetail(owner, repo, c.sha, token);
                    if (detail) {
                        additions = detail.stats?.additions ?? 0;
                        deletions = detail.stats?.deletions ?? 0;
                        filesChanged = detail.files?.length ?? 0;
                    }
                }
                const day = dayDiffMap.get(dayKey) ?? { total: 0, count: 0 };
                day.total += additions + deletions;
                day.count++;
                dayDiffMap.set(dayKey, day);
                commitDetails.push({
                    sha: c.sha,
                    committedAt,
                    additions,
                    deletions,
                    filesChanged,
                    message: c.commit.message.split('\n')[0].slice(0, 500),
                    author: c.author?.login ?? c.commit.author.name,
                });
            }
            // Determine project context for this binding (forward-only: new commits use current binding)
            let projectName = null;
            if (binding.project_id) {
                const [proj] = await db
                    .select()
                    .from(schema.projects)
                    .where(eq(schema.projects.id, binding.project_id));
                projectName = proj?.name ?? null;
            }
            let latestSha = null;
            let latestTs = null;
            for (const commit of commitDetails) {
                // Idempotency: skip if already ingested
                const existing = await db
                    .select({ id: schema.output_metadata.id })
                    .from(schema.output_metadata)
                    .where(and(eq(schema.output_metadata.repo_id, repoId), eq(schema.output_metadata.commit_sha, commit.sha)));
                if (existing.length > 0)
                    continue;
                const dayKey = new Date(commit.committedAt * 1000).toISOString().slice(0, 10);
                const dayStats = dayDiffMap.get(dayKey) ?? { total: 0, count: 1 };
                const allocatedCost = computeAllocatedCost(commit.additions, commit.deletions, dayStats.total, dayStats.count);
                const state = binding.project_id ? 'ACTIVE' : 'DRAFT';
                const entryId = `ent_gh_${randomUUID()}`;
                const eventId = `evt_gh_${randomUUID()}`;
                const metaId = `om_${randomUUID()}`;
                await db.insert(schema.entries).values({
                    id: entryId,
                    content: commit.message,
                    source: 'github',
                    status: 'processed',
                    quick_tags: '[]',
                    created_at: now,
                });
                await db.insert(schema.events).values({
                    id: eventId,
                    entry_id: entryId,
                    pillar: 'OUTPUT',
                    project_id: binding.project_id ?? null,
                    impact_score: 3,
                    classifier: 'rule',
                    metadata: JSON.stringify({
                        source: 'github',
                        repo: binding.repo_name,
                        commit_sha: commit.sha,
                    }),
                    occurred_at: commit.committedAt,
                    created_at: now,
                });
                await db.insert(schema.output_metadata).values({
                    id: metaId,
                    event_id: eventId,
                    repo_id: repoId,
                    repo_name: binding.repo_name,
                    commit_sha: commit.sha,
                    commit_message: commit.message,
                    author: commit.author,
                    committed_at: commit.committedAt,
                    state,
                    project_id: binding.project_id ?? null,
                    project_name_snapshot: projectName,
                    additions: commit.additions,
                    deletions: commit.deletions,
                    files_changed: commit.filesChanged,
                    allocated_cost: allocatedCost,
                    realized_revenue: '0.00',
                    sync_version: 1,
                    created_at: now,
                    updated_at: now,
                });
                if (!latestTs || commit.committedAt > latestTs) {
                    latestTs = commit.committedAt;
                    latestSha = commit.sha;
                }
            }
            await db
                .update(schema.github_sync_state)
                .set({
                sync_status: 'success',
                error_message: null,
                last_synced_at: now,
                ...(latestSha ? { last_synced_sha: latestSha } : {}),
                next_safe_sync_at: null,
                updated_at: now,
            })
                .where(eq(schema.github_sync_state.repo_id, repoId));
        }
        catch (err) {
            const msg = err instanceof Error ? err.message : 'Unknown error';
            await db
                .update(schema.github_sync_state)
                .set({ sync_status: 'failed', error_message: msg, updated_at: now })
                .where(eq(schema.github_sync_state.repo_id, repoId));
        }
    }
}
// ── Lifecycle transitions ─────────────────────────────────────────────────────
/**
 * OUT_VALUATION_UP: called when a FINANCIAL event lands on a project.
 * Transitions all ACTIVE output_metadata rows for that project to VALUATED.
 */
export async function applyValuationUp(db, projectId, revenueToDistribute) {
    const now = Math.floor(Date.now() / 1000);
    const activeRows = await db
        .select()
        .from(schema.output_metadata)
        .where(and(eq(schema.output_metadata.project_id, projectId), eq(schema.output_metadata.state, 'ACTIVE')));
    if (activeRows.length === 0)
        return;
    const revenuePerCommit = (parseFloat(revenueToDistribute) / activeRows.length).toFixed(2);
    for (const row of activeRows) {
        const newRevenue = (parseFloat(row.realized_revenue) + parseFloat(revenuePerCommit)).toFixed(2);
        await db
            .update(schema.output_metadata)
            .set({ state: 'VALUATED', realized_revenue: newRevenue, updated_at: now })
            .where(eq(schema.output_metadata.id, row.id));
    }
}
/**
 * OUT_PROJ_DELETE: transitions all linked output_metadata to GHOST.
 */
export async function applyProjectDeleted(db, projectId) {
    const now = Math.floor(Date.now() / 1000);
    await db
        .update(schema.output_metadata)
        .set({
        state: 'GHOST',
        project_id: null,
        updated_at: now,
    })
        .where(and(eq(schema.output_metadata.project_id, projectId), sql `${schema.output_metadata.state} IN ('ACTIVE', 'VALUATED')`));
}
/**
 * OUT_PROJ_ARCHIVE: transitions all linked ACTIVE/VALUATED output_metadata to ARCHIVED.
 */
export async function applyProjectArchived(db, projectId) {
    const now = Math.floor(Date.now() / 1000);
    await db
        .update(schema.output_metadata)
        .set({ state: 'ARCHIVED', updated_at: now })
        .where(and(eq(schema.output_metadata.project_id, projectId), sql `${schema.output_metadata.state} IN ('ACTIVE', 'VALUATED')`));
}
// ── Helpers ───────────────────────────────────────────────────────────────────
async function fetchCommitDetail(owner, repo, sha, token) {
    try {
        const res = await fetch(`https://api.github.com/repos/${owner}/${repo}/commits/${sha}`, {
            headers: {
                Authorization: `Bearer ${token}`,
                Accept: 'application/vnd.github+json',
                'X-GitHub-Api-Version': '2022-11-28',
            },
        });
        if (!res.ok)
            return null;
        return res.json();
    }
    catch {
        return null;
    }
}
function deserializeOutputEvent(row) {
    return {
        id: row.id,
        event_id: row.event_id,
        repo_id: row.repo_id,
        repo_name: row.repo_name,
        commit_sha: row.commit_sha,
        commit_message: row.commit_message,
        author: row.author,
        committed_at: row.committed_at,
        state: row.state,
        project_id: row.project_id ?? null,
        project_name_snapshot: row.project_name_snapshot ?? null,
        additions: row.additions,
        deletions: row.deletions,
        files_changed: row.files_changed,
        allocated_cost: row.allocated_cost,
        realized_revenue: row.realized_revenue,
        created_at: row.created_at,
        updated_at: row.updated_at,
    };
}
function deserializeBinding(row) {
    return {
        id: row.id,
        repo_id: row.repo_id,
        repo_name: row.repo_name,
        repo_full_name: row.repo_full_name,
        project_id: row.project_id ?? null,
        effective_from: 'future_commits_only',
        created_at: row.created_at,
        updated_at: row.updated_at,
    };
}
