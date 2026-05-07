import { clsx, type ClassValue } from 'clsx'
import { twMerge } from 'tailwind-merge'
import type { Pillar } from '@soloos/shared'

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function pillarBadgeClass(pillar: Pillar): string {
  return `pillar-badge-${pillar.toLowerCase()}`
}

export function formatTs(unix: number, locale?: string): string {
  return new Date(unix * 1000).toLocaleString(locale, {
    month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit',
  })
}

export function formatMoney(dollars: number): string {
  return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(dollars)
}
