import type { AssessmentDemographics } from './assessmentService';
import type { IncomeBracketKey } from '@shared/incomeBracketSalary';
import { incomeBracketSalaryHint } from '@shared/incomeBracketSalary';

/** Rough net pay for rule-of-thumb ratios when only gross is known. */
export const EST_TAKEHOME_FACTOR = 0.75;

export function fmtUsd(n: number, digits = 0): string {
  return n.toLocaleString('en-US', {
    style: 'currency',
    currency: 'USD',
    maximumFractionDigits: digits,
    minimumFractionDigits: digits,
  });
}

export type QuestionnaireMoneyContext = {
  annualSalaryUsd: number;
  grossMonthly: number;
  estTakeHomeMonthly: number;
  incomeBracket?: IncomeBracketKey;
  /** 50/30/20 on estimated after-tax income */
  split503020: { needs: number; wants: number; savingsDebt: number };
  /** Rent + utilities vs gross */
  rent: null | {
    reported: number;
    pctOfGross: number;
    maxRent30PctGross: number;
  };
  /** Mortgage PITI vs gross */
  mortgage: null | {
    reported: number;
    pctOfGross: number;
    maxPiti28PctGross: number;
  };
  /** Car lease/finance payment vs income */
  car: null | {
    mode: 'lease' | 'finance';
    reportedPayment: number;
    pctOfEstTakeHome: number;
    pctOfGrossMonthly: number;
    /** Total car budget (payment+insurance+fuel) — 10% of gross */
    guidelineTotalCar10PctGross: number;
    /** 10–15% of take-home range for all-in car costs */
    guidelineCarAllInLow: number;
    guidelineCarAllInHigh: number;
    /** 50% of annual income — car value cap rule of thumb */
    maxCarValue50PctAnnual: number;
  };
  /** Rough emergency fund targets using ~50% of take-home as “must-pay” proxy */
  emergencyRough: { threeMo: number; sixMo: number };
};

function rentStressWords(pct: number): string {
  if (pct < 25) return 'strong (under 25% of gross)';
  if (pct <= 35) return 'healthy (25–35% of gross)';
  if (pct <= 45) return 'stretched (35–45% of gross)';
  return 'high stress (over 45% of gross)—savings room may be limited';
}

export function buildQuestionnaireMoneyContext(d: AssessmentDemographics): QuestionnaireMoneyContext | null {
  const annual = d.annualSalaryUsd;
  if (typeof annual !== 'number' || !Number.isFinite(annual) || annual <= 0) {
    return null;
  }

  const grossMonthly = annual / 12;
  const estTakeHomeMonthly = grossMonthly * EST_TAKEHOME_FACTOR;
  const split503020 = {
    needs: estTakeHomeMonthly * 0.5,
    wants: estTakeHomeMonthly * 0.3,
    savingsDebt: estTakeHomeMonthly * 0.2,
  };

  const emergencyRough = {
    threeMo: estTakeHomeMonthly * 0.5 * 3,
    sixMo: estTakeHomeMonthly * 0.5 * 6,
  };

  let rent: QuestionnaireMoneyContext['rent'] = null;
  let mortgage: QuestionnaireMoneyContext['mortgage'] = null;
  const pay = d.housingPaymentMonthly;
  if (typeof pay === 'number' && pay >= 0) {
    const pct = (pay / grossMonthly) * 100;
    if (d.housing === 'rent') {
      rent = {
        reported: pay,
        pctOfGross: pct,
        maxRent30PctGross: grossMonthly * 0.3,
      };
    } else if (d.housing === 'own') {
      mortgage = {
        reported: pay,
        pctOfGross: pct,
        maxPiti28PctGross: grossMonthly * 0.28,
      };
    }
  }

  let car: QuestionnaireMoneyContext['car'] = null;
  const vpay = d.vehiclePaymentMonthly;
  if (
    (d.carOwnership === 'lease' || d.carOwnership === 'finance') &&
    typeof vpay === 'number' &&
    vpay >= 0
  ) {
    car = {
      mode: d.carOwnership,
      reportedPayment: vpay,
      pctOfEstTakeHome: estTakeHomeMonthly > 0 ? (vpay / estTakeHomeMonthly) * 100 : 0,
      pctOfGrossMonthly: (vpay / grossMonthly) * 100,
      guidelineTotalCar10PctGross: grossMonthly * 0.1,
      guidelineCarAllInLow: estTakeHomeMonthly * 0.1,
      guidelineCarAllInHigh: estTakeHomeMonthly * 0.15,
      maxCarValue50PctAnnual: annual * 0.5,
    };
  }

  return {
    annualSalaryUsd: annual,
    grossMonthly,
    estTakeHomeMonthly,
    incomeBracket: d.incomeBracket,
    split503020,
    rent,
    mortgage,
    car,
    emergencyRough,
  };
}

