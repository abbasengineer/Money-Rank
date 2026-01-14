// Script to run subscription fields migration
import { readFileSync } from 'fs';
import { join } from 'path';
import pg from 'pg';

const { Pool } = pg;

// Load environment variables
const projectRoot = process.cwd();
try {
  const envPath = join(projectRoot, '.env');
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
  console.warn('⚠️  Could not load .env file, using environment variables');
}

const DATABASE_URL = process.env.DATABASE_URL || process.env.SUPABASE_DATABASE_URL;

if (!DATABASE_URL) {
  console.error('❌ DATABASE_URL or SUPABASE_DATABASE_URL required!');
  process.exit(1);
}

const pool = new Pool({ connectionString: DATABASE_URL });

async function runMigration() {
  console.log('🔄 Running subscription fields migration...');
  
  try {
    const migrationSQL = readFileSync(
      join(projectRoot, 'script', 'migrate_add_subscription_fields.sql'),
      'utf-8'
    );
    
    await pool.query(migrationSQL);
    
    console.log('✅ Migration completed successfully!');
    
    // Verify migration
    const result = await pool.query(`
      SELECT column_name, data_type, column_default 
      FROM information_schema.columns 
      WHERE table_name = 'users' 
      AND column_name IN ('subscription_tier', 'subscription_expires_at')
      ORDER BY column_name;
    `);
    
    console.log('\n📋 Verification:');
    result.rows.forEach(row => {
      console.log(`   ✅ ${row.column_name}: ${row.data_type} (default: ${row.column_default || 'none'})`);
    });
    
  } catch (error: any) {
    if (error.message?.includes('already exists') || error.message?.includes('duplicate')) {
      console.log('⚠️  Migration already applied (some columns may already exist)');
    } else {
      console.error('❌ Migration failed:', error.message);
      throw error;
    }
  } finally {
    await pool.end();
  }
}

runMigration().catch((error) => {
  console.error('❌ Migration failed:', error);
  process.exit(1);
});

