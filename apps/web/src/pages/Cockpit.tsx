import { useQuery } from '@tanstack/react-query'
import { api, queryKeys } from '@/lib/api'
import { PillarRadar } from '@/components/cockpit/PillarRadar'
import { PulseCard } from '@/components/cockpit/PulseCard'
import { ReviewGate } from '@/components/cockpit/ReviewGate'
import { PILLARS, type Pillar } from '@soloos/shared'
import { formatMoney } from '@/lib/utils'

export function Cockpit() {
  const { data: review } = useQuery({
    queryKey: queryKeys.reviewCurrent(),
    queryFn: api.reviews.current,
  })
  const { data: events = [] } = useQuery({
    queryKey: queryKeys.events(),
    queryFn: () => api.events.list(),
  })

  if (review && !review.completed_at) {
    return <ReviewGate review={review} />
  }

  // Compute pillar scores from events (sum of impact_score per pillar, normalized 0-100)
  const pillarTotals = Object.fromEntries(PILLARS.map(p => [p, 0])) as Record<Pillar, number>
  for (const e of events) pillarTotals[e.pillar as Pillar] += Math.max(0, e.impact_score)
  const maxTotal = Math.max(1, ...Object.values(pillarTotals))
  const scores = PILLARS.map(pillar => ({
    pillar,
    score: Math.round((pillarTotals[pillar] / maxTotal) * 100),
  }))

  const financialEvents = events.filter(e => e.pillar === 'FINANCIAL')
  const outputEvents = events.filter(e => e.pillar === 'OUTPUT')
  const energyScore = scores.find(s => s.pillar === 'ENERGY')?.score ?? 0

  const totalRevenue = financialEvents.reduce((s, e) => s + Math.max(0, e.impact_score) * 10, 0)
  const commitCount = outputEvents.length

  return (
    <div className="flex flex-col gap-4 h-full">
      <div className="grid gap-4" style={{ gridTemplateColumns: '220px 1fr' }}>
        {/* Radar + pillar bars */}
        <div className="flex flex-col gap-3 p-4 rounded-xl"
             style={{ background: '#111', border: '1px solid #1e1e22' }}>
          <span className="text-xs font-semibold uppercase tracking-widest" style={{ color: '#52525b' }}>
            Balance
          </span>
          <PillarRadar scores={scores} />
          <div className="flex flex-col gap-2">
            {scores.map(({ pillar, score }) => (
              <div key={pillar} className="flex items-center gap-2">
                <span className="text-xs w-14 flex-shrink-0" style={{ color: '#52525b' }}>{pillar}</span>
                <div className="flex-1 h-1 rounded-full" style={{ background: '#18181b' }}>
                  <div className="h-full rounded-full transition-all"
                       style={{ width: `${score}%`, background: `var(--pillar-${pillar.toLowerCase()})` }} />
                </div>
                <span className="font-mono text-xs w-8 text-right"
                      style={{ color: `var(--pillar-${pillar.toLowerCase()})` }}>
                  {score}
                </span>
              </div>
            ))}
          </div>
        </div>

        {/* Pulse cards */}
        <div className="flex flex-col gap-3">
          <div className="grid grid-cols-3 gap-3">
            <PulseCard
              label="Cash Flow (all time)"
              value={formatMoney(totalRevenue)}
              delta={financialEvents.length > 0 ? `${financialEvents.length} financial events` : 'No data yet'}
              deltaPositive={totalRevenue > 0}
            />
            <PulseCard
              label="Output Events"
              value={String(commitCount)}
              delta={commitCount > 0 ? 'commits & deliverables' : 'No output yet'}
            />
            <PulseCard
              label="Energy"
              value={`${energyScore}/100`}
              delta={energyScore < 30 ? 'Low — consider a break' : 'Nominal'}
              deltaPositive={energyScore >= 30}
              alert={energyScore < 30}
            />
          </div>

          {/* Recent events strip */}
          <div className="flex-1 rounded-xl p-4" style={{ background: '#111', border: '1px solid #1e1e22' }}>
            <span className="text-xs font-semibold uppercase tracking-widest block mb-3" style={{ color: '#52525b' }}>
              Recent Events
            </span>
            {events.slice(0, 8).map(event => (
              <div key={event.id} className="flex items-center gap-3 py-2 border-b text-xs"
                   style={{ borderColor: '#18181b' }}>
                <span className={`px-1.5 py-0.5 rounded text-xs font-bold pillar-badge-${event.pillar.toLowerCase()}`}>
                  {event.pillar}
                </span>
                <span className="flex-1 truncate" style={{ color: '#a1a1aa' }}>
                  {event.metadata && typeof event.metadata === 'object' && 'commit' in event.metadata
                    ? String((event.metadata as { commit: string }).commit)
                    : String(event.entry_id).slice(0, 40)}
                </span>
                <span className="font-mono flex-shrink-0" style={{ color: '#3f3f46' }}>
                  {new Date(event.occurred_at * 1000).toLocaleDateString()}
                </span>
              </div>
            ))}
            {events.length === 0 && (
              <p className="text-xs text-center py-8" style={{ color: '#3f3f46' }}>
                No events yet. Run <code className="font-mono">solo capture "your first thought"</code>
              </p>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
