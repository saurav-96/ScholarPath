import { useEffect, useMemo, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import {
  Bar,
  BarChart,
  CartesianGrid,
  Legend,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { Calculator, Info, RefreshCw } from 'lucide-react';
import { PageMeta } from '@/components/common/PageMeta';
import { Badge, Button, Card, Input, Select } from '@/components/ui/Primitives';
import { useCatalogData, useUserWorkspace } from '@/hooks/useScholarPathData';
import {
  SUPPORTED_CURRENCIES,
  calculateFinancialPlan,
  convertCurrencyAmount,
} from '@/lib/finance';
import { formatCurrency } from '@/lib/utils';
import {
  FALLBACK_REFERENCE_RATES_PER_USD,
  type FxRatesSnapshot,
  fetchReferenceFxRates,
} from '@/services/fxService';

export function CalculatorPage() {
  const [searchParams] = useSearchParams();
  const { countries, universities, scholarships } = useCatalogData();
  const { userState } = useUserWorkspace();

  const initialCountry = searchParams.get('country') ?? 'IT';
  const [selectedCountryCode, setSelectedCountryCode] = useState(initialCountry);
  const [selectedUniversityId, setSelectedUniversityId] = useState('');
  const [selectedScholarshipId, setSelectedScholarshipId] = useState('');

  // Planning figures (in active currency)
  const [currency, setCurrency] = useState('EUR');
  const [annualTuition, setAnnualTuition] = useState(3200);
  const [monthlyLivingExpenses, setMonthlyLivingExpenses] = useState(450);
  const [monthlyAccommodation, setMonthlyAccommodation] = useState(420);
  const [annualInsurance, setAnnualInsurance] = useState(250);
  const [annualTravelCosts, setAnnualTravelCosts] = useState(1100);
  const [scholarshipTuitionCovered, setScholarshipTuitionCovered] = useState(3200);
  const [scholarshipMonthlyStipend, setScholarshipMonthlyStipend] = useState(550);
  const [scholarshipAnnualOtherGrant, setScholarshipAnnualOtherGrant] = useState(0);
  const [personalAnnualBudget, setPersonalAnnualBudget] = useState(2000);

  // FX Conversion state
  const [fxSnapshot, setFxSnapshot] = useState<FxRatesSnapshot>({
    baseCurrency: 'USD',
    ratesPerUsd: { ...FALLBACK_REFERENCE_RATES_PER_USD },
    sourceLabel: 'Indicative baseline (click Refresh FX for ECB reference rates)',
    isLive: false,
    asOfDate: 'Indicative',
  });
  const [loadingFx, setLoadingFx] = useState(false);
  const [displayCurrency, setDisplayCurrency] = useState('NPR');
  const [useCustomRate, setUseCustomRate] = useState(false);
  const [customRateValue, setCustomRateValue] = useState<string>('146.2');

  async function refreshRates() {
    setLoadingFx(true);
    const snap = await fetchReferenceFxRates();
    setFxSnapshot(snap);
    setLoadingFx(false);
  }

  // Preset handlers
  function applyCountryPreset(code: string) {
    setSelectedCountryCode(code);
    const c = countries.find((item) => item.code === code);
    if (!c) return;
    const planCur = SUPPORTED_CURRENCIES.includes(c.currencyCode as (typeof SUPPORTED_CURRENCIES)[number])
      ? c.currencyCode
      : 'EUR';
    setCurrency(planCur);
    const avgLiving =
      c.livingCostMonthlyMin && c.livingCostMonthlyMax
        ? Math.round((c.livingCostMonthlyMin + c.livingCostMonthlyMax) / 2)
        : 900;
    setMonthlyAccommodation(Math.round(avgLiving * 0.5));
    setMonthlyLivingExpenses(Math.round(avgLiving * 0.5));
  }

  function applyUniversityPreset(uniId: string) {
    setSelectedUniversityId(uniId);
    const u = universities.find((item) => item.id === uniId);
    if (!u) return;
    setSelectedCountryCode(u.countryCode);
    const cur = SUPPORTED_CURRENCIES.includes(u.tuitionCurrency as (typeof SUPPORTED_CURRENCIES)[number])
      ? u.tuitionCurrency
      : currency;
    setCurrency(cur);
    if (u.tuitionMinAnnual !== null) {
      setAnnualTuition(u.tuitionMinAnnual);
    }
    if (u.estimatedLivingMonthly !== null) {
      setMonthlyAccommodation(Math.round(u.estimatedLivingMonthly * 0.5));
      setMonthlyLivingExpenses(Math.round(u.estimatedLivingMonthly * 0.5));
    }
  }

  function applyScholarshipPreset(schId: string) {
    setSelectedScholarshipId(schId);
    const s = scholarships.find((item) => item.id === schId);
    if (!s) return;
    setScholarshipTuitionCovered(
      s.tuitionCoverage.status === 'confirmed'
        ? annualTuition
        : s.tuitionCoverage.status === 'conditional'
          ? Math.round(annualTuition * 0.5)
          : 0,
    );
    setScholarshipMonthlyStipend(s.livingCoverage.amountMonthly ?? 0);
    setScholarshipAnnualOtherGrant(0);
  }

  // Sync user's profile max budget once if present
  useEffect(() => {
    if (userState?.profile.maxAnnualBudgetUsd) {
      const rate = fxSnapshot.ratesPerUsd[currency] ?? 1;
      setPersonalAnnualBudget(Math.round(userState.profile.maxAnnualBudgetUsd * rate));
    }
  }, [userState?.profile.maxAnnualBudgetUsd, currency, fxSnapshot.ratesPerUsd]);

  const plan = useMemo(
    () =>
      calculateFinancialPlan({
        currency,
        annualTuition,
        monthlyLivingExpenses,
        monthlyAccommodation,
        annualInsurance,
        annualTravelCosts,
        scholarshipTuitionCovered,
        scholarshipMonthlyStipend,
        scholarshipAnnualOtherGrant,
        personalAnnualBudget,
      }),
    [
      currency,
      annualTuition,
      monthlyLivingExpenses,
      monthlyAccommodation,
      annualInsurance,
      annualTravelCosts,
      scholarshipTuitionCovered,
      scholarshipMonthlyStipend,
      scholarshipAnnualOtherGrant,
      personalAnnualBudget,
    ],
  );

  const conversionResult = useMemo(() => {
    const fromRate = fxSnapshot.ratesPerUsd[currency] ?? 1;
    const targetRefRate = fxSnapshot.ratesPerUsd[displayCurrency] ?? 1;
    const numericCustom = Number(customRateValue);

    if (useCustomRate && Number.isFinite(numericCustom) && numericCustom > 0) {
      // Custom rate defines: 1 unit of planning currency = X units of displayCurrency
      return {
        totalAnnual: plan.totalEstimatedAnnualExpenses * numericCustom,
        remainingAnnual: plan.remainingAnnualCost * numericCustom,
        gapAnnual: plan.fundingGap * numericCustom,
        rateLabel: `1 ${currency} = ${numericCustom} ${displayCurrency}`,
      };
    }

    return {
      totalAnnual: convertCurrencyAmount(
        plan.totalEstimatedAnnualExpenses,
        fromRate,
        targetRefRate,
      ),
      remainingAnnual: convertCurrencyAmount(plan.remainingAnnualCost, fromRate, targetRefRate),
      gapAnnual: convertCurrencyAmount(plan.fundingGap, fromRate, targetRefRate),
      rateLabel: `1 ${currency} ≈ ${(targetRefRate / fromRate).toFixed(2)} ${displayCurrency}`,
    };
  }, [fxSnapshot.ratesPerUsd, currency, displayCurrency, useCustomRate, customRateValue, plan]);

  const chartData = [
    {
      name: 'Cost vs Funding Breakdown',
      Tuition: Math.round(plan.tuitionExpense),
      LivingAndHousing: Math.round(plan.livingAndAccommodationExpense),
      InsuranceTravel: Math.round(plan.insuranceAndTravelExpense),
      ScholarshipCovered: Math.round(plan.scholarshipContribution),
      OutOfPocketRemaining: Math.round(plan.remainingAnnualCost),
    },
  ];

  const comparisonBarData = [
    {
      category: 'Total Annual Cost',
      Amount: Math.round(plan.totalEstimatedAnnualExpenses),
    },
    {
      category: 'Scholarship Aid',
      Amount: Math.round(plan.scholarshipContribution),
    },
    {
      category: 'Personal Budget',
      Amount: Math.round(personalAnnualBudget),
    },
    {
      category: 'Unfunded Gap',
      Amount: Math.round(plan.fundingGap),
    },
  ];

  return (
    <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
      <PageMeta
        title="Financial & Budget Calculator"
        description="Calculate total annual study costs, scholarship tuition and stipend offsets, personal budget gaps, and multi-currency conversions."
      />

      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="font-display text-3xl font-bold text-text-primary">
            Financial Planning & Funding Gap Calculator
          </h1>
          <p className="mt-1 text-sm text-text-secondary">
            Model annual tuition, housing, living expenses, insurance, and travel against verified
            scholarship offsets and personal savings.
          </p>
        </div>
        <Button size="sm" variant="outline" onClick={refreshRates} disabled={loadingFx}>
          <RefreshCw className={`h-3.5 w-3.5 ${loadingFx ? 'animate-spin' : ''}`} />
          Refresh Reference FX
        </Button>
      </div>

      {/* Presets Bar */}
      <Card className="mt-6 grid gap-3 md:grid-cols-3">
        <div>
          <label className="mb-1 block text-xs font-medium text-text-secondary">
            Country Cost Preset
          </label>
          <Select
            aria-label="Country preset"
            value={selectedCountryCode}
            onChange={(e) => applyCountryPreset(e.target.value)}
          >
            {countries.map((c) => (
              <option key={c.code} value={c.code}>
                {c.name} ({c.currencyCode})
              </option>
            ))}
          </Select>
        </div>
        <div>
          <label className="mb-1 block text-xs font-medium text-text-secondary">
            University Tuition Preset
          </label>
          <Select
            aria-label="University preset"
            value={selectedUniversityId}
            onChange={(e) => applyUniversityPreset(e.target.value)}
          >
            <option value="">Manual tuition entry</option>
            {universities.map((u) => (
              <option key={u.id} value={u.id}>
                {u.name} ({u.countryCode})
              </option>
            ))}
          </Select>
        </div>
        <div>
          <label className="mb-1 block text-xs font-medium text-text-secondary">
            Scholarship Aid Preset
          </label>
          <Select
            aria-label="Scholarship preset"
            value={selectedScholarshipId}
            onChange={(e) => applyScholarshipPreset(e.target.value)}
          >
            <option value="">Custom scholarship grant</option>
            {scholarships
              .filter((s) => !s.isArchived)
              .map((s) => (
                <option key={s.id} value={s.id}>
                  {s.name} ({s.countryCode})
                </option>
              ))}
          </Select>
        </div>
      </Card>

      {/* Main Split Grid */}
      <div className="mt-6 grid gap-6 lg:grid-cols-12">
        {/* Left Inputs */}
        <Card className="space-y-5 lg:col-span-5">
          <div className="flex items-center justify-between">
            <h2 className="flex items-center gap-2 text-base font-semibold text-text-primary">
              <Calculator className="h-4 w-4 text-accent-primary" />
              Expense & Coverage Inputs
            </h2>
            <Select
              aria-label="Planning currency"
              value={currency}
              onChange={(e) => setCurrency(e.target.value)}
              className="h-8 w-24 text-xs"
            >
              {SUPPORTED_CURRENCIES.map((cur) => (
                <option key={cur} value={cur}>
                  {cur}
                </option>
              ))}
            </Select>
          </div>

          <div className="grid gap-3 sm:grid-cols-2">
            <div>
              <label className="mb-1 block text-xs text-text-secondary">
                Annual Tuition ({currency})
              </label>
              <Input
                type="number"
                min={0}
                value={annualTuition}
                onChange={(e) => setAnnualTuition(Number(e.target.value) || 0)}
              />
            </div>
            <div>
              <label className="mb-1 block text-xs text-text-secondary">
                Monthly Accommodation ({currency})
              </label>
              <Input
                type="number"
                min={0}
                value={monthlyAccommodation}
                onChange={(e) => setMonthlyAccommodation(Number(e.target.value) || 0)}
              />
            </div>
            <div>
              <label className="mb-1 block text-xs text-text-secondary">
                Monthly Living Expenses ({currency})
              </label>
              <Input
                type="number"
                min={0}
                value={monthlyLivingExpenses}
                onChange={(e) => setMonthlyLivingExpenses(Number(e.target.value) || 0)}
              />
            </div>
            <div>
              <label className="mb-1 block text-xs text-text-secondary">
                Annual Health Insurance ({currency})
              </label>
              <Input
                type="number"
                min={0}
                value={annualInsurance}
                onChange={(e) => setAnnualInsurance(Number(e.target.value) || 0)}
              />
            </div>
            <div>
              <label className="mb-1 block text-xs text-text-secondary">
                Annual Flights & Visa ({currency})
              </label>
              <Input
                type="number"
                min={0}
                value={annualTravelCosts}
                onChange={(e) => setAnnualTravelCosts(Number(e.target.value) || 0)}
              />
            </div>
            <div>
              <label className="mb-1 block text-xs text-text-secondary">
                Personal Annual Budget ({currency})
              </label>
              <Input
                type="number"
                min={0}
                value={personalAnnualBudget}
                onChange={(e) => setPersonalAnnualBudget(Number(e.target.value) || 0)}
              />
            </div>
          </div>

          <div className="border-t border-border-subtle pt-4">
            <h3 className="mb-3 text-xs font-semibold uppercase tracking-wide text-accent-secondary">
              Scholarship Contribution
            </h3>
            <div className="grid gap-3 sm:grid-cols-3">
              <div>
                <label className="mb-1 block text-xs text-text-secondary">
                  Tuition Covered / yr
                </label>
                <Input
                  type="number"
                  min={0}
                  value={scholarshipTuitionCovered}
                  onChange={(e) => setScholarshipTuitionCovered(Number(e.target.value) || 0)}
                />
              </div>
              <div>
                <label className="mb-1 block text-xs text-text-secondary">
                  Stipend / month
                </label>
                <Input
                  type="number"
                  min={0}
                  value={scholarshipMonthlyStipend}
                  onChange={(e) => setScholarshipMonthlyStipend(Number(e.target.value) || 0)}
                />
              </div>
              <div>
                <label className="mb-1 block text-xs text-text-secondary">
                  Other Grant / yr
                </label>
                <Input
                  type="number"
                  min={0}
                  value={scholarshipAnnualOtherGrant}
                  onChange={(e) => setScholarshipAnnualOtherGrant(Number(e.target.value) || 0)}
                />
              </div>
            </div>
          </div>
        </Card>

        {/* Right Outputs + Chart + FX */}
        <div className="space-y-6 lg:col-span-7">
          {/* Summary KPIs */}
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <Card>
              <p className="text-xs text-text-muted">Total Annual Cost</p>
              <p className="mt-1 font-mono text-xl font-bold text-text-primary">
                {formatCurrency(plan.totalEstimatedAnnualExpenses, currency)}
              </p>
            </Card>
            <Card>
              <p className="text-xs text-text-muted">Scholarship Covered</p>
              <p className="mt-1 font-mono text-xl font-bold text-accent-secondary">
                {formatCurrency(plan.scholarshipContribution, currency)}
              </p>
              <p className="text-xs text-text-secondary">
                {plan.percentageCoveredByScholarship}% of annual expenses
              </p>
            </Card>
            <Card>
              <p className="text-xs text-text-muted">Out-of-Pocket / Year</p>
              <p className="mt-1 font-mono text-xl font-bold text-text-primary">
                {formatCurrency(plan.remainingAnnualCost, currency)}
              </p>
              <p className="text-xs text-text-secondary">
                {formatCurrency(plan.monthlyEstimatedBudgetNeeded, currency)} / month
              </p>
            </Card>
            <Card>
              <p className="text-xs text-text-muted">
                {plan.fundingGap > 0 ? 'Estimated Funding Gap' : 'Estimated Budget Surplus'}
              </p>
              <p
                className={`mt-1 font-mono text-xl font-bold ${
                  plan.fundingGap > 0 ? 'text-status-warning' : 'text-status-success'
                }`}
              >
                {plan.fundingGap > 0
                  ? formatCurrency(plan.fundingGap, currency)
                  : formatCurrency(plan.surplusAmount, currency)}
              </p>
              <p className="text-xs text-text-secondary">
                After {formatCurrency(personalAnnualBudget, currency)} budget
              </p>
            </Card>
          </div>

          {/* Chart */}
          <Card>
            <h2 className="mb-4 text-sm font-semibold text-text-primary">
              Annual Expenses vs Scholarship Aid & Personal Budget ({currency})
            </h2>
            <div className="h-64 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={comparisonBarData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(156,168,189,0.2)" />
                  <XAxis dataKey="category" stroke="#9CA8BD" fontSize={12} />
                  <YAxis stroke="#9CA8BD" fontSize={12} />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: '#151E30',
                      borderColor: 'rgba(139,124,255,0.3)',
                      borderRadius: '8px',
                      color: '#F5F6FA',
                    }}
                  />
                  <Bar dataKey="Amount" fill="#8B7CFF" radius={[6, 6, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
            {/* Expense Composition Chart */}
            <div className="mt-6 border-t border-border-subtle pt-4">
              <p className="mb-3 text-xs font-medium text-text-secondary">
                Expense Composition vs Coverage ({currency})
              </p>
              <div className="h-52 w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={chartData}>
                    <CartesianGrid strokeDasharray="3 3" stroke="rgba(156,168,189,0.2)" />
                    <XAxis dataKey="name" stroke="#9CA8BD" fontSize={12} />
                    <YAxis stroke="#9CA8BD" fontSize={12} />
                    <Tooltip
                      contentStyle={{
                        backgroundColor: '#151E30',
                        borderColor: 'rgba(139,124,255,0.3)',
                        borderRadius: '8px',
                        color: '#F5F6FA',
                      }}
                    />
                    <Legend wrapperStyle={{ fontSize: '12px' }} />
                    <Bar dataKey="Tuition" stackId="cost" fill="#8B7CFF" />
                    <Bar dataKey="LivingAndHousing" stackId="cost" fill="#42D6C8" />
                    <Bar dataKey="InsuranceTravel" stackId="cost" fill="#F4B860" />
                    <Bar dataKey="ScholarshipCovered" stackId="fund" fill="#31C48D" />
                    <Bar dataKey="OutOfPocketRemaining" stackId="fund" fill="#F16B75" />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>
          </Card>

          {/* Multi-currency & Reference FX Card */}
          <Card className="space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <h2 className="text-base font-semibold text-text-primary">
                Multi-Currency Equivalent Converter
              </h2>
              {useCustomRate ? (
                <Badge variant="warning">User-provided rate</Badge>
              ) : (
                <Badge variant={fxSnapshot.isLive ? 'success' : 'secondary'}>
                  {fxSnapshot.isLive ? 'Reference FX (ECB)' : 'Indicative Baseline'}
                </Badge>
              )}
            </div>

            <div className="grid gap-3 sm:grid-cols-3">
              <div>
                <label className="mb-1 block text-xs text-text-secondary">Target Currency</label>
                <Select
                  aria-label="Target display currency"
                  value={displayCurrency}
                  onChange={(e) => setDisplayCurrency(e.target.value)}
                >
                  {SUPPORTED_CURRENCIES.map((cur) => (
                    <option key={cur} value={cur}>
                      {cur}
                    </option>
                  ))}
                </Select>
              </div>

              <div className="flex items-end">
                <label className="flex cursor-pointer items-center gap-2 rounded-lg border border-border-subtle px-3 py-2 text-xs text-text-primary">
                  <input
                    type="checkbox"
                    checked={useCustomRate}
                    onChange={(e) => setUseCustomRate(e.target.checked)}
                    className="h-4 w-4 accent-accent-primary"
                  />
                  Override with manual exchange rate
                </label>
              </div>

              <div>
                <label className="mb-1 block text-xs text-text-secondary">
                  Manual Rate (1 {currency} = ? {displayCurrency})
                </label>
                <Input
                  type="number"
                  step="0.01"
                  disabled={!useCustomRate}
                  value={customRateValue}
                  onChange={(e) => setCustomRateValue(e.target.value)}
                />
              </div>
            </div>

            <div className="grid gap-3 rounded-xl bg-bg-secondary p-4 sm:grid-cols-3">
              <div>
                <p className="text-xs text-text-muted">Converted Annual Total</p>
                <p className="mt-1 font-mono text-base font-bold text-text-primary">
                  {formatCurrency(Math.round(conversionResult.totalAnnual), displayCurrency)}
                </p>
              </div>
              <div>
                <p className="text-xs text-text-muted">Converted Out-of-Pocket</p>
                <p className="mt-1 font-mono text-base font-bold text-text-primary">
                  {formatCurrency(Math.round(conversionResult.remainingAnnual), displayCurrency)}
                </p>
              </div>
              <div>
                <p className="text-xs text-text-muted">Converted Gap</p>
                <p className="mt-1 font-mono text-base font-bold text-accent-secondary">
                  {formatCurrency(Math.round(conversionResult.gapAnnual), displayCurrency)}
                </p>
              </div>
            </div>

            <p className="flex items-start gap-1.5 text-[11px] text-text-muted">
              <Info className="mt-0.5 h-3.5 w-3.5 shrink-0" />
              <span>
                Active conversion: <strong className="text-text-secondary">{conversionResult.rateLabel}</strong>{' '}
                — {useCustomRate ? 'User-provided manual rate.' : `${fxSnapshot.sourceLabel} (${fxSnapshot.asOfDate}).`}{' '}
                Always verify blocked-account thresholds and tuition fees in the official currency before remitting funds.
              </span>
            </p>
          </Card>
        </div>
      </div>
    </div>
  );
}
