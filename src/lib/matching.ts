import type {
  LanguageQualification,
  MatchConfidence,
  MatchFactor,
  Scholarship,
  ScholarshipMatchResult,
  StudentProfile,
} from '@/types/domain';

function normalizeToken(value: string): string {
  return value.trim().toLowerCase();
}

function getBestNumericQual(
  quals: LanguageQualification[],
  type: LanguageQualification['type'],
): LanguageQualification | undefined {
  return quals
    .filter((q) => q.type === type && typeof q.numericValue === 'number' && !Number.isNaN(q.numericValue))
    .sort((a, b) => (b.numericValue ?? 0) - (a.numericValue ?? 0))[0];
}

function isNationalityEligible(scholarship: Scholarship, countryOfOrigin: string): {
  status: 'pass' | 'fail' | 'unknown';
  reason: string;
} {
  const country = normalizeToken(countryOfOrigin);
  if (!country) {
    return { status: 'unknown', reason: 'Nationality not entered in profile.' };
  }

  const excluded = scholarship.excludedNationalities.map(normalizeToken);
  if (excluded.includes(country)) {
    return {
      status: 'fail',
      reason: `Applicants from ${countryOfOrigin} are excluded under this programme's citizenship rules.`,
    };
  }

  if (scholarship.acceptsAllInternational) {
    return {
      status: 'pass',
      reason: `Nationality (${countryOfOrigin}) accepted under international eligibility rules.`,
    };
  }

  const eligible = scholarship.eligibleNationalities.map(normalizeToken);
  const directMatch = eligible.some(
    (entry) =>
      entry === country ||
      entry.includes(country) ||
      entry.includes('oda-eligible') ||
      entry.includes('oda-recipient') ||
      entry.includes('diplomatic relations'),
  );

  if (directMatch) {
    return {
      status: 'pass',
      reason: `${countryOfOrigin} matches eligible nationality criteria (${scholarship.nationalityRestrictionsNote || 'listed cohort'}).`,
    };
  }

  return {
    status: 'fail',
    reason: `${countryOfOrigin} is outside the published eligible nationality list (${scholarship.eligibleNationalities.join(', ')}).`,
  };
}

function isDegreeEligible(scholarship: Scholarship, intendedDegree: string): boolean {
  const degree = normalizeToken(intendedDegree);
  const schDegree = normalizeToken(scholarship.degreeLevel);
  if (!degree) return true;
  if (degree.includes('bachelor')) {
    return schDegree.includes('bachelor') || schDegree.includes('foundation');
  }
  if (degree.includes('master')) {
    return schDegree.includes('master');
  }
  return schDegree.includes(degree);
}

function isSubjectEligible(scholarship: Scholarship, interests: string[]): {
  status: 'pass' | 'fail' | 'partial';
  detail: string;
} {
  const schSubjects = scholarship.eligibleSubjects.map(normalizeToken);
  const hasBroadScope = schSubjects.some(
    (s) =>
      s.includes('all ') ||
      s.includes('all disciplines') ||
      s.includes('all eligible') ||
      s.includes('all first-cycle') ||
      s.includes('natural sciences'),
  );

  if (interests.length === 0) {
    return {
      status: 'partial',
      detail: 'No academic interests entered; broad subject eligibility assumed pending selection.',
    };
  }

  const matchedInterest = interests.find((interest) => {
    const token = normalizeToken(interest);
    return schSubjects.some(
      (s) =>
        s.includes(token) ||
        token.includes(s) ||
        (token.includes('computer') && (s.includes('computing') || s.includes('information') || s.includes('stem') || s.includes('software'))) ||
        (token.includes('artificial intelligence') && (s.includes('computer') || s.includes('ai') || s.includes('computing') || s.includes('stem'))) ||
        (token.includes('software') && (s.includes('computer') || s.includes('engineering') || s.includes('stem'))) ||
        (token.includes('data science') && (s.includes('computer') || s.includes('data') || s.includes('mathematics') || s.includes('stem'))),
    );
  });

  if (matchedInterest) {
    return {
      status: 'pass',
      detail: `Subject match confirmed (${matchedInterest}).`,
    };
  }

  if (hasBroadScope) {
    return {
      status: 'pass',
      detail: 'Programme accepts all eligible disciplines including your interest area.',
    };
  }

  return {
    status: 'fail',
    detail: `Your academic interests (${interests.join(', ')}) do not match eligible tracks (${scholarship.eligibleSubjects.join(', ')}).`,
  };
}

