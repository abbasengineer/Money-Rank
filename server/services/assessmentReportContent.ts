import type { UserRiskProfile } from './riskProfileService';
import type { AssessmentDemographics } from './assessmentService';
import {
  buildQuestionnaireMoneyContext,
  buildProfileBullets,
  buildMoneyTableRows,
  buildBudgetingRules,
  buildEmergencyRules,
  buildDebtRules,
  buildHousingRules,
  buildCarRules,
  type QuestionnaireMoneyContext,
} from './assessmentReportMoneyContext';

export type ReportTopicRow = { name: string; score: number };

export type ReportEducationalSection = {
  title: string;
  rules: string[];
  yourInsight?: string;
};

export type AssessmentReportModel = {
  generatedAt: Date;
  personalizedInsights: string[];
  recommendations: string[];
  profile: {
    averageScore: number;
    overallRiskScore: number;
    riskTrend: string;
    riskStyleLine: string;
    topicRows: ReportTopicRow[];
  };
  /** Short intro lines when no salary (still useful). */
  baselineReference: string[];
  sections: ReportEducationalSection[];
  literacyReminder: string;
  questionnaire: {
    profileBullets: string[];
    moneyRows: { label: string; value: string }[];
    moneyContext: QuestionnaireMoneyContext | null;
    split503020: {
      takeHomeMonthly: number;
      needs: number;
      wants: number;
      savingsDebt: number;
    } | null;
  };
};

function topicScores(profile: UserRiskProfile): Record<string, number> {
  const raw = profile.categoryScenarioScores;
  if (raw && Object.keys(raw).length > 0) return raw;
  return Object.fromEntries(Object.keys(profile.categoryRiskScores).map((k) => [k, profile.averageScore]));
}

function riskStyleLine(overallRiskScore: number): string {
  if (overallRiskScore < 20) {
    return 'Your ranked choices skew conservative—prioritizing safety and stability.';
  }
  if (overallRiskScore < 40) {
    return 'You balance risk and reward in a thoughtful way.';
  }
  if (overallRiskScore < 60) {
    return 'You are comfortable with moderate risk and growth-oriented tradeoffs.';
  }
  return 'Your rankings suggest a higher appetite for risk—worth double-checking high-impact money decisions.';
}

export function buildPersonalizedInsights(profile: UserRiskProfile): string[] {
  const insights: string[] = [];
  const topics = topicScores(profile);
  const entries = Object.entries(topics);
  if (entries.length > 0) {
    const sorted = [...entries].sort((a, b) => b[1] - a[1]);
    const best = sorted[0];
    const worst = sorted[sorted.length - 1];
    if (best && best[1] >= 75) {
      insights.push(`Strongest topic match: ${best[0]} (${best[1]} / 100 vs. expert-ranked order).`);
    }
    if (worst && worst[1] < 65 && worst[0] !== best?.[0]) {
      insights.push(`Room to grow: ${worst[0]} (${worst[1]} / 100)—review scenarios in this area.`);
    }
  }

  if (insights.length === 0) {
    insights.push(riskStyleLine(profile.overallRiskScore));
  }

  return insights;
}

export function buildRecommendations(profile: UserRiskProfile): string[] {
  const rec: string[] = [];
  const sig = profile.conversionSignals;
  if (sig.needsDebtHelp) rec.push('Focus on debt strategy: payment order, refinancing high-interest balances, and DTI.');
  if (sig.needsInsurance) rec.push('Review insurance: health coverage, life (if dependents), and disability income protection.');
  if (sig.needsInvestmentAdvice) rec.push('Build or refine your investing plan: match, diversification, and time horizon.');
  if (sig.needsRetirementPlanning) rec.push('Stress-test retirement: contribution rate, employer match, and account types.');
  if (sig.needsTaxAdvice) rec.push('Explore tax-smart moves: withholding, deductions, and tax-advantaged accounts.');

  const topics = topicScores(profile);
  const weakest = Object.entries(topics).sort((a, b) => a[1] - b[1])[0];
  if (weakest && weakest[1] < 70) {
    rec.push(`Practice more ${weakest[0]} scenarios on MoneyRank to lift your match score (currently ${weakest[1]}/100).`);
  }

  if (rec.length === 0) {
    rec.push('Keep practicing ranked scenarios across topics to stay sharp and catch blind spots.');
  }
  return rec;
}

function emergencyYourInsight(d: AssessmentDemographics): string | undefined {
  if (!d.emergencyFund) return undefined;
  if (d.emergencyFund === 'yes') {
    return 'You indicated you already have an emergency fund—compare the balance to the rough 3–6 month targets in the rules.';
  }
  if (d.emergencyFund === 'partial') {
    return 'You indicated a partial fund—use the dollar ranges above as a directional goal.';
  }
  return 'You indicated no dedicated emergency fund—consider opening a separate high-yield savings bucket.';
}

