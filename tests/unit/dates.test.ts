import { describe, expect, it } from 'vitest';
import { daysUntilDate, formatDeadlineDisplay, getDeadlineStatus } from '@/lib/dates';

describe('date helpers', () => {
  const ref = new Date('2026-11-13T12:00:00Z');

  it('calculates days until deadline accurately', () => {
    expect(daysUntilDate('2026-11-23', ref)).toBe(10);
    expect(daysUntilDate('2026-11-10', ref)).toBe(-3);
    expect(daysUntilDate(null, ref)).toBeNull();
  });

  it('classifies open, closing_soon, upcoming, expired, and rolling deadlines', () => {
    expect(getDeadlineStatus(null, null, ref)).toBe('rolling');
    expect(getDeadlineStatus('2026-11-01', '2026-11-05', ref)).toBe('expired');
    expect(getDeadlineStatus('2026-12-01', '2027-02-01', ref)).toBe('upcoming');
    expect(getDeadlineStatus('2026-10-01', '2026-11-25', ref)).toBe('closing_soon');
    expect(getDeadlineStatus('2026-10-01', '2027-03-01', ref)).toBe('open');
  });

  it('formats ISO deadline dates safely even with unfamiliar timezone fallback', () => {
    expect(formatDeadlineDisplay('2027-01-15', 'Europe/Rome')).toContain('2027');
    expect(formatDeadlineDisplay(null)).toContain('Rolling');
  });
});
