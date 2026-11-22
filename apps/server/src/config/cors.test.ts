import { describe, it, expect } from 'vitest'
import { resolveAllowedOrigins } from './cors'

describe('resolveAllowedOrigins', () => {
  it('returns the default localhost origins when no override is set', () => {
    const origins = resolveAllowedOrigins({})
    expect(origins).toEqual([
      'http://localhost:5173',
      'http://127.0.0.1:5173',
      'http://[::1]:5173',
    ])
  })

  it('appends origins from SOLOOS_ALLOWED_ORIGINS (e.g. a hosted Vercel client)', () => {
    const origins = resolveAllowedOrigins({ SOLOOS_ALLOWED_ORIGINS: 'https://soloos.vercel.app' })
    expect(origins).toContain('http://localhost:5173')
    expect(origins).toContain('https://soloos.vercel.app')
  })

  it('parses a comma-separated list and trims whitespace', () => {
    const origins = resolveAllowedOrigins({ SOLOOS_ALLOWED_ORIGINS: 'https://a.app, https://b.app' })
    expect(origins).toContain('https://a.app')
    expect(origins).toContain('https://b.app')
  })

  it('ignores empty entries', () => {
    const origins = resolveAllowedOrigins({ SOLOOS_ALLOWED_ORIGINS: '  ,  ' })
    expect(origins).toEqual([
      'http://localhost:5173',
      'http://127.0.0.1:5173',
      'http://[::1]:5173',
    ])
  })
})
