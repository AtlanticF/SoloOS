import { Card } from '@/components/ui/card'
import { cn } from '@/lib/utils'

interface PulseCardProps {
  label: string
  value: string
  delta?: string
  deltaPositive?: boolean
  alert?: boolean
}

export function PulseCard({ label, value, delta, deltaPositive, alert }: PulseCardProps) {
  return (
    <Card className="p-4 flex flex-col gap-1"
          style={{
            background: '#111',
            border: `1px solid ${alert ? 'rgba(139,92,246,0.4)' : '#1e1e22'}`,
          }}>
      <span className="text-xs font-semibold uppercase tracking-widest"
            style={{ color: alert ? '#8b5cf6' : '#52525b' }}>
        {label}
      </span>
      <span className={cn('font-mono text-xl font-bold tracking-tight')}
            style={{ color: alert ? '#8b5cf6' : '#e4e4e7' }}>
        {value}
      </span>
      {delta && (
        <span className="text-xs" style={{ color: deltaPositive ? '#10b981' : '#71717a' }}>
          {delta}
        </span>
      )}
    </Card>
  )
}
