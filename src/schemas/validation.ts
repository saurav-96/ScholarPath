import { z } from 'zod';

export const languageQualificationSchema = z.object({
  id: z.string().min(1),
  type: z.enum(['IELTS', 'TOEFL_IBT', 'PTE', 'DUOLINGO', 'SAT', 'OTHER']),
  label: z.string().max(60).optional(),
  score: z.string().min(1, 'Enter a score or planned target').max(40),
  numericValue: z.number().min(0).max(1600).optional(),
  status: z.enum(['obtained', 'planned']),
  testDate: z.string().optional(),
});

export const studentProfileSchema = z.object({
  displayName: z.string().min(2, 'Display name must be at least 2 characters').max(80),
  countryOfOrigin: z.string().min(2, 'Select or enter your country of origin').max(80),
  educationStatus: z.string().min(2).max(120),
  intendedDegree: z.string().min(2).max(60),
  academicInterests: z.array(z.string().min(1)).min(1, 'Select at least one academic interest'),
  preferredLanguage: z.string().min(2).max(40),
  targetIntake: z.string().min(2).max(40),
  preferredCountries: z.array(z.string().length(2)).min(1, 'Choose at least one preferred destination'),
  fundingPreference: z.enum([
    'full_tuition_and_living',
    'full_tuition_only',
    'partial_or_affordable',
    'any',
  ]),
  maxAnnualBudgetUsd: z.number().min(0).max(200000).nullable(),
  expectedGpa: z
    .number()
    .min(0, 'GPA cannot be negative')
    .max(4.0, 'GPA must be on a 0.0 to 4.0 scale')
    .nullable(),
  gpaScaleNote: z.string().max(60),
  englishQualifications: z.array(languageQualificationSchema),
});

export const loginSchema = z.object({
  email: z.string().email('Enter a valid email address'),
  password: z.string().min(6, 'Password must be at least 6 characters'),
});

export const signupSchema = z
  .object({
    displayName: z.string().min(2, 'Enter your name').max(80),
    email: z.string().email('Enter a valid email address'),
    password: z.string().min(8, 'Password must be at least 8 characters'),
    confirmPassword: z.string(),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: 'Passwords do not match',
    path: ['confirmPassword'],
  });

export const resetPasswordSchema = z.object({
  email: z.string().email('Enter a valid email address'),
});

export const safeUrlSchema = z
  .string()
  .url('Must be a valid URL starting with https:// or http://')
  .refine((value) => value.startsWith('https://') || value.startsWith('http://'), {
    message: 'Only http/https URLs are permitted',
  });

export const coverageDetailSchema = z.object({
  status: z.enum(['confirmed', 'not_covered', 'not_specified', 'conditional']),
  note: z.string().max(400),
  amountMonthly: z.number().min(0).nullable().optional(),
  currency: z.string().max(8).optional(),
});

export const scholarshipInputSchema = z.object({
  name: z.string().min(3, 'Scholarship name is required').max(160),
  slug: z.string().min(3).max(160).optional(),
  provider: z.string().min(2, 'Provider is required').max(160),
  countryCode: z.string().length(2, '2-letter country code required').toUpperCase(),
  countryName: z.string().min(2).max(80),
  institutionDisplay: z.string().min(2).max(160),
  degreeLevel: z.enum(["Bachelor's", "Bachelor's & Master's", 'Foundation / Pathway']),
  instructionLanguages: z.array(z.string().min(1)).min(1),
  summary: z.string().min(20, 'Provide a concise verified overview').max(1500),
  targetIntake: z.string().min(2).max(40),
  acceptsAllInternational: z.boolean().default(true),
  eligibleNationalities: z.array(z.string()).default(['All non-EU/international']),
  excludedNationalities: z.array(z.string()).default([]),
  eligibleSubjects: z.array(z.string()).min(1),
  minGpa4Scale: z.number().min(0).max(4).nullable(),
  minGpaNote: z.string().max(240),
  fundingTier: z.enum([
    'fully_funded',
    'full_tuition',
    'partial_tuition',
    'stipend_only',
    'fee_waiver_conditional',
  ]),
  tuitionCoverage: coverageDetailSchema,
  livingCoverage: coverageDetailSchema,
  accommodationCoverage: coverageDetailSchema,
  travelCoverage: coverageDetailSchema,
  insuranceCoverage: coverageDetailSchema,
  expensesNotCovered: z.array(z.string()).default([]),
  applicationFeeAmount: z.number().min(0).nullable(),
  applicationFeeCurrency: z.string().max(8).default('EUR'),
  applicationFeeNote: z.string().max(200).default(''),
  applicationOpenDate: z.string().nullable(),
  applicationDeadline: z.string().nullable(),
  deadlineTimezone: z.string().max(60).default('UTC'),
  deadlineNote: z.string().max(240).default(''),
  durationText: z.string().min(2).max(120),
  officialScholarshipUrl: safeUrlSchema,
  officialApplicationUrl: safeUrlSchema,
  sourceReference: z.string().min(3).max(200),
  lastVerifiedAt: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Use YYYY-MM-DD date format'),
  verificationStatus: z.enum([
    'officially_verified',
    'needs_reverification',
    'archived',
    'unverified',
  ]),
  recordKind: z.enum(['official', 'synthetic_demo']).default('official'),
});

export const applicationSchema = z.object({
  customTitle: z.string().min(2, 'Enter a scholarship or program title').max(160),
  universityName: z.string().min(2, 'Enter university or provider name').max(160),
  countryCode: z.string().length(2),
  status: z.enum([
    'interested',
    'researching',
    'preparing_documents',
    'ready_to_apply',
    'submitted',
    'interview',
    'accepted',
    'rejected',
    'withdrawn',
  ]),
  deadline: z.string().nullable(),
  submissionDate: z.string().nullable(),
  personalNotes: z.string().max(2000),
});

export const calendarEventSchema = z.object({
  title: z.string().min(2, 'Event title required').max(140),
  category: z.enum(['deadline', 'opening', 'personal_reminder', 'test_date']),
  eventDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Choose a valid date'),
  timezone: z.string().min(2).max(60),
  notes: z.string().max(600),
});

export const correctionReportSchema = z.object({
  targetType: z.enum(['scholarship', 'university', 'country']),
  targetId: z.string().min(1),
  targetName: z.string().min(1),
  summary: z.string().min(10, 'Describe what needs correction or re-verification').max(800),
  suggestedUrl: z.union([z.literal(''), safeUrlSchema]),
});
