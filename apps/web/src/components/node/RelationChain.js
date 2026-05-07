import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { PILLAR_COLORS } from '@soloos/shared';
import { useTranslation } from 'react-i18next';
export function RelationChain({ links, events }) {
    const { t } = useTranslation();
    if (links.length === 0) {
        return (_jsx("p", { className: "text-xs py-2", style: { color: '#3f3f46' }, children: t('nodeSheet.noCorrelations') }));
    }
    const eventMap = Object.fromEntries(events.map(e => [e.id, e]));
    return (_jsx("div", { className: "flex flex-col gap-2", children: links.map((link, i) => {
            const target = eventMap[link.target_event_id];
            return (_jsxs("div", { className: "flex items-center gap-2", children: [_jsx("div", { className: "w-2 h-2 rounded-full flex-shrink-0", style: { background: target ? PILLAR_COLORS[target.pillar] : '#52525b' } }), _jsx("span", { className: "text-xs", style: { color: '#71717a' }, children: link.link_type }), _jsx("span", { className: "text-xs px-1.5 py-0.5 rounded flex-shrink-0", style: { background: '#18181b', color: target ? PILLAR_COLORS[target.pillar] : '#52525b' }, children: target?.pillar ?? 'unknown' }), _jsx("span", { className: "text-xs font-mono", style: { color: '#52525b' }, children: t('nodeSheet.confidence', { value: (link.confidence * 100).toFixed(0) }) })] }, i));
        }) }));
}
