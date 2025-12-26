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

export const pool = new Pool({ 
  connectionString: databaseUrl,
  max: 20, // Maximum number of clients in the pool
  idleTimeoutMillis: 30000, // Close idle clients after 30 seconds
  connectionTimeoutMillis: 2000, // Return an error after 2 seconds if connection cannot be established
});
export const db = drizzle(pool, { schema });