export function buildProfileBullets(d: AssessmentDemographics, ctx: QuestionnaireMoneyContext | null): string[] {
  const lines: string[] = [];
  if (d.age != null) lines.push(`Age: ${d.age}`);
  if (d.gender && d.gender !== 'prefer_not') {
    lines.push(`Gender: ${d.gender.replace('_', ' ')}`);
  }
  if (d.incomeBracket) {
    lines.push(`Income bracket: ${incomeBracketSalaryHint(d.incomeBracket as IncomeBracketKey)}`);
  }
  if (d.city || d.state) {
    lines.push(`Location: ${[d.city, d.state].filter(Boolean).join(', ')}`);
  }
  if (d.housing) lines.push(`Housing: ${d.housing}`);
  if (d.carOwnership) lines.push(`Vehicle: ${d.carOwnership}`);
  if (d.emergencyFund) lines.push(`Emergency fund: ${d.emergencyFund}`);
  if (d.activeDebt) lines.push(`Active debt (band): ${d.activeDebt.replace(/_/g, ' ')}`);

  if (ctx) {
    lines.push(
      `Reported annual salary: ${fmtUsd(ctx.annualSalaryUsd)} → ~${fmtUsd(ctx.grossMonthly)}/mo gross (÷12).`
    );
    lines.push(
      `Estimated take-home (~${(EST_TAKEHOME_FACTOR * 100).toFixed(0)}% of gross for planning): ~${fmtUsd(ctx.estTakeHomeMonthly)}/mo.`
    );
  }

  return lines;
}

export function buildMoneyTableRows(d: AssessmentDemographics, ctx: QuestionnaireMoneyContext | null): { label: string; value: string }[] {
  const rows: { label: string; value: string }[] = [];

  if (ctx) {
    rows.push({ label: 'Annual salary (reported)', value: fmtUsd(ctx.annualSalaryUsd) });
    rows.push({ label: 'Monthly gross (÷12)', value: `${fmtUsd(ctx.grossMonthly)}/mo` });
    rows.push({ label: 'Est. monthly take-home', value: `~${fmtUsd(ctx.estTakeHomeMonthly)}/mo` });
    rows.push({
      label: '50/30/20 (on est. take-home)',
      value: `Needs ${fmtUsd(ctx.split503020.needs)} · Wants ${fmtUsd(ctx.split503020.wants)} · Save/debt ${fmtUsd(ctx.split503020.savingsDebt)}`,
    });
  } else if (d.incomeBracket) {
    rows.push({
      label: 'Income bracket',
      value: incomeBracketSalaryHint(d.incomeBracket as IncomeBracketKey),
    });
    rows.push({
      label: 'Note',
      value: 'Add your exact annual salary next time for dollar-level benchmarks in the PDF.',
    });
  }

  if (typeof d.housingPaymentMonthly === 'number') {
    rows.push({
      label: d.housing === 'rent' ? 'Housing payment (rent)' : 'Housing payment (mortgage/other)',
      value: `${fmtUsd(d.housingPaymentMonthly)}/mo`,
    });
  }

  if (d.carOwnership === 'lease' || d.carOwnership === 'finance') {
    if (typeof d.vehiclePaymentMonthly === 'number') {
      rows.push({
        label: d.carOwnership === 'lease' ? 'Vehicle lease payment' : 'Vehicle finance payment',
        value: `${fmtUsd(d.vehiclePaymentMonthly)}/mo`,
      });
    }
  }

  return rows;
}

/** Personalized rule bullets — questionnaire first, then universal reminders. */
export function buildBudgetingRules(ctx: QuestionnaireMoneyContext | null): string[] {
  const rules: string[] = [];
  if (ctx) {
    rules.push(
      `Using ~${fmtUsd(ctx.estTakeHomeMonthly)}/mo estimated after-tax income: 50/30/20 suggests roughly ${fmtUsd(ctx.split503020.needs)} for needs, ${fmtUsd(ctx.split503020.wants)} for wants, and ${fmtUsd(ctx.split503020.savingsDebt)} for savings and extra debt paydown (starting framework only).`
    );
  }
  rules.push('Zero-based budgeting — give every dollar a job (income minus planned expenses = 0 on paper).');
  rules.push('Pay yourself first — automate savings and investing before discretionary spending.');
  rules.push('Savings rate — aim for 20%+ of after-tax income; strong savers often save 25–40%.');
  return rules;
}

export function buildEmergencyRules(d: AssessmentDemographics, ctx: QuestionnaireMoneyContext | null): string[] {
  const rules: string[] = [
    'Target 3–6 months of must-pay expenses in cash or cash-equivalents.',
    'Stretch to 6–12 months if income is unstable, you have dependents, or you are a single-income household.',
  ];
  if (ctx) {
    rules.unshift(
      `Rough emergency fund range using a simple proxy (~50% of est. take-home as “essential” spending): ~${fmtUsd(ctx.emergencyRough.threeMo)}–${fmtUsd(ctx.emergencyRough.sixMo)} (3–6 months—not a full budget substitute).`
    );
  }
  if (d.emergencyFund === 'yes') {
    rules.push('You indicated you already keep an emergency fund—verify it covers the range above for your situation.');
  } else if (d.emergencyFund === 'partial') {
    rules.push('You indicated a partial fund—prioritize topping up toward the 3–6 month band.');
  } else if (d.emergencyFund === 'no') {
    rules.push('You indicated no dedicated fund—start with a small starter goal (e.g. $1k) then build.');
  }
  return rules;
}

