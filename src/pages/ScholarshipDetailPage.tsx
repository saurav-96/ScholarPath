import { useMemo, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import {
  ArrowLeft,
  Bookmark,
  BookmarkCheck,
  Calendar,
  ExternalLink,
  FileCheck2,
  Flag,
  FolderPlus,
  ShieldCheck,
} from 'lucide-react';
import { PageMeta } from '@/components/common/PageMeta';
import { VerificationBadge } from '@/components/common/VerificationBadge';
import { FundingBreakdownCard } from '@/components/scholarship/FundingBreakdownCard';
import { MatchResultPanel } from '@/components/scholarship/MatchResultPanel';
import { Dialog } from '@/components/ui/Dialog';
import { Badge, Button, Card, Input, Textarea } from '@/components/ui/Primitives';
import { useToast } from '@/contexts/ToastContext';
import { useCatalogData, useUserWorkspace } from '@/hooks/useScholarPathData';
import { formatDeadlineDisplay, getUserTimezone } from '@/lib/dates';
import { evaluateScholarshipMatch } from '@/lib/matching';
import { generateId } from '@/lib/utils';
import { correctionReportSchema } from '@/schemas/validation';

export function ScholarshipDetailPage() {
  const { slug } = useParams();
  const navigate = useNavigate();
  const { pushToast } = useToast();
  const { scholarships } = useCatalogData();
  const {
    userState,
    toggleSavedScholarship,
    upsertApplication,
    submitCorrection,
  } = useUserWorkspace();

  const [reportOpen, setReportOpen] = useState(false);
  const [reportSummary, setReportSummary] = useState('');
  const [reportUrl, setReportUrl] = useState('');
  const [reportError, setReportError] = useState<string | null>(null);

  const scholarship = useMemo(
    () => scholarships.find((s) => s.slug === slug || s.id === slug),
    [scholarships, slug],
  );

  if (!scholarship) {
    return (
      <div className="mx-auto max-w-3xl px-4 py-16 text-center">
        <h1 className="text-2xl font-bold text-text-primary">Scholarship Not Found</h1>
        <p className="mt-2 text-sm text-text-secondary">
          The requested scholarship record could not be located.
        </p>
        <Link to="/scholarships" className="mt-4 inline-block">
          <Button>Return to Scholarship Discovery</Button>
        </Link>
      </div>
    );
  }

  const isSaved = Boolean(
    userState?.savedScholarships.some((item) => item.scholarshipId === scholarship.id),
  );
  const isTracked = Boolean(
    userState?.applications.some((app) => app.scholarshipId === scholarship.id),
  );
  const match = userState?.profile
    ? evaluateScholarshipMatch(scholarship, userState.profile)
    : null;
  const userTz = getUserTimezone();

  const handleTrackApplication = async () => {
    if (isTracked) {
      navigate('/applications');
      return;
    }
    await upsertApplication({
      id: generateId('app'),
      scholarshipId: scholarship.id,
      universityId: scholarship.universityId,
      customTitle: scholarship.name,
      universityName: scholarship.institutionDisplay,
      countryCode: scholarship.countryCode,
      status: 'researching',
      deadline: scholarship.applicationDeadline,
      submissionDate: null,
      personalNotes: `Added from detail page. Official portal: ${scholarship.officialApplicationUrl}`,
      tasks: scholarship.requiredDocuments.slice(0, 3).map((doc) => ({
        id: generateId('task'),
        title: `Prepare: ${doc}`,
        dueDate: scholarship.applicationDeadline,
        completed: false,
        priority: 'medium',
      })),
      updatedAt: new Date().toISOString(),
    });
    navigate('/applications');
  };

  const handleReportSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setReportError(null);
    const parsed = correctionReportSchema.safeParse({
      targetType: 'scholarship',
      targetId: scholarship.id,
      targetName: scholarship.name,
      summary: reportSummary,
      suggestedUrl: reportUrl,
    });
    if (!parsed.success) {
      setReportError(parsed.error.issues[0]?.message ?? 'Invalid report inputs.');
      return;
    }
    await submitCorrection(parsed.data);
    setReportOpen(false);
    setReportSummary('');
    setReportUrl('');
  };

  return (
    <div className="mx-auto max-w-6xl px-4 py-8 sm:px-6 lg:px-8">
      <PageMeta
        title={scholarship.name}
        description={scholarship.summary}
        canonicalPath={`/scholarships/${scholarship.slug}`}
      />

      <div className="mb-5">
        <Link
          to="/scholarships"
          className="inline-flex items-center gap-1.5 text-xs font-medium text-text-secondary hover:text-text-primary"
        >
          <ArrowLeft className="h-3.5 w-3.5" />
          Back to Scholarship Discovery
        </Link>
      </div>

      {/* Header Banner */}
      <Card className="mb-6 space-y-4">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="space-y-2">
            <div className="flex flex-wrap items-center gap-2">
              <VerificationBadge
                status={scholarship.verificationStatus}
                recordKind={scholarship.recordKind}
              />
              <Badge variant="outline">{scholarship.countryName}</Badge>
              <Badge variant="outline">{scholarship.degreeLevel}</Badge>
              <Badge variant="default">Target Intake: {scholarship.targetIntake}</Badge>
            </div>
            <h1 className="font-display text-2xl font-bold text-text-primary sm:text-3xl">
              {scholarship.name}
            </h1>
            <p className="text-sm text-text-secondary">
              Provider: <strong className="text-text-primary">{scholarship.provider}</strong> •{' '}
              Host Institution:{' '}
              <strong className="text-text-primary">{scholarship.institutionDisplay}</strong>
            </p>
          </div>

          <div className="flex flex-wrap gap-2">
            <Button
              variant={isSaved ? 'secondary' : 'outline'}
              onClick={async () => {
                await toggleSavedScholarship({ scholarshipId: scholarship.id });
                pushToast({
                  title: isSaved ? 'Removed from saved opportunities' : 'Scholarship saved',
                  variant: 'info',
                });
              }}
            >
              {isSaved ? (
                <>
                  <BookmarkCheck className="h-4 w-4" /> Saved
                </>
              ) : (
                <>
                  <Bookmark className="h-4 w-4" /> Save
                </>
              )}
            </Button>

            <Button variant="outline" onClick={handleTrackApplication}>
              <FolderPlus className="h-4 w-4" />
              {isTracked ? 'View in Tracker' : 'Add to Tracker'}
            </Button>

            <a
              href={scholarship.officialApplicationUrl}
              target="_blank"
              rel="noopener noreferrer"
            >
              <Button>
                Official Application Portal
                <ExternalLink className="h-4 w-4" />
              </Button>
            </a>
          </div>
        </div>
      </Card>

      <div className="grid gap-6 lg:grid-cols-12">
        {/* Main Column */}
        <div className="space-y-6 lg:col-span-8">
          {/* 1. Overview & 2. Provider */}
          <Card className="space-y-3">
            <h2 className="text-lg font-semibold text-text-primary">1. Overview &amp; Provider</h2>
            <p className="text-sm leading-relaxed text-text-secondary">{scholarship.summary}</p>
            <div className="grid gap-3 rounded-lg border border-border-subtle bg-bg-secondary p-3.5 text-xs sm:grid-cols-3">
              <div>
                <p className="text-text-muted">Provider</p>
                <p className="mt-0.5 font-medium text-text-primary">{scholarship.provider}</p>
              </div>
              <div>
                <p className="text-text-muted">Duration</p>
                <p className="mt-0.5 font-medium text-text-primary">{scholarship.durationText}</p>
              </div>
              <div>
                <p className="text-text-muted">Application Fee</p>
                <p className="mt-0.5 font-medium text-text-primary">
                  {scholarship.applicationFeeAmount === 0
                    ? 'No application fee (0)'
                    : scholarship.applicationFeeAmount !== null
                    ? `${scholarship.applicationFeeAmount} ${scholarship.applicationFeeCurrency}`
                    : 'Check official portal'}
                </p>
              </div>
            </div>
            {scholarship.applicationFeeNote && (
              <p className="text-xs text-text-muted">{scholarship.applicationFeeNote}</p>
            )}
          </Card>

          {/* 6. Financial Benefits & 7. Expenses Not Covered */}
          <FundingBreakdownCard scholarship={scholarship} />

          {/* Match Evaluation Panel */}
          {userState?.profile && match && (
            <MatchResultPanel
              scholarship={scholarship}
              profile={userState.profile}
              match={match}
            />
          )}

          {/* 3. Eligibility, 4. Academic, 5. Nationality */}
          <Card className="space-y-4">
            <h2 className="text-lg font-semibold text-text-primary">
              Eligibility, Academic &amp; Nationality Requirements
            </h2>
            <div className="space-y-3 text-sm">
              <div>
                <h3 className="text-xs font-semibold uppercase tracking-wide text-text-muted">
                  Nationality Rules
                </h3>
                <p className="mt-1 text-text-secondary">
                  {scholarship.nationalityRestrictionsNote ||
                    scholarship.eligibleNationalities.join(', ')}
                </p>
              </div>

              <div>
                <h3 className="text-xs font-semibold uppercase tracking-wide text-text-muted">
                  Academic &amp; GPA Criteria
                </h3>
                <p className="mt-1 text-text-secondary">{scholarship.minGpaNote}</p>
                <ul className="mt-2 list-inside list-disc space-y-1 text-text-secondary">
                  {scholarship.academicRequirements.map((req) => (
                    <li key={req}>{req}</li>
                  ))}
                </ul>
              </div>

              <div>
                <h3 className="text-xs font-semibold uppercase tracking-wide text-text-muted">
                  Language &amp; Standardized Tests
                </h3>
                <p className="mt-1 text-text-secondary">{scholarship.languageRequirements.summary}</p>
              </div>

              <div>
                <h3 className="text-xs font-semibold uppercase tracking-wide text-text-muted">
                  Eligible Subjects
                </h3>
                <div className="mt-1.5 flex flex-wrap gap-1.5">
                  {scholarship.eligibleSubjects.map((sub) => (
                    <Badge key={sub} variant="outline">
                      {sub}
                    </Badge>
                  ))}
                </div>
              </div>
            </div>
          </Card>

          {/* 8. Required Documents & 9. Application Procedure */}
          <div className="grid gap-6 md:grid-cols-2">
            <Card className="space-y-3">
              <h2 className="flex items-center gap-2 text-base font-semibold text-text-primary">
                <FileCheck2 className="h-4 w-4 text-accent-secondary" />
                Required Documents
              </h2>
              <ul className="space-y-2 text-sm text-text-secondary">
                {scholarship.requiredDocuments.map((doc) => (
                  <li key={doc} className="flex items-start gap-2">
                    <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-accent-secondary" />
                    <span>{doc}</span>
                  </li>
                ))}
              </ul>
            </Card>

            <Card className="space-y-3">
              <h2 className="text-base font-semibold text-text-primary">Application Procedure</h2>
              <ol className="space-y-2 text-sm text-text-secondary">
                {scholarship.applicationProcedure.map((step, i) => (
                  <li key={step} className="flex gap-2.5">
                    <span className="font-mono text-xs font-bold text-accent-primary">
                      0{i + 1}
                    </span>
                    <span>{step}</span>
                  </li>
                ))}
              </ol>
            </Card>
          </div>
        </div>

        {/* Sidebar Column: 10. Important Dates, 11. Official Links, 12. Source Verification */}
        <aside className="space-y-6 lg:col-span-4">
          <Card className="space-y-3">
            <h2 className="flex items-center gap-2 text-base font-semibold text-text-primary">
              <Calendar className="h-4 w-4 text-accent-primary" />
              Important Dates
            </h2>
            <div className="space-y-2.5 rounded-lg border border-border-subtle bg-bg-secondary p-3.5 text-xs">
              <div>
                <p className="text-text-muted">Application Opening</p>
                <p className="mt-0.5 font-mono font-medium text-text-primary">
                  {scholarship.applicationOpenDate
                    ? formatDeadlineDisplay(
                        scholarship.applicationOpenDate,
                        scholarship.deadlineTimezone,
                      )
                    : 'Check official portal'}
                </p>
              </div>
              <div>
                <p className="text-text-muted">
                  Application Deadline ({scholarship.deadlineTimezone})
                </p>
                <p className="mt-0.5 font-mono font-semibold text-text-primary">
                  {formatDeadlineDisplay(
                    scholarship.applicationDeadline,
                    scholarship.deadlineTimezone,
                  )}
                </p>
              </div>
              <div>
                <p className="text-text-muted">Your Local Timezone ({userTz})</p>
                <p className="mt-0.5 font-mono text-text-secondary">
                  {formatDeadlineDisplay(scholarship.applicationDeadline, userTz)}
                </p>
              </div>
            </div>
            {scholarship.deadlineNote && (
              <p className="text-xs leading-relaxed text-text-secondary">
                {scholarship.deadlineNote}
              </p>
            )}
          </Card>

          <Card className="space-y-3">
            <h2 className="flex items-center gap-2 text-base font-semibold text-text-primary">
              <ShieldCheck className="h-4 w-4 text-status-success" />
              Source &amp; Verification Details
            </h2>
            <div className="space-y-2 text-xs text-text-secondary">
              <p>
                <strong className="text-text-primary">Primary Source:</strong>{' '}
                {scholarship.sourceReference}
              </p>
              <p>
                <strong className="text-text-primary">Last Verified:</strong>{' '}
                <span className="font-mono">{scholarship.lastVerifiedAt}</span>
              </p>
              <div className="space-y-1.5 pt-1">
                <a
                  href={scholarship.officialScholarshipUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center justify-between rounded-lg border border-border-subtle bg-bg-secondary px-3 py-2 text-accent-primary hover:border-border-strong"
                >
                  <span>Official Scholarship Information</span>
                  <ExternalLink className="h-3.5 w-3.5" />
                </a>
                <a
                  href={scholarship.officialApplicationUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center justify-between rounded-lg border border-border-subtle bg-bg-secondary px-3 py-2 text-accent-secondary hover:border-border-strong"
                >
                  <span>Direct Application Portal</span>
                  <ExternalLink className="h-3.5 w-3.5" />
                </a>
              </div>
            </div>

            <Button
              variant="ghost"
              size="sm"
              className="w-full text-xs"
              onClick={() => setReportOpen(true)}
            >
              <Flag className="h-3.5 w-3.5" />
              Report Outdated Date or Source Issue
            </Button>
          </Card>
        </aside>
      </div>

      <Dialog
        open={reportOpen}
        onClose={() => setReportOpen(false)}
        title="Submit Data Correction Report"
        description={`Flag outdated deadlines, changed stipend amounts, or broken URLs for ${scholarship.name}.`}
      >
        <form onSubmit={handleReportSubmit} className="space-y-4">
          {reportError && <p className="text-xs text-status-error">{reportError}</p>}
          <div>
            <label htmlFor="corr-summary" className="mb-1 block text-xs font-medium text-text-secondary">
              What needs correction?
            </label>
            <Textarea
              id="corr-summary"
              value={reportSummary}
              onChange={(e) => setReportSummary(e.target.value)}
              placeholder="Describe the official update or date change..."
            />
          </div>
          <div>
            <label htmlFor="corr-url" className="mb-1 block text-xs font-medium text-text-secondary">
              Official Source URL (optional)
            </label>
            <Input
              id="corr-url"
              type="url"
              value={reportUrl}
              onChange={(e) => setReportUrl(e.target.value)}
              placeholder="https://..."
            />
          </div>
          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={() => setReportOpen(false)}>
              Cancel
            </Button>
            <Button type="submit">Submit Correction</Button>
          </div>
        </form>
      </Dialog>
    </div>
  );
}
