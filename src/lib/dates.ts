export type DeadlineStatus = 'open' | 'upcoming' | 'closing_soon' | 'expired' | 'rolling';

export function parseIsoDate(dateStr: string | null | undefined): Date | null {
  if (!dateStr) return null;
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(dateStr.trim());
  if (!match) {
    const fallback = new Date(dateStr);
    return Number.isNaN(fallback.getTime()) ? null : fallback;
  }
  const year = Number(match[1]);
  const month = Number(match[2]) - 1;
  const day = Number(match[3]);
  return new Date(Date.UTC(year, month, day, 23, 59, 59));
}

export function daysUntilDate(
  targetDateStr: string | null | undefined,
  referenceDate: Date = new Date(),
): number | null {
  const target = parseIsoDate(targetDateStr);
  if (!target) return null;
  const refUtc = Date.UTC(
    referenceDate.getUTCFullYear(),
    referenceDate.getUTCMonth(),
    referenceDate.getUTCDate(),
  );
  const targetUtc = Date.UTC(
    target.getUTCFullYear(),
    target.getUTCMonth(),
    target.getUTCDate(),
  );
  return Math.round((targetUtc - refUtc) / (1000 * 60 * 60 * 24));
}

export function getDeadlineStatus(
  openDateStr: string | null | undefined,
  deadlineStr: string | null | undefined,
  referenceDate: Date = new Date(),
): DeadlineStatus {
  if (!deadlineStr) return 'rolling';

  const daysLeft = daysUntilDate(deadlineStr, referenceDate);
  if (daysLeft === null) return 'rolling';
  if (daysLeft < 0) return 'expired';

  if (openDateStr) {
    const daysUntilOpen = daysUntilDate(openDateStr, referenceDate);
    if (daysUntilOpen !== null && daysUntilOpen > 0) {
      return 'upcoming';
    }
  }

  if (daysLeft <= 30) return 'closing_soon';
  return 'open';
}

export function formatDeadlineDisplay(
  dateStr: string | null | undefined,
  timezone = 'UTC',
): string {
  const parsed = parseIsoDate(dateStr);
  if (!parsed) return 'Rolling / Check official call';
  try {
    return new Intl.DateTimeFormat('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      timeZone: timezone || 'UTC',
    }).format(parsed);
  } catch {
    return dateStr ?? 'Rolling / Check official call';
  }
}

export function getUserTimezone(): string {
  try {
    return Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC';
  } catch {
    return 'UTC';
  }
}

export function formatEventInTimezone(dateStr: string, timezone: string): string {
  const parsed = parseIsoDate(dateStr);
  if (!parsed) return dateStr;
  try {
    return new Intl.DateTimeFormat('en-US', {
      weekday: 'short',
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      timeZone: timezone,
    }).format(parsed);
  } catch {
    return dateStr;
  }
}
