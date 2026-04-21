export const PILLARS = ['INPUT', 'OUTPUT', 'AUDIENCE', 'FINANCIAL', 'ENERGY'] as const
export type Pillar = typeof PILLARS[number]

export const PILLAR_COLORS: Record<Pillar, string> = {
  INPUT: '#10b981',
  OUTPUT: '#6366f1',
  AUDIENCE: '#f59e0b',
  FINANCIAL: '#ef4444',
  ENERGY: '#8b5cf6',
}
