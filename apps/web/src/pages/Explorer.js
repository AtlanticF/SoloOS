import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useEffect, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { api, queryKeys } from '@/lib/api';
import { ProjectCard } from '@/components/explorer/ProjectCard';
import { EventTimeline } from '@/components/explorer/EventTimeline';
import { NodeSheet } from '@/components/node/NodeSheet';
import { PILLARS, PILLAR_COLORS } from '@soloos/shared';
export function Explorer() {
    const PAGE_SIZE = 20;
    const DAY_SECONDS = 24 * 60 * 60;
    const { t } = useTranslation();
    const [activeTab, setActiveTab] = useState('projects');
    const [selectedEvent, setSelectedEvent] = useState(null);
    const [selectedProjectId, setSelectedProjectId] = useState(null);
    const [selectedPillarFilter, setSelectedPillarFilter] = useState(null);
    const [timeFilterDays, setTimeFilterDays] = useState(null);
    const [currentPage, setCurrentPage] = useState(1);
    const [selectedPillar, setSelectedPillar] = useState(null);
    const [pillarPage, setPillarPage] = useState(1);
    const { data: projects = [] } = useQuery({
        queryKey: queryKeys.projects(),
        queryFn: api.projects.list,
    });
    const { data: allEvents = [] } = useQuery({
        queryKey: queryKeys.events(),
        queryFn: () => api.events.list(),
    });
    const projectEvents = selectedProjectId
        ? allEvents.filter(e => e.project_id === selectedProjectId)
        : allEvents;
    const sortedProjectEvents = [...projectEvents].sort((a, b) => b.occurred_at - a.occurred_at);
    const filteredProjectEvents = selectedPillarFilter
        ? sortedProjectEvents.filter(e => String(e.pillar).toUpperCase() === selectedPillarFilter)
        : sortedProjectEvents;
    const now = Math.floor(Date.now() / 1000);
    const timeFilteredProjectEvents = timeFilterDays === null
        ? filteredProjectEvents
        : filteredProjectEvents.filter(e => e.occurred_at >= now - (timeFilterDays * DAY_SECONDS));
    const totalPages = Math.max(1, Math.ceil(timeFilteredProjectEvents.length / PAGE_SIZE));
    const pageStart = (currentPage - 1) * PAGE_SIZE;
    const pagedProjectEvents = timeFilteredProjectEvents.slice(pageStart, pageStart + PAGE_SIZE);
    useEffect(() => {
        setCurrentPage(1);
    }, [selectedProjectId, selectedPillarFilter, timeFilterDays]);
    useEffect(() => {
        if (currentPage > totalPages) {
            setCurrentPage(totalPages);
        }
    }, [currentPage, totalPages]);
    const eventsByPillar = PILLARS.reduce((acc, pillar) => {
        acc[pillar] = allEvents
            .filter(e => String(e.pillar).toUpperCase() === pillar)
            .sort((a, b) => b.occurred_at - a.occurred_at);
        return acc;
    }, {});
    const pillarStats = PILLARS.map(pillar => {
        const evts = eventsByPillar[pillar];
        return {
            pillar,
            count: evts.length,
            impact: evts.reduce((s, e) => s + e.impact_score, 0),
        };
    });
    const hasAnyEvents = allEvents.length > 0;
    const hasAnyPillarEvents = PILLARS.some(pillar => eventsByPillar[pillar].length > 0);
    const selectedPillarEvents = selectedPillar ? eventsByPillar[selectedPillar] : [];
    const pillarTotalPages = Math.max(1, Math.ceil(selectedPillarEvents.length / PAGE_SIZE));
    const pillarPageStart = (pillarPage - 1) * PAGE_SIZE;
    const pagedPillarEvents = selectedPillarEvents.slice(pillarPageStart, pillarPageStart + PAGE_SIZE);
    useEffect(() => {
        if (pillarPage > pillarTotalPages) {
            setPillarPage(pillarTotalPages);
        }
    }, [pillarPage, pillarTotalPages]);
    return (_jsxs("div", { className: "flex flex-col gap-4 flex-1", children: [_jsxs(Tabs, { value: activeTab, onValueChange: v => setActiveTab(v), className: "flex flex-col flex-1 min-h-0", children: [_jsxs(TabsList, { className: "w-fit flex-shrink-0", style: { background: '#18181b' }, children: [_jsx(TabsTrigger, { value: "projects", children: t('explorer.projects') }), _jsx(TabsTrigger, { value: "pillars", children: t('explorer.pillars') })] }), _jsxs("div", { className: "relative flex-1 min-h-0 mt-2 overflow-hidden", children: [_jsxs(TabsContent, { forceMount: true, value: "projects", className: `h-full flex flex-col gap-4 ${activeTab === 'projects'
                                    ? 'relative'
                                    : 'absolute inset-0 pointer-events-none hidden'}`, children: [_jsxs("div", { className: "grid gap-3", style: { gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))' }, children: [projects.map(project => (_jsx(ProjectCard, { project: project, events: allEvents.filter(e => e.project_id === project.id), onClick: () => setSelectedProjectId(selectedProjectId === project.id ? null : project.id) }, project.id))), projects.length === 0 && (_jsx("div", { className: "col-span-full text-xs py-8 text-center", style: { color: '#3f3f46' }, children: t('explorer.noProjects') }))] }), _jsxs("div", { className: "flex-1 rounded-xl overflow-hidden min-h-0", style: { background: '#111', border: '1px solid #1e1e22' }, children: [_jsxs("div", { className: "px-4 py-2 border-b text-xs font-semibold uppercase tracking-widest flex-shrink-0", style: { borderColor: '#18181b', color: '#52525b' }, children: [selectedProjectId
                                                        ? t('explorer.projectEvents', { name: projects.find(p => p.id === selectedProjectId)?.name ?? '' })
                                                        : selectedPillarFilter
                                                            ? t('explorer.pillarEvents', { pillar: t(`pillars.${selectedPillarFilter}`) })
                                                            : t('explorer.allEvents'), selectedPillarFilter && (_jsx("button", { onClick: () => setSelectedPillarFilter(null), className: "ml-2 text-[11px] font-medium normal-case tracking-normal", style: { color: '#a1a1aa' }, children: t('explorer.clearFilter') }))] }), _jsx("div", { className: "px-4 py-2 border-b flex items-center justify-between gap-3 text-xs flex-shrink-0", style: { borderColor: '#18181b', color: '#71717a' }, children: _jsxs("div", { className: "flex items-center gap-2", children: [_jsx("button", { onClick: () => setTimeFilterDays(null), className: "px-2.5 py-1 rounded-md", style: {
                                                                color: timeFilterDays === null ? '#e4e4e7' : '#a1a1aa',
                                                                background: timeFilterDays === null ? '#27272a' : 'transparent',
                                                            }, children: t('explorer.allTime') }), [1, 7, 30].map(days => (_jsx("button", { onClick: () => setTimeFilterDays(days), className: "px-2.5 py-1 rounded-md", style: {
                                                                color: timeFilterDays === days ? '#e4e4e7' : '#a1a1aa',
                                                                background: timeFilterDays === days ? '#27272a' : 'transparent',
                                                            }, children: t('explorer.quickRange', { days }) }, days)))] }) }), timeFilteredProjectEvents.length === 0 ? (_jsxs("div", { className: "h-full min-h-[180px] flex flex-col items-center justify-center gap-2 px-6 text-center", children: [_jsx("div", { className: "text-sm font-medium", style: { color: '#a1a1aa' }, children: t('explorer.noEvents') }), _jsx("div", { className: "text-xs", style: { color: '#52525b' }, children: selectedProjectId ? t('explorer.pickProjectHint') : t('explorer.noProjects') })] })) : (_jsxs("div", { className: "h-full flex flex-col min-h-0", children: [_jsx("div", { className: "flex-1 min-h-0", children: _jsx(EventTimeline, { events: pagedProjectEvents, onEventClick: setSelectedEvent }) }), _jsxs("div", { className: "px-4 py-2 border-t flex items-center justify-between text-xs flex-shrink-0", style: { borderColor: '#18181b', color: '#71717a' }, children: [_jsx("span", { children: t('explorer.pageIndicator', { page: currentPage, total: totalPages }) }), _jsxs("div", { className: "flex items-center gap-2", children: [_jsx("button", { onClick: () => setCurrentPage(p => Math.max(1, p - 1)), disabled: currentPage === 1, className: "px-2 py-1 rounded border disabled:opacity-40 disabled:cursor-not-allowed", style: { borderColor: '#27272a', color: '#a1a1aa', background: '#111' }, children: t('explorer.prevPage') }), _jsx("button", { onClick: () => setCurrentPage(p => Math.min(totalPages, p + 1)), disabled: currentPage === totalPages, className: "px-2 py-1 rounded border disabled:opacity-40 disabled:cursor-not-allowed", style: { borderColor: '#27272a', color: '#a1a1aa', background: '#111' }, children: t('explorer.nextPage') })] })] })] }))] })] }), _jsxs(TabsContent, { forceMount: true, value: "pillars", className: `h-full flex flex-col gap-3 ${activeTab === 'pillars'
                                    ? 'relative'
                                    : 'absolute inset-0 pointer-events-none hidden'}`, children: [_jsx("div", { className: "grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-5 gap-2 flex-shrink-0", children: pillarStats.map(({ pillar, count, impact }) => (_jsxs("div", { className: "flex flex-col gap-2 p-3 rounded-xl transition-all duration-300 ease-out hover:-translate-y-0.5 hover:shadow-[0_0_0_1px_var(--pillar-glow),0_0_22px_var(--pillar-glow-soft)]", style: {
                                                background: '#111',
                                                border: `1px solid ${PILLAR_COLORS[pillar]}33`,
                                                ['--pillar-glow']: `${PILLAR_COLORS[pillar]}80`,
                                                ['--pillar-glow-soft']: `${PILLAR_COLORS[pillar]}33`,
                                            }, children: [_jsxs("div", { className: "flex items-center gap-1.5", children: [_jsx("div", { className: "w-2 h-2 rounded-full flex-shrink-0", style: { background: PILLAR_COLORS[pillar] } }), _jsx("span", { className: "text-xs font-bold uppercase tracking-widest", style: { color: PILLAR_COLORS[pillar] }, children: t(`pillars.${pillar}`) })] }), _jsx("span", { className: "font-mono text-2xl font-bold leading-none", style: { color: '#e4e4e7' }, children: count }), _jsxs("div", { className: "flex items-center justify-between", children: [_jsx("span", { className: "text-xs", style: { color: '#52525b' }, children: t('explorer.totalImpact') }), _jsx("span", { className: "font-mono text-xs font-bold", style: { color: impact > 0 ? PILLAR_COLORS[pillar] : '#3f3f46' }, children: impact })] }), _jsx("div", { className: "h-0.5 rounded-full w-full", style: { background: '#18181b' }, children: _jsx("div", { className: "h-full rounded-full", style: {
                                                            width: `${Math.min(100, (impact / Math.max(1, ...pillarStats.map(s => s.impact))) * 100)}%`,
                                                            background: PILLAR_COLORS[pillar],
                                                            opacity: 0.7,
                                                        } }) })] }, pillar))) }), _jsxs("div", { className: "flex-1 min-h-0 overflow-y-auto flex flex-col gap-3", children: [!hasAnyEvents && (_jsx("div", { className: "text-xs py-12 text-center", style: { color: '#3f3f46' }, children: t('explorer.noEvents') })), hasAnyEvents && !hasAnyPillarEvents && (_jsx("div", { className: "text-xs py-12 text-center", style: { color: '#3f3f46' }, children: t('explorer.noEvents') })), !selectedPillar && PILLARS.map(pillar => {
                                                const pillarsEvents = eventsByPillar[pillar];
                                                if (pillarsEvents.length === 0)
                                                    return null;
                                                const previewEvents = pillarsEvents.slice(0, 5);
                                                return (_jsxs("div", { className: "rounded-xl overflow-hidden flex-shrink-0", style: { background: '#111', border: '1px solid #1e1e22' }, children: [_jsxs("div", { className: "px-4 py-2 border-b text-xs font-bold uppercase tracking-widest flex items-center justify-between", style: { borderColor: '#18181b', color: PILLAR_COLORS[pillar] }, children: [_jsxs("span", { children: [t(`pillars.${pillar}`), " \u00B7 ", pillarsEvents.length] }), _jsx("button", { onClick: () => {
                                                                        setSelectedPillar(pillar);
                                                                        setPillarPage(1);
                                                                    }, className: "text-[11px] font-medium normal-case tracking-normal", style: { color: '#a1a1aa' }, children: t('explorer.seeAll') })] }), _jsx(EventTimeline, { events: previewEvents, onEventClick: setSelectedEvent, autoHeight: true })] }, pillar));
                                            }), selectedPillar && (_jsxs("div", { className: "rounded-xl overflow-hidden flex flex-col min-h-0 flex-1", style: { background: '#111', border: '1px solid #1e1e22' }, children: [_jsxs("div", { className: "px-4 py-2 border-b text-xs font-bold uppercase tracking-widest flex items-center justify-between flex-shrink-0", style: { borderColor: '#18181b', color: PILLAR_COLORS[selectedPillar] }, children: [_jsx("span", { children: t('explorer.allPillarEvents', { pillar: t(`pillars.${selectedPillar}`) }) }), _jsx("button", { onClick: () => setSelectedPillar(null), className: "text-[11px] font-medium normal-case tracking-normal", style: { color: '#a1a1aa' }, children: t('explorer.backToPillars') })] }), _jsx("div", { className: "flex-1 min-h-0", children: _jsx(EventTimeline, { events: pagedPillarEvents, onEventClick: setSelectedEvent }) }), _jsxs("div", { className: "px-4 py-2 border-t flex items-center justify-between text-xs flex-shrink-0", style: { borderColor: '#18181b', color: '#71717a' }, children: [_jsx("span", { children: t('explorer.pageIndicator', { page: pillarPage, total: pillarTotalPages }) }), _jsxs("div", { className: "flex items-center gap-2", children: [_jsx("button", { onClick: () => setPillarPage(p => Math.max(1, p - 1)), disabled: pillarPage === 1, className: "px-2 py-1 rounded border disabled:opacity-40 disabled:cursor-not-allowed", style: { borderColor: '#27272a', color: '#a1a1aa', background: '#111' }, children: t('explorer.prevPage') }), _jsx("button", { onClick: () => setPillarPage(p => Math.min(pillarTotalPages, p + 1)), disabled: pillarPage === pillarTotalPages, className: "px-2 py-1 rounded border disabled:opacity-40 disabled:cursor-not-allowed", style: { borderColor: '#27272a', color: '#a1a1aa', background: '#111' }, children: t('explorer.nextPage') })] })] })] }))] })] })] })] }), _jsx(NodeSheet, { event: selectedEvent, onClose: () => setSelectedEvent(null) })] }));
}