export function evaluateScholarshipMatch(
  scholarship: Scholarship,
  profile: StudentProfile,
): ScholarshipMatchResult {
  const hardPassed: MatchFactor[] = [];
  const preferenceMatches: MatchFactor[] = [];
  const missingRequirements: MatchFactor[] = [];
  const disqualifyingConditions: MatchFactor[] = [];
  const recommendedNextSteps: string[] = [];

  // 1. Hard Eligibility: Nationality
  const natResult = isNationalityEligible(scholarship, profile.countryOfOrigin);
  if (natResult.status === 'pass') {
    hardPassed.push({
      label: 'Nationality accepted',
      category: 'hard',
      detail: natResult.reason,
    });
  } else if (natResult.status === 'fail') {
    disqualifyingConditions.push({
      label: 'Nationality restriction',
      category: 'disqualifying',
      detail: natResult.reason,
    });
  } else {
    missingRequirements.push({
      label: 'Country of origin missing',
      category: 'missing',
      detail: natResult.reason,
    });
  }

  // 2. Hard Eligibility: Degree Level
  if (!profile.intendedDegree) {
    missingRequirements.push({
      label: 'Intended degree missing',
      category: 'missing',
      detail: 'Set your intended degree level in your profile.',
    });
  } else if (isDegreeEligible(scholarship, profile.intendedDegree)) {
    hardPassed.push({
      label: `${profile.intendedDegree} level supported`,
      category: 'hard',
      detail: `Scholarship explicitly covers ${scholarship.degreeLevel}.`,
    });
  } else {
    disqualifyingConditions.push({
      label: 'Degree level mismatch',
      category: 'disqualifying',
      detail: `Intended degree is ${profile.intendedDegree}, whereas this award covers ${scholarship.degreeLevel}.`,
    });
  }

  // 3. Hard Eligibility: Subject Eligibility
  const subjectCheck = isSubjectEligible(scholarship, profile.academicInterests);
  if (subjectCheck.status === 'pass') {
    hardPassed.push({
      label: 'Subject eligible',
      category: 'hard',
      detail: subjectCheck.detail,
    });
  } else if (subjectCheck.status === 'fail') {
    disqualifyingConditions.push({
      label: 'Subject ineligible',
      category: 'disqualifying',
      detail: subjectCheck.detail,
    });
  } else {
    missingRequirements.push({
      label: 'Academic interests missing',
      category: 'missing',
      detail: subjectCheck.detail,
    });
  }

  // 4. Hard/Minimum GPA Check
  let gpaScore = 0;
  if (scholarship.minGpa4Scale !== null) {
    if (profile.expectedGpa === null || profile.expectedGpa === undefined) {
      missingRequirements.push({
        label: 'Expected GPA not entered',
        category: 'missing',
        detail: `Minimum indicative academic bar is ${scholarship.minGpa4Scale.toFixed(2)}/4.0. Enter your expected GPA for accurate scoring.`,
      });
      recommendedNextSteps.push('Add your expected GPA (0–4.0) in Profile Settings.');
    } else if (profile.expectedGpa < scholarship.minGpa4Scale - 0.35) {
      disqualifyingConditions.push({
        label: 'GPA significantly below competitive bar',
        category: 'disqualifying',
        detail: `Entered GPA (${profile.expectedGpa.toFixed(2)}) is well below indicative minimum (${scholarship.minGpa4Scale.toFixed(2)}/4.0).`,
      });
    } else if (profile.expectedGpa < scholarship.minGpa4Scale) {
      missingRequirements.push({
        label: 'Borderline GPA requires confirmation',
        category: 'missing',
        detail: `Entered GPA (${profile.expectedGpa.toFixed(2)}) is slightly below indicative benchmark (${scholarship.minGpa4Scale.toFixed(2)}/4.0).`,
      });
      gpaScore = 8;
    } else {
      hardPassed.push({
        label: 'GPA meets benchmark',
        category: 'hard',
        detail: `Expected GPA (${profile.expectedGpa.toFixed(2)}/4.0) meets or exceeds ${scholarship.minGpa4Scale.toFixed(2)}/4.0.`,
      });
      gpaScore = 15;
    }
  } else {
    gpaScore = 12;
  }

  // 5. Language & Standardized Tests
  const langReq = scholarship.languageRequirements;
  let langScore = 0;
  const ieltsQual = getBestNumericQual(profile.englishQualifications, 'IELTS');
  const toeflQual = getBestNumericQual(profile.englishQualifications, 'TOEFL_IBT');
  const duolingoQual = getBestNumericQual(profile.englishQualifications, 'DUOLINGO');
  const pteQual = getBestNumericQual(profile.englishQualifications, 'PTE');
  const satQual = getBestNumericQual(profile.englishQualifications, 'SAT');

  const requiresEnglishScore = Boolean(langReq.ieltsMin || langReq.toeflMin || langReq.duolingoMin);
  if (requiresEnglishScore) {
    const obtainedIelts = ieltsQual?.status === 'obtained' ? ieltsQual.numericValue : undefined;
    const obtainedToefl = toeflQual?.status === 'obtained' ? toeflQual.numericValue : undefined;
    const obtainedDuo = duolingoQual?.status === 'obtained' ? duolingoQual.numericValue : undefined;
    const hasPlannedEnglish = Boolean(ieltsQual || toeflQual || duolingoQual || pteQual);

    if (obtainedIelts !== undefined && langReq.ieltsMin !== undefined) {
      if (obtainedIelts >= langReq.ieltsMin) {
        hardPassed.push({
          label: 'IELTS requirement met',
          category: 'hard',
          detail: `Your IELTS (${obtainedIelts}) meets minimum ${langReq.ieltsMin}.`,
        });
        langScore = 15;
      } else {
        disqualifyingConditions.push({
          label: 'English score below minimum',
          category: 'disqualifying',
          detail: `Obtained IELTS ${obtainedIelts} is below minimum ${langReq.ieltsMin} (retake or waiver required).`,
        });
      }
    } else if (obtainedToefl !== undefined && langReq.toeflMin !== undefined) {
      if (obtainedToefl >= langReq.toeflMin) {
        hardPassed.push({
          label: 'TOEFL iBT requirement met',
          category: 'hard',
          detail: `Your TOEFL iBT (${obtainedToefl}) meets minimum ${langReq.toeflMin}.`,
        });
        langScore = 15;
      } else {
        disqualifyingConditions.push({
          label: 'TOEFL score below minimum',
          category: 'disqualifying',
          detail: `Obtained TOEFL (${obtainedToefl}) is below minimum ${langReq.toeflMin}.`,
        });
      }
    } else if (obtainedDuo !== undefined && langReq.duolingoMin !== undefined) {
      if (obtainedDuo >= langReq.duolingoMin) {
        hardPassed.push({
          label: 'Duolingo score met',
          category: 'hard',
          detail: `Duolingo (${obtainedDuo}) meets minimum ${langReq.duolingoMin}.`,
        });
        langScore = 14;
      } else {
        disqualifyingConditions.push({
          label: 'Duolingo score below minimum',
          category: 'disqualifying',
          detail: `Duolingo (${obtainedDuo}) is below minimum ${langReq.duolingoMin}.`,
        });
      }
    } else if (hasPlannedEnglish) {
      missingRequirements.push({
        label: 'Planned English test score not yet obtained',
        category: 'missing',
        detail: `${langReq.summary} You have a planned test entered; upload obtained score when ready.`,
      });
      langScore = 8;
      recommendedNextSteps.push('Complete your planned English proficiency exam prior to deadline.');
    } else {
      missingRequirements.push({
        label: 'English proficiency score not entered',
        category: 'missing',
        detail: langReq.summary,
      });
      recommendedNextSteps.push('Add IELTS, TOEFL, PTE, or Duolingo score in your Student Profile.');
    }
  } else {
    langScore = 12;
  }

  if (langReq.satMin) {
    if (!satQual || typeof satQual.numericValue !== 'number') {
      missingRequirements.push({
        label: 'SAT score recommended / required',
        category: 'missing',
        detail: `Competitive applicants typically present SAT ${langReq.satMin}+ (${langReq.summary}).`,
      });
      recommendedNextSteps.push(`Consider registering for SAT (indicative target ${langReq.satMin}+).`);
    } else if (satQual.numericValue >= langReq.satMin) {
      preferenceMatches.push({
        label: 'SAT score aligns with target',
        category: 'preference',
        detail: `SAT ${satQual.numericValue} meets indicative ${langReq.satMin}+ benchmark.`,
      });
      langScore = Math.min(15, langScore + 3);
    } else {
      missingRequirements.push({
        label: 'SAT below typical merit benchmark',
        category: 'missing',
        detail: `Entered SAT (${satQual.numericValue}) is below typical competitive level (${langReq.satMin}+).`,
      });
    }
  }

  // 6. Soft Preference Scoring (max 40 pts; hard foundation max 60 pts)
  let softScore = 0;

  if (profile.preferredCountries.includes(scholarship.countryCode)) {
    softScore += 14;
    preferenceMatches.push({
      label: 'Preferred destination country',
      category: 'preference',
      detail: `${scholarship.countryName} is in your preferred destinations list.`,
    });
  }

  const prefLang = normalizeToken(profile.preferredLanguage);
  if (
    !prefLang ||
    scholarship.instructionLanguages.some((l) => normalizeToken(l) === prefLang)
  ) {
    softScore += 10;
    preferenceMatches.push({
      label: 'Instruction language matches',
      category: 'preference',
      detail: `Delivered in ${scholarship.instructionLanguages.join(' / ')}.`,
    });
  } else {
    missingRequirements.push({
      label: 'Non-English language track note',
      category: 'missing',
      detail: `Delivered primarily in ${scholarship.instructionLanguages.join(', ')} (preparatory year or language proof applies).`,
    });
  }

  // Funding preference alignment
  if (profile.fundingPreference === 'full_tuition_and_living') {
    if (scholarship.fundingTier === 'fully_funded') {
      softScore += 12;
      preferenceMatches.push({
        label: 'Matches full funding goal',
        category: 'preference',
        detail: 'Covers both tuition and living support.',
      });
    } else if (scholarship.fundingTier === 'full_tuition') {
      softScore += 6;
      preferenceMatches.push({
        label: 'Covers full tuition (living gap remains)',
        category: 'preference',
        detail: 'Covers tuition only — verify living expenses in Financial Calculator.',
      });
      recommendedNextSteps.push('Estimate remaining living costs in the Financial Calculator.');
    }
  } else if (profile.fundingPreference === 'full_tuition_only') {
    if (scholarship.fundingTier === 'fully_funded' || scholarship.fundingTier === 'full_tuition') {
      softScore += 12;
      preferenceMatches.push({
        label: 'Matches full tuition goal',
        category: 'preference',
        detail: 'Full tuition support confirmed or conditional.',
      });
    } else {
      softScore += 5;
    }
  } else {
    softScore += 10;
  }

  if (scholarship.applicationFeeAmount === 0) {
    softScore += 4;
    preferenceMatches.push({
      label: 'Zero application fee',
      category: 'preference',
      detail: 'No scholarship application fee required.',
    });
  }

  // Base hard eligibility points (out of 30 for Nat + Degree + Subject)
  const hardBase =
    (natResult.status === 'pass' ? 12 : 0) +
    (isDegreeEligible(scholarship, profile.intendedDegree) ? 8 : 0) +
    (subjectCheck.status === 'pass' ? 10 : 0);

  // Total raw score out of 100
  let rawScore = hardBase + gpaScore + langScore + softScore;

  // CRITICAL RULE: Hard eligibility failures must NEVER be hidden behind a high preference score!
  let eligibilityStatus: ScholarshipMatchResult['eligibilityStatus'] = 'eligible';
  if (disqualifyingConditions.length > 0) {
    eligibilityStatus = 'ineligible';
    rawScore = Math.min(rawScore, 24);
    recommendedNextSteps.unshift(
      'Review disqualifying condition before investing effort; consider other verified opportunities.',
    );
  } else if (missingRequirements.length > 0) {
    eligibilityStatus = missingRequirements.length >= 2 ? 'needs_information' : 'likely_eligible';
  } else {
    eligibilityStatus = 'eligible';
  }

  if (recommendedNextSteps.length === 0) {
    recommendedNextSteps.push('Verify exact annual call dates on the official scholarship portal.');
    recommendedNextSteps.push('Add this scholarship to your Application Tracker to prepare required documents.');
  }

  let confidence: MatchConfidence = 'high';
  if (
    scholarship.recordKind === 'synthetic_demo' ||
    scholarship.verificationStatus !== 'officially_verified' ||
    missingRequirements.length >= 2
  ) {
    confidence = 'low';
  } else if (missingRequirements.length === 1) {
    confidence = 'medium';
  }

  return {
    scholarshipId: scholarship.id,
    matchPercentage: Math.max(0, Math.min(100, Math.round(rawScore))),
    eligibilityStatus,
    confidence,
    hardPassed,
    preferenceMatches,
    missingRequirements,
    disqualifyingConditions,
    recommendedNextSteps,
  };
}
