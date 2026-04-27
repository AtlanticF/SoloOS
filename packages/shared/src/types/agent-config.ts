export type AgentProvider = 'openai' | 'anthropic' | 'google' | 'groq' | 'ollama' | 'custom'

export interface AgentConfig {
  id: string
  provider: AgentProvider
  model: string
  base_url: string | null
  /** API key — always masked (last 4 chars only) in read responses */
  api_key_masked: string
  created_at: number
  updated_at: number
}

export interface AgentConfigInput {
  provider: AgentProvider
  model: string
  api_key: string
  base_url?: string
}

export const PROVIDER_DEFAULTS: Record<AgentProvider, { model: string; base_url: string | null }> = {
  openai:    { model: 'gpt-4o-mini',                      base_url: null },
  anthropic: { model: 'claude-haiku-4-5-20251101',   base_url: null },
  google:    { model: 'gemini-2.5-flash',        base_url: null },
  groq:      { model: 'llama-3.3-70b-versatile',     base_url: null },
  ollama:    { model: 'llama3:8b',                    base_url: 'http://localhost:11434' },
  custom:    { model: '',                              base_url: null },
}
