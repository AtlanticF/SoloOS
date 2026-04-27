import { useState } from 'react'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { useTranslation } from 'react-i18next'
import { Zap } from 'lucide-react'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { api, queryKeys, type EntryWithCapture } from '@/lib/api'
import type { ParseOutcome } from '@soloos/shared'

interface Props {
  open: boolean
  onOpenChange: (open: boolean) => void
}

const OUTCOME_STYLES: Record<ParseOutcome, { color: string; bg: string }> = {
  insight_created:                  { color: '#10b981', bg: '#10b98115' },
  stored_in_inbox_missing_vector:   { color: '#f59e0b', bg: '#f59e0b15' },
  stored_in_inbox_missing_synthesis:{ color: '#f59e0b', bg: '#f59e0b15' },
  stored_in_inbox_missing_fact:     { color: '#f59e0b', bg: '#f59e0b15' },
  stored_pending:                   { color: '#71717a', bg: '#71717a15' },
}

export function CaptureDialog({ open, onOpenChange }: Props) {
  const { t } = useTranslation()
  const queryClient = useQueryClient()
  const [text, setText] = useState('')
  const [result, setResult] = useState<EntryWithCapture | null>(null)

  const { mutate, isPending } = useMutation({
    mutationFn: (content: string) => api.entries.capture(content),
    onSuccess: (data) => {
      setResult(data)
      queryClient.invalidateQueries({ queryKey: queryKeys.events() })
      queryClient.invalidateQueries({ queryKey: queryKeys.insights() })
      queryClient.invalidateQueries({ queryKey: queryKeys.entries() })
    },
  })

  function handleSubmit() {
    if (!text.trim()) return
    setResult(null)
    mutate(text.trim())
  }

  function handleClose() {
    onOpenChange(false)
    setTimeout(() => {
      setText('')
      setResult(null)
    }, 200)
  }

  const outcome = result?.capture?.outcome
  const outcomeStyle = outcome ? OUTCOME_STYLES[outcome] : null

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent
        className="sm:max-w-xl"
        style={{ background: '#111', border: '1px solid #1e1e22' }}
      >
        <DialogHeader>
          <DialogTitle
            className="text-sm font-semibold flex items-center gap-2"
            style={{ color: '#e4e4e7' }}
          >
            <span
              className="w-5 h-5 rounded flex items-center justify-center flex-shrink-0"
              style={{ background: '#10b98120', color: '#10b981' }}
            >
              <Zap size={11} />
            </span>
            {t('capture.title')}
          </DialogTitle>
        </DialogHeader>

        {!result ? (
          <div className="flex flex-col gap-3">
            <p className="text-xs" style={{ color: '#52525b' }}>
              {t('capture.hint')}
            </p>
            <textarea
              autoFocus
              value={text}
              onChange={e => setText(e.target.value)}
              onKeyDown={e => {
                if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) handleSubmit()
              }}
              rows={4}
              placeholder={t('capture.placeholder')}
              className="w-full rounded-lg px-3 py-2 text-sm resize-none"
              style={{
                background: '#18181b',
                border: '1px solid #27272a',
                color: '#e4e4e7',
                outline: 'none',
                lineHeight: '1.6',
              }}
            />
            <div className="flex items-center justify-between gap-2">
              <span className="text-xs" style={{ color: '#3f3f46' }}>
                {t('capture.submitHint')}
              </span>
              <Button
                onClick={handleSubmit}
                disabled={!text.trim() || isPending}
                className="flex-shrink-0"
                style={{ background: '#10b981', color: '#fff' }}
              >
                {isPending ? t('capture.parsing') : t('capture.submit')}
              </Button>
            </div>
          </div>
        ) : (
          <div className="flex flex-col gap-3">
            {outcomeStyle && outcome && (
              <div
                className="rounded-lg px-3 py-2.5 text-xs"
                style={{ background: outcomeStyle.bg, color: outcomeStyle.color, border: `1px solid ${outcomeStyle.color}30` }}
              >
                {result.capture?.feedback}
              </div>
            )}

            {result.capture?.insight && (
              <div className="flex flex-col gap-2 rounded-lg p-3" style={{ background: '#18181b', border: '1px solid #27272a' }}>
                <InsightField label={t('capture.fact')} value={result.capture.insight.content.fact} />
                <InsightField label={t('capture.synthesis')} value={result.capture.insight.content.synthesis} />
                <InsightField label={t('capture.vector')} value={result.capture.insight.content.vector} />
                <div className="grid grid-cols-2 gap-2 mt-1">
                  <div className="flex items-center gap-1.5">
                    <span className="text-[10px] font-semibold uppercase tracking-widest" style={{ color: '#3f3f46' }}>
                      {t('nodeSheet.type')}
                    </span>
                    <span
                      className="text-xs px-2 py-0.5 rounded font-mono"
                      style={{ background: '#10b98120', color: '#10b981', border: '1px solid #10b98140' }}
                    >
                      {t(`nodeSheet.insightType.${result.capture.insight.type}`)}
                    </span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <span className="text-[10px] font-semibold uppercase tracking-widest" style={{ color: '#3f3f46' }}>
                      {t('nodeSheet.status')}
                    </span>
                    <span
                      className="text-xs px-2 py-0.5 rounded font-mono"
                      style={{ background: '#10b98120', color: '#10b981', border: '1px solid #10b98140' }}
                    >
                      {t(`nodeSheet.insightStatus.${result.capture.insight.status}`)}
                    </span>
                  </div>
                </div>
              </div>
            )}

            <div className="flex justify-end gap-2">
              <Button
                variant="outline"
                onClick={() => { setText(''); setResult(null) }}
                className="hover:text-zinc-300"
                style={{ background: '#141416', borderColor: '#232329', color: '#7c7c86' }}
              >
                {t('capture.captureAnother')}
              </Button>
              <Button onClick={handleClose} className="hover:text-white" style={{ background: '#202024', color: '#f4f4f5', border: '1px solid #3a3a42' }}>
                {t('capture.done')}
              </Button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  )
}

function InsightField({ label, value }: { label: string; value: string }) {
  if (!value) return null
  return (
    <div className="flex flex-col gap-0.5">
      <span className="text-xs font-semibold uppercase tracking-widest" style={{ color: '#3f3f46' }}>
        {label}
      </span>
      <span className="text-xs" style={{ color: '#a1a1aa' }}>{value}</span>
    </div>
  )
}
