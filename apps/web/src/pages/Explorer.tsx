import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { api, queryKeys } from '@/lib/api'
import { ProjectCard } from '@/components/explorer/ProjectCard'
import { EventTimeline } from '@/components/explorer/EventTimeline'
import { NodeSheet } from '@/components/node/NodeSheet'
import { PILLARS } from '@soloos/shared'
import type { Event } from '@soloos/shared'

export function Explorer() {
  const [selectedEvent, setSelectedEvent] = useState<Event | null>(null)
  const [selectedProjectId, setSelectedProjectId] = useState<string | null>(null)

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

  return (
    <div className="flex flex-col gap-4 h-full">
      <Tabs defaultValue="projects" className="flex flex-col flex-1 min-h-0">
        <TabsList className="w-fit" style={{ background: '#18181b' }}>
          <TabsTrigger value="projects">Projects</TabsTrigger>
          <TabsTrigger value="pillars">Pillars</TabsTrigger>
        </TabsList>

        <TabsContent value="projects" className="flex-1 min-h-0 flex flex-col gap-4">
          {/* Bento grid */}
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
                No projects yet. Push a commit to a GitHub repo to auto-create one.
              </div>
            )}
          </div>

          {/* Event timeline for selected project */}
          <div className="flex-1 rounded-xl overflow-hidden min-h-0"
               style={{ background: '#111', border: '1px solid #1e1e22' }}>
            <div className="px-4 py-2 border-b text-xs font-semibold uppercase tracking-widest"
                 style={{ borderColor: '#18181b', color: '#52525b' }}>
              {selectedProjectId
                ? `${projects.find(p => p.id === selectedProjectId)?.name ?? ''} Events`
                : 'All Events'}
            </div>
            <EventTimeline events={projectEvents} onEventClick={setSelectedEvent} />
          </div>
        </TabsContent>

        <TabsContent value="pillars" className="flex-1 min-h-0 flex flex-col gap-3">
          {PILLARS.map(pillar => {
            const pillarsEvents = allEvents.filter(e => e.pillar === pillar)
            if (pillarsEvents.length === 0) return null
            return (
              <div key={pillar} className="rounded-xl overflow-hidden"
                   style={{ background: '#111', border: '1px solid #1e1e22' }}>
                <div className="px-4 py-2 border-b text-xs font-bold uppercase tracking-widest"
                     style={{ borderColor: '#18181b', color: `var(--pillar-${pillar.toLowerCase()})` }}>
                  {pillar} · {pillarsEvents.length}
                </div>
                <EventTimeline events={pillarsEvents} onEventClick={setSelectedEvent} />
              </div>
            )
          })}
        </TabsContent>
      </Tabs>

      <NodeSheet event={selectedEvent} onClose={() => setSelectedEvent(null)} />
    </div>
  )
}
