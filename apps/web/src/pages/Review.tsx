import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Button } from '@/components/ui/button'
import { api, queryKeys } from '@/lib/api'
import { formatTs } from '@/lib/utils'

export function Review() {
  const [reflection, setReflection] = useState('')
  const qc = useQueryClient()

  const { data: review, isLoading } = useQuery({
    queryKey: queryKeys.reviewCurrent(),
    queryFn: api.reviews.current,
  })

  const complete = useMutation({
    mutationFn: () => api.reviews.complete(review!.id, reflection),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: queryKeys.reviewCurrent() })
      setReflection('')
    },
  })

  if (isLoading) return <div className="text-xs text-zinc-600">Loading…</div>
  if (!review) return null

  const isCompleted = !!review.completed_at

  return (
    <div className="max-w-2xl mx-auto flex flex-col gap-6">
      <div>
        <h1 className="text-sm font-semibold tracking-tight">Weekly Review</h1>
        <p className="text-xs mt-1" style={{ color: '#71717a' }}>
          {formatTs(review.period_start)} → {formatTs(review.period_end)}
        </p>
      </div>

      {isCompleted ? (
        <div className="rounded-xl p-4" style={{ background: '#111', border: '1px solid #1e1e22' }}>
          <span className="text-xs font-semibold uppercase tracking-widest block mb-2" style={{ color: '#10b981' }}>
            ✓ Completed {formatTs(review.completed_at!)}
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
            placeholder="What moved the needle this week? What drained you? What should change?"
            value={reflection}
            onChange={e => setReflection(e.target.value)}
          />
          <Button
            disabled={reflection.trim().length < 20 || complete.isPending}
            onClick={() => complete.mutate()}
          >
            {complete.isPending ? 'Saving…' : 'Complete Review'}
          </Button>
          <p className="text-xs" style={{ color: '#3f3f46' }}>
            Minimum 20 characters. This unlocks the Cockpit for the week.
          </p>
        </div>
      )}
    </div>
  )
}
