import { useMemo } from 'react';
import { Link } from 'react-router-dom';
import {
  Award,
  Bookmark,
  Building2,
  CalendarClock,
  CheckCircle2,
  ListChecks,
  ShieldCheck,
  UserCog,
} from 'lucide-react';
import { Bar, BarChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { PageMeta } from '@/components/common/PageMeta';
import { VerificationBadge } from '@/components/common/VerificationBadge';
import { Badge, Button, Card, ProgressBar } from '@/components/ui/Primitives';
import { useCatalogData, useUserWorkspace } from '@/hooks/useScholarPathData';
import { daysUntilDate, formatDeadlineDisplay } from '@/lib/dates';
import { evaluateScholarshipMatch } from '@/lib/matching';

export function DashboardPage() {
  const { scholarships, universities } = useCatalogData();
  const { userState } = useUserWorkspace();

  const officialScholarships = useMemo(
    () => scholarships.filter((s) => s.recordKind === 'official' && !s.isArchived),
    [scholarships],
  );

  const matchResults = useMemo(() => {
    if (!userState?.profile) return [];
    return officialScholarships
      .map((s) => ({
        scholarship: s,
        match: evaluateScholarshipMatch(s, userState.profile),
      }))
      .sort((a, b) => b.match.matchPercentage - a.match.matchPercentage);
  }, [officialScholarships, userState?.profile]);

  const eligibleCount = matchResults.filter(
    (m) => m.match.eligibilityStatus === 'eligible' || m.match.eligibilityStatus === 'likely_eligible',
  ).length;

  const fullyFundedCount = officialScholarships.filter(
    (s) => s.fundingTier === 'fully_funded',
  ).length;

  const upcomingDeadlines = useMemo(() => {
    return officialScholarships
      .map((s) => ({ s, days: daysUntilDate(s.applicationDeadline) }))
      .filter((item) => item.days !== null && item.days >= 0 && item.days <= 90)
      .sort((a, b) => (a.days ?? 999) - (b.days ?? 999))
      .slice(0, 5);
  }, [officialScholarships]);

  const recentlyVerified = useMemo(
    () =>
      [...officialScholarships]
        .sort((a, b) => b.lastVerifiedAt.localeCompare(a.lastVerifiedAt))
        .slice(0, 4),
    [officialScholarships],
  );

  const tasksSummary = useMemo(() => {
    const apps = userState?.applications ?? [];
    const allTasks = apps.flatMap((a) => a.tasks);
    const completed = allTasks.filter((t) => t.completed).length;
    const docsReady = (userState?.documents ?? []).filter(
      (d) => d.status === 'ready' || d.status === 'verified',
    ).length;
    const totalDocs = (userState?.documents ?? []).length;

    const statusCounts = [
      { stage: 'Interested', count: apps.filter((a) => a.status === 'interested').length },
      { stage: 'Researching', count: apps.filter((a) => a.status === 'researching').length },
      { stage: 'Preparing', count: apps.filter((a) => a.status === 'preparing_documents').length },
      { stage: 'Ready', count: apps.filter((a) => a.status === 'ready_to_apply').length },
      { stage: 'Submitted', count: apps.filter((a) => a.status === 'submitted').length },
    ];

    return {
      totalApps: apps.length,
      completedTasks: completed,
      totalTasks: allTasks.length,
      docsReady,
      totalDocs,
      statusCounts,
    };
  }, [userState]);

  const profileCompleteness = useMemo(() => {
    const p = userState?.profile;
    if (!p) return { pct: 0, missing: ['Profile missing'] };
    const checks: { ok: boolean; label: string }[] = [
      { ok: Boolean(p.countryOfOrigin), label: 'Country of origin' },
      { ok: Boolean(p.intendedDegree), label: 'Intended degree' },
      { ok: p.academicInterests.length > 0, label: 'Academic interests' },
      { ok: p.preferredCountries.length > 0, label: 'Preferred destinations' },
      { ok: p.expectedGpa !== null, label: 'Expected GPA (0–4.0)' },
      { ok: p.englishQualifications.length > 0, label: 'English / SAT qualifications' },
      { ok: Boolean(p.targetIntake), label: 'Target intake' },
    ];
    const passed = checks.filter((c) => c.ok).length;
    return {
      pct: Math.round((passed / checks.length) * 100),
      missing: checks.filter((c) => !c.ok).map((c) => c.label),
    };
  }, [userState?.profile]);

  const recommendedUnis = useMemo(() => {
    const prefCodes = new Set(userState?.profile.preferredCountries ?? []);
    return universities
      .filter((u) => prefCodes.size === 0 || prefCodes.has(u.countryCode))
      .slice(0, 4);
  }, [universities, userState?.profile.preferredCountries]);

  return (
    <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
      <PageMeta
        title="Student Dashboard"
        description="Personalized undergraduate scholarship dashboard computed directly from your live profile and tracker data."
      />

      <div className="mb-6 flex flex-wrap items-end justify-between gap-4">
        <div>
          <Badge variant="primary">Module G • Personal Workspace</Badge>
          <h1 className="mt-2 font-display text-3xl font-bold text-text-primary">
            Welcome, {userState?.profile.displayName ?? 'Student'}
          </h1>
          <p className="mt-1 text-sm text-text-secondary">
            {userState?.profile.countryOfOrigin} • Target {userState?.profile.intendedDegree} (
            {userState?.profile.targetIntake} Intake) • All metrics computed directly from live data.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Link to="/profile">
            <Button variant="outline" size="sm">
              <UserCog className="h-4 w-4" />
              Edit Profile
            </Button>
          </Link>
          <Link to="/matcher">
            <Button size="sm">Open Full Matcher</Button>
          </Link>
        </div>
      </div>

      {/* Live Computed KPIs */}
      <div className="mb-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Card>
          <div className="flex items-center justify-between text-xs text-text-secondary">
            <span>Matching Scholarships</span>
            <Award className="h-4 w-4 text-accent-primary" />
          </div>
          <p className="mt-2 font-display text-2xl font-bold text-text-primary">{eligibleCount}</p>
          <p className="mt-0.5 text-xs text-text-muted">
            {fullyFundedCount} fully funded in official catalog
          </p>
        </Card>

        <Card>
          <div className="flex items-center justify-between text-xs text-text-secondary">
            <span>Saved Opportunities</span>
            <Bookmark className="h-4 w-4 text-accent-secondary" />
          </div>
          <p className="mt-2 font-display text-2xl font-bold text-text-primary">
            {userState?.savedScholarships.length ?? 0}
          </p>
          <p className="mt-0.5 text-xs text-text-muted">
            + {userState?.savedUniversities.length ?? 0} universities saved
          </p>
        </Card>

        <Card>
          <div className="flex items-center justify-between text-xs text-text-secondary">
            <span>Upcoming Deadlines (90d)</span>
            <CalendarClock className="h-4 w-4 text-status-warning" />
          </div>
          <p className="mt-2 font-display text-2xl font-bold text-text-primary">
            {upcomingDeadlines.length}
          </p>
          <p className="mt-0.5 text-xs text-text-muted">Verified calls closing within 90 days</p>
        </Card>

        <Card>
          <div className="flex items-center justify-between text-xs text-text-secondary">
            <span>Tasks &amp; Docs Ready</span>
            <ListChecks className="h-4 w-4 text-status-success" />
          </div>
          <p className="mt-2 font-display text-2xl font-bold text-text-primary">
            {tasksSummary.completedTasks}/{tasksSummary.totalTasks}
          </p>
          <p className="mt-0.5 text-xs text-text-muted">
            {tasksSummary.docsReady}/{tasksSummary.totalDocs} checklist documents ready
          </p>
        </Card>
      </div>

      {/* 6 Dashboard Widgets */}
      <div className="grid gap-6 lg:grid-cols-12">
        {/* Widget 1: Recommended Scholarships */}
        <Card className="space-y-4 lg:col-span-7">
          <div className="flex items-center justify-between">
            <h2 className="text-base font-semibold text-text-primary">
              1. Top Recommended Scholarships
            </h2>
            <Link to="/matcher" className="text-xs font-medium text-accent-primary hover:underline">
              View All Matches
            </Link>
          </div>
          <div className="space-y-3">
            {matchResults.slice(0, 4).map(({ scholarship, match }) => (
              <div
                key={scholarship.id}
                className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-border-subtle bg-bg-secondary p-3"
              >
                <div className="min-w-0 flex-1">
                  <Link
                    to={`/scholarships/${scholarship.slug}`}
                    className="block truncate text-sm font-semibold text-text-primary hover:text-accent-primary"
                  >
                    {scholarship.name}
                  </Link>
                  <p className="text-xs text-text-secondary">
                    {scholarship.countryName} • {scholarship.institutionDisplay}
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <Badge variant={match.eligibilityStatus === 'ineligible' ? 'error' : 'success'}>
                    {match.matchPercentage}%
                  </Badge>
                </div>
              </div>
            ))}
          </div>
        </Card>

        {/* Widget 5 & 4: Profile Completeness + Application Progress */}
        <div className="space-y-6 lg:col-span-5">
          <Card className="space-y-3">
            <div className="flex items-center justify-between">
              <h2 className="text-base font-semibold text-text-primary">
                2. Student Profile Completeness
              </h2>
              <Link to="/profile" className="text-xs text-accent-primary hover:underline">
                Update
              </Link>
            </div>
            <ProgressBar value={profileCompleteness.pct} label="Profile Strength" />
            {profileCompleteness.missing.length === 0 ? (
              <p className="flex items-center gap-1.5 text-xs text-status-success">
                <CheckCircle2 className="h-4 w-4" /> All core eligibility dimensions configured.
              </p>
            ) : (
              <p className="text-xs text-text-secondary">
                Missing: {profileCompleteness.missing.join(', ')}
              </p>
            )}
          </Card>

          <Card className="space-y-3">
            <div className="flex items-center justify-between">
              <h2 className="text-base font-semibold text-text-primary">
                3. Application Tracker Pipeline ({tasksSummary.totalApps})
              </h2>
              <Link to="/applications" className="text-xs text-accent-primary hover:underline">
                Open Tracker
              </Link>
            </div>
            <div className="h-40 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={tasksSummary.statusCounts}>
                  <XAxis dataKey="stage" tick={{ fontSize: 11, fill: '#9CA8BD' }} />
                  <YAxis allowDecimals={false} tick={{ fontSize: 11, fill: '#9CA8BD' }} width={24} />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: '#151E30',
                      borderColor: 'rgba(156,168,189,0.2)',
                      fontSize: '12px',
                    }}
                  />
                  <Bar dataKey="count" fill="#8B7CFF" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </Card>
        </div>

        {/* Widget 3: Upcoming Deadlines */}
        <Card className="space-y-3 lg:col-span-6">
          <div className="flex items-center justify-between">
            <h2 className="text-base font-semibold text-text-primary">
              4. Upcoming Verified Deadlines
            </h2>
            <Link to="/calendar" className="text-xs text-accent-primary hover:underline">
              Open Calendar
            </Link>
          </div>
          {upcomingDeadlines.length === 0 ? (
            <p className="text-xs text-text-secondary">No deadlines within the next 90 days.</p>
          ) : (
            <div className="space-y-2.5">
              {upcomingDeadlines.map(({ s, days }) => (
                <div
                  key={s.id}
                  className="flex items-center justify-between gap-3 rounded-lg border border-border-subtle bg-bg-secondary p-3 text-xs"
                >
                  <div className="min-w-0">
                    <Link
                      to={`/scholarships/${s.slug}`}
                      className="block truncate font-semibold text-text-primary hover:text-accent-primary"
                    >
                      {s.name}
                    </Link>
                    <p className="text-text-secondary">
                      {formatDeadlineDisplay(s.applicationDeadline, s.deadlineTimezone)} ({s.countryName})
                    </p>
                  </div>
                  <Badge variant={days !== null && days <= 30 ? 'warning' : 'default'}>
                    {days}d left
                  </Badge>
                </div>
              ))}
            </div>
          )}
        </Card>

        {/* Widget 2 & 6: Recently Verified & Recommended Universities */}
        <Card className="space-y-3 lg:col-span-6">
          <div className="flex items-center justify-between">
            <h2 className="flex items-center gap-1.5 text-base font-semibold text-text-primary">
              <ShieldCheck className="h-4 w-4 text-status-success" />
              5. Recently Verified Opportunities
            </h2>
            <Link to="/scholarships" className="text-xs text-accent-primary hover:underline">
              Browse Catalog
            </Link>
          </div>
          <div className="space-y-2.5">
            {recentlyVerified.map((s) => (
              <div
                key={s.id}
                className="flex items-center justify-between gap-2 rounded-lg border border-border-subtle bg-bg-secondary p-3 text-xs"
              >
                <div className="min-w-0">
                  <Link
                    to={`/scholarships/${s.slug}`}
                    className="block truncate font-semibold text-text-primary hover:text-accent-primary"
                  >
                    {s.name}
                  </Link>
                  <p className="text-text-muted">Verified {s.lastVerifiedAt}</p>
                </div>
                <VerificationBadge status={s.verificationStatus} recordKind={s.recordKind} />
              </div>
            ))}
          </div>
        </Card>

        {/* Widget 6: Recommended Universities */}
        <Card className="space-y-3 lg:col-span-12">
          <div className="flex items-center justify-between">
            <h2 className="flex items-center gap-1.5 text-base font-semibold text-text-primary">
              <Building2 className="h-4 w-4 text-accent-secondary" />
              6. Recommended Universities in Your Preferred Destinations
            </h2>
            <Link to="/compare/universities" className="text-xs text-accent-primary hover:underline">
              Compare Universities
            </Link>
          </div>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            {recommendedUnis.map((u) => (
              <Link
                key={u.id}
                to={`/universities/${u.slug}`}
                className="rounded-lg border border-border-subtle bg-bg-secondary p-3.5 transition-colors hover:border-border-strong"
              >
                <p className="font-semibold text-text-primary">{u.name}</p>
                <p className="mt-1 text-xs text-text-secondary">
                  {u.city}, {u.countryName}
                </p>
                <p className="mt-2 text-xs text-accent-secondary">
                  {u.programs.length} cataloged Bachelor programme(s)
                </p>
              </Link>
            ))}
          </div>
        </Card>
      </div>
    </div>
  );
}
