import { NavLink } from 'react-router-dom'
import { LayoutDashboard, Layers, ClipboardList, Settings } from 'lucide-react'
import { cn } from '@/lib/utils'

const NAV = [
  { to: '/', icon: LayoutDashboard, label: 'Cockpit' },
  { to: '/explorer', icon: Layers, label: 'Explorer' },
  { to: '/review', icon: ClipboardList, label: 'Review' },
]

export function Sidebar() {
  return (
    <aside className="w-12 flex-shrink-0 flex flex-col items-center py-3 gap-1 border-r"
           style={{ background: '#0d0d0d', borderColor: '#1e1e22' }}>
      <div className="w-7 h-7 rounded-md flex items-center justify-center text-xs font-bold mb-3"
           style={{ background: '#6366f1', color: '#fff' }}>
        S
      </div>
      {NAV.map(({ to, icon: Icon, label }) => (
        <NavLink key={to} to={to} end={to === '/'}>
          {({ isActive }) => (
            <div title={label}
                 className={cn(
                   'w-9 h-9 rounded-lg flex items-center justify-center transition-colors',
                   isActive
                     ? 'text-zinc-100'
                     : 'text-zinc-600 hover:text-zinc-400',
                 )}
                 style={{ background: isActive ? '#18181b' : 'transparent' }}>
              <Icon size={16} />
            </div>
          )}
        </NavLink>
      ))}
      <div className="flex-1" />
      <div className="w-9 h-9 rounded-lg flex items-center justify-center text-zinc-600 hover:text-zinc-400 cursor-pointer">
        <Settings size={16} />
      </div>
    </aside>
  )
}
