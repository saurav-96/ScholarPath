import { useEffect, useMemo, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Filter, RotateCcw, Search, SlidersHorizontal, X } from 'lucide-react';
import { PageMeta } from '@/components/common/PageMeta';
import { ScholarshipCard } from '@/components/scholarship/ScholarshipCard';
import { EmptyState } from '@/components/ui/EmptyState';
import { Badge, Button, Card, Input, Select } from '@/components/ui/Primitives';
import { CardGridSkeleton } from '@/components/ui/Skeleton';
import { useCatalogData, useUserWorkspace } from '@/hooks/useScholarPathData';
import {
  DEFAULT_SCHOLARSHIP_FILTERS,
  filterAndSortScholarships,
  type ScholarshipFilterCriteria,
  type ScholarshipSortOption,
} from '@/lib/filters';
import { evaluateScholarshipMatch } from '@/lib/matching';
import type { ScholarshipMatchResult } from '@/types/domain';

const PAGE_SIZE = 9;

export function ScholarshipsPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const { scholarships, countries, isLoading } = useCatalogData();
  const { userState, toggleSavedScholarship } = useUserWorkspace();

  const [filters, setFilters] = useState<ScholarshipFilterCriteria>(() => {
    const q = searchParams.get('q') ?? '';
    const country = searchParams.get('country') ?? 'ALL';
    const degree = searchParams.get('degree') ?? 'ALL';
    const funding = searchParams.get('funding') ?? '';
    return {
      ...DEFAULT_SCHOLARSHIP_FILTERS,
      query: q,
      countryCode: country,
      degreeLevel: degree,
      fullyFunded: funding === 'fully_funded',
      fullTuition: funding === 'full_tuition',
      partialTuition: funding === 'partial_tuition',
      livingStipend: funding === 'living_stipend',
    };
  });

  const [visibleCount, setVisibleCount] = useState(PAGE_SIZE);
  const [mobileFiltersOpen, setMobileFiltersOpen] = useState(false);
  const [isDesktop, setIsDesktop] = useState(() =>
    typeof window !== 'undefined' ? window.matchMedia('(min-width: 1024px)').matches : true,
  );

  useEffect(() => {
    if (typeof window === 'undefined' || typeof window.matchMedia !== 'function') return;
    const mq = window.matchMedia('(min-width: 1024px)');
    const onChange = (e: MediaQueryListEvent) => setIsDesktop(e.matches);
    mq.addEventListener('change', onChange);
    return () => mq.removeEventListener('change', onChange);
  }, []);

  // Sync key query params cleanly so filters survive refresh & sharing
  useEffect(() => {
    const next = new URLSearchParams();
    if (filters.query) next.set('q', filters.query);
    if (filters.countryCode !== 'ALL') next.set('country', filters.countryCode);
    if (filters.degreeLevel !== 'ALL') next.set('degree', filters.degreeLevel);
    if (filters.fullyFunded) next.set('funding', 'fully_funded');
    else if (filters.fullTuition) next.set('funding', 'full_tuition');
    else if (filters.partialTuition) next.set('funding', 'partial_tuition');
    setSearchParams(next, { replace: true });
  }, [
    filters.query,
    filters.countryCode,
    filters.degreeLevel,
    filters.fullyFunded,
    filters.fullTuition,
    filters.partialTuition,
    setSearchParams,
  ]);

  const matchMap = useMemo(() => {
    const map = new Map<string, ScholarshipMatchResult>();
    if (!userState?.profile) return map;
    scholarships.forEach((s) => {
      map.set(s.id, evaluateScholarshipMatch(s, userState.profile));
    });
    return map;
  }, [scholarships, userState?.profile]);

  const filtered = useMemo(
    () => filterAndSortScholarships(scholarships, filters, matchMap),
    [scholarships, filters, matchMap],
  );

  const visible = useMemo(() => filtered.slice(0, visibleCount), [filtered, visibleCount]);
  const savedSet = useMemo(
    () => new Set(userState?.savedScholarships.map((s) => s.scholarshipId) ?? []),
    [userState],
  );

  const updateFilter = <K extends keyof ScholarshipFilterCriteria>(
    key: K,
    value: ScholarshipFilterCriteria[K],
  ) => {
    setVisibleCount(PAGE_SIZE);
    setFilters((prev) => ({ ...prev, [key]: value }));
  };

  const resetFilters = () => {
    setVisibleCount(PAGE_SIZE);
    setFilters(DEFAULT_SCHOLARSHIP_FILTERS);
  };

  const renderFilterControls = () => (
    <div className="space-y-5">
      <div>
        <label htmlFor="filter-country" className="mb-1.5 block text-xs font-medium text-text-secondary">
          Destination Country
        </label>
        <Select
          id="filter-country"
          value={filters.countryCode}
          onChange={(e) => updateFilter('countryCode', e.target.value)}
        >
          <option value="ALL">All Countries ({countries.length})</option>
          {countries.map((c) => (
            <option key={c.code} value={c.code}>
              {c.name}
            </option>
          ))}
        </Select>
      </div>

      <div>
        <label htmlFor="filter-degree" className="mb-1.5 block text-xs font-medium text-text-secondary">
          Degree Level
        </label>
        <Select
          id="filter-degree"
          value={filters.degreeLevel}
          onChange={(e) => updateFilter('degreeLevel', e.target.value)}
        >
          <option value="ALL">All Levels</option>
          <option value="Bachelor">Bachelor&apos;s</option>
          <option value="Foundation">Foundation / Pathway</option>
        </Select>
      </div>

      <div>
        <label htmlFor="filter-subject" className="mb-1.5 block text-xs font-medium text-text-secondary">
          Subject / Field
        </label>
        <Select
          id="filter-subject"
          value={filters.subject}
          onChange={(e) => updateFilter('subject', e.target.value)}
        >
          <option value="ALL">All Subjects</option>
          <option value="Computer">Computer Science &amp; Computing</option>
          <option value="Artificial Intelligence">Artificial Intelligence</option>
          <option value="Engineering">Engineering &amp; Software</option>
          <option value="Data Science">Data Science</option>
          <option value="Economics">Economics &amp; Management</option>
          <option value="Language">Language &amp; Literature</option>
        </Select>
      </div>

      <div>
        <label htmlFor="filter-nationality" className="mb-1.5 block text-xs font-medium text-text-secondary">
          Applicant Nationality
        </label>
        <Input
          id="filter-nationality"
          value={filters.nationality}
          onChange={(e) => updateFilter('nationality', e.target.value)}
          placeholder="e.g. Nepal, India, Kenya"
        />
      </div>

      <div className="space-y-2 border-t border-border-subtle pt-4">
        <p className="text-xs font-semibold uppercase tracking-wider text-text-muted">
          Funding Coverage
        </p>
        {[
          { key: 'fullyFunded', label: 'Fully funded (Tuition + Living)' },
          { key: 'fullTuition', label: 'Full tuition' },
          { key: 'partialTuition', label: 'Partial tuition / Fee waiver' },
          { key: 'livingStipend', label: 'Living stipend included' },
          { key: 'accommodationIncluded', label: 'Accommodation included' },
          { key: 'noApplicationFee', label: 'No application fee' },
        ].map((item) => {
          const checked = Boolean(filters[item.key as keyof ScholarshipFilterCriteria]);
          return (
            <label
              key={item.key}
              className="flex cursor-pointer items-center gap-2 text-xs text-text-secondary hover:text-text-primary"
            >
              <input
                type="checkbox"
                checked={checked}
                onChange={(e) =>
                  updateFilter(
                    item.key as keyof ScholarshipFilterCriteria,
                    e.target.checked as never,
                  )
                }
                className="h-4 w-4 rounded border-border-strong accent-accent-primary"
              />
              <span>{item.label}</span>
            </label>
          );
        })}
      </div>

      <div className="space-y-2 border-t border-border-subtle pt-4">
        <p className="text-xs font-semibold uppercase tracking-wider text-text-muted">
          Eligibility &amp; Timeline
        </p>
        {[
          { key: 'englishTaught', label: 'English-taught programmes' },
          { key: 'undergraduateOnly', label: 'Undergraduate scholarships' },
          { key: 'openApplications', label: 'Open applications now' },
          { key: 'upcomingDeadlines', label: 'Upcoming deadlines (<= 90d)' },
          { key: 'acceptsInternational', label: 'Accepts international students' },
          { key: 'hideSyntheticDemo', label: 'Official verified records only' },
        ].map((item) => {
          const checked = Boolean(filters[item.key as keyof ScholarshipFilterCriteria]);
          return (
            <label
              key={item.key}
              className="flex cursor-pointer items-center gap-2 text-xs text-text-secondary hover:text-text-primary"
            >
              <input
                type="checkbox"
                checked={checked}
                onChange={(e) =>
                  updateFilter(
                    item.key as keyof ScholarshipFilterCriteria,
                    e.target.checked as never,
                  )
                }
                className="h-4 w-4 rounded border-border-strong accent-accent-primary"
              />
              <span>{item.label}</span>
            </label>
          );
        })}
      </div>

      <Button variant="outline" size="sm" className="w-full" onClick={resetFilters}>
        <RotateCcw className="h-3.5 w-3.5" />
        Reset All Filters
      </Button>
    </div>
  );

  return (
    <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
      <PageMeta
        title="Scholarship Discovery Engine"
        description="Search and filter verified international bachelor's scholarships by country, funding coverage, deadline, and eligibility."
      />

      <div className="mb-6 flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
        <div>
          <Badge variant="primary">Module C • Discovery Engine</Badge>
          <h1 className="mt-2 font-display text-3xl font-bold text-text-primary">
            Scholarship Discovery
          </h1>
          <p className="mt-1 text-sm text-text-secondary">
            Combine multiple funding, nationality, language, and deadline filters simultaneously.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <div className="relative min-w-[240px] flex-1 sm:w-72">
            <Search className="pointer-events-none absolute left-3 top-3 h-4 w-4 text-text-muted" />
            <Input
              aria-label="Search scholarships by name, university, country, or subject"
              placeholder="Search Padua, DSU, MEXT, Computer Science..."
              value={filters.query}
              onChange={(e) => updateFilter('query', e.target.value)}
              className="pl-9"
            />
          </div>

          <Select
            aria-label="Sort scholarships"
            value={filters.sortBy}
            onChange={(e) => updateFilter('sortBy', e.target.value as ScholarshipSortOption)}
            className="w-48"
          >
            <option value="deadline">Sort: Deadline (Soonest)</option>
            <option value="best_match">Sort: Best Match Score</option>
            <option value="funding_coverage">Sort: Funding Coverage</option>
            <option value="country">Sort: Country (A–Z)</option>
            <option value="university">Sort: University (A–Z)</option>
            <option value="recently_verified">Sort: Recently Verified</option>
          </Select>

          <Button
            variant="outline"
            className="lg:hidden"
            onClick={() => setMobileFiltersOpen((o) => !o)}
          >
            <SlidersHorizontal className="h-4 w-4" />
            Filters
          </Button>
        </div>
      </div>

      {!isDesktop && mobileFiltersOpen && (
        <Card className="mb-6">
          <div className="mb-3 flex items-center justify-between">
            <span className="text-sm font-semibold text-text-primary">Filter Scholarships</span>
            <button
              type="button"
              aria-label="Close mobile filters"
              onClick={() => setMobileFiltersOpen(false)}
              className="rounded p-1 text-text-muted"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
          {renderFilterControls()}
        </Card>
      )}

      <div className="grid gap-6 lg:grid-cols-12">
        {isDesktop && (
          <aside className="lg:col-span-3">
            <Card className="sticky top-20">{renderFilterControls()}</Card>
          </aside>
        )}

        <div className="space-y-4 lg:col-span-9">
          <div className="flex flex-wrap items-center justify-between gap-2 text-xs text-text-secondary">
            <span>
              Showing <strong className="text-text-primary">{visible.length}</strong> of{' '}
              <strong className="text-text-primary">{filtered.length}</strong> matching scholarships
            </span>
            {userState?.profile && (
              <span>
                Profile active: {userState.profile.countryOfOrigin} •{' '}
                {userState.profile.expectedGpa ? `GPA ${userState.profile.expectedGpa}` : 'GPA pending'}
              </span>
            )}
          </div>

          {isLoading ? (
            <CardGridSkeleton count={6} />
          ) : filtered.length === 0 ? (
            <EmptyState
              icon={<Filter className="h-6 w-6" />}
              title="No scholarships match those combined filters"
              description="Try relaxing one or more criteria such as application fee, country, or accommodation coverage."
              actionLabel="Reset All Filters"
              onAction={resetFilters}
            />
          ) : (
            <>
              <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
                {visible.map((sch) => (
                  <ScholarshipCard
                    key={sch.id}
                    scholarship={sch}
                    match={matchMap.get(sch.id)}
                    isSaved={savedSet.has(sch.id)}
                    onToggleSave={(id) => toggleSavedScholarship({ scholarshipId: id })}
                  />
                ))}
              </div>

              {visible.length < filtered.length && (
                <div className="flex justify-center pt-4">
                  <Button
                    variant="outline"
                    onClick={() => setVisibleCount((c) => c + PAGE_SIZE)}
                  >
                    Load More Scholarships ({filtered.length - visible.length} remaining)
                  </Button>
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}
