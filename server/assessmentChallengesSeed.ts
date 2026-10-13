/**
 * Assessment-only challenges (newest dateKey per category wins in getAssessmentChallenges).
 * Plain-language situations people actually run into—rank what you’d most likely do.
 */
export const ASSESSMENT_SCENARIO_CHALLENGES = [
  {
    dateKey: '2032-06-01',
    title: 'Need car insurance',
    scenarioText:
      'You need car insurance before you can register the car and drive legally. The first quote feels high. What would you try first?',
    assumptions:
      'You need the car for work. You have a week or two to sort this out. Shopping around takes a little time.',
    category: 'Insurance',
    difficulty: 1,
    isPublished: true,
    options: [
      {
        optionText: 'Compare several quotes with the same coverage levels',
        tierLabel: 'Optimal',
        explanationShort: 'Price and coverage vary a lot; comparison is the default move.',
        orderingIndex: 1,
      },
      {
        optionText: 'Ask your home or renters insurer if bundling lowers the rate',
        tierLabel: 'Reasonable',
        explanationShort: 'Often a quick win if you already have a policy.',
        orderingIndex: 2,
      },
      {
        optionText: 'Buy the cheapest legal minimum without comparing further',
        tierLabel: 'Reasonable',
        explanationShort: 'Meets the law; you might miss better value or enough coverage.',
        orderingIndex: 3,
      },
      {
        optionText: 'Put it off and drive anyway without insurance',
        tierLabel: 'Risky',
        explanationShort: 'Illegal in most places and financially dangerous.',
        orderingIndex: 4,
      },
    ],
  },
  {
    dateKey: '2032-06-02',
    title: 'Investment dipped',
    scenarioText:
      'You invest $5,000 in a broad stock fund. About two weeks later it’s worth roughly $3,800. Nothing else in your life changed. What would you most likely do?',
    assumptions:
      'You don’t need this money for at least a few years. You’re not living paycheck to paycheck.',
    category: 'Investing',
    difficulty: 1,
    isPublished: true,
    options: [
      {
        optionText: 'Leave it invested and stick to your long-term plan',
        tierLabel: 'Optimal',
        explanationShort: 'Short-term swings are normal for stocks; long horizon matters.',
        orderingIndex: 1,
      },
      {
        optionText: 'Move it to savings or a money market so you don’t have to watch it',
        tierLabel: 'Reasonable',
        explanationShort: 'Calms anxiety; may miss recovery and long-term growth.',
        orderingIndex: 2,
      },
      {
        optionText: 'Buy a little more while prices are lower (if you can afford to)',
        tierLabel: 'Reasonable',
        explanationShort: 'Can make sense; only if cash flow and risk tolerance allow.',
        orderingIndex: 3,
      },
      {
        optionText: 'Sell now to stop the loss',
        tierLabel: 'Risky',
        explanationShort: 'Locks in a loss on a long-term holding.',
        orderingIndex: 4,
      },
    ],
  },
  {
    dateKey: '2032-06-03',
    title: 'Credit card balance stuck',
    scenarioText:
      'You have about $4,000 on a credit card at a high interest rate. Paying the minimums is easy, but the balance barely moves. What would you most likely do next?',
    assumptions:
      'Your credit is okay. You might qualify for a 0% balance-transfer offer. No other crisis hit this month.',
    category: 'Debt',
    difficulty: 1,
    isPublished: true,
    options: [
      {
        optionText: 'Pay as aggressively as you can above the minimum',
        tierLabel: 'Optimal',
        explanationShort: 'Directly attacks interest.',
        orderingIndex: 1,
      },
      {
        optionText: 'Move it to a 0% balance transfer and pay it down before the promo ends',
        tierLabel: 'Optimal',
        explanationShort: 'Cuts interest if you follow through.',
        orderingIndex: 2,
      },
      {
        optionText: 'Take a consolidation loan if the rate clearly beats the card',
        tierLabel: 'Reasonable',
        explanationShort: 'Can work; watch fees and don’t run the cards back up.',
        orderingIndex: 3,
      },
      {
        optionText: 'Keep paying minimums (or ignore it) and deal with it later',
        tierLabel: 'Risky',
        explanationShort: 'Interest keeps compounding against you.',
        orderingIndex: 4,
      },
    ],
  },
  {
    dateKey: '2032-06-04',
    title: 'Tax surprise',
    scenarioText:
      'You expected a refund, but you owe a little this year. You’d like steadier paychecks and fewer surprises. What would you try first?',
    assumptions: 'W-2 job. You can change withholding. You’re not sure how much to adjust.',
    category: 'Tax Planning',
    difficulty: 1,
    isPublished: true,
    options: [
      {
        optionText: 'Use the IRS withholding estimator and update your W-4',
        tierLabel: 'Optimal',
        explanationShort: 'Targets the right withholding for your situation.',
        orderingIndex: 1,
      },
      {
        optionText: 'Ask payroll or HR how to adjust withholding',
        tierLabel: 'Reasonable',
        explanationShort: 'Gets you moving; may be generic.',
        orderingIndex: 2,
      },
      {
        optionText: 'Set aside a fixed amount from each paycheck for taxes',
        tierLabel: 'Reasonable',
        explanationShort: 'Discipline; doesn’t fix withholding by itself.',
        orderingIndex: 3,
      },
      {
        optionText: 'Ignore it until next year’s filing',
        tierLabel: 'Risky',
        explanationShort: 'Repeats the surprise.',
        orderingIndex: 4,
      },
    ],
  },
  {
    dateKey: '2032-06-05',
    title: 'Running short before payday',
    scenarioText:
      'You’re running out of money before the end of the month. Bills still get paid, but it feels tight. What would you try first?',
    assumptions:
      'Income is fairly stable. You’re not sure where the money goes. Credit is available but expensive.',
    category: 'Budgeting',
    difficulty: 1,
    isPublished: true,
    options: [
      {
        optionText: 'Track spending closely for a few weeks (app or simple list)',
        tierLabel: 'Optimal',
        explanationShort: 'You need visibility before cutting blindly.',
        orderingIndex: 1,
      },
      {
        optionText: 'Cut specific expenses you already know are optional',
        tierLabel: 'Reasonable',
        explanationShort: 'Fast; may miss the real leak.',
        orderingIndex: 2,
      },
      {
        optionText: 'Look for ways to increase income (extra hours, side work)',
        tierLabel: 'Reasonable',
        explanationShort: 'Helps if spending is already lean.',
        orderingIndex: 3,
      },
      {
        optionText: 'Use credit cards or a line of credit to bridge the gap',
        tierLabel: 'Risky',
        explanationShort: 'Can deepen the hole without a plan.',
        orderingIndex: 4,
      },
    ],
  },
  {
    dateKey: '2032-06-06',
    title: 'Car repair, thin savings',
    scenarioText:
      'Your car needs about $2,000 in repairs to stay reliable for work. You only have about $500 saved. What would you most likely do?',
    assumptions:
      'Transit isn’t realistic for your commute. The shop offers financing. Your card APR is high.',
    category: 'Emergency Fund',
    difficulty: 1,
    isPublished: true,
    options: [
      {
        optionText: 'Use 0% or low promo financing if you can get it, with a payoff plan',
        tierLabel: 'Optimal',
        explanationShort: 'Structured plan beats random high-interest charges.',
        orderingIndex: 1,
      },
      {
        optionText: 'Take the shop payment plan if the rate is reasonable',
        tierLabel: 'Reasonable',
        explanationShort: 'Gets you back on the road; compare total cost.',
        orderingIndex: 2,
      },
      {
        optionText: 'Borrow from family or a friend with a clear payback date',
        tierLabel: 'Reasonable',
        explanationShort: 'Cheap money if the relationship can handle it.',
        orderingIndex: 3,
      },
      {
        optionText: 'Put the whole repair on a high-interest card with no payoff plan',
        tierLabel: 'Risky',
        explanationShort: 'Interest stacks fast.',
        orderingIndex: 4,
      },
    ],
  },
  {
    dateKey: '2032-06-07',
    title: 'Rent going up',
    scenarioText:
      'Your rent is going up when the lease renews. You could get a roommate, move farther out, or stay and adjust other spending. What would you lean toward first?',
    assumptions:
      'You care about commute and moving costs. You’re conflicted.',
    category: 'Housing',
    difficulty: 1,
    isPublished: true,
    options: [
      {
        optionText: 'Run the numbers: roommate vs moving vs staying, then decide',
        tierLabel: 'Optimal',
        explanationShort: 'Compares total cost and lifestyle.',
        orderingIndex: 1,
      },
      {
        optionText: 'Stay put and cut other categories to absorb the increase',
        tierLabel: 'Reasonable',
        explanationShort: 'Avoids moving hassle if the math works.',
        orderingIndex: 2,
      },
      {
        optionText: 'Get a roommate if you can tolerate sharing space',
        tierLabel: 'Reasonable',
        explanationShort: 'Splits housing cost when it’s a fit.',
        orderingIndex: 3,
      },
      {
        optionText: 'Move or sign without comparing total costs',
        tierLabel: 'Risky',
        explanationShort: 'Easy to underestimate hidden costs and stress.',
        orderingIndex: 4,
      },
    ],
  },
  {
    dateKey: '2032-06-08',
    title: 'Another big car bill',
    scenarioText:
      'Your car needs another expensive repair. You could fix it again, buy a cheap used car, or finance something newer. You need wheels for work soon. What would you most likely do?',
    assumptions:
      'You have some cash, not enough for a great car outright.',
    category: 'Car Purchase',
    difficulty: 1,
    isPublished: true,
    options: [
      {
        optionText: 'Compare repair vs replace using total cost of ownership',
        tierLabel: 'Optimal',
        explanationShort: 'Avoids throwing good money after bad.',
        orderingIndex: 1,
      },
      {
        optionText: 'Finance a reliable used car with a payment you can afford',
        tierLabel: 'Reasonable',
        explanationShort: 'Predictable if the budget truly fits.',
        orderingIndex: 2,
      },
      {
        optionText: 'Repair again if it buys enough reliable months to plan your next step',
        tierLabel: 'Reasonable',
        explanationShort: 'Bridge solution if the fix is sound.',
        orderingIndex: 3,
      },
      {
        optionText: 'Buy the cheapest car you find without a mechanic check',
        tierLabel: 'Risky',
        explanationShort: 'High breakdown risk.',
        orderingIndex: 4,
      },
    ],
  },
  {
    dateKey: '2032-06-09',
    title: 'Big raise',
    scenarioText:
      'Your pay just went from about $80k to about $110k. What would you most likely do with the extra first?',
    assumptions:
      'No urgent debt crisis. You already contribute something to retirement.',
    category: 'Income',
    difficulty: 1,
    isPublished: true,
    options: [
      {
        optionText: 'Automate extra to savings or debt payoff before lifestyle creeps',
        tierLabel: 'Optimal',
        explanationShort: 'Locks in the win.',
        orderingIndex: 1,
      },
      {
        optionText: 'Increase retirement contributions to match the higher income',
        tierLabel: 'Reasonable',
        explanationShort: 'Uses the raise for future you.',
        orderingIndex: 2,
      },
      {
        optionText: 'Treat yourself a little, then decide where the rest goes',
        tierLabel: 'Reasonable',
        explanationShort: 'Balances reward and structure.',
        orderingIndex: 3,
      },
      {
        optionText: 'Upgrade your lifestyle across the board right away',
        tierLabel: 'Risky',
        explanationShort: 'The raise can disappear into fixed costs.',
        orderingIndex: 4,
      },
    ],
  },
  {
    dateKey: '2032-06-10',
    title: 'Unexpected bonus',
    scenarioText:
      'You get an unexpected $1,200 bonus after taxes. You have some credit card debt and a small emergency fund. What would you most likely do with most of it?',
    assumptions:
      'The card isn’t at 0% APR. You’re not behind on bills.',
    category: 'Windfall',
    difficulty: 1,
    isPublished: true,
    options: [
      {
        optionText: 'Put most toward the high-interest debt',
        tierLabel: 'Optimal',
        explanationShort: 'Guaranteed savings vs interest.',
        orderingIndex: 1,
      },
      {
        optionText: 'Save most of it for emergencies',
        tierLabel: 'Reasonable',
        explanationShort: 'Makes sense if the fund is thin.',
        orderingIndex: 2,
      },
      {
        optionText: 'Split: part to debt, part to savings, maybe a small splurge',
        tierLabel: 'Reasonable',
        explanationShort: 'Balances priorities and morale.',
        orderingIndex: 3,
      },
      {
        optionText: 'Treat yourself with most of it',
        tierLabel: 'Risky',
        explanationShort: 'Fun now; debt still costs.',
        orderingIndex: 4,
      },
    ],
  },
];
