import { ChallengeOption } from '@shared/schema';

export interface MisplacedOption {
  option: ChallengeOption;
  userPosition: number; // 1-4
  optimalPosition: number; // 1-4
  explanation: string;
}

export interface OptimalityExplanation {
  isPerfect: boolean;
  optimalRanking: ChallengeOption[];
  misplacedOptions: MisplacedOption[];
  summary: string;
}

/**
 * Generate explanation of why user's ranking is not optimal
 */
export function generateOptimalityExplanation(
  userRanking: string[], // Array of option IDs in user's order
  challengeOptions: ChallengeOption[] // All 4 options with orderingIndex
): OptimalityExplanation {
  // Build optimal ranking from orderingIndex
  const optimalRanking = [...challengeOptions]
    .sort((a, b) => a.orderingIndex - b.orderingIndex)
    .map(opt => opt.id);

  // Check if perfect
  const isPerfect = userRanking.every((id, index) => id === optimalRanking[index]);

  if (isPerfect) {
    return {
      isPerfect: true,
      optimalRanking: challengeOptions.sort((a, b) => a.orderingIndex - b.orderingIndex),
      misplacedOptions: [],
      summary: "Perfect ranking! You've identified the optimal financial decision order."
    };
  }

  // Find misplaced options
  const misplacedOptions: MisplacedOption[] = [];
  
  userRanking.forEach((optionId, userIndex) => {
    const optimalIndex = optimalRanking.indexOf(optionId);
    const option = challengeOptions.find(opt => opt.id === optionId);
    
    if (!option) return;
    
    if (userIndex !== optimalIndex) {
      misplacedOptions.push({
        option,
        userPosition: userIndex + 1,
        optimalPosition: optimalIndex + 1,
        explanation: option.explanationShort
      });
    }
  });

  // Generate summary
  const summary = generateSummary(misplacedOptions);

  return {
    isPerfect: false,
    optimalRanking: challengeOptions.sort((a, b) => a.orderingIndex - b.orderingIndex),
    misplacedOptions: misplacedOptions.sort((a, b) => Math.abs(a.userPosition - a.optimalPosition) - Math.abs(b.userPosition - b.optimalPosition)).reverse(), // Sort by severity
    summary
  };
}

function generateSummary(misplacedOptions: MisplacedOption[]): string {
  if (misplacedOptions.length === 0) {
    return "Your ranking is optimal!";
  }

  const mostSevere = misplacedOptions[0];
  const optionText = mostSevere.option.optionText.length > 60 
    ? mostSevere.option.optionText.substring(0, 60) + '...'
    : mostSevere.option.optionText;

  if (misplacedOptions.length === 1) {
    return `You ranked "${optionText}" as #${mostSevere.userPosition}, but it should be #${mostSevere.optimalPosition}.`;
  }

  return `You have ${misplacedOptions.length} options in non-optimal positions. The most significant is "${optionText}" which should be ranked #${mostSevere.optimalPosition} instead of #${mostSevere.userPosition}.`;
}

