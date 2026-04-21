import { useState } from 'react'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { Button } from '@/components/ui/button'
import { api, queryKeys } from '@/lib/api'
import type { Review } from '@soloos/shared'

export function ReviewGate({ review }: { review: Review }) {
  const [reflection, setReflection] = useState('')
  const qc = useQueryClient()

  const complete = useMutation({
    mutationFn: () => api.reviews.complete(review.id, reflection),
    onSuccess: () => qc.invalidateQueries({ queryKey: queryKeys.reviewCurrent() }),
  })

  return (
    <div className="flex flex-col items-center justify-center h-full gap-6 max-w-lg mx-auto text-center">
      <div className="w-12 h-12 rounded-full flex items-center justify-center text-2xl"
           style={{ background: '#1c1a11', border: '1px solid #f59e0b33' }}>
        🔒
      </div>
      <div>
        <h2 className="text-sm font-semibold tracking-tight mb-1">Weekly Review Required</h2>
        <p className="text-xs" style={{ color: '#71717a' }}>
          Complete this week's retrospective to unlock the Cockpit.
        </p>
      </div>
      <textarea
        className="w-full rounded-lg p-3 text-sm resize-none"
        style={{ background: '#18181b', border: '1px solid #27272a', color: '#e4e4e7', height: 120 }}
        placeholder="What moved the needle this week? What drained you?"
        value={reflection}
        onChange={e => setReflection(e.target.value)}
      />
      <Button
        disabled={reflection.trim().length < 20 || complete.isPending}
        onClick={() => complete.mutate()}
        className="w-full"
      >
        {complete.isPending ? 'Saving…' : 'Complete Review & Unlock'}
      </Button>
    </div>
  )
}
