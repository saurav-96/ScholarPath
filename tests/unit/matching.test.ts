import { describe, expect, it } from 'vitest';
import { DEFAULT_DEMO_PROFILE } from '@/data/demoDefaults';
import { SCHOLARSHIPS_DATA } from '@/data/scholarships';
import { evaluateScholarshipMatch } from '@/lib/matching';
import type { Scholarship, StudentProfile } from '@/types/domain';

describe('evaluateScholarshipMatch', () => {
  const padua = SCHOLARSHIPS_DATA.find((s) => s.id === 'sch-padua-excellence')!;
  const synthExcluded = SCHOLARSHIPS_DATA.find((s) => s.id === 'sch-demo-eu-restricted')!;

  it('scores strong alignment for default Nepal CS bachelor profile on eligible full scholarship', () => {
    const res = evaluateScholarshipMatch(padua, DEFAULT_DEMO_PROFILE);
    expect(res.eligibilityStatus).toBe('eligible');
    expect(res.disqualifyingConditions).toHaveLength(0);
    expect(res.matchPercentage).toBeGreaterThanOrEqual(75);
    expect(res.hardPassed.length).toBeGreaterThanOrEqual(4);
    expect(res.preferenceMatches.some((p) => p.label.includes('Preferred destination'))).toBe(true);
  });

  it('caps score and marks ineligible when hard nationality restriction fails, even if soft preferences align', () => {
    const highPrefProfile: StudentProfile = {
      ...DEFAULT_DEMO_PROFILE,
      countryOfOrigin: 'Nepal',
      preferredCountries: ['FR', 'DE', 'IT'],
      expectedGpa: 4.0,
    };
    const res = evaluateScholarshipMatch(synthExcluded, highPrefProfile);
    expect(res.eligibilityStatus).toBe('ineligible');
    expect(res.disqualifyingConditions.some((d) => d.label === 'Nationality restriction')).toBe(
      true,
    );
    expect(res.matchPercentage).toBeLessThanOrEqual(24);
  });

  it('marks needs_information or likely_eligible when GPA or English scores are missing', () => {
    const incompleteProfile: StudentProfile = {
      ...DEFAULT_DEMO_PROFILE,
      expectedGpa: null,
      englishQualifications: [],
    };
    const res = evaluateScholarshipMatch(padua, incompleteProfile);
    expect(res.eligibilityStatus).toBe('needs_information');
    expect(res.missingRequirements.some((m) => m.label.includes('GPA'))).toBe(true);
    expect(res.missingRequirements.some((m) => m.label.includes('English proficiency'))).toBe(true);
  });

  it('rejects IELTS score below published minimum', () => {
    const lowIeltsProfile: StudentProfile = {
      ...DEFAULT_DEMO_PROFILE,
      englishQualifications: [
        {
          id: 'q1',
          type: 'IELTS',
          score: '5.0',
          numericValue: 5.0,
          status: 'obtained',
        },
      ],
    };
    const res = evaluateScholarshipMatch(padua, lowIeltsProfile);
    expect(res.eligibilityStatus).toBe('ineligible');
    expect(res.disqualifyingConditions.some((d) => d.label === 'English score below minimum')).toBe(
      true,
    );
  });

  it('flags degree mismatch cleanly', () => {
    const mastersProfile: StudentProfile = {
      ...DEFAULT_DEMO_PROFILE,
      intendedDegree: "Master's",
    };
    const bscOnly: Scholarship = { ...padua, degreeLevel: "Bachelor's" };
    const res = evaluateScholarshipMatch(bscOnly, mastersProfile);
    expect(res.eligibilityStatus).toBe('ineligible');
    expect(res.disqualifyingConditions.some((d) => d.label === 'Degree level mismatch')).toBe(true);
  });
});
