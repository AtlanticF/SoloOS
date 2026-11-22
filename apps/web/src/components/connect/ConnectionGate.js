import { Fragment as _Fragment, jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { isRemoteBase, probeServer } from '@/lib/connection';
const API_BASE = import.meta.env.VITE_API_BASE ?? '/api';
const SERVE_COMMAND = 'pnpm serve';
const POLL_MS = 1500;
function healthUrl(base) {
    return base.replace(/\/api\/?$/, '') + '/health';
}
/**
 * Mode 1 connection gate. Inert in local Mode-2 dev (relative base) — renders
 * the app immediately. For a remote/hosted build it polls the local server's
 * /health and only renders the app once a SoloOS server answers.
 */
export function ConnectionGate({ children }) {
    const remote = isRemoteBase(API_BASE);
    const [connected, setConnected] = useState(!remote);
    useEffect(() => {
        if (!remote || connected)
            return;
        let active = true;
        const url = healthUrl(API_BASE);
        const tick = async () => {
            const ok = await probeServer(url);
            if (active && ok)
                setConnected(true);
        };
        void tick();
        const id = setInterval(tick, POLL_MS);
        return () => {
            active = false;
            clearInterval(id);
        };
    }, [remote, connected]);
    if (connected)
        return _jsx(_Fragment, { children: children });
    return _jsx(StartServerScreen, {});
}
function StartServerScreen() {
    const { t } = useTranslation();
    return (_jsx("div", { className: "min-h-screen flex items-center justify-center p-6", style: { background: '#0a0a0a' }, children: _jsxs("div", { className: "w-full max-w-lg rounded-2xl p-8 flex flex-col gap-6", style: { background: '#111', border: '1px solid #1e1e22' }, children: [_jsxs("div", { className: "text-center flex flex-col gap-2", children: [_jsx("span", { className: "text-xs font-bold uppercase tracking-[0.2em]", style: { color: '#6366f1' }, children: "SoloOS" }), _jsx("h1", { className: "text-lg font-semibold tracking-tight", style: { color: '#e4e4e7' }, children: t('connect.title') }), _jsx("p", { className: "text-xs", style: { color: '#71717a' }, children: t('connect.subtitle') })] }), _jsxs("div", { className: "rounded-xl overflow-hidden", style: { border: '1px solid #1e1e22' }, children: [_jsxs("div", { className: "flex items-center gap-1.5 px-3 py-2", style: { background: '#18181b' }, children: [_jsx("span", { className: "h-2.5 w-2.5 rounded-full", style: { background: '#ef4444' } }), _jsx("span", { className: "h-2.5 w-2.5 rounded-full", style: { background: '#f59e0b' } }), _jsx("span", { className: "h-2.5 w-2.5 rounded-full", style: { background: '#10b981' } }), _jsx("span", { className: "ml-2 text-[11px]", style: { color: '#52525b' }, children: t('connect.commandLabel') })] }), _jsxs("div", { className: "px-4 py-3 font-mono text-sm", style: { background: '#0d0d0d', color: '#e4e4e7' }, children: [_jsx("span", { style: { color: '#6366f1' }, children: "$" }), " ", SERVE_COMMAND] })] }), _jsxs("div", { className: "flex items-center gap-3 rounded-xl px-4 py-3", style: { background: '#0d0d0d', border: '1px solid #1e1e22' }, children: [_jsx("span", { className: "inline-block h-2 w-2 rounded-full animate-pulse", style: { background: '#6366f1' } }), _jsxs("div", { className: "flex flex-col", children: [_jsx("span", { className: "text-xs font-medium", style: { color: '#a1a1aa' }, children: t('connect.waiting') }), _jsx("span", { className: "text-[11px]", style: { color: '#52525b' }, children: t('connect.waitingHint') })] })] }), _jsx("p", { className: "text-center text-[11px]", style: { color: '#3f3f46' }, children: t('connect.requirements') })] }) }));
}
