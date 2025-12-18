export interface ScoringConfig {
  GREAT_THRESHOLD: number;
  GOOD_THRESHOLD: number;
}

export const DEFAULT_SCORING_CONFIG: ScoringConfig = {
  GREAT_THRESHOLD: 90,
  GOOD_THRESHOLD: 60,
};

export type GradeTier = 'Great' | 'Good' | 'Risky';

export function calculateRankingScore(
  userRanking: string[],
  idealRanking: string[]
): number {
  let distance = 0;
  
  userRanking.forEach((optionId, userIndex) => {
    const idealIndex = idealRanking.indexOf(optionId);
    if (idealIndex !== -1) {
      distance += Math.abs(userIndex - idealIndex);
    }
  });
  
  const maxDistance = 8;
  const score = Math.max(0, 100 - (distance * 12.5));
  return Math.round(score);
}

export function getGradeTier(score: number, config: ScoringConfig = DEFAULT_SCORING_CONFIG): GradeTier {
  if (score >= config.GREAT_THRESHOLD) return 'Great';
  if (score >= config.GOOD_THRESHOLD) return 'Good';
  return 'Risky';
}
