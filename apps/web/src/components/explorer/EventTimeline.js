import { jsx as _jsx, jsxs as _jsxs, Fragment as _Fragment } from "react/jsx-runtime";
import { ScrollArea } from '@/components/ui/scroll-area';
import { formatTs } from '@/lib/utils';
import { useTranslation } from 'react-i18next';
function EventRows({ events, onEventClick }) {
    const { t } = useTranslation();
    return (_jsx(_Fragment, { children: events.map(event => (_jsxs("button", { onClick: () => onEventClick(event), className: "flex items-center gap-3 px-4 py-2.5 text-left border-b hover:bg-zinc-900 transition-colors w-full", style: { borderColor: '#18181b' }, children: [_jsx("span", { className: `px-1.5 py-0.5 rounded text-xs font-bold flex-shrink-0 pillar-badge-${event.pillar.toLowerCase()}`, children: t(`pillars.${event.pillar}`) }), _jsx("span", { className: "flex-1 truncate text-xs", style: { color: '#a1a1aa' }, children: event.title || event.entry_id.slice(0, 36) }), _jsx("span", { className: "font-mono text-xs flex-shrink-0", style: { color: '#3f3f46' }, children: formatTs(event.occurred_at) })] }, event.id))) }));
}
export function EventTimeline({ events, onEventClick, autoHeight = false }) {
    if (events.length === 0) {
        return (_jsx("div", { className: "flex items-center justify-center h-16 text-xs", style: { color: '#3f3f46' }, children: "\u2014" }));
    }
    if (autoHeight) {
        return (_jsx("div", { className: "flex flex-col", children: _jsx(EventRows, { events: events, onEventClick: onEventClick }) }));
    }
    return (_jsx(ScrollArea, { className: "h-full", children: _jsx("div", { className: "flex flex-col", children: _jsx(EventRows, { events: events, onEventClick: onEventClick }) }) }));
}