function investingYourInsight(profile: UserRiskProfile, d: AssessmentDemographics): string | undefined {
  const parts: string[] = [];
  if (profile.conversionSignals.needsInvestmentAdvice || profile.conversionSignals.needsRetirementPlanning) {
    parts.push('Your quiz signals suggest reviewing investing and retirement planning topics.');
  }
  if (typeof d.age === 'number') {
    parts.push(
      `At age ${d.age}, common retirement balance milestones are rules of thumb only (e.g. ~1x salary by 30, 3x by 40)—your situation may differ.`
    );
  }
  return parts.length ? parts.join(' ') : undefined;
}

export function buildAssessmentReportModel(
  profile: UserRiskProfile,
  demographics: AssessmentDemographics | Record<string, unknown> | null | undefined,
  generatedAt = new Date()
): AssessmentReportModel {
  const d = (demographics || {}) as AssessmentDemographics;
  const moneyContext = buildQuestionnaireMoneyContext(d);
  const profileBullets = buildProfileBullets(d, moneyContext);
  const moneyRows = buildMoneyTableRows(d, moneyContext);

  const personalizedInsights = buildPersonalizedInsights(profile);
  const recommendations = buildRecommendations(profile);
  const topics = topicScores(profile);
  const topicRows: ReportTopicRow[] = Object.entries(topics)
    .sort((a, b) => b[1] - a[1])
    .map(([name, score]) => ({ name, score }));

  const baselineReference = moneyContext
    ? [
        'Figures below use your questionnaire salary and assumptions (~75% of gross as a rough take-home for planning—not tax advice).',
        'Rules of thumb are educational; your real taxes, benefits, and spending may differ.',
      ]
    : [
        'Add your annual salary on future quizzes to unlock dollar-level rent, mortgage, and car benchmarks in this report.',
        '50/30/20 rule: allocate after-tax income to roughly 50% Needs, 30% Wants, and 20% Savings/Debt.',
      ];

  const split503020 = moneyContext
    ? {
        takeHomeMonthly: moneyContext.estTakeHomeMonthly,
        needs: moneyContext.split503020.needs,
        wants: moneyContext.split503020.wants,
        savingsDebt: moneyContext.split503020.savingsDebt,
      }
    : null;

  const sections: ReportEducationalSection[] = [
    {
      title: '1. Budgeting & cash flow',
      rules: buildBudgetingRules(moneyContext),
    },
    {
      title: '2. Emergency fund',
      rules: buildEmergencyRules(d, moneyContext),
      yourInsight: emergencyYourInsight(d),
    },
    {
      title: '3. Debt health',
      rules: buildDebtRules(d),
    },
    {
      title: '4. Housing rules',
      rules: buildHousingRules(d, moneyContext),
    },
    {
      title: '5. Car spending',
      rules: buildCarRules(d, moneyContext),
    },
    {
      title: '6. Investing rules',
      rules: [
        'Start early — time in market often matters more than timing.',
        'Retirement targets (rules of thumb): ~1x salary by 30, 3x by 40, 6x by 50, 10x by 60.',
        '401(k) match — capture the full employer match when available.',
        'Simple allocation rule of thumb — e.g. 100 minus age for equity percentage (baseline only, not personalized advice).',
      ],
      yourInsight: investingYourInsight(profile, d),
    },
    {
      title: '7. Insurance coverage',
      rules: [
        'Health insurance — essential coverage for catastrophic costs.',
        'Life insurance with dependents — common rough rule 10–12x annual income (needs-based planning is better).',
        'Disability insurance — protects income; often overlooked.',
      ],
      yourInsight: profile.conversionSignals.needsInsurance
        ? 'Your quiz signals suggest a deeper review of insurance decisions—especially adequacy and gaps.'
        : undefined,
    },
    {
      title: '8. Lifestyle inflation control',
      rules: [
        'When income rises, avoid raising expenses at the same rate—raise savings rate first.',
      ],
    },
    {
      title: '9. Net worth growth',
      rules: [
        'Track assets minus liabilities; aim for positive, growing net worth over time.',
      ],
    },
    {
      title: '10. Subscriptions & leaks',
      rules: [
        'Audit subscriptions every 3–6 months; small recurring charges add up.',
      ],
    },
  ];

  return {
    generatedAt,
    personalizedInsights,
    recommendations,
    profile: {
      averageScore: profile.averageScore,
      overallRiskScore: profile.overallRiskScore,
      riskTrend: profile.riskTrend,
      riskStyleLine: riskStyleLine(profile.overallRiskScore),
      topicRows,
    },
    baselineReference,
    sections,
    literacyReminder: 'Complete the daily challenge on MoneyRank to improve your literacy score and keep your skills current.',
    questionnaire: {
      profileBullets,
      moneyRows,
      moneyContext,
      split503020,
    },
  };
}

export type { QuestionnaireMoneyContext };
