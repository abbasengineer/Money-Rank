// Load environment variables from .env file BEFORE importing db
import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import { format, subDays } from 'date-fns';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Simple .env parser - must run before any db imports
try {
  const envPath = join(__dirname, '..', '.env');
  const envFile = readFileSync(envPath, 'utf-8');
  envFile.split('\n').forEach(line => {
    const trimmed = line.trim();
    if (trimmed && !trimmed.startsWith('#')) {
      const [key, ...valueParts] = trimmed.split('=');
      if (key && valueParts.length > 0) {
        const value = valueParts.join('=').trim().replace(/^["']|["']$/g, '');
        process.env[key.trim()] = value;
      }
    }
  });
  console.log('✅ Loaded .env file');
} catch (error) {
  console.warn('⚠️  Could not load .env file, using environment variables');
}

// Now dynamically import modules that depend on db
const { db } = await import('./db.js');
const { dailyChallenges, challengeOptions } = await import('@shared/schema');
const { eq } = await import('drizzle-orm');

const seedChallenges = [
  {
    dateKey: format(new Date(), 'yyyy-MM-dd'),
    title: 'Windfall: $10,000 Bonus',
    scenarioText: 'You just received a $10,000 unexpected bonus at work. You have some financial goals in progress.',
    assumptions: 'You earn $60k/year, age 30. Monthly expenses are $3,500. You have $2k in credit card debt at 22% APR. You have a 1-month emergency fund ($3,500). You are matching your employer 401k (6%). No other debts. You want to buy a house in 3 years.',
    category: 'Windfall',
    difficulty: 1,
    isPublished: true,
    options: [
      { optionText: 'Pay off the $2k credit card debt (22% APR) completely', tierLabel: 'Optimal', explanationShort: 'Guaranteed 22% return on investment. Always kill high-interest debt first.', orderingIndex: 1 },
      { optionText: 'Boost emergency fund to 2 months ($5,000)', tierLabel: 'Optimal', explanationShort: 'Getting to 3-6 months of expenses is crucial for stability before aggressive investing.', orderingIndex: 2 },
      { optionText: 'Put $3,000 into a High Yield Savings Account for the house', tierLabel: 'Reasonable', explanationShort: 'Saving for the house is good, but high-interest debt and safety net take priority.', orderingIndex: 3 },
      { optionText: 'Invest all $10,000 in tech stock ETF (while 22% debt remains)', tierLabel: 'Risky', explanationShort: 'Market returns (~10%) usually won\'t beat the 22% debt interest, and you lack a safety net.', orderingIndex: 4 },
    ],
  },
  {
    dateKey: format(subDays(new Date(), 1), 'yyyy-MM-dd'),
    title: 'Subscription Audit',
    scenarioText: 'You are trying to cut $100/mo from your budget. Which cut makes the most sense?',
    assumptions: 'You earn $50k/year. Total monthly expenses are $3,200. You use the gym 2x/week ($50/mo). You watch Netflix daily ($20/mo). You haven\'t used Audible in 3 months ($15/mo). You order takeout 4x/week (~$80/mo). You\'re trying to save for a vacation.',
    category: 'Budgeting',
    difficulty: 1,
    isPublished: true,
    options: [
      { optionText: 'Cancel Audible ($15/mo) and reduce takeout (save ~$80/mo)', tierLabel: 'Optimal', explanationShort: 'Cut what you don\'t use and reduce high-cost conveniences.', orderingIndex: 1 },
      { optionText: 'Switch to cheaper phone plan (save $30/mo) + cancel Audible', tierLabel: 'Optimal', explanationShort: 'Reducing fixed costs without lifestyle impact is the gold standard.', orderingIndex: 2 },
      { optionText: 'Cancel Netflix ($20/mo) - you watch it daily', tierLabel: 'Reasonable', explanationShort: 'A luxury, but if you use it daily, the cost-per-hour is low.', orderingIndex: 3 },
      { optionText: 'Cancel Gym Membership ($50/mo) - you use it 2x/week', tierLabel: 'Risky', explanationShort: 'Health is wealth. If you use it 2x/week, it\'s high value.', orderingIndex: 4 },
    ],
  },
  {
    dateKey: format(subDays(new Date(), 2), 'yyyy-MM-dd'),
    title: 'Emergency Fund Priority',
    scenarioText: 'You have $3,000 saved. Your car needs $1,500 in repairs, and your rent is due in 2 weeks.',
    assumptions: 'You earn $45k/year. Monthly expenses are $2,800. You have no credit card debt. Your income is stable. Rent is $1,200/month. The car is necessary for work. No other major expenses expected this month.',
    category: 'Emergency Fund',
    difficulty: 2,
    isPublished: true,
    options: [
      { optionText: 'Pay car repairs immediately (car needed for work), use remaining $1,500 for rent', tierLabel: 'Optimal', explanationShort: 'Car is essential for income. Don\'t risk your job.', orderingIndex: 1 },
      { optionText: 'Finance the car repair at 0% for 12 months, keep full $3k liquid', tierLabel: 'Optimal', explanationShort: '0% interest is free money. Keep emergency fund intact.', orderingIndex: 2 },
      { optionText: 'Pay rent first, put car repair on credit card (18-24% APR)', tierLabel: 'Risky', explanationShort: 'Credit card interest makes this expensive. Only if no 0% option.', orderingIndex: 4 },
      { optionText: 'Split: $1,200 rent, $1,500 car, hope for best with remaining $300', tierLabel: 'Reasonable', explanationShort: 'Covers essentials but leaves you thin. Acceptable if no alternatives.', orderingIndex: 3 },
    ],
  },
  {
    dateKey: format(subDays(new Date(), 3), 'yyyy-MM-dd'),
    title: 'Car Purchase Decision',
    scenarioText: 'You need a reliable car. You have $5,000 saved and earn $50k/year.',
    assumptions: 'Used car market: $8k gets decent reliability. $15k gets near-new. Loan rates at 6% APR.',
    category: 'Car Purchase',
    difficulty: 2,
    isPublished: true,
    options: [
      { optionText: 'Buy $8k used car in cash + finance $3k at 6%', tierLabel: 'Optimal', explanationShort: 'Minimize debt, keep emergency fund partially intact.', orderingIndex: 1 },
      { optionText: 'Buy $5k car cash, save rest for maintenance (higher maintenance risk)', tierLabel: 'Reasonable', explanationShort: 'No debt but higher maintenance risk with cheaper car.', orderingIndex: 2 },
      { optionText: 'Finance $15k car, $5k down (high debt-to-income, may strain budget)', tierLabel: 'Risky', explanationShort: 'High debt-to-income. Monthly payments may strain budget.', orderingIndex: 4 },
      { optionText: 'Lease new car for $300/mo (no equity, expensive long-term)', tierLabel: 'Risky', explanationShort: 'No equity buildup. Expensive long-term for your income level.', orderingIndex: 3 },
    ],
  },
  {
    dateKey: format(subDays(new Date(), 4), 'yyyy-MM-dd'),
    title: 'Employer 401k Match',
    scenarioText: 'Your employer offers 100% match on first 6% of salary. You earn $60k/year.',
    assumptions: 'You\'re 28 years old. You have $5k emergency fund (2 months expenses). No high-interest debt. You\'re in the 22% tax bracket. No other retirement savings yet. Monthly expenses are $2,500.',
    category: 'Investing',
    difficulty: 1,
    isPublished: true,
    options: [
      { optionText: 'Contribute 6% to get full match ($3,600/year free money)', tierLabel: 'Optimal', explanationShort: 'Instant 100% return. Never leave free money on table.', orderingIndex: 1 },
      { optionText: 'Contribute 3% (leaving $1,800/year match on table), increase later', tierLabel: 'Reasonable', explanationShort: 'Getting some match is good but you\'re giving up free money.', orderingIndex: 2 },
      { optionText: 'Max out 401k (10%+) - may strain current budget', tierLabel: 'Reasonable', explanationShort: 'Good for retirement but may strain current budget unnecessarily.', orderingIndex: 3 },
      { optionText: 'Skip 401k match, save in HYSA (leaving $3,600/year free money)', tierLabel: 'Risky', explanationShort: 'You\'re leaving $3,600/year on the table. Match is guaranteed return.', orderingIndex: 4 },
    ],
  },
  {
    dateKey: format(subDays(new Date(), 5), 'yyyy-MM-dd'),
    title: 'Medical Bill Negotiation',
    scenarioText: 'You received a $2,500 medical bill. Hospital offers payment plan or 20% cash discount.',
    assumptions: 'You earn $55k/year. Monthly expenses are $3,500. You have $4k emergency fund. You have health insurance but hit your deductible. The payment plan is 0% interest for 12 months ($208/mo). No other major expenses expected.',
    category: 'Debt',
    difficulty: 2,
    isPublished: true,
    options: [
      { optionText: 'Take payment plan, keep emergency fund intact', tierLabel: 'Optimal', explanationShort: '0% interest is free money. Don\'t drain emergency fund for this.', orderingIndex: 1 },
      { optionText: 'Negotiate further, aim for 30%+ discount for cash', tierLabel: 'Optimal', explanationShort: 'Medical bills are often negotiable. Counter-offer is smart.', orderingIndex: 2 },
      { optionText: 'Pay $2,000 cash (20% discount), payment plan remaining $500', tierLabel: 'Reasonable', explanationShort: 'Balances savings and cash flow. Acceptable hybrid approach.', orderingIndex: 3 },
      { optionText: 'Drain emergency fund to pay $2,500 cash (leaves only $1,500 buffer)', tierLabel: 'Risky', explanationShort: 'Leaves you with only $1,500 buffer. Not worth it for 0% debt.', orderingIndex: 4 },
    ],
  },
  {
    dateKey: format(subDays(new Date(), 6), 'yyyy-MM-dd'),
    title: 'Student Loan Payoff Strategy',
    scenarioText: 'You have $20k in student loans at 5% interest. Extra $500/month to allocate.',
    assumptions: 'You\'re 26 years old, earn $55k/year, in the 22% tax bracket. Minimum payment is $200/mo. You have 6-month emergency fund ($15k). Employer offers 401k match (6%). No other major financial goals right now. Federal loans (not private).',
    category: 'Debt',
    difficulty: 2,
    isPublished: true,
    options: [
      { optionText: 'Put $300 extra toward loans, $200 to retirement', tierLabel: 'Optimal', explanationShort: 'Balance debt payoff with retirement. Don\'t ignore future completely.', orderingIndex: 1 },
      { optionText: 'Pay minimum on loans ($200), put $300 in index funds', tierLabel: 'Reasonable', explanationShort: 'Market may beat 5%, but guaranteed return on debt is safer.', orderingIndex: 3 },
      { optionText: 'Throw all $500 at 5% loans (sacrifices retirement growth)', tierLabel: 'Reasonable', explanationShort: 'Aggressive but sacrifices compound growth in prime earning years.', orderingIndex: 2 },
      { optionText: 'Pay minimum on 5% loans, use $300 for lifestyle upgrades', tierLabel: 'Risky', explanationShort: 'You\'re paying 5% interest to fund non-essentials. Poor math.', orderingIndex: 4 },
    ],
  },
  {
    dateKey: format(subDays(new Date(), 7), 'yyyy-MM-dd'),
    title: 'Rent vs Buy Decision',
    scenarioText: 'Currently paying $1,500/mo rent. Can buy similar place with $2,000/mo mortgage (including taxes/insurance).',
    assumptions: 'You earn $75k/year. Job is stable. You have 20% down payment saved ($60k). Both are 3-bedroom houses in same area. Plan to stay 5+ years. Estimated maintenance: $200/mo average. Closing costs: $8k. Property taxes and insurance included in mortgage payment.',
    category: 'Housing',
    difficulty: 3,
    isPublished: true,
    options: [
      { optionText: 'Buy the house - build equity instead of paying landlord', tierLabel: 'Optimal', explanationShort: 'Long-term stability, equity buildup, tax benefits. Extra $500/mo is building wealth.', orderingIndex: 1 },
      { optionText: 'Keep renting, invest $500 difference (but you plan to stay 5+ years)', tierLabel: 'Reasonable', explanationShort: 'Valid if you value flexibility or expect to move. But you said 5+ years.', orderingIndex: 3 },
      { optionText: 'Buy with less down (PMI costs), invest difference in stocks', tierLabel: 'Risky', explanationShort: 'Leveraging works until it doesn\'t. PMI costs eat returns. Risky.', orderingIndex: 4 },
      { optionText: 'Rent 1 more year, save bigger down payment (pay $18k to landlord meanwhile)', tierLabel: 'Reasonable', explanationShort: 'Lower mortgage but you pay $18k to landlord meanwhile. Timing matters.', orderingIndex: 2 },
    ],
  },
  {
    dateKey: format(subDays(new Date(), 8), 'yyyy-MM-dd'),
    title: 'Insurance Coverage Decision',
    scenarioText: 'Your current car insurance is $150/mo. Competitor offers $100/mo with slightly higher deductible.',
    assumptions: 'Current deductible: $500. New deductible: $1,000. Same coverage otherwise. You drive 15k miles/year.',
    category: 'Insurance',
    difficulty: 1,
    isPublished: true,
    options: [
      { optionText: 'Switch to save $600/year, bank the difference', tierLabel: 'Optimal', explanationShort: '$600/year savings covers the $500 deductible increase in less than a year.', orderingIndex: 1 },
      { optionText: 'Switch and invest the $50/mo savings', tierLabel: 'Optimal', explanationShort: 'Same logic but you\'re growing wealth. Smart move.', orderingIndex: 2 },
      { optionText: 'Keep current insurance (costs $600/year extra for $500 lower deductible)', tierLabel: 'Reasonable', explanationShort: 'Costs $600/year for $500 lower deductible. Emotional decision, not financial.', orderingIndex: 3 },
      { optionText: 'Get quotes from 3+ companies first (costs $50/mo extra while deciding)', tierLabel: 'Risky', explanationShort: 'Good to shop around but analysis paralysis costs you money monthly.', orderingIndex: 4 },
    ],
  },
  {
    dateKey: format(subDays(new Date(), 9), 'yyyy-MM-dd'),
    title: 'Side Hustle Investment',
    scenarioText: 'You can start a side business for $1,500 setup cost. Potential $500/mo income after 6 months.',
    assumptions: 'You earn $60k/year. You have $5k emergency fund. The business requires 10 hrs/week. Your current job is stable. You\'re already maxing 401k match. Side income will be taxable (1099). No other major financial commitments.',
    category: 'Income',
    difficulty: 2,
    isPublished: true,
    options: [
      { optionText: 'Start the business - ROI is 3 months after launch', tierLabel: 'Optimal', explanationShort: 'Clear path to returns. Diversifies income. Manageable time commitment.', orderingIndex: 1 },
      { optionText: 'Test it part-time for 3 months before full investment', tierLabel: 'Optimal', explanationShort: 'Validate demand before full spend. Smart risk management.', orderingIndex: 2 },
      { optionText: 'Save the $1,500, pick up overtime at current job instead', tierLabel: 'Reasonable', explanationShort: 'Safer but no long-term asset building. Trading time for money linearly.', orderingIndex: 3 },
      { optionText: 'Go all in - quit job and focus on business full-time', tierLabel: 'Risky', explanationShort: 'Unproven business model. Don\'t quit stable income for maybes.', orderingIndex: 4 },
    ],
  },
  {
    dateKey: format(subDays(new Date(), 10), 'yyyy-MM-dd'),
    title: 'Credit Card Rewards Optimization',
    scenarioText: 'You spend $2k/mo on necessities. Current card gives 1% cash back. New card offers 3% but has $95 annual fee.',
    assumptions: 'You earn $65k/year. You have good credit (720+). You pay off balance monthly (no interest). This would be your only rewards card. Spending patterns won\'t change. Both have same benefits otherwise (fraud protection, etc.).',
    category: 'Budgeting',
    difficulty: 1,
    isPublished: true,
    options: [
      { optionText: 'Switch to 3% card - net gain is $385/year', tierLabel: 'Optimal', explanationShort: '$720 (3% of $24k) minus $95 fee minus $240 (old 1%) = $385 gain.', orderingIndex: 1 },
      { optionText: 'Keep current card (leaving $385/year on table)', tierLabel: 'Risky', explanationShort: 'Leaving $385/year on table for simplicity. Bad math.', orderingIndex: 4 },
      { optionText: 'Get both cards, use each for specific categories', tierLabel: 'Reasonable', explanationShort: 'Optimizes returns but adds complexity. Only worth if gains > effort.', orderingIndex: 3 },
      { optionText: 'Negotiate current card for better rewards first', tierLabel: 'Optimal', explanationShort: 'Good try but they usually won\'t match. Still, no harm asking.', orderingIndex: 2 },
    ],
  },
  {
    dateKey: format(subDays(new Date(), 11), 'yyyy-MM-dd'),
    title: 'Mortgage Refinance Decision',
    scenarioText: 'Current mortgage: $200k at 5% (25 years left). Can refinance to 3.5% for $3k closing costs.',
    assumptions: 'You earn $80k/year. Credit score 750+. No other debts. You\'re in the 24% tax bracket. Monthly payment would drop from $1,400 to $1,200. Planning to stay in home 10+ years. Refinance would reset to 30-year term unless you choose shorter.',
    category: 'Housing',
    difficulty: 3,
    isPublished: true,
    options: [
      { optionText: 'Refinance - break-even in 15 months, save $60k over life of loan', tierLabel: 'Optimal', explanationShort: '$3k cost divided by $200/mo savings = 15 months payback. Then pure savings.', orderingIndex: 1 },
      { optionText: 'Refinance AND reduce term to 15 years', tierLabel: 'Reasonable', explanationShort: 'Builds equity faster but payments may be higher than current. Depends on cashflow.', orderingIndex: 2 },
      { optionText: 'Keep current mortgage, invest $3k instead (market must beat 1.5% guaranteed savings)', tierLabel: 'Risky', explanationShort: 'Market would need to beat guaranteed 1.5% savings. Unlikely and riskier.', orderingIndex: 4 },
      { optionText: 'Shop around for better refi rates before committing', tierLabel: 'Reasonable', explanationShort: 'Smart to compare but don\'t let perfection block good deal. Rates may rise.', orderingIndex: 3 },
    ],
  },
  {
    dateKey: format(subDays(new Date(), 12), 'yyyy-MM-dd'),
    title: 'Tax Refund Allocation',
    scenarioText: 'You just got a $3,000 tax refund. Time to make it work for you.',
    assumptions: 'You earn $50k/year, in the 22% tax bracket. You have 3-month emergency fund ($7,500). $1,200 credit card debt at 18% APR. No other high-interest debt. You\'re already contributing to 401k match. Monthly expenses are $2,500.',
    category: 'Windfall',
    difficulty: 1,
    isPublished: true,
    options: [
      { optionText: 'Pay off $1,200 credit card debt (18% APR), put $1,800 in HYSA', tierLabel: 'Optimal', explanationShort: 'Kill the 18% APR vampire first. Guaranteed return. Boost savings with rest.', orderingIndex: 1 },
      { optionText: 'Pay off credit card (18% APR), invest remaining $1,800 in index funds', tierLabel: 'Optimal', explanationShort: 'Same smart debt payoff, but growth focus. Depends on risk tolerance.', orderingIndex: 2 },
      { optionText: 'Keep $500 fun money, put $2,500 toward financial goals', tierLabel: 'Reasonable', explanationShort: 'Balance treat-yourself with responsibility. Acceptable if you need morale.', orderingIndex: 3 },
      { optionText: 'Invest all $3k in stocks (while paying 18% credit card interest)', tierLabel: 'Risky', explanationShort: '18% guaranteed loss vs ~10% average market return. Bad bet.', orderingIndex: 4 },
    ],
  },
  {
    dateKey: format(subDays(new Date(), 13), 'yyyy-MM-dd'),
    title: 'College Savings for Kids',
    scenarioText: 'Your child is 5 years old. You can save $300/month for college. Considering 529 vs taxable account.',
    assumptions: 'You earn $75k/year. Only one child. You\'re already saving for retirement (401k match). Your state offers tax deduction for 529 contributions. 529 has tax benefits but restrictions. Taxable account more flexible. College in 13 years. Estimated cost: $200k+ for 4 years.',
    category: 'Investing',
    difficulty: 2,
    isPublished: true,
    options: [
      { optionText: 'Max out 529 plan - tax-free growth for education', tierLabel: 'Optimal', explanationShort: 'Tax benefits compound. If used for education, it\'s a no-brainer.', orderingIndex: 1 },
      { optionText: 'Split: $200 in 529, $100 in taxable for flexibility', tierLabel: 'Optimal', explanationShort: 'Covers education but keeps options open. Balanced approach.', orderingIndex: 2 },
      { optionText: 'All in taxable account - what if kid doesn\'t go to college?', tierLabel: 'Reasonable', explanationShort: 'Flexibility has value but you\'re paying extra tax for uncertainty. 529s have exceptions.', orderingIndex: 3 },
      { optionText: 'Skip saving, kid takes loans (6-7% interest vs tax-free growth)', tierLabel: 'Risky', explanationShort: 'Loans at 6-7% vs tax-free compounding. You\'re hurting your kid\'s financial start.', orderingIndex: 4 },
    ],
  },
  // Continue with more challenges...
  {
    dateKey: format(subDays(new Date(), 14), 'yyyy-MM-dd'),
    title: 'Home Repair Emergency',
    scenarioText: 'Your water heater died. Replacement costs $1,200. You have $2k in emergency fund.',
    assumptions: 'You earn $55k/year. Monthly expenses are $3,200. Must fix immediately (no hot water). Can finance at 0% for 12 months or pay cash. No other major expenses expected soon. Your emergency fund represents about 2.5 months of expenses.',
    category: 'Emergency Fund',
    difficulty: 1,
    isPublished: true,
    options: [
      { optionText: 'Finance at 0% for 12 months, keep emergency fund intact', tierLabel: 'Optimal', explanationShort: '0% is free money. Don\'t drain your safety net for this.', orderingIndex: 1 },
      { optionText: 'Pay cash, rebuild fund over next 6 months', tierLabel: 'Reasonable', explanationShort: 'Acceptable but leaves you thin. Only if financing unavailable.', orderingIndex: 2 },
      { optionText: 'Pay $600 cash, finance remaining $600 at 0%', tierLabel: 'Optimal', explanationShort: 'Hybrid approach balances cash flow and fund preservation.', orderingIndex: 3 },
      { optionText: 'Put on credit card at 18-24% APR, pay off slowly', tierLabel: 'Risky', explanationShort: 'Why pay 18-24% interest when 0% financing is available?', orderingIndex: 4 },
    ],
  },
  // January 2026 Challenges
  {
    dateKey: '2026-01-01',
    title: 'Roth vs Traditional 401k Decision',
    scenarioText: 'Your employer offers both Roth and Traditional 401k options. You\'re deciding which to prioritize.',
    assumptions: 'You\'re 32 years old, earn $70k/year, in the 22% tax bracket. You can contribute $5,000/year total. You expect to be in the 22% bracket in retirement. You have 30+ years until retirement. You\'re already getting full employer match (6%). Current tax rate: 22%.',
    category: 'Investing',
    difficulty: 3,
    isPublished: true,
    options: [
      { optionText: 'Split: $3k Traditional (tax break now), $2k Roth (tax-free later)', tierLabel: 'Optimal', explanationShort: 'Tax diversification. Hedge against future rate changes. Best of both worlds.', orderingIndex: 1 },
      { optionText: 'All Roth - tax-free growth for 30 years is powerful', tierLabel: 'Optimal', explanationShort: 'If you expect same or higher tax rate, Roth wins. Tax-free compounding is huge.', orderingIndex: 2 },
      { optionText: 'All Traditional - save 22% now, pay taxes later', tierLabel: 'Reasonable', explanationShort: 'Valid if you expect lower tax bracket in retirement. But rates may rise.', orderingIndex: 3 },
      { optionText: 'Skip 401k, invest in taxable (giving up tax advantages + employer match)', tierLabel: 'Risky', explanationShort: 'You\'re giving up tax advantages and employer match. Bad move.', orderingIndex: 4 },
    ],
  },
  {
    dateKey: '2026-01-02',
    title: 'Car Lease vs Buy Decision',
    scenarioText: 'You need a new car. Dealer offers: Lease $350/mo (3 years) or Buy $450/mo (5 years, 0% APR).',
    assumptions: 'You earn $65k/year. You drive 12k miles/year. Lease includes maintenance. Buy requires $2k down. After 3 years, lease ends (no equity). After 5 years, car worth ~$15k. You plan to keep car 5+ years. Monthly expenses are $3,500.',
    category: 'Car Purchase',
    difficulty: 2,
    isPublished: true,
    options: [
      { optionText: 'Buy the car - build equity and own it after 5 years', tierLabel: 'Optimal', explanationShort: '0% APR is free money. You\'ll own $15k asset vs paying $12,600 for nothing with lease.', orderingIndex: 1 },
      { optionText: 'Lease for 3 years, then buy used car', tierLabel: 'Reasonable', explanationShort: 'Lower payments short-term but you\'re paying for depreciation without ownership.', orderingIndex: 3 },
      { optionText: 'Lease - $350/mo for 3 years (no equity, $12,600 for temporary use)', tierLabel: 'Risky', explanationShort: 'You\'re paying $12,600 for temporary use. No equity. Expensive long-term.', orderingIndex: 4 },
      { optionText: 'Buy used car in cash ($12k), avoid payments entirely', tierLabel: 'Optimal', explanationShort: 'No interest, no payments. Smartest if you can afford it upfront.', orderingIndex: 2 },
    ],
  },
  {
    dateKey: '2026-01-03',
    title: 'Debt Consolidation Decision',
    scenarioText: 'You have $15k across 3 credit cards (18%, 20%, 22% APR). Can consolidate into one loan at 12% APR.',
    assumptions: 'You earn $60k/year. Total minimum payments: $450/mo. Consolidation loan: $400/mo for 4 years. You have good credit (700+). Consolidation has $500 origination fee. You\'re committed to not using cards again.',
    category: 'Debt',
    difficulty: 2,
    isPublished: true,
    options: [
      { optionText: 'Consolidate AND pay extra $100/mo to finish faster', tierLabel: 'Optimal', explanationShort: 'Lower rate saves thousands. Paying extra gets you debt-free in 3 years vs 4. Best approach.', orderingIndex: 1 },
      { optionText: 'Consolidate - save on interest, simplify payments', tierLabel: 'Optimal', explanationShort: '12% rate saves $3k+ vs credit cards. Single payment reduces mistakes. Still great.', orderingIndex: 2 },
      { optionText: 'Keep separate cards, pay highest rate first (avalanche)', tierLabel: 'Reasonable', explanationShort: 'Works but you\'re still paying 18-22% rates. Consolidation saves more money.', orderingIndex: 3 },
      { optionText: 'Transfer balances to 0% card (rate jumps to 25%+ if not paid in 18 months)', tierLabel: 'Risky', explanationShort: 'If you can\'t pay off in 18 months, rate jumps to 25%+. Too risky for $15k debt.', orderingIndex: 4 },
    ],
  },
  {
    dateKey: '2026-01-04',
    title: 'Down Payment Savings Strategy',
    scenarioText: 'You want to buy a house in 2 years. Need $40k down payment. Currently have $15k saved.',
    assumptions: 'You earn $75k/year. You can save $1,200/mo toward the goal. You\'re 30 years old. Current savings in HYSA (4% APY). Stock market averages 10% but volatile. House prices may rise 3-5% annually. You\'re in the 22% tax bracket.',
    category: 'Housing',
    difficulty: 2,
    isPublished: true,
    options: [
      { optionText: 'HYSA + cut expenses to save $1,500/mo instead', tierLabel: 'Optimal', explanationShort: 'Guaranteed 4% growth plus you\'ll reach goal in 20 months vs 25. Fastest and safest.', orderingIndex: 1 },
      { optionText: 'Keep in HYSA - guaranteed 4%, no risk of loss', tierLabel: 'Optimal', explanationShort: '2-year timeline is too short for stocks. Can\'t afford to lose down payment money. Safe choice.', orderingIndex: 2 },
      { optionText: 'Split: $800 HYSA, $400 in stocks (if market drops 15%, delays purchase)', tierLabel: 'Reasonable', explanationShort: 'Some growth potential but risky. If market drops 15%, you delay purchase by months.', orderingIndex: 3 },
      { optionText: 'All in stock market (could drop 20% right when you need the money)', tierLabel: 'Risky', explanationShort: 'Market could drop 20% right when you need it. You\'d have to delay house purchase. Too risky.', orderingIndex: 4 },
    ],
  },
  {
    dateKey: '2026-01-05',
    title: 'Life Insurance Needs Assessment',
    scenarioText: 'You\'re 35, married with 2 kids. Term life insurance costs $50/mo for $500k coverage (20 years).',
    assumptions: 'You earn $80k/year. Spouse earns $40k/year. Mortgage: $250k. Kids are 5 and 7. You have $50k in savings. Spouse could cover expenses with their income + $300k. Term is 10x cheaper than whole life. You\'re healthy (good rates).',
    category: 'Insurance',
    difficulty: 2,
    isPublished: true,
    options: [
      { optionText: 'Get $500k term policy - covers mortgage + 5 years expenses', tierLabel: 'Optimal', explanationShort: 'Adequate coverage at low cost. $50/mo protects $80k/year income. Term is the smart choice.', orderingIndex: 1 },
      { optionText: 'Get $750k term policy for extra security', tierLabel: 'Optimal', explanationShort: 'More coverage gives spouse more options and longer financial runway. Still affordable.', orderingIndex: 2 },
      { optionText: 'Get whole life policy ($500/mo vs $50/mo term - 10x more expensive)', tierLabel: 'Reasonable', explanationShort: '10x more expensive ($500/mo). Cash value grows slowly. Term + invest difference is better.', orderingIndex: 3 },
      { optionText: 'Skip insurance (family loses $80k/year income if you die)', tierLabel: 'Risky', explanationShort: 'If you die, family loses your $80k income. $50/mo is cheap peace of mind for loved ones.', orderingIndex: 4 },
    ],
  },
  {
    dateKey: '2026-01-06',
    title: 'HSA vs Traditional Health Plan',
    scenarioText: 'Your employer offers HSA-eligible plan ($3k deductible) or traditional plan ($500 deductible).',
    assumptions: 'You earn $70k/year, in the 22% tax bracket. HSA plan costs $200/mo less. You\'re 32, healthy. HSA contributions are triple tax-advantaged (pre-tax, grows tax-free, tax-free withdrawals for medical). Traditional plan: $500 deductible, $200/mo premium. HSA plan: $3k deductible, $0/mo premium.',
    category: 'Insurance',
    difficulty: 3,
    isPublished: true,
    options: [
      { optionText: 'Choose HSA, max it out ($4,150), invest the savings', tierLabel: 'Optimal', explanationShort: 'Save $2,400/year on premiums. Triple tax advantage. Best if you\'re healthy.', orderingIndex: 1 },
      { optionText: 'HSA plan, contribute $2,400 (premium savings) to HSA', tierLabel: 'Optimal', explanationShort: 'Breaks even on deductible, but you get tax benefits and investment growth.', orderingIndex: 2 },
      { optionText: 'Traditional plan - lower deductible, peace of mind', tierLabel: 'Reasonable', explanationShort: 'Valid if you have chronic conditions or prefer predictability. Costs more long-term.', orderingIndex: 3 },
      { optionText: 'HSA plan but don\'t contribute (missing triple tax advantage)', tierLabel: 'Risky', explanationShort: 'You\'re missing out on tax benefits. HSA is the best retirement account if used right.', orderingIndex: 4 },
    ],
  },
  {
    dateKey: '2026-01-07',
    title: 'Home Improvement ROI Decision',
    scenarioText: 'Your kitchen needs updating. $25k renovation vs $15k basic refresh. Will you recoup the cost?',
    assumptions: 'You earn $85k/year. Home value: $300k. Full reno adds ~$20k value. Basic refresh adds ~$12k value. You plan to sell in 5 years. You have $30k saved. Can finance at 7% APR or pay cash. Neighborhood supports higher-end finishes.',
    category: 'Housing',
    difficulty: 3,
    isPublished: true,
    options: [
      { optionText: 'Basic refresh - 80% ROI ($12k value gain on $15k spend)', tierLabel: 'Optimal', explanationShort: '$12k value gain on $15k spend = 80% ROI. Full reno only 80% ROI too, but more risk.', orderingIndex: 1 },
      { optionText: 'Full renovation - you\'ll enjoy it 5 years, worth the extra', tierLabel: 'Reasonable', explanationShort: 'If you value quality of life, it\'s reasonable. But financially, basic is better.', orderingIndex: 3 },
      { optionText: 'Do nothing (kitchen affects home value, may lose more than market gains)', tierLabel: 'Risky', explanationShort: 'Kitchen affects home value significantly. You may lose more in home value than market gains.', orderingIndex: 4 },
      { optionText: 'Basic refresh, pay cash to avoid 7% interest', tierLabel: 'Optimal', explanationShort: '7% guaranteed return by avoiding debt. Better than most investments.', orderingIndex: 2 },
    ],
  },
  {
    dateKey: '2026-01-08',
    title: 'Asset Allocation at 40',
    scenarioText: 'You\'re 40, have $100k in retirement accounts. Currently 90% stocks, 10% bonds. Rebalance?',
    assumptions: 'You earn $90k/year. Plan to retire at 65. You have 25 years until retirement. You\'re comfortable with risk. Traditional rule: 100 - age = stock %. You\'re maxing 401k match. No other major savings goals.',
    category: 'Investing',
    difficulty: 2,
    isPublished: true,
    options: [
      { optionText: 'Move to 70/30 - balance growth and stability', tierLabel: 'Optimal', explanationShort: 'Best balance. 25 years allows growth, but 30% bonds provides cushion for market downturns.', orderingIndex: 1 },
      { optionText: 'Keep 90/10 - you have 25 years, can ride out volatility', tierLabel: 'Optimal', explanationShort: 'Aggressive but reasonable with 25 years. Stocks historically outperform long-term.', orderingIndex: 2 },
      { optionText: 'Rebalance to 60% stocks, 40% bonds (age-appropriate)', tierLabel: 'Reasonable', explanationShort: 'Conservative approach. Safe but may limit growth with 25 years until retirement.', orderingIndex: 3 },
      { optionText: 'Go 100% stocks (no buffer for market downturns)', tierLabel: 'Risky', explanationShort: 'Too aggressive. No buffer for market downturns. Even 25 years out, some bonds help reduce risk.', orderingIndex: 4 },
    ],
  },
  {
    dateKey: '2026-01-09',
    title: 'Payday Loan Alternative',
    scenarioText: 'You need $500 until next paycheck (2 weeks away). Payday loan charges $75 fee. Other options?',
    assumptions: 'You earn $45k/year. This is a one-time emergency. You have no emergency fund. Credit score is 650. You have a credit card with $2k limit, 24% APR. Family could loan it interest-free. Paycheck is guaranteed in 2 weeks.',
    category: 'Debt',
    difficulty: 1,
    isPublished: true,
    options: [
      { optionText: 'Borrow from family - no interest, build emergency fund after', tierLabel: 'Optimal', explanationShort: 'Free money. Then immediately start emergency fund so this doesn\'t happen again.', orderingIndex: 1 },
      { optionText: 'Use credit card - $10 interest vs $75 payday fee', tierLabel: 'Optimal', explanationShort: '$500 × 24% APR × (14/365) = ~$4.60. Way cheaper than payday loan.', orderingIndex: 2 },
      { optionText: 'Take payday loan ($75 fee = 390% APR for 2 weeks)', tierLabel: 'Risky', explanationShort: '$75 fee on $500 for 2 weeks = 390% APR. Terrible deal even if you pay on time.', orderingIndex: 4 },
      { optionText: 'Negotiate payment delay with creditor', tierLabel: 'Reasonable', explanationShort: 'Worth asking. Many will work with you. But may damage relationship.', orderingIndex: 3 },
    ],
  },
  {
    dateKey: '2026-01-10',
    title: 'Car Maintenance vs Replacement',
    scenarioText: 'Your 12-year-old car needs $3,500 in repairs. Car is worth $4,000. Replace or fix?',
    assumptions: 'You earn $60k/year. Car has 150k miles. Repairs would make it reliable for 2-3 more years. New car: $25k (financed at 6% APR, $450/mo). Used reliable car: $12k (cash or $250/mo). You have $8k saved. Monthly expenses are $3,200.',
    category: 'Car Purchase',
    difficulty: 2,
    isPublished: true,
    options: [
      { optionText: 'Fix the car - $117/mo equivalent vs $250-450/mo car payment', tierLabel: 'Optimal', explanationShort: '$3,500 ÷ 30 months = $117/mo. Way cheaper than $250-450/mo car payment.', orderingIndex: 1 },
      { optionText: 'Buy $12k used car in cash, sell old car for parts ($1k)', tierLabel: 'Optimal', explanationShort: 'If repairs are too risky, reliable used car is smart. Pay cash to avoid interest.', orderingIndex: 2 },
      { optionText: 'Finance new $25k car ($450/mo × 60 months = $27k total)', tierLabel: 'Risky', explanationShort: '$450/mo × 60 months = $27k. Overkill when $12k car works fine.', orderingIndex: 4 },
      { optionText: 'Fix car, start saving for replacement in 2 years', tierLabel: 'Reasonable', explanationShort: 'Smart planning. But if more repairs come, you\'re throwing good money after bad.', orderingIndex: 3 },
    ],
  },
  {
    dateKey: '2026-01-11',
    title: 'Roth IRA vs Taxable Brokerage',
    scenarioText: 'You have $6,500 to invest. Already maxing 401k match. Roth IRA or taxable brokerage?',
    assumptions: 'You\'re 28 years old, earn $65k/year, in the 22% tax bracket. Roth IRA: $6,500 limit, tax-free growth and withdrawals. Taxable: no limit, but capital gains taxes. You may need money before 59.5. You have emergency fund. Planning for retirement.',
    category: 'Investing',
    difficulty: 2,
    isPublished: true,
    options: [
      { optionText: 'Max Roth IRA - tax-free growth for 30+ years', tierLabel: 'Optimal', explanationShort: 'Tax-free compounding is powerful. You can withdraw contributions penalty-free if needed.', orderingIndex: 1 },
      { optionText: 'Split: $3,500 Roth, $3,000 taxable for flexibility', tierLabel: 'Optimal', explanationShort: 'Tax benefits of Roth plus accessible funds. Balanced approach.', orderingIndex: 2 },
      { optionText: 'All in taxable - need access before retirement', tierLabel: 'Reasonable', explanationShort: 'Valid if you truly need access. But you\'re paying taxes on gains unnecessarily.', orderingIndex: 3 },
      { optionText: 'Skip investing, pay down 4% mortgage (vs 10% average market return)', tierLabel: 'Risky', explanationShort: '4% mortgage vs 10% average market return. Math favors investing, especially in Roth.', orderingIndex: 4 },
    ],
  },
  {
    dateKey: '2026-01-12',
    title: 'Budgeting: Fixed vs Variable Expenses',
    scenarioText: 'You spend $4,000/mo total. $2,500 is fixed (rent, car, insurance). $1,500 is variable. Where to cut?',
    assumptions: 'You earn $70k/year. Fixed: rent $1,200, car $350, insurance $150, phone $80, subscriptions $50, utilities $200, minimum debt payments $470. Variable: groceries $600, dining $400, entertainment $300, shopping $200. You want to save $500/mo more.',
    category: 'Budgeting',
    difficulty: 1,
    isPublished: true,
    options: [
      { optionText: 'Cut variable: reduce dining ($200), entertainment ($150), shopping ($150)', tierLabel: 'Optimal', explanationShort: 'Variable expenses are easiest to control. $500 saved without lifestyle disruption.', orderingIndex: 1 },
      { optionText: 'Cut both: reduce dining + shop for cheaper insurance/phone', tierLabel: 'Optimal', explanationShort: 'Attack both sides. Saves more and reduces fixed costs long-term.', orderingIndex: 2 },
      { optionText: 'Move to cheaper apartment, save $300/mo on rent', tierLabel: 'Reasonable', explanationShort: 'Bigger impact but requires moving. Only if you\'re staying long-term.', orderingIndex: 3 },
      { optionText: 'Cut groceries to essentials (food is essential, cut dining/entertainment first)', tierLabel: 'Risky', explanationShort: 'Food is essential. Better to cut dining out and entertainment first.', orderingIndex: 4 },
    ],
  },
  {
    dateKey: '2026-01-13',
    title: 'Disability Insurance Coverage',
    scenarioText: 'Your employer offers disability insurance for $50/mo. Covers 60% of salary if disabled.',
    assumptions: 'You earn $80k/year. You\'re 35, healthy. Policy covers until age 65. You have 3-month emergency fund. Your job has physical demands. Social Security disability exists but is hard to qualify for. Premium is pre-tax (saves ~$12/mo in taxes).',
    category: 'Insurance',
    difficulty: 2,
    isPublished: true,
    options: [
      { optionText: 'Get coverage + increase emergency fund to 6 months', tierLabel: 'Optimal', explanationShort: 'Insurance covers long-term, 6-month fund covers short-term. Comprehensive protection.', orderingIndex: 1 },
      { optionText: 'Get the coverage - protects your biggest asset (income)', tierLabel: 'Optimal', explanationShort: '$50/mo for $4,000/mo protection if disabled. Your income is worth millions over lifetime.', orderingIndex: 2 },
      { optionText: 'Get cheaper policy with longer elimination period', tierLabel: 'Reasonable', explanationShort: 'Saves money but you need larger emergency fund (6+ months) to cover waiting period.', orderingIndex: 3 },
      { optionText: 'Skip insurance (3-month fund won\'t cover long-term disability)', tierLabel: 'Risky', explanationShort: '3 months won\'t cover long-term disability. SSDI is hard to qualify for and pays little.', orderingIndex: 4 },
    ],
  },
  {
    dateKey: '2026-01-14',
    title: 'Windfall: Inheritance Decision',
    scenarioText: 'You inherited $50,000. No immediate debts. Time to make it count long-term.',
    assumptions: 'You\'re 40 years old. You earn $85k/year. You have $20k emergency fund (4 months). Mortgage: $200k at 4% (25 years left). 401k balance: $150k. You\'re maxing employer match. Kids are 10 and 12 (college in 8-10 years). You\'re in the 24% tax bracket.',
    category: 'Windfall',
    difficulty: 3,
    isPublished: true,
    options: [
      { optionText: 'Split: $20k emergency fund (6 months), $20k 401k, $10k 529 plans', tierLabel: 'Optimal', explanationShort: 'Builds safety net, retirement, and college savings. Balanced approach.', orderingIndex: 1 },
      { optionText: 'Max 401k for year ($30k), put $20k in 529 plans', tierLabel: 'Optimal', explanationShort: 'Tax-advantaged growth. Prioritizes future needs. Smart long-term thinking.', orderingIndex: 2 },
      { optionText: 'Pay down 4% mortgage (safe but likely beat by market returns)', tierLabel: 'Reasonable', explanationShort: 'Safe return but you can likely beat 4% in market. Still, peace of mind has value.', orderingIndex: 3 },
      { optionText: 'Invest all $50k in taxable (missing tax advantages of 401k/529)', tierLabel: 'Risky', explanationShort: 'Missing tax advantages of 401k/529. Paying taxes on gains unnecessarily.', orderingIndex: 4 },
    ],
  },
  {
    dateKey: '2026-01-15',
    title: 'Retirement Catch-Up Strategy',
    scenarioText: 'You\'re 50, have $80k in retirement. Want to retire at 65. Need to catch up quickly.',
    assumptions: 'You earn $75k/year. You\'re 15 years from retirement. Current savings rate: 6% (employer match). You can increase to 15% of salary. Catch-up contributions allowed ($7,500 extra for 50+). You have emergency fund. No high-interest debt. Monthly expenses: $4,000.',
    category: 'Investing',
    difficulty: 3,
    isPublished: true,
    options: [
      { optionText: 'Max 401k + catch-up ($30k total), cut expenses to free up cash', tierLabel: 'Optimal', explanationShort: 'Maximum tax-advantaged savings. Cutting expenses accelerates catch-up. Best for retirement goal.', orderingIndex: 1 },
      { optionText: 'Increase to 15% of salary, max catch-up contributions', tierLabel: 'Optimal', explanationShort: 'Significant increase to $18,750/year without cutting lifestyle. Still aggressive and smart.', orderingIndex: 2 },
      { optionText: 'Keep current 6%, invest extra in taxable account', tierLabel: 'Reasonable', explanationShort: 'Less aggressive but maintains flexibility. May not be enough for comfortable retirement at 65.', orderingIndex: 3 },
      { optionText: 'Delay retirement to 70 (gambling on health and job availability)', tierLabel: 'Risky', explanationShort: 'Gives more time but you\'re gambling on health and job availability at 70. Not a plan.', orderingIndex: 4 },
    ],
  },
  {
    dateKey: '2026-01-16',
    title: 'Credit Card Debt Strategy',
    scenarioText: 'You have $8,000 credit card debt at 24% APR. Minimum payment is $200/mo. You can pay $500/mo.',
    assumptions: 'You earn $55k/year. Monthly expenses are $3,200. You have $2k emergency fund (1 month). No other debts. You\'re already contributing to 401k match. Credit score is 680. You can get a balance transfer card with 0% for 15 months (3% transfer fee).',
    category: 'Debt',
    difficulty: 2,
    isPublished: true,
    options: [
      { optionText: 'Balance transfer to 0% card (3% fee), pay $500/mo to clear in 15 months', tierLabel: 'Optimal', explanationShort: 'Saves $1,920 in interest vs paying minimum. 3% fee is worth it for 24% APR debt.', orderingIndex: 1 },
      { optionText: 'Pay $500/mo on current card, clear in 18 months', tierLabel: 'Optimal', explanationShort: 'No transfer fee, but you pay $1,200 more in interest. Still good if transfer unavailable.', orderingIndex: 2 },
      { optionText: 'Pay minimum ($200/mo), invest $300/mo instead', tierLabel: 'Risky', explanationShort: 'Paying 24% interest while investing. Market would need 24%+ return to break even. Bad math.', orderingIndex: 4 },
      { optionText: 'Pay minimum, use $300/mo to build emergency fund first', tierLabel: 'Reasonable', explanationShort: 'Safety net is important, but 24% debt is an emergency. Build fund after debt is gone.', orderingIndex: 3 },
    ],
  },
  {
    dateKey: '2026-01-17',
    title: 'Tax Withholding Adjustment',
    scenarioText: 'You got a $4,000 tax refund. Your friend says you\'re giving the government an interest-free loan.',
    assumptions: 'You earn $70k/year, in the 22% tax bracket. You get $4k refund every year. You could adjust withholding to get $333/mo more in your paycheck. You have 3-month emergency fund. No high-interest debt. You\'re contributing to 401k match.',
    category: 'Tax Planning',
    difficulty: 1,
    isPublished: true,
    options: [
      { optionText: 'Adjust withholding, invest the extra $333/mo in Roth IRA', tierLabel: 'Optimal', explanationShort: 'Get your money now, invest it tax-free. Better than waiting for refund.', orderingIndex: 1 },
      { optionText: 'Adjust withholding, add $333/mo to emergency fund until 6 months', tierLabel: 'Optimal', explanationShort: 'Build safety net faster. Still better than giving government interest-free loan.', orderingIndex: 2 },
      { optionText: 'Keep current withholding, use refund as forced savings', tierLabel: 'Reasonable', explanationShort: 'Forced savings works for some, but you\'re losing investment growth on $4k all year.', orderingIndex: 3 },
      { optionText: 'Keep current withholding, spend refund on vacation', tierLabel: 'Risky', explanationShort: 'You\'re giving up $4k in investment growth annually for a one-time expense.', orderingIndex: 4 },
    ],
  },
  {
    dateKey: '2026-01-18',
    title: 'Home Equity Line of Credit Decision',
    scenarioText: 'You have $100k equity in your home. Bank offers HELOC at 7% APR. Should you use it?',
    assumptions: 'You earn $85k/year. Home value: $400k, mortgage: $300k. HELOC limit: $80k. You have $5k credit card debt at 18% APR. You have 3-month emergency fund. You\'re considering using HELOC to pay off credit card and invest the rest.',
    category: 'Debt',
    difficulty: 3,
    isPublished: true,
    options: [
      { optionText: 'Use HELOC to pay off 18% credit card, don\'t use rest', tierLabel: 'Optimal', explanationShort: 'Refinance 18% debt to 7%. Saves $550/year. Don\'t risk your home for investments.', orderingIndex: 1 },
      { optionText: 'Use HELOC for credit card + invest $20k in index funds', tierLabel: 'Reasonable', explanationShort: 'If market beats 7%, you win. But you\'re risking your home. Risky leverage.', orderingIndex: 3 },
      { optionText: 'Don\'t open HELOC, pay off credit card with savings', tierLabel: 'Reasonable', explanationShort: 'Safe but drains emergency fund. Only if you can rebuild quickly.', orderingIndex: 2 },
      { optionText: 'Use HELOC to invest $50k in individual stocks', tierLabel: 'Risky', explanationShort: 'Risky leverage with your home as collateral. Market could drop, you lose home equity.', orderingIndex: 4 },
    ],
  },
  {
    dateKey: '2026-01-19',
    title: '529 Plan vs UTMA Account',
    scenarioText: 'You want to save for your 8-year-old\'s college. 529 plan or UTMA (custodial account)?',
    assumptions: 'You earn $80k/year, in the 24% tax bracket. You can save $400/mo. Child is 8, college in 10 years. Your state offers tax deduction for 529. 529: tax-free growth for education. UTMA: more flexible but taxable, becomes child\'s at 18. Estimated college cost: $200k.',
    category: 'Education Planning',
    difficulty: 2,
    isPublished: true,
    options: [
      { optionText: '529 plan - tax-free growth, state tax deduction', tierLabel: 'Optimal', explanationShort: 'Best tax benefits. If used for education, it\'s the clear winner. State deduction is bonus.', orderingIndex: 1 },
      { optionText: 'Split: $300 in 529, $100 in UTMA for flexibility', tierLabel: 'Optimal', explanationShort: 'Covers education with tax benefits, plus flexibility if plans change. Balanced approach.', orderingIndex: 2 },
      { optionText: 'All UTMA - what if kid doesn\'t go to college?', tierLabel: 'Reasonable', explanationShort: 'Flexibility has value, but you\'re paying taxes on gains. 529s have exceptions for non-education use.', orderingIndex: 3 },
      { optionText: 'Skip saving, kid will get scholarships or loans', tierLabel: 'Risky', explanationShort: 'Loans at 6-7% vs tax-free compounding. You\'re hurting your child\'s financial start.', orderingIndex: 4 },
    ],
  },
  {
    dateKey: '2026-01-20',
    title: 'Rental Property Investment',
    scenarioText: 'You can buy a rental property for $150k. Down payment $30k, mortgage $500/mo, rent $1,200/mo.',
    assumptions: 'You earn $90k/year. You have $50k saved. Mortgage rate: 6% APR. Property taxes: $200/mo. Insurance: $100/mo. Maintenance: $200/mo average. You have 6-month emergency fund. You\'re maxing 401k match. No other investments.',
    category: 'Investing',
    difficulty: 3,
    isPublished: true,
    options: [
      { optionText: 'Buy rental, keep $20k emergency fund, invest $200/mo profit in index funds', tierLabel: 'Optimal', explanationShort: 'Diversifies income, builds equity, cash flow positive. Reinvest profits for growth.', orderingIndex: 1 },
      { optionText: 'Buy rental, use all $50k for down payment to reduce mortgage', tierLabel: 'Optimal', explanationShort: 'Larger down payment = lower monthly payment, more cash flow. Still keep some emergency fund.', orderingIndex: 2 },
      { optionText: 'Skip rental, invest $30k in index funds instead', tierLabel: 'Reasonable', explanationShort: 'Less work, more liquid. But you miss out on leverage and rental income. Valid choice.', orderingIndex: 3 },
      { optionText: 'Buy rental, use all savings including emergency fund', tierLabel: 'Risky', explanationShort: 'No emergency fund is dangerous. What if you lose your job or property needs major repairs?', orderingIndex: 4 },
    ],
  },
  {
    dateKey: '2026-01-21',
    title: 'Long-Term Care Insurance',
    scenarioText: 'You\'re 55. Long-term care insurance costs $200/mo for $200/day coverage (3-year benefit).',
    assumptions: 'You earn $95k/year. You\'re married. You have $300k in retirement accounts. You have 6-month emergency fund. Average nursing home cost: $300/day. You plan to retire at 65. Policy has 3% inflation protection. Premiums may increase.',
    category: 'Insurance',
    difficulty: 3,
    isPublished: true,
    options: [
      { optionText: 'Get the policy - protects retirement savings from LTC costs', tierLabel: 'Optimal', explanationShort: '$200/mo protects $300k retirement. LTC can cost $100k+/year. Smart protection.', orderingIndex: 1 },
      { optionText: 'Get policy with 5-year benefit period for extra protection', tierLabel: 'Optimal', explanationShort: 'More coverage for slightly higher cost. Worth it if you can afford it.', orderingIndex: 2 },
      { optionText: 'Skip insurance, self-insure with retirement savings', tierLabel: 'Reasonable', explanationShort: 'Valid if you have enough assets. But LTC can deplete $300k quickly. Risky.', orderingIndex: 3 },
      { optionText: 'Skip insurance, invest $200/mo instead', tierLabel: 'Risky', explanationShort: 'If you need LTC, $200/mo investments won\'t cover $300/day costs. You\'ll drain retirement.', orderingIndex: 4 },
    ],
  },
  {
    dateKey: '2026-01-22',
    title: 'Emergency Fund vs High-Interest Debt',
    scenarioText: 'You have $3,000 credit card debt at 22% APR and $1,000 emergency fund. Got $2,000 bonus.',
    assumptions: 'You earn $50k/year. Monthly expenses are $3,000. Minimum credit card payment is $90/mo. You have stable job. You can pay $200/mo toward debt. No other debts. You\'re contributing to 401k match.',
    category: 'Emergency Fund',
    difficulty: 2,
    isPublished: true,
    options: [
      { optionText: 'Pay off $2k of credit card debt (22% APR), keep $1k emergency fund', tierLabel: 'Optimal', explanationShort: '22% guaranteed return. $1k is thin but better than paying 22% interest on $3k.', orderingIndex: 1 },
      { optionText: 'Pay off all $3k debt, use $1k from emergency fund', tierLabel: 'Optimal', explanationShort: 'Eliminate 22% debt completely. Rebuild emergency fund aggressively after.', orderingIndex: 2 },
      { optionText: 'Add $2k to emergency fund, keep paying minimum on debt', tierLabel: 'Risky', explanationShort: 'You\'re paying 22% interest ($660/year) while money sits in savings earning 4%. Bad math.', orderingIndex: 4 },
      { optionText: 'Split: $1k to debt, $1k to emergency fund', tierLabel: 'Reasonable', explanationShort: 'Balanced but you\'re still paying 22% on $2k debt. Paying off debt is better.', orderingIndex: 3 },
    ],
  },
  {
    dateKey: '2026-01-23',
    title: 'Mortgage Prepayment vs Investing',
    scenarioText: 'You have extra $500/mo. Mortgage is $250k at 4% APR (25 years left). Invest or prepay?',
    assumptions: 'You\'re 35, earn $85k/year, in the 24% tax bracket. Mortgage interest is tax-deductible. You\'re maxing 401k match. You have 6-month emergency fund. Stock market averages 10% long-term. You plan to stay in home 10+ years.',
    category: 'Housing',
    difficulty: 2,
    isPublished: true,
    options: [
      { optionText: 'Invest $500/mo in Roth IRA - tax-free growth beats 4% mortgage', tierLabel: 'Optimal', explanationShort: 'After-tax mortgage rate is ~3%. Market returns ~10%. Math favors investing, especially in Roth.', orderingIndex: 1 },
      { optionText: 'Split: $300 invest, $200 prepay mortgage', tierLabel: 'Optimal', explanationShort: 'Balanced approach. Growth from investing plus peace of mind from lower debt.', orderingIndex: 2 },
      { optionText: 'Prepay mortgage - guaranteed 4% return, peace of mind', tierLabel: 'Reasonable', explanationShort: 'Safe return but you can likely beat 4% in market. Still, peace of mind has value.', orderingIndex: 3 },
      { optionText: 'Use $500/mo for lifestyle upgrades', tierLabel: 'Risky', explanationShort: 'You\'re giving up either 4% guaranteed return or 10% market growth for spending. Poor choice.', orderingIndex: 4 },
    ],
  },
  {
    dateKey: '2026-01-24',
    title: 'Windfall: $25,000 Inheritance',
    scenarioText: 'You inherited $25,000. You have some financial goals but also want to treat yourself.',
    assumptions: 'You\'re 38, earn $75k/year. You have $8k credit card debt at 19% APR. You have 2-month emergency fund ($6k). Mortgage: $180k at 5% (20 years left). You\'re maxing 401k match. You have $50k in retirement accounts. Monthly expenses: $4,200.',
    category: 'Windfall',
    difficulty: 2,
    isPublished: true,
    options: [
      { optionText: 'Pay off $8k credit card debt (19% APR), boost emergency fund to 6 months ($12k), invest $5k in Roth IRA', tierLabel: 'Optimal', explanationShort: 'Kill 19% debt first, build safety net, then invest for future. Smart allocation.', orderingIndex: 1 },
      { optionText: 'Pay off credit card (19% APR), invest remaining $17k in Roth IRA and 401k', tierLabel: 'Optimal', explanationShort: 'Eliminate high-interest debt, maximize tax-advantaged growth. Excellent long-term thinking.', orderingIndex: 2 },
      { optionText: 'Pay off credit card, spend $5k on vacation, invest $12k', tierLabel: 'Reasonable', explanationShort: 'Balance responsibility with enjoyment. Acceptable if you need the morale boost.', orderingIndex: 3 },
      { optionText: 'Invest all $25k while keeping 19% credit card debt', tierLabel: 'Risky', explanationShort: '19% guaranteed loss vs ~10% market return. You\'re losing money every month.', orderingIndex: 4 },
    ],
  },
  {
    dateKey: '2026-01-25',
    title: 'Budgeting: Dining Out Reduction',
    scenarioText: 'You spend $600/mo on dining out. You want to cut this in half to save $300/mo.',
    assumptions: 'You earn $65k/year. You dine out 8x/month at average $75 per meal. You enjoy it but want to save more. You have $3k credit card debt at 18% APR. You have 2-month emergency fund. You can cook but it takes time.',
    category: 'Budgeting',
    difficulty: 1,
    isPublished: true,
    options: [
      { optionText: 'Cut to $300/mo, use savings to pay off 18% credit card debt', tierLabel: 'Optimal', explanationShort: '18% guaranteed return on debt payoff. You still get some dining out enjoyment.', orderingIndex: 1 },
      { optionText: 'Cut to $300/mo, invest $300/mo in Roth IRA', tierLabel: 'Optimal', explanationShort: 'Build wealth while still enjoying dining out. Smart long-term thinking.', orderingIndex: 2 },
      { optionText: 'Cut to $150/mo, save $450/mo total', tierLabel: 'Reasonable', explanationShort: 'More aggressive savings but less enjoyment. Valid if you\'re motivated.', orderingIndex: 3 },
      { optionText: 'Keep spending $600/mo, cut something else instead', tierLabel: 'Risky', explanationShort: 'If dining out is your biggest discretionary expense, cutting it makes the most sense.', orderingIndex: 4 },
    ],
  },
  {
    dateKey: '2026-01-26',
    title: 'Target Date Fund vs Index Funds',
    scenarioText: 'You\'re 30, starting retirement savings. Target date 2060 fund (0.15% fee) or S&P 500 index (0.03% fee)?',
    assumptions: 'You earn $70k/year. You can invest $500/mo. You have 35 years until retirement. Target date fund: auto-rebalances, includes bonds. S&P 500: 100% stocks, lower fee. You\'re comfortable with risk. You\'re maxing 401k match.',
    category: 'Investing',
    difficulty: 2,
    isPublished: true,
    options: [
      { optionText: 'Target date fund - auto-rebalancing, diversification, set it and forget it', tierLabel: 'Optimal', explanationShort: '0.12% fee difference is worth it for automatic rebalancing and diversification. Less work.', orderingIndex: 1 },
      { optionText: 'S&P 500 index - lower fee, 100% stocks for 35 years', tierLabel: 'Optimal', explanationShort: 'Lower fee, higher growth potential with 35 years. Valid if you can handle volatility.', orderingIndex: 2 },
      { optionText: 'Split: $300 target date, $200 S&P 500', tierLabel: 'Reasonable', explanationShort: 'Diversification plus growth. Slightly more complex but balanced approach.', orderingIndex: 3 },
      { optionText: 'Wait to invest, save cash for now', tierLabel: 'Risky', explanationShort: 'You\'re losing 35 years of compound growth. Time in market beats timing the market.', orderingIndex: 4 },
    ],
  },
  {
    dateKey: '2026-01-27',
    title: 'Umbrella Insurance Coverage',
    scenarioText: 'You have $500k in assets. Umbrella insurance costs $200/year for $1M coverage. Worth it?',
    assumptions: 'You earn $100k/year. You have home ($300k), retirement accounts ($150k), savings ($50k). Your auto and home insurance liability limits are $300k. Umbrella covers above those limits. You have teenage driver. You\'re in the 24% tax bracket.',
    category: 'Insurance',
    difficulty: 2,
    isPublished: true,
    options: [
      { optionText: 'Get $1M umbrella policy - protects $500k assets for $200/year', tierLabel: 'Optimal', explanationShort: '$200/year protects $500k. If you\'re sued, you could lose everything. Cheap peace of mind.', orderingIndex: 1 },
      { optionText: 'Get $2M umbrella policy for extra protection', tierLabel: 'Optimal', explanationShort: 'Only slightly more expensive, protects future asset growth. Smart if you can afford it.', orderingIndex: 2 },
      { optionText: 'Skip umbrella, rely on auto/home liability limits', tierLabel: 'Reasonable', explanationShort: 'Valid if you have few assets. But with $500k, you\'re risking a lot to save $200/year.', orderingIndex: 3 },
      { optionText: 'Skip umbrella, invest $200/year instead', tierLabel: 'Risky', explanationShort: '$200/year investment won\'t protect you from lawsuit that could take your $500k assets.', orderingIndex: 4 },
    ],
  },
  {
    dateKey: '2026-01-28',
    title: 'Debt Snowball vs Debt Avalanche',
    scenarioText: 'You have 3 debts: $2k at 18% (min $50), $5k at 12% (min $100), $8k at 6% (min $200). Extra $300/mo.',
    assumptions: 'You earn $60k/year. Total minimum payments: $350/mo. You can pay $650/mo total. You have 2-month emergency fund. No other debts. You\'re contributing to 401k match. Credit scores: all debts affect it equally.',
    category: 'Debt',
    difficulty: 2,
    isPublished: true,
    options: [
      { optionText: 'Avalanche: Pay $350/mo extra on 18% debt first (saves most interest)', tierLabel: 'Optimal', explanationShort: 'Mathematically optimal. Saves $540/year in interest vs snowball. Best financial outcome.', orderingIndex: 1 },
      { optionText: 'Snowball: Pay $350/mo extra on $2k debt first (quick win)', tierLabel: 'Optimal', explanationShort: 'Psychological win keeps you motivated. Costs $540/year more but may prevent giving up.', orderingIndex: 2 },
      { optionText: 'Split extra $300 across all debts proportionally', tierLabel: 'Reasonable', explanationShort: 'Balanced approach but not optimal. You pay more interest than focusing on highest rate.', orderingIndex: 3 },
      { optionText: 'Pay minimums, invest $300/mo instead', tierLabel: 'Risky', explanationShort: 'Paying 18% and 12% interest while investing. Market would need 18%+ return to break even.', orderingIndex: 4 },
    ],
  },
  {
    dateKey: '2026-01-29',
    title: 'Roth Conversion Strategy',
    scenarioText: 'You\'re 45, have $200k in Traditional 401k. Should you convert some to Roth IRA?',
    assumptions: 'You earn $95k/year, in the 24% tax bracket. You expect to be in 22% bracket in retirement. Traditional 401k: $200k. You have $20k cash for taxes. You have 20 years until retirement. Conversion would be taxed at 24% now.',
    category: 'Tax Planning',
    difficulty: 3,
    isPublished: true,
    options: [
      { optionText: 'Convert $20k/year over 10 years (spread tax hit, hedge rate changes)', tierLabel: 'Optimal', explanationShort: 'Tax diversification. If rates rise, you win. If rates fall, you lose some but have flexibility.', orderingIndex: 1 },
      { optionText: 'Convert $50k now while in 24% bracket (if you expect higher rates later)', tierLabel: 'Optimal', explanationShort: 'If you expect 24%+ rates in retirement, convert now. Lock in current rate.', orderingIndex: 2 },
      { optionText: 'Don\'t convert, stay in Traditional (expect lower rate in retirement)', tierLabel: 'Reasonable', explanationShort: 'Valid if you expect 22% or lower in retirement. But rates may rise. Risky assumption.', orderingIndex: 3 },
      { optionText: 'Convert all $200k now (pay $48k taxes)', tierLabel: 'Risky', explanationShort: 'Huge tax hit now. If rates are lower in retirement, you overpaid. Too aggressive.', orderingIndex: 4 },
    ],
  },
  {
    dateKey: '2026-01-30',
    title: 'Home Warranty Decision',
    scenarioText: 'Home warranty costs $600/year. Covers major appliances and systems. Worth it?',
    assumptions: 'You own a 10-year-old home. You have $8k emergency fund. Monthly expenses: $4,500. You earn $80k/year. Average repair costs: HVAC $4k, water heater $1,200, appliances $500-1,500. Warranty has $75 service call fee. You\'re handy but not for major systems.',
    category: 'Housing',
    difficulty: 1,
    isPublished: true,
    options: [
      { optionText: 'Skip warranty, add $600/year to emergency fund (self-insure)', tierLabel: 'Optimal', explanationShort: 'If no claims, you keep the money. $8k fund can cover most repairs. Better than paying for unused warranty.', orderingIndex: 1 },
      { optionText: 'Get warranty for peace of mind (if you can\'t afford big repairs)', tierLabel: 'Optimal', explanationShort: 'If $4k HVAC repair would break you, warranty makes sense. Peace of mind has value.', orderingIndex: 2 },
      { optionText: 'Get warranty, it\'s only $50/mo', tierLabel: 'Reasonable', explanationShort: 'Reasonable if you value predictability. But most years you\'ll pay more than you get back.', orderingIndex: 3 },
      { optionText: 'Get warranty, skip increasing emergency fund', tierLabel: 'Risky', explanationShort: 'Warranty doesn\'t cover everything. You still need emergency fund for non-covered issues.', orderingIndex: 4 },
    ],
  },
  {
    dateKey: '2026-01-31',
    title: 'Estate Planning: Will vs Trust Decision',
    scenarioText: 'You have $500k in assets (home, retirement, savings). You\'re married with 2 kids. Need estate planning.',
    assumptions: 'You\'re 42, earn $90k/year. Spouse earns $60k/year. Assets: $300k home, $150k retirement, $50k savings. Kids are 8 and 10. Simple will costs $500. Revocable living trust costs $2,500. You want to avoid probate. Estate tax exemption is $13M+ (not a concern). You may move states.',
    category: 'Estate Planning',
    difficulty: 2,
    isPublished: true,
    options: [
      { optionText: 'Get revocable living trust - avoids probate, easier for heirs', tierLabel: 'Optimal', explanationShort: '$2,500 is worth it to avoid probate costs (3-7% of estate). Easier transition for kids if you die.', orderingIndex: 1 },
      { optionText: 'Get simple will for now ($500), upgrade to trust later if assets grow', tierLabel: 'Optimal', explanationShort: 'Cost-effective now. If assets grow to $1M+, probate becomes more expensive. Can upgrade later.', orderingIndex: 2 },
      { optionText: 'Get will, add payable-on-death beneficiaries to accounts', tierLabel: 'Reasonable', explanationShort: 'POD accounts avoid probate for those assets. Cheaper but less comprehensive than trust.', orderingIndex: 3 },
      { optionText: 'Skip estate planning, spouse will inherit everything automatically', tierLabel: 'Risky', explanationShort: 'What if you both die? Kids get assets through probate (expensive, slow). No guardianship plan.', orderingIndex: 4 },
    ],
  },
];

async function seed() {
  console.log('🌱 Starting seed process...');

  for (const challengeData of seedChallenges) {
    const { options, ...challengeFields } = challengeData;
    
    try {
      const [existingChallenge] = await db
        .select()
        .from(dailyChallenges)
        .where(eq(dailyChallenges.dateKey, challengeFields.dateKey))
        .limit(1);

      if (existingChallenge) {
        console.log(`⏭️  Challenge for ${challengeFields.dateKey} already exists, skipping...`);
        continue;
      }

      const [newChallenge] = await db
        .insert(dailyChallenges)
        .values({
          dateKey: challengeFields.dateKey,
          title: challengeFields.title,
          scenarioText: challengeFields.scenarioText,
          assumptions: challengeFields.assumptions,
          category: challengeFields.category,
          difficulty: challengeFields.difficulty,
          isPublished: challengeFields.isPublished,
          source: 'manual',
        })
        .returning();

      const optionsToInsert = options.map(opt => ({
        challengeId: newChallenge.id,
        optionText: opt.optionText,
        tierLabel: opt.tierLabel,
        explanationShort: opt.explanationShort,
        orderingIndex: opt.orderingIndex,
      }));

      await db.insert(challengeOptions).values(optionsToInsert);

      console.log(`✅ Created challenge: ${challengeFields.title} (${challengeFields.dateKey})`);
    } catch (error) {
      console.error(`❌ Error creating challenge for ${challengeFields.dateKey}:`, error);
    }
  }

  console.log('🎉 Seed process completed!');
  process.exit(0);
}

seed().catch((error) => {
  console.error('❌ Seed failed:', error);
  process.exit(1);
});
