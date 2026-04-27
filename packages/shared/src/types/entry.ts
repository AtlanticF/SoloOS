import type { Pillar } from './pillar'

export type EntryStatus = 'pending' | 'processed'
export type EntrySource = 'cli' | 'github' | 'stripe' | 'browser-ext'

export interface Entry {
  id: string
  content: string
  source: EntrySource
  status: EntryStatus
  quick_tags: string[]
  created_at: number
}

export interface CreateEntryInput {
  content: string
  source?: EntrySource
  pillar?: Pillar
  quick_tags?: string[]
}
