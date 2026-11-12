import { Link } from 'react-router-dom';
import { Bookmark, BookmarkCheck, Calendar, ExternalLink, MapPin, Sparkles } from 'lucide-react';
import { Badge, Button, Card } from '@/components/ui/Primitives';
import { FundingTierBadge } from '@/components/common/FundingTierBadge';
import { VerificationBadge } from '@/components/common/VerificationBadge';
import { daysUntilDate, formatDeadlineDisplay, getDeadlineStatus } from '@/lib/dates';
import type { Scholarship, ScholarshipMatchResult } from '@/types/domain';

export function ScholarshipCard({
  scholarship,
  match,
  isSaved = false,
  onToggleSave,
}: {
  scholarship: Scholarship;
  match?: ScholarshipMatchResult;
  isSaved?: boolean;
  onToggleSave?: (scholarshipId: string) => void;
}) {
  const deadlineStatus = getDeadlineStatus(
    scholarship.applicationOpenDate,
    scholarship.applicationDeadline,
  );
  const daysLeft = daysUntilDate(scholarship.applicationDeadline);

  return (
    <Card
      className="sp-card-hover flex h-full flex-col justify-between gap-4"
      data-testid={`scholarship-card-${scholarship.slug}`}
    >
      <div className="space-y-3">
        <div className="flex items-start justify-between gap-2">
          <div className="flex min-w-0 flex-1 flex-wrap items-center gap-1.5">
            <VerificationBadge
              status={scholarship.verificationStatus}
              recordKind={scholarship.recordKind}
            />
            <Badge variant="outline">{scholarship.degreeLevel}</Badge>
          </div>
          {onToggleSave && (
            <button
              type="button"
              onClick={() => onToggleSave(scholarship.id)}
              aria-label={isSaved ? `Remove ${scholarship.name} from saved` : `Save ${scholarship.name}`}
              className="shrink-0 rounded-lg border border-border-subtle p-1.5 text-text-secondary transition-colors hover:border-border-strong hover:text-accent-primary"
            >
              {isSaved ? (
                <BookmarkCheck className="h-4 w-4 text-accent-primary" />
              ) : (
                <Bookmark className="h-4 w-4" />
              )}
            </button>
          )}
        </div>

        <div className="min-w-0">
          <Link
            to={`/scholarships/${scholarship.slug}`}
            className="line-clamp-2 text-base font-semibold text-text-primary hover:text-accent-primary"
          >
            {scholarship.name}
          </Link>
          <p className="mt-1 flex min-w-0 flex-wrap items-center gap-x-2 gap-y-1 text-xs text-text-secondary">
            <span className="inline-flex items-center gap-1">
              <MapPin className="h-3.5 w-3.5 text-accent-secondary" />
              {scholarship.countryName}
            </span>
            <span>•</span>
            <span className="truncate">{scholarship.institutionDisplay}</span>
          </p>
        </div>

        <p className="line-clamp-3 text-sm leading-relaxed text-text-secondary">
          {scholarship.summary}
        </p>

        <div className="flex flex-wrap gap-1.5">
          <FundingTierBadge tier={scholarship.fundingTier} />
          {scholarship.applicationFeeAmount === 0 && <Badge variant="secondary">No App Fee</Badge>}
          {scholarship.instructionLanguages.includes('English') && (
            <Badge variant="default">English-taught</Badge>
          )}
        </div>

        {match && (
          <div className="rounded-lg border border-border-subtle bg-bg-secondary p-2.5 text-xs">
            <div className="flex items-center justify-between">
              <span className="inline-flex items-center gap-1 font-medium text-text-primary">
                <Sparkles className="h-3.5 w-3.5 text-accent-primary" />
                Match Score: <span className="font-mono">{match.matchPercentage}%</span>
              </span>
              <Badge
                variant={
                  match.eligibilityStatus === 'ineligible'
                    ? 'error'
                    : match.eligibilityStatus === 'eligible'
                    ? 'success'
                    : 'warning'
                }
              >
                {match.eligibilityStatus === 'ineligible'
                  ? 'Ineligible'
                  : match.eligibilityStatus === 'eligible'
                  ? 'Eligible'
                  : match.eligibilityStatus === 'likely_eligible'
                  ? 'Likely Eligible'
                  : 'Needs Info'}
              </Badge>
            </div>
            {match.disqualifyingConditions.length > 0 && (
              <p className="mt-1 text-status-error">{match.disqualifyingConditions[0].detail}</p>
            )}
          </div>
        )}
      </div>

      <div className="space-y-3 border-t border-border-subtle pt-3">
        <div className="flex items-center justify-between text-xs">
          <span className="inline-flex items-center gap-1.5 text-text-secondary">
            <Calendar className="h-3.5 w-3.5" />
            {formatDeadlineDisplay(scholarship.applicationDeadline, scholarship.deadlineTimezone)}
          </span>
          {daysLeft !== null && (
            <Badge
              variant={
                deadlineStatus === 'expired'
                  ? 'error'
                  : deadlineStatus === 'closing_soon'
                  ? 'warning'
                  : 'default'
              }
            >
              {daysLeft < 0 ? 'Closed' : daysLeft === 0 ? 'Due today' : `${daysLeft}d left`}
            </Badge>
          )}
        </div>

        <div className="flex items-center gap-2">
          <Link to={`/scholarships/${scholarship.slug}`} className="flex-1">
            <Button className="w-full" size="sm">
              View Details
            </Button>
          </Link>
          <a
            href={scholarship.officialScholarshipUrl}
            target="_blank"
            rel="noopener noreferrer"
            aria-label={`Official portal for ${scholarship.name}`}
          >
            <Button variant="outline" size="sm" title="Official source">
              <ExternalLink className="h-3.5 w-3.5" />
            </Button>
          </a>
        </div>
      </div>
    </Card>
  );
}
