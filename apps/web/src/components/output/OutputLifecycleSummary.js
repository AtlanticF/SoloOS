import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Info } from 'lucide-react';
const STATE_ORDER = ['DRAFT', 'ACTIVE', 'VALUATED', 'GHOST', 'ARCHIVED'];
const STATE_COLORS = {
    DRAFT: { bg: '#1e1e22', text: '#71717a', dot: '#52525b' },
    ACTIVE: { bg: '#14532d20', text: '#4ade80', dot: '#4ade80' },
    VALUATED: { bg: '#78350f20', text: '#fbbf24', dot: '#fbbf24' },
    GHOST: { bg: '#08334455', text: '#67e8f9', dot: '#22d3ee' },
    ARCHIVED: { bg: '#17255455', text: '#93c5fd', dot: '#3b82f6' },
};
export function OutputLifecycleSummary({ summary, activeState, onStateClick }) {
    const { t } = useTranslation();
    const [showLegend, setShowLegend] = useState(false);
    const stateLegend = STATE_ORDER
        .map((state) => `${t(`output.stateLabel.${state}`)}: ${t(`output.stateTooltip.${state}`)}`)
        .join('\n');
    return (_jsxs("div", { className: "flex flex-wrap gap-2", children: [_jsxs("div", { className: "relative", children: [_jsx("button", { type: "button", className: "inline-flex items-center justify-center w-8 h-8 rounded-lg border", style: { background: '#18181b', borderColor: '#27272a', color: '#71717a' }, "aria-label": stateLegend, onMouseEnter: () => setShowLegend(true), onMouseLeave: () => setShowLegend(false), onFocus: () => setShowLegend(true), onBlur: () => setShowLegend(false), children: _jsx(Info, { size: 14 }) }), showLegend && (_jsx("div", { className: "absolute left-0 top-full mt-2 w-[340px] rounded-lg border p-3 text-xs whitespace-pre-line z-20", style: { background: '#0d0d0d', borderColor: '#27272a', color: '#a1a1aa' }, children: stateLegend }))] }), STATE_ORDER.map((state) => {
                const count = summary.counts[state];
                const colors = STATE_COLORS[state];
                const isActive = activeState === state;
                return (_jsxs("button", { onClick: () => onStateClick(isActive ? null : state), title: t(`output.stateTooltip.${state}`), className: "flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm font-medium transition-all border", style: {
                        background: isActive ? colors.bg : 'transparent',
                        color: isActive ? colors.text : '#52525b',
                        borderColor: isActive ? colors.dot + '60' : '#27272a',
                    }, children: [_jsx("span", { className: "w-2 h-2 rounded-full flex-shrink-0", style: { background: isActive ? colors.dot : '#3f3f46' } }), t(`output.stateLabel.${state}`), _jsx("span", { className: "ml-1 px-1.5 py-0.5 rounded text-xs font-mono", style: { background: '#18181b', color: isActive ? colors.text : '#52525b' }, children: count })] }, state));
            })] }));
}
