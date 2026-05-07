import { randomUUID } from 'crypto'
import { eq } from 'drizzle-orm'
import type { DB } from '../db/index'
import * as schema from '../db/schema'
import type { GithubConfig } from '@soloos/shared'

function maskToken(token: string): string {
  if (token.length <= 6) return '******'
  return `${token.slice(0, 4)}...${token.slice(-4)}`
}

function toConfig(row: typeof schema.github_configs.$inferSelect): GithubConfig {
  return {
    id: row.id,
    token_masked: maskToken(row.token),
    auto_sync_enabled: row.auto_sync_enabled === 1,
    created_at: row.created_at,
    updated_at: row.updated_at,
  }
}

export async function getGithubConfig(db: DB): Promise<GithubConfig | null> {
  const rows = await db.select().from(schema.github_configs).limit(1)
  return rows[0] ? toConfig(rows[0]) : null
}

export async function getGithubTokenRaw(db: DB): Promise<string | null> {
  const rows = await db.select().from(schema.github_configs).limit(1)
  return rows[0]?.token ?? null
}

export async function upsertGithubConfig(db: DB, token: string): Promise<GithubConfig> {
  const now = Math.floor(Date.now() / 1000)
  const existing = await db.select().from(schema.github_configs).limit(1)

  if (existing[0]) {
    await db
      .update(schema.github_configs)
      .set({
        token,
        auto_sync_enabled: existing[0].auto_sync_enabled ?? 1,
        updated_at: now,
      })
      .where(eq(schema.github_configs.id, existing[0].id))
    const rows = await db.select().from(schema.github_configs).where(eq(schema.github_configs.id, existing[0].id))
    return toConfig(rows[0])
  }

  const row = {
    id: `ghcfg_${randomUUID()}`,
    token,
    auto_sync_enabled: 1,
    created_at: now,
    updated_at: now,
  }
  await db.insert(schema.github_configs).values(row)
  return toConfig(row)
}

export async function setGithubAutoSyncEnabled(db: DB, enabled: boolean): Promise<GithubConfig | null> {
  const existing = await db.select().from(schema.github_configs).limit(1)
  const row = existing[0]
  if (!row) return null

  const now = Math.floor(Date.now() / 1000)
  await db
    .update(schema.github_configs)
    .set({
      auto_sync_enabled: enabled ? 1 : 0,
      updated_at: now,
    })
    .where(eq(schema.github_configs.id, row.id))

  const rows = await db.select().from(schema.github_configs).where(eq(schema.github_configs.id, row.id))
  return rows[0] ? toConfig(rows[0]) : null
}

export async function deleteGithubConfig(db: DB): Promise<void> {
  await db.delete(schema.github_configs)
}
