import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet'
import { Button } from '@/components/ui/button'
import { Separator } from '@/components/ui/separator'
import { RelationChain } from './RelationChain'
import { formatTs } from '@/lib/utils'
import { PILLAR_COLORS } from '@soloos/shared'
import type { Event } from '@soloos/shared'

interface NodeSheetProps {
  event: Event | null
  onClose: () => void
}

export function NodeSheet({ event, onClose }: NodeSheetProps) {
  const pillarColor = event ? PILLAR_COLORS[event.pillar as keyof typeof PILLAR_COLORS] : '#6366f1'

  return (
    <Sheet open={!!event} onOpenChange={open => !open && onClose()}>
      <SheetContent side="right" className="w-[400px] flex flex-col gap-4 overflow-y-auto"
                    style={{ background: '#0d0d0d', borderLeft: '1px solid #1e1e22' }}>
        {event && (
          <>
            <SheetHeader>
              <div className="flex items-center gap-2">
                <span className={`px-2 py-0.5 rounded text-xs font-bold pillar-badge-${event.pillar.toLowerCase()}`}>
                  {event.pillar}
                </span>
                <SheetTitle className="text-sm font-semibold">Event Detail</SheetTitle>
              </div>
            </SheetHeader>

            {/* Content */}
            <div className="rounded-lg p-3 text-xs leading-relaxed"
                 style={{ background: '#18181b', border: '1px solid #27272a', color: '#a1a1aa' }}>
              {typeof event.metadata === 'object' && event.metadata !== null && 'commit' in event.metadata
                ? String((event.metadata as { commit: string }).commit)
                : event.entry_id}
            </div>

            <div className="flex gap-4 text-xs font-mono" style={{ color: '#52525b' }}>
              <span>{formatTs(event.occurred_at)}</span>
              <span>·</span>
              <span>{event.classifier}</span>
              <span>·</span>
              <span>score: {event.impact_score > 0 ? '+' : ''}{event.impact_score}</span>
            </div>

            <Separator style={{ background: '#1e1e22' }} />

            {/* Relation chain */}
            <div>
              <span className="text-xs font-semibold uppercase tracking-widest block mb-3"
                    style={{ color: '#52525b' }}>
                Correlation Chain
              </span>
              <RelationChain links={[]} events={[]} />
            </div>

            <Separator style={{ background: '#1e1e22' }} />

            {/* Calibration panel */}
            <div>
              <span className="text-xs font-semibold uppercase tracking-widest block mb-3"
                    style={{ color: '#52525b' }}>
                Calibration
              </span>
              <div className="flex gap-2">
                <Button size="sm" variant="outline" className="text-xs flex-1"
                        style={{ borderColor: `${pillarColor}33`, color: pillarColor }}>
                  ✓ Confirm
                </Button>
                <Button size="sm" variant="outline" className="text-xs flex-1"
                        style={{ borderColor: '#f4433633', color: '#f44336' }}>
                  ✗ Disconnect
                </Button>
              </div>
              <p className="text-xs mt-2" style={{ color: '#3f3f46' }}>
                Confirming marks confidence = 1.0 (human-verified)
              </p>
            </div>
          </>
        )}
      </SheetContent>
    </Sheet>
  )
}
