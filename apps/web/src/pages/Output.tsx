import { useMemo, useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { useTranslation } from 'react-i18next'
import { ArrowLeft, GitBranch, GitCommitHorizontal } from 'lucide-react'
import { api, queryKeys } from '@/lib/api'
import type { Event } from '@soloos/shared'
import type { OutputEvent, OutputLifecycleState, RepoBinding } from '@/lib/api'
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet'
import { OutputHeader } from '@/components/output/OutputHeader'
import { OutputLifecycleSummary } from '@/components/output/OutputLifecycleSummary'
import { OutputTimelineTable } from '@/components/output/OutputTimelineTable'
import { RepoProjectBindingDialog } from '@/components/output/RepoProjectBindingDialog'
import { GithubOnboardingCard } from '@/components/output/GithubOnboardingCard'
import { AssociationPanel } from '@/components/output/AssociationPanel'
import type { GithubRepo } from '@/lib/api'

const PAGE_LIMIT = 50
const SUMMARY_LIMIT = 100

export function Output() {
  const { t } = useTranslation()

  const [activeState, setActiveState] = useState<OutputLifecycleState | null>(null)
  const [selectedRepoId, setSelectedRepoId] = useState<number | null>(null)
  const [selectedProjectId, setSelectedProjectId] = useState<string | null>(null)
  const [cursor, setCursor] = useState<string | undefined>(undefined)
  const [bindingDialogOpen, setBindingDialogOpen] = useState(false)
  const [repoPickerOpen, setRepoPickerOpen] = useState(false)
  const [selectedRepoForBinding, setSelectedRepoForBinding] = useState<GithubRepo | null>(null)
  const [editingBinding, setEditingBinding] = useState<RepoBinding | null>(null)
  const [selectedRepoCardId, setSelectedRepoCardId] = useState<number | null>(null)
  const [selectedOutputEvent, setSelectedOutputEvent] = useState<OutputEvent | null>(null)

  const { data: summary } = useQuery({
    queryKey: queryKeys.outputSummary(),
    queryFn: api.output.summary,
    refetchInterval: 30000,
  })

  const { data: bindings = [] } = useQuery({
    queryKey: queryKeys.outputBindings(),
    queryFn: api.output.listBindings,
  })

  const { data: projects = [] } = useQuery({
    queryKey: queryKeys.projects(),
    queryFn: api.projects.list,
  })

  const { data: githubConfig } = useQuery({
    queryKey: queryKeys.githubConfig(),
    queryFn: api.githubConfig.get,
  })

  const activeBinding = selectedRepoId
    ? bindings.find((b) => b.repo_id === selectedRepoId) ?? null
    : null
  const effectiveProjectId = selectedProjectId ?? activeBinding?.project_id ?? null

  const { data: eventsPage, isLoading } = useQuery({
    queryKey: queryKeys.outputEvents({ cursor, state: activeState, repoId: selectedRepoId, projectId: effectiveProjectId }),
    queryFn: () => api.output.events({
      cursor,
      limit: PAGE_LIMIT,
      state: activeState ?? undefined,
      repoId: selectedRepoId ?? undefined,
      projectId: effectiveProjectId ?? undefined,
    }),
  })
  const { data: scopedSummaryEventsPage } = useQuery({
    queryKey: queryKeys.outputEvents({ cursor: undefined, state: null, repoId: selectedRepoId, projectId: effectiveProjectId, limit: SUMMARY_LIMIT }),
    queryFn: () => api.output.events({
      limit: SUMMARY_LIMIT,
      repoId: selectedRepoId ?? undefined,
      projectId: effectiveProjectId ?? undefined,
    }),
    enabled: selectedRepoCardId !== null,
  })
  const { data: cardEventsPage } = useQuery({
    queryKey: queryKeys.outputEvents({ cursor: undefined, state: null, repoId: undefined, projectId: undefined, limit: 100 }),
    queryFn: () => api.output.events({ limit: 100 }),
    enabled: !!githubConfig,
  })
  const { data: selectedEventDetail } = useQuery({
    queryKey: queryKeys.events({ id: selectedOutputEvent?.event_id }),
    queryFn: () => api.events.get(selectedOutputEvent!.event_id),
    enabled: !!selectedOutputEvent?.event_id,
  })

  function handleLoadMore() {
    if (eventsPage?.next_cursor) {
      setCursor(eventsPage.next_cursor)
    }
  }

  function handleStateClick(state: OutputLifecycleState | null) {
    setActiveState(state)
    setCursor(undefined)
  }

  const hasNoBindings = bindings.length === 0
  const items = eventsPage?.items ?? []
  const hasNextPage = !!eventsPage?.next_cursor
  const inDetailView = selectedRepoCardId !== null

  const latestEventByRepo = useMemo(() => {
    const map = new Map<number, typeof items[number]>()
    for (const evt of cardEventsPage?.items ?? []) {
      if (!map.has(evt.repo_id)) map.set(evt.repo_id, evt)
    }
    return map
  }, [cardEventsPage?.items, items])

  const defaultSummary = summary ?? {
    counts: { DRAFT: 0, ACTIVE: 0, VALUATED: 0, GHOST: 0, ARCHIVED: 0 },
    totals: { allocated_cost: '0.00', realized_revenue: '0.00' },
    sync_status: 'idle' as const,
    last_synced_at: null,
  }
  const scopedCounts = useMemo(() => {
    const counts: Record<OutputLifecycleState, number> = {
      DRAFT: 0,
      ACTIVE: 0,
      VALUATED: 0,
      GHOST: 0,
      ARCHIVED: 0,
    }
    for (const evt of scopedSummaryEventsPage?.items ?? []) {
      counts[evt.state] += 1
    }
    return counts
  }, [scopedSummaryEventsPage?.items])
  const lifecycleSummary = inDetailView
    ? { ...defaultSummary, counts: scopedCounts }
    : defaultSummary

  return (
    <div className="flex flex-col gap-6 p-6 max-w-5xl mx-auto w-full">
      {/* Page header */}
      <div className="flex items-center gap-3">
        <div
          className="flex items-center justify-center w-8 h-8 rounded-lg"
          style={{ background: '#14532d20' }}
        >
          <GitCommitHorizontal size={16} style={{ color: '#4ade80' }} />
        </div>
        <div>
          <h1 className="text-sm font-semibold" style={{ color: '#e4e4e7' }}>
            {t('output.title')}
          </h1>
          <p className="text-xs" style={{ color: '#52525b' }}>
            {t('output.subtitle')}
          </p>
        </div>

        {/* Financial totals */}
        <div className="ml-auto flex items-center gap-4">
          <div className="text-right">
            <p className="text-xs" style={{ color: '#52525b' }}>{t('output.cost')}</p>
            <p className="text-sm font-mono tabular-nums" style={{ color: '#e4e4e7' }}>
              ${defaultSummary.totals.allocated_cost}
            </p>
          </div>
          <div className="text-right">
            <p className="text-xs" style={{ color: '#52525b' }}>{t('output.revenue')}</p>
            <p className="text-sm font-mono tabular-nums" style={{ color: '#fbbf24' }}>
              ${defaultSummary.totals.realized_revenue}
            </p>
          </div>
        </div>
      </div>

      {!githubConfig || hasNoBindings ? (
        <div
          className="flex flex-col gap-4"
        >
          <GithubOnboardingCard
            importedRepoIds={bindings.map(b => b.repo_id)}
            onBindRepo={(repo) => {
              setSelectedRepoForBinding(repo)
              setBindingDialogOpen(true)
            }}
          />
        </div>
      ) : !inDetailView ? (
        <div className="flex flex-col gap-4">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-semibold" style={{ color: '#e4e4e7' }}>
              {t('output.projectsTitle')}
            </h2>
            <button
              onClick={() => setRepoPickerOpen(true)}
              className="text-sm px-3 py-1.5 rounded-lg border transition-colors hover:border-zinc-600"
              style={{ background: '#18181b', borderColor: '#27272a', color: '#e4e4e7' }}
            >
              {t('output.manageRepos')}
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {bindings.map((binding) => {
              const linkedProject = projects.find((p) => p.id === binding.project_id)
              const latest = latestEventByRepo.get(binding.repo_id)
              return (
                <button
                  key={binding.id}
                  onClick={() => {
                    setSelectedRepoCardId(binding.repo_id)
                    setSelectedRepoId(binding.repo_id)
                    setSelectedProjectId(binding.project_id ?? null)
                    setActiveState('ACTIVE')
                    setSelectedOutputEvent(null)
                    setCursor(undefined)
                  }}
                  className="text-left rounded-xl border p-4 flex flex-col gap-3 transition-all duration-300 ease-out hover:-translate-y-0.5 hover:border-zinc-600 hover:shadow-[0_0_0_1px_rgba(74,222,128,0.35),0_0_24px_rgba(74,222,128,0.14)]"
                  style={{ background: '#0d0d0d', borderColor: '#27272a' }}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <div className="text-base font-semibold truncate" style={{ color: '#e4e4e7' }}>
                        {linkedProject?.name ?? binding.repo_name}
                      </div>
                      <div className="text-sm truncate underline flex items-center gap-1.5" style={{ color: '#71717a' }}>
                        <GitBranch size={13} className="flex-shrink-0" />
                        <span className="truncate">{binding.repo_full_name}</span>
                      </div>
                      <div className="text-xs mt-1" style={{ color: '#a1a1aa' }}>
                        {t('output.boundProject')}: {linkedProject?.name ?? t('output.unboundProject')}
                      </div>
                    </div>
                    <span
                      className="text-[11px] px-2 py-1 rounded-full border"
                      style={{
                        color: binding.project_id ? '#22c55e' : '#a1a1aa',
                        borderColor: binding.project_id ? '#22c55e55' : '#3f3f46',
                        background: binding.project_id ? '#14532d22' : 'transparent',
                      }}
                    >
                      {binding.project_id ? t('output.linked') : t('output.unlinked')}
                    </span>
                  </div>

                  {!binding.project_id && (
                    <div>
                      <button
                        onClick={(e) => {
                          e.stopPropagation()
                          setEditingBinding(binding)
                          setBindingDialogOpen(true)
                        }}
                        className="text-xs px-2.5 py-1.5 rounded-lg border transition-colors hover:border-zinc-500"
                        style={{ background: '#18181b', borderColor: '#27272a', color: '#a1a1aa' }}
                      >
                        {t('output.linkProjectQuick')}
                      </button>
                    </div>
                  )}

                  {latest ? (
                    <>
                      <div className="text-sm line-clamp-1" style={{ color: '#e4e4e7' }}>
                        {latest.commit_message}
                      </div>
                      <div className="text-xs" style={{ color: '#71717a' }}>
                        {new Date(latest.committed_at * 1000).toLocaleDateString()} · {latest.author}
                      </div>
                    </>
                  ) : (
                    <div className="text-xs" style={{ color: '#52525b' }}>{t('output.noCommits')}</div>
                  )}
                </button>
              )
            })}
          </div>
        </div>
      ) : (
        <>
          <div className="flex items-center gap-3">
            <button
              onClick={() => {
                setSelectedRepoCardId(null)
                setSelectedRepoId(null)
                setSelectedProjectId(null)
                setSelectedOutputEvent(null)
                setCursor(undefined)
              }}
              className="inline-flex items-center gap-1 text-xs px-2.5 py-1.5 rounded-lg border transition-colors hover:border-blue-400/60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-400/60"
              style={{ background: '#1e3a8a33', borderColor: '#3b82f6aa', color: '#bfdbfe' }}
            >
              <ArrowLeft size={12} />
              {t('output.backToProjects')}
            </button>
          </div>

          {/* Filters + Sync header */}
          <OutputHeader
            bindings={bindings}
            projects={projects}
            selectedRepoId={selectedRepoId}
            selectedProjectId={selectedProjectId}
          />

          {/* Lifecycle state summary */}
          <OutputLifecycleSummary
            summary={lifecycleSummary}
            activeState={activeState}
            onStateClick={handleStateClick}
          />

          {/* Commit timeline table */}
          <OutputTimelineTable
            items={items}
            isLoading={isLoading}
            hasNextPage={hasNextPage}
            onLoadMore={handleLoadMore}
            selectedItemId={selectedOutputEvent?.id ?? null}
            onItemClick={setSelectedOutputEvent}
          />
        </>
      )}

      {/* Binding dialog */}
      <RepoProjectBindingDialog
        open={bindingDialogOpen}
        onOpenChange={(open) => {
          setBindingDialogOpen(open)
          if (!open) {
            setSelectedRepoForBinding(null)
            setEditingBinding(null)
          }
        }}
        projects={projects}
        existingBinding={editingBinding}
        presetRepo={editingBinding ? null : selectedRepoForBinding}
      />

      {repoPickerOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4"
          style={{ background: 'rgba(0,0,0,0.7)' }}
          onClick={() => setRepoPickerOpen(false)}
        >
          <div
            className="w-full max-w-4xl max-h-[85vh] overflow-y-auto"
            onClick={(e) => e.stopPropagation()}
          >
            <GithubOnboardingCard
              mode="manage"
              importedRepoIds={bindings.map(b => b.repo_id)}
              onBindRepo={(repo) => {
                setSelectedRepoForBinding(repo)
                setRepoPickerOpen(false)
                setBindingDialogOpen(true)
              }}
            />
            <div className="mt-3 flex justify-end">
              <button
                onClick={() => setRepoPickerOpen(false)}
                className="text-sm px-3 py-1.5 rounded-lg border transition-colors hover:border-zinc-600"
                style={{ background: '#18181b', borderColor: '#27272a', color: '#a1a1aa' }}
              >
                {t('output.bindingDialog.cancel')}
              </button>
            </div>
          </div>
        </div>
      )}

      <OutputEventDetailSheet
        item={selectedOutputEvent}
        eventDetail={selectedEventDetail ?? null}
        onClose={() => setSelectedOutputEvent(null)}
        projectId={effectiveProjectId}
      />
    </div>
  )
}

