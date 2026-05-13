import { drizzle } from 'drizzle-orm/node-postgres';
import { Pool } from 'pg';
import * as schema from './schema.js';

// ADR 0007: standard pg driver over TCP — not the Supabase JS client.
// Ensures portability to any Postgres host (Neon, Railway, RDS, self-hosted).
const url = process.env['DATABASE_URL'];
if (!url) throw new Error('DATABASE_URL is not set');

const pool = new Pool({ connectionString: url });

export const db = drizzle(pool, { schema });

export * from './schema.js';
