import { ChallengeOption } from '@shared/schema';

export interface MisplacedOption {
  option: ChallengeOption;
  userPosition: number; // 1-4
  optimalPosition: number; // 1-4
  explanation: string; // Short explanation for backward compatibility
  detailedExplanation: string; // New: Full contextual explanation
  optionsAbove: ChallengeOption[]; // Options incorrectly ranked above this
  optionsBelow: ChallengeOption[]; // Options incorrectly ranked below this
}

export interface OptimalityExplanation {
  isPerfect: boolean;
  optimalRanking: ChallengeOption[];
  misplacedOptions: MisplacedOption[];
  summary: string;
}

/**
 * Generate detailed explanation of why user's ranking is not optimal
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

  // Find misplaced options with detailed context
  const misplacedOptions: MisplacedOption[] = [];
  const optimalRankingOptions = challengeOptions.sort((a, b) => a.orderingIndex - b.orderingIndex);
  
  userRanking.forEach((optionId, userIndex) => {
    const optimalIndex = optimalRanking.indexOf(optionId);
    const option = challengeOptions.find(opt => opt.id === optionId);
    
    if (!option || userIndex === optimalIndex) return;
    
    const userPosition = userIndex + 1;
    const optimalPosition = optimalIndex + 1;
    
    // Find options that are incorrectly ranked above this one
    const optionsAbove: ChallengeOption[] = [];
    for (let i = 0; i < userIndex; i++) {
      const aboveOptionId = userRanking[i];
      const aboveOption = challengeOptions.find(opt => opt.id === aboveOptionId);
      const aboveOptimalIndex = optimalRanking.indexOf(aboveOptionId);
      
      // If this option should be ranked higher than the option above it
      if (aboveOption && optimalIndex < aboveOptimalIndex) {
        optionsAbove.push(aboveOption);
      }
    }
    
    // Find options that are incorrectly ranked below this one
    const optionsBelow: ChallengeOption[] = [];
    for (let i = userIndex + 1; i < userRanking.length; i++) {
      const belowOptionId = userRanking[i];
      const belowOption = challengeOptions.find(opt => opt.id === belowOptionId);
      const belowOptimalIndex = optimalRanking.indexOf(belowOptionId);
      
      // If this option should be ranked lower than the option below it
      if (belowOption && optimalIndex > belowOptimalIndex) {
        optionsBelow.push(belowOption);
      }
    }
    
    // Generate detailed contextual explanation
    let detailedExplanation: string;
    try {
      detailedExplanation = generateDetailedExplanation(
        option,
        userPosition,
        optimalPosition,
        optionsAbove,
        optionsBelow,
        optimalRankingOptions
      );
    } catch (error) {
      console.error('Error generating detailed explanation:', error);
      // Fallback to basic explanation if generation fails
      detailedExplanation = `You ranked "${option.optionText}" as #${userPosition}, but it should be #${optimalPosition}. ${option.explanationShort}`;
    }
    
    // Ensure detailedExplanation is never empty
    if (!detailedExplanation || detailedExplanation.trim().length === 0) {
      detailedExplanation = `You ranked "${option.optionText}" as #${userPosition}, but it should be #${optimalPosition}. ${option.explanationShort}`;
    }
    
    misplacedOptions.push({
      option,
      userPosition,
      optimalPosition,
      explanation: option.explanationShort, // Keep short for backward compatibility
      detailedExplanation,
      optionsAbove,
      optionsBelow
    });
  });

  // Generate enhanced summary
  const summary = generateEnhancedSummary(misplacedOptions, optimalRankingOptions);

  return {
    isPerfect: false,
    optimalRanking: optimalRankingOptions,
    misplacedOptions: misplacedOptions.sort((a, b) => 
      Math.abs(a.userPosition - a.optimalPosition) - Math.abs(b.userPosition - b.optimalPosition)
    ).reverse(), // Sort by severity
    summary
  };
}

function generateDetailedExplanation(
  option: ChallengeOption,
  userPosition: number,
  optimalPosition: number,
  optionsAbove: ChallengeOption[],
  optionsBelow: ChallengeOption[],
  optimalRanking: ChallengeOption[]
): string {
  const positionDiff = Math.abs(userPosition - optimalPosition);
  const movedUp = userPosition > optimalPosition;
  const movedDown = userPosition < optimalPosition;
  
  let explanation = `You ranked "${option.optionText}" as #${userPosition}, but it should be #${optimalPosition}. `;
  
  // Add context about what this option is
  explanation += `${option.explanationShort} `;
  
  // Explain the positioning issue
  if (movedUp) {
    explanation += `By ranking it too high at position #${userPosition}, you're prioritizing this over more important financial decisions. `;
    
    if (optionsAbove.length > 0) {
      const aboveText = optionsAbove.map(opt => `"${opt.optionText}"`).join(' and ');
      explanation += `Specifically, you ranked ${aboveText} below this option, but ${optionsAbove.length === 1 ? 'it' : 'they'} should come first because `;
      
      if (optionsAbove.length === 1) {
        explanation += optionsAbove[0].explanationShort.toLowerCase() + '. ';
      } else {
        explanation += `these represent more critical financial priorities. `;
      }
    }
    
    // Explain what should be in this position instead
    const shouldBeHere = optimalRanking[userPosition - 1];
    if (shouldBeHere && shouldBeHere.id !== option.id) {
      explanation += `Position #${userPosition} should be occupied by "${shouldBeHere.optionText}" instead, `;
      explanation += `which is more important because ${shouldBeHere.explanationShort.toLowerCase()}. `;
    }
    
  } else if (movedDown) {
    explanation += `By ranking it too low at position #${userPosition}, you're undervaluing this important financial decision. `;
    
    if (optionsBelow.length > 0) {
      const belowText = optionsBelow.map(opt => `"${opt.optionText}"`).join(' and ');
      explanation += `You ranked ${belowText} above this option, but this should come first because `;
      explanation += `${option.explanationShort.toLowerCase()}. `;
    }
    
    // Explain what's incorrectly in the optimal position
    const incorrectlyHere = optimalRanking[optimalPosition - 1];
    if (incorrectlyHere && incorrectlyHere.id !== option.id) {
      const incorrectlyHereUserPos = optimalRanking.findIndex(opt => opt.id === incorrectlyHere.id) + 1;
      explanation += `The option currently in position #${optimalPosition}, "${incorrectlyHere.optionText}", `;
      explanation += `should actually be ranked ${incorrectlyHereUserPos > optimalPosition ? 'lower' : 'higher'} because `;
      explanation += `${incorrectlyHere.explanationShort.toLowerCase()}. `;
    }
  }
  
  // Add financial impact context
  if (positionDiff >= 2) {
    explanation += `This ${positionDiff}-position difference is significant and could lead to suboptimal financial outcomes. `;
  }
  
  // Add tier context
  const optionTier = option.tierLabel;
  const optimalTierAtPosition = optimalRanking[optimalPosition - 1]?.tierLabel;
  
  if (optionTier === 'Optimal' && optimalTierAtPosition !== 'Optimal') {
    explanation += `This is an optimal financial decision that should be prioritized over less ideal options. `;
  } else if (optionTier === 'Risky' && optimalTierAtPosition === 'Optimal') {
    explanation += `This risky option should not be prioritized over optimal financial decisions. `;
  }
  
  return explanation.trim();
}

function generateEnhancedSummary(misplacedOptions: MisplacedOption[], optimalRanking: ChallengeOption[]): string {
  if (misplacedOptions.length === 0) {
    return "Your ranking is optimal!";
  }

  const totalMisplaced = misplacedOptions.length;
  const mostSevere = misplacedOptions[0];
  const positionDiff = Math.abs(mostSevere.userPosition - mostSevere.optimalPosition);
  
  let summary = `You have ${totalMisplaced} ${totalMisplaced === 1 ? 'option' : 'options'} in non-optimal positions. `;
  
  summary += `The most significant issue is "${mostSevere.option.optionText}" `;
  summary += `which you ranked as #${mostSevere.userPosition} but should be #${mostSevere.optimalPosition}. `;
  
  if (positionDiff >= 2) {
    summary += `This ${positionDiff}-position difference indicates a misunderstanding of the relative financial priorities. `;
  }
  
  if (mostSevere.optionsAbove.length > 0 || mostSevere.optionsBelow.length > 0) {
    const conflicts = [...mostSevere.optionsAbove, ...mostSevere.optionsBelow];
    summary += `This misplacement affects the ranking of ${conflicts.length} other ${conflicts.length === 1 ? 'option' : 'options'}. `;
  }
  
  if (totalMisplaced > 1) {
    summary += `Additionally, ${totalMisplaced - 1} other ${totalMisplaced === 2 ? 'option needs' : 'options need'} repositioning. `;
  }
  
  summary += `Review the detailed explanations below to understand the optimal financial decision order.`;
  
  return summary;
}
