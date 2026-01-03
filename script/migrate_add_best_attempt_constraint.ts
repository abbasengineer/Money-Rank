// Migration script to add unique constraint for best attempts
// Ensures only one best attempt exists per user per challenge at the database level

import { db, pool } from '../server/db';
import { sql } from 'drizzle-orm';

async function migrate() {
  console.log('🔄 Starting migration: Add unique constraint for best attempts...\n');

  try {
    // Check if constraint already exists
    const checkConstraint = await pool.query(`
      SELECT constraint_name 
      FROM information_schema.table_constraints 
      WHERE table_name = 'attempts' 
      AND constraint_name = 'attempts_one_best_per_user_challenge'
    `);

    if (checkConstraint.rows.length > 0) {
      console.log('✅ Unique constraint already exists, skipping migration');
      return;
    }

    // Create partial unique index (only applies when is_best_attempt = true)
    // This ensures only one best attempt per user-challenge pair
    console.log('Creating unique constraint for best attempts...');
    await db.execute(sql`
      CREATE UNIQUE INDEX attempts_one_best_per_user_challenge 
      ON attempts(user_id, challenge_id) 
      WHERE is_best_attempt = true
    `);

    console.log('✅ Migration completed successfully!\n');
    console.log('✅ Database now enforces one best attempt per user per challenge\n');
  } catch (error) {
    console.error('❌ Migration failed:', error);
    
    // Check if it's a constraint violation (duplicates still exist)
    if (error instanceof Error && error.message.includes('duplicate')) {
      console.error('\n⚠️  Error: Duplicate best attempts still exist in the database');
      console.error('   Please run cleanup script first:');
      console.error('   tsx script/cleanup_duplicate_best_attempts.ts\n');
    }
    
    throw error;
  } finally {
    await pool.end();
  }
}

migrate().catch((err) => {
  console.error(err);
  process.exit(1);
});

