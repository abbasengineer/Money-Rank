import { db } from '../server/db';
import { dailyChallenges } from '../shared/schema';

async function checkChallenges() {
  const challenges = await db
    .select({
      dateKey: dailyChallenges.dateKey,
      title: dailyChallenges.title,
      createdAt: dailyChallenges.createdAt
    })
    .from(dailyChallenges)
    .orderBy(dailyChallenges.dateKey);

  console.log(`Total challenges: ${challenges.length}\n`);
  
  if (challenges.length > 0) {
    console.log('First 10 challenges:');
    challenges.slice(0, 10).forEach(c => console.log(`  ${c.dateKey}: ${c.title}`));
    
    if (challenges.length > 10) {
      console.log('\nLast 10 challenges:');
      challenges.slice(-10).forEach(c => console.log(`  ${c.dateKey}: ${c.title}`));
    }

    const beforeFeb1 = challenges.filter(c => c.dateKey < '2025-02-01');
    console.log(`\nChallenges before Feb 1st: ${beforeFeb1.length}`);
    if (beforeFeb1.length > 0) {
      beforeFeb1.forEach(c => console.log(`  ${c.dateKey}: ${c.title}`));
    }
  }
}

checkChallenges()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error('Error:', error);
    process.exit(1);
  });

