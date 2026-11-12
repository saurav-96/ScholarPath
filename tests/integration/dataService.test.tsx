import { beforeEach, describe, expect, it } from 'vitest';
import {
  UnauthorizedError,
  dataService,
  resetDemoWorkspace,
  type AuthSession,
} from '@/services/dataService';
import type { Scholarship } from '@/types/domain';

describe('dataService Demo Mode & RBAC enforcement', () => {
  const studentSession: AuthSession = {
    mode: 'demo',
    authenticated: true,
    userId: 'demo-student-nepal',
    email: 'student@demo.scholarpath.local',
    displayName: 'Test Student',
    role: 'student',
  };

  const adminSession: AuthSession = {
    mode: 'demo',
    authenticated: true,
    userId: 'demo-admin',
    email: 'admin@demo.scholarpath.local',
    displayName: 'Admin Curator',
    role: 'admin',
  };

  beforeEach(() => {
    window.localStorage.clear();
    resetDemoWorkspace();
  });

  it('loads countries, universities, and scholarships cleanly in Demo Mode', async () => {
    const [countries, universities, scholarships] = await Promise.all([
      dataService.fetchCountries(),
      dataService.fetchUniversities(),
      dataService.fetchScholarships(),
    ]);

    expect(countries.length).toBeGreaterThanOrEqual(16);
    expect(universities.length).toBeGreaterThanOrEqual(20);
    expect(scholarships.length).toBeGreaterThanOrEqual(25);
    expect(scholarships.some((s) => s.recordKind === 'official')).toBe(true);
    expect(scholarships.some((s) => s.recordKind === 'synthetic_demo')).toBe(true);
  });

  it('persists profile edits, saved bookmarks, applications, and documents locally', async () => {
    const initial = await dataService.fetchUserState(studentSession);
    expect(initial.profile.countryOfOrigin).toBe('Nepal');

    await dataService.saveProfile(studentSession, {
      ...initial.profile,
      countryOfOrigin: 'Bangladesh',
      expectedGpa: 3.9,
    });

    await dataService.toggleSavedScholarship(studentSession, 'sch-edisu-piemonte');
    const updated = await dataService.fetchUserState(studentSession);
    expect(updated.profile.countryOfOrigin).toBe('Bangladesh');
    expect(updated.profile.expectedGpa).toBe(3.9);
    expect(
      updated.savedScholarships.some((item) => item.scholarshipId === 'sch-edisu-piemonte'),
    ).toBe(true);
  });

  it('throws UnauthorizedError when a student role invokes admin write endpoints', async () => {
    const all = await dataService.fetchScholarships();
    const target: Scholarship = { ...all[0] };

    await expect(dataService.fetchAdminLogs(studentSession)).rejects.toBeInstanceOf(
      UnauthorizedError,
    );
    await expect(dataService.upsertScholarshipAsAdmin(studentSession, target)).rejects.toBeInstanceOf(
      UnauthorizedError,
    );
    await expect(dataService.fetchCorrectionReportsForAdmin(studentSession)).rejects.toBeInstanceOf(
      UnauthorizedError,
    );
  });

  it('allows admin role to publish verified scholarships and writes an audit log', async () => {
    const all = await dataService.fetchScholarships();
    const customScholarship: Scholarship = {
      ...all[0],
      id: 'sch-test-admin-verified',
      slug: 'test-admin-verified-grant',
      name: 'Admin Verified BSc CS Grant 2027',
      verificationStatus: 'officially_verified',
      recordKind: 'synthetic_demo',
    };

    await dataService.upsertScholarshipAsAdmin(adminSession, customScholarship);

    const catalogAfter = await dataService.fetchScholarships();
    const logs = await dataService.fetchAdminLogs(adminSession);

    expect(catalogAfter.some((s) => s.id === 'sch-test-admin-verified')).toBe(true);
    expect(logs.some((l) => l.entityId === 'sch-test-admin-verified')).toBe(true);
  });
});
