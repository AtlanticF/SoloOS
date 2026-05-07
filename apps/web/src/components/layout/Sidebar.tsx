import { useState } from 'react'
import { NavLink, useNavigate } from 'react-router-dom'
import { LayoutDashboard, Layers, ClipboardList, Settings, ChevronRight, ChevronLeft, Zap, GitCommitHorizontal } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { cn } from '@/lib/utils'
import { SidebarProfile } from '@/components/layout/SidebarProfile'
import { CaptureDialog } from '@/components/capture/CaptureDialog'
import { useAgentHealth, HEALTH_COLORS, HEALTH_BG, HEALTH_BORDER } from '@/hooks/useAgentHealth'

const NAV = [
  { to: '/', icon: LayoutDashboard, key: 'cockpit' as const },
  { to: '/explorer', icon: Layers, key: 'explorer' as const },
  { to: '/output', icon: GitCommitHorizontal, key: 'output' as const },
  { to: '/review', icon: ClipboardList, key: 'review' as const },
]

export function Sidebar() {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const [expanded, setExpanded] = useState(
    () => localStorage.getItem('soloos-sidebar') === 'expanded'
  )
  const [showCollapsedToggle, setShowCollapsedToggle] = useState(false)
  const [captureOpen, setCaptureOpen] = useState(false)
  const mockUser = { name: 'Matt Solo' }

  const health = useAgentHealth()
  const healthColor = HEALTH_COLORS[health]
  const healthBg = HEALTH_BG[health]
  const healthBorder = HEALTH_BORDER[health]

  function toggle() {
    const next = !expanded
    setExpanded(next)
    localStorage.setItem('soloos-sidebar', next ? 'expanded' : 'collapsed')
  }

  function handleCaptureClick() {
    if (health === 'unconfigured' || health === 'error') {
      navigate('/settings')
      return
    }
    setCaptureOpen(true)
  }

  const captureTitle = health === 'unconfigured'
    ? t('capture.noConfigHint')
    : health === 'error'
    ? t('capture.configErrorHint')
    : t('capture.title')

  return (
    <aside
      className="flex-shrink-0 flex flex-col py-3 gap-1 border-r transition-all duration-200"
      style={{
        width: expanded ? 200 : 48,
        background: '#0d0d0d',
        borderColor: '#1e1e22',
        overflow: 'hidden',
      }}
    >
      {/* Header: logo left + toggle right */}
      <div
        className={cn('flex items-center mb-3 flex-shrink-0 relative', expanded ? 'px-3 gap-3' : 'px-2 justify-center')}
        onMouseEnter={() => !expanded && setShowCollapsedToggle(true)}
        onMouseLeave={() => !expanded && setShowCollapsedToggle(false)}
      >
        <img
          src="/soloos-logo-dark.png"
          alt="SoloOS logo"
          className="w-7 h-7 rounded-md object-cover flex-shrink-0"
        />
        {expanded && (
          <span className="text-sm font-semibold tracking-tight flex-1 truncate" style={{ color: '#e4e4e7' }}>
            SoloOS
          </span>
        )}
        {(expanded || showCollapsedToggle) && (
          <button
            onClick={toggle}
            className={cn(
              'flex items-center justify-center transition-colors text-zinc-600 hover:text-zinc-300',
              expanded ? 'w-7 h-7 rounded-lg flex-shrink-0' : 'w-7 h-7 rounded-md absolute inset-0 m-auto bg-[#18181b] border border-[#27272a] z-10',
            )}
            title={expanded ? t('nav.collapse') : t('nav.expand')}
          >
            {expanded ? <ChevronLeft size={14} /> : <ChevronRight size={14} />}
          </button>
        )}
      </div>

      {/* Capture button with health indicator */}
      <button
        onClick={handleCaptureClick}
        title={captureTitle}
        className={cn(
          'relative flex items-center gap-3 rounded-lg transition-colors cursor-pointer flex-shrink-0',
          expanded ? 'mx-2 px-3 h-9' : 'mx-auto w-9 h-9 justify-center',
        )}
        style={{ background: healthBg, border: `1px solid ${healthBorder}`, color: healthColor }}
      >
        <Zap size={14} className="flex-shrink-0" />
        {expanded && (
          <span className="text-sm font-medium truncate flex-1 text-left">{t('capture.title')}</span>
        )}
        {/* Health dot */}
        <span
          className={cn(
            'absolute rounded-full flex-shrink-0',
            health === 'ok' ? 'sidebar-health-dot-pulse' : ''
          )}
          style={{
            width: 6,
            height: 6,
            background: healthColor,
            top: expanded ? '50%' : 4,
            right: expanded ? 10 : 4,
            transform: expanded ? 'translateY(-50%)' : 'none',
            boxShadow: health === 'ok' ? `0 0 4px ${healthColor}` : 'none',
            ['--health-dot-color' as string]: healthColor,
          }}
        />
      </button>

      <CaptureDialog open={captureOpen} onOpenChange={setCaptureOpen} />

      {/* Nav items */}
      {NAV.map(({ to, icon: Icon, key }) => (
        <NavLink key={to} to={to} end={to === '/'}>
          {({ isActive }) => (
            <div
              title={expanded ? undefined : t(`nav.${key}`)}
              className={cn(
                'flex items-center gap-3 rounded-lg transition-colors cursor-pointer flex-shrink-0',
                expanded ? 'mx-2 px-3 h-9' : 'mx-auto w-9 h-9 justify-center',
                isActive ? 'text-zinc-100' : 'text-zinc-600 hover:text-zinc-400',
              )}
              style={{ background: isActive ? '#18181b' : 'transparent' }}
            >
              <Icon size={16} className="flex-shrink-0" />
              {expanded && (
                <span className="text-sm font-medium truncate">{t(`nav.${key}`)}</span>
              )}
            </div>
          )}
        </NavLink>
      ))}

      <div className="flex-1" />

      {/* Settings */}
      <NavLink to="/settings">
        {({ isActive }) => (
          <div
            title={expanded ? undefined : t('nav.settings')}
            className={cn(
              'flex items-center gap-3 rounded-lg transition-colors cursor-pointer flex-shrink-0',
              expanded ? 'mx-2 px-3 h-9' : 'mx-auto w-9 h-9 justify-center',
              isActive ? 'text-zinc-100' : 'text-zinc-600 hover:text-zinc-400',
            )}
            style={{ background: isActive ? '#18181b' : 'transparent' }}
          >
            <Settings size={16} className="flex-shrink-0" />
            {expanded && (
              <span className="text-sm font-medium truncate">{t('nav.settings')}</span>
            )}
          </div>
        )}
      </NavLink>
      <div className="px-2 py-2">
        <div className="h-px" style={{ background: '#1e1e22' }} />
      </div>
      <SidebarProfile expanded={expanded} name={mockUser.name} />
    </aside>
  )
}
