import { useMemo, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Building2, GitCompare, RotateCcw, Search } from 'lucide-react';
import { PageMeta } from '@/components/common/PageMeta';
import { UniversityCard } from '@/components/university/UniversityCard';
import { EmptyState } from '@/components/ui/EmptyState';
import { Badge, Button, Card, Input, Select } from '@/components/ui/Primitives';
import { CardGridSkeleton } from '@/components/ui/Skeleton';
import { useToast } from '@/contexts/ToastContext';
import { useCatalogData, useUserWorkspace } from '@/hooks/useScholarPathData';
import {
  DEFAULT_UNIVERSITY_FILTERS,
  filterUniversities,
  type UniversityFilterCriteria,
} from '@/lib/filters';

export function UniversitiesPage() {
  const navigate = useNavigate();
  const { pushToast } = useToast();
  const { universities, scholarships, countries, isLoading } = useCatalogData();
  const { userState, toggleSavedUniversity } = useUserWorkspace();

  const [filters, setFilters] = useState<UniversityFilterCriteria>(DEFAULT_UNIVERSITY_FILTERS);
  const [compareIds, setCompareIds] = useState<string[]>([
    'uni-padua',
    'uni-trento',
    'uni-polito',
  ]);

  const scholarshipCountByUni = useMemo(() => {
    const map = new Map<string, number>();
    scholarships.forEach((s) => {
      if (s.universityId && !s.isArchived) {
        map.set(s.universityId, (map.get(s.universityId) ?? 0) + 1);
      }
    });
    return map;
  }, [scholarships]);

  const scholarshipUniSet = useMemo(
    () => new Set(scholarshipCountByUni.keys()),
    [scholarshipCountByUni],
  );

  const filtered = useMemo(
    () => filterUniversities(universities, filters, scholarshipUniSet),
    [universities, filters, scholarshipUniSet],
  );

  const savedSet = useMemo(
    () => new Set(userState?.savedUniversities.map((u) => u.universityId) ?? []),
    [userState],
  );

  const handleToggleCompare = (id: string) => {
    setCompareIds((prev) => {
      if (prev.includes(id)) {
        return prev.filter((item) => item !== id);
      }
      if (prev.length >= 4) {
        pushToast({
          title: 'Maximum 4 universities can be compared at once',
          description: 'Deselect one university before adding another.',
          variant: 'warning',
        });
        return prev;
      }
      return [...prev, id];
    });
  };

  return (
    <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
      <PageMeta
        title="University Discovery & Affordability"
        description="Explore international universities offering English-taught bachelor degrees, compare tuition fees, and link verified scholarships."
      />

      <div className="mb-6 flex flex-wrap items-end justify-between gap-4">
        <div>
          <Badge variant="secondary">Module E • University Explorer</Badge>
          <h1 className="mt-2 font-display text-3xl font-bold text-text-primary">
            University Discovery
          </h1>
          <p className="mt-1 text-sm text-text-secondary">
            Compare bachelor&apos;s tuition ranges, living cost estimates, and linked scholarship options.
          </p>
        </div>

        <Link to={`/compare/universities?ids=${compareIds.join(',')}`}>
          <Button variant="secondary" disabled={compareIds.length < 2}>
            <GitCompare className="h-4 w-4" />
            Compare Selected ({compareIds.length}/4)
          </Button>
        </Link>
      </div>

      {/* Filters Bar */}
      <Card className="mb-6">
        <div className="grid gap-3 md:grid-cols-6">
          <div className="relative md:col-span-2">
            <Search className="pointer-events-none absolute left-3 top-3 h-4 w-4 text-text-muted" />
            <Input
              aria-label="Search universities"
              placeholder="Search university, city, or degree..."
              value={filters.query}
              onChange={(e) => setFilters({ ...filters, query: e.target.value })}
              className="pl-9"
            />
          </div>

          <Select
            aria-label="Filter university by country"
            value={filters.countryCode}
            onChange={(e) => setFilters({ ...filters, countryCode: e.target.value })}
          >
            <option value="ALL">All Countries</option>
            {countries.map((c) => (
              <option key={c.code} value={c.code}>
                {c.name}
              </option>
            ))}
          </Select>

          <Select
            aria-label="Filter university by subject"
            value={filters.subject}
            onChange={(e) => setFilters({ ...filters, subject: e.target.value })}
          >
            <option value="ALL">All Subjects</option>
            <option value="Computer">Computer Science</option>
            <option value="Artificial Intelligence">Artificial Intelligence</option>
            <option value="Engineering">Engineering</option>
            <option value="Economics">Economics</option>
          </Select>

          <Select
            aria-label="Filter by max annual tuition"
            value={filters.maxAnnualTuition === null ? 'ALL' : String(filters.maxAnnualTuition)}
            onChange={(e) =>
              setFilters({
                ...filters,
                maxAnnualTuition: e.target.value === 'ALL' ? null : Number(e.target.value),
              })
            }
          >
            <option value="ALL">Any Tuition Range</option>
            <option value="0">€0 / Tuition-Free Baseline</option>
            <option value="4000">Up to 4,000/yr</option>
            <option value="15000">Up to 15,000/yr</option>
          </Select>

          <Button
            variant="outline"
            onClick={() => setFilters(DEFAULT_UNIVERSITY_FILTERS)}
            title="Reset filters"
          >
            <RotateCcw className="h-4 w-4" />
            Reset
          </Button>
        </div>

        <div className="mt-3 flex flex-wrap gap-4 border-t border-border-subtle pt-3 text-xs text-text-secondary">
          <label className="flex cursor-pointer items-center gap-2">
            <input
              type="checkbox"
              checked={filters.englishTaughtOnly}
              onChange={(e) => setFilters({ ...filters, englishTaughtOnly: e.target.checked })}
              className="h-4 w-4 accent-accent-primary"
            />
            <span>English-taught bachelor&apos;s available</span>
          </label>
          <label className="flex cursor-pointer items-center gap-2">
            <input
              type="checkbox"
              checked={filters.withScholarshipOnly}
              onChange={(e) => setFilters({ ...filters, withScholarshipOnly: e.target.checked })}
              className="h-4 w-4 accent-accent-primary"
            />
            <span>With verified scholarship in catalog</span>
          </label>
        </div>
      </Card>

      {compareIds.length >= 2 && (
        <div className="mb-6 flex flex-wrap items-center justify-between gap-3 rounded-xl border border-accent-secondary/35 bg-accent-secondary/10 px-4 py-3 text-xs">
          <span className="font-medium text-text-primary">
            Selected for comparison ({compareIds.length}/4):{' '}
            {compareIds
              .map((id) => universities.find((u) => u.id === id)?.name)
              .filter(Boolean)
              .join(' • ')}
          </span>
          <Button
            size="sm"
            variant="secondary"
            onClick={() => navigate(`/compare/universities?ids=${compareIds.join(',')}`)}
          >
            Open Comparison View
          </Button>
        </div>
      )}

      {isLoading ? (
        <CardGridSkeleton count={6} />
      ) : filtered.length === 0 ? (
        <EmptyState
          icon={<Building2 className="h-6 w-6" />}
          title="No universities match those filters"
          description="Try broadening your tuition limit or clearing the subject filter."
          actionLabel="Reset University Filters"
          onAction={() => setFilters(DEFAULT_UNIVERSITY_FILTERS)}
        />
      ) : (
        <div className="grid gap-5 md:grid-cols-2 lg:grid-cols-3">
          {filtered.map((uni) => (
            <UniversityCard
              key={uni.id}
              university={uni}
              scholarshipCount={scholarshipCountByUni.get(uni.id) ?? 0}
              isSaved={savedSet.has(uni.id)}
              isCompared={compareIds.includes(uni.id)}
              onToggleSave={(id) => toggleSavedUniversity({ universityId: id })}
              onToggleCompare={handleToggleCompare}
            />
          ))}
        </div>
      )}
    </div>
  );
}
