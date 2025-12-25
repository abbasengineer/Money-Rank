import { db } from './db';
import { badges } from '@shared/schema';
import { BADGE_DEFINITIONS } from './data/badgeDefinitions';
import { eq } from 'drizzle-orm';

async function seedBadges() {
  console.log('Seeding badges...');

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
      console.log(`✓ Seeded badge: ${badgeDef.name}`);
    } catch (error) {
      console.error(`✗ Failed to seed badge ${badgeDef.id}:`, error);
    }
  }

  console.log(`Seeded ${BADGE_DEFINITIONS.length} badges`);
}

// Run if executed directly
if (import.meta.url === `file://${process.argv[1]}`) {
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

