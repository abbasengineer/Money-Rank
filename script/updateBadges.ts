// Script to update badge definitions in the database
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

// Now import seedBadges
import { seedBadges } from '../server/seedBadges';

async function updateBadges() {
  console.log('🔄 Updating badge definitions in database...\n');
  
  try {
    await seedBadges();
    console.log('\n✅ Badge definitions updated successfully!');
    console.log('   All badges now use scores out of 100:');
    console.log('   - Perfect Match: 100');
    console.log('   - Excellent: 85+');
    console.log('   - High Achiever: 65+');
    console.log('   - Above Average: 60+');
    console.log('   - Steady Hand: 50+');
    
    process.exit(0);
  } catch (error) {
    console.error('❌ Failed to update badges:', error);
    process.exit(1);
  }
}

updateBadges();


