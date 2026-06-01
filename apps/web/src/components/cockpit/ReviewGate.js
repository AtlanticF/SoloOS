import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { Button } from '@/components/ui/button';
import { AgentCostSummaryPanel } from '@/components/review/AgentCostSummaryPanel';
import { api, queryKeys } from '@/lib/api';
const AGENT_COST_DECISIONS = ['continue', 'pause', 'kill', 'double_down'];
export function ReviewGate({ review }) {
    const { t } = useTranslation();
    const [reflection, setReflection] = useState('');
    const [energyRating, setEnergyRating] = useState();
    const [agentCostDecision, setAgentCostDecision] = useState();
    const qc = useQueryClient();
    const requiresAgentCostDecision = Number(review.agent_cost_summary.total_amount) > 0;
    const complete = useMutation({
        mutationFn: () => api.reviews.complete(review.id, reflection, energyRating, requiresAgentCostDecision ? agentCostDecision : undefined),
        onSuccess: () => qc.invalidateQueries({ queryKey: queryKeys.reviewCurrent() }),
    });
    return (_jsxs("div", { className: "flex flex-col items-center justify-center h-full gap-6 max-w-lg mx-auto text-center", children: [_jsx("div", { className: "w-12 h-12 rounded-full flex items-center justify-center text-2xl", style: { background: '#1c1a11', border: '1px solid #f59e0b33' }, children: "\uD83D\uDD12" }), _jsxs("div", { children: [_jsx("h2", { className: "text-sm font-semibold tracking-tight mb-1", style: { color: '#e4e4e7' }, children: t('reviewGate.title') }), _jsx("p", { className: "text-xs", style: { color: '#71717a' }, children: t('reviewGate.subtitle') })] }), _jsx(AgentCostSummaryPanel, { summary: review.agent_cost_summary }), _jsx("textarea", { className: "w-full rounded-lg p-3 text-sm resize-none", style: { background: '#18181b', border: '1px solid #27272a', color: '#e4e4e7', height: 120 }, placeholder: t('reviewGate.placeholder'), value: reflection, onChange: e => setReflection(e.target.value) }), _jsxs("div", { className: "flex w-full flex-col gap-1.5", children: [_jsx("span", { className: "text-xs font-semibold uppercase tracking-widest text-left", style: { color: '#71717a' }, children: t('review.energyLabel') }), _jsx("div", { className: "grid w-full grid-cols-5 gap-2", children: [1, 2, 3, 4, 5].map(value => (_jsx("button", { type: "button", className: "h-9 rounded-md border text-xs font-semibold transition-colors", style: {
                                background: energyRating === value ? 'rgba(139,92,246,0.12)' : '#18181b',
                                borderColor: energyRating === value ? '#8b5cf6' : '#27272a',
                                color: energyRating === value ? '#8b5cf6' : '#a1a1aa',
                            }, onClick: () => setEnergyRating(value), children: value }, value))) })] }), requiresAgentCostDecision && (_jsx("div", { className: "grid w-full grid-cols-2 gap-2", children: AGENT_COST_DECISIONS.map(decision => (_jsx("button", { type: "button", className: "h-9 rounded-md border px-3 text-xs font-medium transition-colors", style: {
                        background: agentCostDecision === decision ? '#e4e4e7' : '#18181b',
                        borderColor: agentCostDecision === decision ? '#e4e4e7' : '#27272a',
                        color: agentCostDecision === decision ? '#18181b' : '#a1a1aa',
                    }, onClick: () => setAgentCostDecision(decision), children: t(`review.agentCostDecision.${decision}`) }, decision))) })), _jsx(Button, { disabled: reflection.trim().length < 20 || !energyRating || (requiresAgentCostDecision && !agentCostDecision) || complete.isPending, onClick: () => complete.mutate(), className: "w-full", children: complete.isPending ? t('reviewGate.saving') : t('reviewGate.submit') })] }));
}
