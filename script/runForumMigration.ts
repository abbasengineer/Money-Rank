// Script to run forum tables migration
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

// Support both production and staging database URLs
const DATABASE_URL = process.env.STAGING_DATABASE_URL || 
                     process.env.STAGING_SUPABASE_DATABASE_URL ||
                     process.env.DATABASE_URL || 
                     process.env.SUPABASE_DATABASE_URL ||
                     process.argv[2]; // Allow passing as command line arg

if (!DATABASE_URL) {
  console.error('❌ Database URL required!');
  console.error('Set one of: STAGING_DATABASE_URL, STAGING_SUPABASE_DATABASE_URL, DATABASE_URL, or SUPABASE_DATABASE_URL');
  console.error('Or pass as argument: tsx script/runForumMigration.ts <database-url>');
  process.exit(1);
}

const isStaging = !!(process.env.STAGING_DATABASE_URL || process.env.STAGING_SUPABASE_DATABASE_URL) ||
                  DATABASE_URL.includes('staging') ||
                  DATABASE_URL.includes('wmdywxhwzjqhafproxjd'); // Staging DB identifier
console.log(`📊 Using ${isStaging ? 'STAGING' : 'PRODUCTION'} database`);

const pool = new Pool({ connectionString: DATABASE_URL });

async function runMigration() {
  console.log('🔄 Running forum tables migration...');
  
  try {
    const migrationSQL = readFileSync(
      join(projectRoot, 'script', 'migrate_add_forum_tables.sql'),
      'utf-8'
    );
    
    await pool.query(migrationSQL);
    
    console.log('✅ Migration completed successfully!');
    
    // Verify migration
    const result = await pool.query(`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public' 
      AND table_name IN ('forum_posts', 'forum_comments', 'forum_votes')
      ORDER BY table_name;
    `);
    
    console.log('\n📋 Verification:');
    result.rows.forEach(row => {
      console.log(`   ✅ ${row.table_name} table created`);
    });
    
  } catch (error: any) {
    if (error.message?.includes('already exists') || error.message?.includes('duplicate')) {
      console.log('⚠️  Migration already applied (some tables may already exist)');
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

