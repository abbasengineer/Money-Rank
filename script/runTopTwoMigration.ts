// Script to run the database migration for adding top_two_counts_json field
import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import pg from 'pg';

const { Pool } = pg;

// Load environment variables from .env file BEFORE importing db
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Simple .env parser - must run before any db imports
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

// Get staging database URL
const STAGING_DB_URL = process.env.STAGING_DATABASE_URL || 
                       process.env.STAGING_SUPABASE_DATABASE_URL || 
                       'postgresql://postgres.wmdywxhwzjqhafproxjd:vIE3Q2dXT0e3rc0M@aws-0-us-west-2.pooler.supabase.com:5432/postgres';

const stagingPool = new Pool({ connectionString: STAGING_DB_URL });

async function runMigration() {
  console.log('🔄 Running migration to add top_two_counts_json field to staging...');
  console.log(`📊 Staging DB: ${STAGING_DB_URL.substring(0, 50)}...`);
  
  try {
    // Test connection
    await stagingPool.query('SELECT 1');
    console.log('✅ Database connection established');
    
    const migrationSQL = `
      ALTER TABLE aggregates 
      ADD COLUMN IF NOT EXISTS top_two_counts_json JSONB DEFAULT '{}' NOT NULL;

      UPDATE aggregates 
      SET top_two_counts_json = '{}' 
      WHERE top_two_counts_json IS NULL;
    `;
    
    await stagingPool.query(migrationSQL);
    
    console.log('✅ Migration completed successfully!');
    console.log('   - Added top_two_counts_json column (JSONB)');
    console.log('   - Set default values for existing rows');
    
    // Verify the column exists
    const verifyResult = await stagingPool.query(`
      SELECT column_name, data_type 
      FROM information_schema.columns 
      WHERE table_name = 'aggregates' 
      AND column_name = 'top_two_counts_json'
    `);
    
    if (verifyResult.rows.length > 0) {
      console.log('✅ Verified: top_two_counts_json column exists');
    } else {
      console.warn('⚠️  Warning: Could not verify column exists');
    }
    
    process.exit(0);
  } catch (error: any) {
    console.error('❌ Migration failed:', error.message);
    console.error(error.stack);
    process.exit(1);
  } finally {
    await stagingPool.end();
  }
}

runMigration();

