import { describe, expect, it } from 'vitest';
import { SCHOLARSHIPS_DATA } from '@/data/scholarships';
import { parseCsvRecords, validateAndPrepareImport } from '@/lib/importer';

describe('scholarship JSON/CSV importer', () => {
  it('parses quoted CSV columns cleanly', () => {
    const csv = `name,provider,countryCode\n"Global Grant, Phase 2","National Ministry",IT`;
    const rows = parseCsvRecords(csv);
    expect(rows).toHaveLength(1);
    expect(rows[0].name).toBe('Global Grant, Phase 2');
    expect(rows[0].countryCode).toBe('IT');
  });

  it('detects invalid URLs and duplicates without breaking valid rows', () => {
    const existing = SCHOLARSHIPS_DATA[0];
    const rows = [
      // Valid new record
      {
        name: 'Unique Nordic Demo Scholarship 2027',
        provider: 'Nordic Education Agency',
        countryCode: 'NO',
        countryName: 'Norway',
        institutionDisplay: 'Nordic Consortium',
        degreeLevel: "Bachelor's",
        summary: 'Valid bachelor scholarship entry with confirmed official portal reference.',
        targetIntake: '2027',
        fundingTier: 'full_tuition',
        tuitionStatus: 'confirmed',
        tuitionNote: 'Full tuition covered',
        livingStatus: 'not_covered',
        livingNote: 'Not covered',
        officialScholarshipUrl: 'https://studyinnorway.no/',
        officialApplicationUrl: 'https://studyinnorway.no/',
        sourceReference: 'Study in Norway',
        verificationStatus: 'officially_verified',
        recordKind: 'synthetic_demo',
      },
      // Duplicate of existing scholarship
      {
        name: existing.name,
        provider: existing.provider,
        countryCode: existing.countryCode,
        countryName: existing.countryName,
        summary: existing.summary,
        officialScholarshipUrl: existing.officialScholarshipUrl,
        officialApplicationUrl: existing.officialApplicationUrl,
        sourceReference: existing.sourceReference,
        verificationStatus: 'officially_verified',
      },
      // Unsafe URL scheme (javascript:)
      {
        name: 'Malicious URL Entry',
        provider: 'Bad Org',
        countryCode: 'DE',
        countryName: 'Germany',
        summary: 'Testing unsafe scheme rejection during dry-run validation.',
        officialScholarshipUrl: 'javascript:alert(1)',
        officialApplicationUrl: 'https://daad.de/',
        sourceReference: 'Bad Source',
        verificationStatus: 'unverified',
      },
    ];

    const report = validateAndPrepareImport(rows, SCHOLARSHIPS_DATA);
    expect(report.totalRows).toBe(3);
    expect(report.validCount).toBe(1);
    expect(report.duplicateCount).toBe(1);
    expect(report.errorCount).toBe(1);
    expect(report.items[0].valid).toBe(true);
    expect(report.items[1].isDuplicate).toBe(true);
    expect(report.items[2].valid).toBe(false);
  });
});
