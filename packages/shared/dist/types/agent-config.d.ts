export type AgentProvider = 'openai' | 'anthropic' | 'google' | 'groq' | 'ollama' | 'custom';
export interface AgentConfig {
    id: string;
    provider: AgentProvider;
    model: string;
    base_url: string | null;
    /** API key — always masked (last 4 chars only) in read responses */
    api_key_masked: string;
    created_at: number;
    updated_at: number;
}
export interface AgentConfigInput {
    provider: AgentProvider;
    model: string;
    api_key: string;
    base_url?: string;
}
export declare const PROVIDER_DEFAULTS: Record<AgentProvider, {
    model: string;
    base_url: string | null;
}>;
//# sourceMappingURL=agent-config.d.ts.map