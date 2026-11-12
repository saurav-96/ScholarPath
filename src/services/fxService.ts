export interface FxRatesSnapshot {
  baseCurrency: string;
  ratesPerUsd: Record<string, number>;
  sourceLabel: string;
  isLive: boolean;
  asOfDate: string;
}

// Reference baseline rates used only when live ECB fetch is offline or user switches to manual rates
export const FALLBACK_REFERENCE_RATES_PER_USD: Record<string, number> = {
  USD: 1,
  EUR: 0.92,
  GBP: 0.79,
  CAD: 1.38,
  AUD: 1.52,
  NOK: 10.9,
  DKK: 6.87,
  SEK: 10.6,
  JPY: 153.5,
  KRW: 1385,
  NPR: 134.5,
};

export async function fetchReferenceFxRates(): Promise<FxRatesSnapshot> {
  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 4500);
    const res = await fetch('https://api.frankfurter.dev/v1/latest?base=USD', {
      signal: controller.signal,
    });
    clearTimeout(timeout);

    if (!res.ok) {
      throw new Error(`HTTP ${res.status}`);
    }

    const payload = (await res.json()) as {
      date?: string;
      rates?: Record<string, number>;
    };

    const mergedRates: Record<string, number> = {
      ...FALLBACK_REFERENCE_RATES_PER_USD,
      ...(payload.rates ?? {}),
      USD: 1,
    };

    return {
      baseCurrency: 'USD',
      ratesPerUsd: mergedRates,
      sourceLabel: 'European Central Bank (ECB) via Frankfurter API (NPR remains indicative)',
      isLive: true,
      asOfDate: payload.date ?? new Date().toISOString().slice(0, 10),
    };
  } catch {
    return {
      baseCurrency: 'USD',
      ratesPerUsd: { ...FALLBACK_REFERENCE_RATES_PER_USD },
      sourceLabel: 'Offline indicative reference baseline (verify or enter custom rate)',
      isLive: false,
      asOfDate: 'Indicative fallback',
    };
  }
}
