import { useEffect, useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { useTranslation } from 'react-i18next'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { api, queryKeys } from '@/lib/api'
import { ProjectCard } from '@/components/explorer/ProjectCard'
import { EventTimeline } from '@/components/explorer/EventTimeline'
import { NodeSheet } from '@/components/node/NodeSheet'
import { PILLARS, PILLAR_COLORS } from '@soloos/shared'
import type { Event, Pillar } from '@soloos/shared'

export function Explorer() {
  const PAGE_SIZE = 20
  const DAY_SECONDS = 24 * 60 * 60
  const { t } = useTranslation()
  const [activeTab, setActiveTab] = useState<'projects' | 'pillars'>('projects')
  const [selectedEvent, setSelectedEvent] = useState<Event | null>(null)
  const [selectedProjectId, setSelectedProjectId] = useState<string | null>(null)
  const [selectedPillarFilter, setSelectedPillarFilter] = useState<Pillar | null>(null)
  const [timeFilterDays, setTimeFilterDays] = useState<1 | 7 | 30 | null>(null)
  const [currentPage, setCurrentPage] = useState(1)
  const [selectedPillar, setSelectedPillar] = useState<Pillar | null>(null)
  const [pillarPage, setPillarPage] = useState(1)

  const { data: projects = [] } = useQuery({
    queryKey: queryKeys.projects(),
    queryFn: api.projects.list,
  })
  const { data: allEvents = [] } = useQuery({
    queryKey: queryKeys.events(),
    queryFn: () => api.events.list(),
  })

  const projectEvents = selectedProjectId
    ? allEvents.filter(e => e.project_id === selectedProjectId)
    : allEvents
  const sortedProjectEvents = [...projectEvents].sort((a, b) => b.occurred_at - a.occurred_at)
  const filteredProjectEvents = selectedPillarFilter
    ? sortedProjectEvents.filter(e => String(e.pillar).toUpperCase() === selectedPillarFilter)
    : sortedProjectEvents
  const now = Math.floor(Date.now() / 1000)
  const timeFilteredProjectEvents = timeFilterDays === null
    ? filteredProjectEvents
    : filteredProjectEvents.filter(e => e.occurred_at >= now - (timeFilterDays * DAY_SECONDS))
  const totalPages = Math.max(1, Math.ceil(timeFilteredProjectEvents.length / PAGE_SIZE))
  const pageStart = (currentPage - 1) * PAGE_SIZE
  const pagedProjectEvents = timeFilteredProjectEvents.slice(pageStart, pageStart + PAGE_SIZE)

  useEffect(() => {
    setCurrentPage(1)
  }, [selectedProjectId, selectedPillarFilter, timeFilterDays])

  useEffect(() => {
    if (currentPage > totalPages) {
      setCurrentPage(totalPages)
    }
  }, [currentPage, totalPages])

  const eventsByPillar = PILLARS.reduce<Record<Pillar, Event[]>>((acc, pillar) => {
    acc[pillar] = allEvents
      .filter(e => String(e.pillar).toUpperCase() === pillar)
      .sort((a, b) => b.occurred_at - a.occurred_at)
    return acc
  }, {} as Record<Pillar, Event[]>)

  const pillarStats = PILLARS.map(pillar => {
    const evts = eventsByPillar[pillar]
    return {
      pillar,
      count: evts.length,
      impact: evts.reduce((s, e) => s + e.impact_score, 0),
    }
  })

  const hasAnyEvents = allEvents.length > 0
  const hasAnyPillarEvents = PILLARS.some(pillar => eventsByPillar[pillar].length > 0)
  const selectedPillarEvents = selectedPillar ? eventsByPillar[selectedPillar] : []
  const pillarTotalPages = Math.max(1, Math.ceil(selectedPillarEvents.length / PAGE_SIZE))
  const pillarPageStart = (pillarPage - 1) * PAGE_SIZE
  const pagedPillarEvents = selectedPillarEvents.slice(pillarPageStart, pillarPageStart + PAGE_SIZE)

  useEffect(() => {
    if (pillarPage > pillarTotalPages) {
      setPillarPage(pillarTotalPages)
    }
  }, [pillarPage, pillarTotalPages])

  return (
    <div className="flex flex-col gap-4 flex-1">
      <Tabs value={activeTab} onValueChange={v => setActiveTab(v as 'projects' | 'pillars')} className="flex flex-col flex-1 min-h-0">
        <TabsList className="w-fit flex-shrink-0" style={{ background: '#18181b' }}>
          <TabsTrigger value="projects">{t('explorer.projects')}</TabsTrigger>
          <TabsTrigger value="pillars">{t('explorer.pillars')}</TabsTrigger>
        </TabsList>

        <div className="relative flex-1 min-h-0 mt-2 overflow-hidden">
        {/* ── Projects tab ── */}
        <TabsContent
          forceMount
          value="projects"
          className={`h-full flex flex-col gap-4 ${
            activeTab === 'projects'
              ? 'relative'
              : 'absolute inset-0 pointer-events-none hidden'
          }`}
        >
          <div className="grid gap-3" style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))' }}>
            {projects.map(project => (
              <ProjectCard
                key={project.id}
                project={project}
                events={allEvents.filter(e => e.project_id === project.id)}
                onClick={() => setSelectedProjectId(
                  selectedProjectId === project.id ? null : project.id
                )}
              />
            ))}
            {projects.length === 0 && (
              <div className="col-span-full text-xs py-8 text-center" style={{ color: '#3f3f46' }}>
                {t('explorer.noProjects')}
              </div>
            )}
          </div>

          <div className="flex-1 rounded-xl overflow-hidden min-h-0"
               style={{ background: '#111', border: '1px solid #1e1e22' }}>
            <div className="px-4 py-2 border-b text-xs font-semibold uppercase tracking-widest flex-shrink-0"
                 style={{ borderColor: '#18181b', color: '#52525b' }}>
              {selectedProjectId
                ? t('explorer.projectEvents', { name: projects.find(p => p.id === selectedProjectId)?.name ?? '' })
                : selectedPillarFilter
                  ? t('explorer.pillarEvents', { pillar: t(`pillars.${selectedPillarFilter}`) })
                  : t('explorer.allEvents')}
              {selectedPillarFilter && (
                <button
                  onClick={() => setSelectedPillarFilter(null)}
                  className="ml-2 text-[11px] font-medium normal-case tracking-normal"
                  style={{ color: '#a1a1aa' }}
                >
                  {t('explorer.clearFilter')}
                </button>
              )}
            </div>
            <div className="px-4 py-2 border-b flex items-center justify-between gap-3 text-xs flex-shrink-0"
                 style={{ borderColor: '#18181b', color: '#71717a' }}>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setTimeFilterDays(null)}
                  className="px-2.5 py-1 rounded-md"
                  style={{
                    color: timeFilterDays === null ? '#e4e4e7' : '#a1a1aa',
                    background: timeFilterDays === null ? '#27272a' : 'transparent',
                  }}
                >
                  {t('explorer.allTime')}
                </button>
                {[1, 7, 30].map(days => (
                  <button
                    key={days}
                    onClick={() => setTimeFilterDays(days as 1 | 7 | 30)}
                    className="px-2.5 py-1 rounded-md"
                    style={{
                      color: timeFilterDays === days ? '#e4e4e7' : '#a1a1aa',
                      background: timeFilterDays === days ? '#27272a' : 'transparent',
                    }}
                  >
                    {t('explorer.quickRange', { days })}
                  </button>
                ))}
              </div>
            </div>
            {timeFilteredProjectEvents.length === 0 ? (
              <div className="h-full min-h-[180px] flex flex-col items-center justify-center gap-2 px-6 text-center">
                <div className="text-sm font-medium" style={{ color: '#a1a1aa' }}>
                  {t('explorer.noEvents')}
                </div>
                <div className="text-xs" style={{ color: '#52525b' }}>
                  {selectedProjectId ? t('explorer.pickProjectHint') : t('explorer.noProjects')}
                </div>
              </div>
            ) : (
              <div className="h-full flex flex-col min-h-0">
                <div className="flex-1 min-h-0">
                  <EventTimeline events={pagedProjectEvents} onEventClick={setSelectedEvent} />
                </div>
                <div className="px-4 py-2 border-t flex items-center justify-between text-xs flex-shrink-0"
                     style={{ borderColor: '#18181b', color: '#71717a' }}>
                  <span>
                    {t('explorer.pageIndicator', { page: currentPage, total: totalPages })}
                  </span>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                      disabled={currentPage === 1}
                      className="px-2 py-1 rounded border disabled:opacity-40 disabled:cursor-not-allowed"
                      style={{ borderColor: '#27272a', color: '#a1a1aa', background: '#111' }}
                    >
                      {t('explorer.prevPage')}
                    </button>
                    <button
                      onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                      disabled={currentPage === totalPages}
                      className="px-2 py-1 rounded border disabled:opacity-40 disabled:cursor-not-allowed"
                      style={{ borderColor: '#27272a', color: '#a1a1aa', background: '#111' }}
                    >
                      {t('explorer.nextPage')}
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>
        </TabsContent>

        {/* ── Pillars tab ── */}
        <TabsContent
          forceMount
          value="pillars"
          className={`h-full flex flex-col gap-3 ${
            activeTab === 'pillars'
              ? 'relative'
              : 'absolute inset-0 pointer-events-none hidden'
          }`}
        >
          {/* Summary strip — always visible, never scrolled away */}
          <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-5 gap-2 flex-shrink-0">
            {pillarStats.map(({ pillar, count, impact }) => (
              <div
                   key={pillar}
                   className="flex flex-col gap-2 p-3 rounded-xl transition-all duration-300 ease-out hover:-translate-y-0.5 hover:shadow-[0_0_0_1px_var(--pillar-glow),0_0_22px_var(--pillar-glow-soft)]"
                   style={{
                     background: '#111',
                     border: `1px solid ${PILLAR_COLORS[pillar as Pillar]}33`,
                     ['--pillar-glow' as string]: `${PILLAR_COLORS[pillar as Pillar]}80`,
                     ['--pillar-glow-soft' as string]: `${PILLAR_COLORS[pillar as Pillar]}33`,
                   }}>
                <div className="flex items-center gap-1.5">
                  <div className="w-2 h-2 rounded-full flex-shrink-0"
                       style={{ background: PILLAR_COLORS[pillar as Pillar] }} />
                  <span className="text-xs font-bold uppercase tracking-widest"
                        style={{ color: PILLAR_COLORS[pillar as Pillar] }}>
                    {t(`pillars.${pillar}`)}
                  </span>
                </div>
                <span className="font-mono text-2xl font-bold leading-none" style={{ color: '#e4e4e7' }}>
                  {count}
                </span>
                <div className="flex items-center justify-between">
                  <span className="text-xs" style={{ color: '#52525b' }}>{t('explorer.totalImpact')}</span>
                  <span className="font-mono text-xs font-bold"
                        style={{ color: impact > 0 ? PILLAR_COLORS[pillar as Pillar] : '#3f3f46' }}>
                    {impact}
                  </span>
                </div>
                {/* mini progress bar relative to max impact */}
                <div className="h-0.5 rounded-full w-full" style={{ background: '#18181b' }}>
                  <div className="h-full rounded-full"
                       style={{
                         width: `${Math.min(100, (impact / Math.max(1, ...pillarStats.map(s => s.impact))) * 100)}%`,
                         background: PILLAR_COLORS[pillar as Pillar],
                         opacity: 0.7,
                       }} />
                </div>
              </div>
            ))}
          </div>

          {/* Scrollable pillar event lists */}
          <div className="flex-1 min-h-0 overflow-y-auto flex flex-col gap-3">
            {!hasAnyEvents && (
              <div className="text-xs py-12 text-center" style={{ color: '#3f3f46' }}>
                {t('explorer.noEvents')}
              </div>
            )}
            {hasAnyEvents && !hasAnyPillarEvents && (
              <div className="text-xs py-12 text-center" style={{ color: '#3f3f46' }}>
                {t('explorer.noEvents')}
              </div>
            )}
            {!selectedPillar && PILLARS.map(pillar => {
              const pillarsEvents = eventsByPillar[pillar]
              if (pillarsEvents.length === 0) return null
              const previewEvents = pillarsEvents.slice(0, 5)
              return (
                <div key={pillar} className="rounded-xl overflow-hidden flex-shrink-0"
                     style={{ background: '#111', border: '1px solid #1e1e22' }}>
                  <div className="px-4 py-2 border-b text-xs font-bold uppercase tracking-widest flex items-center justify-between"
                       style={{ borderColor: '#18181b', color: PILLAR_COLORS[pillar as Pillar] }}>
                    <span>{t(`pillars.${pillar}`)} · {pillarsEvents.length}</span>
                    <button
                      onClick={() => {
                        setSelectedPillar(pillar)
                        setPillarPage(1)
                      }}
                      className="text-[11px] font-medium normal-case tracking-normal"
                      style={{ color: '#a1a1aa' }}
                    >
                      {t('explorer.seeAll')}
                    </button>
                  </div>
                  <EventTimeline events={previewEvents} onEventClick={setSelectedEvent} autoHeight />
                </div>
              )
            })}
            {selectedPillar && (
              <div className="rounded-xl overflow-hidden flex flex-col min-h-0 flex-1"
                   style={{ background: '#111', border: '1px solid #1e1e22' }}>
                <div className="px-4 py-2 border-b text-xs font-bold uppercase tracking-widest flex items-center justify-between flex-shrink-0"
                     style={{ borderColor: '#18181b', color: PILLAR_COLORS[selectedPillar as Pillar] }}>
                  <span>{t('explorer.allPillarEvents', { pillar: t(`pillars.${selectedPillar}`) })}</span>
                  <button
                    onClick={() => setSelectedPillar(null)}
                    className="text-[11px] font-medium normal-case tracking-normal"
                    style={{ color: '#a1a1aa' }}
                  >
                    {t('explorer.backToPillars')}
                  </button>
                </div>
                <div className="flex-1 min-h-0">
                  <EventTimeline events={pagedPillarEvents} onEventClick={setSelectedEvent} />
                </div>
                <div className="px-4 py-2 border-t flex items-center justify-between text-xs flex-shrink-0"
                     style={{ borderColor: '#18181b', color: '#71717a' }}>
                  <span>
                    {t('explorer.pageIndicator', { page: pillarPage, total: pillarTotalPages })}
                  </span>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => setPillarPage(p => Math.max(1, p - 1))}
                      disabled={pillarPage === 1}
                      className="px-2 py-1 rounded border disabled:opacity-40 disabled:cursor-not-allowed"
                      style={{ borderColor: '#27272a', color: '#a1a1aa', background: '#111' }}
                    >
                      {t('explorer.prevPage')}
                    </button>
                    <button
                      onClick={() => setPillarPage(p => Math.min(pillarTotalPages, p + 1))}
                      disabled={pillarPage === pillarTotalPages}
                      className="px-2 py-1 rounded border disabled:opacity-40 disabled:cursor-not-allowed"
                      style={{ borderColor: '#27272a', color: '#a1a1aa', background: '#111' }}
                    >
                      {t('explorer.nextPage')}
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>
        </TabsContent>
        </div>
      </Tabs>

      <NodeSheet event={selectedEvent} onClose={() => setSelectedEvent(null)} />
    </div>
  )
}
