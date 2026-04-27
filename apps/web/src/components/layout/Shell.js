import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { Sidebar } from './Sidebar';
import { TopBar } from './TopBar';
export function Shell({ children }) {
    return (_jsxs("div", { className: "flex h-screen w-screen overflow-hidden", style: { background: '#0a0a0a' }, children: [_jsx(Sidebar, {}), _jsxs("div", { className: "flex flex-col flex-1 min-w-0", children: [_jsx(TopBar, {}), _jsx("main", { className: "flex-1 overflow-auto", children: _jsx("div", { className: "min-h-full flex flex-col px-8 py-6", style: { maxWidth: 1200, margin: '0 auto' }, children: children }) })] })] }));
}
