import { Card } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { formatMoney } from '@/lib/utils'
import type { Project, Event, Pillar } from '@soloos/shared'
import { PILLAR_COLORS } from '@soloos/shared'

interface ProjectCardProps {
  project: Project
  events: Event[]
  onClick: () => void
}

export function ProjectCard({ project, events, onClick }: ProjectCardProps) {
  const financialSum = events
    .filter(e => e.pillar === 'FINANCIAL')
    .reduce((s, e) => s + e.impact_score * 10, 0)

  const pillarCounts = events.reduce((acc, e) => {
    acc[e.pillar as Pillar] = (acc[e.pillar as Pillar] ?? 0) + 1
    return acc
  }, {} as Partial<Record<Pillar, number>>)

  const isDormant = project.status === 'dormant'

  return (
    <Card
      className="p-4 cursor-pointer hover:border-zinc-700 transition-colors flex flex-col gap-3"
      style={{ background: '#111', border: `1px solid ${isDormant ? '#27272a' : '#2d2d35'}` }}
      onClick={onClick}
    >
      <div className="flex items-start justify-between gap-2">
        <span className="text-sm font-semibold tracking-tight truncate">{project.name}</span>
        <Badge variant="outline" className="text-xs flex-shrink-0"
               style={{ borderColor: project.status === 'active' ? '#10b98133' : '#27272a',
                        color: project.status === 'active' ? '#10b981' : '#52525b' }}>
          {project.status}
        </Badge>
      </div>

      <div className="flex items-center gap-3 text-xs" style={{ color: '#71717a' }}>
        <span className="font-mono" style={{ color: financialSum > 0 ? '#10b981' : '#52525b' }}>
          {formatMoney(financialSum)}
        </span>
        <span>·</span>
        <span>{events.length} events</span>
      </div>

      {/* Pillar bar */}
      <div className="flex gap-0.5 h-1 rounded-full overflow-hidden">
        {(Object.entries(pillarCounts) as [Pillar, number][]).map(([pillar, count]) => (
          <div key={pillar}
               style={{ flex: count, background: PILLAR_COLORS[pillar], opacity: 0.7 }} />
        ))}
        {events.length === 0 && <div className="flex-1 rounded-full" style={{ background: '#27272a' }} />}
      </div>
    </Card>
  )
}
