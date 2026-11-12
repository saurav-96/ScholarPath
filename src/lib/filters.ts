import type { Scholarship, ScholarshipMatchResult, University } from '@/types/domain';
import { daysUntilDate, getDeadlineStatus } from './dates';

export type ScholarshipSortOption =
  | 'deadline'
  | 'funding_coverage'
  | 'university'
  | 'country'
  | 'recently_verified'
  | 'best_match';

export interface ScholarshipFilterCriteria {
  query: string;
  countryCode: string;
  degreeLevel: string;
  subject: string;
  nationality: string;
  fullyFunded: boolean;
  fullTuition: boolean;
  partialTuition: boolean;
  livingStipend: boolean;
  accommodationIncluded: boolean;
  noApplicationFee: boolean;
  englishTaught: boolean;
  undergraduateOnly: boolean;
  openApplications: boolean;
  upcomingDeadlines: boolean;
  acceptsInternational: boolean;
  hideSyntheticDemo: boolean;
  includeArchived: boolean;
  sortBy: ScholarshipSortOption;
}

export const DEFAULT_SCHOLARSHIP_FILTERS: ScholarshipFilterCriteria = {
  query: '',
  countryCode: 'ALL',
  degreeLevel: 'ALL',
  subject: 'ALL',
  nationality: '',
  fullyFunded: false,
  fullTuition: false,
  partialTuition: false,
  livingStipend: false,
  accommodationIncluded: false,
  noApplicationFee: false,
  englishTaught: false,
  undergraduateOnly: false,
  openApplications: false,
  upcomingDeadlines: false,
  acceptsInternational: false,
  hideSyntheticDemo: false,
  includeArchived: false,
  sortBy: 'deadline',
};

const FUNDING_TIER_WEIGHT: Record<Scholarship['fundingTier'], number> = {
  fully_funded: 5,
  full_tuition: 4,
  fee_waiver_conditional: 3,
  partial_tuition: 2,
  stipend_only: 1,
};

export function filterAndSortScholarships(
  scholarships: Scholarship[],
  criteria: ScholarshipFilterCriteria,
  matchMap?: Map<string, ScholarshipMatchResult>,
  referenceDate: Date = new Date(),
): Scholarship[] {
  const q = criteria.query.trim().toLowerCase();
  const nat = criteria.nationality.trim().toLowerCase();
  const sub = criteria.subject.trim().toLowerCase();

  const filtered = scholarships.filter((item) => {
    if (!criteria.includeArchived && (item.isArchived || item.verificationStatus === 'archived')) {
      return false;
    }

    if (criteria.hideSyntheticDemo && item.recordKind === 'synthetic_demo') {
      return false;
    }

    if (criteria.countryCode !== 'ALL' && item.countryCode !== criteria.countryCode) {
      return false;
    }

    if (criteria.degreeLevel !== 'ALL') {
      const targetDeg = criteria.degreeLevel.toLowerCase();
      if (!item.degreeLevel.toLowerCase().includes(targetDeg)) {
        return false;
      }
    }

    if (criteria.undergraduateOnly && !item.degreeLevel.toLowerCase().includes('bachelor')) {
      return false;
    }

    if (criteria.subject !== 'ALL' && sub) {
      const matchesSubject =
        item.eligibleSubjects.some(
          (s) =>
            s.toLowerCase().includes(sub) ||
            s.toLowerCase().includes('all ') ||
            s.toLowerCase().includes('all disciplines') ||
            s.toLowerCase().includes('all eligible'),
        ) || item.summary.toLowerCase().includes(sub);
      if (!matchesSubject) return false;
    }

    if (nat) {
      const isExcluded = item.excludedNationalities.some((n) => n.toLowerCase() === nat);
      if (isExcluded) return false;
      if (!item.acceptsAllInternational) {
        const isListed = item.eligibleNationalities.some(
          (n) =>
            n.toLowerCase().includes(nat) ||
            n.toLowerCase().includes('oda') ||
            n.toLowerCase().includes('diplomatic'),
        );
        if (!isListed) return false;
      }
    }

    // Multi-select funding criteria (if any funding toggles active, match if ANY selected funding criterion holds, OR if user toggles multiple attribute flags like noApplicationFee / englishTaught they intersect!)
    const activeFundingModes = [
      criteria.fullyFunded,
      criteria.fullTuition,
      criteria.partialTuition,
    ].some(Boolean);

    if (activeFundingModes) {
      const matchesTier =
        (criteria.fullyFunded && item.fundingTier === 'fully_funded') ||
        (criteria.fullTuition &&
          (item.fundingTier === 'full_tuition' || item.fundingTier === 'fully_funded')) ||
        (criteria.partialTuition &&
          (item.fundingTier === 'partial_tuition' || item.fundingTier === 'fee_waiver_conditional'));
      if (!matchesTier) return false;
    }

    if (criteria.livingStipend) {
      const hasLiving =
        item.livingCoverage.status === 'confirmed' ||
        item.livingCoverage.status === 'conditional';
      if (!hasLiving) return false;
    }

    if (criteria.accommodationIncluded) {
      const hasAcc =
        item.accommodationCoverage.status === 'confirmed' ||
        item.accommodationCoverage.status === 'conditional';
      if (!hasAcc) return false;
    }

    if (criteria.noApplicationFee && item.applicationFeeAmount !== 0) {
      return false;
    }

    if (
      criteria.englishTaught &&
      !item.instructionLanguages.some((l) => l.toLowerCase() === 'english')
    ) {
      return false;
    }

    if (criteria.acceptsInternational && !item.acceptsAllInternational && item.eligibleNationalities.length === 0) {
      return false;
    }

    const deadlineStatus = getDeadlineStatus(
      item.applicationOpenDate,
      item.applicationDeadline,
      referenceDate,
    );

    if (criteria.openApplications && deadlineStatus !== 'open' && deadlineStatus !== 'closing_soon') {
      return false;
    }

    if (criteria.upcomingDeadlines) {
      const days = daysUntilDate(item.applicationDeadline, referenceDate);
      if (days === null || days < 0 || days > 90) {
        return false;
      }
    }

    if (q) {
      const haystack = [
        item.name,
        item.provider,
        item.countryName,
        item.countryCode,
        item.institutionDisplay,
        item.degreeLevel,
        item.summary,
        item.fundingTier.replace('_', ' '),
        item.applicationDeadline ?? '',
        ...item.eligibleSubjects,
        ...item.eligibleNationalities,
      ]
        .join(' ')
        .toLowerCase();

      if (!haystack.includes(q)) return false;
    }

    return true;
  });

  return [...filtered].sort((a, b) => {
    switch (criteria.sortBy) {
      case 'best_match': {
        const mA = matchMap?.get(a.id)?.matchPercentage ?? 0;
        const mB = matchMap?.get(b.id)?.matchPercentage ?? 0;
        return mB - mA;
      }
      case 'funding_coverage': {
        const diff = FUNDING_TIER_WEIGHT[b.fundingTier] - FUNDING_TIER_WEIGHT[a.fundingTier];
        if (diff !== 0) return diff;
        return a.name.localeCompare(b.name);
      }
      case 'university':
        return a.institutionDisplay.localeCompare(b.institutionDisplay);
      case 'country': {
        const c = a.countryName.localeCompare(b.countryName);
        return c !== 0 ? c : a.name.localeCompare(b.name);
      }
      case 'recently_verified':
        return b.lastVerifiedAt.localeCompare(a.lastVerifiedAt);
      case 'deadline':
      default: {
        const dA = daysUntilDate(a.applicationDeadline, referenceDate);
        const dB = daysUntilDate(b.applicationDeadline, referenceDate);
        if (dA === null && dB === null) return a.name.localeCompare(b.name);
        if (dA === null) return 1;
        if (dB === null) return -1;
        if (dA < 0 && dB >= 0) return 1;
        if (dB < 0 && dA >= 0) return -1;
        return dA - dB;
      }
    }
  });
}

