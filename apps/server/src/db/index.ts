import Database from 'better-sqlite3'
import { drizzle } from 'drizzle-orm/better-sqlite3'
import { migrate } from 'drizzle-orm/better-sqlite3/migrator'
import { homedir } from 'os'
import { mkdirSync } from 'fs'
import { join } from 'path'
import * as schema from './schema'

export type DB = ReturnType<typeof drizzle<typeof schema>>

function createDb(dbPath: string): DB {
  mkdirSync(join(homedir(), '.soloos'), { recursive: true })
  const sqlite = new Database(dbPath)
  sqlite.pragma('journal_mode = WAL')
  const db = drizzle(sqlite, { schema })
  migrate(db, { migrationsFolder: join(import.meta.dirname, '../../drizzle') })
  return db
}

const DB_PATH = join(homedir(), '.soloos', 'soloos.db')
let _db: DB | null = null

export function getDb(): DB {
  if (!_db) _db = createDb(DB_PATH)
  return _db
}

export function createTestDb(): DB {
  const sqlite = new Database(':memory:')
  const db = drizzle(sqlite, { schema })
  migrate(db, { migrationsFolder: join(import.meta.dirname, '../../drizzle') })
  return db
}
