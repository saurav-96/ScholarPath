import { useMemo, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { ArrowLeft, Award, ExternalLink, Plus, X } from 'lucide-react';
import { PageMeta } from '@/components/common/PageMeta';
import { Badge, Button, Card, Select } from '@/components/ui/Primitives';
import { useCatalogData } from '@/hooks/useScholarPathData';
import { formatCurrency } from '@/lib/utils';

export function UniversityComparePage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const { universities, scholarships } = useCatalogData();

  const selectedIds = useMemo(() => {
    const raw = searchParams.get('ids');
    const candidateIds =
      raw === null
        ? ['uni-padua', 'uni-trento', 'uni-polito']
        : raw
            .split(',')
            .map((s) => s.trim())
            .filter(Boolean)
            .slice(0, 4);

    if (universities.length === 0) return candidateIds;
    return candidateIds.filter((id) => universities.some((u) => u.id === id));
  }, [searchParams, universities]);

  const [addCandidate, setAddCandidate] = useState('');

  const selectedUnis = useMemo(
    () =>
      selectedIds
        .map((id) => universities.find((u) => u.id === id))
        .filter((u): u is NonNullable<typeof u> => Boolean(u)),
    [selectedIds, universities],
  );

  const updateIds = (next: string[]) => {
    setSearchParams({ ids: next.slice(0, 4).join(',') }, { replace: true });
  };

  // Identify most affordable option with published tuition min
  const lowestTuitionUniId = useMemo(() => {
    const withFees = selectedUnis.filter((u) => u.tuitionMinAnnual !== null);
    if (withFees.length === 0) return null;
    return withFees.sort((a, b) => (a.tuitionMinAnnual ?? 0) - (b.tuitionMinAnnual ?? 0))[0]?.id;
  }, [selectedUnis]);

  return (
    <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
      <PageMeta
        title="Compare Universities"
        description="Compare up to 4 universities side-by-side on tuition fees, living costs, language requirements, and scholarships."
      />

      <div className="mb-6 flex flex-wrap items-end justify-between gap-4">
        <div>
          <Link
            to="/universities"
            className="mb-2 inline-flex items-center gap-1.5 text-xs font-medium text-text-secondary hover:text-text-primary"
          >
            <ArrowLeft className="h-3.5 w-3.5" />
            Back to Universities
          </Link>
          <h1 className="font-display text-3xl font-bold text-text-primary">
            Side-by-Side University Comparison
          </h1>
          <p className="mt-1 text-sm text-text-secondary">
            Compare up to 4 universities across tuition, living expenses, duration, and scholarships.
          </p>
        </div>

        {selectedUnis.length < 4 && (
          <div className="flex items-center gap-2">
            <Select
              aria-label="Add university to comparison"
              value={addCandidate}
              onChange={(e) => setAddCandidate(e.target.value)}
              className="w-64"
            >
              <option value="">Select university to add...</option>
              {universities
                .filter((u) => !selectedIds.includes(u.id))
                .map((u) => (
                  <option key={u.id} value={u.id}>
                    {u.name} ({u.countryCode})
                  </option>
                ))}
            </Select>
            <Button
              variant="secondary"
              disabled={!addCandidate}
              onClick={() => {
                if (addCandidate && !selectedIds.includes(addCandidate)) {
                  updateIds([...selectedIds, addCandidate]);
                  setAddCandidate('');
                }
              }}
            >
              <Plus className="h-4 w-4" />
              Add
            </Button>
          </div>
        )}
      </div>

      {selectedUnis.length === 0 ? (
        <Card className="py-12 text-center">
          <p className="text-sm text-text-secondary">Select at least one university above to compare.</p>
        </Card>
      ) : (
        <div className="overflow-x-auto rounded-xl border border-border-subtle bg-bg-surface">
          <table className="w-full min-w-[720px] border-collapse text-left text-sm">
            <thead>
              <tr className="border-b border-border-subtle bg-bg-secondary">
                <th className="w-48 p-4 text-xs font-semibold uppercase tracking-wider text-text-muted">
                  Comparison Metric
                </th>
                {selectedUnis.map((uni) => (
                  <th key={uni.id} className="p-4 align-top">
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <Link
                          to={`/universities/${uni.slug}`}
                          className="font-semibold text-text-primary hover:text-accent-primary"
                        >
                          {uni.name}
                        </Link>
                        <p className="mt-0.5 text-xs font-normal text-text-secondary">
                          {uni.city}, {uni.countryName}
                        </p>
                        {uni.id === lowestTuitionUniId && (
                          <Badge variant="success" className="mt-1.5">
                            Lowest Baseline Tuition
                          </Badge>
                        )}
                      </div>
                      <button
                        type="button"
                        aria-label={`Remove ${uni.name} from comparison`}
                        onClick={() => updateIds(selectedIds.filter((id) => id !== uni.id))}
                        className="rounded p-1 text-text-muted hover:bg-bg-elevated hover:text-text-primary"
                      >
                        <X className="h-4 w-4" />
                      </button>
                    </div>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-border-subtle">
              <tr>
                <td className="p-4 font-medium text-text-secondary">Tuition Fee Range</td>
                {selectedUnis.map((uni) => (
                  <td key={uni.id} className="p-4">
                    <p className="font-mono font-semibold text-text-primary">
                      {uni.tuitionMinAnnual === null
                        ? 'Unavailable'
                        : `${formatCurrency(uni.tuitionMinAnnual, uni.tuitionCurrency)} – ${formatCurrency(
                            uni.tuitionMaxAnnual,
                            uni.tuitionCurrency,
                          )}/yr`}
                    </p>
                    <p className="mt-1 text-xs text-text-muted">{uni.tuitionNote}</p>
                  </td>
                ))}
              </tr>
              <tr>
                <td className="p-4 font-medium text-text-secondary">Est. Monthly Living</td>
                {selectedUnis.map((uni) => (
                  <td key={uni.id} className="p-4 font-mono text-text-primary">
                    {uni.estimatedLivingMonthly !== null
                      ? `${formatCurrency(uni.estimatedLivingMonthly, uni.livingCurrency)}/mo`
                      : 'Unavailable'}
                  </td>
                ))}
              </tr>
              <tr>
                <td className="p-4 font-medium text-text-secondary">Programme Duration</td>
                {selectedUnis.map((uni) => (
                  <td key={uni.id} className="p-4 text-text-primary">
                    {uni.programs.length > 0
                      ? `${uni.programs[0].durationYears} years (${uni.programs[0].name})`
                      : 'Unavailable'}
                  </td>
                ))}
              </tr>
              <tr>
                <td className="p-4 font-medium text-text-secondary">Language Requirements</td>
                {selectedUnis.map((uni) => (
                  <td key={uni.id} className="p-4 text-xs text-text-secondary">
                    {uni.englishRequirements}
                  </td>
                ))}
              </tr>
              <tr>
                <td className="p-4 font-medium text-text-secondary">Scholarship Availability</td>
                {selectedUnis.map((uni) => {
                  const uniSch = scholarships.filter(
                    (s) => s.universityId === uni.id && s.recordKind === 'official',
                  );
                  return (
                    <td key={uni.id} className="p-4">
                      {uniSch.length === 0 ? (
                        <span className="text-xs text-text-muted">
                          Check country regional / government awards
                        </span>
                      ) : (
                        <div className="space-y-1.5">
                          {uniSch.map((s) => (
                            <Link
                              key={s.id}
                              to={`/scholarships/${s.slug}`}
                              className="flex items-center gap-1 text-xs font-medium text-accent-primary hover:underline"
                            >
                              <Award className="h-3.5 w-3.5 shrink-0" />
                              {s.name}
                            </Link>
                          ))}
                        </div>
                      )}
                    </td>
                  );
                })}
              </tr>
              <tr>
                <td className="p-4 font-medium text-text-secondary">Admission Requirements</td>
                {selectedUnis.map((uni) => (
                  <td key={uni.id} className="p-4">
                    <ul className="list-inside list-disc space-y-1 text-xs text-text-secondary">
                      {uni.admissionRequirements.map((r) => (
                        <li key={r}>{r}</li>
                      ))}
                    </ul>
                  </td>
                ))}
              </tr>
              <tr>
                <td className="p-4 font-medium text-text-secondary">Application Periods</td>
                {selectedUnis.map((uni) => (
                  <td key={uni.id} className="p-4 text-xs text-text-secondary">
                    <p>{uni.applicationPeriods}</p>
                    <a
                      href={uni.internationalAdmissionsUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="mt-2 inline-flex items-center gap-1 text-accent-secondary hover:underline"
                    >
                      Official Portal <ExternalLink className="h-3 w-3" />
                    </a>
                  </td>
                ))}
              </tr>
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
