import { jsx as _jsx } from "react/jsx-runtime";
import React from 'react';
import ReactDOM from 'react-dom/client';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import App from './App';
import { ConnectionGate } from './components/connect/ConnectionGate';
import './index.css';
import './lib/i18n';
const queryClient = new QueryClient({
    defaultOptions: { queries: { staleTime: 30_000 } },
});
ReactDOM.createRoot(document.getElementById('root')).render(_jsx(React.StrictMode, { children: _jsx(QueryClientProvider, { client: queryClient, children: _jsx(ConnectionGate, { children: _jsx(App, {}) }) }) }));