export function buildDebtRules(d: AssessmentDemographics): string[] {
  const rules = [
    'Debt-to-income — often ideal under ~36% total monthly debt payments; mortgages may allow up to ~43%.',
    'High-interest debt — many prioritize balances over ~7–8% APR first.',
    'Credit utilization — under 30%; under 10% is ideal for scoring.',
  ];
  if (d.activeDebt && d.activeDebt !== 'none') {
    rules.unshift(`You reported debt in the “${d.activeDebt.replace(/_/g, ' ')}” band—use your real minimum payments + housing + car in a true DTI calculation.`);
  } else {
    rules.unshift('You reported no active debt—keep revolving balances low if you use credit cards.');
  }
  return rules;
}

export function buildHousingRules(d: AssessmentDemographics, ctx: QuestionnaireMoneyContext | null): string[] {
  const rules: string[] = [
    'Rent stress vs. gross: under 25% strong; 25–35% healthy; 35–45% stretched; 45%+ high risk to savings.',
    'Mortgage — ~28% of gross for PITI; total debt payments often ~36–43% of gross (28/36 style).',
  ];

  if (ctx?.rent && d.housing === 'rent') {
    const { reported, pctOfGross, maxRent30PctGross } = ctx.rent;
    rules.unshift(
      `Your rent + utilities (${fmtUsd(reported)}/mo) are ~${pctOfGross.toFixed(1)}% of gross monthly (${fmtUsd(ctx.grossMonthly)}). A common ceiling is ~30% of gross → ~${fmtUsd(maxRent30PctGross)}/mo. Stress: ${rentStressWords(pctOfGross)}.`
    );
  } else if (ctx?.mortgage && d.housing === 'own') {
    const { reported, pctOfGross, maxPiti28PctGross } = ctx.mortgage;
    rules.unshift(
      `Your housing payment (${fmtUsd(reported)}/mo) is ~${pctOfGross.toFixed(1)}% of gross (${fmtUsd(ctx.grossMonthly)}/mo). A common PITI guideline is ~28% of gross → ~${fmtUsd(maxPiti28PctGross)}/mo; total debt often capped around ~36–43% of gross.`
    );
  } else if (ctx) {
    rules.unshift(
      `Benchmarks from your income: gross ~${fmtUsd(ctx.grossMonthly)}/mo → ~30% rent guideline ~${fmtUsd(ctx.grossMonthly * 0.3)}/mo; ~28% mortgage PITI guideline ~${fmtUsd(ctx.grossMonthly * 0.28)}/mo.`
    );
  }

  return rules;
}

export function buildCarRules(d: AssessmentDemographics, ctx: QuestionnaireMoneyContext | null): string[] {
  const rules: string[] = [
    '20/4/10 — 20% down, 4-year loan, total car costs (payment + insurance + fuel) often cited around 10% of gross income.',
    'Car value — total vehicle value often recommended under ~50% of annual income to limit depreciation risk.',
  ];

  if (ctx?.car && (d.carOwnership === 'lease' || d.carOwnership === 'finance')) {
    const c = ctx.car;
    rules.unshift(
      `All-in car budget (payment + insurance + fuel): commonly ~10–15% of estimated take-home → ~${fmtUsd(c.guidelineCarAllInLow)}–${fmtUsd(c.guidelineCarAllInHigh)}/mo; 20/4/10 often uses ~10% of gross (~${fmtUsd(c.guidelineTotalCar10PctGross)}/mo) for total car costs—not payment alone.`
    );
    rules.unshift(
      `Your reported ${c.mode} payment alone: ${fmtUsd(c.reportedPayment)}/mo ≈ ${c.pctOfEstTakeHome.toFixed(1)}% of est. take-home and ${c.pctOfGrossMonthly.toFixed(1)}% of gross monthly—compare to the ranges above (remember insurance and fuel).`
    );
    rules.unshift(
      `Car value rule of thumb: vehicle value often under ~${fmtUsd(c.maxCarValue50PctAnnual)} (50% of your reported annual income).`
    );
  } else if (ctx) {
    rules.unshift(
      `At your income, ~10% of gross monthly (~${fmtUsd(ctx.grossMonthly * 0.1)}/mo) is a common starting point for total car costs; 10–15% of est. take-home → ~${fmtUsd(ctx.grossMonthly * EST_TAKEHOME_FACTOR * 0.1)}–${fmtUsd(ctx.grossMonthly * EST_TAKEHOME_FACTOR * 0.15)}/mo.`
    );
    if (d.carOwnership === 'own') {
      rules.unshift('You indicated you own your vehicle outright—focus on maintenance savings and insurance, not payment benchmarks.');
    } else if (d.carOwnership === 'none') {
      rules.unshift('You indicated no vehicle—use the benchmarks when you shop for a car or lease.');
    }
  }

  return rules;
}
