import { useTranslation } from 'react-i18next'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet'
import { Button } from '@/components/ui/button'
import { Separator } from '@/components/ui/separator'
import { RelationChain } from './RelationChain'
import { formatTs } from '@/lib/utils'
import { PILLAR_COLORS } from '@soloos/shared'
import type { Event, Pillar, Insight, Association } from '@soloos/shared'
import { api, queryKeys, type OutputEvent } from '@/lib/api'

interface NodeSheetProps {
  event: Event | null
  onClose: () => void
}

export function NodeSheet({ event, onClose }: NodeSheetProps) {
  const { t, i18n } = useTranslation()
  const queryClient = useQueryClient()
  const pillarColor = event ? PILLAR_COLORS[event.pillar as keyof typeof PILLAR_COLORS] : '#6366f1'

  const insightId = event?.pillar === 'INPUT'
    ? (event.metadata as Record<string, unknown>)?.insight_id as string | undefined
    : undefined

  const { data: insight } = useQuery({
    queryKey: queryKeys.insights({ id: insightId }),
    queryFn: () => api.insights.get(insightId!),
    enabled: !!insightId,
  })
  const { data: outputDetail } = useQuery({
    queryKey: queryKeys.outputEvents({ eventId: event?.id }),
    queryFn: () => api.output.eventById(event!.id),
    enabled: !!event?.id && event?.pillar === 'OUTPUT',
  })
  const insightProjectId = insight?.project_id ?? event?.project_id ?? undefined
  const { data: pendingAssociationsPage } = useQuery({
    queryKey: queryKeys.associations({ project_id: insightProjectId, status: 'PENDING_REVIEW' }),
    queryFn: () => api.associations.list({ project_id: insightProjectId!, status: 'PENDING_REVIEW' }),
    enabled: !!insight?.id && !!insightProjectId,
  })
  const { data: confirmedAssociationsPage } = useQuery({
    queryKey: queryKeys.associations({ project_id: insightProjectId, status: 'CONFIRMED' }),
    queryFn: () => api.associations.list({ project_id: insightProjectId!, status: 'CONFIRMED' }),
    enabled: !!insight?.id && !!insightProjectId,
  })
  const pendingAssociations = (pendingAssociationsPage?.items ?? []).filter((a) => a.source_id === insight?.id)
  const confirmedCount = (confirmedAssociationsPage?.items ?? []).filter((a) => a.source_id === insight?.id).length

  const confirmMutation = useMutation({
    mutationFn: (id: string) => api.associations.confirm(id),
    onSuccess: async () => {
      await Promise.all([
        pendingAssociationsPage ? queryClient.refetchQueries({ queryKey: queryKeys.associations({ project_id: insightProjectId, status: 'PENDING_REVIEW' }) }) : Promise.resolve(),
        confirmedAssociationsPage ? queryClient.refetchQueries({ queryKey: queryKeys.associations({ project_id: insightProjectId, status: 'CONFIRMED' }) }) : Promise.resolve(),
        queryClient.invalidateQueries({ queryKey: ['associations'] }),
        queryClient.invalidateQueries({ queryKey: queryKeys.insights() }),
        queryClient.invalidateQueries({ queryKey: queryKeys.events() }),
      ])
    },
  })
  const rejectMutation = useMutation({
    mutationFn: (id: string) => api.associations.reject(id),
    onSuccess: async () => {
      await Promise.all([
        pendingAssociationsPage ? queryClient.refetchQueries({ queryKey: queryKeys.associations({ project_id: insightProjectId, status: 'PENDING_REVIEW' }) }) : Promise.resolve(),
        confirmedAssociationsPage ? queryClient.refetchQueries({ queryKey: queryKeys.associations({ project_id: insightProjectId, status: 'CONFIRMED' }) }) : Promise.resolve(),
        queryClient.invalidateQueries({ queryKey: ['associations'] }),
        queryClient.invalidateQueries({ queryKey: queryKeys.insights() }),
        queryClient.invalidateQueries({ queryKey: queryKeys.events() }),
      ])
    },
  })

  return (
    <Sheet open={!!event} onOpenChange={open => !open && onClose()}>
      <SheetContent side="right" className="w-[400px] flex flex-col gap-4 overflow-y-auto"
                    style={{ background: '#0d0d0d', borderLeft: '1px solid #1e1e22' }}>
        {event && (
          <>
            <SheetHeader>
              <div className="flex items-center gap-2">
                <span className={`px-2 py-0.5 rounded text-xs font-bold pillar-badge-${event.pillar.toLowerCase()}`}>
                  {t(`pillars.${event.pillar as Pillar}`)}
                </span>
                <SheetTitle className="text-sm font-semibold">{t('nodeSheet.eventDetail')}</SheetTitle>
              </div>
            </SheetHeader>

            {/* Insight detail panel (INPUT pillar only) */}
            {insight && (
              <InsightPanel
                insight={insight}
                pendingAssociations={pendingAssociations}
                confirmedCount={confirmedCount}
                onConfirm={(id) => confirmMutation.mutate(id)}
                onReject={(id) => rejectMutation.mutate(id)}
                actionLoadingId={confirmMutation.isPending ? (confirmMutation.variables as string | undefined) : (rejectMutation.isPending ? (rejectMutation.variables as string | undefined) : undefined)}
              />
            )}
            {event.pillar === 'OUTPUT' && outputDetail && <OutputDetailPanel detail={outputDetail} />}

            {/* Content */}
            {!insight && !(event.pillar === 'OUTPUT' && outputDetail) && (
              <div className="rounded-lg p-3 text-xs leading-relaxed"
                   style={{ background: '#18181b', border: '1px solid #27272a', color: '#a1a1aa' }}>
                {typeof event.metadata === 'object' && event.metadata !== null && 'commit' in event.metadata
                  ? String((event.metadata as { commit: string }).commit)
                  : event.entry_id}
              </div>
            )}

            <div className="flex gap-4 text-xs font-mono" style={{ color: '#52525b' }}>
              <span>{formatTs(event.occurred_at, i18n.language)}</span>
              <span>·</span>
              <span>{event.classifier}</span>
              <span>·</span>
              <span>{t('nodeSheet.impact')}: {event.impact_score > 0 ? '+' : ''}{event.impact_score}</span>
            </div>

            <Separator style={{ background: '#1e1e22' }} />

            {/* Relation chain */}
            <div>
              <span className="text-xs font-semibold uppercase tracking-widest block mb-3"
                    style={{ color: '#52525b' }}>
                {t('nodeSheet.correlationChain')}
              </span>
              <RelationChain links={[]} events={[]} />
            </div>

            <Separator style={{ background: '#1e1e22' }} />

            {/* Calibration panel */}
            <div>
              <span className="text-xs font-semibold uppercase tracking-widest block mb-3"
                    style={{ color: '#52525b' }}>
                {t('nodeSheet.calibration')}
              </span>
              <div className="flex gap-2">
                <Button size="sm" variant="outline" className="text-xs flex-1"
                        style={{ borderColor: `${pillarColor}33`, color: pillarColor }}>
                  ✓ {t('nodeSheet.confirm')}
                </Button>
                <Button size="sm" variant="outline" className="text-xs flex-1"
                        style={{ borderColor: '#f4433633', color: '#f44336' }}>
                  ✗ {t('nodeSheet.disconnect')}
                </Button>
              </div>
              <p className="text-xs mt-2" style={{ color: '#3f3f46' }}>
                {t('nodeSheet.confirmHint')}
              </p>
            </div>
          </>
        )}
      </SheetContent>
    </Sheet>
  )
}

