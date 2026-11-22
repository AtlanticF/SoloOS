import { describe, it, expect } from 'vitest'
import { resolvePort } from './port'

describe('resolvePort', () => {
  it('defaults to 3000 when PORT is unset', () => {
    expect(resolvePort({})).toBe(3000)
  })

  it('uses PORT when it is a valid positive integer (e.g. 5010 for serve)', () => {
    expect(resolvePort({ PORT: '5010' })).toBe(5010)
  })

  it('falls back to 3000 for non-numeric PORT', () => {
    expect(resolvePort({ PORT: 'nope' })).toBe(3000)
  })
})
