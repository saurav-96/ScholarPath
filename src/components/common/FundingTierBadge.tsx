import { Badge } from '@/components/ui/Primitives';
import type { CoverageStatus, FundingTier } from '@/types/domain';

const TIER_MAP: Record<
  FundingTier,
  { label: string; variant: 'success' | 'primary' | 'secondary' | 'warning' | 'default' }
> = {
  fully_funded: { label: 'Fully Funded (Tuition + Living)', variant: 'success' },
  full_tuition: { label: 'Full Tuition Only', variant: 'primary' },
  partial_tuition: { label: 'Partial Tuition', variant: 'secondary' },
  stipend_only: { label: 'Monthly Stipend Only', variant: 'warning' },
  fee_waiver_conditional: { label: 'Conditional Fee Waiver', variant: 'warning' },
};

export function FundingTierBadge({ tier }: { tier: FundingTier }) {
  const cfg = TIER_MAP[tier];
  return <Badge variant={cfg.variant}>{cfg.label}</Badge>;
}

const COVERAGE_MAP: Record<
  CoverageStatus,
  { label: string; variant: 'success' | 'error' | 'default' | 'warning' }
> = {
  confirmed: { label: 'Confirmed coverage', variant: 'success' },
  not_covered: { label: 'Not covered', variant: 'error' },
  not_specified: { label: 'Not specified', variant: 'default' },
  conditional: { label: 'Subject to conditions', variant: 'warning' },
};

export function CoverageStatusBadge({ status }: { status: CoverageStatus }) {
  const cfg = COVERAGE_MAP[status];
  return <Badge variant={cfg.variant}>{cfg.label}</Badge>;
}
