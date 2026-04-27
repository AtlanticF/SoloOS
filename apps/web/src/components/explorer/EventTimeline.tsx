import { ScrollArea } from '@/components/ui/scroll-area'
import { formatTs } from '@/lib/utils'
import type { Event, Pillar } from '@soloos/shared'
import { useTranslation } from 'react-i18next'

interface EventTimelineProps {
  events: Event[]
  onEventClick: (event: Event) => void
  /** When true, renders as a plain list with natural height (no ScrollArea).
   *  Use in contexts where the parent handles scrolling. */
  autoHeight?: boolean
}

function EventRows({ events, onEventClick }: { events: Event[]; onEventClick: (e: Event) => void }) {
  const { t } = useTranslation()

  return (
    <>
      {events.map(event => (
        <button
          key={event.id}
          onClick={() => onEventClick(event)}
          className="flex items-center gap-3 px-4 py-2.5 text-left border-b hover:bg-zinc-900 transition-colors w-full"
          style={{ borderColor: '#18181b' }}
        >
          <span className={`px-1.5 py-0.5 rounded text-xs font-bold flex-shrink-0 pillar-badge-${event.pillar.toLowerCase()}`}>
            {t(`pillars.${event.pillar as Pillar}`)}
          </span>
          <span className="flex-1 truncate text-xs" style={{ color: '#a1a1aa' }}>
            {event.title || event.entry_id.slice(0, 36)}
          </span>
          <span className="font-mono text-xs flex-shrink-0" style={{ color: '#3f3f46' }}>
            {formatTs(event.occurred_at)}
          </span>
        </button>
      ))}
    </>
  )
}

export function EventTimeline({ events, onEventClick, autoHeight = false }: EventTimelineProps) {
  if (events.length === 0) {
    return (
      <div className="flex items-center justify-center h-16 text-xs" style={{ color: '#3f3f46' }}>
        —
      </div>
    )
  }

  if (autoHeight) {
    return (
      <div className="flex flex-col">
        <EventRows events={events} onEventClick={onEventClick} />
      </div>
    )
  }

  return (
    <ScrollArea className="h-full">
      <div className="flex flex-col">
        <EventRows events={events} onEventClick={onEventClick} />
      </div>
    </ScrollArea>
  )
}
