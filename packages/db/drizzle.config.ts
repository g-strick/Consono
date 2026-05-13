import { config } from 'dotenv';
import { defineConfig } from 'drizzle-kit';

// Resolves relative to process.cwd() — run via `make db-*` which cds into packages/db/ first
config({ path: '../../.env' });

export default defineConfig({
  schema: './src/schema.ts',
  out: './drizzle',
  dialect: 'postgresql',
  dbCredentials: {
    url: process.env['DATABASE_URL']!,
  },
});
