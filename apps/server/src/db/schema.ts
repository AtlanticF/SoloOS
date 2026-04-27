import { sqliteTable, text, integer, real, primaryKey, uniqueIndex, index } from 'drizzle-orm/sqlite-core'

export const agent_configs = sqliteTable('agent_configs', {
  id: text('id').primaryKey(),
  provider: text('provider').notNull(),
  model: text('model').notNull(),
  base_url: text('base_url'),
  api_key: text('api_key').notNull(),
  created_at: integer('created_at').notNull(),
  updated_at: integer('updated_at').notNull(),
})

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
  title: text('title').notNull().default(''),
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

export const insights = sqliteTable('insights', {
  id: text('id').primaryKey(),
  entry_id: text('entry_id').notNull().references(() => entries.id),
  event_id: text('event_id').references(() => events.id),
  type: text('type').notNull().default('SEED'),
  fact: text('fact').notNull().default(''),
  synthesis: text('synthesis').notNull().default(''),
  vector: text('vector').notNull().default(''),
  value_score: integer('value_score').notNull().default(5),
  shelf_life: text('shelf_life').notNull().default('LONG'),
  certainty: real('certainty').notNull().default(0),
  status: text('status').notNull().default('INBOX'),
  project_id: text('project_id').references(() => projects.id),
  cluster_id: text('cluster_id'),
  created_at: integer('created_at').notNull(),
  updated_at: integer('updated_at').notNull(),
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

export const github_repo_bindings = sqliteTable('github_repo_bindings', {
  id: text('id').primaryKey(),
  repo_id: integer('repo_id').notNull().unique(),
  repo_name: text('repo_name').notNull(),
  repo_full_name: text('repo_full_name').notNull(),
  project_id: text('project_id').references(() => projects.id),
  created_at: integer('created_at').notNull(),
  updated_at: integer('updated_at').notNull(),
})

export const github_sync_state = sqliteTable('github_sync_state', {
  id: text('id').primaryKey(),
  repo_id: integer('repo_id').notNull().unique(),
  last_synced_sha: text('last_synced_sha'),
  last_synced_at: integer('last_synced_at'),
  next_safe_sync_at: integer('next_safe_sync_at'),
  sync_status: text('sync_status').notNull().default('idle'),
  error_message: text('error_message'),
  created_at: integer('created_at').notNull(),
  updated_at: integer('updated_at').notNull(),
})

export const github_configs = sqliteTable('github_configs', {
  id: text('id').primaryKey(),
  token: text('token').notNull(),
  auto_sync_enabled: integer('auto_sync_enabled').notNull().default(1),
  created_at: integer('created_at').notNull(),
  updated_at: integer('updated_at').notNull(),
})

export const associations = sqliteTable('associations', {
  id: text('id').primaryKey(),
  project_id: text('project_id').notNull().references(() => projects.id),
  source_id: text('source_id').notNull().references(() => insights.id),
  target_id: text('target_id').notNull(),
  match_score: real('match_score'),
  reasoning: text('reasoning'),
  status: text('status').notNull().default('PENDING_REVIEW'),
  created_at: integer('created_at').notNull(),
  updated_at: integer('updated_at').notNull(),
}, (t) => ({
  uniq_source_target: uniqueIndex('assoc_source_target_uniq').on(t.source_id, t.target_id),
  idx_project_status: index('idx_assoc_project_status').on(t.project_id, t.status),
  idx_target: index('idx_assoc_target').on(t.target_id),
  idx_source: index('idx_assoc_source').on(t.source_id),
}))

export const output_metadata = sqliteTable('output_metadata', {
  id: text('id').primaryKey(),
  event_id: text('event_id').notNull().unique().references(() => events.id),
  repo_id: integer('repo_id').notNull(),
  repo_name: text('repo_name').notNull(),
  commit_sha: text('commit_sha').notNull(),
  commit_message: text('commit_message').notNull(),
  author: text('author').notNull(),
  committed_at: integer('committed_at').notNull(),
  state: text('state').notNull().default('DRAFT'),
  project_id: text('project_id').references(() => projects.id),
  project_name_snapshot: text('project_name_snapshot'),
  additions: integer('additions').notNull().default(0),
  deletions: integer('deletions').notNull().default(0),
  files_changed: integer('files_changed').notNull().default(0),
  allocated_cost: text('allocated_cost').notNull().default('0.00'),
  realized_revenue: text('realized_revenue').notNull().default('0.00'),
  sync_version: integer('sync_version').notNull().default(1),
  created_at: integer('created_at').notNull(),
  updated_at: integer('updated_at').notNull(),
}, (t) => ({
  uniq_repo_commit: uniqueIndex('output_metadata_repo_commit_uniq').on(t.repo_id, t.commit_sha),
}))
