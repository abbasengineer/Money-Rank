import { db } from '../db';
import { riskAssessments, riskAssessmentAnswers, type InsertRiskAssessmentAnswer } from '@shared/schema';
import { storage } from '../storage';
import { calculateRankingScore, getGradeTier } from './scoringService';
import { buildRiskProfileFromBestAttempts, type UserRiskProfile } from './riskProfileService';
import { ASSESSMENT_CATEGORY_ORDER } from '../config/assessmentCategories';
import { isAnnualSalaryInIncomeBracket, type IncomeBracketKey } from '@shared/incomeBracketSalary';
import { eq } from 'drizzle-orm';
import { z } from 'zod';

const demographicsSchema = z
  .object({
    age: z.number().int().min(13).max(120).optional(),
    gender: z.enum(['female', 'male', 'other', 'prefer_not']).optional(),
    incomeBracket: z.enum(['<50k', '50-100k', '100-150k', '150-200k', '200-300k', '300k+']).optional(),
    activeDebt: z
      .enum(['none', 'under_10k', '10k_25k', '25k_50k', '50k_100k', '100k_plus'])
      .optional(),
    housing: z.enum(['own', 'rent', 'other']).optional(),
    housingPaymentMonthly: z.number().finite().nonnegative().optional(),
    city: z.string().max(120).optional(),
    state: z.string().max(60).optional(),
    carOwnership: z.enum(['own', 'lease', 'finance', 'none']).optional(),
    vehiclePaymentMonthly: z.number().finite().nonnegative().optional(),
    emergencyFund: z.enum(['yes', 'partial', 'no']).optional(),
    annualSalaryUsd: z.number().positive().max(50_000_000).optional(),
  })
  .superRefine((data, ctx) => {
    if (data.housing === 'own' || data.housing === 'rent') {
      const v = data.housingPaymentMonthly;
      if (v === undefined || Number.isNaN(v)) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: 'Monthly housing payment is required when you own or rent.',
          path: ['housingPaymentMonthly'],
        });
      }
    }
    if (data.carOwnership === 'lease' || data.carOwnership === 'finance') {
      const v = data.vehiclePaymentMonthly;
      if (v === undefined || Number.isNaN(v)) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: 'Monthly vehicle payment is required for lease or finance.',
          path: ['vehiclePaymentMonthly'],
        });
      }
    }
    if (
      typeof data.annualSalaryUsd === 'number' &&
      data.incomeBracket !== undefined &&
      !isAnnualSalaryInIncomeBracket(data.annualSalaryUsd, data.incomeBracket as IncomeBracketKey)
    ) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'Annual salary must fall within the selected income bracket.',
        path: ['annualSalaryUsd'],
      });
    }
  });

export type AssessmentDemographics = z.infer<typeof demographicsSchema>;

export async function getAssessmentChallenges() {
  const all = await storage.getAllChallengesWithOptions();
  /** Newest dateKey per category (ISO yyyy-MM-dd sorts lexicographically). */
  const bestByCategory = new Map<string, (typeof all)[0]>();
  for (const c of all) {
    const prev = bestByCategory.get(c.category);
    if (!prev || c.dateKey > prev.dateKey) {
      bestByCategory.set(c.category, c);
    }
  }
  return ASSESSMENT_CATEGORY_ORDER.map((cat) => bestByCategory.get(cat)).filter(
    (c): c is NonNullable<typeof c> => c !== undefined,
  );
}

const submitAssessmentBodySchema = z.object({
  demographics: demographicsSchema,
  rankingAnswers: z.array(
    z.object({
      challengeId: z.string(),
      ranking: z.array(z.string()).length(4),
    })
  ),
  sessionId: z.string().optional(),
});

export async function createAssessmentFromSubmission(body: unknown, opts: { sessionId?: string; userId?: string }): Promise<{
  assessmentId: string;
  riskProfile: UserRiskProfile;
}> {
  const parsed = submitAssessmentBodySchema.parse(body);
  const challenges = await getAssessmentChallenges();
  if (challenges.length === 0) {
    throw new Error('No assessment challenges available. Seed the database first.');
  }
  const challengeIds = new Set(challenges.map(c => c.id));
  for (const ans of parsed.rankingAnswers) {
    if (!challengeIds.has(ans.challengeId)) {
      throw new Error(`Invalid challengeId: ${ans.challengeId}`);
    }
  }
  if (parsed.rankingAnswers.length !== challenges.length) {
    throw new Error(`Expected ${challenges.length} ranking answers, got ${parsed.rankingAnswers.length}`);
  }
  const submittedIds = new Set(parsed.rankingAnswers.map((a) => a.challengeId));
  if (submittedIds.size !== challenges.length) {
    throw new Error('Duplicate or missing challenge answers');
  }

  const submittedAt = new Date();
  const answerRows: Omit<InsertRiskAssessmentAnswer, 'id'>[] = [];
  const bestLike: Parameters<typeof buildRiskProfileFromBestAttempts>[0]['bestAttempts'] = [];
  const challengeMap = new Map(challenges.map(c => [c.id, c]));

  for (const ans of parsed.rankingAnswers) {
    const challenge = challengeMap.get(ans.challengeId)!;
    const opts = challenge.options;
    const idealRanking = [...opts].sort((a, b) => a.orderingIndex - b.orderingIndex).map(o => o.id);
    const score = calculateRankingScore(ans.ranking, idealRanking, opts);
    const grade = getGradeTier(score);
    answerRows.push({
      assessmentId: '', // filled after insert
      challengeId: ans.challengeId,
      rankingJson: ans.ranking,
      scoreNumeric: score,
      gradeTier: grade,
    });
    bestLike.push({
      challengeId: ans.challengeId,
      scoreNumeric: score,
      rankingJson: ans.ranking,
      submittedAt,
    });
  }

  const demographicsJson = { ...parsed.demographics };
  const incomeBracket = demographicsJson.incomeBracket ?? null;
  const age = demographicsJson.age ?? null;
  const annualSalaryApprox =
    typeof demographicsJson.annualSalaryUsd === 'number' ? demographicsJson.annualSalaryUsd : null;

  const riskProfile = buildRiskProfileFromBestAttempts({
    userId: 'assessment',
    bestAttempts: bestLike,
    challengeMap,
    demographics: {
      age,
      incomeBracket,
      annualSalaryApprox,
    },
  });

  const [assessment] = await db
    .insert(riskAssessments)
    .values({
      sessionId: opts.sessionId ?? parsed.sessionId ?? null,
      userId: opts.userId ?? null,
      demographicsJson: demographicsJson as Record<string, unknown>,
      riskProfileSnapshot: riskProfile as unknown as Record<string, unknown>,
    })
    .returning();

  const withAssessmentId = answerRows.map(row => ({
    ...row,
    assessmentId: assessment.id,
  }));
  await db.insert(riskAssessmentAnswers).values(withAssessmentId);

  return {
    assessmentId: assessment.id,
    riskProfile: { ...riskProfile, userId: assessment.id },
  };
}

export async function getAssessmentById(id: string) {
  const [row] = await db.select().from(riskAssessments).where(eq(riskAssessments.id, id)).limit(1);
  return row ?? undefined;
}

export async function updateAssessmentEmail(assessmentId: string, email: string) {
  await db
    .update(riskAssessments)
    .set({ email })
    .where(eq(riskAssessments.id, assessmentId));
}

export async function linkAssessmentToUser(assessmentId: string, userId: string) {
  await db
    .update(riskAssessments)
    .set({ userId })
    .where(eq(riskAssessments.id, assessmentId));
}
