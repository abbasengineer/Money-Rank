// Migration script to add dateKey column to attempts table
// This allows matching attempts by dateKey even when challengeId changes (re-seeded challenges)

import { db, pool } from '../server/db';
import { sql } from 'drizzle-orm';

async function migrate() {
  console.log('🔄 Starting migration: Add dateKey to attempts table...\n');

  try {
    // Check if column already exists
    const checkColumn = await pool.query(`
      SELECT column_name 
      FROM information_schema.columns 
      WHERE table_name = 'attempts' 
      AND column_name = 'date_key'
    `);

    if (checkColumn.rows.length > 0) {
      console.log('✅ date_key column already exists, skipping migration');
      return;
    }

    // Add dateKey column (nullable for backward compatibility)
    console.log('Adding date_key column to attempts table...');
    await db.execute(sql`
      ALTER TABLE attempts 
      ADD COLUMN date_key VARCHAR(10)
    `);

    // Add index for efficient queries
    console.log('Adding index on (user_id, date_key)...');
    await db.execute(sql`
      CREATE INDEX user_date_key_idx ON attempts(user_id, date_key)
    `);

    console.log('✅ Migration completed successfully!\n');
    console.log('📝 Next step: Run backfill script to populate dateKey for existing attempts');
    console.log('   Run: tsx script/backfill_date_key_to_attempts.ts\n');
  } catch (error) {
    console.error('❌ Migration failed:', error);
    throw error;
  } finally {
    await pool.end();
  }
}

migrate().catch((err) => {
  console.error(err);
  process.exit(1);
});

