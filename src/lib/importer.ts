import { scholarshipInputSchema } from '@/schemas/validation';
import type { Scholarship } from '@/types/domain';
import { generateId, slugify } from './utils';

export interface ImportValidationItem {
  rowIndex: number;
  valid: boolean;
  isDuplicate: boolean;
  errors: string[];
  record?: Scholarship;
}

export interface ImportReport {
  totalRows: number;
  validCount: number;
  duplicateCount: number;
  errorCount: number;
  items: ImportValidationItem[];
}

function splitCsvLine(line: string): string[] {
  const result: string[] = [];
  let current = '';
  let inQuotes = false;

  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if (ch === '"') {
      if (inQuotes && line[i + 1] === '"') {
        current += '"';
        i++;
      } else {
        inQuotes = !inQuotes;
      }
    } else if (ch === ',' && !inQuotes) {
      result.push(current.trim());
      current = '';
    } else {
      current += ch;
    }
  }
  result.push(current.trim());
  return result;
}

export function parseCsvRecords(csvText: string): Record<string, unknown>[] {
  const lines = csvText
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter((line) => line.length > 0);

  if (lines.length < 2) {
    return [];
  }

  const headers = splitCsvLine(lines[0]).map((h) => h.trim());
  const rows: Record<string, unknown>[] = [];

  for (let i = 1; i < lines.length; i++) {
    const values = splitCsvLine(lines[i]);
    const row: Record<string, unknown> = {};
    headers.forEach((header, idx) => {
      row[header] = values[idx] ?? '';
    });
    rows.push(row);
  }
  return rows;
}

function normalizeRawInput(raw: Record<string, unknown>): Record<string, unknown> {
  const toList = (val: unknown, fallback: string[]): string[] => {
    if (Array.isArray(val)) return val.map(String).filter(Boolean);
    if (typeof val === 'string' && val.trim()) {
      return val
        .split(/[;|]/)
        .map((s) => s.trim())
        .filter(Boolean);
    }
    return fallback;
  };

  const toNumberOrNull = (val: unknown): number | null => {
    if (val === null || val === undefined || val === '') return null;
    const n = Number(val);
    return Number.isFinite(n) ? n : null;
  };

  const hasCoverageObj = typeof raw.tuitionCoverage === 'object' && raw.tuitionCoverage !== null;

  return {
    name: String(raw.name ?? ''),
    slug: raw.slug ? String(raw.slug) : slugify(String(raw.name ?? '')),
    provider: String(raw.provider ?? ''),
    countryCode: String(raw.countryCode ?? '').toUpperCase(),
    countryName: String(raw.countryName ?? ''),
    institutionDisplay: String(raw.institutionDisplay ?? raw.provider ?? ''),
    degreeLevel: raw.degreeLevel || "Bachelor's",
    instructionLanguages: toList(raw.instructionLanguages, ['English']),
    summary: String(raw.summary ?? ''),
    targetIntake: String(raw.targetIntake ?? '2027'),
    acceptsAllInternational:
      typeof raw.acceptsAllInternational === 'boolean'
        ? raw.acceptsAllInternational
        : String(raw.acceptsAllInternational ?? 'true').toLowerCase() !== 'false',
    eligibleNationalities: toList(raw.eligibleNationalities, ['All international applicants']),
    excludedNationalities: toList(raw.excludedNationalities, []),
    eligibleSubjects: toList(raw.eligibleSubjects, ['All disciplines']),
    minGpa4Scale: toNumberOrNull(raw.minGpa4Scale),
    minGpaNote: String(raw.minGpaNote ?? 'Refer to official scholarship call.'),
    fundingTier: raw.fundingTier || 'partial_tuition',
    tuitionCoverage: hasCoverageObj
      ? raw.tuitionCoverage
      : {
          status: (raw.tuitionStatus as string) || 'not_specified',
          note: String(raw.tuitionNote ?? 'Verify on official portal.'),
        },
    livingCoverage:
      typeof raw.livingCoverage === 'object' && raw.livingCoverage !== null
        ? raw.livingCoverage
        : {
            status: (raw.livingStatus as string) || 'not_specified',
            note: String(raw.livingNote ?? 'Verify on official portal.'),
          },
    accommodationCoverage:
      typeof raw.accommodationCoverage === 'object' && raw.accommodationCoverage !== null
        ? raw.accommodationCoverage
        : {
            status: (raw.accommodationStatus as string) || 'not_covered',
            note: String(raw.accommodationNote ?? 'Not specified.'),
          },
    travelCoverage:
      typeof raw.travelCoverage === 'object' && raw.travelCoverage !== null
        ? raw.travelCoverage
        : {
            status: (raw.travelStatus as string) || 'not_covered',
            note: String(raw.travelNote ?? 'Not covered.'),
          },
    insuranceCoverage:
      typeof raw.insuranceCoverage === 'object' && raw.insuranceCoverage !== null
        ? raw.insuranceCoverage
        : {
            status: (raw.insuranceStatus as string) || 'not_covered',
            note: String(raw.insuranceNote ?? 'Not covered.'),
          },
    expensesNotCovered: toList(raw.expensesNotCovered, []),
    applicationFeeAmount: toNumberOrNull(raw.applicationFeeAmount),
    applicationFeeCurrency: String(raw.applicationFeeCurrency ?? 'EUR'),
    applicationFeeNote: String(raw.applicationFeeNote ?? ''),
    applicationOpenDate: raw.applicationOpenDate ? String(raw.applicationOpenDate) : null,
    applicationDeadline: raw.applicationDeadline ? String(raw.applicationDeadline) : null,
    deadlineTimezone: String(raw.deadlineTimezone ?? 'UTC'),
    deadlineNote: String(raw.deadlineNote ?? ''),
    durationText: String(raw.durationText ?? '3 years'),
    officialScholarshipUrl: String(raw.officialScholarshipUrl ?? ''),
    officialApplicationUrl: String(raw.officialApplicationUrl ?? raw.officialScholarshipUrl ?? ''),
    sourceReference: String(raw.sourceReference ?? 'Imported Official Portal'),
    lastVerifiedAt: String(raw.lastVerifiedAt ?? new Date().toISOString().slice(0, 10)),
    verificationStatus: raw.verificationStatus || 'unverified',
    recordKind: raw.recordKind || 'official',
  };
}

