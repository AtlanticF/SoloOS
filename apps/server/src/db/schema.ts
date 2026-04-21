import { sqliteTable, text, integer, real, primaryKey } from 'drizzle-orm/sqlite-core'

export const entries = sqliteTable('entries', {
  id: text('id').primaryKey(),
  content: text('content').notNull(),
  source: text('source').notNull().default('cli'),
  status: text('status').notNull().default('pending'),
  quick_tags: text('quick_tags').notNull().default('[]'),
  created_at: integer('created_at').notNull(),
})

export const projects = sqliteTable('projects', {
  id: text('id').primaryKey(),
  name: text('name').notNull(),
  status: text('status').notNull().default('active'),
  match_rules: text('match_rules').notNull().default('{}'),
  is_auto: integer('is_auto').notNull().default(1),
  first_event_at: integer('first_event_at'),
  last_event_at: integer('last_event_at'),
  created_at: integer('created_at').notNull(),
})

export const events = sqliteTable('events', {
  id: text('id').primaryKey(),
  entry_id: text('entry_id').notNull().references(() => entries.id),
  pillar: text('pillar').notNull(),
  project_id: text('project_id').references(() => projects.id),
  impact_score: integer('impact_score').notNull().default(1),
  classifier: text('classifier').notNull().default('rule'),
  metadata: text('metadata').notNull().default('{}'),
  occurred_at: integer('occurred_at').notNull(),
  created_at: integer('created_at').notNull(),
})

export const reviews = sqliteTable('reviews', {
  id: text('id').primaryKey(),
  period: text('period').notNull(),
  period_start: integer('period_start').notNull(),
  period_end: integer('period_end').notNull(),
  snapshot: text('snapshot').notNull().default('[]'),
  reflection: text('reflection'),
  ai_insight: text('ai_insight'),
  completed_at: integer('completed_at'),
  created_at: integer('created_at').notNull(),
})

export const event_links = sqliteTable('event_links', {
  source_event_id: text('source_event_id').notNull().references(() => events.id),
  target_event_id: text('target_event_id').notNull().references(() => events.id),
  link_type: text('link_type').notNull(),
  confidence: real('confidence').notNull().default(0.5),
  created_by: text('created_by').notNull().default('ai'),
}, (t) => ({
  pk: primaryKey({ columns: [t.source_event_id, t.target_event_id, t.link_type] }),
}))
