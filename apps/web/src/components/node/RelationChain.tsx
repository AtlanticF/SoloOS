import type { EventLink, Event } from '@soloos/shared'
import { PILLAR_COLORS } from '@soloos/shared'

interface RelationChainProps {
  links: EventLink[]
  events: Event[]
}

export function RelationChain({ links, events }: RelationChainProps) {
  if (links.length === 0) {
    return (
      <p className="text-xs py-2" style={{ color: '#3f3f46' }}>
        No correlations detected yet
      </p>
    )
  }

  const eventMap = Object.fromEntries(events.map(e => [e.id, e]))

  return (
    <div className="flex flex-col gap-2">
      {links.map((link, i) => {
        const target = eventMap[link.target_event_id]
        return (
          <div key={i} className="flex items-center gap-2">
            <div className="w-2 h-2 rounded-full flex-shrink-0"
                 style={{ background: target ? PILLAR_COLORS[target.pillar as keyof typeof PILLAR_COLORS] : '#52525b' }} />
            <span className="text-xs" style={{ color: '#71717a' }}>
              {link.link_type}
            </span>
            <span className="text-xs px-1.5 py-0.5 rounded flex-shrink-0"
                  style={{ background: '#18181b', color: target ? PILLAR_COLORS[target.pillar as keyof typeof PILLAR_COLORS] : '#52525b' }}>
              {target?.pillar ?? 'unknown'}
            </span>
            <span className="text-xs font-mono" style={{ color: '#52525b' }}>
              {(link.confidence * 100).toFixed(0)}% confidence
            </span>
          </div>
        )
      })}
    </div>
  )
}
