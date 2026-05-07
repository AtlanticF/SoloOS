import { randomUUID } from 'crypto'
import { eq } from 'drizzle-orm'
import type { DB } from '../db/index'
import * as schema from '../db/schema'
import type { AgentConfig, AgentConfigInput, AgentProvider } from '@soloos/shared'
import type { LlmConfig } from './llm-client'

function maskKey(key: string): string {
  if (key.length <= 4) return '****'
  return `****${key.slice(-4)}`
}

function deserialize(row: typeof schema.agent_configs.$inferSelect): AgentConfig {
  return {
    id: row.id,
    provider: row.provider as AgentProvider,
    model: row.model,
    base_url: row.base_url ?? null,
    api_key_masked: maskKey(row.api_key),
    created_at: row.created_at,
    updated_at: row.updated_at,
  }
}

export async function getAgentConfig(db: DB): Promise<AgentConfig | null> {
  const rows = await db.select().from(schema.agent_configs).limit(1)
  return rows[0] ? deserialize(rows[0]) : null
}

export async function getAgentConfigRaw(db: DB): Promise<LlmConfig | null> {
  const rows = await db.select().from(schema.agent_configs).limit(1)
  if (!rows[0]) return null
  return {
    provider: rows[0].provider as AgentProvider,
    model: rows[0].model,
    api_key: rows[0].api_key,
    base_url: rows[0].base_url ?? null,
  }
}

export async function upsertAgentConfig(db: DB, input: AgentConfigInput): Promise<AgentConfig> {
  const now = Math.floor(Date.now() / 1000)
  const existing = await db.select().from(schema.agent_configs).limit(1)

  if (existing[0]) {
    await db.update(schema.agent_configs)
      .set({
        provider: input.provider,
        model: input.model,
        api_key: input.api_key,
        base_url: input.base_url ?? null,
        updated_at: now,
      })
      .where(eq(schema.agent_configs.id, existing[0].id))
    const updated = await db.select().from(schema.agent_configs).where(eq(schema.agent_configs.id, existing[0].id))
    return deserialize(updated[0])
  }

  const row = {
    id: randomUUID(),
    provider: input.provider,
    model: input.model,
    api_key: input.api_key,
    base_url: input.base_url ?? null,
    created_at: now,
    updated_at: now,
  }
  await db.insert(schema.agent_configs).values(row)
  return deserialize(row)
}

export async function deleteAgentConfig(db: DB): Promise<void> {
  await db.delete(schema.agent_configs)
}
