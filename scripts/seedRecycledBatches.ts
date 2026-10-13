/**
 * Seeds recycled daily challenges by copying content from existing seedChallenges entries.
 *
 * Ranges:
 *   - 2026-05-08 through 2026-07-16 (70 days, batches 1–7)
 *   - 2026-07-17 through 2026-08-31 (46 days, batch 8)
 *   - 2026-09-01 through 2026-10-31 (61 days, batch 9)
 *   - 2026-11-01 through 2026-12-31 (61 days, batch 10)
 *
 * Usage: npx tsx scripts/seedRecycledBatches.ts
 * Set DATABASE_URL (or SUPABASE_DATABASE_URL) in .env before running.
 */
import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

try {
  const envFileName = process.env.SEED_ENV_FILE ?? '.env';
  const envPath = join(__dirname, '..', envFileName);
  const envFile = readFileSync(envPath, 'utf-8');
  envFile.split('\n').forEach((line) => {
    const trimmed = line.trim();
    if (trimmed && !trimmed.startsWith('#')) {
      const [key, ...valueParts] = trimmed.split('=');
      if (key && valueParts.length > 0) {
        const value = valueParts.join('=').trim().replace(/^["']|["']$/g, '');
        process.env[key.trim()] = value;
      }
    }
  });
  console.log(`✅ Loaded ${envFileName}`);
} catch {
  console.warn('⚠️  Could not load .env file, using environment variables');
}

type ChallengeSeed = {
  dateKey: string;
  title: string;
  scenarioText: string;
  assumptions: string;
  category: string;
  difficulty: number;
  isPublished: boolean;
  options: Array<{
    optionText: string;
    tierLabel: string;
    explanationShort: string;
    orderingIndex: number;
  }>;
};

/** newDateKey -> source dateKey (fixed) or source title (for rolling-date entries) */
const RECYCLED_MAPPINGS: Array<{ newDateKey: string; sourceDateKey?: string; sourceTitle?: string }> = [
  // Batch 1: 2026-05-08 – 2026-05-17
  { newDateKey: '2026-05-08', sourceDateKey: '2026-02-13' },
  { newDateKey: '2026-05-09', sourceDateKey: '2026-02-15' },
  { newDateKey: '2026-05-10', sourceDateKey: '2026-02-17' },
  { newDateKey: '2026-05-11', sourceDateKey: '2026-02-19' },
  { newDateKey: '2026-05-12', sourceDateKey: '2026-02-18' },
  { newDateKey: '2026-05-13', sourceDateKey: '2026-02-25' },
  { newDateKey: '2026-05-14', sourceDateKey: '2026-02-23' },
  { newDateKey: '2026-05-15', sourceDateKey: '2026-02-27' },
  { newDateKey: '2026-05-16', sourceDateKey: '2026-02-02' },
  { newDateKey: '2026-05-17', sourceTitle: 'Subscription Audit' },
  // Batch 2: 2026-05-18 – 2026-05-27
  { newDateKey: '2026-05-18', sourceDateKey: '2026-02-14' },
  { newDateKey: '2026-05-19', sourceDateKey: '2026-02-16' },
  { newDateKey: '2026-05-20', sourceDateKey: '2026-02-20' },
  { newDateKey: '2026-05-21', sourceDateKey: '2026-02-24' },
  { newDateKey: '2026-05-22', sourceDateKey: '2026-02-28' },
  { newDateKey: '2026-05-23', sourceDateKey: '2026-03-02' },
  { newDateKey: '2026-05-24', sourceDateKey: '2026-03-03' },
  { newDateKey: '2026-05-25', sourceDateKey: '2026-03-04' },
  { newDateKey: '2026-05-26', sourceDateKey: '2026-03-10' },
  { newDateKey: '2026-05-27', sourceDateKey: '2026-03-12' },
  // Batch 3: 2026-05-28 – 2026-06-06
  { newDateKey: '2026-05-28', sourceDateKey: '2026-03-06' },
  { newDateKey: '2026-05-29', sourceDateKey: '2026-03-05' },
  { newDateKey: '2026-05-30', sourceDateKey: '2026-03-13' },
  { newDateKey: '2026-05-31', sourceDateKey: '2026-03-09' },
  { newDateKey: '2026-06-01', sourceDateKey: '2026-03-01' },
  { newDateKey: '2026-06-02', sourceDateKey: '2026-03-08' },
  { newDateKey: '2026-06-03', sourceDateKey: '2026-03-07' },
  { newDateKey: '2026-06-04', sourceDateKey: '2026-03-16' },
  { newDateKey: '2026-06-05', sourceDateKey: '2026-03-14' },
  { newDateKey: '2026-06-06', sourceDateKey: '2026-03-17' },
  // Batch 4: 2026-06-07 – 2026-06-16
  { newDateKey: '2026-06-07', sourceDateKey: '2026-02-12' },
  { newDateKey: '2026-06-08', sourceDateKey: '2026-02-21' },
  { newDateKey: '2026-06-09', sourceDateKey: '2026-02-26' },
  { newDateKey: '2026-06-10', sourceDateKey: '2026-03-11' },
  { newDateKey: '2026-06-11', sourceDateKey: '2026-03-15' },
  { newDateKey: '2026-06-12', sourceDateKey: '2026-02-22' },
  { newDateKey: '2026-06-13', sourceDateKey: '2026-02-01' },
  { newDateKey: '2026-06-14', sourceDateKey: '2026-02-03' },
  { newDateKey: '2026-06-15', sourceDateKey: '2026-02-08' },
  { newDateKey: '2026-06-16', sourceDateKey: '2026-02-09' },
  // Batch 5: 2026-06-17 – 2026-06-26
  { newDateKey: '2026-06-17', sourceDateKey: '2026-02-06' },
  { newDateKey: '2026-06-18', sourceDateKey: '2026-02-04' },
  { newDateKey: '2026-06-19', sourceDateKey: '2026-02-11' },
  { newDateKey: '2026-06-20', sourceDateKey: '2026-02-10' },
  { newDateKey: '2026-06-21', sourceDateKey: '2026-02-07' },
  { newDateKey: '2026-06-22', sourceTitle: 'Emergency Fund Priority' },
  { newDateKey: '2026-06-23', sourceTitle: 'Credit Card Rewards Optimization' },
  { newDateKey: '2026-06-24', sourceTitle: 'Medical Bill Negotiation' },
  { newDateKey: '2026-06-25', sourceDateKey: '2026-01-09' },
  { newDateKey: '2026-06-26', sourceDateKey: '2026-01-11' },
  // Batch 6: 2026-06-27 – 2026-07-06
  { newDateKey: '2026-06-27', sourceTitle: 'Windfall: $10,000 Bonus' },
  { newDateKey: '2026-06-28', sourceTitle: 'Car Purchase Decision' },
  { newDateKey: '2026-06-29', sourceDateKey: '2026-01-02' },
  { newDateKey: '2026-06-30', sourceTitle: 'Insurance Coverage Decision' },
  { newDateKey: '2026-07-01', sourceTitle: 'Home Repair Emergency' },
  { newDateKey: '2026-07-02', sourceTitle: 'College Savings for Kids' },
  { newDateKey: '2026-07-03', sourceTitle: 'Side Hustle Investment' },
  { newDateKey: '2026-07-04', sourceDateKey: '2026-01-16' },
  { newDateKey: '2026-07-05', sourceDateKey: '2026-01-13' },
  { newDateKey: '2026-07-06', sourceDateKey: '2026-01-12' },
  // Batch 7: 2026-07-07 – 2026-07-16
  { newDateKey: '2026-07-07', sourceTitle: 'Tax Refund Allocation' },
  { newDateKey: '2026-07-08', sourceTitle: 'Employer 401k Match' },
  { newDateKey: '2026-07-09', sourceTitle: 'Student Loan Payoff Strategy' },
  { newDateKey: '2026-07-10', sourceDateKey: '2026-01-04' },
  { newDateKey: '2026-07-11', sourceDateKey: '2026-01-19' },
  { newDateKey: '2026-07-12', sourceDateKey: '2026-01-22' },
  { newDateKey: '2026-07-13', sourceDateKey: '2026-01-24' },
  { newDateKey: '2026-07-14', sourceDateKey: '2026-01-23' },
  { newDateKey: '2026-07-15', sourceDateKey: '2026-01-25' },
  { newDateKey: '2026-07-16', sourceDateKey: '2026-01-26' },
  // Batch 8: 2026-07-17 – 2026-08-31 (unused Mar–May + Jan sources)
  { newDateKey: '2026-07-17', sourceDateKey: '2026-03-18' },
  { newDateKey: '2026-07-18', sourceDateKey: '2026-03-19' },
  { newDateKey: '2026-07-19', sourceDateKey: '2026-03-20' },
  { newDateKey: '2026-07-20', sourceDateKey: '2026-03-21' },
  { newDateKey: '2026-07-21', sourceDateKey: '2026-03-22' },
  { newDateKey: '2026-07-22', sourceDateKey: '2026-03-23' },
  { newDateKey: '2026-07-23', sourceDateKey: '2026-03-24' },
  { newDateKey: '2026-07-24', sourceDateKey: '2026-03-25' },
  { newDateKey: '2026-07-25', sourceDateKey: '2026-03-26' },
  { newDateKey: '2026-07-26', sourceDateKey: '2026-03-27' },
  { newDateKey: '2026-07-27', sourceDateKey: '2026-03-28' },
  { newDateKey: '2026-07-28', sourceDateKey: '2026-03-29' },
  { newDateKey: '2026-07-29', sourceDateKey: '2026-03-30' },
  { newDateKey: '2026-07-30', sourceDateKey: '2026-03-31' },
  { newDateKey: '2026-07-31', sourceDateKey: '2026-04-01' },
  { newDateKey: '2026-08-01', sourceDateKey: '2026-04-02' },
  { newDateKey: '2026-08-02', sourceDateKey: '2026-04-03' },
  { newDateKey: '2026-08-03', sourceDateKey: '2026-04-04' },
  { newDateKey: '2026-08-04', sourceDateKey: '2026-04-05' },
  { newDateKey: '2026-08-05', sourceDateKey: '2026-04-06' },
  { newDateKey: '2026-08-06', sourceDateKey: '2026-04-07' },
  { newDateKey: '2026-08-07', sourceDateKey: '2026-04-08' },
  { newDateKey: '2026-08-08', sourceDateKey: '2026-04-09' },
  { newDateKey: '2026-08-09', sourceDateKey: '2026-04-10' },
  { newDateKey: '2026-08-10', sourceDateKey: '2026-04-11' },
  { newDateKey: '2026-08-11', sourceDateKey: '2026-04-12' },
  { newDateKey: '2026-08-12', sourceDateKey: '2026-04-13' },
  { newDateKey: '2026-08-13', sourceDateKey: '2026-04-14' },
  { newDateKey: '2026-08-14', sourceDateKey: '2026-04-16' },
  { newDateKey: '2026-08-15', sourceDateKey: '2026-04-20' },
  { newDateKey: '2026-08-16', sourceDateKey: '2026-04-24' },
  { newDateKey: '2026-08-17', sourceDateKey: '2026-04-26' },
  { newDateKey: '2026-08-18', sourceDateKey: '2026-01-01' },
  { newDateKey: '2026-08-19', sourceDateKey: '2026-01-03' },
  { newDateKey: '2026-08-20', sourceDateKey: '2026-01-05' },
  { newDateKey: '2026-08-21', sourceDateKey: '2026-01-06' },
  { newDateKey: '2026-08-22', sourceDateKey: '2026-01-07' },
  { newDateKey: '2026-08-23', sourceDateKey: '2026-01-08' },
  { newDateKey: '2026-08-24', sourceDateKey: '2026-01-14' },
  { newDateKey: '2026-08-25', sourceDateKey: '2026-01-15' },
  { newDateKey: '2026-08-26', sourceDateKey: '2026-01-18' },
  { newDateKey: '2026-08-27', sourceDateKey: '2026-01-20' },
  { newDateKey: '2026-08-28', sourceDateKey: '2026-01-21' },
  { newDateKey: '2026-08-29', sourceDateKey: '2026-05-03' },
  { newDateKey: '2026-08-30', sourceDateKey: '2026-05-04' },
  { newDateKey: '2026-08-31', sourceDateKey: '2026-05-05' },
  // Batch 9: 2026-09-01 – 2026-10-31 (unused Jan/May + rolling + assessment + second-cycle Feb/Mar)
  { newDateKey: '2026-09-01', sourceDateKey: '2026-01-10' },
  { newDateKey: '2026-09-02', sourceDateKey: '2026-01-17' },
  { newDateKey: '2026-09-03', sourceDateKey: '2026-01-27' },
  { newDateKey: '2026-09-04', sourceDateKey: '2026-01-28' },
  { newDateKey: '2026-09-05', sourceDateKey: '2026-01-29' },
  { newDateKey: '2026-09-06', sourceDateKey: '2026-01-30' },
  { newDateKey: '2026-09-07', sourceDateKey: '2026-01-31' },
  { newDateKey: '2026-09-08', sourceDateKey: '2026-02-05' },
  { newDateKey: '2026-09-09', sourceDateKey: '2026-04-15' },
  { newDateKey: '2026-09-10', sourceDateKey: '2026-04-17' },
  { newDateKey: '2026-09-11', sourceDateKey: '2026-04-18' },
  { newDateKey: '2026-09-12', sourceDateKey: '2026-04-19' },
  { newDateKey: '2026-09-13', sourceDateKey: '2026-04-21' },
  { newDateKey: '2026-09-14', sourceDateKey: '2026-04-22' },
  { newDateKey: '2026-09-15', sourceDateKey: '2026-04-23' },
  { newDateKey: '2026-09-16', sourceDateKey: '2026-04-25' },
  { newDateKey: '2026-09-17', sourceDateKey: '2026-04-27' },
  { newDateKey: '2026-09-18', sourceDateKey: '2026-04-28' },
  { newDateKey: '2026-09-19', sourceDateKey: '2026-04-29' },
  { newDateKey: '2026-09-20', sourceDateKey: '2026-04-30' },
  { newDateKey: '2026-09-21', sourceDateKey: '2026-05-01' },
  { newDateKey: '2026-09-22', sourceDateKey: '2026-05-02' },
  { newDateKey: '2026-09-23', sourceDateKey: '2026-05-06' },
  { newDateKey: '2026-09-24', sourceDateKey: '2026-05-07' },
  { newDateKey: '2026-09-25', sourceTitle: 'Rent vs Buy Decision' },
  { newDateKey: '2026-09-26', sourceTitle: 'Mortgage Refinance Decision' },
  { newDateKey: '2026-09-27', sourceDateKey: '2032-06-01' },
  { newDateKey: '2026-09-28', sourceDateKey: '2032-06-02' },
  { newDateKey: '2026-09-29', sourceDateKey: '2032-06-03' },
  { newDateKey: '2026-09-30', sourceDateKey: '2032-06-04' },
  { newDateKey: '2026-10-01', sourceDateKey: '2032-06-05' },
  { newDateKey: '2026-10-02', sourceDateKey: '2032-06-06' },
  { newDateKey: '2026-10-03', sourceDateKey: '2032-06-07' },
  { newDateKey: '2026-10-04', sourceDateKey: '2032-06-08' },
  { newDateKey: '2026-10-05', sourceDateKey: '2032-06-09' },
  { newDateKey: '2026-10-06', sourceDateKey: '2032-06-10' },
  { newDateKey: '2026-10-07', sourceDateKey: '2026-02-13' },
  { newDateKey: '2026-10-08', sourceDateKey: '2026-02-15' },
  { newDateKey: '2026-10-09', sourceDateKey: '2026-02-17' },
  { newDateKey: '2026-10-10', sourceDateKey: '2026-02-19' },
  { newDateKey: '2026-10-11', sourceDateKey: '2026-02-18' },
  { newDateKey: '2026-10-12', sourceDateKey: '2026-02-25' },
  { newDateKey: '2026-10-13', sourceDateKey: '2026-02-23' },
  { newDateKey: '2026-10-14', sourceDateKey: '2026-02-27' },
  { newDateKey: '2026-10-15', sourceDateKey: '2026-02-02' },
  { newDateKey: '2026-10-16', sourceDateKey: '2026-02-14' },
  { newDateKey: '2026-10-17', sourceDateKey: '2026-02-16' },
  { newDateKey: '2026-10-18', sourceDateKey: '2026-02-20' },
  { newDateKey: '2026-10-19', sourceDateKey: '2026-02-24' },
  { newDateKey: '2026-10-20', sourceDateKey: '2026-02-28' },
  { newDateKey: '2026-10-21', sourceDateKey: '2026-03-02' },
  { newDateKey: '2026-10-22', sourceDateKey: '2026-03-03' },
  { newDateKey: '2026-10-23', sourceDateKey: '2026-03-04' },
  { newDateKey: '2026-10-24', sourceDateKey: '2026-03-10' },
  { newDateKey: '2026-10-25', sourceDateKey: '2026-03-12' },
  { newDateKey: '2026-10-26', sourceDateKey: '2026-03-06' },
  { newDateKey: '2026-10-27', sourceDateKey: '2026-03-05' },
  { newDateKey: '2026-10-28', sourceDateKey: '2026-03-13' },
  { newDateKey: '2026-10-29', sourceDateKey: '2026-03-09' },
  { newDateKey: '2026-10-30', sourceDateKey: '2026-03-01' },
  { newDateKey: '2026-10-31', sourceDateKey: '2026-03-08' },
  // Batch 10: 2026-11-01 – 2026-12-31 (third-cycle: batch 1–7 sources)
  { newDateKey: '2026-11-01', sourceDateKey: '2026-02-13' },
  { newDateKey: '2026-11-02', sourceDateKey: '2026-02-15' },
  { newDateKey: '2026-11-03', sourceDateKey: '2026-02-17' },
  { newDateKey: '2026-11-04', sourceDateKey: '2026-02-19' },
  { newDateKey: '2026-11-05', sourceDateKey: '2026-02-18' },
  { newDateKey: '2026-11-06', sourceDateKey: '2026-02-25' },
  { newDateKey: '2026-11-07', sourceDateKey: '2026-02-23' },
  { newDateKey: '2026-11-08', sourceDateKey: '2026-02-27' },
  { newDateKey: '2026-11-09', sourceDateKey: '2026-02-02' },
  { newDateKey: '2026-11-10', sourceTitle: 'Subscription Audit' },
  { newDateKey: '2026-11-11', sourceDateKey: '2026-02-14' },
  { newDateKey: '2026-11-12', sourceDateKey: '2026-02-16' },
  { newDateKey: '2026-11-13', sourceDateKey: '2026-02-20' },
  { newDateKey: '2026-11-14', sourceDateKey: '2026-02-24' },
  { newDateKey: '2026-11-15', sourceDateKey: '2026-02-28' },
  { newDateKey: '2026-11-16', sourceDateKey: '2026-03-02' },
  { newDateKey: '2026-11-17', sourceDateKey: '2026-03-03' },
  { newDateKey: '2026-11-18', sourceDateKey: '2026-03-04' },
  { newDateKey: '2026-11-19', sourceDateKey: '2026-03-10' },
  { newDateKey: '2026-11-20', sourceDateKey: '2026-03-12' },
  { newDateKey: '2026-11-21', sourceDateKey: '2026-03-06' },
  { newDateKey: '2026-11-22', sourceDateKey: '2026-03-05' },
  { newDateKey: '2026-11-23', sourceDateKey: '2026-03-13' },
  { newDateKey: '2026-11-24', sourceDateKey: '2026-03-09' },
  { newDateKey: '2026-11-25', sourceDateKey: '2026-03-01' },
  { newDateKey: '2026-11-26', sourceDateKey: '2026-03-08' },
  { newDateKey: '2026-11-27', sourceDateKey: '2026-03-07' },
  { newDateKey: '2026-11-28', sourceDateKey: '2026-03-16' },
  { newDateKey: '2026-11-29', sourceDateKey: '2026-03-14' },
  { newDateKey: '2026-11-30', sourceDateKey: '2026-03-17' },
  { newDateKey: '2026-12-01', sourceDateKey: '2026-02-12' },
  { newDateKey: '2026-12-02', sourceDateKey: '2026-02-21' },
  { newDateKey: '2026-12-03', sourceDateKey: '2026-02-26' },
  { newDateKey: '2026-12-04', sourceDateKey: '2026-03-11' },
  { newDateKey: '2026-12-05', sourceDateKey: '2026-03-15' },
  { newDateKey: '2026-12-06', sourceDateKey: '2026-02-22' },
  { newDateKey: '2026-12-07', sourceDateKey: '2026-02-01' },
  { newDateKey: '2026-12-08', sourceDateKey: '2026-02-03' },
  { newDateKey: '2026-12-09', sourceDateKey: '2026-02-08' },
  { newDateKey: '2026-12-10', sourceDateKey: '2026-02-09' },
  { newDateKey: '2026-12-11', sourceDateKey: '2026-02-06' },
  { newDateKey: '2026-12-12', sourceDateKey: '2026-02-04' },
  { newDateKey: '2026-12-13', sourceDateKey: '2026-02-11' },
  { newDateKey: '2026-12-14', sourceDateKey: '2026-02-10' },
  { newDateKey: '2026-12-15', sourceDateKey: '2026-02-07' },
  { newDateKey: '2026-12-16', sourceTitle: 'Emergency Fund Priority' },
  { newDateKey: '2026-12-17', sourceTitle: 'Credit Card Rewards Optimization' },
  { newDateKey: '2026-12-18', sourceTitle: 'Medical Bill Negotiation' },
  { newDateKey: '2026-12-19', sourceDateKey: '2026-01-09' },
  { newDateKey: '2026-12-20', sourceDateKey: '2026-01-11' },
  { newDateKey: '2026-12-21', sourceTitle: 'Windfall: $10,000 Bonus' },
  { newDateKey: '2026-12-22', sourceTitle: 'Car Purchase Decision' },
  { newDateKey: '2026-12-23', sourceDateKey: '2026-01-02' },
  { newDateKey: '2026-12-24', sourceTitle: 'Insurance Coverage Decision' },
  { newDateKey: '2026-12-25', sourceTitle: 'Home Repair Emergency' },
  { newDateKey: '2026-12-26', sourceTitle: 'College Savings for Kids' },
  { newDateKey: '2026-12-27', sourceTitle: 'Side Hustle Investment' },
  { newDateKey: '2026-12-28', sourceDateKey: '2026-01-16' },
  { newDateKey: '2026-12-29', sourceDateKey: '2026-01-13' },
  { newDateKey: '2026-12-30', sourceDateKey: '2026-01-12' },
  { newDateKey: '2026-12-31', sourceTitle: 'Tax Refund Allocation' },
];

function findSource(
  challenges: ChallengeSeed[],
  mapping: { sourceDateKey?: string; sourceTitle?: string }
): ChallengeSeed | undefined {
  if (mapping.sourceDateKey) {
    const byDate = challenges.find((c) => c.dateKey === mapping.sourceDateKey);
    if (byDate) return byDate;
  }
  if (mapping.sourceTitle) {
    return challenges.find((c) => c.title === mapping.sourceTitle);
  }
  return undefined;
}

function patchChallengeFor2026(source: ChallengeSeed, newDateKey: string): ChallengeSeed {
  const cloned = structuredClone(source);
  cloned.dateKey = newDateKey;

  // Roth IRA vs Taxable: update limit to 2026
  if (source.title === 'Roth IRA vs Taxable Brokerage') {
    cloned.assumptions = cloned.assumptions.replace(/\$6,500/g, '$7,500');
    cloned.options = cloned.options.map((opt) => ({
      ...opt,
      optionText: opt.optionText.replace(/\$6,500/g, '$7,500').replace(/\$3,500/g, '$3,750'),
      explanationShort: opt.explanationShort.replace(/\$6,500/g, '$7,500'),
    }));
  }

  return cloned;
}

async function main() {
  const { seedChallenges } = await import('../server/seed.js');
  const { ASSESSMENT_SCENARIO_CHALLENGES } = await import('../server/assessmentChallengesSeed.js');
  const allSourceChallenges = [...(seedChallenges as ChallengeSeed[]), ...(ASSESSMENT_SCENARIO_CHALLENGES as ChallengeSeed[])];
  const { storage } = await import('../server/storage.js');
  const { db } = await import('../server/db.js');
  const { dailyChallenges } = await import('@shared/schema');
  const { eq } = await import('drizzle-orm');

  const dbUrl = process.env.SUPABASE_DATABASE_URL || process.env.DATABASE_URL;
  if (!dbUrl) {
    console.error('❌ DATABASE_URL or SUPABASE_DATABASE_URL is required');
    process.exit(1);
  }
  console.log(`📡 Target database: ${dbUrl.replace(/:[^:@]+@/, ':***@')}`);

  let created = 0;
  let skipped = 0;
  let failed = 0;

  for (const mapping of RECYCLED_MAPPINGS) {
    const { newDateKey } = mapping;

    try {
      const [existing] = await db
        .select()
        .from(dailyChallenges)
        .where(eq(dailyChallenges.dateKey, newDateKey))
        .limit(1);

      if (existing) {
        console.log(`⏭️  ${newDateKey} already exists, skipping`);
        skipped++;
        continue;
      }

      const source = findSource(allSourceChallenges, mapping);
      if (!source) {
        console.error(
          `❌ ${newDateKey}: source not found (${mapping.sourceDateKey ?? mapping.sourceTitle})`
        );
        failed++;
        continue;
      }

      const { options, ...fields } = patchChallengeFor2026(source, newDateKey);

      await storage.createChallenge(
        {
          dateKey: fields.dateKey,
          title: fields.title,
          scenarioText: fields.scenarioText,
          assumptions: fields.assumptions,
          category: fields.category,
          difficulty: fields.difficulty,
          isPublished: fields.isPublished,
          source: 'manual',
        },
        options
      );

      console.log(`✅ ${newDateKey}: ${fields.title}`);
      created++;
    } catch (error) {
      console.error(`❌ ${newDateKey}:`, error);
      failed++;
    }
  }

  console.log(`\n🎉 Done: ${created} created, ${skipped} skipped, ${failed} failed`);
  process.exit(failed > 0 ? 1 : 0);
}

main().catch((err) => {
  console.error('❌ Seed recycled batches failed:', err);
  process.exit(1);
});
