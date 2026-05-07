import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useTranslation } from 'react-i18next'
import { CheckCircle2, XCircle } from 'lucide-react'
import { api, queryKeys } from '@/lib/api'
import type { Association } from '@/lib/api'

interface Props {
  outputMetadataId: string
  projectId: string | null
}

export function AssociationPanel({ outputMetadataId, projectId }: Props) {
  const { t } = useTranslation()
  const queryClient = useQueryClient()

  const enabled = !!projectId
  const { data, isLoading } = useQuery({
    queryKey: queryKeys.associations({ project_id: projectId, status: 'all' }),
    queryFn: async () => {
      const [pending, confirmed, rejected] = await Promise.all([
        api.associations.list({ project_id: projectId!, status: 'PENDING_REVIEW', limit: 100 }),
        api.associations.list({ project_id: projectId!, status: 'CONFIRMED', limit: 100 }),
        api.associations.list({ project_id: projectId!, status: 'REJECTED', limit: 100 }),
      ])
      return [...pending.items, ...confirmed.items, ...rejected.items]
    },
    enabled,
  })

  function invalidate() {
    queryClient.invalidateQueries({ queryKey: ['associations'] })
  }

  const confirm = useMutation({
    mutationFn: (id: string) => api.associations.confirm(id),
    onSuccess: invalidate,
  })
  const reject = useMutation({
    mutationFn: (id: string) => api.associations.reject(id),
    onSuccess: invalidate,
  })

  if (!projectId) return null

  const commitAssociations = (data ?? []).filter((a) => a.target_id === outputMetadataId)
  const orderRank: Record<Association['status'], number> = {
    PENDING_REVIEW: 0,
    CONFIRMED: 1,
    REJECTED: 2,
  }
  const sorted = [...commitAssociations].sort(
    (a, b) => orderRank[a.status] - orderRank[b.status],
  )

  return (
    <div className="flex flex-col gap-2">
      <div className="text-sm font-semibold" style={{ color: '#e4e4e7' }}>
        {t('output.associationTitle')}
      </div>

      {isLoading ? (
        <div className="text-xs" style={{ color: '#71717a' }}>{t('output.associationLoading')}</div>
      ) : sorted.length === 0 ? (
        <div className="text-xs" style={{ color: '#52525b' }}>{t('output.associationNoSuggestions')}</div>
      ) : (
        <div className="flex flex-col gap-2">
          {sorted.map((assoc) => (
            <AssociationCard
              key={assoc.id}
              assoc={assoc}
              onConfirm={() => confirm.mutate(assoc.id)}
              onReject={() => reject.mutate(assoc.id)}
              isPending={confirm.isPending || reject.isPending}
            />
          ))}
        </div>
      )}
    </div>
  )
}

function AssociationCard({
  assoc,
  onConfirm,
  onReject,
  isPending,
}: {
  assoc: Association
  onConfirm?: () => void
  onReject?: () => void
  isPending?: boolean
}) {
  const { t } = useTranslation()
  const score = assoc.match_score !== null ? Math.round(assoc.match_score * 100) : null

  const statusColor =
    assoc.status === 'CONFIRMED' ? '#22c55e' :
    assoc.status === 'REJECTED' ? '#71717a' : '#a1a1aa'

  const statusLabel =
    assoc.status === 'CONFIRMED' ? t('output.associationConfirmed') :
    assoc.status === 'REJECTED' ? t('output.associationRejected') : null

  return (
    <div
      className="rounded-lg border p-3 flex flex-col gap-2"
      style={{ background: '#111113', borderColor: '#27272a' }}
    >
      <div className="flex items-start justify-between gap-2">
        <div className="text-xs font-medium leading-snug flex-1" style={{ color: '#e4e4e7' }}>
          {assoc.source.synthesis}
        </div>
        <div className="flex items-center gap-2 shrink-0">
          {score !== null && (
            <span
              className="text-[10px] px-1.5 py-0.5 rounded-full border"
              style={{ color: '#a1a1aa', borderColor: '#3f3f46', background: '#18181b' }}
            >
              {t('output.associationMatch', { score })}
            </span>
          )}
          {statusLabel && (
            <span className="text-[10px]" style={{ color: statusColor }}>
              {statusLabel}
            </span>
          )}
        </div>
      </div>

      {assoc.reasoning && (
        <div className="text-[11px] leading-relaxed" style={{ color: '#71717a' }}>
          <span style={{ color: '#52525b' }}>{t('output.associationReasoning')}: </span>
          {assoc.reasoning}
        </div>
      )}

      {assoc.status === 'PENDING_REVIEW' && (
        <div className="flex items-center gap-2 mt-1">
          <button
            onClick={onConfirm}
            disabled={isPending}
            className="flex items-center gap-1 text-xs px-2.5 py-1 rounded-md border transition-colors disabled:opacity-50"
            style={{ color: '#22c55e', borderColor: '#22c55e55', background: '#14532d22' }}
          >
            <CheckCircle2 size={12} />
            {t('output.associationConfirm')}
          </button>
          <button
            onClick={onReject}
            disabled={isPending}
            className="flex items-center gap-1 text-xs px-2.5 py-1 rounded-md border transition-colors disabled:opacity-50"
            style={{ color: '#71717a', borderColor: '#27272a', background: '#18181b' }}
          >
            <XCircle size={12} />
            {t('output.associationReject')}
          </button>
        </div>
      )}
    </div>
  )
}
