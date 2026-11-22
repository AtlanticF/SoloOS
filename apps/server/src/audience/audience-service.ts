import { randomUUID } from 'crypto'
import { desc, eq } from 'drizzle-orm'
import type { DB } from '../db/index'
import * as schema from '../db/schema'

export interface SocialCounts {
  stars: number
  watchers: number
  forks: number
}

export interface RecordSocialSnapshotResult {
  repo_key: string
  delta: number
  event_created: boolean
  baseline: boolean
}

/**
 * Snapshot a repo's social counts and, if they grew since the last snapshot,
 * emit a single AUDIENCE event whose impact is the total positive delta. The
 * first snapshot for a repo only establishes a baseline (no event), and
 * unchanged or shrinking counts produce no event — keeping the feed idempotent.
 */
export async function recordSocialSnapshot(
  db: DB,
  repoKey: string,
  counts: SocialCounts,
): Promise<RecordSocialSnapshotResult> {
  const now = Math.floor(Date.now() / 1000)

  const previous = (
    await db
      .select()
      .from(schema.github_social_snapshots)
      .where(eq(schema.github_social_snapshots.repo_key, repoKey))
      .orderBy(desc(schema.github_social_snapshots.captured_at))
      .limit(1)
  )[0]

  await db.insert(schema.github_social_snapshots).values({
    id: randomUUID(),
    repo_key: repoKey,
    stars: counts.stars,
    watchers: counts.watchers,
    forks: counts.forks,
    captured_at: now,
  })

  if (!previous) {
    return { repo_key: repoKey, delta: 0, event_created: false, baseline: true }
  }

  const starsGained = Math.max(0, counts.stars - previous.stars)
  const watchersGained = Math.max(0, counts.watchers - previous.watchers)
  const forksGained = Math.max(0, counts.forks - previous.forks)
  const delta = starsGained + watchersGained + forksGained

  if (delta <= 0) {
    return { repo_key: repoKey, delta: 0, event_created: false, baseline: false }
  }

  const entryId = randomUUID()
  await db.insert(schema.entries).values({
    id: entryId,
    content: `+${delta} GitHub audience on ${repoKey}`,
    source: 'github',
    status: 'processed',
    quick_tags: '[]',
    created_at: now,
  })
  await db.insert(schema.events).values({
    id: randomUUID(),
    entry_id: entryId,
    title: `+${delta} GitHub social (${repoKey})`,
    pillar: 'AUDIENCE',
    project_id: null,
    impact_score: delta,
    classifier: 'github-social',
    metadata: JSON.stringify({ repo: repoKey, stars: starsGained, watchers: watchersGained, forks: forksGained }),
    occurred_at: now,
    created_at: now,
  })

  return { repo_key: repoKey, delta, event_created: true, baseline: false }
}

export interface RepoSocial {
  full_name: string
  stars: number
  watchers: number
  forks: number
}

/**
 * Thin GitHub API boundary: read the authenticated user's repos and their
 * social counts. Not unit-tested (network side effect) — the testable logic
 * lives in recordSocialSnapshot.
 */
export async function fetchUserRepoSocials(token: string): Promise<RepoSocial[]> {
  const res = await fetch('https://api.github.com/user/repos?per_page=100&sort=pushed', {
    headers: {
      Authorization: `Bearer ${token}`,
      Accept: 'application/vnd.github+json',
      'User-Agent': 'SoloOS',
    },
  })
  if (!res.ok) throw new Error(`GitHub API error: ${res.status}`)
  const repos = (await res.json()) as Array<{
    full_name: string
    stargazers_count: number
    subscribers_count: number
    forks_count: number
  }>
  return repos.map((r) => ({
    full_name: r.full_name,
    stars: r.stargazers_count ?? 0,
    watchers: r.subscribers_count ?? 0,
    forks: r.forks_count ?? 0,
  }))
}
