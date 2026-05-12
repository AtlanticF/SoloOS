import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { CheckCircle2, XCircle } from 'lucide-react';
import { api, queryKeys } from '@/lib/api';
export function AssociationPanel({ outputMetadataId, projectId }) {
    const { t } = useTranslation();
    const queryClient = useQueryClient();
    const enabled = !!projectId;
    const { data, isLoading } = useQuery({
        queryKey: queryKeys.associations({ project_id: projectId, status: 'all' }),
        queryFn: async () => {
            const [pending, confirmed, rejected] = await Promise.all([
                api.associations.list({ project_id: projectId, status: 'PENDING_REVIEW', limit: 100 }),
                api.associations.list({ project_id: projectId, status: 'CONFIRMED', limit: 100 }),
                api.associations.list({ project_id: projectId, status: 'REJECTED', limit: 100 }),
            ]);
            return [...pending.items, ...confirmed.items, ...rejected.items];
        },
        enabled,
    });
    function invalidate() {
        queryClient.invalidateQueries({ queryKey: ['associations'] });
    }
    const confirm = useMutation({
        mutationFn: (id) => api.associations.confirm(id),
        onSuccess: invalidate,
    });
    const reject = useMutation({
        mutationFn: (id) => api.associations.reject(id),
        onSuccess: invalidate,
    });
    if (!projectId)
        return null;
    const commitAssociations = (data ?? []).filter((a) => a.target_id === outputMetadataId);
    const orderRank = {
        PENDING_REVIEW: 0,
        CONFIRMED: 1,
        REJECTED: 2,
    };
    const sorted = [...commitAssociations].sort((a, b) => orderRank[a.status] - orderRank[b.status]);
    return (_jsxs("div", { className: "flex flex-col gap-2", children: [_jsx("div", { className: "text-sm font-semibold", style: { color: '#e4e4e7' }, children: t('output.associationTitle') }), isLoading ? (_jsx("div", { className: "text-xs", style: { color: '#71717a' }, children: t('output.associationLoading') })) : sorted.length === 0 ? (_jsx("div", { className: "text-xs", style: { color: '#52525b' }, children: t('output.associationNoSuggestions') })) : (_jsx("div", { className: "flex flex-col gap-2", children: sorted.map((assoc) => (_jsx(AssociationCard, { assoc: assoc, onConfirm: () => confirm.mutate(assoc.id), onReject: () => reject.mutate(assoc.id), isPending: confirm.isPending || reject.isPending }, assoc.id))) }))] }));
}
function AssociationCard({ assoc, onConfirm, onReject, isPending, }) {
    const { t } = useTranslation();
    const score = assoc.match_score !== null ? Math.round(assoc.match_score * 100) : null;
    const statusColor = assoc.status === 'CONFIRMED' ? '#22c55e' :
        assoc.status === 'REJECTED' ? '#71717a' : '#a1a1aa';
    const statusLabel = assoc.status === 'CONFIRMED' ? t('output.associationConfirmed') :
        assoc.status === 'REJECTED' ? t('output.associationRejected') : null;
    return (_jsxs("div", { className: "rounded-lg border p-3 flex flex-col gap-2", style: { background: '#111113', borderColor: '#27272a' }, children: [_jsxs("div", { className: "flex items-start justify-between gap-2", children: [_jsx("div", { className: "text-xs font-medium leading-snug flex-1", style: { color: '#e4e4e7' }, children: assoc.source.synthesis }), _jsxs("div", { className: "flex items-center gap-2 shrink-0", children: [score !== null && (_jsx("span", { className: "text-[10px] px-1.5 py-0.5 rounded-full border", style: { color: '#a1a1aa', borderColor: '#3f3f46', background: '#18181b' }, children: t('output.associationMatch', { score }) })), statusLabel && (_jsx("span", { className: "text-[10px]", style: { color: statusColor }, children: statusLabel }))] })] }), assoc.reasoning && (_jsxs("div", { className: "text-[11px] leading-relaxed", style: { color: '#71717a' }, children: [_jsxs("span", { style: { color: '#52525b' }, children: [t('output.associationReasoning'), ": "] }), assoc.reasoning] })), assoc.status === 'PENDING_REVIEW' && (_jsxs("div", { className: "flex items-center gap-2 mt-1", children: [_jsxs("button", { onClick: onConfirm, disabled: isPending, className: "flex items-center gap-1 text-xs px-2.5 py-1 rounded-md border transition-colors disabled:opacity-50", style: { color: '#22c55e', borderColor: '#22c55e55', background: '#14532d22' }, children: [_jsx(CheckCircle2, { size: 12 }), t('output.associationConfirm')] }), _jsxs("button", { onClick: onReject, disabled: isPending, className: "flex items-center gap-1 text-xs px-2.5 py-1 rounded-md border transition-colors disabled:opacity-50", style: { color: '#71717a', borderColor: '#27272a', background: '#18181b' }, children: [_jsx(XCircle, { size: 12 }), t('output.associationReject')] })] }))] }));
}
