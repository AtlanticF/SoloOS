import { jsx as _jsx, jsxs as _jsxs, Fragment as _Fragment } from "react/jsx-runtime";
import { useTranslation } from 'react-i18next';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { RelationChain } from './RelationChain';
import { formatTs } from '@/lib/utils';
import { PILLAR_COLORS } from '@soloos/shared';
import { api, queryKeys } from '@/lib/api';
export function NodeSheet({ event, onClose }) {
    const { t, i18n } = useTranslation();
    const queryClient = useQueryClient();
    const pillarColor = event ? PILLAR_COLORS[event.pillar] : '#6366f1';
    const insightId = event?.pillar === 'INPUT'
        ? event.metadata?.insight_id
        : undefined;
    const { data: insight } = useQuery({
        queryKey: queryKeys.insights({ id: insightId }),
        queryFn: () => api.insights.get(insightId),
        enabled: !!insightId,
    });
    const { data: outputDetail } = useQuery({
        queryKey: queryKeys.outputEvents({ eventId: event?.id }),
        queryFn: () => api.output.eventById(event.id),
        enabled: !!event?.id && event?.pillar === 'OUTPUT',
    });
    const insightProjectId = insight?.project_id ?? event?.project_id ?? undefined;
    const { data: pendingAssociationsPage } = useQuery({
        queryKey: queryKeys.associations({ project_id: insightProjectId, status: 'PENDING_REVIEW' }),
        queryFn: () => api.associations.list({ project_id: insightProjectId, status: 'PENDING_REVIEW' }),
        enabled: !!insight?.id && !!insightProjectId,
    });
    const { data: confirmedAssociationsPage } = useQuery({
        queryKey: queryKeys.associations({ project_id: insightProjectId, status: 'CONFIRMED' }),
        queryFn: () => api.associations.list({ project_id: insightProjectId, status: 'CONFIRMED' }),
        enabled: !!insight?.id && !!insightProjectId,
    });
    const pendingAssociations = (pendingAssociationsPage?.items ?? []).filter((a) => a.source_id === insight?.id);
    const confirmedCount = (confirmedAssociationsPage?.items ?? []).filter((a) => a.source_id === insight?.id).length;
    const confirmMutation = useMutation({
        mutationFn: (id) => api.associations.confirm(id),
        onSuccess: async () => {
            await Promise.all([
                pendingAssociationsPage ? queryClient.refetchQueries({ queryKey: queryKeys.associations({ project_id: insightProjectId, status: 'PENDING_REVIEW' }) }) : Promise.resolve(),
                confirmedAssociationsPage ? queryClient.refetchQueries({ queryKey: queryKeys.associations({ project_id: insightProjectId, status: 'CONFIRMED' }) }) : Promise.resolve(),
                queryClient.invalidateQueries({ queryKey: ['associations'] }),
                queryClient.invalidateQueries({ queryKey: queryKeys.insights() }),
                queryClient.invalidateQueries({ queryKey: queryKeys.events() }),
            ]);
        },
    });
    const rejectMutation = useMutation({
        mutationFn: (id) => api.associations.reject(id),
        onSuccess: async () => {
            await Promise.all([
                pendingAssociationsPage ? queryClient.refetchQueries({ queryKey: queryKeys.associations({ project_id: insightProjectId, status: 'PENDING_REVIEW' }) }) : Promise.resolve(),
                confirmedAssociationsPage ? queryClient.refetchQueries({ queryKey: queryKeys.associations({ project_id: insightProjectId, status: 'CONFIRMED' }) }) : Promise.resolve(),
                queryClient.invalidateQueries({ queryKey: ['associations'] }),
                queryClient.invalidateQueries({ queryKey: queryKeys.insights() }),
                queryClient.invalidateQueries({ queryKey: queryKeys.events() }),
            ]);
        },
    });
    return (_jsx(Sheet, { open: !!event, onOpenChange: open => !open && onClose(), children: _jsx(SheetContent, { side: "right", className: "w-[400px] flex flex-col gap-4 overflow-y-auto", style: { background: '#0d0d0d', borderLeft: '1px solid #1e1e22' }, children: event && (_jsxs(_Fragment, { children: [_jsx(SheetHeader, { children: _jsxs("div", { className: "flex items-center gap-2", children: [_jsx("span", { className: `px-2 py-0.5 rounded text-xs font-bold pillar-badge-${event.pillar.toLowerCase()}`, children: t(`pillars.${event.pillar}`) }), _jsx(SheetTitle, { className: "text-sm font-semibold", children: t('nodeSheet.eventDetail') })] }) }), insight && (_jsx(InsightPanel, { insight: insight, pendingAssociations: pendingAssociations, confirmedCount: confirmedCount, onConfirm: (id) => confirmMutation.mutate(id), onReject: (id) => rejectMutation.mutate(id), actionLoadingId: confirmMutation.isPending ? confirmMutation.variables : (rejectMutation.isPending ? rejectMutation.variables : undefined) })), event.pillar === 'OUTPUT' && outputDetail && _jsx(OutputDetailPanel, { detail: outputDetail }), !insight && !(event.pillar === 'OUTPUT' && outputDetail) && (_jsx("div", { className: "rounded-lg p-3 text-xs leading-relaxed", style: { background: '#18181b', border: '1px solid #27272a', color: '#a1a1aa' }, children: typeof event.metadata === 'object' && event.metadata !== null && 'commit' in event.metadata
                            ? String(event.metadata.commit)
                            : event.entry_id })), _jsxs("div", { className: "flex gap-4 text-xs font-mono", style: { color: '#52525b' }, children: [_jsx("span", { children: formatTs(event.occurred_at, i18n.language) }), _jsx("span", { children: "\u00B7" }), _jsx("span", { children: event.classifier }), _jsx("span", { children: "\u00B7" }), _jsxs("span", { children: [t('nodeSheet.impact'), ": ", event.impact_score > 0 ? '+' : '', event.impact_score] })] }), _jsx(Separator, { style: { background: '#1e1e22' } }), _jsxs("div", { children: [_jsx("span", { className: "text-xs font-semibold uppercase tracking-widest block mb-3", style: { color: '#52525b' }, children: t('nodeSheet.correlationChain') }), _jsx(RelationChain, { links: [], events: [] })] }), _jsx(Separator, { style: { background: '#1e1e22' } }), _jsxs("div", { children: [_jsx("span", { className: "text-xs font-semibold uppercase tracking-widest block mb-3", style: { color: '#52525b' }, children: t('nodeSheet.calibration') }), _jsxs("div", { className: "flex gap-2", children: [_jsxs(Button, { size: "sm", variant: "outline", className: "text-xs flex-1", style: { borderColor: `${pillarColor}33`, color: pillarColor }, children: ["\u2713 ", t('nodeSheet.confirm')] }), _jsxs(Button, { size: "sm", variant: "outline", className: "text-xs flex-1", style: { borderColor: '#f4433633', color: '#f44336' }, children: ["\u2717 ", t('nodeSheet.disconnect')] })] }), _jsx("p", { className: "text-xs mt-2", style: { color: '#3f3f46' }, children: t('nodeSheet.confirmHint') })] })] })) }) }));
}
function OutputDetailPanel({ detail }) {
    return (_jsxs("div", { className: "flex flex-col gap-2.5 rounded-lg p-3", style: { background: '#1d4ed808', border: '1px solid #1d4ed825' }, children: [_jsxs("div", { className: "grid grid-cols-[1fr_auto] gap-2", children: [_jsx("span", { className: "text-xs font-mono break-all", style: { color: '#93c5fd' }, children: detail.commit_sha }), _jsx("span", { className: "text-xs font-mono", style: { color: '#52525b' }, children: new Date(detail.committed_at * 1000).toLocaleDateString() })] }), _jsx("div", { className: "text-xs", style: { color: '#e4e4e7' }, children: detail.commit_message }), _jsxs("div", { className: "text-xs", style: { color: '#71717a' }, children: [detail.repo_name, " \u00B7 ", detail.author] }), _jsxs("div", { className: "flex items-center gap-3 text-xs font-mono", children: [_jsxs("span", { style: { color: '#4ade80' }, children: ["+", detail.additions] }), _jsxs("span", { style: { color: '#f87171' }, children: ["-", detail.deletions] }), _jsxs("span", { style: { color: '#a1a1aa' }, children: [detail.files_changed, " files"] }), _jsxs("span", { style: { color: '#71717a' }, children: ["$", detail.allocated_cost] }), parseFloat(detail.realized_revenue) > 0 && (_jsxs("span", { style: { color: '#fbbf24' }, children: ["\u2191$", detail.realized_revenue] }))] })] }));
}
function InsightPanel({ insight, pendingAssociations, confirmedCount, onConfirm, onReject, actionLoadingId, }) {
    const { t } = useTranslation();
    const STATUS_COLORS = {
        ACTIVE: '#10b981',
        INBOX: '#f59e0b',
        INCUBATING: '#6366f1',
        PROJECTIZED: '#8b5cf6',
    };
    const statusColor = STATUS_COLORS[insight.status] ?? '#71717a';
    return (_jsxs("div", { className: "flex flex-col gap-2.5 rounded-lg p-3", style: { background: '#10b98108', border: '1px solid #10b98125' }, children: [_jsxs("div", { className: "grid grid-cols-[1fr_1fr_auto] items-end gap-2 mb-0.5", children: [_jsxs("div", { className: "flex flex-col gap-1", children: [_jsx("span", { className: "text-[10px] font-semibold uppercase tracking-widest", style: { color: '#3f3f46' }, children: t('nodeSheet.type') }), _jsx("span", { className: "text-xs font-mono px-2 py-0.5 rounded w-fit", style: { background: '#10b98120', color: '#10b981' }, children: t(`nodeSheet.insightType.${insight.type}`) })] }), _jsxs("div", { className: "flex flex-col gap-1", children: [_jsx("span", { className: "text-[10px] font-semibold uppercase tracking-widest", style: { color: '#3f3f46' }, children: t('nodeSheet.status') }), _jsx("span", { className: "text-xs font-mono px-2 py-0.5 rounded w-fit", style: { background: `${statusColor}20`, color: statusColor }, children: t(`nodeSheet.insightStatus.${insight.status}`) })] }), _jsxs("span", { className: "text-xs font-mono self-center", style: { color: '#3f3f46' }, children: ["\u00D7", insight.metrics.certainty.toFixed(2)] })] }), insight.content.fact && (_jsxs("div", { children: [_jsx("div", { className: "text-xs font-semibold uppercase tracking-widest mb-0.5", style: { color: '#3f3f46' }, children: t('nodeSheet.source') }), _jsx("div", { className: "text-xs", style: { color: '#a1a1aa' }, children: insight.content.fact })] })), insight.content.synthesis && (_jsxs("div", { children: [_jsx("div", { className: "text-xs font-semibold uppercase tracking-widest mb-0.5", style: { color: '#3f3f46' }, children: t('nodeSheet.synthesis') }), _jsx("div", { className: "text-xs", style: { color: '#e4e4e7' }, children: insight.content.synthesis })] })), insight.content.vector && (_jsxs("div", { children: [_jsx("div", { className: "text-xs font-semibold uppercase tracking-widest mb-0.5", style: { color: '#3f3f46' }, children: t('nodeSheet.vector') }), _jsx("div", { className: "text-xs", style: { color: '#a1a1aa' }, children: insight.content.vector })] })), confirmedCount > 0 && (_jsx("div", { className: "text-xs font-medium inline-flex w-fit px-2 py-1 rounded", style: { color: '#fbbf24', background: 'rgba(251, 191, 36, 0.12)', border: '1px solid rgba(251, 191, 36, 0.35)' }, children: t('nodeSheet.confirmedOutputCount', { count: confirmedCount }) })), pendingAssociations.length > 0 && (_jsxs("div", { className: "pt-1", children: [_jsx("div", { className: "text-xs font-semibold uppercase tracking-widest mb-1.5", style: { color: '#3f3f46' }, children: t('nodeSheet.pendingOutput') }), _jsx("div", { className: "flex flex-col gap-1.5", children: pendingAssociations.map((assoc) => {
                            const pending = actionLoadingId === assoc.id;
                            return (_jsxs("div", { className: "rounded px-2 py-1.5 border", style: { borderColor: '#27272a' }, children: [_jsxs("div", { className: "flex items-center justify-between gap-2", children: [_jsx("span", { className: "text-xs truncate", style: { color: '#e4e4e7' }, children: assoc.target.commit_message }), _jsxs("div", { className: "flex items-center gap-1", children: [_jsx(Button, { size: "sm", variant: "outline", className: "h-6 px-2 text-[10px]", onClick: () => onConfirm(assoc.id), disabled: pending, style: { borderColor: '#10b98166', color: '#10b981' }, children: t('output.associationConfirm') }), _jsx(Button, { size: "sm", variant: "outline", className: "h-6 px-2 text-[10px]", onClick: () => onReject(assoc.id), disabled: pending, style: { borderColor: '#f8717166', color: '#f87171' }, children: t('output.associationReject') })] })] }), _jsxs("div", { className: "text-[11px] mt-1 flex items-center gap-2", style: { color: '#71717a' }, children: [_jsx("span", { className: "font-mono", children: assoc.target.commit_sha.slice(0, 8) }), _jsx("span", { children: "\u00B7" }), _jsx("span", { children: new Date(assoc.target.committed_at * 1000).toLocaleDateString() })] })] }, assoc.id));
                        }) })] }))] }));
}
