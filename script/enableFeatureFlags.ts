// Script to enable feature flags for staging
import { readFileSync } from 'fs';
import { join } from 'path';
import pg from 'pg';

const { Pool } = pg;

// Load environment variables
const projectRoot = process.cwd();
try {
  const envPath = join(projectRoot, '.env.staging');
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
  console.warn('⚠️  Could not load .env.staging file, trying .env');
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
  } catch (error2) {
    console.warn('⚠️  Could not load .env file, using environment variables');
  }
}

// Support both production and staging database URLs
const DATABASE_URL = process.env.STAGING_DATABASE_URL || 
                     process.env.STAGING_SUPABASE_DATABASE_URL ||
                     process.env.DATABASE_URL || 
                     process.env.SUPABASE_DATABASE_URL ||
                     process.argv[2];

if (!DATABASE_URL) {
  console.error('❌ Database URL required!');
  console.error('Set one of: STAGING_DATABASE_URL, STAGING_SUPABASE_DATABASE_URL, DATABASE_URL, or SUPABASE_DATABASE_URL');
  console.error('Or pass as argument: tsx script/enableFeatureFlags.ts <database-url>');
  process.exit(1);
}

const isStaging = !!(process.env.STAGING_DATABASE_URL || process.env.STAGING_SUPABASE_DATABASE_URL) ||
                  DATABASE_URL.includes('staging') ||
                  DATABASE_URL.includes('wmdywxhwzjqhafproxjd');
console.log(`📊 Using ${isStaging ? 'STAGING' : 'PRODUCTION'} database`);

const pool = new Pool({ connectionString: DATABASE_URL });

async function enableFeatureFlags() {
  const client = await pool.connect();
  try {
    console.log('🔄 Enabling feature flags...');
    
    await client.query('BEGIN');
    
    // Enable ENABLE_PRO_RESTRICTIONS (Pro gate/paywall)
    await client.query(`
      INSERT INTO feature_flags (key, enabled, config_json)
      VALUES ('ENABLE_PRO_RESTRICTIONS', true, '{}')
      ON CONFLICT (key) 
      DO UPDATE SET enabled = true, config_json = '{}'
    `);
    console.log('✅ Enabled ENABLE_PRO_RESTRICTIONS');
    
    // Enable ARCHIVE_OLDER_THAN_YESTERDAY (archive paywall)
    await client.query(`
      INSERT INTO feature_flags (key, enabled, config_json)
      VALUES ('ARCHIVE_OLDER_THAN_YESTERDAY', true, '{}')
      ON CONFLICT (key) 
      DO UPDATE SET enabled = true, config_json = '{}'
    `);
    console.log('✅ Enabled ARCHIVE_OLDER_THAN_YESTERDAY');
    
    await client.query('COMMIT');
    
    console.log('✅ Feature flags enabled successfully!');
    console.log('\n📋 Enabled flags:');
    console.log('  - ENABLE_PRO_RESTRICTIONS (Pro gate/paywall)');
    console.log('  - ARCHIVE_OLDER_THAN_YESTERDAY (Archive paywall)');
  } catch (error: any) {
    await client.query('ROLLBACK');
    console.error('❌ Failed to enable feature flags:', error.message);
    process.exit(1);
  } finally {
    client.release();
    await pool.end();
  }
}

enableFeatureFlags();

