// Diagnostic script to check why a score might be showing as 0
import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

// Load environment variables
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

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
} catch (error) {
  console.warn('⚠️  Could not load .env file');
}

import { storage } from '../server/storage';
import { calculateRankingScore } from '../server/services/scoringService';

async function diagnoseScore() {
  console.log('🔍 Diagnosing score issue...\n');
  
  // Get today's challenge
  const today = new Date().toISOString().split('T')[0];
  const challenge = await storage.getChallengeByDateKey(today);
  
  if (!challenge) {
    console.log('❌ No challenge found for today');
    return;
  }
  
  console.log(`📋 Challenge: ${challenge.title}`);
  console.log(`   ID: ${challenge.id}`);
  console.log(`   Options (${challenge.options.length}):`);
  challenge.options.forEach((opt, idx) => {
    console.log(`   ${idx + 1}. [${opt.id}] ${opt.optionText.substring(0, 50)}... (ordering: ${opt.orderingIndex})`);
  });
  
  const idealRanking = [...challenge.options]
    .sort((a, b) => a.orderingIndex - b.orderingIndex)
    .map(opt => opt.id);
  
  console.log(`\n✅ Ideal ranking: ${idealRanking.join(' → ')}`);
  
  // Get all recent attempts for this challenge
  const allAttempts = await storage.getUserAttempts('*'); // This won't work, need to query differently
  console.log('\n💡 To diagnose your specific attempt, please provide:');
  console.log('   1. Your user ID');
  console.log('   2. The challenge date you completed');
  console.log('\n   Or run this query in your database:');
  console.log(`   SELECT id, "userId", "challengeId", "scoreNumeric", "rankingJson", "gradeTier"`);
  console.log(`   FROM attempts`);
  console.log(`   WHERE "challengeId" = '${challenge.id}'`);
  console.log(`   ORDER BY "submittedAt" DESC`);
  console.log(`   LIMIT 10;`);
  
  process.exit(0);
}

diagnoseScore().catch(console.error);

