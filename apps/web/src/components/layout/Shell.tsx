import type { ReactNode } from 'react'
import { Sidebar } from './Sidebar'
import { TopBar } from './TopBar'

export function Shell({ children }: { children: ReactNode }) {
  return (
    <div className="flex h-screen w-screen overflow-hidden" style={{ background: '#0a0a0a' }}>
      <Sidebar />
      <div className="flex flex-col flex-1 min-w-0">
        <TopBar />
        <main className="flex-1 overflow-auto">
          {/* Centered content column — blank margins on left and right */}
          <div
            className="min-h-full flex flex-col px-8 py-6"
            style={{ maxWidth: 1200, margin: '0 auto' }}
          >
            {children}
          </div>
        </main>
      </div>
    </div>
  )
}
