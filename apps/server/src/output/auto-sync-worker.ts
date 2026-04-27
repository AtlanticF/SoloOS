import type { DB } from '../db/index'
import { getGithubConfig } from '../github/github-config-service'
import { listRepoBindings, triggerSync } from './output-service'

const AUTO_SYNC_INTERVAL_MS = 60 * 60 * 1000

export function startOutputAutoSyncWorker(db: DB): () => void {
  const tick = async () => {
    try {
      const githubConfig = await getGithubConfig(db)
      if (!githubConfig?.auto_sync_enabled) return

      const bindings = await listRepoBindings(db)
      if (bindings.length === 0) return

      await triggerSync(db)
    } catch {
      // Silent by design; sync state tracks failures.
    }
  }

  // Run once shortly after startup, then continue on fixed interval.
  const startupTimer = setTimeout(() => {
    void tick()
  }, 10_000)
  const interval = setInterval(() => {
    void tick()
  }, AUTO_SYNC_INTERVAL_MS)

  return () => {
    clearTimeout(startupTimer)
    clearInterval(interval)
  }
}

