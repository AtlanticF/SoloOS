import { useEffect, useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { api, queryKeys } from '@/lib/api'

export type AgentHealthStatus = 'unconfigured' | 'untested' | 'ok' | 'error'

const HEALTH_KEY = 'soloos-agent-health'

function readHealth(): 'ok' | 'error' | null {
  const v = localStorage.getItem(HEALTH_KEY)
  if (v === 'ok' || v === 'error') return v
  return null
}

export function useAgentHealth(): AgentHealthStatus {
  const { data: config } = useQuery({
    queryKey: queryKeys.agentConfig(),
    queryFn: api.agentConfig.get,
  })

  const [stored, setStored] = useState<'ok' | 'error' | null>(readHealth)

  useEffect(() => {
    function update() { setStored(readHealth()) }
    window.addEventListener('soloos-agent-health-change', update)
    return () => window.removeEventListener('soloos-agent-health-change', update)
  }, [])

  if (!config) return 'unconfigured'
  if (stored === 'ok') return 'ok'
  if (stored === 'error') return 'error'
  return 'untested'
}

export const HEALTH_COLORS: Record<AgentHealthStatus, string> = {
  ok:           '#10b981',
  untested:     '#f59e0b',
  error:        '#ef4444',
  unconfigured: '#ef4444',
}

export const HEALTH_BG: Record<AgentHealthStatus, string> = {
  ok:           '#10b98115',
  untested:     '#f59e0b15',
  error:        '#ef444415',
  unconfigured: '#ef444415',
}

export const HEALTH_BORDER: Record<AgentHealthStatus, string> = {
  ok:           '#10b98130',
  untested:     '#f59e0b30',
  error:        '#ef444430',
  unconfigured: '#ef444430',
}
