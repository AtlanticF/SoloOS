import { cn } from '@/lib/utils'

interface SidebarProfileProps {
  expanded: boolean
  name: string
}

function initialsFromName(name: string): string {
  const chars = Array.from(name.trim())
  return (chars.slice(0, 2).join('') || 'U').toUpperCase()
}

export function SidebarProfile({ expanded, name }: SidebarProfileProps) {
  const initials = initialsFromName(name)

  return (
    <div
      className={cn(
        'mb-1 flex-shrink-0 rounded-lg transition-colors',
        expanded ? 'mx-2 px-2 py-2' : 'mx-auto w-9 h-9 flex items-center justify-center',
      )}
      style={{ background: expanded ? '#111' : 'transparent' }}
      title={expanded ? undefined : name}
    >
      <div className="flex items-center gap-2 min-w-0">
        <div
          className="w-7 h-7 rounded-full flex items-center justify-center text-[10px] font-semibold flex-shrink-0"
          style={{ background: '#27272a', color: '#e4e4e7' }}
        >
          {initials}
        </div>
        {expanded && (
          <span className="text-sm truncate" style={{ color: '#d4d4d8' }}>
            {name}
          </span>
        )}
      </div>
    </div>
  )
}
