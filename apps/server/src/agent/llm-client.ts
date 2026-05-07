import type { AgentProvider } from '@soloos/shared'

export interface LlmConfig {
  provider: AgentProvider
  model: string
  api_key: string
  base_url: string | null
}

export interface ChatMessage {
  role: 'system' | 'user' | 'assistant'
  content: string
}

/** Call any OpenAI-compatible chat completions endpoint */
async function callOpenAICompat(
  baseUrl: string,
  config: LlmConfig,
  messages: ChatMessage[],
): Promise<string> {
  const res = await fetch(`${baseUrl}/v1/chat/completions`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${config.api_key}`,
    },
    body: JSON.stringify({
      model: config.model,
      messages,
      temperature: 0.2,
      max_tokens: 800,
    }),
  })
  if (!res.ok) {
    const text = await res.text()
    throw new Error(`LLM API error ${res.status}: ${text.slice(0, 200)}`)
  }
  const data = await res.json() as { choices: Array<{ message: { content: string } }> }
  return data.choices[0]?.message?.content ?? ''
}

/** Call Anthropic Messages API */
async function callAnthropic(config: LlmConfig, messages: ChatMessage[]): Promise<string> {
  const system = messages.find(m => m.role === 'system')?.content
  const userMessages = messages.filter(m => m.role !== 'system')
  const res = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': config.api_key,
      'anthropic-version': '2023-06-01',
    },
    body: JSON.stringify({
      model: config.model,
      max_tokens: 800,
      system: system ?? '',
      messages: userMessages,
    }),
  })
  if (!res.ok) {
    const text = await res.text()
    throw new Error(`Anthropic API error ${res.status}: ${text.slice(0, 200)}`)
  }
  const data = await res.json() as { content: Array<{ text: string }> }
  return data.content[0]?.text ?? ''
}

/** Call Google Gemini API */
async function callGoogle(config: LlmConfig, messages: ChatMessage[]): Promise<string> {
  const system = messages.find(m => m.role === 'system')?.content ?? ''
  const userMessages = messages
    .filter(m => m.role !== 'system')
    .map(m => ({ role: m.role === 'assistant' ? 'model' : 'user', parts: [{ text: m.content }] }))
  const res = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/${config.model}:generateContent?key=${config.api_key}`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        systemInstruction: system ? { parts: [{ text: system }] } : undefined,
        contents: userMessages,
        generationConfig: { temperature: 0.2, maxOutputTokens: 800 },
      }),
    },
  )
  if (!res.ok) {
    const text = await res.text()
    throw new Error(`Google API error ${res.status}: ${text.slice(0, 200)}`)
  }
  const data = await res.json() as { candidates: Array<{ content: { parts: Array<{ text: string }> } }> }
  return data.candidates[0]?.content?.parts[0]?.text ?? ''
}

export interface TestResult {
  ok: boolean
  url: string
  request_body: string
  response_status?: number
  response_body?: string
  error?: string
}

/** Make a minimal one-token call and return structured diagnostics */
export async function testConnection(config: LlmConfig): Promise<TestResult> {
  const minMessages: ChatMessage[] = [{ role: 'user', content: 'Reply with just "OK".' }]

  try {
    if (config.provider === 'anthropic') {
      const url = 'https://api.anthropic.com/v1/messages'
      const requestBody = JSON.stringify({
        model: config.model,
        max_tokens: 5,
        messages: minMessages,
      })
      const res = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-api-key': config.api_key,
          'anthropic-version': '2023-06-01',
        },
        body: requestBody,
      })
      const responseBody = await res.text()
      return { ok: res.ok, url, request_body: requestBody, response_status: res.status, response_body: responseBody }
    }

    if (config.provider === 'google') {
      const url = `https://generativelanguage.googleapis.com/v1beta/models/${config.model}:generateContent?key=${config.api_key}`
      const requestBody = JSON.stringify({
        contents: [{ role: 'user', parts: [{ text: 'Reply with just "OK".' }] }],
        generationConfig: { maxOutputTokens: 5 },
      })
      const res = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: requestBody,
      })
      const responseBody = await res.text()
      return { ok: res.ok, url, request_body: requestBody, response_status: res.status, response_body: responseBody }
    }

    // OpenAI-compatible (openai, groq, ollama, custom)
    const baseUrl = config.base_url
      ?? (config.provider === 'groq' ? 'https://api.groq.com/openai'
        : config.provider === 'ollama' ? 'http://localhost:11434'
        : 'https://api.openai.com')
    const url = `${baseUrl}/v1/chat/completions`
    const requestBody = JSON.stringify({
      model: config.model,
      messages: minMessages,
      max_tokens: 5,
    })
    const res = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${config.api_key}` },
      body: requestBody,
    })
    const responseBody = await res.text()
    return { ok: res.ok, url, request_body: requestBody, response_status: res.status, response_body: responseBody }
  } catch (err) {
    return {
      ok: false,
      url: '(network error)',
      request_body: '',
      error: String(err),
    }
  }
}

export async function chatComplete(config: LlmConfig, messages: ChatMessage[]): Promise<string> {
  switch (config.provider) {
    case 'openai':
      return callOpenAICompat(config.base_url ?? 'https://api.openai.com', config, messages)
    case 'groq':
      return callOpenAICompat(config.base_url ?? 'https://api.groq.com/openai', config, messages)
    case 'ollama':
      return callOpenAICompat(config.base_url ?? 'http://localhost:11434', config, messages)
    case 'custom':
      if (!config.base_url) throw new Error('custom provider requires base_url')
      return callOpenAICompat(config.base_url, config, messages)
    case 'anthropic':
      return callAnthropic(config, messages)
    case 'google':
      return callGoogle(config, messages)
    default:
      throw new Error(`unsupported provider: ${config.provider}`)
  }
}
