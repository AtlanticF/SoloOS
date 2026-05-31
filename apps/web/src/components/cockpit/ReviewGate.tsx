import { useState } from 'react'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { useTranslation } from 'react-i18next'
import { Button } from '@/components/ui/button'
import { api, queryKeys } from '@/lib/api'
import type { AgentCostDecision, Review } from '@soloos/shared'

const AGENT_COST_DECISIONS: AgentCostDecision[] = ['continue', 'pause', 'kill', 'double_down']

export function ReviewGate({ review }: { review: Review }) {
  const { t } = useTranslation()
  const [reflection, setReflection] = useState('')
  const [agentCostDecision, setAgentCostDecision] = useState<AgentCostDecision | undefined>()
  const qc = useQueryClient()
  const requiresAgentCostDecision = Number(review.agent_cost_summary.total_amount) > 0

  const complete = useMutation({
    mutationFn: () => api.reviews.complete(review.id, reflection, requiresAgentCostDecision ? agentCostDecision : undefined),
    onSuccess: () => qc.invalidateQueries({ queryKey: queryKeys.reviewCurrent() }),
  })

  return (
    <div className="flex flex-col items-center justify-center h-full gap-6 max-w-lg mx-auto text-center">
      <div className="w-12 h-12 rounded-full flex items-center justify-center text-2xl"
           style={{ background: '#1c1a11', border: '1px solid #f59e0b33' }}>
        🔒
      </div>
      <div>
        <h2 className="text-sm font-semibold tracking-tight mb-1" style={{ color: '#e4e4e7' }}>
          {t('reviewGate.title')}
        </h2>
        <p className="text-xs" style={{ color: '#71717a' }}>
          {t('reviewGate.subtitle')}
        </p>
      </div>
      <textarea
        className="w-full rounded-lg p-3 text-sm resize-none"
        style={{ background: '#18181b', border: '1px solid #27272a', color: '#e4e4e7', height: 120 }}
        placeholder={t('reviewGate.placeholder')}
        value={reflection}
        onChange={e => setReflection(e.target.value)}
      />
      {requiresAgentCostDecision && (
        <div className="grid w-full grid-cols-2 gap-2">
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
        disabled={reflection.trim().length < 20 || (requiresAgentCostDecision && !agentCostDecision) || complete.isPending}
        onClick={() => complete.mutate()}
        className="w-full"
      >
        {complete.isPending ? t('reviewGate.saving') : t('reviewGate.submit')}
      </Button>
    </div>
  )
}
