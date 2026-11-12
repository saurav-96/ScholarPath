import { describe, expect, it } from 'vitest';
import { SCHOLARSHIPS_DATA } from '@/data/scholarships';
import { UNIVERSITIES_DATA } from '@/data/universities';
import {
  DEFAULT_SCHOLARSHIP_FILTERS,
  DEFAULT_UNIVERSITY_FILTERS,
  filterAndSortScholarships,
  filterUniversities,
} from '@/lib/filters';

describe('filterAndSortScholarships', () => {
  const refDate = new Date('2026-11-13T00:00:00Z');

  it('excludes synthetic demo entries when hideSyntheticDemo is enabled', () => {
    const all = filterAndSortScholarships(SCHOLARSHIPS_DATA, DEFAULT_SCHOLARSHIP_FILTERS, undefined, refDate);
    const officialOnly = filterAndSortScholarships(
      SCHOLARSHIPS_DATA,
      { ...DEFAULT_SCHOLARSHIP_FILTERS, hideSyntheticDemo: true },
      undefined,
      refDate,
    );
    expect(all.length).toBeGreaterThan(officialOnly.length);
    expect(officialOnly.every((s) => s.recordKind === 'official')).toBe(true);
  });

  it('combines multiple filters simultaneously (country + free fee + English)', () => {
    const filtered = filterAndSortScholarships(
      SCHOLARSHIPS_DATA,
      {
        ...DEFAULT_SCHOLARSHIP_FILTERS,
        countryCode: 'IT',
        noApplicationFee: true,
        englishTaught: true,
        hideSyntheticDemo: true,
      },
      undefined,
      refDate,
    );
    expect(filtered.length).toBeGreaterThan(0);
    for (const s of filtered) {
      expect(s.countryCode).toBe('IT');
      expect(s.applicationFeeAmount).toBe(0);
      expect(s.instructionLanguages.map((l) => l.toLowerCase())).toContain('english');
    }
  });

  it('sorts by funding tier descending cleanly', () => {
    const sorted = filterAndSortScholarships(
      SCHOLARSHIPS_DATA,
      { ...DEFAULT_SCHOLARSHIP_FILTERS, sortBy: 'funding_coverage' },
      undefined,
      refDate,
    );
    expect(sorted[0].fundingTier).toBe('fully_funded');
  });
});

describe('filterUniversities', () => {
  it('filters universities by country and English instruction', () => {
    const schUniIds = new Set(
      SCHOLARSHIPS_DATA.map((s) => s.universityId).filter((id): id is string => Boolean(id)),
    );
    const unis = filterUniversities(
      UNIVERSITIES_DATA,
      {
        ...DEFAULT_UNIVERSITY_FILTERS,
        countryCode: 'IT',
        englishTaughtOnly: true,
      },
      schUniIds,
    );
    expect(unis.length).toBeGreaterThan(0);
    expect(unis.every((u) => u.countryCode === 'IT')).toBe(true);
    expect(
      unis.every((u) => u.instructionLanguages.some((l) => l.toLowerCase() === 'english')),
    ).toBe(true);
  });
});
