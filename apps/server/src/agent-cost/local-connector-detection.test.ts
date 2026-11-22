import { describe, expect, it } from 'vitest'
import { detectLocalAgentCostConnectors } from './local-connector-detection'

describe('detectLocalAgentCostConnectors', () => {
  it('detects installed and missing local agent CLIs with whitelisted commands only', async () => {
    const calls: Array<{ command: string; args: string[] }> = []
    const runner = async (command: string, args: string[]) => {
      calls.push({ command, args })
      return args[0] === 'codex' || args[0] === 'claude' ? { ok: true, stdout: `/usr/local/bin/${args[0]}` } : { ok: false, stdout: '' }
    }

    const connectors = await detectLocalAgentCostConnectors(runner)

    expect(connectors).toEqual([
      { provider: 'anthropic', cli: 'claude', status: 'installed', command: '/usr/local/bin/claude' },
      { provider: 'cursor', cli: 'cursor-agent', status: 'missing', command: null },
      { provider: 'codex', cli: 'codex', status: 'installed', command: '/usr/local/bin/codex' },
    ])
    expect(calls).toEqual([
      { command: '/usr/bin/which', args: ['claude'] },
      { command: '/usr/bin/which', args: ['cursor-agent'] },
      { command: '/usr/bin/which', args: ['codex'] },
    ])
  })
})
