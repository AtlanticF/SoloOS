import { useEffect, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { api, queryKeys } from '@/lib/api';
const HEALTH_KEY = 'soloos-agent-health';
function readHealth() {
    const v = localStorage.getItem(HEALTH_KEY);
    if (v === 'ok' || v === 'error')
        return v;
    return null;
}
export function useAgentHealth() {
    const { data: config } = useQuery({
        queryKey: queryKeys.agentConfig(),
        queryFn: api.agentConfig.get,
    });
    const [stored, setStored] = useState(readHealth);
    useEffect(() => {
        function update() { setStored(readHealth()); }
        window.addEventListener('soloos-agent-health-change', update);
        return () => window.removeEventListener('soloos-agent-health-change', update);
    }, []);
    if (!config)
        return 'unconfigured';
    if (stored === 'ok')
        return 'ok';
    if (stored === 'error')
        return 'error';
    return 'untested';
}
export const HEALTH_COLORS = {
    ok: '#10b981',
    untested: '#f59e0b',
    error: '#ef4444',
    unconfigured: '#ef4444',
};
export const HEALTH_BG = {
    ok: '#10b98115',
    untested: '#f59e0b15',
    error: '#ef444415',
    unconfigured: '#ef444415',
};
export const HEALTH_BORDER = {
    ok: '#10b98130',
    untested: '#f59e0b30',
    error: '#ef444430',
    unconfigured: '#ef444430',
};
