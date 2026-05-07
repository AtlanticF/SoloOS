import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useState } from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import { LayoutDashboard, Layers, ClipboardList, Settings, ChevronRight, ChevronLeft, Zap, GitCommitHorizontal } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { cn } from '@/lib/utils';
import { SidebarProfile } from '@/components/layout/SidebarProfile';
import { CaptureDialog } from '@/components/capture/CaptureDialog';
import { useAgentHealth, HEALTH_COLORS, HEALTH_BG, HEALTH_BORDER } from '@/hooks/useAgentHealth';
const NAV = [
    { to: '/', icon: LayoutDashboard, key: 'cockpit' },
    { to: '/explorer', icon: Layers, key: 'explorer' },
    { to: '/output', icon: GitCommitHorizontal, key: 'output' },
    { to: '/review', icon: ClipboardList, key: 'review' },
];
export function Sidebar() {
    const { t } = useTranslation();
    const navigate = useNavigate();
    const [expanded, setExpanded] = useState(() => localStorage.getItem('soloos-sidebar') === 'expanded');
    const [showCollapsedToggle, setShowCollapsedToggle] = useState(false);
    const [captureOpen, setCaptureOpen] = useState(false);
    const mockUser = { name: 'Matt Solo' };
    const health = useAgentHealth();
    const healthColor = HEALTH_COLORS[health];
    const healthBg = HEALTH_BG[health];
    const healthBorder = HEALTH_BORDER[health];
    function toggle() {
        const next = !expanded;
        setExpanded(next);
        localStorage.setItem('soloos-sidebar', next ? 'expanded' : 'collapsed');
    }
    function handleCaptureClick() {
        if (health === 'unconfigured' || health === 'error') {
            navigate('/settings');
            return;
        }
        setCaptureOpen(true);
    }
    const captureTitle = health === 'unconfigured'
        ? t('capture.noConfigHint')
        : health === 'error'
            ? t('capture.configErrorHint')
            : t('capture.title');
    return (_jsxs("aside", { className: "flex-shrink-0 flex flex-col py-3 gap-1 border-r transition-all duration-200", style: {
            width: expanded ? 200 : 48,
            background: '#0d0d0d',
            borderColor: '#1e1e22',
            overflow: 'hidden',
        }, children: [_jsxs("div", { className: cn('flex items-center mb-3 flex-shrink-0 relative', expanded ? 'px-3 gap-3' : 'px-2 justify-center'), onMouseEnter: () => !expanded && setShowCollapsedToggle(true), onMouseLeave: () => !expanded && setShowCollapsedToggle(false), children: [_jsx("img", { src: "/soloos-logo-dark.png", alt: "SoloOS logo", className: "w-7 h-7 rounded-md object-cover flex-shrink-0" }), expanded && (_jsx("span", { className: "text-sm font-semibold tracking-tight flex-1 truncate", style: { color: '#e4e4e7' }, children: "SoloOS" })), (expanded || showCollapsedToggle) && (_jsx("button", { onClick: toggle, className: cn('flex items-center justify-center transition-colors text-zinc-600 hover:text-zinc-300', expanded ? 'w-7 h-7 rounded-lg flex-shrink-0' : 'w-7 h-7 rounded-md absolute inset-0 m-auto bg-[#18181b] border border-[#27272a] z-10'), title: expanded ? t('nav.collapse') : t('nav.expand'), children: expanded ? _jsx(ChevronLeft, { size: 14 }) : _jsx(ChevronRight, { size: 14 }) }))] }), _jsxs("button", { onClick: handleCaptureClick, title: captureTitle, className: cn('relative flex items-center gap-3 rounded-lg transition-colors cursor-pointer flex-shrink-0', expanded ? 'mx-2 px-3 h-9' : 'mx-auto w-9 h-9 justify-center'), style: { background: healthBg, border: `1px solid ${healthBorder}`, color: healthColor }, children: [_jsx(Zap, { size: 14, className: "flex-shrink-0" }), expanded && (_jsx("span", { className: "text-sm font-medium truncate flex-1 text-left", children: t('capture.title') })), _jsx("span", { className: cn('absolute rounded-full flex-shrink-0', health === 'ok' ? 'sidebar-health-dot-pulse' : ''), style: {
                            width: 6,
                            height: 6,
                            background: healthColor,
                            top: expanded ? '50%' : 4,
                            right: expanded ? 10 : 4,
                            transform: expanded ? 'translateY(-50%)' : 'none',
                            boxShadow: health === 'ok' ? `0 0 4px ${healthColor}` : 'none',
                            ['--health-dot-color']: healthColor,
                        } })] }), _jsx(CaptureDialog, { open: captureOpen, onOpenChange: setCaptureOpen }), NAV.map(({ to, icon: Icon, key }) => (_jsx(NavLink, { to: to, end: to === '/', children: ({ isActive }) => (_jsxs("div", { title: expanded ? undefined : t(`nav.${key}`), className: cn('flex items-center gap-3 rounded-lg transition-colors cursor-pointer flex-shrink-0', expanded ? 'mx-2 px-3 h-9' : 'mx-auto w-9 h-9 justify-center', isActive ? 'text-zinc-100' : 'text-zinc-600 hover:text-zinc-400'), style: { background: isActive ? '#18181b' : 'transparent' }, children: [_jsx(Icon, { size: 16, className: "flex-shrink-0" }), expanded && (_jsx("span", { className: "text-sm font-medium truncate", children: t(`nav.${key}`) }))] })) }, to))), _jsx("div", { className: "flex-1" }), _jsx(NavLink, { to: "/settings", children: ({ isActive }) => (_jsxs("div", { title: expanded ? undefined : t('nav.settings'), className: cn('flex items-center gap-3 rounded-lg transition-colors cursor-pointer flex-shrink-0', expanded ? 'mx-2 px-3 h-9' : 'mx-auto w-9 h-9 justify-center', isActive ? 'text-zinc-100' : 'text-zinc-600 hover:text-zinc-400'), style: { background: isActive ? '#18181b' : 'transparent' }, children: [_jsx(Settings, { size: 16, className: "flex-shrink-0" }), expanded && (_jsx("span", { className: "text-sm font-medium truncate", children: t('nav.settings') }))] })) }), _jsx("div", { className: "px-2 py-2", children: _jsx("div", { className: "h-px", style: { background: '#1e1e22' } }) }), _jsx(SidebarProfile, { expanded: expanded, name: mockUser.name })] }));
}
