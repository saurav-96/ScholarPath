import { Badge } from '@/components/ui/Primitives';
import type { RecordKind, VerificationStatus } from '@/types/domain';
import { ShieldCheck, AlertCircle, Archive, HelpCircle, FlaskConical } from 'lucide-react';

export function VerificationBadge({
  status,
  recordKind = 'official',
}: {
  status: VerificationStatus;
  recordKind?: RecordKind;
}) {
  if (recordKind === 'synthetic_demo') {
    return (
      <Badge variant="warning" title="Explicit synthetic demo example for testing & walkthroughs">
        <FlaskConical className="h-3 w-3" />
        Synthetic Demo
      </Badge>
    );
  }

  switch (status) {
    case 'officially_verified':
      return (
        <Badge variant="success">
          <ShieldCheck className="h-3 w-3" />
          Officially Verified
        </Badge>
      );
    case 'needs_reverification':
      return (
        <Badge variant="warning">
          <AlertCircle className="h-3 w-3" />
          Needs Re-verification
        </Badge>
      );
    case 'archived':
      return (
        <Badge variant="default">
          <Archive className="h-3 w-3" />
          Archived
        </Badge>
      );
    case 'unverified':
    default:
      return (
        <Badge variant="error">
          <HelpCircle className="h-3 w-3" />
          Unverified
        </Badge>
      );
  }
}
