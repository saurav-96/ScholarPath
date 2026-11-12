import { Link } from 'react-router-dom';
import {
  Bookmark,
  BookmarkCheck,
  ExternalLink,
  GitCompare,
  MapPin,
  Award,
} from 'lucide-react';
import { Badge, Button, Card } from '@/components/ui/Primitives';
import { VerificationBadge } from '@/components/common/VerificationBadge';
import { formatCurrency } from '@/lib/utils';
import type { University } from '@/types/domain';

export function UniversityCard({
  university,
  scholarshipCount,
  isSaved = false,
  isCompared = false,
  onToggleSave,
  onToggleCompare,
}: {
  university: University;
  scholarshipCount: number;
  isSaved?: boolean;
  isCompared?: boolean;
  onToggleSave?: (id: string) => void;
  onToggleCompare?: (id: string) => void;
}) {
  const tuitionText =
    university.tuitionMinAnnual === null
      ? 'Exact fee unavailable (check portal)'
      : university.tuitionMinAnnual === 0 && university.tuitionMaxAnnual === 0
      ? 'Tuition waiver / €0 baseline'
      : university.tuitionMinAnnual === university.tuitionMaxAnnual
      ? `${formatCurrency(university.tuitionMinAnnual, university.tuitionCurrency)}/yr`
      : `${formatCurrency(university.tuitionMinAnnual, university.tuitionCurrency)} – ${formatCurrency(
          university.tuitionMaxAnnual,
          university.tuitionCurrency,
        )}/yr`;

  return (
    <Card className="sp-card-hover flex h-full flex-col justify-between gap-4">
      <div className="space-y-3">
        <div className="flex items-start justify-between gap-2">
          <div className="flex flex-wrap gap-1.5">
            <VerificationBadge
              status={university.verificationStatus}
              recordKind={university.recordKind}
            />
            <Badge variant="outline">{university.institutionType}</Badge>
          </div>
          {onToggleSave && (
            <button
              type="button"
              onClick={() => onToggleSave(university.id)}
              aria-label={isSaved ? `Unsave ${university.name}` : `Save ${university.name}`}
              className="rounded-lg border border-border-subtle p-1.5 text-text-secondary hover:border-border-strong hover:text-accent-primary"
            >
              {isSaved ? (
                <BookmarkCheck className="h-4 w-4 text-accent-primary" />
              ) : (
                <Bookmark className="h-4 w-4" />
              )}
            </button>
          )}
        </div>

        <div>
          <Link
            to={`/universities/${university.slug}`}
            className="text-base font-semibold text-text-primary hover:text-accent-primary"
          >
            {university.name}
          </Link>
          <p className="mt-1 flex items-center gap-1.5 text-xs text-text-secondary">
            <MapPin className="h-3.5 w-3.5 text-accent-secondary" />
            {university.city}, {university.countryName}
          </p>
        </div>

        <div className="rounded-lg border border-border-subtle bg-bg-secondary p-3 text-xs">
          <div className="flex items-center justify-between">
            <span className="text-text-secondary">Bachelor Tuition Range</span>
            <span className="font-mono font-semibold text-text-primary">{tuitionText}</span>
          </div>
          <div className="mt-1.5 flex items-center justify-between">
            <span className="text-text-secondary">Est. Monthly Living</span>
            <span className="font-mono text-text-primary">
              {university.estimatedLivingMonthly !== null
                ? `${formatCurrency(university.estimatedLivingMonthly, university.livingCurrency)}/mo`
                : 'Unavailable'}
            </span>
          </div>
        </div>

        <div className="flex flex-wrap gap-1.5">
          {university.instructionLanguages.map((lang) => (
            <Badge key={lang} variant="default">
              {lang}
            </Badge>
          ))}
          {scholarshipCount > 0 && (
            <Badge variant="success">
              <Award className="h-3 w-3" />
              {scholarshipCount} Scholarship{scholarshipCount > 1 ? 's' : ''}
            </Badge>
          )}
        </div>

        {university.programs.length > 0 && (
          <p className="line-clamp-2 text-xs text-text-secondary">
            Sample Bachelor&apos;s: {university.programs.map((p) => p.name).join(', ')}
          </p>
        )}
      </div>

      <div className="flex items-center gap-2 border-t border-border-subtle pt-3">
        <Link to={`/universities/${university.slug}`} className="flex-1">
          <Button size="sm" className="w-full">
            Explore University
          </Button>
        </Link>
        {onToggleCompare && (
          <Button
            size="sm"
            variant={isCompared ? 'secondary' : 'outline'}
            onClick={() => onToggleCompare(university.id)}
            aria-pressed={isCompared}
            title="Compare up to 4 universities"
          >
            <GitCompare className="h-3.5 w-3.5" />
            {isCompared ? 'Selected' : 'Compare'}
          </Button>
        )}
        <a
          href={university.internationalAdmissionsUrl}
          target="_blank"
          rel="noopener noreferrer"
          aria-label={`Official international admissions for ${university.name}`}
        >
          <Button size="sm" variant="ghost">
            <ExternalLink className="h-3.5 w-3.5" />
          </Button>
        </a>
      </div>
    </Card>
  );
}
