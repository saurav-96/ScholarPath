export interface FinancialPlanInput {
  currency: string;
  annualTuition: number;
  monthlyLivingExpenses: number;
  monthlyAccommodation: number;
  annualInsurance: number;
  annualTravelCosts: number;
  scholarshipTuitionCovered: number;
  scholarshipMonthlyStipend: number;
  scholarshipAnnualOtherGrant: number;
  personalAnnualBudget: number;
}

export interface FinancialPlanOutput {
  totalEstimatedAnnualExpenses: number;
  tuitionExpense: number;
  livingAndAccommodationExpense: number;
  insuranceAndTravelExpense: number;
  scholarshipContribution: number;
  remainingAnnualCost: number;
  monthlyEstimatedBudgetNeeded: number;
  fundingGap: number;
  surplusAmount: number;
  percentageCoveredByScholarship: number;
}

function nonNegative(value: number): number {
  return Number.isFinite(value) && value > 0 ? value : 0;
}

export function calculateFinancialPlan(input: FinancialPlanInput): FinancialPlanOutput {
  const tuitionExpense = nonNegative(input.annualTuition);
  const livingAndAccommodationExpense =
    (nonNegative(input.monthlyLivingExpenses) + nonNegative(input.monthlyAccommodation)) * 12;
  const insuranceAndTravelExpense =
    nonNegative(input.annualInsurance) + nonNegative(input.annualTravelCosts);

  const totalEstimatedAnnualExpenses =
    tuitionExpense + livingAndAccommodationExpense + insuranceAndTravelExpense;

  const rawScholarship =
    Math.min(tuitionExpense, nonNegative(input.scholarshipTuitionCovered)) +
    nonNegative(input.scholarshipMonthlyStipend) * 12 +
    nonNegative(input.scholarshipAnnualOtherGrant);

  const scholarshipContribution = Math.min(totalEstimatedAnnualExpenses, rawScholarship);
  const remainingAnnualCost = Math.max(0, totalEstimatedAnnualExpenses - scholarshipContribution);
  const monthlyEstimatedBudgetNeeded = remainingAnnualCost / 12;

  const budget = nonNegative(input.personalAnnualBudget);
  const fundingGap = Math.max(0, remainingAnnualCost - budget);
  const surplusAmount = Math.max(0, budget - remainingAnnualCost);

  const percentageCoveredByScholarship =
    totalEstimatedAnnualExpenses > 0
      ? Math.min(100, Math.round((scholarshipContribution / totalEstimatedAnnualExpenses) * 100))
      : 100;

  return {
    totalEstimatedAnnualExpenses,
    tuitionExpense,
    livingAndAccommodationExpense,
    insuranceAndTravelExpense,
    scholarshipContribution,
    remainingAnnualCost,
    monthlyEstimatedBudgetNeeded,
    fundingGap,
    surplusAmount,
    percentageCoveredByScholarship,
  };
}

export const SUPPORTED_CURRENCIES = [
  'EUR',
  'USD',
  'GBP',
  'CAD',
  'AUD',
  'NOK',
  'DKK',
  'SEK',
  'JPY',
  'KRW',
  'NPR',
] as const;

export function convertCurrencyAmount(
  amount: number,
  fromRatePerUsd: number,
  toRatePerUsd: number,
): number {
  if (!Number.isFinite(amount) || fromRatePerUsd <= 0 || toRatePerUsd <= 0) {
    return amount;
  }
  const usdValue = amount / fromRatePerUsd;
  return usdValue * toRatePerUsd;
}
