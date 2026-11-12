import { describe, expect, it } from 'vitest';
import { calculateFinancialPlan, convertCurrencyAmount } from '@/lib/finance';

describe('calculateFinancialPlan', () => {
  it('computes annual total expenses, scholarship offsets, and funding gap accurately', () => {
    const result = calculateFinancialPlan({
      currency: 'EUR',
      annualTuition: 3000,
      monthlyLivingExpenses: 400,
      monthlyAccommodation: 500,
      annualInsurance: 200,
      annualTravelCosts: 1000,
      scholarshipTuitionCovered: 3000,
      scholarshipMonthlyStipend: 500,
      scholarshipAnnualOtherGrant: 0,
      personalAnnualBudget: 2500,
    });

    // Tuition (3000) + Living&Acc ((400+500)*12 = 10800) + Ins&Travel (1200) = 15000
    expect(result.totalEstimatedAnnualExpenses).toBe(15000);
    // Scholarship = 3000 + (500*12 = 6000) = 9000
    expect(result.scholarshipContribution).toBe(9000);
    expect(result.remainingAnnualCost).toBe(6000);
    expect(result.monthlyEstimatedBudgetNeeded).toBe(500);
    // Out-of-pocket 6000 - personal budget 2500 = 3500 gap
    expect(result.fundingGap).toBe(3500);
    expect(result.surplusAmount).toBe(0);
    expect(result.percentageCoveredByScholarship).toBe(60);
  });

  it('computes surplus and caps tuition waiver coverage at actual tuition', () => {
    const result = calculateFinancialPlan({
      currency: 'EUR',
      annualTuition: 2000,
      monthlyLivingExpenses: 300,
      monthlyAccommodation: 300,
      annualInsurance: 0,
      annualTravelCosts: 500,
      scholarshipTuitionCovered: 5000, // exceeds tuition -> capped to 2000
      scholarshipMonthlyStipend: 700, // 8400/yr -> exceeds remaining -> capped at total
      scholarshipAnnualOtherGrant: 0,
      personalAnnualBudget: 1500,
    });

    expect(result.totalEstimatedAnnualExpenses).toBe(9700);
    expect(result.scholarshipContribution).toBe(9700);
    expect(result.remainingAnnualCost).toBe(0);
    expect(result.fundingGap).toBe(0);
    expect(result.surplusAmount).toBe(1500);
    expect(result.percentageCoveredByScholarship).toBe(100);
  });

  it('converts amounts cleanly between FX rates per USD', () => {
    // 1000 EUR at 0.92 EUR/USD -> USD -> NPR at 134.5 NPR/USD
    const converted = convertCurrencyAmount(920, 0.92, 134.5);
    expect(converted).toBeCloseTo(134500, 1);
  });
});
