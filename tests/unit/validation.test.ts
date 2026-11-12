import { describe, expect, it } from 'vitest';
import { DEFAULT_DEMO_PROFILE } from '@/data/demoDefaults';
import { safeUrlSchema, signupSchema, studentProfileSchema } from '@/schemas/validation';

describe('Zod domain validation schemas', () => {
  it('validates default demo student profile cleanly', () => {
    const parsed = studentProfileSchema.safeParse(DEFAULT_DEMO_PROFILE);
    expect(parsed.success).toBe(true);
  });

  it('rejects GPA outside 0.0 to 4.0 bounds', () => {
    const invalid = studentProfileSchema.safeParse({
      ...DEFAULT_DEMO_PROFILE,
      expectedGpa: 4.5,
    });
    expect(invalid.success).toBe(false);
  });

  it('enforces safe http/https URLs only', () => {
    expect(safeUrlSchema.safeParse('https://www.unibo.it/en').success).toBe(true);
    expect(safeUrlSchema.safeParse('javascript:alert(1)').success).toBe(false);
    expect(safeUrlSchema.safeParse('ftp://example.com').success).toBe(false);
  });

  it('verifies password confirmation matches on signup', () => {
    const mismatch = signupSchema.safeParse({
      displayName: 'Test Student',
      email: 'student@example.com',
      password: 'StrongPassword123!',
      confirmPassword: 'DifferentPassword!',
    });
    expect(mismatch.success).toBe(false);
  });
});
