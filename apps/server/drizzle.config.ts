import { defineConfig } from 'drizzle-kit'
import { homedir } from 'os'
import { join } from 'path'

export default defineConfig({
  schema: './src/db/schema.ts',
  out: './drizzle',
  dialect: 'sqlite',
  dbCredentials: {
    url: join(homedir(), '.soloos', 'soloos.db'),
  },
})
