import React, { useState, useMemo } from 'react';
import { Layout } from '@/components/layout';
import { getCurrentUser, calculateAge } from '@/lib/api';
import { useQuery } from '@tanstack/react-query';
import { Calculator, TrendingUp, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { UserAuth } from '@/components/UserAuth';
import { SEO } from '@/components/SEO';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from 'recharts';

const DEFAULT_RETIREMENT_AGE = 65;

// --- Debt Calculator helpers ---
function getDebtResults(principal: number, annualRatePct: number, termYears: number) {
  if (principal <= 0 || termYears <= 0) return null;
  const monthlyRate = annualRatePct / 100 / 12;
  const numMonths = Math.round(termYears * 12);
  if (numMonths <= 0) return null;
  let monthlyPayment: number;
  if (monthlyRate <= 0) {
    monthlyPayment = principal / numMonths;
  } else {
    const factor = Math.pow(1 + monthlyRate, numMonths);
    monthlyPayment = (principal * monthlyRate * factor) / (factor - 1);
  }
  const totalPaid = monthlyPayment * numMonths;
  const totalInterest = totalPaid - principal;
  return { monthlyPayment, totalPaid, totalInterest, numMonths };
}

function getDebtBalanceOverTime(
  principal: number,
  annualRatePct: number,
  monthlyPayment: number,
  termYears: number
): { year: number; balance: number }[] {
  const monthlyRate = annualRatePct / 100 / 12;
  const numMonths = Math.round(termYears * 12);
  const data: { year: number; balance: number }[] = [{ year: 0, balance: principal }];
  let balance = principal;
  for (let month = 1; month <= numMonths; month++) {
    const interest = balance * monthlyRate;
    const principalPayment = Math.min(monthlyPayment - interest, balance);
    balance -= principalPayment;
    if (balance < 0.01) balance = 0;
    if (month % 12 === 0) {
      data.push({ year: month / 12, balance: Math.round(balance * 100) / 100 });
    }
  }
  if (numMonths % 12 !== 0 && balance >= 0.01) {
    data.push({ year: termYears, balance: Math.round(balance * 100) / 100 });
  }
  return data;
}

function getDebtBalanceOverTimeWithExtra(
  principal: number,
  annualRatePct: number,
  monthlyPayment: number,
  extraAmount: number,
  frequency: 'perYear' | 'perMonth'
): { year: number; balance: number }[] {
  const monthlyRate = annualRatePct / 100 / 12;
  const data: { year: number; balance: number }[] = [{ year: 0, balance: principal }];
  let balance = principal;
  const extraPerMonth = frequency === 'perMonth' ? extraAmount : 0;
  const extraPerYear = frequency === 'perYear' ? extraAmount : 0;
  for (let month = 1; balance > 0.01 && month <= 600; month++) {
    const interest = balance * monthlyRate;
    let principalPayment = monthlyPayment - interest;
    if (principalPayment >= balance) {
      principalPayment = balance;
      balance = 0;
    } else {
      balance -= principalPayment;
    }
    if (frequency === 'perMonth' && extraPerMonth > 0 && balance > 0.01) {
      balance -= Math.min(extraPerMonth, balance);
    }
    if (frequency === 'perYear' && month % 12 === 0 && balance > 0.01 && extraPerYear > 0) {
      balance -= Math.min(extraPerYear, balance);
    }
    if (balance < 0.01) balance = 0;
    if (month % 12 === 0) {
      data.push({ year: month / 12, balance: Math.round(balance * 100) / 100 });
    }
  }
  return data;
}

function getDebtWithExtraPayment(
  principal: number,
  annualRatePct: number,
  monthlyPayment: number,
  extraAmount: number,
  frequency: 'perYear' | 'perMonth'
) {
  const monthlyRate = annualRatePct / 100 / 12;
  let balance = principal;
  let month = 0;
  let totalInterest = 0;
  const extraPerMonth = frequency === 'perMonth' ? extraAmount : 0;
  const extraPerYear = frequency === 'perYear' ? extraAmount : 0;
  while (balance > 0.01 && month < 600) {
    const interest = balance * monthlyRate;
    totalInterest += interest;
    let principalPayment = monthlyPayment - interest;
    if (principalPayment >= balance) {
      principalPayment = balance;
      balance = 0;
    } else {
      balance -= principalPayment;
    }
    if (frequency === 'perMonth' && extraPerMonth > 0 && balance > 0.01) {
      const extra = Math.min(extraPerMonth, balance);
      balance -= extra;
    }
    month++;
    if (frequency === 'perYear' && month > 0 && month % 12 === 0 && balance > 0.01 && extraPerYear > 0) {
      const extra = Math.min(extraPerYear, balance);
      balance -= extra;
    }
  }
  return { monthsToPayoff: month, totalInterest };
}

// --- Investment Projection helpers ---
function getProjectionData(
  monthlyContribution: number,
  annualGrowthPct: number,
  maxYears: number,
  startingBalance: number = 0
): { year: number; balance: number }[] {
  const monthlyRate = annualGrowthPct / 100 / 12;
  const data: { year: number; balance: number }[] = [{ year: 0, balance: startingBalance }];
  let balance = startingBalance;
  for (let y = 1; y <= maxYears; y++) {
    for (let m = 0; m < 12; m++) {
      balance += monthlyContribution;
      balance *= 1 + monthlyRate;
    }
    data.push({ year: y, balance: Math.round(balance * 100) / 100 });
  }
  return data;
}

function getBalanceAtYear(
  monthlyContribution: number,
  annualGrowthPct: number,
  years: number,
  startingBalance: number = 0
): number {
  const data = getProjectionData(monthlyContribution, annualGrowthPct, years, startingBalance);
  return data[data.length - 1]?.balance ?? 0;
}

/**
 * Solve for monthly contribution C so that after `years` with startingBalance and growth we reach target.
 * FV = startingBalance*(1+r)^n + C * (((1+r)^n - 1) / r). Returns null if invalid or already reachable.
 */
function getMonthlyContributionForGoal(
  target: number,
  annualGrowthPct: number,
  years: number,
  startingBalance: number = 0
): number | null {
  if (target <= 0 || years <= 0) return null;
  if (target < startingBalance) return null;
  const n = Math.round(years * 12);
  if (n <= 0) return null;
  const r = annualGrowthPct / 100 / 12;
  const growthFactor = Math.pow(1 + r, n);
  const futureStart = startingBalance * growthFactor;
  if (target <= futureStart) return null;
  let contribution: number;
  if (r <= 0) {
    contribution = (target - startingBalance) / n;
  } else {
    const annuityFactor = (growthFactor - 1) / r;
    contribution = (target - futureStart) / annuityFactor;
  }
  return contribution < 0 ? null : Math.round(contribution * 100) / 100;
}

export default function Tools() {
  const { data: authData, isLoading: authLoading } = useQuery({
    queryKey: ['auth-user'],
    queryFn: getCurrentUser,
  });
  const isAuthenticated = authData?.isAuthenticated ?? false;
  const user = authData?.user;
  const age = user?.birthday ? calculateAge(user.birthday) : null;
  const yearsUntilRetirement = age !== null ? Math.max(0, DEFAULT_RETIREMENT_AGE - age) : null;

  // Debt state
  const [debtAmount, setDebtAmount] = useState('');
  const [debtRate, setDebtRate] = useState('');
  const [debtYears, setDebtYears] = useState('');
  const [debtExtraAmount, setDebtExtraAmount] = useState('');
  const [debtExtraFrequency, setDebtExtraFrequency] = useState<'perYear' | 'perMonth'>('perYear');

  // Investment state
  const [invMode, setInvMode] = useState<'projection' | 'goal'>('projection');
  const [invMonthly, setInvMonthly] = useState('500');
  const [invGrowth, setInvGrowth] = useState('7');
  const [invStartingBalance, setInvStartingBalance] = useState('');
  const [invGoalTarget, setInvGoalTarget] = useState('');
  const [retirementAge, setRetirementAge] = useState(String(DEFAULT_RETIREMENT_AGE));
  const [timeRange, setTimeRange] = useState<'5' | '10' | '15' | '20' | '25' | '30' | 'retirement'>('retirement');

  const debtPrincipal = parseFloat(debtAmount) || 0;
  const debtRateNum = parseFloat(debtRate) || 0;
  const debtYearsNum = parseFloat(debtYears) || 0;

  const debtResults = useMemo(
    () => getDebtResults(debtPrincipal, debtRateNum, debtYearsNum),
    [debtPrincipal, debtRateNum, debtYearsNum]
  );

  const debtExtraAmountNum = parseFloat(debtExtraAmount) || 0;
  const debtExtraResults = useMemo(() => {
    if (!debtResults || debtPrincipal <= 0) return null;
    const defaultExtra = debtExtraFrequency === 'perYear' ? debtResults.monthlyPayment : 0;
    const amount = debtExtraAmountNum > 0 ? debtExtraAmountNum : defaultExtra;
    if (debtExtraFrequency === 'perMonth' && amount <= 0) return null;
    if (debtExtraFrequency === 'perYear' && amount <= 0) return null;
    return getDebtWithExtraPayment(
      debtPrincipal,
      debtRateNum,
      debtResults.monthlyPayment,
      amount,
      debtExtraFrequency
    );
  }, [debtResults, debtPrincipal, debtRateNum, debtExtraAmountNum, debtExtraFrequency]);

  const debtBalanceData = useMemo(() => {
    if (!debtResults || debtPrincipal <= 0 || debtYearsNum <= 0) return [];
    return getDebtBalanceOverTime(
      debtPrincipal,
      debtRateNum,
      debtResults.monthlyPayment,
      debtYearsNum
    );
  }, [debtResults, debtPrincipal, debtRateNum, debtYearsNum]);

  const debtExtraAmountForChart = useMemo(() => {
    if (!debtResults || debtPrincipal <= 0) return 0;
    const defaultExtra = debtExtraFrequency === 'perYear' ? debtResults.monthlyPayment : 0;
    return debtExtraAmountNum > 0 ? debtExtraAmountNum : defaultExtra;
  }, [debtResults, debtPrincipal, debtExtraAmountNum, debtExtraFrequency]);

  const debtBalanceWithExtraData = useMemo(() => {
    if (!debtExtraResults || debtExtraAmountForChart <= 0) return [];
    return getDebtBalanceOverTimeWithExtra(
      debtPrincipal,
      debtRateNum,
      debtResults!.monthlyPayment,
      debtExtraAmountForChart,
      debtExtraFrequency
    );
  }, [debtExtraResults, debtExtraAmountForChart, debtPrincipal, debtRateNum, debtExtraFrequency, debtResults]);

  const debtChartData = useMemo(() => {
    if (debtBalanceData.length === 0) return [];
    if (debtBalanceWithExtraData.length === 0) {
      return debtBalanceData.map((d) => ({ ...d, balanceWithExtra: undefined }));
    }
    const extraByYear: Record<number, number> = {};
    debtBalanceWithExtraData.forEach((d) => {
      extraByYear[d.year] = d.balance;
    });
    return debtBalanceData.map(({ year, balance }) => ({
      year,
      balance,
      balanceWithExtra: extraByYear[year] ?? (year > 0 ? 0 : undefined),
    }));
  }, [debtBalanceData, debtBalanceWithExtraData]);

  const invMonthlyNum = parseFloat(invMonthly) || 0;
  const invGrowthNum = parseFloat(invGrowth) || 0;
  const invStartingBalanceNum = parseFloat(invStartingBalance) || 0;
  const invGoalTargetNum = parseFloat(invGoalTarget) || 0;
  const retirementAgeNum = parseInt(retirementAge, 10) || DEFAULT_RETIREMENT_AGE;
  const invMaxYears =
    timeRange === 'retirement' && yearsUntilRetirement !== null
      ? yearsUntilRetirement
      : parseInt(timeRange, 10) || 20;

  const invGoalResult = useMemo(() => {
    if (invMaxYears <= 0 || invGoalTargetNum <= 0) return null;
    if (invGoalTargetNum < invStartingBalanceNum) return 'target_below_start';
    const c = getMonthlyContributionForGoal(invGoalTargetNum, invGrowthNum, invMaxYears, invStartingBalanceNum);
    if (c === null) return 'already_on_track';
    return c;
  }, [invGoalTargetNum, invGrowthNum, invMaxYears, invStartingBalanceNum]);

  const projectionData = useMemo(() => {
    if (invMaxYears <= 0) return [];
    return getProjectionData(invMonthlyNum, invGrowthNum, invMaxYears, invStartingBalanceNum);
  }, [invMonthlyNum, invGrowthNum, invMaxYears, invStartingBalanceNum]);

  const showRetirementOption = yearsUntilRetirement !== null && yearsUntilRetirement > 0;
  const timeRangeOptions: { value: typeof timeRange; label: string }[] = [
    { value: '5', label: '5 years' },
    { value: '10', label: '10 years' },
    { value: '15', label: '15 years' },
    { value: '20', label: '20 years' },
    { value: '25', label: '25 years' },
    { value: '30', label: '30 years' },
    ...(showRetirementOption ? [{ value: 'retirement' as const, label: `Until retirement (${yearsUntilRetirement} yrs)` }] : []),
  ];

  const milestoneYears = useMemo(() => {
    if (invMaxYears <= 5) return Array.from({ length: invMaxYears + 1 }, (_, i) => i);
    const step = invMaxYears <= 10 ? 1 : invMaxYears <= 20 ? 5 : 5;
    const years: number[] = [];
    for (let y = 0; y <= invMaxYears; y += step) years.push(y);
    if (years[years.length - 1] !== invMaxYears) years.push(invMaxYears);
    return years;
  }, [invMaxYears]);

  const milestoneBalances = useMemo(() => {
    return milestoneYears.map((year) => ({
      year,
      balance: getBalanceAtYear(invMonthlyNum, invGrowthNum, year, invStartingBalanceNum),
      ageAtYear: age !== null ? age + year : null,
    }));
  }, [milestoneYears, invMonthlyNum, invGrowthNum, invStartingBalanceNum, age]);

  const formatCurrency = (n: number) =>
    new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', minimumFractionDigits: 0, maximumFractionDigits: 0 }).format(n);

  if (authLoading) {
    return (
      <Layout>
        <div className="max-w-2xl mx-auto px-4 py-12 flex justify-center">
          <Loader2 className="w-8 h-8 animate-spin text-emerald-600" />
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <SEO
        title="Tools"
        description="Debt payoff and investment projection calculators. Plan payments and see how your savings can grow."
        canonical="/tools"
      />
      <div className="max-w-2xl mx-auto px-4 py-6 sm:py-8">
        <div className="mb-6 sm:mb-8">
          <h1 className="text-2xl sm:text-3xl font-display font-bold text-slate-900">Tools</h1>
          <p className="text-slate-500 mt-1 sm:mt-2 text-sm sm:text-base">
            Plan debt payoff and see how your investments could grow over time.
          </p>
        </div>

        {!isAuthenticated ? (
          <Card className="border-2 border-dashed border-emerald-200 bg-emerald-50/50">
            <CardContent className="p-6 sm:p-8 text-center">
              <div className="w-14 h-14 sm:w-16 sm:h-16 bg-emerald-100 rounded-full mx-auto mb-4 flex items-center justify-center">
                <Calculator className="w-7 h-7 sm:w-8 sm:h-8 text-emerald-600" />
              </div>
              <h2 className="text-xl font-display font-bold text-slate-900 mb-2">Sign in to use Tools</h2>
              <p className="text-slate-600 mb-6 max-w-md mx-auto text-sm sm:text-base">
                Sign in to use the Debt Calculator and Investment Projection. We use your profile age to show projections until retirement.
              </p>
              <div className="flex justify-center">
                <UserAuth />
              </div>
              <p className="text-xs text-slate-500 mt-4">We don’t store your numbers. Everything runs in your browser.</p>
            </CardContent>
          </Card>
        ) : (
          <Tabs defaultValue="debt" className="w-full">
            <TabsList className="grid w-full grid-cols-2 h-auto gap-1 p-1 sm:flex sm:flex-row">
              <TabsTrigger value="debt" className="flex-1 py-2.5 sm:py-2 text-sm flex items-center justify-center gap-2">
                <Calculator className="w-4 h-4 shrink-0" />
                Debt Calculator
              </TabsTrigger>
              <TabsTrigger value="investment" className="flex-1 py-2.5 sm:py-2 text-sm flex items-center justify-center gap-2">
                <TrendingUp className="w-4 h-4 shrink-0" />
                Investment Projection
              </TabsTrigger>
            </TabsList>

            <TabsContent value="debt" className="mt-4 sm:mt-6 space-y-4">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-lg sm:text-xl">
                    <Calculator className="w-5 h-5" />
                    Debt Payoff
                  </CardTitle>
                  <CardDescription>
                    See your monthly payment, total interest, and how much you’d save with one extra payment per year.
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4 sm:space-y-6">
                  <div className="grid gap-4 sm:grid-cols-1">
                    <div className="space-y-2">
                      <Label htmlFor="debt-amount">Amount owed (current balance)</Label>
                      <Input
                        id="debt-amount"
                        type="number"
                        min="0"
                        step="100"
                        placeholder="e.g. 15000"
                        value={debtAmount}
                        onChange={(e) => setDebtAmount(e.target.value)}
                        className="text-base touch-manipulation"
                      />
                      <p className="text-xs text-slate-500">Find this on your statement</p>
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="debt-rate">Annual interest rate (APR %)</Label>
                      <Input
                        id="debt-rate"
                        type="number"
                        min="0"
                        step="0.1"
                        placeholder="e.g. 18.5"
                        value={debtRate}
                        onChange={(e) => setDebtRate(e.target.value)}
                        className="text-base touch-manipulation"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="debt-years">Loan term (years)</Label>
                      <Input
                        id="debt-years"
                        type="number"
                        min="0.5"
                        step="0.5"
                        placeholder="e.g. 5"
                        value={debtYears}
                        onChange={(e) => setDebtYears(e.target.value)}
                        className="text-base touch-manipulation"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>Extra payment (optional)</Label>
                      <div className="flex flex-wrap gap-2 items-center">
                        <span className="text-sm text-slate-600">Apply extra</span>
                        <div className="flex rounded-lg border border-slate-200 overflow-hidden">
                          <button
                            type="button"
                            onClick={() => setDebtExtraFrequency('perYear')}
                            className={`px-3 py-2 text-sm font-medium touch-manipulation ${debtExtraFrequency === 'perYear' ? 'bg-emerald-600 text-white' : 'bg-slate-50 text-slate-700 hover:bg-slate-100'}`}
                          >
                            Per year
                          </button>
                          <button
                            type="button"
                            onClick={() => setDebtExtraFrequency('perMonth')}
                            className={`px-3 py-2 text-sm font-medium touch-manipulation ${debtExtraFrequency === 'perMonth' ? 'bg-emerald-600 text-white' : 'bg-slate-50 text-slate-700 hover:bg-slate-100'}`}
                          >
                            Per month
                          </button>
                        </div>
                        <Input
                          id="debt-extra"
                          type="number"
                          min="0"
                          step="25"
                          placeholder={debtExtraFrequency === 'perYear' ? 'e.g. 1 monthly payment' : 'e.g. 100'}
                          value={debtExtraAmount}
                          onChange={(e) => setDebtExtraAmount(e.target.value)}
                          className="text-base touch-manipulation w-32"
                        />
                      </div>
                      <p className="text-xs text-slate-500">
                        {debtExtraFrequency === 'perYear' ? 'Leave blank to use 1 full monthly payment per year' : 'Extra amount applied every month to principal'}
                      </p>
                    </div>
                  </div>

                  {debtResults && debtPrincipal > 0 && debtYearsNum > 0 && (
                    <>
                      <div className="rounded-xl bg-slate-50 border border-slate-200 p-4 sm:p-5 space-y-3">
                        <p className="text-sm font-medium text-slate-700">
                          You’d pay <span className="font-bold text-slate-900">{formatCurrency(debtResults.monthlyPayment)}</span> per month.
                        </p>
                        <p className="text-sm text-slate-600">
                          Total principal: {formatCurrency(debtPrincipal)} · Total interest: {formatCurrency(debtResults.totalInterest)}
                        </p>
                        <p className="text-sm text-slate-700 font-medium">
                          Total paid (principal + interest): {formatCurrency(debtResults.totalPaid)}
                        </p>
                        <p className="text-xs text-slate-500">
                          You’ll pay {formatCurrency(debtResults.totalInterest)} in interest over the life of the loan.
                        </p>
                        {debtExtraResults && (
                          <div className="pt-3 border-t border-slate-200 space-y-1">
                            <p className="text-sm font-semibold text-emerald-800 mb-1">
                              {debtExtraFrequency === 'perMonth'
                                ? `If you pay an extra ${formatCurrency(debtExtraAmountNum > 0 ? debtExtraAmountNum : 0)} per month:`
                                : debtExtraAmountNum > 0
                                  ? `If you pay an extra ${formatCurrency(debtExtraAmountNum)} per year:`
                                  : 'If you make 1 extra payment per year:'}
                            </p>
                            <p className="text-sm text-slate-700">
                              Pay off in about {Math.ceil(debtExtraResults.monthsToPayoff / 12)} years. You’d save about{' '}
                              {formatCurrency(debtResults.totalInterest - debtExtraResults.totalInterest)} in interest.
                            </p>
                            <p className="text-sm text-slate-600">
                              New total interest: {formatCurrency(debtExtraResults.totalInterest)} · Total paid (principal + interest): {formatCurrency(debtPrincipal + debtExtraResults.totalInterest)}
                            </p>
                          </div>
                        )}
                        <p className="text-xs text-slate-500 italic">This is an estimate. Actual terms may vary.</p>
                      </div>

                      {debtChartData.length > 0 && (
                        <div className="rounded-xl border border-slate-200 overflow-hidden bg-white">
                          <div className="p-3 border-b border-slate-200">
                            <span className="text-sm font-medium text-slate-700">Remaining balance over time</span>
                          </div>
                          <div className="h-[220px] sm:h-[260px] w-full">
                            <ResponsiveContainer width="100%" height="100%">
                              <LineChart data={debtChartData} margin={{ top: 8, right: 8, left: 8, bottom: 8 }}>
                                <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                                <XAxis dataKey="year" tick={{ fontSize: 12 }} stroke="#64748b" />
                                <YAxis tickFormatter={(v) => `$${v >= 1000 ? `${(v / 1000).toFixed(0)}k` : v}`} tick={{ fontSize: 12 }} stroke="#64748b" />
                                <Tooltip
                                  formatter={(value: number, name: string) => [value != null && typeof value === 'number' ? formatCurrency(value) : '—', name]}
                                  labelFormatter={(label) => `Year ${label}`}
                                  contentStyle={{ borderRadius: 8, border: '1px solid #e2e8f0' }}
                                />
                                <Legend />
                                <Line type="monotone" dataKey="balance" stroke="#0d9488" strokeWidth={2} dot={false} name="Regular payment" />
                                {debtBalanceWithExtraData.length > 0 && (
                                  <Line type="monotone" dataKey="balanceWithExtra" stroke="#059669" strokeWidth={2} strokeDasharray="4 4" dot={false} name="With extra payment" />
                                )}
                              </LineChart>
                            </ResponsiveContainer>
                          </div>
                        </div>
                      )}
                    </>
                  )}

                  {!debtResults && (debtAmount !== '' || debtRate !== '' || debtYears !== '') && (debtPrincipal <= 0 || debtYearsNum <= 0) && (
                    <p className="text-sm text-amber-600">Enter a positive amount and term to see results.</p>
                  )}
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="investment" className="mt-4 sm:mt-6 space-y-4">
              {!user?.birthday && (
                <div className="rounded-xl bg-amber-50 border border-amber-200 p-4 text-sm text-amber-800">
                  Add your birthday in Profile to see “Until retirement” and age-based projections.
                </div>
              )}

              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-lg sm:text-xl">
                    <TrendingUp className="w-5 h-5" />
                    Investment Projection
                  </CardTitle>
                  <CardDescription>
                    See how regular monthly contributions could grow. Projections are illustrative and not guaranteed.
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4 sm:space-y-6">
                  <div className="flex flex-wrap gap-2">
                    <span className="text-sm text-slate-600 self-center">I want to:</span>
                    <div className="flex rounded-lg border border-slate-200 overflow-hidden">
                      <button
                        type="button"
                        onClick={() => setInvMode('projection')}
                        className={`px-3 py-2 text-sm font-medium touch-manipulation ${invMode === 'projection' ? 'bg-emerald-600 text-white' : 'bg-slate-50 text-slate-700 hover:bg-slate-100'}`}
                      >
                        See how my savings could grow
                      </button>
                      <button
                        type="button"
                        onClick={() => setInvMode('goal')}
                        className={`px-3 py-2 text-sm font-medium touch-manipulation ${invMode === 'goal' ? 'bg-emerald-600 text-white' : 'bg-slate-50 text-slate-700 hover:bg-slate-100'}`}
                      >
                        See how much to save for a goal
                      </button>
                    </div>
                  </div>

                  {invMode === 'goal' && (
                    <>
                      <div className="grid gap-4 sm:grid-cols-1">
                        <div className="space-y-2">
                          <Label htmlFor="inv-goal-target">Target balance ($)</Label>
                          <Input
                            id="inv-goal-target"
                            type="number"
                            min="0"
                            step="1000"
                            placeholder="e.g. 500000"
                            value={invGoalTarget}
                            onChange={(e) => setInvGoalTarget(e.target.value)}
                            className="text-base touch-manipulation"
                          />
                          <p className="text-xs text-slate-500">Amount you want to reach</p>
                        </div>
                        <div className="space-y-2">
                          <Label>Time horizon</Label>
                          <div className="flex flex-wrap gap-2">
                            {timeRangeOptions.map((opt) => (
                              <Button
                                key={opt.value}
                                type="button"
                                variant={timeRange === opt.value ? 'default' : 'outline'}
                                size="sm"
                                className="touch-manipulation"
                                onClick={() => setTimeRange(opt.value)}
                              >
                                {opt.label}
                              </Button>
                            ))}
                          </div>
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="inv-growth-goal">Expected annual return (%)</Label>
                          <Input
                            id="inv-growth-goal"
                            type="number"
                            min="0"
                            step="0.5"
                            placeholder="7"
                            value={invGrowth}
                            onChange={(e) => setInvGrowth(e.target.value)}
                            className="text-base touch-manipulation"
                          />
                          <p className="text-xs text-slate-500">e.g. 7–10% for long-term market growth</p>
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="inv-starting-goal">Starting balance (optional)</Label>
                          <Input
                            id="inv-starting-goal"
                            type="number"
                            min="0"
                            step="100"
                            placeholder="0"
                            value={invStartingBalance}
                            onChange={(e) => setInvStartingBalance(e.target.value)}
                            className="text-base touch-manipulation"
                          />
                          <p className="text-xs text-slate-500">Current savings or lump sum</p>
                        </div>
                      </div>
                      {invGoalTargetNum > 0 && invMaxYears > 0 && (
                        <div className="rounded-xl bg-slate-50 border border-slate-200 p-4 sm:p-5 space-y-2">
                          {invGoalResult === 'target_below_start' && (
                            <p className="text-sm text-amber-700">Target is below your starting balance. Adjust your goal or starting balance.</p>
                          )}
                          {invGoalResult === 'already_on_track' && (
                            <p className="text-sm text-slate-700">You’re already on track – no additional monthly contribution needed to reach {formatCurrency(invGoalTargetNum)} in {invMaxYears} years with your current starting balance and expected return.</p>
                          )}
                          {typeof invGoalResult === 'number' && (
                            <p className="text-sm text-slate-700">
                              To reach {formatCurrency(invGoalTargetNum)} in {invMaxYears} years, contribute about <span className="font-bold text-slate-900">{formatCurrency(invGoalResult)}</span> per month.
                            </p>
                          )}
                          <p className="text-xs text-slate-500 italic">Projections are illustrative. Growth is not guaranteed.</p>
                        </div>
                      )}
                    </>
                  )}

                  {invMode === 'projection' && (
                    <>
                      <div className="grid gap-4 sm:grid-cols-1">
                        <div className="space-y-2">
                          <Label htmlFor="inv-starting">Starting balance (optional)</Label>
                          <Input
                            id="inv-starting"
                            type="number"
                            min="0"
                            step="100"
                            placeholder="0"
                            value={invStartingBalance}
                            onChange={(e) => setInvStartingBalance(e.target.value)}
                            className="text-base touch-manipulation"
                          />
                          <p className="text-xs text-slate-500">Current savings or lump sum to grow over time</p>
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="inv-monthly">Monthly contribution ($)</Label>
                          <Input
                            id="inv-monthly"
                            type="number"
                            min="0"
                            step="50"
                            placeholder="500"
                            value={invMonthly}
                            onChange={(e) => setInvMonthly(e.target.value)}
                            className="text-base touch-manipulation"
                          />
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="inv-growth">Expected annual return (%)</Label>
                          <Input
                            id="inv-growth"
                            type="number"
                            min="0"
                            step="0.5"
                            placeholder="7"
                            value={invGrowth}
                            onChange={(e) => setInvGrowth(e.target.value)}
                            className="text-base touch-manipulation"
                          />
                          <p className="text-xs text-slate-500">e.g. 7–10% for long-term market growth</p>
                        </div>
                        {user?.birthday && (
                          <div className="space-y-2">
                            <Label htmlFor="retirement-age">Retirement age</Label>
                            <Input
                              id="retirement-age"
                              type="number"
                              min="50"
                              max="80"
                              value={retirementAge}
                              onChange={(e) => setRetirementAge(e.target.value)}
                              className="text-base touch-manipulation"
                            />
                          </div>
                        )}
                        <div className="space-y-2">
                          <Label>Show timeline</Label>
                          <div className="flex flex-wrap gap-2">
                            {timeRangeOptions.map((opt) => (
                              <Button
                                key={opt.value}
                                type="button"
                                variant={timeRange === opt.value ? 'default' : 'outline'}
                                size="sm"
                                className="touch-manipulation"
                                onClick={() => setTimeRange(opt.value)}
                              >
                                {opt.label}
                              </Button>
                            ))}
                          </div>
                        </div>
                      </div>

                  {invMaxYears > 0 && invMonthlyNum >= 0 && invGrowthNum >= 0 && (
                    <>
                      <div className="rounded-xl border border-slate-200 overflow-hidden bg-white">
                        <div className="p-3 border-b border-slate-200">
                          <span className="text-sm font-medium text-slate-700">Projected balance over time</span>
                        </div>
                        <div className="h-[240px] sm:h-[280px] w-full">
                          <ResponsiveContainer width="100%" height="100%">
                            <LineChart data={projectionData} margin={{ top: 8, right: 8, left: 8, bottom: 8 }}>
                              <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                              <XAxis dataKey="year" tick={{ fontSize: 12 }} stroke="#64748b" />
                              <YAxis tickFormatter={(v) => `$${v >= 1000 ? `${(v / 1000).toFixed(0)}k` : v}`} tick={{ fontSize: 12 }} stroke="#64748b" />
                              <Tooltip
                                formatter={(value: number) => [formatCurrency(value), 'Balance']}
                                labelFormatter={(label) => (age !== null ? `Year ${label} · Age ${age + Number(label)}` : `Year ${label}`)}
                                contentStyle={{ borderRadius: 8, border: '1px solid #e2e8f0' }}
                              />
                              <Line type="monotone" dataKey="balance" stroke="#10b981" strokeWidth={2} dot={false} name="Balance" />
                            </LineChart>
                          </ResponsiveContainer>
                        </div>
                      </div>

                      <div className="rounded-xl bg-slate-50 border border-slate-200 p-4 sm:p-5">
                        <p className="text-sm font-medium text-slate-700 mb-3">Balance at selected milestones</p>
                        <ul className="space-y-1.5 text-sm text-slate-700" role="table" aria-label="Projected balance by year">
                          {milestoneBalances.map(({ year, balance, ageAtYear }) => (
                            <li key={year} className="flex justify-between gap-2">
                              <span>
                                {year === invMaxYears && timeRange === 'retirement' ? `At retirement (${year} yrs)` : `In ${year} years`}
                                {ageAtYear !== null && ` · Age ${ageAtYear}`}
                              </span>
                              <span className="font-medium tabular-nums">{formatCurrency(balance)}</span>
                            </li>
                          ))}
                        </ul>
                        <p className="text-xs text-slate-500 mt-3 italic">Projections are illustrative. Growth is not guaranteed.</p>

                        <div className="mt-5 pt-4 border-t border-slate-200">
                          <p className="text-sm font-medium text-slate-700 mb-2">How compound growth works</p>
                          <p className="text-sm text-slate-600 mb-2">
                            Compound growth means you earn returns on your contributions and on past growth. Each period, growth is applied to the new total, so your balance grows faster over time.
                          </p>
                          <p className="text-sm text-slate-600 mb-2">
                            Starting earlier gives more years of compounding, and small, regular contributions add up. Each period: new balance = previous balance × (1 + rate) + contribution.
                          </p>
                        </div>
                      </div>
                    </>
                  )}

                  {invMaxYears <= 0 && showRetirementOption && (
                    <p className="text-sm text-slate-500">You’re at or past retirement age. Choose a custom timeline above.</p>
                  )}
                    </>
                  )}
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        )}
      </div>
    </Layout>
  );
}
