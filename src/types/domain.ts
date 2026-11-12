export type ThemeMode = 'dark' | 'light';

export type UserRole = 'student' | 'admin';

export type VerificationStatus =
  | 'officially_verified'
  | 'needs_reverification'
  | 'archived'
  | 'unverified';

export type RecordKind = 'official' | 'synthetic_demo';

export type CoverageStatus =
  | 'confirmed'
  | 'not_covered'
  | 'not_specified'
  | 'conditional';

export type FundingTier =
  | 'fully_funded'
  | 'full_tuition'
  | 'partial_tuition'
  | 'stipend_only'
  | 'fee_waiver_conditional';

export type ApplicationStatus =
  | 'interested'
  | 'researching'
  | 'preparing_documents'
  | 'ready_to_apply'
  | 'submitted'
  | 'interview'
  | 'accepted'
  | 'rejected'
  | 'withdrawn';

export type DocumentStatus =
  | 'not_started'
  | 'in_progress'
  | 'ready'
  | 'verified';

export type QualificationType =
  | 'IELTS'
  | 'TOEFL_IBT'
  | 'PTE'
  | 'DUOLINGO'
  | 'SAT'
  | 'OTHER';

export interface LanguageQualification {
  id: string;
  type: QualificationType;
  label?: string;
  score: string;
  numericValue?: number;
  status: 'obtained' | 'planned';
  testDate?: string;
}

export type FundingPreference =
  | 'full_tuition_and_living'
  | 'full_tuition_only'
  | 'partial_or_affordable'
  | 'any';

export interface StudentProfile {
  id: string;
  displayName: string;
  email: string;
  role: UserRole;
  countryOfOrigin: string;
  educationStatus: string;
  intendedDegree: string;
  academicInterests: string[];
  preferredLanguage: string;
  targetIntake: string;
  preferredCountries: string[];
  fundingPreference: FundingPreference;
  maxAnnualBudgetUsd: number | null;
  expectedGpa: number | null;
  gpaScaleNote: string;
  englishQualifications: LanguageQualification[];
  onboardingCompleted: boolean;
  updatedAt: string;
}

export interface CountryProfile {
  code: string;
  slug: string;
  name: string;
  region: string;
  currencyCode: string;
  officialPortalName: string;
  officialPortalUrl: string;
  tuitionOverview: string;
  livingCostMonthlyMin: number | null;
  livingCostMonthlyMax: number | null;
  livingCostCurrency: string;
  livingCostNote: string;
  languageRequirementsNote: string;
  admissionRequirementsNote: string;
  applicationPeriodsNote: string;
  estimateSourceNote: string;
  lastVerifiedAt: string;
  verificationStatus: VerificationStatus;
}

export interface UniversityProgram {
  id: string;
  slug: string;
  name: string;
  degreeLevel: string;
  subjectArea: string;
  instructionLanguage: string;
  durationYears: number;
  tuitionAnnual: number | null;
  tuitionCurrency: string;
  applicationPeriod: string;
  officialUrl: string;
}

export interface SourceReference {
  title: string;
  url: string;
  publisher: string;
  verifiedAt: string;
  notes?: string;
}

export interface University {
  id: string;
  slug: string;
  name: string;
  countryCode: string;
  countryName: string;
  city: string;
  institutionType: 'Public' | 'Private' | 'Public-Private';
  officialWebsite: string;
  internationalAdmissionsUrl: string;
  instructionLanguages: string[];
  tuitionMinAnnual: number | null;
  tuitionMaxAnnual: number | null;
  tuitionCurrency: string;
  tuitionNote: string;
  estimatedLivingMonthly: number | null;
  livingCurrency: string;
  admissionRequirements: string[];
  englishRequirements: string;
  applicationPeriods: string;
  programs: UniversityProgram[];
  officialSources: SourceReference[];
  lastVerifiedAt: string;
  verificationStatus: VerificationStatus;
  recordKind: RecordKind;
}

export interface CoverageDetail {
  status: CoverageStatus;
  note: string;
  amountMonthly?: number | null;
  currency?: string;
}

export interface LanguageRequirementRule {
  ieltsMin?: number;
  toeflMin?: number;
  pteMin?: number;
  duolingoMin?: number;
  satMin?: number;
  summary: string;
}

