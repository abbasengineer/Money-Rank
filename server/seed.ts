import { db } from './db';
import { dailyChallenges, challengeOptions } from '@shared/schema';
import { format, subDays } from 'date-fns';
import { eq } from 'drizzle-orm';

const seedChallenges = [
  {
    dateKey: format(new Date(), 'yyyy-MM-dd'),
    title: 'Windfall: $10,000 Bonus',
    scenarioText: 'You just received a $10,000 unexpected bonus at work. You have some financial goals in progress.',
    assumptions: 'Assume you have $2k in credit card debt at 22% APR. You have a 1-month emergency fund. You are matching your employer 401k. You want to buy a house in 3 years.',
    category: 'Windfall',
    difficulty: 1,
    isPublished: true,
    options: [
      { optionText: 'Pay off the $2k credit card debt completely', tierLabel: 'Optimal', explanationShort: 'Guaranteed 22% return on investment. Always kill high-interest debt first.', orderingIndex: 1 },
      { optionText: 'Boost emergency fund by $5,000', tierLabel: 'Optimal', explanationShort: 'Getting to 3-6 months of expenses is crucial for stability before aggressive investing.', orderingIndex: 2 },
      { optionText: 'Put $3,000 into a High Yield Savings Account for the house', tierLabel: 'Reasonable', explanationShort: 'Saving for the house is good, but high-interest debt and safety net take priority.', orderingIndex: 3 },
      { optionText: 'Invest all $10,000 in a tech stock ETF', tierLabel: 'Risky', explanationShort: 'Market returns (~10%) usually won\'t beat the 22% debt interest, and you lack a safety net.', orderingIndex: 4 },
    ],
  },
  {
    dateKey: format(subDays(new Date(), 1), 'yyyy-MM-dd'),
    title: 'Subscription Audit',
    scenarioText: 'You are trying to cut $100/mo from your budget. Which cut makes the most sense?',
    assumptions: 'You use the gym 2x/week. You watch Netflix daily. You haven\'t used Audible in 3 months. You order takeout 4x/week.',
    category: 'Budgeting',
    difficulty: 1,
    isPublished: true,
    options: [
      { optionText: 'Cancel Audible ($15/mo) and reduce takeout (save ~$80/mo)', tierLabel: 'Optimal', explanationShort: 'Cut what you don\'t use and reduce high-cost conveniences.', orderingIndex: 1 },
      { optionText: 'Switch to cheaper phone plan (save $30/mo) + cancel Audible', tierLabel: 'Optimal', explanationShort: 'Reducing fixed costs without lifestyle impact is the gold standard.', orderingIndex: 2 },
      { optionText: 'Cancel Netflix ($20/mo)', tierLabel: 'Reasonable', explanationShort: 'A luxury, but if you use it daily, the cost-per-hour is low.', orderingIndex: 3 },
      { optionText: 'Cancel Gym Membership ($50/mo)', tierLabel: 'Risky', explanationShort: 'Health is wealth. If you use it 2x/week, it\'s high value.', orderingIndex: 4 },
    ],
  },
  {
    dateKey: format(subDays(new Date(), 2), 'yyyy-MM-dd'),
    title: 'Emergency Fund Priority',
    scenarioText: 'You have $3,000 saved. Your car needs $1,500 in repairs, and your rent is due in 2 weeks.',
    assumptions: 'You have no credit card debt. Your income is stable. Rent is $1,200/month. The car is necessary for work.',
    category: 'Emergency Fund',
    difficulty: 2,
    isPublished: true,
    options: [
      { optionText: 'Pay for car repairs immediately, use remaining $1,500 for rent', tierLabel: 'Optimal', explanationShort: 'Car is essential for income. Don\'t risk your job.', orderingIndex: 1 },
      { optionText: 'Finance the car repair at 0% for 12 months, keep full $3k liquid', tierLabel: 'Optimal', explanationShort: '0% interest is free money. Keep emergency fund intact.', orderingIndex: 2 },
      { optionText: 'Pay rent first, put car repair on credit card', tierLabel: 'Risky', explanationShort: 'Credit card interest makes this expensive. Only if no 0% option.', orderingIndex: 4 },
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
      { optionText: 'Buy $5k car cash, save rest for maintenance', tierLabel: 'Reasonable', explanationShort: 'No debt but higher maintenance risk with cheaper car.', orderingIndex: 2 },
      { optionText: 'Finance $15k car, $5k down payment', tierLabel: 'Risky', explanationShort: 'High debt-to-income. Monthly payments may strain budget.', orderingIndex: 4 },
      { optionText: 'Lease new car for $300/mo', tierLabel: 'Risky', explanationShort: 'No equity buildup. Expensive long-term for your income level.', orderingIndex: 3 },
    ],
  },
  {
    dateKey: format(subDays(new Date(), 4), 'yyyy-MM-dd'),
    title: 'Employer 401k Match',
    scenarioText: 'Your employer offers 100% match on first 6% of salary. You earn $60k/year.',
    assumptions: 'You have $5k emergency fund. No high-interest debt. Considering retirement vs immediate savings.',
    category: 'Investing',
    difficulty: 1,
    isPublished: true,
    options: [
      { optionText: 'Contribute 6% to get full match ($3,600/year free money)', tierLabel: 'Optimal', explanationShort: 'Instant 100% return. Never leave free money on table.', orderingIndex: 1 },
      { optionText: 'Contribute 3% for now, increase when raises come', tierLabel: 'Reasonable', explanationShort: 'Getting some match is good but you\'re giving up free money.', orderingIndex: 2 },
      { optionText: 'Max out 401k contribution (10%+) for tax benefits', tierLabel: 'Reasonable', explanationShort: 'Good for retirement but may strain current budget unnecessarily.', orderingIndex: 3 },
      { optionText: 'Skip 401k, save in HYSA for flexibility', tierLabel: 'Risky', explanationShort: 'You\'re leaving $3,600/year on the table. Match is guaranteed return.', orderingIndex: 4 },
    ],
  },
  {
    dateKey: format(subDays(new Date(), 5), 'yyyy-MM-dd'),
    title: 'Medical Bill Negotiation',
    scenarioText: 'You received a $2,500 medical bill. Hospital offers payment plan or 20% cash discount.',
    assumptions: 'You have $4k emergency fund. The payment plan is 0% interest for 12 months ($208/mo).',
    category: 'Debt',
    difficulty: 2,
    isPublished: true,
    options: [
      { optionText: 'Take payment plan, keep emergency fund intact', tierLabel: 'Optimal', explanationShort: '0% interest is free money. Don\'t drain emergency fund for this.', orderingIndex: 1 },
      { optionText: 'Negotiate further, aim for 30%+ discount for cash', tierLabel: 'Optimal', explanationShort: 'Medical bills are often negotiable. Counter-offer is smart.', orderingIndex: 2 },
      { optionText: 'Pay $2,000 cash (20% discount), payment plan remaining $500', tierLabel: 'Reasonable', explanationShort: 'Balances savings and cash flow. Acceptable hybrid approach.', orderingIndex: 3 },
      { optionText: 'Drain emergency fund to pay all $2,500 immediately', tierLabel: 'Risky', explanationShort: 'Leaves you with only $1,500 buffer. Not worth it for 0% debt.', orderingIndex: 4 },
    ],
  },
  {
    dateKey: format(subDays(new Date(), 6), 'yyyy-MM-dd'),
    title: 'Student Loan Payoff Strategy',
    scenarioText: 'You have $20k in student loans at 5% interest. Extra $500/month to allocate.',
    assumptions: 'Minimum payment is $200/mo. You have 6-month emergency fund. Employer offers 401k match.',
    category: 'Debt',
    difficulty: 2,
    isPublished: true,
    options: [
      { optionText: 'Put $300 extra toward loans, $200 to retirement', tierLabel: 'Optimal', explanationShort: 'Balance debt payoff with retirement. Don\'t ignore future completely.', orderingIndex: 1 },
      { optionText: 'Pay minimum on loans ($200), put $300 in index funds', tierLabel: 'Reasonable', explanationShort: 'Market may beat 5%, but guaranteed return on debt is safer.', orderingIndex: 3 },
      { optionText: 'Throw all $500 at loans to be debt-free faster', tierLabel: 'Reasonable', explanationShort: 'Aggressive but sacrifices compound growth in prime earning years.', orderingIndex: 2 },
      { optionText: 'Pay minimum, use $300 for lifestyle upgrades', tierLabel: 'Risky', explanationShort: 'You\'re paying 5% interest to fund non-essentials. Poor math.', orderingIndex: 4 },
    ],
  },
  {
    dateKey: format(subDays(new Date(), 7), 'yyyy-MM-dd'),
    title: 'Rent vs Buy Decision',
    scenarioText: 'Currently paying $1,500/mo rent. Can buy similar place with $2,000/mo mortgage (including taxes/insurance).',
    assumptions: 'You have 20% down payment saved. Both are 3-bedroom houses in same area. Plan to stay 5+ years.',
    category: 'Housing',
    difficulty: 3,
    isPublished: true,
    options: [
      { optionText: 'Buy the house - build equity instead of paying landlord', tierLabel: 'Optimal', explanationShort: 'Long-term stability, equity buildup, tax benefits. Extra $500/mo is building wealth.', orderingIndex: 1 },
      { optionText: 'Keep renting, invest the $500 difference in index funds', tierLabel: 'Reasonable', explanationShort: 'Valid if you value flexibility or expect to move. But you said 5+ years.', orderingIndex: 3 },
      { optionText: 'Buy but put less down, invest difference in stock market', tierLabel: 'Risky', explanationShort: 'Leveraging works until it doesn\'t. PMI costs eat returns. Risky.', orderingIndex: 4 },
      { optionText: 'Rent for 1 more year, save bigger down payment (25%+)', tierLabel: 'Reasonable', explanationShort: 'Lower mortgage but you pay $18k to landlord meanwhile. Timing matters.', orderingIndex: 2 },
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
      { optionText: 'Keep current insurance for peace of mind', tierLabel: 'Reasonable', explanationShort: 'Costs $600/year for $500 lower deductible. Emotional decision, not financial.', orderingIndex: 3 },
      { optionText: 'Get quotes from 3+ more companies before deciding', tierLabel: 'Risky', explanationShort: 'Good to shop around but analysis paralysis costs you money monthly.', orderingIndex: 4 },
    ],
  },
  {
    dateKey: format(subDays(new Date(), 9), 'yyyy-MM-dd'),
    title: 'Side Hustle Investment',
    scenarioText: 'You can start a side business for $1,500 setup cost. Potential $500/mo income after 6 months.',
    assumptions: 'You have $5k emergency fund. The business requires 10 hrs/week. Your current job is stable.',
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
    assumptions: 'You pay off balance monthly (no interest). Spending patterns won\'t change. Both have same benefits otherwise.',
    category: 'Budgeting',
    difficulty: 1,
    isPublished: true,
    options: [
      { optionText: 'Switch to 3% card - net gain is $385/year', tierLabel: 'Optimal', explanationShort: '$720 (3% of $24k) minus $95 fee minus $240 (old 1%) = $385 gain.', orderingIndex: 1 },
      { optionText: 'Keep current card, no annual fee to worry about', tierLabel: 'Risky', explanationShort: 'Leaving $385/year on table for simplicity. Bad math.', orderingIndex: 4 },
      { optionText: 'Get both cards, use each for specific categories', tierLabel: 'Reasonable', explanationShort: 'Optimizes returns but adds complexity. Only worth if gains > effort.', orderingIndex: 3 },
      { optionText: 'Negotiate current card for better rewards first', tierLabel: 'Optimal', explanationShort: 'Good try but they usually won\'t match. Still, no harm asking.', orderingIndex: 2 },
    ],
  },
  {
    dateKey: format(subDays(new Date(), 11), 'yyyy-MM-dd'),
    title: 'Mortgage Refinance Decision',
    scenarioText: 'Current mortgage: $200k at 5% (25 years left). Can refinance to 3.5% for $3k closing costs.',
    assumptions: 'Monthly payment would drop from $1,400 to $1,200. Planning to stay in home 10+ years.',
    category: 'Housing',
    difficulty: 3,
    isPublished: true,
    options: [
      { optionText: 'Refinance - break-even in 15 months, save $60k over life of loan', tierLabel: 'Optimal', explanationShort: '$3k cost divided by $200/mo savings = 15 months payback. Then pure savings.', orderingIndex: 1 },
      { optionText: 'Refinance AND reduce term to 15 years', tierLabel: 'Reasonable', explanationShort: 'Builds equity faster but payments may be higher than current. Depends on cashflow.', orderingIndex: 2 },
      { optionText: 'Keep current mortgage, invest closing cost savings instead', tierLabel: 'Risky', explanationShort: 'Market would need to beat guaranteed 1.5% savings. Unlikely and riskier.', orderingIndex: 4 },
      { optionText: 'Shop around for better refi rates before committing', tierLabel: 'Reasonable', explanationShort: 'Smart to compare but don\'t let perfection block good deal. Rates may rise.', orderingIndex: 3 },
    ],
  },
  {
    dateKey: format(subDays(new Date(), 12), 'yyyy-MM-dd'),
    title: 'Tax Refund Allocation',
    scenarioText: 'You just got a $3,000 tax refund. Time to make it work for you.',
    assumptions: 'You have 3-month emergency fund. $1,200 credit card debt at 18% APR. No other high-interest debt.',
    category: 'Windfall',
    difficulty: 1,
    isPublished: true,
    options: [
      { optionText: 'Pay off $1,200 credit card debt, put $1,800 in HYSA', tierLabel: 'Optimal', explanationShort: 'Kill the 18% APR vampire first. Guaranteed return. Boost savings with rest.', orderingIndex: 1 },
      { optionText: 'Pay off credit card, invest remaining $1,800 in index funds', tierLabel: 'Optimal', explanationShort: 'Same smart debt payoff, but growth focus. Depends on risk tolerance.', orderingIndex: 2 },
      { optionText: 'Keep $500 fun money, put $2,500 toward financial goals', tierLabel: 'Reasonable', explanationShort: 'Balance treat-yourself with responsibility. Acceptable if you need morale.', orderingIndex: 3 },
      { optionText: 'Invest all $3k in stocks - debt is manageable', tierLabel: 'Risky', explanationShort: '18% guaranteed loss vs ~10% average market return. Bad bet.', orderingIndex: 4 },
    ],
  },
  {
    dateKey: format(subDays(new Date(), 13), 'yyyy-MM-dd'),
    title: 'College Savings for Kids',
    scenarioText: 'Your child is 5 years old. You can save $300/month for college. Considering 529 vs taxable account.',
    assumptions: '529 has tax benefits but restrictions. Taxable account more flexible. College in 13 years.',
    category: 'Investing',
    difficulty: 2,
    isPublished: true,
    options: [
      { optionText: 'Max out 529 plan - tax-free growth for education', tierLabel: 'Optimal', explanationShort: 'Tax benefits compound. If used for education, it\'s a no-brainer.', orderingIndex: 1 },
      { optionText: 'Split: $200 in 529, $100 in taxable for flexibility', tierLabel: 'Optimal', explanationShort: 'Covers education but keeps options open. Balanced approach.', orderingIndex: 2 },
      { optionText: 'All in taxable account - what if kid doesn\'t go to college?', tierLabel: 'Reasonable', explanationShort: 'Flexibility has value but you\'re paying extra tax for uncertainty. 529s have exceptions.', orderingIndex: 3 },
      { optionText: 'Skip saving, kid can take loans or get scholarships', tierLabel: 'Risky', explanationShort: 'Loans at 6-7% vs tax-free compounding. You\'re hurting your kid\'s financial start.', orderingIndex: 4 },
    ],
  },
  // Continue with more challenges...
  {
    dateKey: format(subDays(new Date(), 14), 'yyyy-MM-dd'),
    title: 'Home Repair Emergency',
    scenarioText: 'Your water heater died. Replacement costs $1,200. You have $2k in emergency fund.',
    assumptions: 'Must fix immediately (no hot water). Can finance at 0% for 12 months or pay cash.',
    category: 'Emergency Fund',
    difficulty: 1,
    isPublished: true,
    options: [
      { optionText: 'Finance at 0% for 12 months, keep emergency fund intact', tierLabel: 'Optimal', explanationShort: '0% is free money. Don\'t drain your safety net for this.', orderingIndex: 1 },
      { optionText: 'Pay cash, rebuild fund over next 6 months', tierLabel: 'Reasonable', explanationShort: 'Acceptable but leaves you thin. Only if financing unavailable.', orderingIndex: 2 },
      { optionText: 'Pay $600 cash, finance remaining $600 at 0%', tierLabel: 'Optimal', explanationShort: 'Hybrid approach balances cash flow and fund preservation.', orderingIndex: 3 },
      { optionText: 'Put on credit card, pay off slowly', tierLabel: 'Risky', explanationShort: 'Why pay 18-24% interest when 0% financing is available?', orderingIndex: 4 },
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
