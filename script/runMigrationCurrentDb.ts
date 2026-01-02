// Script to run the database migration for adding top_two_counts_json field
// Uses the current database from DATABASE_URL or SUPABASE_DATABASE_URL
import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import pg from 'pg';

const { Pool } = pg;

// Load environment variables from .env file
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Simple .env parser
try {
  const envPath = join(__dirname, '..', '.env');
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
  console.log('✅ Loaded .env file');
} catch (error) {
  console.warn('⚠️  Could not load .env file, using environment variables');
}

// Get database URL (same logic as db.ts)
const supabaseUrl = process.env.SUPABASE_DATABASE_URL;
const useSupabase = supabaseUrl && supabaseUrl.includes('pooler.supabase.com');
const databaseUrl = useSupabase ? supabaseUrl : process.env.DATABASE_URL;

if (!databaseUrl) {
  console.error('❌ DATABASE_URL or SUPABASE_DATABASE_URL must be set');
  console.error('   Set it in .env file or as an environment variable');
  process.exit(1);
}

const pool = new Pool({ 
  connectionString: databaseUrl,
  max: 20,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 2000,
});

async function runMigration() {
  console.log('🔄 Running migration to add top_two_counts_json field...');
  console.log(`📊 Database: ${databaseUrl.substring(0, 50)}...`);
  
  try {
    // Test connection
    await pool.query('SELECT 1');
    console.log('✅ Database connection established');
    
    // Check if column already exists
    const checkResult = await pool.query(`
      SELECT column_name 
      FROM information_schema.columns 
      WHERE table_name = 'aggregates' 
      AND column_name = 'top_two_counts_json'
    `);
    
    if (checkResult.rows.length > 0) {
      console.log('✅ Column top_two_counts_json already exists - migration not needed');
      await pool.end();
      process.exit(0);
    }
    
    console.log('📝 Column does not exist, running migration...');
    
    const migrationSQL = `
      ALTER TABLE aggregates 
      ADD COLUMN IF NOT EXISTS top_two_counts_json JSONB DEFAULT '{}' NOT NULL;

      UPDATE aggregates 
      SET top_two_counts_json = '{}' 
      WHERE top_two_counts_json IS NULL;
    `;
    
    await pool.query(migrationSQL);
    
    console.log('✅ Migration completed successfully!');
    console.log('   - Added top_two_counts_json column (JSONB)');
    console.log('   - Set default values for existing rows');
    
    // Verify the column exists
    const verifyResult = await pool.query(`
      SELECT column_name, data_type 
      FROM information_schema.columns 
      WHERE table_name = 'aggregates' 
      AND column_name = 'top_two_counts_json'
    `);
    
    if (verifyResult.rows.length > 0) {
      console.log('✅ Verified: top_two_counts_json column exists');
      console.log(`   - Type: ${verifyResult.rows[0].data_type}`);
    } else {
      console.warn('⚠️  Warning: Could not verify column exists');
    }
    
    await pool.end();
    process.exit(0);
  } catch (error: any) {
    console.error('❌ Migration failed:', error.message);
    console.error(error.stack);
    await pool.end();
    process.exit(1);
  }
}

runMigration();
