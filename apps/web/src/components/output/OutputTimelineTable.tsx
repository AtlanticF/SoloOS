import { useTranslation } from 'react-i18next'
import type { OutputEvent, OutputLifecycleState } from '@/lib/api'

interface Props {
  items: OutputEvent[]
  isLoading: boolean
  hasNextPage: boolean
  onLoadMore: () => void
  selectedItemId?: string | null
  onItemClick?: (item: OutputEvent) => void
}

const STATE_COLORS: Record<OutputLifecycleState, { text: string; bg: string }> = {
  DRAFT:    { text: '#71717a', bg: '#27272a' },
  ACTIVE:   { text: '#4ade80', bg: '#14532d30' },
  VALUATED: { text: '#fbbf24', bg: '#78350f30' },
  GHOST:    { text: '#a1a1aa', bg: '#27272a' },
  ARCHIVED: { text: '#52525b', bg: '#1e1e22' },
}

export function OutputTimelineTable({
  items,
  isLoading,
  hasNextPage,
  onLoadMore,
  selectedItemId,
  onItemClick,
}: Props) {
  const { t } = useTranslation()

  if (isLoading && items.length === 0) {
    return (
      <div className="space-y-2">
        {Array.from({ length: 6 }).map((_, i) => (
          <div
            key={i}
            className="h-12 rounded-lg animate-pulse"
            style={{ background: '#18181b' }}
          />
        ))}
      </div>
    )
  }

  if (items.length === 0) {
    return (
      <div
        className="text-sm text-center py-8 rounded-lg border"
        style={{ color: '#52525b', borderColor: '#27272a', background: '#0d0d0d' }}
      >
        {t('output.noCommits')}
      </div>
    )
  }

  return (
    <div className="space-y-1">
      {items.map(item => (
        <OutputRow
          key={item.id}
          item={item}
          isSelected={selectedItemId === item.id}
          onClick={onItemClick}
        />
      ))}
      {hasNextPage && (
        <button
          onClick={onLoadMore}
          className="w-full text-sm py-2 rounded-lg border transition-colors hover:border-zinc-600"
          style={{ background: '#18181b', borderColor: '#27272a', color: '#71717a' }}
        >
          {t('output.loadMore')}
        </button>
      )}
    </div>
  )
}

function OutputRow({
  item,
  isSelected = false,
  onClick,
}: {
  item: OutputEvent
  isSelected?: boolean
  onClick?: (item: OutputEvent) => void
}) {
  const { t } = useTranslation()
  const stateColors = STATE_COLORS[item.state]
  const shortSha = item.commit_sha.slice(0, 7)
  const date = new Date(item.committed_at * 1000).toLocaleDateString([], {
    month: 'short',
    day: 'numeric',
  })

  return (
    <button
      type="button"
      onClick={() => onClick?.(item)}
      className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg border text-sm text-left transition-colors hover:border-zinc-600"
      style={{
        background: isSelected ? '#18181b' : '#0d0d0d',
        borderColor: isSelected ? '#3b82f655' : '#1e1e22',
      }}
    >
      {/* State badge */}
      <span
        title={t(`output.stateTooltip.${item.state}`)}
        className="flex-shrink-0 px-1.5 py-0.5 rounded text-xs font-medium"
        style={{ background: stateColors.bg, color: stateColors.text }}
      >
        {t(`output.stateLabel.${item.state}`)}
      </span>

      {/* SHA + message */}
      <span className="font-mono text-xs flex-shrink-0" style={{ color: '#52525b' }}>
        {shortSha}
      </span>
      <span className="flex-1 truncate" style={{ color: '#a1a1aa' }}>
        {item.commit_message}
      </span>

      {/* Project */}
      {item.project_name_snapshot && (
        <span
          className="flex-shrink-0 px-2 py-0.5 rounded text-xs"
          style={{ background: '#18181b', color: '#71717a' }}
        >
          {item.project_name_snapshot}
        </span>
      )}
      {item.state === 'GHOST' && !item.project_name_snapshot && (
        <span
          className="flex-shrink-0 px-2 py-0.5 rounded text-xs"
          style={{ background: '#18181b', color: '#52525b' }}
          title={t('output.ghostNote')}
        >
          orphaned
        </span>
      )}

      {/* Diff stats */}
      <span className="flex-shrink-0 text-xs font-mono" style={{ color: '#4ade80' }}>
        +{item.additions}
      </span>
      <span className="flex-shrink-0 text-xs font-mono" style={{ color: '#f87171' }}>
        -{item.deletions}
      </span>

      {/* Cost */}
      <span
        className="flex-shrink-0 text-xs tabular-nums"
        style={{ color: '#52525b' }}
        title={t('output.cost')}
      >
        ${item.allocated_cost}
      </span>

      {/* Revenue (only show if > 0) */}
      {parseFloat(item.realized_revenue) > 0 && (
        <span
          className="flex-shrink-0 text-xs tabular-nums"
          style={{ color: '#fbbf24' }}
          title={t('output.revenue')}
        >
          ↑${item.realized_revenue}
        </span>
      )}

      {/* Author + date */}
      <span className="flex-shrink-0 text-xs" style={{ color: '#3f3f46' }}>
        {item.author}
      </span>
      <span className="flex-shrink-0 text-xs tabular-nums" style={{ color: '#3f3f46' }}>
        {date}
      </span>
    </button>
  )
}
