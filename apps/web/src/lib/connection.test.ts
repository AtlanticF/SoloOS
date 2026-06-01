import { describe, it, expect } from 'vitest'
import { isRemoteBase, isSoloosHealth, probeServer } from './connection'

describe('isRemoteBase', () => {
  it('is false for the relative same-origin proxy base (Mode 2)', () => {
    expect(isRemoteBase('/api')).toBe(false)
  })
  it('is true for an absolute local-server base (Mode 1)', () => {
    expect(isRemoteBase('http://localhost:5010/api')).toBe(true)
  })
})

describe('isSoloosHealth', () => {
  it('accepts a SoloOS identity signature', () => {
    expect(isSoloosHealth({ ok: true, app: 'soloos', version: '0.1.0' })).toBe(true)
  })
  it('rejects another server occupying the port', () => {
    expect(isSoloosHealth({ ok: true })).toBe(false)
    expect(isSoloosHealth(null)).toBe(false)
  })
})

describe('probeServer', () => {
  it('returns true when a SoloOS server answers /health', async () => {
    const fakeFetch = (async () => new Response(JSON.stringify({ ok: true, app: 'soloos' }), { status: 200 })) as typeof fetch
    expect(await probeServer('http://localhost:5010/health', fakeFetch)).toBe(true)
  })
  it('returns false when the server is unreachable', async () => {
    const fakeFetch = (async () => { throw new Error('ECONNREFUSED') }) as typeof fetch
    expect(await probeServer('http://localhost:5010/health', fakeFetch)).toBe(false)
  })
  it('returns false for a non-SoloOS server on the port', async () => {
    const fakeFetch = (async () => new Response(JSON.stringify({ ok: true }), { status: 200 })) as typeof fetch
    expect(await probeServer('http://localhost:5010/health', fakeFetch)).toBe(false)
  })
})
