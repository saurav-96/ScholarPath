import { useMemo, useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import {
  Archive,
  CheckCircle2,
  ClipboardList,
  Database,
  FileSpreadsheet,
  Globe2,
  GraduationCap,
  Plus,
  RefreshCw,
  ShieldCheck,
  University as UniversityIcon,
} from 'lucide-react';
import { PageMeta } from '@/components/common/PageMeta';
import { VerificationBadge } from '@/components/common/VerificationBadge';
import { Dialog } from '@/components/ui/Dialog';
import { Badge, Button, Card, Input, Select, Textarea } from '@/components/ui/Primitives';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/contexts/ToastContext';
import { useCatalogData } from '@/hooks/useScholarPathData';
import { type ImportReport, parseCsvRecords, validateAndPrepareImport } from '@/lib/importer';
import { generateId, slugify } from '@/lib/utils';
import { scholarshipInputSchema } from '@/schemas/validation';
import { dataService } from '@/services/dataService';
import type {
  CountryProfile,
  CoverageStatus,
  FundingTier,
  RecordKind,
  Scholarship,
  University,
  VerificationStatus,
} from '@/types/domain';

type AdminTab = 'scholarships' | 'universities' | 'countries' | 'importer' | 'quality' | 'logs';

const SAMPLE_CSV_TEMPLATE = `name,provider,countryCode,countryName,institutionDisplay,degreeLevel,summary,targetIntake,fundingTier,tuitionStatus,tuitionNote,livingStatus,livingNote,applicationFeeAmount,applicationDeadline,officialScholarshipUrl,officialApplicationUrl,sourceReference,verificationStatus,recordKind
Nordic Robotics Excellence Award,Nordic Institute Demo,DK,Denmark,Nordic University Demo,Bachelor's,Synthetic sample CSV import entry covering partial tuition support for BSc Robotics applicants.,2027,partial_tuition,conditional,50% tuition reduction in semester 1-6,not_covered,Living costs not covered,0,2027-02-01,https://studyindenmark.dk/,https://studyindenmark.dk/,Study in Denmark CSV Sample,officially_verified,synthetic_demo`;

export function AdminPage() {
  const { session } = useAuth();
  const { scholarships, universities, countries } = useCatalogData();
  const queryClient = useQueryClient();
  const { pushToast } = useToast();

  const [activeTab, setActiveTab] = useState<AdminTab>('scholarships');
  const [searchTerm, setSearchTerm] = useState('');
  const [verificationFilter, setVerificationFilter] = useState<'ALL' | VerificationStatus>('ALL');

  // Admin queries
  const { data: logs = [] } = useQuery({
    queryKey: ['admin-logs', session.userId],
    queryFn: () => dataService.fetchAdminLogs(session),
    enabled: session.role === 'admin',
  });

  const { data: correctionReports = [] } = useQuery({
    queryKey: ['admin-corrections', session.userId],
    queryFn: () => dataService.fetchCorrectionReportsForAdmin(session),
    enabled: session.role === 'admin',
  });

  async function invalidateAllAdminData() {
    await queryClient.invalidateQueries({ queryKey: ['catalog'] });
    await queryClient.invalidateQueries({ queryKey: ['admin-logs'] });
    await queryClient.invalidateQueries({ queryKey: ['admin-corrections'] });
  }

  // --- Scholarship Form Modal State ---
  const [schModalOpen, setSchModalOpen] = useState(false);
  const [editingSch, setEditingSch] = useState<Scholarship | null>(null);
  const [schName, setSchName] = useState('');
  const [schProvider, setSchProvider] = useState('');
  const [schCountryCode, setSchCountryCode] = useState('IT');
  const [schInstitution, setSchInstitution] = useState('');
  const [schDegreeLevel, setSchDegreeLevel] = useState<Scholarship['degreeLevel']>("Bachelor's");
  const [schSummary, setSchSummary] = useState('');
  const [schTargetIntake, setSchTargetIntake] = useState('2027');
  const [schFundingTier, setSchFundingTier] = useState<FundingTier>('full_tuition');
  const [schTuitionStatus, setSchTuitionStatus] = useState<CoverageStatus>('confirmed');
  const [schTuitionNote, setSchTuitionNote] = useState('Full tuition fee waiver confirmed.');
  const [schLivingStatus, setSchLivingStatus] = useState<CoverageStatus>('not_covered');
  const [schLivingMonthly, setSchLivingMonthly] = useState('');
  const [schLivingNote, setSchLivingNote] = useState('Living expenses funded separately.');
  const [schMinGpa, setSchMinGpa] = useState('3.2');
  const [schDeadline, setSchDeadline] = useState('2027-03-15');
  const [schAppFee, setSchAppFee] = useState('0');
  const [schOfficialUrl, setSchOfficialUrl] = useState('');
  const [schApplyUrl, setSchApplyUrl] = useState('');
  const [schSourceRef, setSchSourceRef] = useState('');
  const [schVerStatus, setSchVerStatus] = useState<VerificationStatus>('officially_verified');
  const [schRecordKind, setSchRecordKind] = useState<RecordKind>('official');
  const [schSubjectsText, setSchSubjectsText] = useState(
    'Computer Science, Artificial Intelligence, Software Engineering',
  );
  const [schDocsText, setSchDocsText] = useState(
    'High school transcripts, Valid passport, Motivation letter, English test score',
  );
  const [schError, setSchError] = useState<string | null>(null);

  function openNewScholarshipModal() {
    setEditingSch(null);
    setSchName('');
    setSchProvider('');
    setSchCountryCode('IT');
    setSchInstitution('');
    setSchDegreeLevel("Bachelor's");
    setSchSummary('');
    setSchTargetIntake('2027');
    setSchFundingTier('full_tuition');
    setSchTuitionStatus('confirmed');
    setSchTuitionNote('100% tuition fee waiver subject to verified annual enrollment.');
    setSchLivingStatus('not_covered');
    setSchLivingMonthly('');
    setSchLivingNote('No monthly cash stipend included.');
    setSchMinGpa('3.2');
    setSchDeadline('2027-03-15');
    setSchAppFee('0');
    setSchOfficialUrl('https://');
    setSchApplyUrl('https://');
    setSchSourceRef('');
    setSchVerStatus('officially_verified');
    setSchRecordKind('official');
    setSchError(null);
    setSchModalOpen(true);
  }

  function openEditScholarshipModal(s: Scholarship) {
    setEditingSch(s);
    setSchName(s.name);
    setSchProvider(s.provider);
    setSchCountryCode(s.countryCode);
    setSchInstitution(s.institutionDisplay);
    setSchDegreeLevel(s.degreeLevel);
    setSchSummary(s.summary);
    setSchTargetIntake(s.targetIntake);
    setSchFundingTier(s.fundingTier);
    setSchTuitionStatus(s.tuitionCoverage.status);
    setSchTuitionNote(s.tuitionCoverage.note);
    setSchLivingStatus(s.livingCoverage.status);
    setSchLivingMonthly(
      s.livingCoverage.amountMonthly !== null && s.livingCoverage.amountMonthly !== undefined
        ? String(s.livingCoverage.amountMonthly)
        : '',
    );
    setSchLivingNote(s.livingCoverage.note);
    setSchMinGpa(s.minGpa4Scale !== null ? String(s.minGpa4Scale) : '');
    setSchDeadline(s.applicationDeadline ?? '');
    setSchAppFee(s.applicationFeeAmount !== null ? String(s.applicationFeeAmount) : '');
    setSchOfficialUrl(s.officialScholarshipUrl);
    setSchApplyUrl(s.officialApplicationUrl);
    setSchSourceRef(s.sourceReference);
    setSchVerStatus(s.verificationStatus);
    setSchRecordKind(s.recordKind);
    setSchSubjectsText(s.eligibleSubjects.join(', '));
    setSchDocsText(s.requiredDocuments.join(', '));
    setSchError(null);
    setSchModalOpen(true);
  }

  async function handleSaveScholarship(e: React.FormEvent) {
    e.preventDefault();
    setSchError(null);

    const country = countries.find((c) => c.code === schCountryCode);
    const todayIso = new Date().toISOString().slice(0, 10);
    const monthlyNum = schLivingMonthly.trim() ? Number(schLivingMonthly) : null;
    const minGpaNum = schMinGpa.trim() ? Number(schMinGpa) : null;
    const feeNum = schAppFee.trim() ? Number(schAppFee) : null;

    const candidate = {
      name: schName.trim(),
      slug: editingSch?.slug ?? slugify(schName.trim()),
      provider: schProvider.trim(),
      countryCode: schCountryCode,
      countryName: country?.name ?? schCountryCode,
      institutionDisplay: schInstitution.trim() || schProvider.trim(),
      degreeLevel: schDegreeLevel,
      instructionLanguages: editingSch?.instructionLanguages ?? ['English'],
      summary: schSummary.trim(),
      targetIntake: schTargetIntake.trim() || '2027',
      acceptsAllInternational: editingSch?.acceptsAllInternational ?? true,
      eligibleNationalities: editingSch?.eligibleNationalities ?? ['All international / non-EU applicants'],
      excludedNationalities: editingSch?.excludedNationalities ?? [],
      eligibleSubjects: schSubjectsText
        .split(',')
        .map((s) => s.trim())
        .filter(Boolean),
      minGpa4Scale: Number.isFinite(minGpaNum) ? minGpaNum : null,
      minGpaNote: minGpaNum !== null ? `Minimum ${minGpaNum.toFixed(1)} / 4.0 GPA benchmark` : 'Holistic academic evaluation',
      fundingTier: schFundingTier,
      tuitionCoverage: { status: schTuitionStatus, note: schTuitionNote.trim() },
      livingCoverage: {
        status: schLivingStatus,
        note: schLivingNote.trim(),
        amountMonthly: monthlyNum,
        currency: country?.currencyCode ?? 'EUR',
      },
      accommodationCoverage: editingSch?.accommodationCoverage ?? {
        status: 'not_specified' as const,
        note: 'Confirm housing support in the official annual call.',
      },
      travelCoverage: editingSch?.travelCoverage ?? {
        status: 'not_covered' as const,
        note: 'International airfare usually not covered unless stated.',
      },
      insuranceCoverage: editingSch?.insuranceCoverage ?? {
        status: 'not_specified' as const,
        note: 'Check visa health insurance obligation separately.',
      },
      expensesNotCovered: editingSch?.expensesNotCovered ?? [
        'Visa fees and personal travel unless explicitly stated',
      ],
      applicationFeeAmount: Number.isFinite(feeNum) ? feeNum : null,
      applicationFeeCurrency: country?.currencyCode ?? 'EUR',
      applicationFeeNote: feeNum === 0 ? 'No scholarship application fee' : 'Confirm portal submission fee',
      applicationOpenDate: editingSch?.applicationOpenDate ?? null,
      applicationDeadline: schDeadline.trim() || null,
      deadlineTimezone: editingSch?.deadlineTimezone ?? 'UTC',
      deadlineNote: schDeadline.trim()
        ? `Deadline ${schDeadline.trim()} (verify exact cutoff hour on portal)`
        : 'Rolling or annual date — verify on portal',
      durationText: editingSch?.durationText ?? '3 years (Bachelor degree)',
      officialScholarshipUrl: schOfficialUrl.trim(),
      officialApplicationUrl: schApplyUrl.trim() || schOfficialUrl.trim(),
      sourceReference: schSourceRef.trim(),
      lastVerifiedAt: todayIso,
      verificationStatus: schVerStatus,
      recordKind: schRecordKind,
    };

    const parsed = scholarshipInputSchema.safeParse(candidate);
    if (!parsed.success) {
      setSchError(
        parsed.error.issues.map((i) => `${i.path.join('.') || 'field'}: ${i.message}`).join(' • '),
      );
      return;
    }

    const fullRecord: Scholarship = {
      ...(editingSch ?? {
        id: generateId('sch'),
        universityId: null,
        languageRequirements: { summary: 'English proficiency proof required (IELTS/TOEFL or institutional equivalent).' },
        academicRequirements: ['Completed upper secondary diploma qualifying for bachelor study'],
        nationalityRestrictionsNote: 'Open to international applicants unless restricted in official call.',
        applicationProcedure: ['Apply directly via the official scholarship/university portal.'],
        sources: [
          {
            title: candidate.sourceReference,
            url: candidate.officialScholarshipUrl,
            publisher: candidate.provider,
            verifiedAt: todayIso,
          },
        ],
        isArchived: candidate.verificationStatus === 'archived',
      }),
      ...parsed.data,
      slug: parsed.data.slug ?? slugify(parsed.data.name),
      requiredDocuments: schDocsText
        .split(',')
        .map((s) => s.trim())
        .filter(Boolean),
      isArchived: parsed.data.verificationStatus === 'archived',
    };

    try {
      await dataService.upsertScholarshipAsAdmin(session, fullRecord);
      await invalidateAllAdminData();
      pushToast({
        title: editingSch ? 'Scholarship updated & published' : 'New scholarship published',
        variant: 'success',
      });
      setSchModalOpen(false);
    } catch (err) {
      setSchError(err instanceof Error ? err.message : 'Unable to save scholarship.');
    }
  }

  // --- University Modal State ---
  const [uniModalOpen, setUniModalOpen] = useState(false);
  const [editingUni, setEditingUni] = useState<University | null>(null);
  const [uniName, setUniName] = useState('');
  const [uniCity, setUniCity] = useState('');
  const [uniCountry, setUniCountry] = useState('IT');
  const [uniWebsite, setUniWebsite] = useState('https://');
  const [uniTuitionMin, setUniTuitionMin] = useState('1500');
  const [uniTuitionMax, setUniTuitionMax] = useState('3500');
  const [uniTuitionCurrency, setUniTuitionCurrency] = useState('EUR');
  const [uniVerStatus, setUniVerStatus] = useState<VerificationStatus>('officially_verified');

  function openEditUniversity(u: University) {
    setEditingUni(u);
    setUniName(u.name);
    setUniCity(u.city);
    setUniCountry(u.countryCode);
    setUniWebsite(u.officialWebsite);
    setUniTuitionMin(u.tuitionMinAnnual !== null ? String(u.tuitionMinAnnual) : '');
    setUniTuitionMax(u.tuitionMaxAnnual !== null ? String(u.tuitionMaxAnnual) : '');
    setUniTuitionCurrency(u.tuitionCurrency);
    setUniVerStatus(u.verificationStatus);
    setUniModalOpen(true);
  }

  async function handleSaveUniversity(e: React.FormEvent) {
    e.preventDefault();
    if (!editingUni) return;
    const country = countries.find((c) => c.code === uniCountry);
    const updated: University = {
      ...editingUni,
      name: uniName.trim(),
      city: uniCity.trim(),
      countryCode: uniCountry,
      countryName: country?.name ?? editingUni.countryName,
      officialWebsite: uniWebsite.trim(),
      tuitionMinAnnual: uniTuitionMin.trim() ? Number(uniTuitionMin) : null,
      tuitionMaxAnnual: uniTuitionMax.trim() ? Number(uniTuitionMax) : null,
      tuitionCurrency: uniTuitionCurrency.trim() || 'EUR',
      verificationStatus: uniVerStatus,
      lastVerifiedAt: new Date().toISOString().slice(0, 10),
    };
    await dataService.upsertUniversityAsAdmin(session, updated);
    await invalidateAllAdminData();
    pushToast({ title: 'University record saved', variant: 'success' });
    setUniModalOpen(false);
  }

  // --- Country Quick Edit State ---
  const [editingCountry, setEditingCountry] = useState<CountryProfile | null>(null);
  const [countryOverview, setCountryOverview] = useState('');
  const [countryVerStatus, setCountryVerStatus] = useState<VerificationStatus>('officially_verified');

  // --- Importer State ---
  const [importMode, setImportMode] = useState<'csv' | 'json'>('csv');
  const [rawImportText, setRawImportText] = useState('');
  const [importReport, setImportReport] = useState<ImportReport | null>(null);
  const [importParseError, setImportParseError] = useState<string | null>(null);

  function runDryRun() {
    setImportParseError(null);
    try {
      const rawRows: Record<string, unknown>[] =
        importMode === 'csv'
          ? parseCsvRecords(rawImportText)
          : (JSON.parse(rawImportText) as Record<string, unknown>[]);
      if (!Array.isArray(rawRows) || rawRows.length === 0) {
        setImportParseError('No import rows parsed. Check headers/format.');
        setImportReport(null);
        return;
      }
      const report = validateAndPrepareImport(rawRows, scholarships);
      setImportReport(report);
    } catch (err) {
      setImportParseError(err instanceof Error ? err.message : 'Failed to parse input.');
      setImportReport(null);
    }
  }

  async function commitValidImport() {
    if (!importReport) return;
    const validRecords = importReport.items
      .filter((i) => i.valid && !i.isDuplicate && i.record)
      .map((i) => i.record!);
    if (validRecords.length === 0) {
      pushToast({ title: 'No new valid records to import', variant: 'warning' });
      return;
    }
    const insertedCount = await dataService.importScholarshipsAsAdmin(session, validRecords);
    await invalidateAllAdminData();
    pushToast({ title: `Imported ${insertedCount} scholarship record(s)`, variant: 'success' });
    setImportReport(null);
    setRawImportText('');
  }

  // Filtered scholarships list
  const filteredScholarships = useMemo(() => {
    const q = searchTerm.trim().toLowerCase();
    return scholarships.filter((s) => {
      if (verificationFilter !== 'ALL' && s.verificationStatus !== verificationFilter) return false;
      if (q) {
        const hay = `${s.name} ${s.provider} ${s.countryName} ${s.institutionDisplay}`.toLowerCase();
        if (!hay.includes(q)) return false;
      }
      return true;
    });
  }, [scholarships, searchTerm, verificationFilter]);

  const qualityMetrics = useMemo(() => {
    const total = scholarships.length;
    const verifiedOfficial = scholarships.filter(
      (s) => s.verificationStatus === 'officially_verified' && s.recordKind === 'official',
    ).length;
    const needsReverification = scholarships.filter(
      (s) => s.verificationStatus === 'needs_reverification',
    ).length;
    const archived = scholarships.filter((s) => s.isArchived).length;
    const synthetic = scholarships.filter((s) => s.recordKind === 'synthetic_demo').length;
    const openReports = correctionReports.filter((r) => r.status === 'open').length;

    return { total, verifiedOfficial, needsReverification, archived, synthetic, openReports };
  }, [scholarships, correctionReports]);

  return (
    <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
      <PageMeta
        title="Admin Verification CMS"
        description="Manage verified scholarships, universities, country guides, CSV/JSON imports, correction reports, and audit logs."
      />

      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <Badge variant="warning">Admin CMS</Badge>
            <Badge variant="outline">{session.email}</Badge>
          </div>
          <h1 className="mt-2 font-display text-3xl font-bold text-text-primary">
            Catalog Verification &amp; Operations
          </h1>
          <p className="mt-1 text-sm text-text-secondary">
            Role-restricted content management system enforcing schema validation, official source
            URLs, and immutable audit logs.
          </p>
        </div>
        <Button onClick={openNewScholarshipModal}>
          <Plus className="h-4 w-4" />
          Add New Scholarship
        </Button>
      </div>

      {/* Tabs */}
      <div className="mt-6 flex flex-wrap gap-2 border-b border-border-subtle pb-3">
        {(
          [
            { id: 'scholarships', label: `Scholarships (${scholarships.length})`, icon: GraduationCap },
            { id: 'universities', label: `Universities (${universities.length})`, icon: UniversityIcon },
            { id: 'countries', label: `Countries (${countries.length})`, icon: Globe2 },
            { id: 'importer', label: 'CSV / JSON Importer', icon: FileSpreadsheet },
            {
              id: 'quality',
              label: `Quality & Reports (${qualityMetrics.openReports} open)`,
              icon: ShieldCheck,
            },
            { id: 'logs', label: `Audit Logs (${logs.length})`, icon: ClipboardList },
          ] as const
        ).map((tab) => {
          const Icon = tab.icon;
          const active = activeTab === tab.id;
          return (
            <Button
              key={tab.id}
              size="sm"
              variant={active ? 'primary' : 'outline'}
              onClick={() => setActiveTab(tab.id)}
            >
              <Icon className="h-3.5 w-3.5" />
              {tab.label}
            </Button>
          );
        })}
      </div>

      {/* TAB 1: SCHOLARSHIPS */}
      {activeTab === 'scholarships' && (
        <div className="mt-6 space-y-4">
          <div className="flex flex-wrap gap-3">
            <Input
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Search scholarships by name, provider, country..."
              className="min-w-[220px] flex-1"
            />
            <Select
              value={verificationFilter}
              onChange={(e) =>
                setVerificationFilter(e.target.value as 'ALL' | VerificationStatus)
              }
              className="w-full sm:w-56"
            >
              <option value="ALL">All Verification Statuses</option>
              <option value="officially_verified">Officially Verified</option>
              <option value="needs_reverification">Needs Re-verification</option>
              <option value="unverified">Unverified</option>
              <option value="archived">Archived</option>
            </Select>
          </div>

          <div className="space-y-3">
            {filteredScholarships.map((sch) => (
              <Card key={sch.id} className="flex flex-wrap items-center justify-between gap-4">
                <div className="min-w-0 flex-1 space-y-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <VerificationBadge
                      status={sch.verificationStatus}
                      recordKind={sch.recordKind}
                    />
                    <Badge variant="outline">{sch.countryCode}</Badge>
                    <Badge variant="secondary">{sch.fundingTier.replace('_', ' ')}</Badge>
                    <span className="font-mono text-xs text-text-muted">
                      Verified: {sch.lastVerifiedAt}
                    </span>
                  </div>
                  <h2 className="text-base font-semibold text-text-primary">{sch.name}</h2>
                  <p className="text-xs text-text-secondary">
                    {sch.provider} • Deadline: {sch.applicationDeadline ?? 'Rolling'}
                  </p>
                </div>

                <div className="flex flex-wrap items-center gap-2">
                  {sch.verificationStatus !== 'officially_verified' && (
                    <Button
                      size="sm"
                      variant="secondary"
                      onClick={async () => {
                        await dataService.upsertScholarshipAsAdmin(session, {
                          ...sch,
                          verificationStatus: 'officially_verified',
                          lastVerifiedAt: new Date().toISOString().slice(0, 10),
                          isArchived: false,
                        });
                        await invalidateAllAdminData();
                        pushToast({ title: `Verified ${sch.name}`, variant: 'success' });
                      }}
                    >
                      <CheckCircle2 className="h-3.5 w-3.5" />
                      Verify
                    </Button>
                  )}

                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => openEditScholarshipModal(sch)}
                  >
                    Edit
                  </Button>

                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={async () => {
                      const nextArchived = !sch.isArchived;
                      await dataService.upsertScholarshipAsAdmin(session, {
                        ...sch,
                        isArchived: nextArchived,
                        verificationStatus: nextArchived ? 'archived' : 'officially_verified',
                      });
                      await invalidateAllAdminData();
                      pushToast({
                        title: nextArchived ? 'Archived scholarship' : 'Restored scholarship',
                        variant: 'info',
                      });
                    }}
                  >
                    <Archive className="h-3.5 w-3.5" />
                    {sch.isArchived ? 'Restore' : 'Archive'}
                  </Button>
                </div>
              </Card>
            ))}
          </div>
        </div>
      )}

      {/* TAB 2: UNIVERSITIES */}
      {activeTab === 'universities' && (
        <div className="mt-6 grid gap-4 md:grid-cols-2">
          {universities.map((u) => (
            <Card key={u.id} className="flex items-start justify-between gap-3">
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <VerificationBadge status={u.verificationStatus} recordKind={u.recordKind} />
                  <Badge variant="outline">{u.countryCode}</Badge>
                </div>
                <h2 className="text-sm font-semibold text-text-primary">{u.name}</h2>
                <p className="text-xs text-text-secondary">
                  {u.city}, {u.countryName} • {u.institutionType}
                </p>
                <p className="font-mono text-[11px] text-text-muted">
                  Tuition: {u.tuitionMinAnnual ?? '?'}–{u.tuitionMaxAnnual ?? '?'}{' '}
                  {u.tuitionCurrency}
                </p>
              </div>
              <Button size="sm" variant="outline" onClick={() => openEditUniversity(u)}>
                Edit
              </Button>
            </Card>
          ))}
        </div>
      )}

      {/* TAB 3: COUNTRIES */}
      {activeTab === 'countries' && (
        <div className="mt-6 grid gap-4 md:grid-cols-2">
          {countries.map((c) => (
            <Card key={c.code} className="flex items-start justify-between gap-3">
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <VerificationBadge status={c.verificationStatus} />
                  <Badge variant="outline">{c.code}</Badge>
                </div>
                <h2 className="text-sm font-semibold text-text-primary">{c.name}</h2>
                <p className="line-clamp-2 text-xs text-text-secondary">{c.tuitionOverview}</p>
              </div>
              <Button
                size="sm"
                variant="outline"
                onClick={() => {
                  setEditingCountry(c);
                  setCountryOverview(c.tuitionOverview);
                  setCountryVerStatus(c.verificationStatus);
                }}
              >
                Edit
              </Button>
            </Card>
          ))}
        </div>
      )}

      {/* TAB 4: JSON / CSV IMPORTER */}
      {activeTab === 'importer' && (
        <div className="mt-6 space-y-5">
          <Card className="space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div>
                <h2 className="text-base font-semibold text-text-primary">
                  Bulk Scholarship Validator &amp; Importer
                </h2>
                <p className="text-xs text-text-secondary">
                  Every row is checked against Zod schema validation and slug/provider
                  deduplication before writing to the catalog.
                </p>
              </div>
              <div className="flex items-center gap-2">
                <Button
                  size="sm"
                  variant={importMode === 'csv' ? 'primary' : 'outline'}
                  onClick={() => setImportMode('csv')}
                >
                  CSV Mode
                </Button>
                <Button
                  size="sm"
                  variant={importMode === 'json' ? 'primary' : 'outline'}
                  onClick={() => setImportMode('json')}
                >
                  JSON Array Mode
                </Button>
                <Button
                  size="sm"
                  variant="secondary"
                  onClick={() => {
                    setImportMode('csv');
                    setRawImportText(SAMPLE_CSV_TEMPLATE);
                  }}
                >
                  Load Sample CSV
                </Button>
              </div>
            </div>

            <Textarea
              value={rawImportText}
              onChange={(e) => setRawImportText(e.target.value)}
              placeholder={
                importMode === 'csv'
                  ? 'Paste CSV with header row...'
                  : 'Paste JSON array of scholarship objects...'
              }
              className="min-h-[180px] font-mono text-xs"
            />

            {importParseError && (
              <p className="text-xs font-medium text-status-error">{importParseError}</p>
            )}

            <div className="flex flex-wrap gap-2">
              <Button variant="outline" onClick={runDryRun} disabled={!rawImportText.trim()}>
                Validate Dry-Run
              </Button>
              {importReport && importReport.validCount > 0 && (
                <Button onClick={commitValidImport}>
                  Commit {importReport.validCount} Valid Record(s)
                </Button>
              )}
            </div>
          </Card>

          {importReport && (
            <Card className="space-y-4">
              <div className="flex flex-wrap gap-3 text-xs">
                <Badge variant="outline">Total Rows: {importReport.totalRows}</Badge>
                <Badge variant="success">Valid &amp; Ready: {importReport.validCount}</Badge>
                <Badge variant="warning">Duplicates Skipped: {importReport.duplicateCount}</Badge>
                <Badge variant="error">Validation Errors: {importReport.errorCount}</Badge>
              </div>

              <div className="space-y-2">
                {importReport.items.map((item) => (
                  <div
                    key={item.rowIndex}
                    className="rounded-lg border border-border-subtle bg-bg-secondary p-3 text-xs"
                  >
                    <div className="flex items-center justify-between gap-2">
                      <span className="font-mono font-semibold text-text-primary">
                        Row #{item.rowIndex} {item.record ? `— ${item.record.name}` : ''}
                      </span>
                      <Badge
                        variant={
                          item.isDuplicate ? 'warning' : item.valid ? 'success' : 'error'
                        }
                      >
                        {item.isDuplicate ? 'Duplicate' : item.valid ? 'Valid' : 'Error'}
                      </Badge>
                    </div>
                    {item.errors.length > 0 && (
                      <ul className="mt-1 list-disc pl-4 text-status-error">
                        {item.errors.map((err, i) => (
                          <li key={i}>{err}</li>
                        ))}
                      </ul>
                    )}
                  </div>
                ))}
              </div>
            </Card>
          )}
        </div>
      )}

      {/* TAB 5: DATA QUALITY & CORRECTION REPORTS */}
      {activeTab === 'quality' && (
        <div className="mt-6 space-y-6">
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <Card>
              <p className="text-xs text-text-muted">Verified Official Programs</p>
              <p className="mt-1 text-2xl font-bold text-status-success">
                {qualityMetrics.verifiedOfficial}
              </p>
            </Card>
            <Card>
              <p className="text-xs text-text-muted">Needs Re-verification</p>
              <p className="mt-1 text-2xl font-bold text-status-warning">
                {qualityMetrics.needsReverification}
              </p>
            </Card>
            <Card>
              <p className="text-xs text-text-muted">Explicit Synthetic Demos</p>
              <p className="mt-1 text-2xl font-bold text-accent-secondary">
                {qualityMetrics.synthetic}
              </p>
            </Card>
            <Card>
              <p className="text-xs text-text-muted">Open Correction Reports</p>
              <p className="mt-1 text-2xl font-bold text-accent-primary">
                {qualityMetrics.openReports}
              </p>
            </Card>
          </div>

          <div className="space-y-3">
            <h2 className="font-display text-lg font-bold text-text-primary">
              Community Correction Reports
            </h2>
            {correctionReports.length === 0 ? (
              <Card className="text-sm text-text-secondary">
                No correction reports submitted yet. Users can flag outdated deadlines or URLs on
                any scholarship detail page.
              </Card>
            ) : (
              correctionReports.map((rep) => (
                <Card key={rep.id} className="space-y-2">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div className="flex items-center gap-2">
                      <Badge
                        variant={
                          rep.status === 'open'
                            ? 'warning'
                            : rep.status === 'verified_fixed'
                              ? 'success'
                              : 'default'
                        }
                      >
                        {rep.status}
                      </Badge>
                      <span className="text-sm font-semibold text-text-primary">
                        {rep.targetName}
                      </span>
                    </div>
                    <span className="font-mono text-xs text-text-muted">
                      {rep.createdAt.slice(0, 10)}
                    </span>
                  </div>
                  <p className="text-xs text-text-secondary">{rep.summary}</p>
                  {rep.suggestedUrl && (
                    <a
                      href={rep.suggestedUrl}
                      target="_blank"
                      rel="noreferrer"
                      className="text-xs text-accent-primary hover:underline"
                    >
                      Suggested URL: {rep.suggestedUrl}
                    </a>
                  )}
                  {rep.status === 'open' && (
                    <div className="flex gap-2 pt-2">
                      <Button
                        size="sm"
                        variant="secondary"
                        onClick={async () => {
                          await dataService.resolveCorrectionReport(
                            session,
                            rep.id,
                            'verified_fixed',
                            'Reviewed against official source.',
                          );
                          await invalidateAllAdminData();
                          pushToast({ title: 'Correction marked fixed', variant: 'success' });
                        }}
                      >
                        Mark Verified &amp; Fixed
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={async () => {
                          await dataService.resolveCorrectionReport(
                            session,
                            rep.id,
                            'dismissed',
                            'Catalog matches official notice.',
                          );
                          await invalidateAllAdminData();
                          pushToast({ title: 'Report dismissed', variant: 'info' });
                        }}
                      >
                        Dismiss
                      </Button>
                    </div>
                  )}
                </Card>
              ))
            )}
          </div>
        </div>
      )}

      {/* TAB 6: AUDIT LOGS */}
      {activeTab === 'logs' && (
        <div className="mt-6 space-y-2">
          {logs.length === 0 ? (
            <Card className="flex items-center gap-2 text-sm text-text-secondary">
              <Database className="h-4 w-4 text-accent-primary" />
              No administrative edits recorded yet in this session. Create or verify a record to
              generate an audit trail entry.
            </Card>
          ) : (
            logs.map((log) => (
              <Card key={log.id} className="flex flex-wrap items-center justify-between gap-2 py-3 text-xs">
                <div className="space-y-0.5">
                  <div className="flex items-center gap-2">
                    <Badge variant="primary">{log.action}</Badge>
                    <Badge variant="outline">{log.entityType}</Badge>
                    <span className="font-mono text-text-muted">{log.actorEmail}</span>
                  </div>
                  <p className="text-sm text-text-primary">{log.summary}</p>
                </div>
                <span className="font-mono text-[11px] text-text-muted">
                  {new Date(log.createdAt).toLocaleString()}
                </span>
              </Card>
            ))
          )}
        </div>
      )}

      {/* Add / Edit Scholarship Dialog */}
      <Dialog
        open={schModalOpen}
        onClose={() => setSchModalOpen(false)}
        title={editingSch ? `Edit ${editingSch.name}` : 'Create & Verify Scholarship'}
        description="Official URLs must start with https:// or http://. Newly published verified records appear immediately in discovery."
        maxWidthClass="max-w-3xl"
      >
        <form onSubmit={handleSaveScholarship} className="space-y-4">
          {schError && (
            <div className="rounded-lg border border-status-error/40 bg-status-error/10 p-3 text-xs text-status-error">
              {schError}
            </div>
          )}

          <div className="grid gap-3 sm:grid-cols-2">
            <div>
              <label className="mb-1 block text-xs font-medium text-text-secondary">
                Scholarship Name *
              </label>
              <Input
                required
                value={schName}
                onChange={(e) => setSchName(e.target.value)}
                placeholder="e.g., Nordic Green Computing BSc Grant"
              />
            </div>
            <div>
              <label className="mb-1 block text-xs font-medium text-text-secondary">
                Provider / Government / University *
              </label>
              <Input
                required
                value={schProvider}
                onChange={(e) => setSchProvider(e.target.value)}
                placeholder="e.g., Danish Ministry of Higher Education"
              />
            </div>
          </div>

          <div className="grid gap-3 sm:grid-cols-3">
            <div>
              <label className="mb-1 block text-xs font-medium text-text-secondary">
                Country *
              </label>
              <Select value={schCountryCode} onChange={(e) => setSchCountryCode(e.target.value)}>
                {countries.map((c) => (
                  <option key={c.code} value={c.code}>
                    {c.name} ({c.code})
                  </option>
                ))}
              </Select>
            </div>
            <div>
              <label className="mb-1 block text-xs font-medium text-text-secondary">
                Institution Display
              </label>
              <Input
                value={schInstitution}
                onChange={(e) => setSchInstitution(e.target.value)}
                placeholder="Institution or National Consortium"
              />
            </div>
            <div>
              <label className="mb-1 block text-xs font-medium text-text-secondary">
                Degree Level
              </label>
              <Select
                value={schDegreeLevel}
                onChange={(e) => setSchDegreeLevel(e.target.value as Scholarship['degreeLevel'])}
              >
                <option value="Bachelor's">Bachelor&apos;s</option>
                <option value="Bachelor's & Master's">Bachelor&apos;s &amp; Master&apos;s</option>
                <option value="Foundation / Pathway">Foundation / Pathway</option>
              </Select>
            </div>
          </div>

          <div>
            <label className="mb-1 block text-xs font-medium text-text-secondary">
              Verified Summary * (min 20 chars)
            </label>
            <Textarea
              required
              value={schSummary}
              onChange={(e) => setSchSummary(e.target.value)}
              placeholder="Accurate factual description citing eligibility, stipend rules, and renewal criteria..."
            />
          </div>

          <div className="grid gap-3 sm:grid-cols-3">
            <div>
              <label className="mb-1 block text-xs font-medium text-text-secondary">
                Funding Tier
              </label>
              <Select
                value={schFundingTier}
                onChange={(e) => setSchFundingTier(e.target.value as FundingTier)}
              >
                <option value="fully_funded">Fully Funded (Tuition + Living)</option>
                <option value="full_tuition">Full Tuition Waiver</option>
                <option value="partial_tuition">Partial Tuition</option>
                <option value="stipend_only">Stipend Only</option>
                <option value="fee_waiver_conditional">Need-Based / Conditional Waiver</option>
              </Select>
            </div>
            <div>
              <label className="mb-1 block text-xs font-medium text-text-secondary">
                Verification Status
              </label>
              <Select
                value={schVerStatus}
                onChange={(e) => setSchVerStatus(e.target.value as VerificationStatus)}
              >
                <option value="officially_verified">Officially Verified</option>
                <option value="needs_reverification">Needs Re-verification</option>
                <option value="unverified">Unverified</option>
                <option value="archived">Archived</option>
              </Select>
            </div>
            <div>
              <label className="mb-1 block text-xs font-medium text-text-secondary">
                Record Kind
              </label>
              <Select
                value={schRecordKind}
                onChange={(e) => setSchRecordKind(e.target.value as RecordKind)}
              >
                <option value="official">Official Catalog Record</option>
                <option value="synthetic_demo">Synthetic Demo Record</option>
              </Select>
            </div>
          </div>

          <div className="grid gap-3 sm:grid-cols-2">
            <div className="space-y-2 rounded-lg border border-border-subtle p-3">
              <label className="block text-xs font-semibold text-text-primary">
                Tuition Coverage Status &amp; Note
              </label>
              <Select
                value={schTuitionStatus}
                onChange={(e) => setSchTuitionStatus(e.target.value as CoverageStatus)}
              >
                <option value="confirmed">Confirmed</option>
                <option value="conditional">Conditional</option>
                <option value="not_covered">Not Covered</option>
                <option value="not_specified">Not Specified</option>
              </Select>
              <Input
                value={schTuitionNote}
                onChange={(e) => setSchTuitionNote(e.target.value)}
                placeholder="Tuition coverage breakdown"
              />
            </div>
            <div className="space-y-2 rounded-lg border border-border-subtle p-3">
              <label className="block text-xs font-semibold text-text-primary">
                Living Coverage Status, Monthly Stipend &amp; Note
              </label>
              <div className="flex gap-2">
                <Select
                  value={schLivingStatus}
                  onChange={(e) => setSchLivingStatus(e.target.value as CoverageStatus)}
                >
                  <option value="confirmed">Confirmed</option>
                  <option value="conditional">Conditional</option>
                  <option value="not_covered">Not Covered</option>
                  <option value="not_specified">Not Specified</option>
                </Select>
                <Input
                  type="number"
                  min={0}
                  value={schLivingMonthly}
                  onChange={(e) => setSchLivingMonthly(e.target.value)}
                  placeholder="Monthly amt"
                  className="w-32"
                />
              </div>
              <Input
                value={schLivingNote}
                onChange={(e) => setSchLivingNote(e.target.value)}
                placeholder="Living stipend breakdown"
              />
            </div>
          </div>

          <div className="grid gap-3 sm:grid-cols-4">
            <div>
              <label className="mb-1 block text-xs font-medium text-text-secondary">
                Min GPA (0–4.0)
              </label>
              <Input
                type="number"
                step="0.1"
                min={0}
                max={4}
                value={schMinGpa}
                onChange={(e) => setSchMinGpa(e.target.value)}
              />
            </div>
            <div>
              <label className="mb-1 block text-xs font-medium text-text-secondary">
                App Fee (0 = Free)
              </label>
              <Input
                type="number"
                min={0}
                value={schAppFee}
                onChange={(e) => setSchAppFee(e.target.value)}
              />
            </div>
            <div>
              <label className="mb-1 block text-xs font-medium text-text-secondary">
                Deadline (YYYY-MM-DD)
              </label>
              <Input
                type="date"
                value={schDeadline}
                onChange={(e) => setSchDeadline(e.target.value)}
              />
            </div>
            <div>
              <label className="mb-1 block text-xs font-medium text-text-secondary">
                Target Intake
              </label>
              <Input value={schTargetIntake} onChange={(e) => setSchTargetIntake(e.target.value)} />
            </div>
          </div>

          <div className="grid gap-3 sm:grid-cols-3">
            <div>
              <label className="mb-1 block text-xs font-medium text-text-secondary">
                Official Scholarship URL *
              </label>
              <Input
                required
                type="url"
                value={schOfficialUrl}
                onChange={(e) => setSchOfficialUrl(e.target.value)}
              />
            </div>
            <div>
              <label className="mb-1 block text-xs font-medium text-text-secondary">
                Official Application URL *
              </label>
              <Input
                required
                type="url"
                value={schApplyUrl}
                onChange={(e) => setSchApplyUrl(e.target.value)}
              />
            </div>
            <div>
              <label className="mb-1 block text-xs font-medium text-text-secondary">
                Source Reference Label *
              </label>
              <Input
                required
                value={schSourceRef}
                onChange={(e) => setSchSourceRef(e.target.value)}
                placeholder="Official University Aid Page"
              />
            </div>
          </div>

          <div className="grid gap-3 sm:grid-cols-2">
            <div>
              <label className="mb-1 block text-xs font-medium text-text-secondary">
                Eligible Subjects (comma-separated)
              </label>
              <Input value={schSubjectsText} onChange={(e) => setSchSubjectsText(e.target.value)} />
            </div>
            <div>
              <label className="mb-1 block text-xs font-medium text-text-secondary">
                Required Documents (comma-separated)
              </label>
              <Input value={schDocsText} onChange={(e) => setSchDocsText(e.target.value)} />
            </div>
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <Button variant="outline" onClick={() => setSchModalOpen(false)}>
              Cancel
            </Button>
            <Button type="submit">
              <RefreshCw className="h-3.5 w-3.5" />
              Save &amp; Publish Record
            </Button>
          </div>
        </form>
      </Dialog>

      {/* Edit University Dialog */}
      <Dialog
        open={uniModalOpen}
        onClose={() => setUniModalOpen(false)}
        title={`Edit ${editingUni?.name ?? 'University'}`}
      >
        <form onSubmit={handleSaveUniversity} className="space-y-4">
          <div>
            <label className="mb-1 block text-xs font-medium text-text-secondary">
              University Name
            </label>
            <Input required value={uniName} onChange={(e) => setUniName(e.target.value)} />
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            <div>
              <label className="mb-1 block text-xs font-medium text-text-secondary">City</label>
              <Input required value={uniCity} onChange={(e) => setUniCity(e.target.value)} />
            </div>
            <div>
              <label className="mb-1 block text-xs font-medium text-text-secondary">Country</label>
              <Select value={uniCountry} onChange={(e) => setUniCountry(e.target.value)}>
                {countries.map((c) => (
                  <option key={c.code} value={c.code}>
                    {c.name}
                  </option>
                ))}
              </Select>
            </div>
          </div>
          <div className="grid gap-3 sm:grid-cols-3">
            <div>
              <label className="mb-1 block text-xs font-medium text-text-secondary">
                Tuition Min
              </label>
              <Input
                type="number"
                min={0}
                value={uniTuitionMin}
                onChange={(e) => setUniTuitionMin(e.target.value)}
              />
            </div>
            <div>
              <label className="mb-1 block text-xs font-medium text-text-secondary">
                Tuition Max
              </label>
              <Input
                type="number"
                min={0}
                value={uniTuitionMax}
                onChange={(e) => setUniTuitionMax(e.target.value)}
              />
            </div>
            <div>
              <label className="mb-1 block text-xs font-medium text-text-secondary">Currency</label>
              <Input
                value={uniTuitionCurrency}
                onChange={(e) => setUniTuitionCurrency(e.target.value)}
              />
            </div>
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            <div>
              <label className="mb-1 block text-xs font-medium text-text-secondary">
                Official Website
              </label>
              <Input required type="url" value={uniWebsite} onChange={(e) => setUniWebsite(e.target.value)} />
            </div>
            <div>
              <label className="mb-1 block text-xs font-medium text-text-secondary">
                Verification Status
              </label>
              <Select
                value={uniVerStatus}
                onChange={(e) => setUniVerStatus(e.target.value as VerificationStatus)}
              >
                <option value="officially_verified">Officially Verified</option>
                <option value="needs_reverification">Needs Re-verification</option>
                <option value="unverified">Unverified</option>
                <option value="archived">Archived</option>
              </Select>
            </div>
          </div>
          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={() => setUniModalOpen(false)}>
              Cancel
            </Button>
            <Button type="submit">Save University</Button>
          </div>
        </form>
      </Dialog>

      {/* Edit Country Dialog */}
      <Dialog
        open={Boolean(editingCountry)}
        onClose={() => setEditingCountry(null)}
        title={`Edit Country Guide — ${editingCountry?.name ?? ''}`}
      >
        <form
          onSubmit={async (e) => {
            e.preventDefault();
            if (!editingCountry) return;
            await dataService.updateCountryAsAdmin(session, {
              ...editingCountry,
              tuitionOverview: countryOverview.trim(),
              verificationStatus: countryVerStatus,
              lastVerifiedAt: new Date().toISOString().slice(0, 10),
            });
            await invalidateAllAdminData();
            pushToast({ title: `Updated ${editingCountry.name}`, variant: 'success' });
            setEditingCountry(null);
          }}
          className="space-y-4"
        >
          <div>
            <label className="mb-1 block text-xs font-medium text-text-secondary">
              Tuition Overview
            </label>
            <Textarea
              required
              value={countryOverview}
              onChange={(e) => setCountryOverview(e.target.value)}
            />
          </div>
          <div>
            <label className="mb-1 block text-xs font-medium text-text-secondary">
              Verification Status
            </label>
            <Select
              value={countryVerStatus}
              onChange={(e) => setCountryVerStatus(e.target.value as VerificationStatus)}
            >
              <option value="officially_verified">Officially Verified</option>
              <option value="needs_reverification">Needs Re-verification</option>
              <option value="unverified">Unverified</option>
            </Select>
          </div>
          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={() => setEditingCountry(null)}>
              Cancel
            </Button>
            <Button type="submit">Save Country Guide</Button>
          </div>
        </form>
      </Dialog>
    </div>
  );
}
