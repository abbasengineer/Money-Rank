import { db } from './db';
import { dailyChallenges, challengeOptions } from '@shared/schema';
import { format, subDays } from 'date-fns';
import { eq } from 'drizzle-orm';

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
    assumptions: 'You earn $50k/year. Total monthly expenses are $3,200. You use the gym 2x/week ($50/mo). You watch Netflix daily ($20/mo). You haven\'t used Audible in 3 months ($15/mo). You order takeout 4x/week (~$80/mo). You\'re trying to save for a vacation.',
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
    assumptions: 'You earn $45k/year. Monthly expenses are $2,800. You have no credit card debt. Your income is stable. Rent is $1,200/month. The car is necessary for work. No other major expenses expected this month.',
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
    assumptions: 'You\'re 28 years old. You have $5k emergency fund (2 months expenses). No high-interest debt. You\'re in the 22% tax bracket. No other retirement savings yet. Monthly expenses are $2,500.',
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
    assumptions: 'You earn $55k/year. Monthly expenses are $3,500. You have $4k emergency fund. You have health insurance but hit your deductible. The payment plan is 0% interest for 12 months ($208/mo). No other major expenses expected.',
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
    assumptions: 'You\'re 26 years old, earn $55k/year, in the 22% tax bracket. Minimum payment is $200/mo. You have 6-month emergency fund ($15k). Employer offers 401k match (6%). No other major financial goals right now. Federal loans (not private).',
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
    assumptions: 'You earn $75k/year. Job is stable. You have 20% down payment saved ($60k). Both are 3-bedroom houses in same area. Plan to stay 5+ years. Estimated maintenance: $200/mo average. Closing costs: $8k. Property taxes and insurance included in mortgage payment.',
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
      { optionText: 'Keep current card, no annual fee to worry about', tierLabel: 'Risky', explanationShort: 'Leaving $385/year on table for simplicity. Bad math.', orderingIndex: 4 },
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
      { optionText: 'Keep current mortgage, invest closing cost savings instead', tierLabel: 'Risky', explanationShort: 'Market would need to beat guaranteed 1.5% savings. Unlikely and riskier.', orderingIndex: 4 },
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
    assumptions: 'You earn $75k/year. Only one child. You\'re already saving for retirement (401k match). Your state offers tax deduction for 529 contributions. 529 has tax benefits but restrictions. Taxable account more flexible. College in 13 years. Estimated cost: $200k+ for 4 years.',
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
    assumptions: 'You earn $55k/year. Monthly expenses are $3,200. Must fix immediately (no hot water). Can finance at 0% for 12 months or pay cash. No other major expenses expected soon. Your emergency fund represents about 2.5 months of expenses.',
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
      { optionText: 'Skip 401k, invest in taxable brokerage for flexibility', tierLabel: 'Risky', explanationShort: 'You\'re giving up tax advantages and employer match. Bad move.', orderingIndex: 4 },
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
      { optionText: 'Lease - lower monthly payment, upgrade in 3 years', tierLabel: 'Risky', explanationShort: 'You\'re paying $12,600 for temporary use. No equity. Expensive long-term.', orderingIndex: 4 },
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
      { optionText: 'Consolidate - save on interest, simplify payments', tierLabel: 'Optimal', explanationShort: 'Lower rate saves thousands. Single payment is easier to manage. Cut up the cards.', orderingIndex: 1 },
      { optionText: 'Consolidate AND pay extra $100/mo to finish faster', tierLabel: 'Optimal', explanationShort: 'Same benefits but debt-free sooner. Saves even more interest.', orderingIndex: 2 },
      { optionText: 'Keep separate cards, pay highest rate first (avalanche)', tierLabel: 'Reasonable', explanationShort: 'Mathematically similar but more complex. Works if you\'re disciplined.', orderingIndex: 3 },
      { optionText: 'Transfer balances to 0% card, pay off in 18 months', tierLabel: 'Risky', explanationShort: 'Good if you can pay off in promo period. But if you can\'t, rate jumps to 25%+.', orderingIndex: 4 },
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
      { optionText: 'Keep in HYSA - guaranteed 4%, no risk of loss', tierLabel: 'Optimal', explanationShort: '2-year timeline is too short for stocks. Can\'t afford to lose down payment money.', orderingIndex: 1 },
      { optionText: 'Split: $800 HYSA, $400 in conservative index funds', tierLabel: 'Reasonable', explanationShort: 'Some growth potential but risky. If market drops, you delay purchase.', orderingIndex: 3 },
      { optionText: 'All in stock market - maximize growth for 2 years', tierLabel: 'Risky', explanationShort: 'Market could drop 20% right when you need it. Down payment timeline is too short.', orderingIndex: 4 },
      { optionText: 'HYSA + cut expenses to save $1,500/mo instead', tierLabel: 'Optimal', explanationShort: 'Guaranteed safe growth plus faster savings. Best of both worlds.', orderingIndex: 2 },
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
      { optionText: 'Get $500k term policy - covers mortgage + 5 years expenses', tierLabel: 'Optimal', explanationShort: 'Adequate coverage at low cost. Term is the smart choice for most people.', orderingIndex: 1 },
      { optionText: 'Get $750k term policy for extra security', tierLabel: 'Optimal', explanationShort: 'More coverage gives spouse more options. Still affordable at ~$75/mo.', orderingIndex: 2 },
      { optionText: 'Skip insurance, invest the $50/mo instead', tierLabel: 'Risky', explanationShort: 'If you die, family loses your income. $50/mo is cheap peace of mind.', orderingIndex: 4 },
      { optionText: 'Get whole life policy - builds cash value', tierLabel: 'Risky', explanationShort: '10x more expensive. Cash value grows slowly. Term + invest difference is better.', orderingIndex: 3 },
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
      { optionText: 'HSA plan but don\'t contribute - just save the premium', tierLabel: 'Risky', explanationShort: 'You\'re missing out on tax benefits. HSA is the best retirement account if used right.', orderingIndex: 4 },
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
      { optionText: 'Basic refresh - better ROI, less risk', tierLabel: 'Optimal', explanationShort: '$12k value gain on $15k spend = 80% ROI. Full reno only 80% ROI too, but more risk.', orderingIndex: 1 },
      { optionText: 'Full renovation - you\'ll enjoy it 5 years, worth the extra', tierLabel: 'Reasonable', explanationShort: 'If you value quality of life, it\'s reasonable. But financially, basic is better.', orderingIndex: 3 },
      { optionText: 'Do nothing, invest the $25k instead', tierLabel: 'Risky', explanationShort: 'Kitchen affects home value significantly. You may lose more in home value than market gains.', orderingIndex: 4 },
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
      { optionText: 'Rebalance to 60% stocks, 40% bonds (age-appropriate)', tierLabel: 'Reasonable', explanationShort: 'Conservative but safe. Rule of thumb works for risk-averse investors.', orderingIndex: 3 },
      { optionText: 'Keep 90/10 - you have 25 years, can ride out volatility', tierLabel: 'Optimal', explanationShort: 'With 25 years, stocks historically outperform. Bonds reduce growth unnecessarily.', orderingIndex: 1 },
      { optionText: 'Move to 70/30 - balance growth and stability', tierLabel: 'Optimal', explanationShort: 'Good middle ground. Some protection without sacrificing too much growth.', orderingIndex: 2 },
      { optionText: 'Go 100% stocks - maximize growth for retirement', tierLabel: 'Risky', explanationShort: 'Too aggressive. No buffer for market downturns. Even 25 years out, some bonds help.', orderingIndex: 4 },
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
      { optionText: 'Take payday loan, pay it back immediately', tierLabel: 'Risky', explanationShort: '$75 fee on $500 for 2 weeks = 390% APR. Terrible deal even if you pay on time.', orderingIndex: 4 },
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
      { optionText: 'Fix the car - $3,500 for 2-3 years is cheaper than payments', tierLabel: 'Optimal', explanationShort: '$3,500 ÷ 30 months = $117/mo. Way cheaper than $250-450/mo car payment.', orderingIndex: 1 },
      { optionText: 'Buy $12k used car in cash, sell old car for parts ($1k)', tierLabel: 'Optimal', explanationShort: 'If repairs are too risky, reliable used car is smart. Pay cash to avoid interest.', orderingIndex: 2 },
      { optionText: 'Finance new $25k car - warranty and reliability', tierLabel: 'Risky', explanationShort: '$450/mo × 60 months = $27k. Overkill when $12k car works fine.', orderingIndex: 4 },
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
      { optionText: 'Skip investing, pay down 4% mortgage faster', tierLabel: 'Risky', explanationShort: '4% mortgage vs 10% average market return. Math favors investing, especially in Roth.', orderingIndex: 4 },
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
      { optionText: 'Cut groceries - buy only essentials', tierLabel: 'Risky', explanationShort: 'Food is essential. Better to cut dining out and entertainment first.', orderingIndex: 4 },
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
      { optionText: 'Get the coverage - protects your biggest asset (income)', tierLabel: 'Optimal', explanationShort: '$50/mo for $4,000/mo protection. Your income is worth millions over lifetime.', orderingIndex: 1 },
      { optionText: 'Get coverage + increase emergency fund to 6 months', tierLabel: 'Optimal', explanationShort: 'Insurance + savings = comprehensive protection. Best risk management.', orderingIndex: 2 },
      { optionText: 'Skip insurance, rely on emergency fund and SSDI', tierLabel: 'Risky', explanationShort: '3 months won\'t cover long-term disability. SSDI is hard to get and pays little.', orderingIndex: 4 },
      { optionText: 'Get cheaper policy with longer elimination period', tierLabel: 'Reasonable', explanationShort: 'Saves money but you need larger emergency fund to cover waiting period.', orderingIndex: 3 },
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
      { optionText: 'Pay down mortgage - guaranteed 4% return', tierLabel: 'Reasonable', explanationShort: 'Safe return but you can likely beat 4% in market. Still, peace of mind has value.', orderingIndex: 3 },
      { optionText: 'Invest all $50k in taxable brokerage for flexibility', tierLabel: 'Risky', explanationShort: 'Missing tax advantages of 401k/529. Paying taxes on gains unnecessarily.', orderingIndex: 4 },
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
      { optionText: 'Max 401k + catch-up ($30k total), cut expenses to free up cash', tierLabel: 'Optimal', explanationShort: 'Aggressive savings with tax benefits. Time to get serious about retirement.', orderingIndex: 1 },
      { optionText: 'Increase to 15% of salary, max catch-up contributions', tierLabel: 'Optimal', explanationShort: 'Significant increase without cutting lifestyle. Still aggressive savings.', orderingIndex: 2 },
      { optionText: 'Keep current 6%, invest extra in taxable account', tierLabel: 'Reasonable', explanationShort: 'Less aggressive but maintains flexibility. May not be enough for comfortable retirement.', orderingIndex: 3 },
      { optionText: 'Delay retirement to 70, keep current savings rate', tierLabel: 'Risky', explanationShort: 'Gives more time but you\'re gambling on health and job availability at 70.', orderingIndex: 4 },
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
