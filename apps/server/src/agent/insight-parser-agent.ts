import type { InsightContent, InsightType } from '@soloos/shared'
import { chatComplete, type LlmConfig } from './llm-client'

const SYSTEM_PROMPT = `You are an insight extraction assistant for SoloOS, a personal business operating system.
Given free-form text from a user's cognitive capture, extract the three core components of an Insight:
- fact: The source or factual basis (URL, book, person, event)
- synthesis: The user's key takeaway or personal reframing
- vector: The intended action or direction this insight points toward
- type: One of STRATEGY | TECHNIQUE | MARKET | SEED
- title: concise event title that captures the core in very few words

Respond ONLY with a valid JSON object in this exact shape:
{
  "title": "...",
  "fact": "...",
  "synthesis": "...",
  "vector": "...",
  "type": "STRATEGY"
}

Rules:
- If a component is truly absent from the text, use an empty string "".
- Be concise. Each field max 200 chars.
- title must be short and sharp (max 24 chars), no punctuation decoration.
- Do NOT add explanation outside the JSON.`

function parseJson(raw: string): { title?: string; fact: string; synthesis: string; vector: string; type: string } | null {
  // strip markdown code fences if present
  const clean = raw.replace(/^```(?:json)?\s*/i, '').replace(/```\s*$/, '').trim()
  try {
    return JSON.parse(clean)
  } catch {
    // try to find JSON object in output
    const match = clean.match(/\{[\s\S]*\}/)
    if (match) {
      try { return JSON.parse(match[0]) } catch { return null }
    }
    return null
  }
}

export async function agentParseInsight(
  raw: string,
  config: LlmConfig,
): Promise<{ title: string; content: InsightContent; type: InsightType } | null> {
  const response = await chatComplete(config, [
    { role: 'system', content: SYSTEM_PROMPT },
    { role: 'user', content: raw },
  ])

  const parsed = parseJson(response)
  if (!parsed) return null

  const VALID_TYPES: InsightType[] = ['STRATEGY', 'TECHNIQUE', 'MARKET', 'SEED']
  const type: InsightType = VALID_TYPES.includes(parsed.type as InsightType)
    ? (parsed.type as InsightType)
    : 'SEED'

  return {
    title: String(parsed.title ?? '').trim(),
    content: {
      fact: String(parsed.fact ?? '').trim(),
      synthesis: String(parsed.synthesis ?? '').trim(),
      vector: String(parsed.vector ?? '').trim(),
    },
    type,
  }
}
