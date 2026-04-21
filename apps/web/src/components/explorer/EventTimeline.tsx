import { ScrollArea } from '@/components/ui/scroll-area'
import { formatTs } from '@/lib/utils'
import type { Event } from '@soloos/shared'

interface EventTimelineProps {
  events: Event[]
  onEventClick: (event: Event) => void
}

export function EventTimeline({ events, onEventClick }: EventTimelineProps) {
  if (events.length === 0) {
    return (
      <div className="flex items-center justify-center h-32 text-xs" style={{ color: '#3f3f46' }}>
        No events in this view
      </div>
    )
  }

  return (
    <ScrollArea className="h-full">
      <div className="flex flex-col">
        {events.map(event => (
          <button
            key={event.id}
            onClick={() => onEventClick(event)}
            className="flex items-center gap-3 px-4 py-2.5 text-left border-b hover:bg-zinc-900 transition-colors w-full"
            style={{ borderColor: '#18181b' }}
          >
            <span className={`px-1.5 py-0.5 rounded text-xs font-bold flex-shrink-0 pillar-badge-${event.pillar.toLowerCase()}`}>
              {event.pillar.slice(0, 3)}
            </span>
            <span className="flex-1 truncate text-xs" style={{ color: '#a1a1aa' }}>
              {typeof event.metadata === 'object' && event.metadata !== null && 'commit' in event.metadata
                ? String((event.metadata as { commit: string }).commit)
                : event.entry_id.slice(0, 36)}
            </span>
            <span className="font-mono text-xs flex-shrink-0" style={{ color: '#3f3f46' }}>
              {formatTs(event.occurred_at)}
            </span>
          </button>
        ))}
      </div>
    </ScrollArea>
  )
}
