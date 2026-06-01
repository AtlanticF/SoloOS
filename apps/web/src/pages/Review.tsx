import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useTranslation } from 'react-i18next'
import { Button } from '@/components/ui/button'
import { AgentCostSummaryPanel } from '@/components/review/AgentCostSummaryPanel'
import { api, queryKeys } from '@/lib/api'
import { formatTs } from '@/lib/utils'
import type { AgentCostDecision } from '@soloos/shared'

const AGENT_COST_DECISIONS: AgentCostDecision[] = ['continue', 'pause', 'kill', 'double_down']

export function Review() {
  const { t } = useTranslation()
  const [reflection, setReflection] = useState('')
  const [energyRating, setEnergyRating] = useState<number | undefined>()
  const [agentCostDecision, setAgentCostDecision] = useState<AgentCostDecision | undefined>()
  const qc = useQueryClient()

  const { data: review, isLoading } = useQuery({
    queryKey: queryKeys.reviewCurrent(),
    queryFn: api.reviews.current,
  })

  const complete = useMutation({
    mutationFn: () => api.reviews.complete(review!.id, reflection, energyRating!, requiresAgentCostDecision ? agentCostDecision : undefined),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: queryKeys.reviewCurrent() })
      setReflection('')
      setEnergyRating(undefined)
      setAgentCostDecision(undefined)
    },
  })

  if (isLoading) return <div className="text-xs text-zinc-600">{t('review.loading')}</div>
  if (!review) return null

  const isCompleted = !!review.completed_at
  const requiresAgentCostDecision = Number(review.agent_cost_summary.total_amount) > 0

  return (
    <div className="max-w-2xl mx-auto flex flex-col gap-6">
      <div>
        <h1 className="text-sm font-semibold tracking-tight" style={{ color: '#e4e4e7' }}>
          {t('review.title')}
        </h1>
        <p className="text-xs mt-1" style={{ color: '#71717a' }}>
          {t('review.period', { start: formatTs(review.period_start), end: formatTs(review.period_end) })}
        </p>
      </div>

      <AgentCostSummaryPanel summary={review.agent_cost_summary} />

      {isCompleted ? (
        <div className="rounded-xl p-4" style={{ background: '#111', border: '1px solid #1e1e22' }}>
          <span className="text-xs font-semibold uppercase tracking-widest block mb-2" style={{ color: '#10b981' }}>
            {t('review.completed', { date: formatTs(review.completed_at!) })}
          </span>
          <p className="text-xs leading-relaxed" style={{ color: '#a1a1aa' }}>
            {review.reflection}
          </p>
        </div>
      ) : (
        <div className="flex flex-col gap-3">
          <textarea
            className="w-full rounded-lg p-3 text-sm resize-none"
            style={{ background: '#18181b', border: '1px solid #27272a', color: '#e4e4e7', height: 160 }}
            placeholder={t('review.placeholder')}
            value={reflection}
            onChange={e => setReflection(e.target.value)}
          />
          <div className="flex flex-col gap-1.5">
            <span className="text-xs font-semibold uppercase tracking-widest" style={{ color: '#71717a' }}>
              {t('review.energyLabel')}
            </span>
            <div className="grid grid-cols-5 gap-2">
              {[1, 2, 3, 4, 5].map(value => (
                <button
                  key={value}
                  type="button"
                  className="h-9 rounded-md border text-xs font-semibold transition-colors"
                  style={{
                    background: energyRating === value ? 'rgba(139,92,246,0.12)' : '#18181b',
                    borderColor: energyRating === value ? '#8b5cf6' : '#27272a',
                    color: energyRating === value ? '#8b5cf6' : '#a1a1aa',
                  }}
                  onClick={() => setEnergyRating(value)}
                >
                  {value}
                </button>
              ))}
            </div>
            <p className="text-xs" style={{ color: '#3f3f46' }}>{t('review.energyHint')}</p>
          </div>
          {requiresAgentCostDecision && (
            <div className="grid grid-cols-2 gap-2">
              {AGENT_COST_DECISIONS.map(decision => (
                <button
                  key={decision}
                  type="button"
                  className="h-9 rounded-md border px-3 text-xs font-medium transition-colors"
                  style={{
                    background: agentCostDecision === decision ? '#e4e4e7' : '#18181b',
                    borderColor: agentCostDecision === decision ? '#e4e4e7' : '#27272a',
                    color: agentCostDecision === decision ? '#18181b' : '#a1a1aa',
                  }}
                  onClick={() => setAgentCostDecision(decision)}
                >
                  {t(`review.agentCostDecision.${decision}`)}
                </button>
              ))}
            </div>
          )}
          <Button
            disabled={reflection.trim().length < 20 || !energyRating || (requiresAgentCostDecision && !agentCostDecision) || complete.isPending}
            onClick={() => complete.mutate()}
          >
            {complete.isPending ? t('review.saving') : t('review.submit')}
          </Button>
          <p className="text-xs" style={{ color: '#3f3f46' }}>
            {t('review.minChars')}
          </p>
        </div>
      )}
    </div>
  )
}
