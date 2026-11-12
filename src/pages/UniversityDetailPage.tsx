import { useMemo } from 'react';
import { Link, useParams } from 'react-router-dom';
import { ArrowLeft, Bookmark, BookmarkCheck, ExternalLink, GitCompare, MapPin } from 'lucide-react';
import { PageMeta } from '@/components/common/PageMeta';
import { VerificationBadge } from '@/components/common/VerificationBadge';
import { ScholarshipCard } from '@/components/scholarship/ScholarshipCard';
import { Badge, Button, Card } from '@/components/ui/Primitives';
import { useCatalogData, useUserWorkspace } from '@/hooks/useScholarPathData';
import { formatCurrency } from '@/lib/utils';

export function UniversityDetailPage() {
  const { slug } = useParams();
  const { universities, scholarships } = useCatalogData();
  const { userState, toggleSavedUniversity, toggleSavedScholarship } = useUserWorkspace();

  const university = useMemo(
    () => universities.find((u) => u.slug === slug || u.id === slug),
    [universities, slug],
  );

  if (!university) {
    return (
      <div className="mx-auto max-w-3xl px-4 py-16 text-center">
        <h1 className="text-2xl font-bold text-text-primary">University Not Found</h1>
        <Link to="/universities" className="mt-4 inline-block">
          <Button>Back to Universities</Button>
        </Link>
      </div>
    );
  }

  const linkedScholarships = scholarships.filter(
    (s) => s.universityId === university.id || (s.countryCode === university.countryCode && s.universityId === null),
  );
  const isSaved = Boolean(
    userState?.savedUniversities.some((u) => u.universityId === university.id),
  );
  const savedSchSet = new Set(userState?.savedScholarships.map((s) => s.scholarshipId) ?? []);

  return (
    <div className="mx-auto max-w-6xl px-4 py-8 sm:px-6 lg:px-8">
      <PageMeta
        title={university.name}
        description={`Bachelor's programmes, tuition range, and scholarships at ${university.name}.`}
      />

      <Link
        to="/universities"
        className="mb-4 inline-flex items-center gap-1.5 text-xs font-medium text-text-secondary hover:text-text-primary"
      >
        <ArrowLeft className="h-3.5 w-3.5" />
        Back to University Discovery
      </Link>

      <Card className="mb-6 space-y-4">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="space-y-2">
            <div className="flex flex-wrap items-center gap-2">
              <VerificationBadge
                status={university.verificationStatus}
                recordKind={university.recordKind}
              />
              <Badge variant="outline">{university.institutionType}</Badge>
              <Badge variant="default">{university.countryName}</Badge>
            </div>
            <h1 className="font-display text-2xl font-bold text-text-primary sm:text-3xl">
              {university.name}
            </h1>
            <p className="flex items-center gap-1.5 text-sm text-text-secondary">
              <MapPin className="h-4 w-4 text-accent-secondary" />
              {university.city}, {university.countryName}
            </p>
          </div>

          <div className="flex flex-wrap gap-2">
            <Button
              variant={isSaved ? 'secondary' : 'outline'}
              onClick={() => toggleSavedUniversity({ universityId: university.id })}
            >
              {isSaved ? <BookmarkCheck className="h-4 w-4" /> : <Bookmark className="h-4 w-4" />}
              {isSaved ? 'Saved' : 'Save University'}
            </Button>
            <Link to={`/compare/universities?ids=${university.id},uni-trento`}>
              <Button variant="outline">
                <GitCompare className="h-4 w-4" />
                Compare
              </Button>
            </Link>
            <a
              href={university.internationalAdmissionsUrl}
              target="_blank"
              rel="noopener noreferrer"
            >
              <Button>
                International Admissions
                <ExternalLink className="h-4 w-4" />
              </Button>
            </a>
          </div>
        </div>
      </Card>

      <div className="grid gap-6 lg:grid-cols-3">
        <Card className="space-y-3 lg:col-span-2">
          <h2 className="text-lg font-semibold text-text-primary">
            Tuition, Living Costs &amp; Admission Overview
          </h2>
          <p className="text-sm text-text-secondary">{university.tuitionNote}</p>
          <div className="grid gap-3 rounded-lg border border-border-subtle bg-bg-secondary p-4 text-xs sm:grid-cols-3">
            <div>
              <p className="text-text-muted">Annual Tuition Range</p>
              <p className="mt-1 font-mono text-sm font-semibold text-text-primary">
                {university.tuitionMinAnnual === null
                  ? 'Unavailable'
                  : `${formatCurrency(university.tuitionMinAnnual, university.tuitionCurrency)} – ${formatCurrency(
                      university.tuitionMaxAnnual,
                      university.tuitionCurrency,
                    )}`}
              </p>
            </div>
            <div>
              <p className="text-text-muted">Est. Monthly Living</p>
              <p className="mt-1 font-mono text-sm font-semibold text-text-primary">
                {university.estimatedLivingMonthly !== null
                  ? `${formatCurrency(university.estimatedLivingMonthly, university.livingCurrency)}/mo`
                  : 'Unavailable'}
              </p>
            </div>
            <div>
              <p className="text-text-muted">Application Windows</p>
              <p className="mt-1 font-medium text-text-primary">{university.applicationPeriods}</p>
            </div>
          </div>

          <div>
            <h3 className="text-sm font-semibold text-text-primary">Admission Requirements</h3>
            <ul className="mt-2 list-inside list-disc space-y-1 text-sm text-text-secondary">
              {university.admissionRequirements.map((req) => (
                <li key={req}>{req}</li>
              ))}
            </ul>
          </div>

          <div>
            <h3 className="text-sm font-semibold text-text-primary">English Proficiency</h3>
            <p className="mt-1 text-sm text-text-secondary">{university.englishRequirements}</p>
          </div>
        </Card>

        <Card className="space-y-3">
          <h2 className="text-base font-semibold text-text-primary">Official Sources</h2>
          <p className="text-xs text-text-muted">Last verified: {university.lastVerifiedAt}</p>
          <div className="space-y-2 text-xs">
            <a
              href={university.officialWebsite}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center justify-between rounded-lg border border-border-subtle bg-bg-secondary p-2.5 text-accent-primary"
            >
              <span>Main University Website</span>
              <ExternalLink className="h-3.5 w-3.5" />
            </a>
            <a
              href={university.internationalAdmissionsUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center justify-between rounded-lg border border-border-subtle bg-bg-secondary p-2.5 text-accent-secondary"
            >
              <span>International Admissions</span>
              <ExternalLink className="h-3.5 w-3.5" />
            </a>
            {university.officialSources.map((src) => (
              <a
                key={src.url}
                href={src.url}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center justify-between rounded-lg border border-border-subtle bg-bg-secondary p-2.5 text-text-primary"
              >
                <span>{src.title}</span>
                <ExternalLink className="h-3.5 w-3.5" />
              </a>
            ))}
          </div>
        </Card>
      </div>

      <section className="mt-8 space-y-4">
        <h2 className="font-display text-xl font-bold text-text-primary">
          Cataloged Bachelor&apos;s Programmes ({university.programs.length})
        </h2>
        <div className="grid gap-4 md:grid-cols-2">
          {university.programs.map((prog) => (
            <Card key={prog.id} className="space-y-2">
              <div className="flex items-center justify-between">
                <Badge variant="primary">{prog.instructionLanguage}</Badge>
                <span className="font-mono text-xs text-text-muted">{prog.durationYears} yrs</span>
              </div>
              <h3 className="text-base font-semibold text-text-primary">{prog.name}</h3>
              <p className="text-xs text-text-secondary">
                Field: {prog.subjectArea} • Period: {prog.applicationPeriod}
              </p>
              <div className="flex items-center justify-between pt-2 text-xs">
                <span className="font-mono text-text-primary">
                  Tuition:{' '}
                  {prog.tuitionAnnual !== null
                    ? `${formatCurrency(prog.tuitionAnnual, prog.tuitionCurrency)}/yr`
                    : 'Check official call'}
                </span>
                <a
                  href={prog.officialUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1 text-accent-primary hover:underline"
                >
                  Official Programme <ExternalLink className="h-3 w-3" />
                </a>
              </div>
            </Card>
          ))}
        </div>
      </section>

      <section className="mt-8 space-y-4">
        <h2 className="font-display text-xl font-bold text-text-primary">
          Related Scholarships ({linkedScholarships.length})
        </h2>
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {linkedScholarships.map((sch) => (
            <ScholarshipCard
              key={sch.id}
              scholarship={sch}
              isSaved={savedSchSet.has(sch.id)}
              onToggleSave={(id) => toggleSavedScholarship({ scholarshipId: id })}
            />
          ))}
        </div>
      </section>
    </div>
  );
}
