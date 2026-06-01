import { useTranslation } from 'react-i18next'
import type { AgentCostPeriodSummary } from '@soloos/shared'

export function AgentCostSummaryPanel({ summary }: { summary: AgentCostPeriodSummary }) {
  const { t } = useTranslation()
  const hasCost = Number(summary.total_amount) > 0

  return (
    <section className="rounded-lg border p-3 flex flex-col gap-3" style={{ background: '#111', borderColor: '#27272a' }}>
      <div className="flex items-center justify-between gap-3">
        <div>
          <div className="text-xs font-medium" style={{ color: '#e4e4e7' }}>
            {t('review.agentCostSummary')}
          </div>
          <div className="text-[11px]" style={{ color: '#71717a' }}>
            {hasCost ? t('review.agentCostSummaryDesc') : t('review.agentCostEmpty')}
          </div>
        </div>
        <div className="text-sm font-mono" style={{ color: hasCost ? '#e4e4e7' : '#71717a' }}>
          {summary.currency} {summary.total_amount}
        </div>
      </div>

      <div className="grid gap-2 md:grid-cols-3">
        <SummaryMetric label={t('review.officialApiCost')} value={`${summary.currency} ${summary.official_api_amount}`} />
        <SummaryMetric label={t('review.personalAllocatedCost')} value={`${summary.currency} ${summary.personal_subscription_allocated_amount}`} />
        <SummaryMetric label={t('review.personalUnallocatedCost')} value={`${summary.currency} ${summary.personal_subscription_unallocated_amount}`} />
      </div>

      {summary.project_costs.length > 0 && (
        <div className="border-t pt-2 flex flex-col gap-1" style={{ borderColor: '#27272a' }}>
          {summary.project_costs.map((project) => (
            <div key={project.project_id} className="flex items-center justify-between gap-3 text-[11px]">
              <span className="font-mono truncate" style={{ color: '#71717a' }}>{project.project_id}</span>
              <span className="font-mono" style={{ color: '#a1a1aa' }}>{project.currency} {project.amount}</span>
            </div>
          ))}
        </div>
      )}
    </section>
  )
}

function SummaryMetric({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-md px-3 py-2" style={{ background: '#18181b', border: '1px solid #27272a' }}>
      <div className="text-[11px]" style={{ color: '#71717a' }}>{label}</div>
      <div className="text-xs font-mono mt-0.5" style={{ color: '#e4e4e7' }}>{value}</div>
    </div>
  )
}
