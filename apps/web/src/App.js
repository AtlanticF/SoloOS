import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { Shell } from '@/components/layout/Shell';
import { Cockpit } from '@/pages/Cockpit';
import { Explorer } from '@/pages/Explorer';
import { Review } from '@/pages/Review';
import { Settings } from '@/pages/Settings';
import { Output } from '@/pages/Output';
export default function App() {
    return (_jsx(BrowserRouter, { children: _jsx(Shell, { children: _jsxs(Routes, { children: [_jsx(Route, { path: "/", element: _jsx(Cockpit, {}) }), _jsx(Route, { path: "/explorer", element: _jsx(Explorer, {}) }), _jsx(Route, { path: "/output", element: _jsx(Output, {}) }), _jsx(Route, { path: "/review", element: _jsx(Review, {}) }), _jsx(Route, { path: "/settings", element: _jsx(Settings, {}) })] }) }) }));
}