function OutputDetailPanel({ detail }: { detail: OutputEvent }) {
  return (
    <div className="flex flex-col gap-2.5 rounded-lg p-3"
         style={{ background: '#1d4ed808', border: '1px solid #1d4ed825' }}>
      <div className="grid grid-cols-[1fr_auto] gap-2">
        <span className="text-xs font-mono break-all" style={{ color: '#93c5fd' }}>
          {detail.commit_sha}
        </span>
        <span className="text-xs font-mono" style={{ color: '#52525b' }}>
          {new Date(detail.committed_at * 1000).toLocaleDateString()}
        </span>
      </div>
      <div className="text-xs" style={{ color: '#e4e4e7' }}>{detail.commit_message}</div>
      <div className="text-xs" style={{ color: '#71717a' }}>{detail.repo_name} · {detail.author}</div>
      <div className="flex items-center gap-3 text-xs font-mono">
        <span style={{ color: '#4ade80' }}>+{detail.additions}</span>
        <span style={{ color: '#f87171' }}>-{detail.deletions}</span>
        <span style={{ color: '#a1a1aa' }}>{detail.files_changed} files</span>
        <span style={{ color: '#71717a' }}>${detail.allocated_cost}</span>
        {parseFloat(detail.realized_revenue) > 0 && (
          <span style={{ color: '#fbbf24' }}>↑${detail.realized_revenue}</span>
        )}
      </div>
    </div>
  )
}

