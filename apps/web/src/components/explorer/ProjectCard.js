import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useTranslation } from 'react-i18next';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { formatMoney } from '@/lib/utils';
import { PILLAR_COLORS } from '@soloos/shared';
export function ProjectCard({ project, events, onClick }) {
    const { t } = useTranslation();
    const financialSum = events
        .filter(e => e.pillar === 'FINANCIAL')
        .reduce((s, e) => s + e.impact_score * 10, 0);
    const pillarCounts = events.reduce((acc, e) => {
        acc[e.pillar] = (acc[e.pillar] ?? 0) + 1;
        return acc;
    }, {});
    const isDormant = project.status === 'dormant';
    return (_jsxs(Card, { className: "p-4 cursor-pointer transition-all duration-300 ease-out hover:-translate-y-0.5 hover:shadow-[0_0_0_1px_var(--card-glow),0_0_24px_var(--card-glow-soft)] flex flex-col gap-3", style: {
            background: '#111',
            border: `1px solid ${isDormant ? '#27272a' : '#2d2d35'}`,
            ['--card-glow']: isDormant ? 'rgba(113,113,122,0.45)' : 'rgba(16,185,129,0.42)',
            ['--card-glow-soft']: isDormant ? 'rgba(113,113,122,0.18)' : 'rgba(16,185,129,0.18)',
        }, onClick: onClick, children: [_jsxs("div", { className: "flex items-start justify-between gap-2", children: [_jsx("span", { className: "text-sm font-semibold tracking-tight truncate", style: { color: '#e4e4e7' }, children: project.name }), _jsx(Badge, { variant: "outline", className: "text-xs flex-shrink-0", style: { borderColor: project.status === 'active' ? '#10b98133' : '#27272a',
                            color: project.status === 'active' ? '#10b981' : '#52525b' }, children: t(`project.${project.status}`) })] }), _jsxs("div", { className: "flex items-center gap-3 text-xs", style: { color: '#71717a' }, children: [_jsx("span", { className: "font-mono", style: { color: financialSum > 0 ? '#10b981' : '#52525b' }, children: formatMoney(financialSum) }), _jsx("span", { children: "\u00B7" }), _jsx("span", { children: t('project.events', { count: events.length }) })] }), _jsxs("div", { className: "flex gap-0.5 h-1 rounded-full overflow-hidden", children: [Object.entries(pillarCounts).map(([pillar, count]) => (_jsx("div", { style: { flex: count, background: PILLAR_COLORS[pillar], opacity: 0.7 } }, pillar))), events.length === 0 && _jsx("div", { className: "flex-1 rounded-full", style: { background: '#27272a' } })] })] }));
}