function OutputEventDetailSheet({
  item,
  eventDetail,
  onClose,
  projectId,
}: {
  item: OutputEvent | null
  eventDetail: Event | null
  onClose: () => void
  projectId: string | null
}) {
  const { t } = useTranslation()

  return (
    <Sheet open={!!item} onOpenChange={(open) => !open && onClose()}>
      <SheetContent
        side="right"
        className="w-[420px] sm:max-w-[420px] overflow-y-auto"
        style={{ background: '#0d0d0d', borderLeft: '1px solid #1e1e22' }}
      >
        {item ? (
          <div className="flex flex-col gap-3 text-xs">
            <SheetHeader>
              <SheetTitle className="text-sm" style={{ color: '#e4e4e7' }}>
                {t('output.detailTitle')}
              </SheetTitle>
            </SheetHeader>
            <DetailRow label={t('output.detailCommit')} value={item.commit_sha} mono />
            <DetailRow label={t('output.detailRepo')} value={item.repo_name} />
            <DetailRow label={t('output.detailAuthor')} value={item.author} />
            <DetailRow label={t('output.detailMessage')} value={item.commit_message} />
            <DetailRow label={t('output.detailCommittedAt')} value={new Date(item.committed_at * 1000).toLocaleString()} />
            <DetailRow label={t('output.detailDiff')} value={`+${item.additions} / -${item.deletions} / ${item.files_changed} files`} mono />
            <DetailRow label={t('output.cost')} value={`$${item.allocated_cost}`} mono />
            {parseFloat(item.realized_revenue) > 0 && (
              <DetailRow label={t('output.revenue')} value={`$${item.realized_revenue}`} mono />
            )}

            <div className="h-px" style={{ background: '#1e1e22' }} />
            <div className="text-sm font-semibold" style={{ color: '#e4e4e7' }}>{t('output.detailEventTitle')}</div>
            <DetailRow label={t('output.detailEventId')} value={item.event_id} mono />
            {eventDetail ? (
              <>
                <DetailRow label={t('output.detailPillar')} value={eventDetail.pillar} />
                <DetailRow label={t('output.detailClassifier')} value={eventDetail.classifier} />
                <DetailRow label={t('output.detailImpact')} value={String(eventDetail.impact_score)} />
                <DetailRow label={t('output.detailOccurredAt')} value={new Date(eventDetail.occurred_at * 1000).toLocaleString()} />
                <DetailRow label={t('output.detailMetadata')} value={JSON.stringify(eventDetail.metadata, null, 2)} mono multiline />
              </>
            ) : (
              <div style={{ color: '#71717a' }}>{t('output.detailEventLoading')}</div>
            )}

            <div className="h-px mt-1" style={{ background: '#1e1e22' }} />
            <AssociationPanel outputMetadataId={item.id} projectId={projectId} />
          </div>
        ) : (
          <div className="text-sm" style={{ color: '#71717a' }}>{t('output.selectCommitHint')}</div>
        )}
      </SheetContent>
    </Sheet>
  )
}

function DetailRow({
  label,
  value,
  mono = false,
  multiline = false,
}: {
  label: string
  value: string
  mono?: boolean
  multiline?: boolean
}) {
  return (
    <div className="flex flex-col gap-1">
      <span style={{ color: '#71717a' }}>{label}</span>
      <pre
        className={multiline ? 'whitespace-pre-wrap break-words' : 'whitespace-pre-wrap break-all'}
        style={{ color: '#e4e4e7', fontFamily: mono ? 'var(--font-mono)' : 'inherit', margin: 0 }}
      >
        {value}
      </pre>
    </div>
  )
}

