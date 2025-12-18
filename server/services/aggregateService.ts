import { storage } from '../storage';

export async function updateAggregatesForNewAttempt(
  challengeId: string,
  ranking: string[],
  newScore: number,
  oldBestScore: number | null
): Promise<void> {
  const aggregate = await storage.getAggregate(challengeId);
  
  if (!aggregate) {
    await storage.upsertAggregate({
      challengeId,
      bestAttemptCount: 1,
      topPickCountsJson: { [ranking[0]]: 1 },
      exactRankingCountsJson: { [ranking.join(',')]: 1 },
      scoreHistogramJson: { [newScore]: 1 },
    });
    return;
  }

  const topPicks = aggregate.topPickCountsJson as Record<string, number>;
  const exactRankings = aggregate.exactRankingCountsJson as Record<string, number>;
  const scoreHistogram = aggregate.scoreHistogramJson as Record<string, number>;

  topPicks[ranking[0]] = (topPicks[ranking[0]] || 0) + 1;
  
  const rankingKey = ranking.join(',');
  exactRankings[rankingKey] = (exactRankings[rankingKey] || 0) + 1;

  scoreHistogram[newScore] = (scoreHistogram[newScore] || 0) + 1;
  if (oldBestScore !== null && oldBestScore !== newScore) {
    scoreHistogram[oldBestScore] = Math.max(0, (scoreHistogram[oldBestScore] || 0) - 1);
  }

  const newCount = oldBestScore === null ? aggregate.bestAttemptCount + 1 : aggregate.bestAttemptCount;

  await storage.upsertAggregate({
    challengeId,
    bestAttemptCount: newCount,
    topPickCountsJson: topPicks,
    exactRankingCountsJson: exactRankings,
    scoreHistogramJson: scoreHistogram,
  });
}

export async function calculatePercentile(challengeId: string, userScore: number): Promise<number> {
  const aggregate = await storage.getAggregate(challengeId);
  if (!aggregate || aggregate.bestAttemptCount === 0) return 50;

  const histogram = aggregate.scoreHistogramJson as Record<string, number>;
  
  let countBelow = 0;
  for (const [score, count] of Object.entries(histogram)) {
    if (parseInt(score) < userScore) {
      countBelow += count;
    }
  }

  const percentile = Math.round((countBelow / aggregate.bestAttemptCount) * 100);
  return percentile;
}
