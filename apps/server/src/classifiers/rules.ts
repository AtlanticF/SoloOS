import type { Pillar } from '@soloos/shared'

const TAG_MAP: Record<string, Pillar> = {
  '#input': 'INPUT',
  '#output': 'OUTPUT',
  '#audience': 'AUDIENCE',
  '#financial': 'FINANCIAL',
  '#energy': 'ENERGY',
}

interface EntryLike {
  content: string
  source: string
}

export function applyRules(entry: EntryLike): Pillar | null {
  if (entry.source === 'github') return 'OUTPUT'
  if (entry.source === 'stripe') return 'FINANCIAL'

  const lower = entry.content.toLowerCase()
  for (const [tag, pillar] of Object.entries(TAG_MAP)) {
    if (lower.includes(tag)) return pillar
  }

  return null
}
