import { randomUUID } from 'crypto';
import { eq } from 'drizzle-orm';
import * as schema from '../db/schema';
function maskToken(token) {
    if (token.length <= 6)
        return '******';
    return `${token.slice(0, 4)}...${token.slice(-4)}`;
}
function toConfig(row) {
    return {
        id: row.id,
        token_masked: maskToken(row.token),
        created_at: row.created_at,
        updated_at: row.updated_at,
    };
}
export async function getGithubConfig(db) {
    const rows = await db.select().from(schema.github_configs).limit(1);
    return rows[0] ? toConfig(rows[0]) : null;
}
export async function getGithubTokenRaw(db) {
    const rows = await db.select().from(schema.github_configs).limit(1);
    return rows[0]?.token ?? null;
}
export async function upsertGithubConfig(db, token) {
    const now = Math.floor(Date.now() / 1000);
    const existing = await db.select().from(schema.github_configs).limit(1);
    if (existing[0]) {
        await db
            .update(schema.github_configs)
            .set({
            token,
            updated_at: now,
        })
            .where(eq(schema.github_configs.id, existing[0].id));
        const rows = await db.select().from(schema.github_configs).where(eq(schema.github_configs.id, existing[0].id));
        return toConfig(rows[0]);
    }
    const row = {
        id: `ghcfg_${randomUUID()}`,
        token,
        created_at: now,
        updated_at: now,
    };
    await db.insert(schema.github_configs).values(row);
    return toConfig(row);
}
export async function deleteGithubConfig(db) {
    await db.delete(schema.github_configs);
}
