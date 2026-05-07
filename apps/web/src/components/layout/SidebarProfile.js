import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { cn } from '@/lib/utils';
function initialsFromName(name) {
    const chars = Array.from(name.trim());
    return (chars.slice(0, 2).join('') || 'U').toUpperCase();
}
export function SidebarProfile({ expanded, name }) {
    const initials = initialsFromName(name);
    return (_jsx("div", { className: cn('mb-1 flex-shrink-0 rounded-lg transition-colors', expanded ? 'mx-2 px-2 py-2' : 'mx-auto w-9 h-9 flex items-center justify-center'), style: { background: expanded ? '#111' : 'transparent' }, title: expanded ? undefined : name, children: _jsxs("div", { className: "flex items-center gap-2 min-w-0", children: [_jsx("div", { className: "w-7 h-7 rounded-full flex items-center justify-center text-[10px] font-semibold flex-shrink-0", style: { background: '#27272a', color: '#e4e4e7' }, children: initials }), expanded && (_jsx("span", { className: "text-sm truncate", style: { color: '#d4d4d8' }, children: name }))] }) }));
}
