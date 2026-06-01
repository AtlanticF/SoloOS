import { execFile } from 'child_process'
import type { LocalAgentCostConnector } from '@soloos/shared'

export type LocalCommandRunner = (command: string, args: string[]) => Promise<{ ok: boolean; stdout: string }>

const WHICH_COMMAND = '/usr/bin/which'
const CONNECTORS: Array<Pick<LocalAgentCostConnector, 'provider' | 'cli'>> = [
  { provider: 'anthropic', cli: 'claude' },
  { provider: 'cursor', cli: 'cursor-agent' },
  { provider: 'codex', cli: 'codex' },
]

export async function detectLocalAgentCostConnectors(
  runner: LocalCommandRunner = runWhitelistedWhich,
): Promise<LocalAgentCostConnector[]> {
  const results: LocalAgentCostConnector[] = []

  for (const connector of CONNECTORS) {
    const detected = await runner(WHICH_COMMAND, [connector.cli])
    results.push({
      ...connector,
      status: detected.ok ? 'installed' : 'missing',
      command: detected.ok ? detected.stdout.trim() || null : null,
    })
  }

  return results
}

async function runWhitelistedWhich(command: string, args: string[]): Promise<{ ok: boolean; stdout: string }> {
  if (command !== WHICH_COMMAND || args.length !== 1 || !CONNECTORS.some((connector) => connector.cli === args[0])) {
    return { ok: false, stdout: '' }
  }

  return new Promise((resolve) => {
    execFile(command, args, { timeout: 2000 }, (error, stdout) => {
      resolve({ ok: !error, stdout })
    })
  })
}
