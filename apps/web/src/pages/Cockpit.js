import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useState } from 'react';
import { useQueries, useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { api, queryKeys } from '@/lib/api';
import { PillarRadar } from '@/components/cockpit/PillarRadar';
import { PulseCard } from '@/components/cockpit/PulseCard';
import { ReviewGate } from '@/components/cockpit/ReviewGate';
import { NodeSheet } from '@/components/node/NodeSheet';
import { PILLARS } from '@soloos/shared';
import { formatMoney } from '@/lib/utils';
export function Cockpit() {
    const { t } = useTranslation();
    const [selectedEvent, setSelectedEvent] = useState(null);
    const { data: review, isLoading: reviewLoading } = useQuery({
        queryKey: queryKeys.reviewCurrent(),
        queryFn: api.reviews.current,
    });
    const { data: events = [] } = useQuery({
        queryKey: queryKeys.events(),
        queryFn: () => api.events.list(),
    });
    const { data: projects = [] } = useQuery({
        queryKey: queryKeys.projects(),
        queryFn: api.projects.list,
    });
    const pillarTotals = Object.fromEntries(PILLARS.map(p => [p, 0]));
    for (const e of events)
        pillarTotals[e.pillar] += Math.max(0, e.impact_score);
    const maxTotal = Math.max(1, ...Object.values(pillarTotals));
    const scores = PILLARS.map(pillar => ({
        pillar,
        score: Math.round((pillarTotals[pillar] / maxTotal) * 100),
    }));
    const financialEvents = events.filter(e => e.pillar === 'FINANCIAL');
    const outputEvents = events.filter(e => e.pillar === 'OUTPUT');
    const inputEvents = events.filter(e => e.pillar === 'INPUT');
    const audienceEvents = events.filter(e => e.pillar === 'AUDIENCE');
    const energyScore = scores.find(s => s.pillar === 'ENERGY')?.score ?? 0;
    const totalRevenue = financialEvents.reduce((s, e) => s + Math.max(0, e.impact_score) * 10, 0);
    const commitCount = outputEvents.length;
    const inputCount = inputEvents.length;
    const audienceCount = audienceEvents.length;
    const projectNameById = new Map(projects.map((p) => [p.id, p.name]));
    const relevantProjectIds = Array.from(new Set(events
        .filter((e) => e.pillar === 'INPUT' && !!e.project_id)
        .map((e) => e.project_id)));
    const pendingAssociationQueries = useQueries({
        queries: relevantProjectIds.map((projectId) => ({
            queryKey: queryKeys.associations({ project_id: projectId, status: 'PENDING_REVIEW' }),
            queryFn: () => api.associations.list({ project_id: projectId, status: 'PENDING_REVIEW' }),
            staleTime: 60_000,
        })),
    });
    const confirmedAssociationQueries = useQueries({
        queries: relevantProjectIds.map((projectId) => ({
            queryKey: queryKeys.associations({ project_id: projectId, status: 'CONFIRMED' }),
            queryFn: () => api.associations.list({ project_id: projectId, status: 'CONFIRMED' }),
            staleTime: 60_000,
        })),
    });
    const getInsightIdFromEvent = (event) => {
        if (event.pillar !== 'INPUT' || typeof event.metadata !== 'object' || event.metadata === null)
            return undefined;
        const v = event.metadata.insight_id;
        return typeof v === 'string' ? v : undefined;
    };
    const pendingAssociationInsightIds = new Set();
    for (const q of pendingAssociationQueries) {
        const items = q.data?.items ?? [];
        for (const assoc of items)
            pendingAssociationInsightIds.add(assoc.source_id);
    }
    const confirmedAssociationInsightIds = new Set();
    for (const q of confirmedAssociationQueries) {
        const items = q.data?.items ?? [];
        for (const assoc of items)
            confirmedAssociationInsightIds.add(assoc.source_id);
    }
    const hasAnyAssociation = (event) => {
        const insightId = getInsightIdFromEvent(event);
        if (!insightId)
            return false;
        return pendingAssociationInsightIds.has(insightId) || confirmedAssociationInsightIds.has(insightId);
    };
    const hasPendingAssociation = (event) => {
        const insightId = getInsightIdFromEvent(event);
        if (!insightId)
            return false;
        return pendingAssociationInsightIds.has(insightId);
    };
    if (reviewLoading)
        return null;
    if (review && !review.completed_at) {
        return _jsx(ReviewGate, { review: review });
    }
    return (_jsxs("div", { className: "flex flex-col gap-4 flex-1", children: [_jsxs("div", { className: "grid gap-4", style: { gridTemplateColumns: '220px 1fr' }, children: [_jsxs("div", { className: "flex flex-col gap-3 p-4 rounded-xl", style: { background: '#111', border: '1px solid #1e1e22' }, children: [_jsx("span", { className: "text-xs font-semibold uppercase tracking-widest", style: { color: '#52525b' }, children: t('cockpit.balance') }), _jsx(PillarRadar, { scores: scores }), _jsx("div", { className: "flex flex-col gap-2", children: scores.map(({ pillar, score }) => (_jsxs("div", { className: "flex items-center gap-2", children: [_jsx("span", { className: "text-xs w-14 flex-shrink-0", style: { color: '#52525b' }, children: t(`pillars.${pillar}`) }), _jsx("div", { className: "flex-1 h-1 rounded-full", style: { background: '#18181b' }, children: _jsx("div", { className: "h-full rounded-full transition-all duration-700 ease-out", style: { width: `${score}%`, background: `var(--pillar-${pillar.toLowerCase()})` } }) }), _jsx("span", { className: "font-mono text-xs w-8 text-right", style: { color: `var(--pillar-${pillar.toLowerCase()})` }, children: score })] }, pillar))) })] }), _jsxs("div", { className: "flex flex-col gap-3", children: [_jsxs("div", { className: "grid grid-cols-5 gap-3", children: [_jsx(PulseCard, { label: t('cockpit.cashFlow'), value: formatMoney(totalRevenue), delta: financialEvents.length > 0
                                            ? t('cockpit.financialEvents', { count: financialEvents.length })
                                            : t('cockpit.noFinancial'), deltaPositive: totalRevenue > 0 }), _jsx(PulseCard, { label: t('cockpit.outputEvents'), value: String(commitCount), delta: commitCount > 0 ? t('cockpit.commitsDeliverables') : t('cockpit.noOutput') }), _jsx(PulseCard, { label: t('cockpit.inputEvents'), value: String(inputCount), delta: inputCount > 0 ? t('cockpit.learningInsights') : t('cockpit.noInput') }), _jsx(PulseCard, { label: t('cockpit.audienceEvents'), value: String(audienceCount), delta: audienceCount > 0 ? t('cockpit.audienceSignals') : t('cockpit.noAudience') }), _jsx(PulseCard, { label: t('cockpit.energy'), value: `${energyScore}/100`, delta: energyScore < 30 ? t('cockpit.energyLow') : t('cockpit.energyNominal'), deltaPositive: energyScore >= 30, alert: energyScore < 30 })] }), _jsxs("div", { className: "flex-1 rounded-xl p-4", style: { background: '#111', border: '1px solid #1e1e22' }, children: [_jsxs("div", { className: "mb-3 flex items-center justify-between", children: [_jsx("span", { className: "text-xs font-semibold uppercase tracking-widest block", style: { color: '#52525b' }, children: t('cockpit.recentEvents') }), _jsx(Link, { to: "/explorer", className: "text-[11px] font-medium", style: { color: '#a1a1aa' }, children: t('cockpit.seeAllEvents') })] }), [...events].sort((a, b) => b.occurred_at - a.occurred_at).slice(0, 8).map(event => (_jsxs("button", { type: "button", onClick: () => setSelectedEvent(event), className: "w-full text-left flex items-center gap-3 py-2 border-b text-xs transition-colors hover:bg-[#18181b22]", style: { borderColor: '#18181b' }, children: [_jsx("span", { className: `px-1.5 py-0.5 rounded text-xs font-bold pillar-badge-${event.pillar.toLowerCase()}`, children: t(`pillars.${event.pillar}`) }), _jsx("span", { className: "flex-1 truncate", style: { color: '#a1a1aa' }, children: event.title || String(event.entry_id).slice(0, 40) }), _jsx("span", { className: "font-mono flex-shrink-0", style: { color: '#3f3f46' }, children: new Date(event.occurred_at * 1000).toLocaleDateString() }), (() => {
                                                if (!hasAnyAssociation(event))
                                                    return null;
                                                const projectName = event.project_id
                                                    ? projectNameById.get(event.project_id) ?? String(event.project_id).slice(0, 8)
                                                    : t('output.unboundProject');
                                                return (_jsxs("span", { className: "flex-shrink-0 text-[11px] px-1.5 py-0.5 rounded", style: { color: '#71717a', border: '1px solid #27272a' }, children: [projectName, hasPendingAssociation(event) ? (_jsx("span", { className: "ml-1 align-middle inline-block h-1.5 w-1.5 rounded-full", style: { background: '#f59e0b' } })) : null] }));
                                            })()] }, event.id))), events.length === 0 && (_jsx("p", { className: "text-xs text-center py-8", style: { color: '#3f3f46' }, children: t('cockpit.noEvents', { cmd: t('cockpit.exampleCaptureCmd') }) }))] })] })] }), _jsx(NodeSheet, { event: selectedEvent, onClose: () => setSelectedEvent(null) })] }));
}
