import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useTranslation } from 'react-i18next';
const STATE_COLORS = {
    DRAFT: { text: '#71717a', bg: '#27272a' },
    ACTIVE: { text: '#4ade80', bg: '#14532d30' },
    VALUATED: { text: '#fbbf24', bg: '#78350f30' },
    GHOST: { text: '#a1a1aa', bg: '#27272a' },
    ARCHIVED: { text: '#52525b', bg: '#1e1e22' },
};
export function OutputTimelineTable({ items, isLoading, hasNextPage, onLoadMore, selectedItemId, onItemClick, }) {
    const { t } = useTranslation();
    if (isLoading && items.length === 0) {
        return (_jsx("div", { className: "space-y-2", children: Array.from({ length: 6 }).map((_, i) => (_jsx("div", { className: "h-12 rounded-lg animate-pulse", style: { background: '#18181b' } }, i))) }));
    }
    if (items.length === 0) {
        return (_jsx("div", { className: "text-sm text-center py-8 rounded-lg border", style: { color: '#52525b', borderColor: '#27272a', background: '#0d0d0d' }, children: t('output.noCommits') }));
    }
    return (_jsxs("div", { className: "space-y-1", children: [items.map(item => (_jsx(OutputRow, { item: item, isSelected: selectedItemId === item.id, onClick: onItemClick }, item.id))), hasNextPage && (_jsx("button", { onClick: onLoadMore, className: "w-full text-sm py-2 rounded-lg border transition-colors hover:border-zinc-600", style: { background: '#18181b', borderColor: '#27272a', color: '#71717a' }, children: t('output.loadMore') }))] }));
}
function OutputRow({ item, isSelected = false, onClick, }) {
    const { t } = useTranslation();
    const stateColors = STATE_COLORS[item.state];
    const shortSha = item.commit_sha.slice(0, 7);
    const date = new Date(item.committed_at * 1000).toLocaleDateString([], {
        month: 'short',
        day: 'numeric',
    });
    return (_jsxs("button", { type: "button", onClick: () => onClick?.(item), className: "w-full flex items-center gap-3 px-3 py-2.5 rounded-lg border text-sm text-left transition-colors hover:border-zinc-600", style: {
            background: isSelected ? '#18181b' : '#0d0d0d',
            borderColor: isSelected ? '#3b82f655' : '#1e1e22',
        }, children: [_jsx("span", { title: t(`output.stateTooltip.${item.state}`), className: "flex-shrink-0 px-1.5 py-0.5 rounded text-xs font-medium", style: { background: stateColors.bg, color: stateColors.text }, children: t(`output.stateLabel.${item.state}`) }), _jsx("span", { className: "font-mono text-xs flex-shrink-0", style: { color: '#52525b' }, children: shortSha }), _jsx("span", { className: "flex-1 truncate", style: { color: '#a1a1aa' }, children: item.commit_message }), item.project_name_snapshot && (_jsx("span", { className: "flex-shrink-0 px-2 py-0.5 rounded text-xs", style: { background: '#18181b', color: '#71717a' }, children: item.project_name_snapshot })), item.state === 'GHOST' && !item.project_name_snapshot && (_jsx("span", { className: "flex-shrink-0 px-2 py-0.5 rounded text-xs", style: { background: '#18181b', color: '#52525b' }, title: t('output.ghostNote'), children: "orphaned" })), _jsxs("span", { className: "flex-shrink-0 text-xs font-mono", style: { color: '#4ade80' }, children: ["+", item.additions] }), _jsxs("span", { className: "flex-shrink-0 text-xs font-mono", style: { color: '#f87171' }, children: ["-", item.deletions] }), _jsxs("span", { className: "flex-shrink-0 text-xs tabular-nums", style: { color: '#52525b' }, title: t('output.cost'), children: ["$", item.allocated_cost] }), parseFloat(item.realized_revenue) > 0 && (_jsxs("span", { className: "flex-shrink-0 text-xs tabular-nums", style: { color: '#fbbf24' }, title: t('output.revenue'), children: ["\u2191$", item.realized_revenue] })), _jsx("span", { className: "flex-shrink-0 text-xs", style: { color: '#3f3f46' }, children: item.author }), _jsx("span", { className: "flex-shrink-0 text-xs tabular-nums", style: { color: '#3f3f46' }, children: date })] }));
}
