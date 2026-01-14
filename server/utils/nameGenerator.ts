const adjectives = [
  'Swift', 'Bold', 'Clever', 'Wise', 'Sharp', 'Bright', 'Quick', 'Smart',
  'Brave', 'Calm', 'Cool', 'Fast', 'Fresh', 'Grand', 'Great', 'Happy',
  'Kind', 'Lucky', 'Mighty', 'Noble', 'Proud', 'Rich', 'Royal', 'Super',
  'Swift', 'True', 'Wise', 'Young', 'Zest', 'Able', 'Prime', 'Elite',
  'Rapid', 'Solid', 'Steady', 'Strong', 'Sure', 'Tough', 'Vivid', 'Wild'
];

const nouns = [
  'Saver', 'Investor', 'Builder', 'Master', 'Expert', 'Pro', 'Star', 'Ace',
  'Hero', 'Champ', 'King', 'Queen', 'Guru', 'Wizard', 'Genius', 'Whiz',
  'Titan', 'Legend', 'Elite', 'Prime', 'Peak', 'Summit', 'Crown', 'Gem',
  'Pearl', 'Diamond', 'Gold', 'Silver', 'Platinum', 'Titanium', 'Phoenix',
  'Eagle', 'Lion', 'Tiger', 'Shark', 'Wolf', 'Bear', 'Falcon', 'Hawk'
];

export function generateRandomName(userId: string): string {
  // Use userId as seed for deterministic generation
  let hash = 0;
  for (let i = 0; i < userId.length; i++) {
    hash = ((hash << 5) - hash) + userId.charCodeAt(i);
    hash = hash & hash; // Convert to 32bit integer
  }
  
  const adjIndex = Math.abs(hash) % adjectives.length;
  const nounIndex = Math.abs(hash >> 8) % nouns.length;
  
  return `${adjectives[adjIndex]} ${nouns[nounIndex]}`;
}