function InsightPanel({
  insight,
  pendingAssociations,
  confirmedCount,
  onConfirm,
  onReject,
  actionLoadingId,
}: {
  insight: Insight
  pendingAssociations: Association[]
  confirmedCount: number
  onConfirm: (id: string) => void
  onReject: (id: string) => void
  actionLoadingId?: string
}) {
  const { t } = useTranslation()
  const STATUS_COLORS: Record<string, string> = {
    ACTIVE: '#10b981',
    INBOX: '#f59e0b',
    INCUBATING: '#6366f1',
    PROJECTIZED: '#8b5cf6',
  }
  const statusColor = STATUS_COLORS[insight.status] ?? '#71717a'

  return (
    <div className="flex flex-col gap-2.5 rounded-lg p-3"
         style={{ background: '#10b98108', border: '1px solid #10b98125' }}>
      <div className="grid grid-cols-[1fr_1fr_auto] items-end gap-2 mb-0.5">
        <div className="flex flex-col gap-1">
          <span className="text-[10px] font-semibold uppercase tracking-widest" style={{ color: '#3f3f46' }}>
            {t('nodeSheet.type')}
          </span>
          <span className="text-xs font-mono px-2 py-0.5 rounded w-fit"
                style={{ background: '#10b98120', color: '#10b981' }}>
            {t(`nodeSheet.insightType.${insight.type}`)}
          </span>
        </div>
        <div className="flex flex-col gap-1">
          <span className="text-[10px] font-semibold uppercase tracking-widest" style={{ color: '#3f3f46' }}>
            {t('nodeSheet.status')}
          </span>
          <span className="text-xs font-mono px-2 py-0.5 rounded w-fit"
                style={{ background: `${statusColor}20`, color: statusColor }}>
            {t(`nodeSheet.insightStatus.${insight.status}`)}
          </span>
        </div>
        <span className="text-xs font-mono self-center" style={{ color: '#3f3f46' }}>
          ×{insight.metrics.certainty.toFixed(2)}
        </span>
      </div>
      {insight.content.fact && (
        <div>
          <div className="text-xs font-semibold uppercase tracking-widest mb-0.5" style={{ color: '#3f3f46' }}>
            {t('nodeSheet.source')}
          </div>
          <div className="text-xs" style={{ color: '#a1a1aa' }}>{insight.content.fact}</div>
        </div>
      )}
      {insight.content.synthesis && (
        <div>
          <div className="text-xs font-semibold uppercase tracking-widest mb-0.5" style={{ color: '#3f3f46' }}>
            {t('nodeSheet.synthesis')}
          </div>
          <div className="text-xs" style={{ color: '#e4e4e7' }}>{insight.content.synthesis}</div>
        </div>
      )}
      {insight.content.vector && (
        <div>
          <div className="text-xs font-semibold uppercase tracking-widest mb-0.5" style={{ color: '#3f3f46' }}>
            {t('nodeSheet.vector')}
          </div>
          <div className="text-xs" style={{ color: '#a1a1aa' }}>{insight.content.vector}</div>
        </div>
      )}
      {confirmedCount > 0 && (
        <div
          className="text-xs font-medium inline-flex w-fit px-2 py-1 rounded"
          style={{ color: '#fbbf24', background: 'rgba(251, 191, 36, 0.12)', border: '1px solid rgba(251, 191, 36, 0.35)' }}
        >
          {t('nodeSheet.confirmedOutputCount', { count: confirmedCount })}
        </div>
      )}
      {pendingAssociations.length > 0 && (
        <div className="pt-1">
          <div className="text-xs font-semibold uppercase tracking-widest mb-1.5" style={{ color: '#3f3f46' }}>
            {t('nodeSheet.pendingOutput')}
          </div>
          <div className="flex flex-col gap-1.5">
            {pendingAssociations.map((assoc) => {
              const pending = actionLoadingId === assoc.id
              return (
                <div key={assoc.id} className="rounded px-2 py-1.5 border" style={{ borderColor: '#27272a' }}>
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-xs truncate" style={{ color: '#e4e4e7' }}>
                      {assoc.target.commit_message}
                    </span>
                    <div className="flex items-center gap-1">
                      <Button
                        size="sm"
                        variant="outline"
                        className="h-6 px-2 text-[10px]"
                        onClick={() => onConfirm(assoc.id)}
                        disabled={pending}
                        style={{ borderColor: '#10b98166', color: '#10b981' }}
                      >
                        {t('output.associationConfirm')}
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        className="h-6 px-2 text-[10px]"
                        onClick={() => onReject(assoc.id)}
                        disabled={pending}
                        style={{ borderColor: '#f8717166', color: '#f87171' }}
                      >
                        {t('output.associationReject')}
                      </Button>
                    </div>
                  </div>
                  <div className="text-[11px] mt-1 flex items-center gap-2" style={{ color: '#71717a' }}>
                    <span className="font-mono">{assoc.target.commit_sha.slice(0, 8)}</span>
                    <span>·</span>
                    <span>{new Date(assoc.target.committed_at * 1000).toLocaleDateString()}</span>
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      )}
    </div>
  )
}