export interface UniversityFilterCriteria {
  query: string;
  countryCode: string;
  subject: string;
  degreeLevel: string;
  englishTaughtOnly: boolean;
  maxAnnualTuition: number | null;
  withScholarshipOnly: boolean;
}

export const DEFAULT_UNIVERSITY_FILTERS: UniversityFilterCriteria = {
  query: '',
  countryCode: 'ALL',
  subject: 'ALL',
  degreeLevel: 'ALL',
  englishTaughtOnly: false,
  maxAnnualTuition: null,
  withScholarshipOnly: false,
};

export function filterUniversities(
  universities: University[],
  criteria: UniversityFilterCriteria,
  scholarshipUniversityIds: Set<string>,
): University[] {
  const q = criteria.query.trim().toLowerCase();
  const sub = criteria.subject.trim().toLowerCase();

  return universities.filter((uni) => {
    if (criteria.countryCode !== 'ALL' && uni.countryCode !== criteria.countryCode) {
      return false;
    }

    if (
      criteria.englishTaughtOnly &&
      !uni.instructionLanguages.some((lang) => lang.toLowerCase() === 'english')
    ) {
      return false;
    }

    if (criteria.subject !== 'ALL' && sub) {
      const hasSubject = uni.programs.some(
        (p) => p.subjectArea.toLowerCase().includes(sub) || p.name.toLowerCase().includes(sub),
      );
      if (!hasSubject) return false;
    }

    if (criteria.degreeLevel !== 'ALL') {
      const deg = criteria.degreeLevel.toLowerCase();
      const hasDegree = uni.programs.some((p) => p.degreeLevel.toLowerCase().includes(deg));
      if (!hasDegree) return false;
    }

    if (criteria.maxAnnualTuition !== null) {
      if (uni.tuitionMinAnnual === null) return false;
      if (uni.tuitionMinAnnual > criteria.maxAnnualTuition) return false;
    }

    if (criteria.withScholarshipOnly && !scholarshipUniversityIds.has(uni.id)) {
      return false;
    }

    if (q) {
      const haystack = [
        uni.name,
        uni.city,
        uni.countryName,
        uni.tuitionNote,
        ...uni.programs.map((p) => `${p.name} ${p.subjectArea}`),
      ]
        .join(' ')
        .toLowerCase();
      if (!haystack.includes(q)) return false;
    }

    return true;
  });
}
