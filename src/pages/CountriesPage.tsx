import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { ArrowRight, Calculator, ExternalLink, Globe2, GraduationCap, Search } from 'lucide-react';
import { PageMeta } from '@/components/common/PageMeta';
import { VerificationBadge } from '@/components/common/VerificationBadge';
import { EmptyState } from '@/components/ui/EmptyState';
import { Badge, Button, Card, Input, Select } from '@/components/ui/Primitives';
import { useCatalogData } from '@/hooks/useScholarPathData';

export function CountriesPage() {
  const { countries, universities, scholarships } = useCatalogData();
  const [searchQuery, setSearchQuery] = useState('');
  const [regionFilter, setRegionFilter] = useState('ALL');

  const regions = useMemo(() => {
    return Array.from(new Set(countries.map((c) => c.region))).sort();
  }, [countries]);

  const filteredCountries = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    return countries.filter((c) => {
      if (regionFilter !== 'ALL' && c.region !== regionFilter) return false;
      if (q) {
        const hay = `${c.name} ${c.code} ${c.region} ${c.tuitionOverview} ${c.officialPortalName}`.toLowerCase();
        if (!hay.includes(q)) return false;
      }
      return true;
    });
  }, [countries, regionFilter, searchQuery]);

  return (
    <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
      <PageMeta
        title="Explore Study Destinations"
        description="Compare bachelor tuition systems, estimated living expenses, official study portals, and verified scholarships across 16 countries."
      />

      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="font-display text-3xl font-bold text-text-primary">
            Explore Study Destinations
          </h1>
          <p className="mt-1 max-w-2xl text-sm text-text-secondary">
            Compare national tuition frameworks, official government education portals, indicative
            student living ranges, and English-taught bachelor pathways across 16 destinations.
          </p>
        </div>
        <Link to="/calculator">
          <Button variant="outline">
            <Calculator className="h-4 w-4" />
            Financial Cost Calculator
          </Button>
        </Link>
      </div>

      {/* Filters */}
      <div className="mt-6 flex flex-wrap items-center gap-3">
        <div className="relative min-w-[220px] flex-1">
          <Search className="pointer-events-none absolute left-3 top-3 h-4 w-4 text-text-muted" />
          <Input
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search country name, tuition system, or official portal..."
            className="pl-9"
            aria-label="Search destination countries"
          />
        </div>
        <Select
          value={regionFilter}
          onChange={(e) => setRegionFilter(e.target.value)}
          className="w-full sm:w-56"
          aria-label="Filter by region"
        >
          <option value="ALL">All Regions ({countries.length})</option>
          {regions.map((r) => (
            <option key={r} value={r}>
              {r}
            </option>
          ))}
        </Select>
      </div>

      {/* Grid */}
      {filteredCountries.length === 0 ? (
        <div className="mt-8">
          <EmptyState
            icon={<Globe2 className="h-6 w-6" />}
            title="No destination countries found"
            description="Adjust your region filter or search terms."
            actionLabel="Reset Filters"
            onAction={() => {
              setSearchQuery('');
              setRegionFilter('ALL');
            }}
          />
        </div>
      ) : (
        <div className="mt-6 grid gap-5 md:grid-cols-2 lg:grid-cols-3">
          {filteredCountries.map((country) => {
            const uniCount = universities.filter((u) => u.countryCode === country.code).length;
            const schCount = scholarships.filter(
              (s) => s.countryCode === country.code && !s.isArchived && s.recordKind === 'official',
            ).length;

            const livingRange =
              country.livingCostMonthlyMin && country.livingCostMonthlyMax
                ? `${country.livingCostMonthlyMin}–${country.livingCostMonthlyMax} ${country.livingCostCurrency}/mo`
                : 'Check official portal';

            return (
              <Card key={country.code} className="sp-card-hover flex flex-col justify-between gap-4">
                <div className="space-y-3">
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="rounded bg-bg-elevated px-2 py-0.5 font-mono text-xs font-semibold text-accent-primary">
                          {country.code}
                        </span>
                        <span className="text-xs text-text-muted">{country.region}</span>
                      </div>
                      <h2 className="mt-1.5 font-display text-xl font-bold text-text-primary">
                        <Link
                          to={`/countries/${country.slug}`}
                          className="hover:text-accent-primary"
                        >
                          {country.name}
                        </Link>
                      </h2>
                    </div>
                    <VerificationBadge status={country.verificationStatus} />
                  </div>

                  <p className="line-clamp-3 text-xs leading-relaxed text-text-secondary">
                    {country.tuitionOverview}
                  </p>

                  <div className="rounded-lg border border-border-subtle bg-bg-secondary/70 p-3 text-xs">
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-text-muted">Indicative Monthly Living</span>
                      <Badge variant="outline">Estimate</Badge>
                    </div>
                    <p className="mt-1 font-mono font-semibold text-text-primary">{livingRange}</p>
                    <p className="mt-1 line-clamp-2 text-[11px] text-text-muted">
                      {country.livingCostNote}
                    </p>
                  </div>

                  <div className="flex flex-wrap gap-2 text-xs">
                    <Badge variant="primary">
                      <GraduationCap className="h-3 w-3" />
                      {schCount} Official Scholarships
                    </Badge>
                    <Badge variant="secondary">{uniCount} Universities</Badge>
                  </div>
                </div>

                <div className="flex items-center justify-between gap-2 border-t border-border-subtle pt-3">
                  <a
                    href={country.officialPortalUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex items-center gap-1 truncate text-xs text-text-secondary hover:text-accent-secondary"
                  >
                    {country.officialPortalName}
                    <ExternalLink className="h-3 w-3 shrink-0" />
                  </a>
                  <Link to={`/countries/${country.slug}`}>
                    <Button size="sm" variant="outline">
                      Explore
                      <ArrowRight className="h-3.5 w-3.5" />
                    </Button>
                  </Link>
                </div>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
