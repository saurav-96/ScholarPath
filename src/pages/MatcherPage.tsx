import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { Sliders, Sparkles } from 'lucide-react';
import { PageMeta } from '@/components/common/PageMeta';
import { MatchResultPanel } from '@/components/scholarship/MatchResultPanel';
import { Badge, Button, Card, Select } from '@/components/ui/Primitives';
import { useCatalogData, useUserWorkspace } from '@/hooks/useScholarPathData';
import { evaluateScholarshipMatch } from '@/lib/matching';
import type { EligibilityStatus } from '@/types/domain';

export function MatcherPage() {
  const { scholarships } = useCatalogData();
  const { userState } = useUserWorkspace();
  const [statusFilter, setStatusFilter] = useState<'ALL' | EligibilityStatus>('ALL');
  const [includeDemo, setIncludeDemo] = useState(true);
  const [selectedId, setSelectedId] = useState<string>('');

  const ranked = useMemo(() => {
    if (!userState?.profile) return [];
    return scholarships
      .filter((s) => !s.isArchived && (includeDemo || s.recordKind === 'official'))
      .map((scholarship) => ({
        scholarship,
        match: evaluateScholarshipMatch(scholarship, userState.profile),
      }))
      .filter((entry) => statusFilter === 'ALL' || entry.match.eligibilityStatus === statusFilter)
      .sort((a, b) => {
        if (a.match.eligibilityStatus === 'ineligible' && b.match.eligibilityStatus !== 'ineligible') {
          return 1;
        }
        if (b.match.eligibilityStatus === 'ineligible' && a.match.eligibilityStatus !== 'ineligible') {
          return -1;
        }
        return b.match.matchPercentage - a.match.matchPercentage;
      });
  }, [scholarships, userState?.profile, statusFilter, includeDemo]);

  const activeEntry =
    ranked.find((r) => r.scholarship.id === selectedId) ?? ranked[0] ?? null;

  return (
    <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
      <PageMeta
        title="Transparent Scholarship Matcher"
        description="Deterministic weighted scholarship eligibility evaluation separating hard criteria from preferences."
      />

      <div className="mb-6 flex flex-wrap items-end justify-between gap-4">
        <div>
          <Badge variant="primary">Module F • Intelligent Matching Engine</Badge>
          <h1 className="mt-2 font-display text-3xl font-bold text-text-primary">
            Scholarship Eligibility Matcher
          </h1>
          <p className="mt-1 text-sm text-text-secondary">
            Evaluates citizenship, GPA, language scores, subjects, and funding goals transparently.
          </p>
        </div>

        <Link to="/profile">
          <Button variant="outline" size="sm">
            <Sliders className="h-4 w-4" />
            Edit Profile ({userState?.profile.countryOfOrigin ?? 'Nepal'} • GPA{' '}
            {userState?.profile.expectedGpa ?? 'N/A'})
          </Button>
        </Link>
      </div>

      <Card className="mb-6 flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-3">
          <Select
            aria-label="Filter match results by eligibility status"
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value as 'ALL' | EligibilityStatus)}
            className="w-52"
          >
            <option value="ALL">All Statuses ({ranked.length})</option>
            <option value="eligible">Eligible Only</option>
            <option value="likely_eligible">Likely Eligible</option>
            <option value="needs_information">Needs Information</option>
            <option value="ineligible">Disqualified / Ineligible</option>
          </Select>

          <label className="flex cursor-pointer items-center gap-2 text-xs text-text-secondary">
            <input
              type="checkbox"
              checked={includeDemo}
              onChange={(e) => setIncludeDemo(e.target.checked)}
              className="h-4 w-4 accent-accent-primary"
            />
            <span>Include Synthetic Demo edge-case records</span>
          </label>
        </div>

        <span className="text-xs text-text-muted">
          Hard eligibility disqualifiers are always surfaced and cap match scores.
        </span>
      </Card>

      <div className="grid gap-6 lg:grid-cols-12">
        <div className="space-y-2.5 lg:col-span-5">
          {ranked.map(({ scholarship, match }) => {
            const active = activeEntry?.scholarship.id === scholarship.id;
            return (
              <button
                key={scholarship.id}
                type="button"
                onClick={() => setSelectedId(scholarship.id)}
                className={`sp-card w-full p-4 text-left transition-colors ${
                  active
                    ? 'border-accent-primary bg-bg-elevated'
                    : 'hover:border-border-strong'
                }`}
              >
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <p className="text-sm font-semibold text-text-primary">{scholarship.name}</p>
                    <p className="mt-0.5 text-xs text-text-secondary">
                      {scholarship.countryName} • {scholarship.institutionDisplay}
                    </p>
                  </div>
                  <div className="text-right">
                    <span className="font-mono text-base font-bold text-accent-primary">
                      {match.matchPercentage}%
                    </span>
                    <div className="mt-0.5">
                      <Badge
                        variant={
                          match.eligibilityStatus === 'ineligible'
                            ? 'error'
                            : match.eligibilityStatus === 'eligible'
                            ? 'success'
                            : 'warning'
                        }
                      >
                        {match.eligibilityStatus.replace('_', ' ')}
                      </Badge>
                    </div>
                  </div>
                </div>
              </button>
            );
          })}
        </div>

        <div className="lg:col-span-7">
          {activeEntry && userState?.profile ? (
            <div className="sticky top-20 space-y-4">
              <Card className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <h2 className="text-lg font-bold text-text-primary">
                    {activeEntry.scholarship.name}
                  </h2>
                  <p className="text-xs text-text-secondary">
                    {activeEntry.scholarship.provider} • {activeEntry.scholarship.countryName}
                  </p>
                </div>
                <Link to={`/scholarships/${activeEntry.scholarship.slug}`}>
                  <Button size="sm" variant="secondary">
                    <Sparkles className="h-3.5 w-3.5" />
                    Full Scholarship Page
                  </Button>
                </Link>
              </Card>

              <MatchResultPanel
                scholarship={activeEntry.scholarship}
                profile={userState.profile}
                match={activeEntry.match}
              />
            </div>
          ) : (
            <Card className="py-12 text-center text-sm text-text-secondary">
              No scholarships match this eligibility status filter.
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}
