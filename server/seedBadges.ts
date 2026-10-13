import { db } from './db';
import { badges } from '@shared/schema';
import { BADGE_DEFINITIONS } from './data/badgeDefinitions';
import { eq } from 'drizzle-orm';

async function seedBadges() {
  for (const badgeDef of BADGE_DEFINITIONS) {
    try {
      await db
        .insert(badges)
        .values(badgeDef)
        .onConflictDoUpdate({
          target: badges.id,
          set: {
            name: badgeDef.name,
            description: badgeDef.description,
            icon: badgeDef.icon,
            category: badgeDef.category,
            rarity: badgeDef.rarity,
            criteriaType: badgeDef.criteriaType,
            criteriaValue: badgeDef.criteriaValue,
            criteriaConfig: badgeDef.criteriaConfig,
          },
        });
    } catch (error) {
      console.error(`✗ Failed to seed badge ${badgeDef.id}:`, error);
    }
  }
}

// Run if executed directly (avoid import.meta — bundle is CJS and would strip it)
const a1 = process.argv[1]?.replace(/\\/g, '/') ?? '';
const ranAsBadgeScript =
  a1.includes('/seedBadges.') || a1.endsWith('seedBadges.ts') || a1.endsWith('seedBadges.js');
if (ranAsBadgeScript) {
  seedBadges()
    .then(() => {
      console.log('Badge seeding complete');
      process.exit(0);
    })
    .catch((error) => {
      console.error('Badge seeding failed:', error);
      process.exit(1);
    });
}

export { seedBadges };

