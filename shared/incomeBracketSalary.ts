/** Must match `incomeBracket` on assessment / user demographics. */
export type IncomeBracketKey =
  | '<50k'
  | '50-100k'
  | '100-150k'
  | '150-200k'
  | '200-300k'
  | '300k+';

/**
 * Returns true if annual salary (USD) falls inside the selected bracket.
 * Range labels like "$50k – $100k" treat the upper bound as inclusive; adjacent brackets meet at
 * boundaries without overlap (e.g. $100k is only `50-100k`; `100-150k` starts above $100k).
 */
export function isAnnualSalaryInIncomeBracket(salaryUsd: number, bracket: IncomeBracketKey): boolean {
  if (!Number.isFinite(salaryUsd) || salaryUsd <= 0) return false;
  /** Whole dollars — avoids float noise from client rounding (e.g. 149999.9999999). */
  const salary = Math.round(salaryUsd);
  switch (bracket) {
    case '<50k':
      return salary < 50_000;
    case '50-100k':
      return salary >= 50_000 && salary <= 100_000;
    case '100-150k':
      return salary > 100_000 && salary <= 150_000;
    case '150-200k':
      return salary > 150_000 && salary <= 200_000;
    case '200-300k':
      return salary > 200_000 && salary <= 300_000;
    case '300k+':
      return salary > 300_000;
    default:
      return false;
  }
}

/** Human-readable range for helper text (USD, annual). */
export function incomeBracketSalaryHint(bracket: IncomeBracketKey): string {
  switch (bracket) {
    case '<50k':
      return 'under $50,000';
    case '50-100k':
      return '$50,000–$100,000';
    case '100-150k':
      return '$100,001–$150,000';
    case '150-200k':
      return '$150,001–$200,000';
    case '200-300k':
      return '$200,001–$300,000';
    case '300k+':
      return 'more than $300,000';
    default:
      return '';
  }
}
