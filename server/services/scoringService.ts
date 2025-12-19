export interface ScoringConfig {
  GREAT_THRESHOLD: number;
  GOOD_THRESHOLD: number;
}

export const DEFAULT_SCORING_CONFIG: ScoringConfig = {
  GREAT_THRESHOLD: 90,
  GOOD_THRESHOLD: 60,
};

export type GradeTier = 'Great' | 'Good' | 'Risky';

const POSITION_WEIGHTS = [40, 30, 20, 10];

export function calculateRankingScore(
  userRanking: string[],
  idealRanking: string[]
): number {
  let score = 0;
  
  userRanking.forEach((optionId, userIndex) => {
    const idealIndex = idealRanking.indexOf(optionId);
    if (idealIndex === userIndex) {
      score += POSITION_WEIGHTS[userIndex];
    }
  });
  
  return score;
}

export function getGradeTier(score: number, config: ScoringConfig = DEFAULT_SCORING_CONFIG): GradeTier {
  if (score >= config.GREAT_THRESHOLD) return 'Great';
  if (score >= config.GOOD_THRESHOLD) return 'Good';
  return 'Risky';
}
