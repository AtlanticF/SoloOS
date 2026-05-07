import Database from 'better-sqlite3';
import { drizzle } from 'drizzle-orm/better-sqlite3';
import { migrate } from 'drizzle-orm/better-sqlite3/migrator';
import { homedir } from 'os';
import { mkdirSync } from 'fs';
import { join } from 'path';
import { fileURLToPath } from 'url';
import * as schema from './schema';
const migrationsFolder = fileURLToPath(new URL('../../drizzle', import.meta.url));
function createDb(dbPath) {
    mkdirSync(join(homedir(), '.soloos'), { recursive: true });
    const sqlite = new Database(dbPath);
    sqlite.pragma('journal_mode = WAL');
    const db = drizzle(sqlite, { schema });
    migrate(db, { migrationsFolder: migrationsFolder });
    return db;
}
const DB_PATH = join(homedir(), '.soloos', 'soloos.db');
let _db = null;
export function getDb() {
    if (!_db)
        _db = createDb(DB_PATH);
    return _db;
}
export function createTestDb() {
    const sqlite = new Database(':memory:');
    const db = drizzle(sqlite, { schema });
    migrate(db, { migrationsFolder: migrationsFolder });
    return db;
}
