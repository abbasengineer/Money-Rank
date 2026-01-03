export interface ScoringConfig {
  GREAT_THRESHOLD: number;
  GOOD_THRESHOLD: number;
}

export const DEFAULT_SCORING_CONFIG: ScoringConfig = {
  GREAT_THRESHOLD: 85,
  GOOD_THRESHOLD: 65,
};

export type GradeTier = 'Great' | 'Good' | 'Risky';

// Distance-based partial credit points table
// distance 0 (perfect position) → 25 points
// distance 1 (off by 1 position) → 18 points
// distance 2 (off by 2 positions) → 10 points
// distance 3 (off by 3 positions) → 0 points
const DISTANCE_POINTS = [25, 18, 10, 0];

export function calculateRankingScore(
  userRanking: string[],
  idealRanking: string[],
  challengeOptions?: Array<{ id: string; tierLabel: string; orderingIndex: number }>
): number {
  let totalScore = 0;
  
  // Validate inputs
  if (!userRanking || userRanking.length === 0) {
    return 0;
  }
  
  if (!idealRanking || idealRanking.length === 0) {
    return 0;
  }
  
  // Check if positions 0 and 1 are swapped Optimal options (bonus case)
  let hasOptimalSwap = false;
  if (challengeOptions && userRanking.length >= 2 && idealRanking.length >= 2) {
    const userOpt0 = challengeOptions.find(opt => opt.id === userRanking[0]);
    const userOpt1 = challengeOptions.find(opt => opt.id === userRanking[1]);
    const idealOpt0 = challengeOptions.find(opt => opt.id === idealRanking[0]);
    const idealOpt1 = challengeOptions.find(opt => opt.id === idealRanking[1]);
    
    // Check if both positions have Optimal tier options and they're swapped
    if (userOpt0?.tierLabel === 'Optimal' && userOpt1?.tierLabel === 'Optimal' &&
        idealOpt0?.tierLabel === 'Optimal' && idealOpt1?.tierLabel === 'Optimal') {
      // Check if they're swapped (Optimal 2 in pos 0, Optimal 1 in pos 1)
      if (userRanking[0] === idealRanking[1] && userRanking[1] === idealRanking[0]) {
        hasOptimalSwap = true;
      }
    }
  }
  
  // For each option in the user's ranking, calculate distance from ideal position
  for (let userPosition = 0; userPosition < userRanking.length; userPosition++) {
    const optionId = userRanking[userPosition];
    const idealPosition = idealRanking.indexOf(optionId);
    
    // If option not found in ideal ranking, treat as maximum distance (0 points)
    if (idealPosition === -1) {
      // Option doesn't exist in ideal ranking - this shouldn't happen normally
      // but can occur if challenge options were updated after attempt was made
      // Skip this option (0 points)
      continue;
    }
    
    // Calculate distance (how many positions off)
    const distance = Math.abs(userPosition - idealPosition);
    
    // Get points for this distance (clamp to max distance of 3)
    let points = DISTANCE_POINTS[Math.min(distance, 3)];
    
    // Apply Optimal swap bonus: if positions 0 and 1 are swapped Optimal options,
    // give them 21 points each instead of 18 (distance 1)
    if (hasOptimalSwap && userPosition < 2 && distance === 1) {
      points = 21; // Bonus: 21 points instead of 18 for swapped Optimal options
    }
    
    totalScore += points;
  }
  
  return totalScore;
}

export function getGradeTier(score: number, config: ScoringConfig = DEFAULT_SCORING_CONFIG): GradeTier {
  if (score >= config.GREAT_THRESHOLD) return 'Great';
  if (score >= config.GOOD_THRESHOLD) return 'Good';
  return 'Risky';
}
