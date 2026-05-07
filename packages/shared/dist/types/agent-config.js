export const PROVIDER_DEFAULTS = {
    openai: { model: 'gpt-4o-mini', base_url: null },
    anthropic: { model: 'claude-haiku-4-5-20251101', base_url: null },
    google: { model: 'gemini-2.5-flash', base_url: null },
    groq: { model: 'llama-3.3-70b-versatile', base_url: null },
    ollama: { model: 'llama3:8b', base_url: 'http://localhost:11434' },
    custom: { model: '', base_url: null },
};
