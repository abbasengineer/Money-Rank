// Load .env file if variables aren't set (runs before imports in ESM)
import { readFileSync, existsSync } from 'fs';
import { join } from 'path';

if (!process.env.SUPABASE_DATABASE_URL && !process.env.DATABASE_URL) {
  const projectRoot = process.cwd();
  const envPath = join(projectRoot, '.env');
  if (existsSync(envPath)) {
    try {
      const envFile = readFileSync(envPath, 'utf-8');
      envFile.split('\n').forEach(line => {
        const trimmed = line.trim();
        if (trimmed && !trimmed.startsWith('#')) {
          const [key, ...valueParts] = trimmed.split('=');
          if (key && valueParts.length > 0) {
            const value = valueParts.join('=').trim().replace(/^["']|["']$/g, '');
            process.env[key.trim()] = value;
          }
        }
      });
    } catch (error) {
      // Silently fail - might be loaded elsewhere
    }
  }
}

import { drizzle } from "drizzle-orm/node-postgres";
import pg from "pg";
import * as schema from "@shared/schema";

const { Pool } = pg;

// Use SUPABASE_DATABASE_URL if it contains a valid pooler URL, otherwise fall back to DATABASE_URL
const supabaseUrl = process.env.SUPABASE_DATABASE_URL;
const useSupabase = supabaseUrl && supabaseUrl.includes('pooler.supabase.com');
const databaseUrl = useSupabase ? supabaseUrl : process.env.DATABASE_URL;

if (!databaseUrl) {
  throw new Error(
    "DATABASE_URL or SUPABASE_DATABASE_URL must be set. Did you forget to provision a database?",
  );
}

// Hosted DBs (Render↔Supabase, cross-region, cold starts) often need >2s to establish TLS + TCP.
const connectionTimeoutMs = Number(
  process.env.PG_CONNECTION_TIMEOUT_MS ?? "30000",
);

const needsExplicitSsl =
  /\bsslmode=(require|verify-ca|verify-full)\b/i.test(databaseUrl) ||
  databaseUrl.includes("supabase.co") ||
  databaseUrl.includes("pooler.supabase.com");

export const pool = new Pool({
  connectionString: databaseUrl,
  max: Number(process.env.PG_POOL_MAX ?? "20"),
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: connectionTimeoutMs,
  keepAlive: true,
  // Ensure TLS works when the URL implies SSL (some platforms omit strict verification in URL alone).
  ...(needsExplicitSsl ? { ssl: { rejectUnauthorized: false } } : {}),
});
export const db = drizzle(pool, { schema });
