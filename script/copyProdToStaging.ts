// Script to copy production data to staging database
// Excludes user-related tables: users, attempts, aggregates, streaks, retry_wallets, user_badges
import pg from 'pg';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import { readFileSync } from 'fs';

const { Pool } = pg;

// Load environment variables
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Try to load .env file
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

// Get database URLs from environment or command line args
const PROD_DB_URL = process.env.PROD_DATABASE_URL || process.env.DATABASE_URL || process.env.SUPABASE_DATABASE_URL || process.argv[2];
const STAGING_DB_URL = process.env.STAGING_DATABASE_URL || process.env.STAGING_SUPABASE_DATABASE_URL || process.argv[3] || 'postgresql://postgres.wmdywxhwzjqhafproxjd:vIE3Q2dXT0e3rc0M@aws-0-us-west-2.pooler.supabase.com:5432/postgres';

if (!PROD_DB_URL) {
  console.error('❌ Production database URL required!');
  console.error('Usage: PROD_DATABASE_URL=... tsx script/copyProdToStaging.ts');
  console.error('   OR: Set DATABASE_URL or SUPABASE_DATABASE_URL in .env');
  console.error('   OR: tsx script/copyProdToStaging.ts <prod-url> <staging-url>');
  process.exit(1);
}

const prodPool = new Pool({ connectionString: PROD_DB_URL });
const stagingPool = new Pool({ connectionString: STAGING_DB_URL });

// Tables to copy (in order - respecting foreign keys)
const TABLES_TO_COPY = [
  'badges',           // No dependencies
  'feature_flags',    // No dependencies
  'daily_challenges', // No dependencies
  'challenge_options', // Depends on daily_challenges
];

async function copyTable(tableName: string) {
  console.log(`\n📋 Copying ${tableName}...`);
  
  try {
    // Determine order by column (id for most tables, key for feature_flags)
    const orderBy = tableName === 'feature_flags' ? 'key' : 'id';
    
    // Fetch all data from production
    const result = await prodPool.query(`SELECT * FROM ${tableName} ORDER BY ${orderBy}`);
    const rows = result.rows;
    
    if (rows.length === 0) {
      console.log(`   ⚠️  No data in production ${tableName}`);
      return;
    }
    
    console.log(`   Found ${rows.length} rows in production`);
    
    // Get column names
    const columns = Object.keys(rows[0]);
    const columnList = columns.join(', ');
    
    // Build INSERT query with ON CONFLICT
    let conflictClause = '';
    if (tableName === 'badges') {
      conflictClause = 'ON CONFLICT (id) DO UPDATE SET ' + 
        columns.filter(c => c !== 'id' && c !== 'created_at').map(c => `${c} = EXCLUDED.${c}`).join(', ');
    } else if (tableName === 'feature_flags') {
      conflictClause = 'ON CONFLICT (key) DO UPDATE SET enabled = EXCLUDED.enabled, config_json = EXCLUDED.config_json';
    } else if (tableName === 'daily_challenges') {
      conflictClause = 'ON CONFLICT (date_key) DO UPDATE SET ' + 
        columns.filter(c => c !== 'id' && c !== 'date_key' && c !== 'created_at').map(c => `${c} = EXCLUDED.${c}`).join(', ');
    } else if (tableName === 'challenge_options') {
      conflictClause = 'ON CONFLICT DO NOTHING'; // Has unique constraint on (challenge_id, ordering_index)
    } else {
      conflictClause = 'ON CONFLICT DO NOTHING';
    }
    
    // Insert rows in batches
    const batchSize = 100;
    let inserted = 0;
    let updated = 0;
    let skipped = 0;
    
    for (let i = 0; i < rows.length; i += batchSize) {
      const batch = rows.slice(i, i + batchSize);
      
      for (const row of batch) {
        const values = columns.map(col => {
          const val = row[col];
          // Handle JSONB and special types
          if (val && typeof val === 'object' && !(val instanceof Date)) {
            return JSON.stringify(val);
          }
          return val;
        });
        
        const placeholders = columns.map((_, i) => `$${i + 1}`).join(', ');
        const query = `
          INSERT INTO ${tableName} (${columnList})
          VALUES (${placeholders})
          ${conflictClause}
        `;
        
        try {
          const result = await stagingPool.query(query, values);
          if (result.rowCount === 0) {
            skipped++;
          } else if (conflictClause.includes('UPDATE')) {
            updated++;
          } else {
            inserted++;
          }
        } catch (error: any) {
          // Skip duplicate key errors for challenge_options
          if (error.code === '23505' && tableName === 'challenge_options') {
            skipped++;
            continue;
          }
          throw error;
        }
      }
    }
    
    console.log(`   ✅ Copied ${inserted} new, ${updated} updated, ${skipped} skipped rows to staging`);
    
  } catch (error: any) {
    console.error(`   ❌ Error copying ${tableName}:`, error.message);
    throw error;
  }
}

async function main() {
  console.log('🚀 Starting data copy from production to staging...');
  console.log(`📊 Production DB: ${PROD_DB_URL.substring(0, 50)}...`);
  console.log(`📊 Staging DB: ${STAGING_DB_URL.substring(0, 50)}...`);
  
  try {
    // Test connections
    await prodPool.query('SELECT 1');
    await stagingPool.query('SELECT 1');
    console.log('✅ Database connections established');
    
    // Copy tables in order
    for (const table of TABLES_TO_COPY) {
      await copyTable(table);
    }
    
    console.log('\n✅ Data copy completed successfully!');
    console.log('\n📋 Summary:');
    console.log('   - Copied: badges, feature_flags, daily_challenges, challenge_options');
    console.log('   - Excluded: users, attempts, aggregates, streaks, retry_wallets, user_badges');
    
  } catch (error: any) {
    console.error('\n❌ Copy failed:', error.message);
    console.error(error.stack);
    process.exit(1);
  } finally {
    await prodPool.end();
    await stagingPool.end();
  }
}

main();

