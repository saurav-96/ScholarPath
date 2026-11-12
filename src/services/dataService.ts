import { COUNTRIES_DATA } from '@/data/countries';
import { INITIAL_DEMO_USER_STATE } from '@/data/demoDefaults';
import { SCHOLARSHIPS_DATA } from '@/data/scholarships';
import { UNIVERSITIES_DATA } from '@/data/universities';
import { getAppEnv } from '@/lib/env';
import { generateId } from '@/lib/utils';
import type {
  AdminAuditLog,
  AppUserState,
  CalendarEvent,
  CorrectionReport,
  CountryProfile,
  Scholarship,
  StudentDocument,
  StudentProfile,
  TrackedApplication,
  University,
  UserCollection,
  UserRole,
} from '@/types/domain';
import { getSupabaseClient } from './supabaseClient';

export class UnauthorizedError extends Error {
  constructor(message = 'Administrator role required.') {
    super(message);
    this.name = 'UnauthorizedError';
  }
}

export interface AuthSession {
  mode: 'connected' | 'demo';
  authenticated: boolean;
  userId: string;
  email: string;
  displayName: string;
  role: UserRole;
}

const DEMO_SESSION_KEY = 'scholarpath_demo_session_v1';
const DEMO_STATE_KEY = 'scholarpath_demo_user_state_v1';
const DEMO_ADMIN_CATALOG_KEY = 'scholarpath_demo_admin_catalog_v1';

interface DemoCatalogOverride {
  scholarships: Scholarship[];
  universities: University[];
  countries: CountryProfile[];
  auditLogs: AdminAuditLog[];
  correctionReports: CorrectionReport[];
}

function safeReadStorage<T>(key: string): T | null {
  if (typeof window === 'undefined') return null;
  try {
    const raw = window.localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T) : null;
  } catch {
    return null;
  }
}

function safeWriteStorage<T>(key: string, value: T): void {
  if (typeof window === 'undefined') return;
  try {
    window.localStorage.setItem(key, JSON.stringify(value));
  } catch {
    // Ignore storage quota errors gracefully
  }
}

function getDemoCatalog(): DemoCatalogOverride {
  const stored = safeReadStorage<DemoCatalogOverride>(DEMO_ADMIN_CATALOG_KEY);
  if (stored && Array.isArray(stored.scholarships)) {
    return {
      scholarships: [...stored.scholarships],
      universities: [...(stored.universities ?? UNIVERSITIES_DATA)],
      countries: [...(stored.countries ?? COUNTRIES_DATA)],
      auditLogs: [...(stored.auditLogs ?? [])],
      correctionReports: [...(stored.correctionReports ?? [])],
    };
  }
  return {
    scholarships: structuredClone(SCHOLARSHIPS_DATA),
    universities: structuredClone(UNIVERSITIES_DATA),
    countries: structuredClone(COUNTRIES_DATA),
    auditLogs: [],
    correctionReports: [],
  };
}

function saveDemoCatalog(catalog: DemoCatalogOverride): void {
  safeWriteStorage(DEMO_ADMIN_CATALOG_KEY, catalog);
}

export function getDemoSession(): AuthSession {
  const stored = safeReadStorage<AuthSession>(DEMO_SESSION_KEY);
  if (stored) return stored;
  return {
    mode: 'demo',
    authenticated: true,
    userId: 'demo-student-nepal',
    email: 'student@demo.scholarpath.local',
    displayName: 'Aarav Shrestha (Demo Profile)',
    role: 'student',
  };
}

export function setDemoSession(session: AuthSession): void {
  safeWriteStorage(DEMO_SESSION_KEY, session);
}

export function getDemoUserState(): AppUserState {
  const stored = safeReadStorage<AppUserState>(DEMO_STATE_KEY);
  if (stored && stored.profile) {
    return stored;
  }
  const initial = structuredClone(INITIAL_DEMO_USER_STATE);
  safeWriteStorage(DEMO_STATE_KEY, initial);
  return initial;
}

export function saveDemoUserState(state: AppUserState): void {
  safeWriteStorage(DEMO_STATE_KEY, state);
}

export function resetDemoWorkspace(): AppUserState {
  if (typeof window !== 'undefined') {
    window.localStorage.removeItem(DEMO_STATE_KEY);
    window.localStorage.removeItem(DEMO_ADMIN_CATALOG_KEY);
  }
  return getDemoUserState();
}