export interface Scholarship {
  id: string;
  slug: string;
  name: string;
  provider: string;
  countryCode: string;
  countryName: string;
  universityId: string | null;
  institutionDisplay: string;
  degreeLevel: "Bachelor's" | "Bachelor's & Master's" | 'Foundation / Pathway';
  instructionLanguages: string[];
  summary: string;
  targetIntake: string;
  eligibleNationalities: string[];
  excludedNationalities: string[];
  acceptsAllInternational: boolean;
  eligibleSubjects: string[];
  minGpa4Scale: number | null;
  minGpaNote: string;
  languageRequirements: LanguageRequirementRule;
  academicRequirements: string[];
  nationalityRestrictionsNote: string;
  fundingTier: FundingTier;
  tuitionCoverage: CoverageDetail;
  livingCoverage: CoverageDetail;
  accommodationCoverage: CoverageDetail;
  travelCoverage: CoverageDetail;
  insuranceCoverage: CoverageDetail;
  expensesNotCovered: string[];
  applicationFeeAmount: number | null;
  applicationFeeCurrency: string;
  applicationFeeNote: string;
  applicationOpenDate: string | null;
  applicationDeadline: string | null;
  deadlineTimezone: string;
  deadlineNote: string;
  durationText: string;
  requiredDocuments: string[];
  applicationProcedure: string[];
  officialScholarshipUrl: string;
  officialApplicationUrl: string;
  sourceReference: string;
  sources: SourceReference[];
  lastVerifiedAt: string;
  verificationStatus: VerificationStatus;
  recordKind: RecordKind;
  isArchived: boolean;
}

export type EligibilityStatus =
  | 'eligible'
  | 'likely_eligible'
  | 'needs_information'
  | 'ineligible';

export type MatchConfidence = 'high' | 'medium' | 'low';

export interface MatchFactor {
  label: string;
  category: 'hard' | 'preference' | 'missing' | 'disqualifying';
  detail: string;
}

export interface ScholarshipMatchResult {
  scholarshipId: string;
  matchPercentage: number;
  eligibilityStatus: EligibilityStatus;
  confidence: MatchConfidence;
  hardPassed: MatchFactor[];
  preferenceMatches: MatchFactor[];
  missingRequirements: MatchFactor[];
  disqualifyingConditions: MatchFactor[];
  recommendedNextSteps: string[];
}

export interface UserCollection {
  id: string;
  name: string;
  description: string;
  color: string;
  createdAt: string;
}

export interface SavedScholarshipItem {
  id: string;
  scholarshipId: string;
  collectionId: string | null;
  notes: string;
  savedAt: string;
}

export interface SavedUniversityItem {
  id: string;
  universityId: string;
  notes: string;
  savedAt: string;
}

export interface ApplicationTask {
  id: string;
  title: string;
  dueDate: string | null;
  completed: boolean;
  priority: 'low' | 'medium' | 'high';
}

export interface TrackedApplication {
  id: string;
  scholarshipId: string | null;
  universityId: string | null;
  customTitle: string;
  universityName: string;
  countryCode: string;
  status: ApplicationStatus;
  deadline: string | null;
  submissionDate: string | null;
  personalNotes: string;
  tasks: ApplicationTask[];
  updatedAt: string;
}

export interface StudentDocument {
  id: string;
  applicationId: string | null;
  name: string;
  category:
    | 'transcripts'
    | 'certificates'
    | 'passport'
    | 'cv'
    | 'motivation_letter'
    | 'sop'
    | 'recommendations'
    | 'language_test'
    | 'financial'
    | 'portfolio'
    | 'other';
  status: DocumentStatus;
  notes: string;
  attachmentName?: string;
  attachmentSizeBytes?: number;
  updatedAt: string;
}

export interface CalendarEvent {
  id: string;
  scholarshipId: string | null;
  applicationId: string | null;
  title: string;
  category: 'deadline' | 'opening' | 'personal_reminder' | 'test_date';
  eventDate: string;
  timezone: string;
  notes: string;
  isUserCreated: boolean;
}

export interface CorrectionReport {
  id: string;
  targetType: 'scholarship' | 'university' | 'country';
  targetId: string;
  targetName: string;
  summary: string;
  suggestedUrl: string;
  status: 'open' | 'verified_fixed' | 'dismissed';
  reviewerNotes: string;
  createdAt: string;
}

export interface AdminAuditLog {
  id: string;
  actorEmail: string;
  action: string;
  entityType: 'scholarship' | 'university' | 'country' | 'correction' | 'import';
  entityId: string;
  summary: string;
  createdAt: string;
}

export interface AppUserState {
  profile: StudentProfile;
  collections: UserCollection[];
  savedScholarships: SavedScholarshipItem[];
  savedUniversities: SavedUniversityItem[];
  applications: TrackedApplication[];
  documents: StudentDocument[];
  calendarEvents: CalendarEvent[];
  correctionReports: CorrectionReport[];
}
