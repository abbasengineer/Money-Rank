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
  idealRanking: string[]
): number {
  let totalScore = 0;
  
  // Validate inputs
  if (!userRanking || userRanking.length === 0) {
    return 0;
  }
  
  if (!idealRanking || idealRanking.length === 0) {
    return 0;
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
    const points = DISTANCE_POINTS[Math.min(distance, 3)];
    
    totalScore += points;
  }
  
  return totalScore;
}

export function getGradeTier(score: number, config: ScoringConfig = DEFAULT_SCORING_CONFIG): GradeTier {
  if (score >= config.GREAT_THRESHOLD) return 'Great';
  if (score >= config.GOOD_THRESHOLD) return 'Good';
  return 'Risky';
}
