// Script to run the database migration for adding birthday and income_bracket fields
import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

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

// Now import db
import { pool } from '../server/db';

async function runMigration() {
  console.log('🔄 Running migration to add birthday and income_bracket fields...');
  
  try {
    const migrationSQL = `
      ALTER TABLE users 
      ADD COLUMN IF NOT EXISTS birthday TIMESTAMP,
      ADD COLUMN IF NOT EXISTS income_bracket VARCHAR(20);

      CREATE INDEX IF NOT EXISTS income_bracket_idx ON users(income_bracket) WHERE income_bracket IS NOT NULL;
    `;
    
    await pool.query(migrationSQL);
    
    console.log('✅ Migration completed successfully!');
    console.log('   - Added birthday column (TIMESTAMP)');
    console.log('   - Added income_bracket column (VARCHAR(20))');
    console.log('   - Created index on income_bracket');
    
    process.exit(0);
  } catch (error) {
    console.error('❌ Migration failed:', error);
    process.exit(1);
  }
}

runMigration();