export const dataService = {
  isConnectedMode(): boolean {
    return getAppEnv().isSupabaseConfigured;
  },

  async fetchCountries(): Promise<CountryProfile[]> {
    const supabase = getSupabaseClient();
    if (supabase) {
      const { data, error } = await supabase.from('countries').select('*').order('name');
      if (!error && data && data.length > 0) {
        return data.map((row) => ({
          code: row.code,
          slug: row.slug,
          name: row.name,
          region: row.region,
          currencyCode: row.currency_code,
          officialPortalName: row.official_portal_name,
          officialPortalUrl: row.official_portal_url,
          tuitionOverview: row.tuition_overview,
          livingCostMonthlyMin: row.living_cost_monthly_min,
          livingCostMonthlyMax: row.living_cost_monthly_max,
          livingCostCurrency: row.living_cost_currency,
          livingCostNote: row.living_cost_note,
          languageRequirementsNote: row.language_requirements_note,
          admissionRequirementsNote: row.admission_requirements_note,
          applicationPeriodsNote: row.application_periods_note,
          estimateSourceNote: row.estimate_source_note,
          lastVerifiedAt: row.last_verified_at,
          verificationStatus: row.verification_status,
        }));
      }
    }
    return getDemoCatalog().countries;
  },

  async fetchUniversities(): Promise<University[]> {
    const supabase = getSupabaseClient();
    if (supabase) {
      const { data, error } = await supabase
        .from('universities')
        .select('*, programs(*)')
        .order('name');
      if (!error && data && data.length > 0) {
        return data.map((row) => ({
          id: row.id,
          slug: row.slug,
          name: row.name,
          countryCode: row.country_code,
          countryName:
            COUNTRIES_DATA.find((c) => c.code === row.country_code)?.name ?? row.country_code,
          city: row.city,
          institutionType: row.institution_type,
          officialWebsite: row.official_website,
          internationalAdmissionsUrl: row.international_admissions_url,
          instructionLanguages: row.instruction_languages ?? ['English'],
          tuitionMinAnnual: row.tuition_min_annual,
          tuitionMaxAnnual: row.tuition_max_annual,
          tuitionCurrency: row.tuition_currency,
          tuitionNote: row.tuition_note,
          estimatedLivingMonthly: row.estimated_living_monthly,
          livingCurrency: row.living_currency,
          admissionRequirements: row.admission_requirements ?? [],
          englishRequirements: row.english_requirements,
          applicationPeriods: row.application_periods,
          programs: (row.programs ?? []).map((p: Record<string, unknown>) => ({
            id: String(p.id),
            slug: String(p.slug),
            name: String(p.name),
            degreeLevel: String(p.degree_level),
            subjectArea: String(p.subject_area),
            instructionLanguage: String(p.instruction_language),
            durationYears: Number(p.duration_years ?? 3),
            tuitionAnnual: p.tuition_annual !== null ? Number(p.tuition_annual) : null,
            tuitionCurrency: String(p.tuition_currency ?? 'EUR'),
            applicationPeriod: String(p.application_period ?? ''),
            officialUrl: String(p.official_url ?? ''),
          })),
          officialSources: row.official_sources ?? [],
          lastVerifiedAt: row.last_verified_at,
          verificationStatus: row.verification_status,
          recordKind: row.record_kind,
        }));
      }
    }
    return getDemoCatalog().universities;
  },

  async fetchScholarships(): Promise<Scholarship[]> {
    const supabase = getSupabaseClient();
    if (supabase) {
      const { data, error } = await supabase
        .from('scholarships')
        .select('*, scholarship_eligibility(*), scholarship_benefits(*), scholarship_sources(*)')
        .order('name');
      if (!error && data && data.length > 0) {
        return data.map((row) => {
          const elig = row.scholarship_eligibility?.[0] ?? row.scholarship_eligibility ?? {};
          const ben = row.scholarship_benefits?.[0] ?? row.scholarship_benefits ?? {};
          return {
            id: row.id,
            slug: row.slug,
            name: row.name,
            provider: row.provider,
            countryCode: row.country_code,
            countryName:
              COUNTRIES_DATA.find((c) => c.code === row.country_code)?.name ?? row.country_code,
            universityId: row.university_id,
            institutionDisplay: row.institution_display,
            degreeLevel: row.degree_level,
            instructionLanguages: row.instruction_languages ?? ['English'],
            summary: row.summary,
            targetIntake: row.target_intake,
            eligibleNationalities: elig.eligible_nationalities ?? [],
            excludedNationalities: elig.excluded_nationalities ?? [],
            acceptsAllInternational: elig.accepts_all_international ?? true,
            eligibleSubjects: elig.eligible_subjects ?? [],
            minGpa4Scale: elig.min_gpa_4_scale !== null && elig.min_gpa_4_scale !== undefined
              ? Number(elig.min_gpa_4_scale)
              : null,
            minGpaNote: elig.min_gpa_note ?? '',
            languageRequirements: elig.language_requirements ?? { summary: '' },
            academicRequirements: elig.academic_requirements ?? [],
            nationalityRestrictionsNote: elig.nationality_restrictions_note ?? '',
            fundingTier: ben.funding_tier ?? 'partial_tuition',
            tuitionCoverage: {
              status: ben.tuition_status ?? 'not_specified',
              note: ben.tuition_note ?? '',
            },
            livingCoverage: {
              status: ben.living_status ?? 'not_specified',
              amountMonthly: ben.living_stipend_monthly,
              currency: ben.living_currency,
              note: ben.living_note ?? '',
            },
            accommodationCoverage: {
              status: ben.accommodation_status ?? 'not_specified',
              note: ben.accommodation_note ?? '',
            },
            travelCoverage: {
              status: ben.travel_status ?? 'not_specified',
              note: ben.travel_note ?? '',
            },
            insuranceCoverage: {
              status: ben.insurance_status ?? 'not_specified',
              note: ben.insurance_note ?? '',
            },
            expensesNotCovered: ben.expenses_not_covered ?? [],
            applicationFeeAmount: row.application_fee_amount,
            applicationFeeCurrency: row.application_fee_currency,
            applicationFeeNote: row.application_fee_note,
            applicationOpenDate: row.application_open_date,
            applicationDeadline: row.application_deadline,
            deadlineTimezone: row.deadline_timezone,
            deadlineNote: row.deadline_note,
            durationText: row.duration_text,
            requiredDocuments: elig.required_documents ?? [],
            applicationProcedure: elig.application_procedure ?? [],
            officialScholarshipUrl: row.official_scholarship_url,
            officialApplicationUrl: row.official_application_url,
            sourceReference: row.source_reference,
            sources: row.scholarship_sources ?? [],
            lastVerifiedAt: row.last_verified_at,
            verificationStatus: row.verification_status,
            recordKind: row.record_kind,
            isArchived: Boolean(row.is_archived),
          } as Scholarship;
        });
      }
    }
    return getDemoCatalog().scholarships;
  },

  async fetchUserState(session: AuthSession): Promise<AppUserState> {
    const supabase = getSupabaseClient();
    if (supabase && session.mode === 'connected' && session.authenticated) {
      const [
        profileRes,
        collectionsRes,
        savedSchRes,
        savedUniRes,
        appsRes,
        tasksRes,
        docsRes,
        eventsRes,
        reportsRes,
      ] = await Promise.all([
        supabase.from('profiles').select('*').eq('id', session.userId).maybeSingle(),
        supabase.from('user_collections').select('*').eq('user_id', session.userId),
        supabase.from('saved_scholarships').select('*').eq('user_id', session.userId),
        supabase.from('saved_universities').select('*').eq('user_id', session.userId),
        supabase.from('applications').select('*').eq('user_id', session.userId),
        supabase.from('application_tasks').select('*').eq('user_id', session.userId),
        supabase.from('documents').select('*').eq('user_id', session.userId),
        supabase.from('calendar_events').select('*').eq('user_id', session.userId),
        supabase.from('correction_reports').select('*').eq('user_id', session.userId),
      ]);

      const p = profileRes.data;
      const profile: StudentProfile = p
        ? {
            id: p.id,
            displayName: p.display_name || session.displayName,
            email: session.email,
            role: p.role,
            countryOfOrigin: p.country_of_origin,
            educationStatus: p.education_status,
            intendedDegree: p.intended_degree,
            academicInterests: p.academic_interests ?? [],
            preferredLanguage: p.preferred_language,
            targetIntake: p.target_intake,
            preferredCountries: p.preferred_countries ?? [],
            fundingPreference: p.funding_preference,
            maxAnnualBudgetUsd: p.max_annual_budget_usd,
            expectedGpa: p.expected_gpa !== null ? Number(p.expected_gpa) : null,
            gpaScaleNote: p.gpa_scale_note,
            englishQualifications: p.english_qualifications ?? [],
            onboardingCompleted: Boolean(p.onboarding_completed),
            updatedAt: p.updated_at,
          }
        : {
            ...INITIAL_DEMO_USER_STATE.profile,
            id: session.userId,
            email: session.email,
            displayName: session.displayName,
            role: session.role,
            onboardingCompleted: false,
          };

      const tasksByApp = new Map<string, TrackedApplication['tasks']>();
      (tasksRes.data ?? []).forEach((t) => {
        const list = tasksByApp.get(t.application_id) ?? [];
        list.push({
          id: t.id,
          title: t.title,
          dueDate: t.due_date,
          completed: t.completed,
          priority: t.priority,
        });
        tasksByApp.set(t.application_id, list);
      });

      return {
        profile,
        collections: (collectionsRes.data ?? []).map((c) => ({
          id: c.id,
          name: c.name,
          description: c.description,
          color: c.color,
          createdAt: c.created_at,
        })),
        savedScholarships: (savedSchRes.data ?? []).map((s) => ({
          id: s.id,
          scholarshipId: s.scholarship_id,
          collectionId: s.collection_id,
          notes: s.notes,
          savedAt: s.created_at,
        })),
        savedUniversities: (savedUniRes.data ?? []).map((u) => ({
          id: u.id,
          universityId: u.university_id,
          notes: u.notes,
          savedAt: u.created_at,
        })),
        applications: (appsRes.data ?? []).map((a) => ({
          id: a.id,
          scholarshipId: a.scholarship_id,
          universityId: a.university_id,
          customTitle: a.custom_title,
          universityName: a.university_name,
          countryCode: a.country_code ?? 'IT',
          status: a.status,
          deadline: a.deadline,
          submissionDate: a.submission_date,
          personalNotes: a.personal_notes,
          tasks: tasksByApp.get(a.id) ?? [],
          updatedAt: a.updated_at,
        })),
        documents: (docsRes.data ?? []).map((d) => ({
          id: d.id,
          applicationId: d.application_id,
          name: d.name,
          category: d.category,
          status: d.status,
          notes: d.notes,
          attachmentName: d.attachment_path ?? undefined,
          attachmentSizeBytes: d.attachment_size_bytes ?? undefined,
          updatedAt: d.updated_at,
        })),
        calendarEvents: (eventsRes.data ?? []).map((e) => ({
          id: e.id,
          scholarshipId: e.scholarship_id,
          applicationId: e.application_id,
          title: e.title,
          category: e.category,
          eventDate: e.event_date,
          timezone: e.timezone,
          notes: e.notes,
          isUserCreated: true,
        })),
        correctionReports: (reportsRes.data ?? []).map((r) => ({
          id: r.id,
          targetType: r.target_type,
          targetId: r.target_id,
          targetName: r.target_name,
          summary: r.summary,
          suggestedUrl: r.suggested_url,
          status: r.status,
          reviewerNotes: r.reviewer_notes,
          createdAt: r.created_at,
        })),
      };
    }

    return getDemoUserState();
  },

  async saveProfile(session: AuthSession, profile: StudentProfile): Promise<StudentProfile> {
    const updated: StudentProfile = {
      ...profile,
      updatedAt: new Date().toISOString(),
    };
    const supabase = getSupabaseClient();
    if (supabase && session.mode === 'connected' && session.authenticated) {
      const { error } = await supabase.from('profiles').upsert({
        id: session.userId,
        display_name: updated.displayName,
        country_of_origin: updated.countryOfOrigin,
        education_status: updated.educationStatus,
        intended_degree: updated.intendedDegree,
        academic_interests: updated.academicInterests,
        preferred_language: updated.preferredLanguage,
        target_intake: updated.targetIntake,
        preferred_countries: updated.preferredCountries,
        funding_preference: updated.fundingPreference,
        max_annual_budget_usd: updated.maxAnnualBudgetUsd,
        expected_gpa: updated.expectedGpa,
        gpa_scale_note: updated.gpaScaleNote,
        english_qualifications: updated.englishQualifications,
        onboarding_completed: updated.onboardingCompleted,
      });
      if (error) throw new Error(error.message);
      return updated;
    }

    const state = getDemoUserState();
    state.profile = updated;
    saveDemoUserState(state);
    return updated;
  },

  async saveUserState(session: AuthSession, nextState: AppUserState): Promise<AppUserState> {
    if (session.mode === 'demo' || !getSupabaseClient()) {
      saveDemoUserState(nextState);
      return nextState;
    }
    return nextState;
  },

  async toggleSavedScholarship(
    session: AuthSession,
    scholarshipId: string,
    collectionId: string | null = null,
    notes = '',
  ): Promise<AppUserState> {
    const supabase = getSupabaseClient();
    if (supabase && session.mode === 'connected') {
      const { data: existing } = await supabase
        .from('saved_scholarships')
        .select('id')
        .eq('user_id', session.userId)
        .eq('scholarship_id', scholarshipId)
        .maybeSingle();

      if (existing) {
        await supabase.from('saved_scholarships').delete().eq('id', existing.id);
      } else {
        await supabase.from('saved_scholarships').insert({
          user_id: session.userId,
          scholarship_id: scholarshipId,
          collection_id: collectionId,
          notes,
        });
      }
      return this.fetchUserState(session);
    }

    const state = getDemoUserState();
    const idx = state.savedScholarships.findIndex((s) => s.scholarshipId === scholarshipId);
    if (idx >= 0) {
      state.savedScholarships.splice(idx, 1);
    } else {
      state.savedScholarships.unshift({
        id: generateId('saved-sch'),
        scholarshipId,
        collectionId,
        notes,
        savedAt: new Date().toISOString(),
      });
    }
    saveDemoUserState(state);
    return state;
  },

  async updateSavedScholarshipMeta(
    session: AuthSession,
    savedId: string,
    collectionId: string | null,
    notes: string,
  ): Promise<AppUserState> {
    const supabase = getSupabaseClient();
    if (supabase && session.mode === 'connected') {
      await supabase
        .from('saved_scholarships')
        .update({ collection_id: collectionId, notes })
        .eq('id', savedId)
        .eq('user_id', session.userId);
      return this.fetchUserState(session);
    }
    const state = getDemoUserState();
    state.savedScholarships = state.savedScholarships.map((item) =>
      item.id === savedId ? { ...item, collectionId, notes } : item,
    );
    saveDemoUserState(state);
    return state;
  },

  async toggleSavedUniversity(session: AuthSession, universityId: string, notes = ''): Promise<AppUserState> {
    const supabase = getSupabaseClient();
    if (supabase && session.mode === 'connected') {
      const { data: existing } = await supabase
        .from('saved_universities')
        .select('id')
        .eq('user_id', session.userId)
        .eq('university_id', universityId)
        .maybeSingle();

      if (existing) {
        await supabase.from('saved_universities').delete().eq('id', existing.id);
      } else {
        await supabase.from('saved_universities').insert({
          user_id: session.userId,
          university_id: universityId,
          notes,
        });
      }
      return this.fetchUserState(session);
    }
    const state = getDemoUserState();
    const idx = state.savedUniversities.findIndex((u) => u.universityId === universityId);
    if (idx >= 0) {
      state.savedUniversities.splice(idx, 1);
    } else {
      state.savedUniversities.unshift({
        id: generateId('saved-uni'),
        universityId,
        notes,
        savedAt: new Date().toISOString(),
      });
    }
    saveDemoUserState(state);
    return state;
  },

  async createCollection(
    session: AuthSession,
    collection: Omit<UserCollection, 'id' | 'createdAt'>,
  ): Promise<AppUserState> {
    const supabase = getSupabaseClient();
    if (supabase && session.mode === 'connected') {
      await supabase.from('user_collections').insert({
        user_id: session.userId,
        name: collection.name,
        description: collection.description,
        color: collection.color,
      });
      return this.fetchUserState(session);
    }
    const state = getDemoUserState();
    state.collections.unshift({
      ...collection,
      id: generateId('col'),
      createdAt: new Date().toISOString(),
    });
    saveDemoUserState(state);
    return state;
  },

  async upsertApplication(
    session: AuthSession,
    application: TrackedApplication,
  ): Promise<AppUserState> {
    const supabase = getSupabaseClient();
    if (supabase && session.mode === 'connected') {
      const { data: savedApp, error } = await supabase
        .from('applications')
        .upsert({
          id: application.id.startsWith('app-') ? undefined : application.id,
          user_id: session.userId,
          scholarship_id: application.scholarshipId,
          university_id: application.universityId,
          custom_title: application.customTitle,
          university_name: application.universityName,
          country_code: application.countryCode,
          status: application.status,
          deadline: application.deadline,
          submission_date: application.submissionDate,
          personal_notes: application.personalNotes,
        })
        .select()
        .single();
      if (error) throw new Error(error.message);

      if (savedApp && application.tasks.length > 0) {
        await supabase.from('application_tasks').delete().eq('application_id', savedApp.id);
        await supabase.from('application_tasks').insert(
          application.tasks.map((t) => ({
            user_id: session.userId,
            application_id: savedApp.id,
            title: t.title,
            due_date: t.dueDate,
            completed: t.completed,
            priority: t.priority,
          })),
        );
      }
      return this.fetchUserState(session);
    }

    const state = getDemoUserState();
    const exists = state.applications.some((a) => a.id === application.id);
    if (exists) {
      state.applications = state.applications.map((a) =>
        a.id === application.id ? { ...application, updatedAt: new Date().toISOString() } : a,
      );
    } else {
      state.applications.unshift({
        ...application,
        id: application.id || generateId('app'),
        updatedAt: new Date().toISOString(),
      });
    }
    saveDemoUserState(state);
    return state;
  },

  async deleteApplication(session: AuthSession, applicationId: string): Promise<AppUserState> {
    const supabase = getSupabaseClient();
    if (supabase && session.mode === 'connected') {
      await supabase
        .from('applications')
        .delete()
        .eq('id', applicationId)
        .eq('user_id', session.userId);
      return this.fetchUserState(session);
    }
    const state = getDemoUserState();
    state.applications = state.applications.filter((a) => a.id !== applicationId);
    saveDemoUserState(state);
    return state;
  },

  async upsertDocument(session: AuthSession, doc: StudentDocument): Promise<AppUserState> {
    const supabase = getSupabaseClient();
    if (supabase && session.mode === 'connected') {
      await supabase.from('documents').upsert({
        id: doc.id.startsWith('doc-') ? undefined : doc.id,
        user_id: session.userId,
        application_id: doc.applicationId,
        name: doc.name,
        category: doc.category,
        status: doc.status,
        notes: doc.notes,
        attachment_path: doc.attachmentName ?? null,
        attachment_size_bytes: doc.attachmentSizeBytes ?? null,
      });
      return this.fetchUserState(session);
    }
    const state = getDemoUserState();
    const exists = state.documents.some((d) => d.id === doc.id);
    if (exists) {
      state.documents = state.documents.map((d) =>
        d.id === doc.id ? { ...doc, updatedAt: new Date().toISOString() } : d,
      );
    } else {
      state.documents.unshift({
        ...doc,
        id: doc.id || generateId('doc'),
        updatedAt: new Date().toISOString(),
      });
    }
    saveDemoUserState(state);
    return state;
  },

  async deleteDocument(session: AuthSession, documentId: string): Promise<AppUserState> {
    const supabase = getSupabaseClient();
    if (supabase && session.mode === 'connected') {
      await supabase.from('documents').delete().eq('id', documentId).eq('user_id', session.userId);
      return this.fetchUserState(session);
    }
    const state = getDemoUserState();
    state.documents = state.documents.filter((d) => d.id !== documentId);
    saveDemoUserState(state);
    return state;
  },

  async uploadDocumentAttachment(
    session: AuthSession,
    file: File,
  ): Promise<{ path: string; sizeBytes: number }> {
    const allowed = ['application/pdf', 'image/png', 'image/jpeg'];
    if (!allowed.includes(file.type)) {
      throw new Error('Only PDF, PNG, and JPEG files are permitted.');
    }
    if (file.size > 5 * 1024 * 1024) {
      throw new Error('File exceeds 5 MB upload limit.');
    }
    const supabase = getSupabaseClient();
    if (!supabase || session.mode !== 'connected') {
      throw new Error('File storage uploads require Connected Mode (Supabase Storage). Tracking works without file uploads.');
    }
    const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, '_');
    const storagePath = `${session.userId}/${Date.now()}-${safeName}`;
    const { error } = await supabase.storage.from('student-documents').upload(storagePath, file, {
      upsert: false,
      contentType: file.type,
    });
    if (error) throw new Error(error.message);
    return { path: storagePath, sizeBytes: file.size };
  },

  async upsertCalendarEvent(session: AuthSession, event: CalendarEvent): Promise<AppUserState> {
    const supabase = getSupabaseClient();
    if (supabase && session.mode === 'connected') {
      await supabase.from('calendar_events').upsert({
        id: event.id.startsWith('evt-') ? undefined : event.id,
        user_id: session.userId,
        scholarship_id: event.scholarshipId,
        application_id: event.applicationId,
        title: event.title,
        category: event.category,
        event_date: event.eventDate,
        timezone: event.timezone,
        notes: event.notes,
      });
      return this.fetchUserState(session);
    }
    const state = getDemoUserState();
    const exists = state.calendarEvents.some((e) => e.id === event.id);
    if (exists) {
      state.calendarEvents = state.calendarEvents.map((e) => (e.id === event.id ? event : e));
    } else {
      state.calendarEvents.unshift({
        ...event,
        id: event.id || generateId('evt'),
      });
    }
    saveDemoUserState(state);
    return state;
  },

  async deleteCalendarEvent(session: AuthSession, eventId: string): Promise<AppUserState> {
    const supabase = getSupabaseClient();
    if (supabase && session.mode === 'connected') {
      await supabase
        .from('calendar_events')
        .delete()
        .eq('id', eventId)
        .eq('user_id', session.userId);
      return this.fetchUserState(session);
    }
    const state = getDemoUserState();
    state.calendarEvents = state.calendarEvents.filter((e) => e.id !== eventId);
    saveDemoUserState(state);
    return state;
  },

  async submitCorrectionReport(
    session: AuthSession,
    report: Omit<CorrectionReport, 'id' | 'status' | 'reviewerNotes' | 'createdAt'>,
  ): Promise<CorrectionReport> {
    const created: CorrectionReport = {
      ...report,
      id: generateId('corr'),
      status: 'open',
      reviewerNotes: '',
      createdAt: new Date().toISOString(),
    };
    const supabase = getSupabaseClient();
    if (supabase && session.mode === 'connected') {
      const { error } = await supabase.from('correction_reports').insert({
        user_id: session.userId,
        target_type: report.targetType,
        target_id: report.targetId,
        target_name: report.targetName,
        summary: report.summary,
        suggested_url: report.suggestedUrl,
      });
      if (error) throw new Error(error.message);
      return created;
    }

    const catalog = getDemoCatalog();
    catalog.correctionReports.unshift(created);
    saveDemoCatalog(catalog);
    const state = getDemoUserState();
    state.correctionReports.unshift(created);
    saveDemoUserState(state);
    return created;
  },

  // --- ADMIN PROTECTED OPERATIONS ---
  assertAdmin(session: AuthSession): void {
    if (!session.authenticated || session.role !== 'admin') {
      throw new UnauthorizedError('Access denied: Administrator authorization required.');
    }
  },

  async fetchAdminLogs(session: AuthSession): Promise<AdminAuditLog[]> {
    this.assertAdmin(session);
    const supabase = getSupabaseClient();
    if (supabase && session.mode === 'connected') {
      const { data } = await supabase
        .from('admin_audit_logs')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(50);
      return (data ?? []).map((row) => ({
        id: row.id,
        actorEmail: session.email,
        action: row.action,
        entityType: row.entity_type,
        entityId: row.entity_id,
        summary: String(row.payload?.summary ?? row.action),
        createdAt: row.created_at,
      }));
    }
    return getDemoCatalog().auditLogs;
  },

  async fetchCorrectionReportsForAdmin(session: AuthSession): Promise<CorrectionReport[]> {
    this.assertAdmin(session);
    const supabase = getSupabaseClient();
    if (supabase && session.mode === 'connected') {
      const { data } = await supabase
        .from('correction_reports')
        .select('*')
        .order('created_at', { ascending: false });
      return (data ?? []).map((r) => ({
        id: r.id,
        targetType: r.target_type,
        targetId: r.target_id,
        targetName: r.target_name,
        summary: r.summary,
        suggestedUrl: r.suggested_url,
        status: r.status,
        reviewerNotes: r.reviewer_notes,
        createdAt: r.created_at,
      }));
    }
    return getDemoCatalog().correctionReports;
  },

  async upsertScholarshipAsAdmin(
    session: AuthSession,
    scholarship: Scholarship,
  ): Promise<Scholarship> {
    this.assertAdmin(session);
    const supabase = getSupabaseClient();
    if (supabase && session.mode === 'connected') {
      const { data: inserted, error } = await supabase
        .from('scholarships')
        .upsert({
          id: scholarship.id.startsWith('sch-') ? undefined : scholarship.id,
          slug: scholarship.slug,
          name: scholarship.name,
          provider: scholarship.provider,
          country_code: scholarship.countryCode,
          institution_display: scholarship.institutionDisplay,
          degree_level: scholarship.degreeLevel,
          instruction_languages: scholarship.instructionLanguages,
          summary: scholarship.summary,
          target_intake: scholarship.targetIntake,
          application_fee_amount: scholarship.applicationFeeAmount,
          application_fee_currency: scholarship.applicationFeeCurrency,
          application_fee_note: scholarship.applicationFeeNote,
          application_open_date: scholarship.applicationOpenDate,
          application_deadline: scholarship.applicationDeadline,
          deadline_timezone: scholarship.deadlineTimezone,
          deadline_note: scholarship.deadlineNote,
          duration_text: scholarship.durationText,
          official_scholarship_url: scholarship.officialScholarshipUrl,
          official_application_url: scholarship.officialApplicationUrl,
          source_reference: scholarship.sourceReference,
          last_verified_at: scholarship.lastVerifiedAt,
          verification_status: scholarship.verificationStatus,
          record_kind: scholarship.recordKind,
          is_archived: scholarship.isArchived,
        })
        .select()
        .single();
      if (error) throw new Error(error.message);
      const schId = inserted.id;
      await supabase.from('scholarship_eligibility').upsert({
        scholarship_id: schId,
        eligible_nationalities: scholarship.eligibleNationalities,
        excluded_nationalities: scholarship.excludedNationalities,
        accepts_all_international: scholarship.acceptsAllInternational,
        eligible_subjects: scholarship.eligibleSubjects,
        min_gpa_4_scale: scholarship.minGpa4Scale,
        min_gpa_note: scholarship.minGpaNote,
        language_requirements: scholarship.languageRequirements,
        academic_requirements: scholarship.academicRequirements,
        nationality_restrictions_note: scholarship.nationalityRestrictionsNote,
        required_documents: scholarship.requiredDocuments,
        application_procedure: scholarship.applicationProcedure,
      });
      await supabase.from('scholarship_benefits').upsert({
        scholarship_id: schId,
        funding_tier: scholarship.fundingTier,
        tuition_status: scholarship.tuitionCoverage.status,
        tuition_note: scholarship.tuitionCoverage.note,
        living_status: scholarship.livingCoverage.status,
        living_stipend_monthly: scholarship.livingCoverage.amountMonthly ?? null,
        living_currency: scholarship.livingCoverage.currency ?? 'EUR',
        living_note: scholarship.livingCoverage.note,
        accommodation_status: scholarship.accommodationCoverage.status,
        accommodation_note: scholarship.accommodationCoverage.note,
        travel_status: scholarship.travelCoverage.status,
        travel_note: scholarship.travelCoverage.note,
        insurance_status: scholarship.insuranceCoverage.status,
        insurance_note: scholarship.insuranceCoverage.note,
        expenses_not_covered: scholarship.expensesNotCovered,
      });
      await supabase.from('admin_audit_logs').insert({
        actor_id: session.userId,
        action: 'upsert_scholarship',
        entity_type: 'scholarship',
        entity_id: schId,
        payload: { summary: `Saved scholarship ${scholarship.name}` },
      });
      return { ...scholarship, id: schId };
    }

    const catalog = getDemoCatalog();
    const exists = catalog.scholarships.some((s) => s.id === scholarship.id);
    if (exists) {
      catalog.scholarships = catalog.scholarships.map((s) =>
        s.id === scholarship.id ? scholarship : s,
      );
    } else {
      catalog.scholarships = [scholarship, ...catalog.scholarships];
    }
    catalog.auditLogs = [
      {
        id: generateId('log'),
        actorEmail: session.email,
        action: exists ? 'UPDATE_SCHOLARSHIP' : 'CREATE_SCHOLARSHIP',
        entityType: 'scholarship',
        entityId: scholarship.id,
        summary: `${exists ? 'Updated' : 'Created & verified'} ${scholarship.name} (${scholarship.verificationStatus})`,
        createdAt: new Date().toISOString(),
      },
      ...catalog.auditLogs,
    ];
    saveDemoCatalog(catalog);
    return scholarship;
  },

  async importScholarshipsAsAdmin(
    session: AuthSession,
    records: Scholarship[],
  ): Promise<number> {
    this.assertAdmin(session);
    let count = 0;
    for (const record of records) {
      await this.upsertScholarshipAsAdmin(session, record);
      count++;
    }
    return count;
  },

  async upsertUniversityAsAdmin(
    session: AuthSession,
    university: University,
  ): Promise<University> {
    this.assertAdmin(session);
    const supabase = getSupabaseClient();
    if (supabase && session.mode === 'connected') {
      const { data, error } = await supabase
        .from('universities')
        .upsert({
          id: university.id.startsWith('uni-') ? undefined : university.id,
          slug: university.slug,
          name: university.name,
          country_code: university.countryCode,
          city: university.city,
          institution_type: university.institutionType,
          official_website: university.officialWebsite,
          international_admissions_url: university.internationalAdmissionsUrl,
          instruction_languages: university.instructionLanguages,
          tuition_min_annual: university.tuitionMinAnnual,
          tuition_max_annual: university.tuitionMaxAnnual,
          tuition_currency: university.tuitionCurrency,
          tuition_note: university.tuitionNote,
          estimated_living_monthly: university.estimatedLivingMonthly,
          living_currency: university.livingCurrency,
          admission_requirements: university.admissionRequirements,
          english_requirements: university.englishRequirements,
          application_periods: university.applicationPeriods,
          official_sources: university.officialSources,
          last_verified_at: university.lastVerifiedAt,
          verification_status: university.verificationStatus,
          record_kind: university.recordKind,
        })
        .select()
        .single();
      if (error) throw new Error(error.message);
      return { ...university, id: data.id };
    }

    const catalog = getDemoCatalog();
    const exists = catalog.universities.some((u) => u.id === university.id);
    if (exists) {
      catalog.universities = catalog.universities.map((u) =>
        u.id === university.id ? university : u,
      );
    } else {
      catalog.universities.unshift(university);
    }
    catalog.auditLogs.unshift({
      id: generateId('log'),
      actorEmail: session.email,
      action: exists ? 'UPDATE_UNIVERSITY' : 'CREATE_UNIVERSITY',
      entityType: 'university',
      entityId: university.id,
      summary: `${exists ? 'Updated' : 'Added'} university ${university.name}`,
      createdAt: new Date().toISOString(),
    });
    saveDemoCatalog(catalog);
    return university;
  },

  async updateCountryAsAdmin(session: AuthSession, country: CountryProfile): Promise<CountryProfile> {
    this.assertAdmin(session);
    const supabase = getSupabaseClient();
    if (supabase && session.mode === 'connected') {
      const { error } = await supabase.from('countries').upsert({
        code: country.code,
        slug: country.slug,
        name: country.name,
        region: country.region,
        currency_code: country.currencyCode,
        official_portal_name: country.officialPortalName,
        official_portal_url: country.officialPortalUrl,
        tuition_overview: country.tuitionOverview,
        living_cost_monthly_min: country.livingCostMonthlyMin,
        living_cost_monthly_max: country.livingCostMonthlyMax,
        living_cost_currency: country.livingCostCurrency,
        living_cost_note: country.livingCostNote,
        language_requirements_note: country.languageRequirementsNote,
        admission_requirements_note: country.admissionRequirementsNote,
        application_periods_note: country.applicationPeriodsNote,
        estimate_source_note: country.estimateSourceNote,
        last_verified_at: country.lastVerifiedAt,
        verification_status: country.verificationStatus,
      });
      if (error) throw new Error(error.message);
      return country;
    }
    const catalog = getDemoCatalog();
    catalog.countries = catalog.countries.map((c) => (c.code === country.code ? country : c));
    catalog.auditLogs.unshift({
      id: generateId('log'),
      actorEmail: session.email,
      action: 'UPDATE_COUNTRY',
      entityType: 'country',
      entityId: country.code,
      summary: `Updated country ${country.name} (${country.verificationStatus})`,
      createdAt: new Date().toISOString(),
    });
    saveDemoCatalog(catalog);
    return country;
  },

  async resolveCorrectionReport(
    session: AuthSession,
    reportId: string,
    status: CorrectionReport['status'],
    reviewerNotes: string,
  ): Promise<void> {
    this.assertAdmin(session);
    const supabase = getSupabaseClient();
    if (supabase && session.mode === 'connected') {
      await supabase
        .from('correction_reports')
        .update({ status, reviewer_notes: reviewerNotes })
        .eq('id', reportId);
      return;
    }
    const catalog = getDemoCatalog();
    catalog.correctionReports = catalog.correctionReports.map((r) =>
      r.id === reportId ? { ...r, status, reviewerNotes } : r,
    );
    catalog.auditLogs.unshift({
      id: generateId('log'),
      actorEmail: session.email,
      action: 'RESOLVE_CORRECTION',
      entityType: 'correction',
      entityId: reportId,
      summary: `Marked correction report ${reportId} as ${status}`,
      createdAt: new Date().toISOString(),
    });
    saveDemoCatalog(catalog);
  },
};
