import { useCallback, useState } from 'react'
import { RefreshCw } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { api, queryKeys } from '@/lib/api'
import type { Project } from '@soloos/shared'
import type { RepoBinding } from '@/lib/api'
import { cn } from '@/lib/utils'

interface Props {
  bindings: RepoBinding[]
  projects: Project[]
  selectedRepoId: number | null
  selectedProjectId: string | null
}

export function OutputHeader({
  bindings,
  projects,
  selectedRepoId,
  selectedProjectId,
}: Props) {
  const { t } = useTranslation()
  const queryClient = useQueryClient()

  const refreshOutputQueries = useCallback(() => {
    queryClient.invalidateQueries({ queryKey: queryKeys.outputSyncStatus() })
    queryClient.invalidateQueries({ queryKey: queryKeys.outputSummary() })
    queryClient.invalidateQueries({ queryKey: ['output', 'events'] })
  }, [queryClient])

  const { data: syncStatus } = useQuery({
    queryKey: queryKeys.outputSyncStatus(),
    queryFn: api.output.syncStatus,
    refetchInterval: 8000,
  })

  const { mutate: sync, isPending: isSyncing } = useMutation({
    mutationFn: () => api.output.triggerSync(selectedRepoId ?? undefined),
    onSettled: () => {
      refreshOutputQueries()
    },
    onSuccess: () => {
      // Poll until sync completes, then force-refresh active output lists.
      const targetRepoId = selectedRepoId
      const poll = setInterval(async () => {
        try {
          const latest = await queryClient.fetchQuery({
            queryKey: queryKeys.outputSyncStatus(),
            queryFn: api.output.syncStatus,
          })
          const targetRows = targetRepoId
            ? latest.repos.filter((repo) => repo.repo_id === targetRepoId)
            : latest.repos
          const stillRunning = targetRows.some((repo) => repo.status === 'running')

          refreshOutputQueries()

          if (!stillRunning) {
            clearInterval(poll)
            queryClient.refetchQueries({ queryKey: ['output', 'events'], type: 'active' })
            queryClient.refetchQueries({ queryKey: queryKeys.outputSummary(), type: 'active' })
          }
        } catch {
          // Keep polling; transient sync-status fetch errors should not break refresh flow.
        }
      }, 2500)
      setTimeout(() => clearInterval(poll), 60000)
    },
  })

  const isAnySyncing = syncStatus?.repos.some(r => r.status === 'running') ?? false
  const isRateLimited = syncStatus?.repos.some(r => r.status === 'deferred_rate_limited') ?? false
  const lastSyncedAt = syncStatus?.repos.reduce<number | null>((max, r) => {
    if (!r.last_synced_at) return max
    return max === null || r.last_synced_at > max ? r.last_synced_at : max
  }, null) ?? null

  const syncLabel = isSyncing || isAnySyncing
    ? t('output.syncing')
    : t('output.syncNow')

  const syncSubtext = isRateLimited
    ? t('output.rateLimited', { time: formatTime(syncStatus?.repos.find(r => r.status === 'deferred_rate_limited')?.next_safe_sync_at) })
    : lastSyncedAt
    ? t('output.lastSynced', { time: formatTime(lastSyncedAt) })
    : t('output.neverSynced')

  const selectedBinding = selectedRepoId
    ? bindings.find(b => b.repo_id === selectedRepoId) ?? null
    : null
  const selectedProject = selectedProjectId
    ? projects.find(p => p.id === selectedProjectId) ?? null
    : null
  const repoDisplay = selectedBinding
    ? selectedBinding.repo_full_name
    : bindings.length > 0
    ? bindings.map(b => b.repo_full_name).join(' / ')
    : '—'
  const projectDisplay = selectedProject
    ? selectedProject.name
    : selectedBinding?.project_id
    ? (projects.find(p => p.id === selectedBinding.project_id)?.name ?? t('output.unboundProject'))
    : t('output.unboundProject')

  return (
    <div className="flex flex-wrap items-center gap-3">
      <div
        className="text-sm rounded-lg px-3 py-1.5 border"
        style={{ background: '#18181b', borderColor: '#27272a', color: '#e4e4e7' }}
      >
        {t('output.repoInfoLabel')}: {repoDisplay}
      </div>

      <div
        className="text-sm rounded-lg px-3 py-1.5 border"
        style={{ background: '#18181b', borderColor: '#27272a', color: '#e4e4e7' }}
      >
        {t('output.projectInfoLabel')}: {projectDisplay}
      </div>

      <div className="flex-1" />

      {/* Sync status text */}
      <span className="text-xs" style={{ color: isRateLimited ? '#fbbf24' : '#52525b' }}>
        {syncSubtext}
      </span>

      {/* Sync button */}
      <button
        onClick={() => sync()}
        disabled={isSyncing || isAnySyncing || isRateLimited}
        className={cn(
          'flex items-center gap-2 text-sm px-3 py-1.5 rounded-lg border transition-colors',
          (isSyncing || isAnySyncing || isRateLimited) ? 'opacity-50 cursor-not-allowed' : 'hover:border-zinc-600',
        )}
        style={{ background: '#18181b', borderColor: '#27272a', color: '#e4e4e7' }}
      >
        <RefreshCw
          size={13}
          className={cn(isSyncing || isAnySyncing ? 'animate-spin' : '')}
        />
        {syncLabel}
      </button>

    </div>
  )
}

function formatTime(unixSeconds?: number | null): string {
  if (!unixSeconds) return '—'
  return new Date(unixSeconds * 1000).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
}
