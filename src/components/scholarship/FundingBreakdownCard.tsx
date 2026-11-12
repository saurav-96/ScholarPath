import { Card } from '@/components/ui/Primitives';
import { CoverageStatusBadge, FundingTierBadge } from '@/components/common/FundingTierBadge';
import type { Scholarship } from '@/types/domain';
import { GraduationCap, Wallet, Home, Plane, HeartPulse } from 'lucide-react';

export function FundingBreakdownCard({ scholarship }: { scholarship: Scholarship }) {
  const rows = [
    {
      label: 'Tuition Fee Coverage',
      icon: <GraduationCap className="h-4 w-4 text-accent-primary" />,
      detail: scholarship.tuitionCoverage,
    },
    {
      label: 'Living Stipend / Allowance',
      icon: <Wallet className="h-4 w-4 text-accent-secondary" />,
      detail: scholarship.livingCoverage,
    },
    {
      label: 'Accommodation / Housing',
      icon: <Home className="h-4 w-4 text-accent-primary" />,
      detail: scholarship.accommodationCoverage,
    },
    {
      label: 'Travel / Airfare',
      icon: <Plane className="h-4 w-4 text-accent-secondary" />,
      detail: scholarship.travelCoverage,
    },
    {
      label: 'Health Insurance',
      icon: <HeartPulse className="h-4 w-4 text-accent-primary" />,
      detail: scholarship.insuranceCoverage,
    },
  ];

  return (
    <Card className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <h3 className="text-base font-semibold text-text-primary">Verified Funding Breakdown</h3>
          <p className="text-xs text-text-secondary">
            Full tuition alone does not mean fully funded. Each expense item is tracked separately.
          </p>
        </div>
        <FundingTierBadge tier={scholarship.fundingTier} />
      </div>

      <div className="divide-y divide-border-subtle rounded-lg border border-border-subtle bg-bg-secondary">
        {rows.map((row) => (
          <div
            key={row.label}
            className="flex flex-col gap-2 p-3.5 sm:flex-row sm:items-start sm:justify-between"
          >
            <div className="flex items-start gap-2.5">
              <div className="mt-0.5 shrink-0">{row.icon}</div>
              <div>
                <p className="text-sm font-medium text-text-primary">{row.label}</p>
                <p className="mt-0.5 text-xs leading-relaxed text-text-secondary">
                  {row.detail.note}
                </p>
              </div>
            </div>
            <div className="shrink-0">
              <CoverageStatusBadge status={row.detail.status} />
            </div>
          </div>
        ))}
      </div>

      {scholarship.expensesNotCovered.length > 0 && (
        <div className="rounded-lg border border-status-warning/25 bg-status-warning/5 p-3">
          <p className="text-xs font-semibold uppercase tracking-wide text-status-warning">
            Expenses Not Covered / Paid by Student
          </p>
          <ul className="mt-1.5 list-inside list-disc space-y-1 text-xs text-text-secondary">
            {scholarship.expensesNotCovered.map((item) => (
              <li key={item}>{item}</li>
            ))}
          </ul>
        </div>
      )}
    </Card>
  );
}
