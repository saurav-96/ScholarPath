import { useMemo } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { ArrowLeft, Calculator, ExternalLink, Globe2, Info } from 'lucide-react';
import { PageMeta } from '@/components/common/PageMeta';
import { VerificationBadge } from '@/components/common/VerificationBadge';
import { ScholarshipCard } from '@/components/scholarship/ScholarshipCard';
import { UniversityCard } from '@/components/university/UniversityCard';
import { EmptyState } from '@/components/ui/EmptyState';
import { Badge, Button, Card } from '@/components/ui/Primitives';
import { useToast } from '@/contexts/ToastContext';
import { useCatalogData, useUserWorkspace } from '@/hooks/useScholarPathData';
import { evaluateScholarshipMatch } from '@/lib/matching';

export function CountryDetailPage() {
  const { slug } = useParams<{ slug: string }>();
  const navigate = useNavigate();
  const { countries, universities, scholarships } = useCatalogData();
  const { userState, toggleSavedScholarship, toggleSavedUniversity } = useUserWorkspace();
  const { pushToast } = useToast();

  const country = useMemo(
    () => countries.find((c) => c.slug === slug),
    [countries, slug],
  );

  const countryUniversities = useMemo(() => {
    if (!country) return [];
    return universities.filter((u) => u.countryCode === country.code);
  }, [country, universities]);

  const countryScholarships = useMemo(() => {
    if (!country) return [];
    return scholarships.filter((s) => s.countryCode === country.code && !s.isArchived);
  }, [country, scholarships]);

  if (!country) {
    return (
      <div className="mx-auto max-w-4xl px-4 py-16">
        <EmptyState
          icon={<Globe2 className="h-6 w-6" />}
          title="Country guide not found"
          description="This study destination could not be found in the current catalog."
          actionLabel="Browse All Countries"
          onAction={() => navigate('/countries')}
        />
      </div>
    );
  }

  const savedSchSet = new Set((userState?.savedScholarships ?? []).map((s) => s.scholarshipId));
  const savedUniSet = new Set((userState?.savedUniversities ?? []).map((u) => u.universityId));

  return (
    <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
      <PageMeta
        title={`${country.name} Study Guide`}
        description={`Official bachelor scholarships, universities, tuition system, and living cost estimates in ${country.name}.`}
      />

      <Link
        to="/countries"
        className="inline-flex items-center gap-1.5 text-xs font-medium text-text-secondary hover:text-text-primary"
      >
        <ArrowLeft className="h-3.5 w-3.5" />
        All Study Destinations
      </Link>

      {/* Header */}
      <div className="mt-4 flex flex-wrap items-start justify-between gap-4">
        <div>
          <div className="flex flex-wrap items-center gap-2">
            <Badge variant="primary">{country.code}</Badge>
            <Badge variant="outline">{country.region}</Badge>
            <VerificationBadge status={country.verificationStatus} />
          </div>
          <h1 className="mt-2 font-display text-3xl font-bold text-text-primary">
            Study in {country.name}
          </h1>
          <p className="mt-1 text-xs text-text-muted">
            Last verified: {country.lastVerifiedAt} • Local currency: {country.currencyCode}
          </p>
        </div>

        <div className="flex flex-wrap gap-2">
          <Link to={`/calculator?country=${country.code}`}>
            <Button variant="secondary">
              <Calculator className="h-4 w-4" />
              Estimate Costs in Calculator
            </Button>
          </Link>
          <a href={country.officialPortalUrl} target="_blank" rel="noreferrer">
            <Button>
              {country.officialPortalName}
              <ExternalLink className="h-4 w-4" />
            </Button>
          </a>
        </div>
      </div>

      {/* Overview Grid */}
      <div className="mt-6 grid gap-5 md:grid-cols-2">
        <Card className="space-y-3">
          <h2 className="text-base font-semibold text-text-primary">Tuition System Overview</h2>
          <p className="text-sm leading-relaxed text-text-secondary">{country.tuitionOverview}</p>
          <div className="border-t border-border-subtle pt-3">
            <h3 className="text-xs font-semibold uppercase tracking-wide text-text-muted">
              General Undergraduate Admission Rules
            </h3>
            <p className="mt-1 text-xs leading-relaxed text-text-secondary">
              {country.admissionRequirementsNote}
            </p>
          </div>
        </Card>

        <Card className="space-y-3">
          <div className="flex items-center justify-between gap-2">
            <h2 className="text-base font-semibold text-text-primary">
              Living Costs & Visa Thresholds
            </h2>
            <Badge variant="warning">Indicative Estimate</Badge>
          </div>
          <p className="font-mono text-lg font-bold text-accent-secondary">
            {country.livingCostMonthlyMin && country.livingCostMonthlyMax
              ? `${country.livingCostMonthlyMin} – ${country.livingCostMonthlyMax} ${country.livingCostCurrency} / month`
              : 'Refer to official national portal'}
          </p>
          <p className="text-xs leading-relaxed text-text-secondary">{country.livingCostNote}</p>
          <div className="flex items-start gap-2 rounded-lg bg-bg-secondary p-2.5 text-[11px] text-text-muted">
            <Info className="mt-0.5 h-3.5 w-3.5 shrink-0 text-accent-primary" />
            <span>{country.estimateSourceNote}</span>
          </div>
        </Card>

        <Card className="space-y-2">
          <h2 className="text-base font-semibold text-text-primary">Language Requirements</h2>
          <p className="text-sm leading-relaxed text-text-secondary">
            {country.languageRequirementsNote}
          </p>
        </Card>

        <Card className="space-y-2">
          <h2 className="text-base font-semibold text-text-primary">Typical Application Periods</h2>
          <p className="text-sm leading-relaxed text-text-secondary">
            {country.applicationPeriodsNote}
          </p>
        </Card>
      </div>

      {/* Scholarships in Country */}
      <section className="mt-10 space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="font-display text-2xl font-bold text-text-primary">
            Scholarships in {country.name} ({countryScholarships.length})
          </h2>
          <Link
            to={`/scholarships?country=${country.code}`}
            className="text-xs font-medium text-accent-primary hover:underline"
          >
            Filter in Discovery Engine
          </Link>
        </div>

        <div className="grid gap-5 md:grid-cols-2 lg:grid-cols-3">
          {countryScholarships.map((s) => (
            <ScholarshipCard
              key={s.id}
              scholarship={s}
              match={
                userState?.profile ? evaluateScholarshipMatch(s, userState.profile) : undefined
              }
              isSaved={savedSchSet.has(s.id)}
              onToggleSave={async (id) => {
                await toggleSavedScholarship({ scholarshipId: id });
                pushToast({
                  title: savedSchSet.has(id)
                    ? 'Removed from saved scholarships'
                    : 'Saved scholarship',
                  variant: 'success',
                });
              }}
            />
          ))}
        </div>
      </section>

      {/* Universities in Country */}
      <section className="mt-10 space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="font-display text-2xl font-bold text-text-primary">
            Universities in {country.name} ({countryUniversities.length})
          </h2>
          <Link
            to={`/universities?country=${country.code}`}
            className="text-xs font-medium text-accent-primary hover:underline"
          >
            View All Universities
          </Link>
        </div>

        <div className="grid gap-5 md:grid-cols-2 lg:grid-cols-3">
          {countryUniversities.map((u) => (
            <UniversityCard
              key={u.id}
              university={u}
              scholarshipCount={
                scholarships.filter(
                  (s) => s.universityId === u.id || s.countryCode === u.countryCode,
                ).length
              }
              isSaved={savedUniSet.has(u.id)}
              onToggleSave={async (id) => {
                await toggleSavedUniversity({ universityId: id });
                pushToast({
                  title: savedUniSet.has(id) ? 'Removed university' : 'Saved university',
                  variant: 'success',
                });
              }}
            />
          ))}
        </div>
      </section>
    </div>
  );
}
