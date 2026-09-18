import 'dotenv/config'
import { defineConfig } from 'drizzle-kit'

export default defineConfig({
  dialect: 'postgresql',
  schema: './src/db/schema.ts',
  out: './migrations/pg',
  dbCredentials: {
    url: process.env.DATABASE_URL!,
  },
})
