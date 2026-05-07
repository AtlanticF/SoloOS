import { eq, inArray } from 'drizzle-orm'
import type { DB } from '../db/index'
import * as schema from '../db/schema'
import { chatComplete, type LlmConfig } from '../agent/llm-client'
import { getAgentConfigRaw } from '../agent/config-service'
import { upsertAssociationSuggestion } from './association-service'

const SYSTEM_PROMPT = `You are a code-insight matcher for SoloOS.

Given a list of active insights (each with an id and synthesis text) and a commit (id + message),
score how likely each insight is the intellectual cause of the commit.

Respond ONLY with a valid JSON array in this exact shape:
[
  { "insight_id": "...", "match_score": 0.85, "reasoning": "..." },
  ...
]

Rules:
- Only include pairs where match_score >= 0.5.
- match_score must be a number between 0 and 1.
- reasoning must be a single concise sentence (max 200 chars).
- If no insight is relevant, respond with an empty array [].
- Do NOT add any text outside the JSON.`

interface MatchResult {
  insight_id: string
  match_score: number
  reasoning: string
}

function parseMatches(raw: string): MatchResult[] {
  const clean = raw.replace(/^```(?:json)?\s*/i, '').replace(/```\s*$/, '').trim()
  try {
    const parsed = JSON.parse(clean)
    if (!Array.isArray(parsed)) return []
    return parsed.filter(
      (item): item is MatchResult =>
        typeof item.insight_id === 'string' &&
        typeof item.match_score === 'number' &&
        typeof item.reasoning === 'string',
    )
  } catch {
    const match = clean.match(/\[[\s\S]*\]/)
    if (match) {
      try {
        const parsed = JSON.parse(match[0])
        if (Array.isArray(parsed)) return parsed
      } catch { /* empty */ }
    }
    return []
  }
}

/**
 * For each newly ingested output_metadata row, query all ACTIVE insights in the
 * same project and ask the LLM to score relevance. Persists suggestions as
 * PENDING_REVIEW associations with INSERT OR IGNORE idempotency.
 *
 * Silently no-ops if no agent config is present.
 */
export async function suggestAssociationsForNewCommits(
  db: DB,
  projectId: string,
  outputMetadataIds: string[],
): Promise<void> {
  if (outputMetadataIds.length === 0) return

  const agentConfig = await getAgentConfigRaw(db)
  if (!agentConfig) return

  // Load ACTIVE insights for this project
  const activeInsights = await db
    .select({ id: schema.insights.id, synthesis: schema.insights.synthesis })
    .from(schema.insights)
    .where(eq(schema.insights.status, 'ACTIVE'))

  // Also pick up insights assigned to this project
  const projectInsights = await db
    .select({ id: schema.insights.id, synthesis: schema.insights.synthesis })
    .from(schema.insights)
    .where(eq(schema.insights.project_id, projectId))

  // Merge, de-duplicate
  const insightMap = new Map<string, { id: string; synthesis: string }>()
  for (const i of [...activeInsights, ...projectInsights]) {
    insightMap.set(i.id, i)
  }
  const insights = [...insightMap.values()]

  if (insights.length === 0) return

  // Load target output_metadata rows
  const targets = await db
    .select({ id: schema.output_metadata.id, commit_message: schema.output_metadata.commit_message })
    .from(schema.output_metadata)
    .where(
      outputMetadataIds.length === 1
        ? eq(schema.output_metadata.id, outputMetadataIds[0])
        : inArray(schema.output_metadata.id, outputMetadataIds),
    )

  for (const target of targets) {
    try {
      const insightList = insights
        .map((i) => `- id: ${i.id}\n  synthesis: ${i.synthesis}`)
        .join('\n')

      const userPrompt = `Insights:\n${insightList}\n\nCommit:\nid: ${target.id}\nmessage: ${target.commit_message}`

      const raw = await chatComplete(agentConfig as LlmConfig, [
        { role: 'system', content: SYSTEM_PROMPT },
        { role: 'user', content: userPrompt },
      ])

      const matches = parseMatches(raw)

      for (const match of matches) {
        if (match.match_score < 0.5) continue
        // Validate insight_id is real
        if (!insightMap.has(match.insight_id)) continue

        await upsertAssociationSuggestion(db, {
          project_id: projectId,
          source_id: match.insight_id,
          target_id: target.id,
          match_score: Math.min(1, Math.max(0, match.match_score)),
          reasoning: String(match.reasoning).slice(0, 500),
        })
      }
    } catch {
      // silently continue — agent unavailable or parse error should not block ingest
    }
  }
}