export function validateAndPrepareImport(
  rawItems: Record<string, unknown>[],
  existingScholarships: Scholarship[],
): ImportReport {
  const existingSlugs = new Set(existingScholarships.map((s) => s.slug.toLowerCase()));
  const existingKeys = new Set(
    existingScholarships.map(
      (s) => `${s.name.trim().toLowerCase()}::${s.provider.trim().toLowerCase()}`,
    ),
  );

  const items: ImportValidationItem[] = [];
  let validCount = 0;
  let duplicateCount = 0;
  let errorCount = 0;

  rawItems.forEach((raw, idx) => {
    const normalized = normalizeRawInput(raw);
    const parsed = scholarshipInputSchema.safeParse(normalized);

    if (!parsed.success) {
      errorCount++;
      items.push({
        rowIndex: idx + 1,
        valid: false,
        isDuplicate: false,
        errors: parsed.error.issues.map((issue) => `${issue.path.join('.')}: ${issue.message}`),
      });
      return;
    }

    const d = parsed.data;
    const slug = d.slug ? slugify(d.slug) : slugify(d.name);
    const dupKey = `${d.name.trim().toLowerCase()}::${d.provider.trim().toLowerCase()}`;
    const isDuplicate = existingSlugs.has(slug) || existingKeys.has(dupKey);

    if (isDuplicate) {
      duplicateCount++;
    } else {
      validCount++;
      existingSlugs.add(slug);
      existingKeys.add(dupKey);
    }

    const scholarship: Scholarship = {
      id: generateId('sch'),
      slug,
      name: d.name,
      provider: d.provider,
      countryCode: d.countryCode,
      countryName: d.countryName,
      universityId: null,
      institutionDisplay: d.institutionDisplay,
      degreeLevel: d.degreeLevel,
      instructionLanguages: d.instructionLanguages,
      summary: d.summary,
      targetIntake: d.targetIntake,
      eligibleNationalities: d.eligibleNationalities,
      excludedNationalities: d.excludedNationalities,
      acceptsAllInternational: d.acceptsAllInternational,
      eligibleSubjects: d.eligibleSubjects,
      minGpa4Scale: d.minGpa4Scale,
      minGpaNote: d.minGpaNote,
      languageRequirements: { summary: 'Check official source call for exact scores.' },
      academicRequirements: ['Refer to official portal for detailed prerequisites'],
      nationalityRestrictionsNote: d.acceptsAllInternational
        ? 'Open to international applicants'
        : d.eligibleNationalities.join(', '),
      fundingTier: d.fundingTier,
      tuitionCoverage: d.tuitionCoverage,
      livingCoverage: d.livingCoverage,
      accommodationCoverage: d.accommodationCoverage,
      travelCoverage: d.travelCoverage,
      insuranceCoverage: d.insuranceCoverage,
      expensesNotCovered: d.expensesNotCovered,
      applicationFeeAmount: d.applicationFeeAmount,
      applicationFeeCurrency: d.applicationFeeCurrency,
      applicationFeeNote: d.applicationFeeNote,
      applicationOpenDate: d.applicationOpenDate,
      applicationDeadline: d.applicationDeadline,
      deadlineTimezone: d.deadlineTimezone,
      deadlineNote: d.deadlineNote,
      durationText: d.durationText,
      requiredDocuments: ['Academic transcripts', 'Passport', 'Language certificate'],
      applicationProcedure: ['Apply directly via official application URL.'],
      officialScholarshipUrl: d.officialScholarshipUrl,
      officialApplicationUrl: d.officialApplicationUrl,
      sourceReference: d.sourceReference,
      sources: [
        {
          title: d.sourceReference,
          url: d.officialScholarshipUrl,
          publisher: d.provider,
          verifiedAt: d.lastVerifiedAt,
        },
      ],
      lastVerifiedAt: d.lastVerifiedAt,
      verificationStatus: d.verificationStatus,
      recordKind: d.recordKind,
      isArchived: d.verificationStatus === 'archived',
    };

    items.push({
      rowIndex: idx + 1,
      valid: !isDuplicate,
      isDuplicate,
      errors: isDuplicate ? ['Duplicate scholarship slug or name+provider detected.'] : [],
      record: scholarship,
    });
  });

  return {
    totalRows: rawItems.length,
    validCount,
    duplicateCount,
    errorCount,
    items,
  };
}
