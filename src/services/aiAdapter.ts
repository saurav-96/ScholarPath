import { getAppEnv } from '@/lib/env';
import type { Scholarship, ScholarshipMatchResult, StudentProfile } from '@/types/domain';

export interface AiGuidanceResponse {
  mode: 'ai_api' | 'deterministic';
  summary: string;
  keyEligibilityPoints: string[];
  preparationChecklist: string[];
  caveats: string[];
}

export async function generateScholarshipGuidance(
  scholarship: Scholarship,
  profile: StudentProfile,
  match: ScholarshipMatchResult,
  question?: string,
): Promise<AiGuidanceResponse> {
  const env = getAppEnv();

  if (env.aiEndpoint) {
    try {
      const response = await fetch(env.aiEndpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          question: question ?? 'Explain my eligibility and next preparation steps.',
          profileSummary: {
            countryOfOrigin: profile.countryOfOrigin,
            intendedDegree: profile.intendedDegree,
            expectedGpa: profile.expectedGpa,
            academicInterests: profile.academicInterests,
            preferredLanguage: profile.preferredLanguage,
            fundingPreference: profile.fundingPreference,
          },
          verifiedScholarship: {
            name: scholarship.name,
            provider: scholarship.provider,
            countryName: scholarship.countryName,
            degreeLevel: scholarship.degreeLevel,
            fundingTier: scholarship.fundingTier,
            tuitionCoverage: scholarship.tuitionCoverage,
            livingCoverage: scholarship.livingCoverage,
            accommodationCoverage: scholarship.accommodationCoverage,
            expensesNotCovered: scholarship.expensesNotCovered,
            academicRequirements: scholarship.academicRequirements,
            requiredDocuments: scholarship.requiredDocuments,
            applicationProcedure: scholarship.applicationProcedure,
            applicationDeadline: scholarship.applicationDeadline,
            officialScholarshipUrl: scholarship.officialScholarshipUrl,
          },
          matchSummary: {
            matchPercentage: match.matchPercentage,
            eligibilityStatus: match.eligibilityStatus,
            hardPassed: match.hardPassed,
            missingRequirements: match.missingRequirements,
            disqualifyingConditions: match.disqualifyingConditions,
          },
        }),
      });

      if (response.ok) {
        const data = (await response.json()) as Partial<AiGuidanceResponse>;
        if (data.summary && Array.isArray(data.keyEligibilityPoints)) {
          return {
            mode: 'ai_api',
            summary: data.summary,
            keyEligibilityPoints: data.keyEligibilityPoints,
            preparationChecklist: data.preparationChecklist ?? [],
            caveats: data.caveats ?? [],
          };
        }
      }
    } catch {
      // Gracefully fall back to deterministic verified guidance below
    }
  }

  return buildDeterministicGuidance(scholarship, profile, match, question);
}

export function buildDeterministicGuidance(
  scholarship: Scholarship,
  profile: StudentProfile,
  match: ScholarshipMatchResult,
  question?: string,
): AiGuidanceResponse {
  const statusHeadline =
    match.eligibilityStatus === 'ineligible'
      ? `Not currently eligible for ${scholarship.name} based on verified hard rules.`
      : match.eligibilityStatus === 'eligible'
      ? `Strong deterministic alignment (${match.matchPercentage}%) for ${profile.countryOfOrigin} ${profile.intendedDegree} applicants.`
      : `Potentially eligible (${match.matchPercentage}%), pending ${match.missingRequirements.length} unconfirmed requirement(s).`;

  const questionPrefix = question
    ? `Focused response for "${question.trim()}": `
    : '';

  const keyEligibilityPoints = [
    ...match.disqualifyingConditions.map((d) => `Disqualifier: ${d.detail}`),
    ...match.hardPassed.map((h) => `Verified: ${h.detail}`),
    ...match.missingRequirements.map((m) => `Needs confirmation: ${m.detail}`),
  ];

  const preparationChecklist = [
    ...scholarship.requiredDocuments.map((doc) => `Prepare document: ${doc}`),
    ...scholarship.applicationProcedure.map((step, i) => `Step ${i + 1}: ${step}`),
  ];

  const caveats = [
    `Tuition coverage: ${scholarship.tuitionCoverage.status.toUpperCase()} — ${scholarship.tuitionCoverage.note}`,
    `Living coverage: ${scholarship.livingCoverage.status.toUpperCase()} — ${scholarship.livingCoverage.note}`,
    ...(scholarship.expensesNotCovered.length > 0
      ? [`Not covered: ${scholarship.expensesNotCovered.join(', ')}`]
      : []),
    `Always confirm final dates on ${scholarship.officialScholarshipUrl} (last verified ${scholarship.lastVerifiedAt}).`,
  ];

  return {
    mode: 'deterministic',
    summary: `${questionPrefix}${statusHeadline} ${scholarship.summary}`,
    keyEligibilityPoints,
    preparationChecklist,
    caveats,
  };
}
