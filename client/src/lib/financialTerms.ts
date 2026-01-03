// Financial terms that need tooltips with their definitions
// Definitions are based on standard financial education sources

export interface FinancialTerm {
  term: string | RegExp;
  definition: string;
  source?: string;
}

export const financialTerms: FinancialTerm[] = [
  {
    term: /\b529\b/gi,
    definition: 'A 529 plan is a tax-advantaged savings plan designed to encourage saving for future education costs. Earnings grow tax-free and withdrawals are tax-free when used for qualified education expenses.',
    source: 'IRS.gov'
  },
  {
    term: /\btaxable account\b/gi,
    definition: 'A taxable investment account is a standard brokerage account where you pay taxes on dividends, interest, and capital gains in the year they are earned. No tax advantages, but fully flexible.',
    source: 'Investopedia'
  },
  {
    term: /\b401k\b/gi,
    definition: 'A 401(k) is an employer-sponsored retirement savings plan. Contributions are often matched by employers and are made pre-tax, reducing your taxable income. Withdrawals in retirement are taxed as income.',
    source: 'IRS.gov'
  },
  {
    term: /\bHYSA\b/gi,
    definition: 'High Yield Savings Account - A savings account that pays significantly higher interest rates than traditional savings accounts, typically offered by online banks. FDIC insured up to $250,000.',
    source: 'FDIC.gov'
  },
  {
    term: /\bETF\b/gi,
    definition: 'Exchange-Traded Fund - A type of investment fund that holds a collection of stocks, bonds, or other assets and trades on stock exchanges like individual stocks. Offers diversification and low costs.',
    source: 'SEC.gov'
  },
  {
    term: /\bAPR\b/gi,
    definition: 'Annual Percentage Rate - The yearly interest rate charged on borrowed money, including fees. Represents the true cost of borrowing. Higher APR means more expensive debt.',
    source: 'Consumer Financial Protection Bureau'
  },
  {
    term: /\bPMI\b/gi,
    definition: 'Private Mortgage Insurance - Insurance required by lenders when you put down less than 20% on a home. Protects the lender if you default. Typically costs 0.5-1% of loan amount annually.',
    source: 'HUD.gov'
  },
  {
    term: /\bindex funds\b/gi,
    definition: 'A type of mutual fund or ETF that tracks a specific market index (like the S&P 500). Offers broad diversification, low fees, and passive management. Popular for long-term investing.',
    source: 'Investopedia'
  },
  {
    term: /\bemergency fund\b/gi,
    definition: 'A cash reserve set aside to cover unexpected expenses or financial emergencies. Financial experts recommend 3-6 months of living expenses. Should be kept in a liquid, easily accessible account.',
    source: 'Consumer Financial Protection Bureau'
  },
  {
    term: /\bcredit card debt\b/gi,
    definition: 'Money owed on credit cards, typically with high interest rates (15-25% APR). Should be prioritized for payoff because of the high cost of carrying this debt.',
    source: 'Federal Reserve'
  },
  {
    term: /\bstudent loans\b/gi,
    definition: 'Borrowed money used to pay for education expenses. Federal student loans typically have lower interest rates (4-7%) and offer flexible repayment options. Private loans vary widely.',
    source: 'Federal Student Aid'
  },
  {
    term: /\bmortgage\b/gi,
    definition: 'A loan used to purchase real estate, where the property serves as collateral. Typically repaid over 15-30 years. Interest rates vary based on credit score, down payment, and market conditions.',
    source: 'Consumer Financial Protection Bureau'
  },
  {
    term: /\brefinance\b/gi,
    definition: 'Replacing an existing loan with a new loan, typically to get a lower interest rate or change loan terms. Involves closing costs, so only makes sense if savings exceed costs.',
    source: 'Consumer Financial Protection Bureau'
  },
  {
    term: /\bdown payment\b/gi,
    definition: 'The initial upfront payment made when purchasing a home or other expensive asset. Typically 10-20% of purchase price. Larger down payments reduce loan amount and may eliminate PMI.',
    source: 'HUD.gov'
  },
  {
    term: /\bwindfall\b/gi,
    definition: 'A windfall is unexpected or unplanned money you receive, such as a bonus, tax refund, inheritance, or other one-time income. These scenarios focus on how to wisely allocate unexpected money when you don\'t have a plan.',
    source: 'Financial Planning Standards'
  },
];

// Helper function to find all financial terms in text
export function findFinancialTerms(text: string): Array<{ term: FinancialTerm; match: string; index: number; length: number }> {
  const matches: Array<{ term: FinancialTerm; match: string; index: number; length: number }> = [];
  
  financialTerms.forEach(termDef => {
    const regex = termDef.term instanceof RegExp ? termDef.term : new RegExp(`\\b${termDef.term}\\b`, 'gi');
    let match;
    const regexCopy = new RegExp(regex.source, regex.flags);
    
    while ((match = regexCopy.exec(text)) !== null) {
      const matchIndex = match.index;
      const matchLength = match[0].length;
      
      // Check if this match overlaps with an existing match
      const overlaps = matches.some(m => {
        const mEnd = m.index + m.length;
        const matchEnd = matchIndex + matchLength;
        return (matchIndex >= m.index && matchIndex < mEnd) || 
               (m.index >= matchIndex && m.index < matchEnd);
      });
      
      if (!overlaps) {
        matches.push({
          term: termDef,
          match: match[0],
          index: matchIndex,
          length: matchLength,
        });
      }
    }
  });
  
  // Sort by index to process in order
  return matches.sort((a, b) => a.index - b.index);
}

