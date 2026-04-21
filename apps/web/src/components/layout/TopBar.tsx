import { useQuery } from '@tanstack/react-query'
import { useLocation } from 'react-router-dom'
import { api, queryKeys } from '@/lib/api'

const PAGE_TITLES: Record<string, string> = {
  '/': 'Cockpit',
  '/explorer': 'Explorer',
  '/review': 'Review',
}

export function TopBar() {
  const { pathname } = useLocation()
  const { data: review } = useQuery({
    queryKey: queryKeys.reviewCurrent(),
    queryFn: api.reviews.current,
  })

  const reviewPending = review && !review.completed_at

  return (
    <header className="h-10 flex items-center gap-3 px-4 border-b flex-shrink-0"
            style={{ background: '#0d0d0d', borderColor: '#1e1e22' }}>
      <span className="text-sm font-semibold tracking-tight text-zinc-100">
        {PAGE_TITLES[pathname] ?? 'SoloOS'}
      </span>
      <div className="flex-1" />
      {reviewPending && (
        <div className="flex items-center gap-1.5 px-3 py-1 rounded-full text-xs"
             style={{ background: '#1c1a11', border: '1px solid #f59e0b33', color: '#f59e0b' }}>
          <span className="w-1.5 h-1.5 rounded-full" style={{ background: '#f59e0b' }} />
          Review pending
        </div>
      )}
      <div className="flex items-center gap-1.5 px-3 py-1 rounded-full text-xs text-zinc-500"
           style={{ background: '#18181b', border: '1px solid #27272a' }}>
        <span className="w-1.5 h-1.5 rounded-full" style={{ background: '#10b981' }} />
        Local
      </div>
    </header>
  )
}
