import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { Button } from '@/components/ui/button';
import { AgentCostSummaryPanel } from '@/components/review/AgentCostSummaryPanel';
import { api, queryKeys } from '@/lib/api';
import { formatTs } from '@/lib/utils';
const AGENT_COST_DECISIONS = ['continue', 'pause', 'kill', 'double_down'];
export function Review() {
    const { t } = useTranslation();
    const [reflection, setReflection] = useState('');
    const [energyRating, setEnergyRating] = useState();
    const [agentCostDecision, setAgentCostDecision] = useState();
    const qc = useQueryClient();
    const { data: review, isLoading } = useQuery({
        queryKey: queryKeys.reviewCurrent(),
        queryFn: api.reviews.current,
    });
    const complete = useMutation({
        mutationFn: () => api.reviews.complete(review.id, reflection, energyRating, requiresAgentCostDecision ? agentCostDecision : undefined),
        onSuccess: () => {
            qc.invalidateQueries({ queryKey: queryKeys.reviewCurrent() });
            setReflection('');
            setEnergyRating(undefined);
            setAgentCostDecision(undefined);
        },
    });
    if (isLoading)
        return _jsx("div", { className: "text-xs text-zinc-600", children: t('review.loading') });
    if (!review)
        return null;
    const isCompleted = !!review.completed_at;
    const requiresAgentCostDecision = Number(review.agent_cost_summary.total_amount) > 0;
    return (_jsxs("div", { className: "max-w-2xl mx-auto flex flex-col gap-6", children: [_jsxs("div", { children: [_jsx("h1", { className: "text-sm font-semibold tracking-tight", style: { color: '#e4e4e7' }, children: t('review.title') }), _jsx("p", { className: "text-xs mt-1", style: { color: '#71717a' }, children: t('review.period', { start: formatTs(review.period_start), end: formatTs(review.period_end) }) })] }), _jsx(AgentCostSummaryPanel, { summary: review.agent_cost_summary }), isCompleted ? (_jsxs("div", { className: "rounded-xl p-4", style: { background: '#111', border: '1px solid #1e1e22' }, children: [_jsx("span", { className: "text-xs font-semibold uppercase tracking-widest block mb-2", style: { color: '#10b981' }, children: t('review.completed', { date: formatTs(review.completed_at) }) }), _jsx("p", { className: "text-xs leading-relaxed", style: { color: '#a1a1aa' }, children: review.reflection })] })) : (_jsxs("div", { className: "flex flex-col gap-3", children: [_jsx("textarea", { className: "w-full rounded-lg p-3 text-sm resize-none", style: { background: '#18181b', border: '1px solid #27272a', color: '#e4e4e7', height: 160 }, placeholder: t('review.placeholder'), value: reflection, onChange: e => setReflection(e.target.value) }), _jsxs("div", { className: "flex flex-col gap-1.5", children: [_jsx("span", { className: "text-xs font-semibold uppercase tracking-widest", style: { color: '#71717a' }, children: t('review.energyLabel') }), _jsx("div", { className: "grid grid-cols-5 gap-2", children: [1, 2, 3, 4, 5].map(value => (_jsx("button", { type: "button", className: "h-9 rounded-md border text-xs font-semibold transition-colors", style: {
                                        background: energyRating === value ? 'rgba(139,92,246,0.12)' : '#18181b',
                                        borderColor: energyRating === value ? '#8b5cf6' : '#27272a',
                                        color: energyRating === value ? '#8b5cf6' : '#a1a1aa',
                                    }, onClick: () => setEnergyRating(value), children: value }, value))) }), _jsx("p", { className: "text-xs", style: { color: '#3f3f46' }, children: t('review.energyHint') })] }), requiresAgentCostDecision && (_jsx("div", { className: "grid grid-cols-2 gap-2", children: AGENT_COST_DECISIONS.map(decision => (_jsx("button", { type: "button", className: "h-9 rounded-md border px-3 text-xs font-medium transition-colors", style: {
                                background: agentCostDecision === decision ? '#e4e4e7' : '#18181b',
                                borderColor: agentCostDecision === decision ? '#e4e4e7' : '#27272a',
                                color: agentCostDecision === decision ? '#18181b' : '#a1a1aa',
                            }, onClick: () => setAgentCostDecision(decision), children: t(`review.agentCostDecision.${decision}`) }, decision))) })), _jsx(Button, { disabled: reflection.trim().length < 20 || !energyRating || (requiresAgentCostDecision && !agentCostDecision) || complete.isPending, onClick: () => complete.mutate(), children: complete.isPending ? t('review.saving') : t('review.submit') }), _jsx("p", { className: "text-xs", style: { color: '#3f3f46' }, children: t('review.minChars') })] }))] }));
}
