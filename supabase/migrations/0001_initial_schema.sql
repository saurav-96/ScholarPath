-- ScholarPath PostgreSQL Schema Migration 0001
-- Normalized catalog, student planning workspace, verification logs, and audit history.

create extension if not exists "pgcrypto";

-- Custom types
do $$ begin
  create type public.user_role as enum ('student', 'admin');
exception when duplicate_object then null; end $$;

do $$ begin
  create type public.verification_status as enum (
    'officially_verified',
    'needs_reverification',
    'archived',
    'unverified'
  );
exception when duplicate_object then null; end $$;

do $$ begin
  create type public.record_kind as enum ('official', 'synthetic_demo');
exception when duplicate_object then null; end $$;

do $$ begin
  create type public.coverage_status as enum (
    'confirmed',
    'not_covered',
    'not_specified',
    'conditional'
  );
exception when duplicate_object then null; end $$;

do $$ begin
  create type public.funding_tier as enum (
    'fully_funded',
    'full_tuition',
    'partial_tuition',
    'stipend_only',
    'fee_waiver_conditional'
  );
exception when duplicate_object then null; end $$;

do $$ begin
  create type public.application_status as enum (
    'interested',
    'researching',
    'preparing_documents',
    'ready_to_apply',
    'submitted',
    'interview',
    'accepted',
    'rejected',
    'withdrawn'
  );
exception when duplicate_object then null; end $$;

do $$ begin
  create type public.document_status as enum (
    'not_started',
    'in_progress',
    'ready',
    'verified'
  );
exception when duplicate_object then null; end $$;

-- Timestamp trigger helper
create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = timezone('utc', now());
  return new;
end;
$$;

-- 1. Profiles
create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  display_name text not null default '',
  role public.user_role not null default 'student',
  country_of_origin text not null default 'Nepal',
  education_status text not null default 'Final year secondary school / High school graduate',
  intended_degree text not null default 'Bachelor''s',
  academic_interests text[] not null default array['Computer Science', 'Artificial Intelligence', 'Software Engineering', 'Data Science'],
  preferred_language text not null default 'English',
  target_intake text not null default '2027',
  preferred_countries text[] not null default array['IT', 'BE', 'NL', 'NO', 'DK', 'DE'],
  funding_preference text not null default 'full_tuition_and_living',
  max_annual_budget_usd integer,
  expected_gpa numeric(3,2) check (expected_gpa is null or (expected_gpa >= 0 and expected_gpa <= 4.00)),
  gpa_scale_note text not null default '4.0 scale',
  english_qualifications jsonb not null default '[]'::jsonb,
  onboarding_completed boolean not null default false,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

-- Prevent non-admins from escalating their own role via direct UPDATE
create or replace function public.prevent_role_escalation()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if new.role is distinct from old.role then
    if not exists (
      select 1 from public.profiles p where p.id = auth.uid() and p.role = 'admin'
    ) then
      raise exception 'Only administrators can change user roles.';
    end if;
  end if;
  return new;
end;
$$;

drop trigger if exists trg_profiles_updated_at on public.profiles;
create trigger trg_profiles_updated_at
  before update on public.profiles
  for each row execute function public.set_updated_at();

drop trigger if exists trg_profiles_role_guard on public.profiles;
create trigger trg_profiles_role_guard
  before update on public.profiles
  for each row execute function public.prevent_role_escalation();

-- 2. Countries
create table if not exists public.countries (
  code text primary key check (char_length(code) = 2),
  slug text not null unique,
  name text not null,
  region text not null,
  currency_code text not null,
  official_portal_name text not null,
  official_portal_url text not null,
  tuition_overview text not null,
  living_cost_monthly_min integer,
  living_cost_monthly_max integer,
  living_cost_currency text not null default 'EUR',
  living_cost_note text not null,
  language_requirements_note text not null,
  admission_requirements_note text not null,
  application_periods_note text not null,
  estimate_source_note text not null,
  last_verified_at date not null,
  verification_status public.verification_status not null default 'officially_verified',
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

drop trigger if exists trg_countries_updated_at on public.countries;
create trigger trg_countries_updated_at
  before update on public.countries
  for each row execute function public.set_updated_at();

-- 3. Universities
create table if not exists public.universities (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique,
  name text not null,
  country_code text not null references public.countries(code) on delete restrict,
  city text not null,
  institution_type text not null default 'Public',
  official_website text not null,
  international_admissions_url text not null,
  instruction_languages text[] not null default array['English'],
  tuition_min_annual numeric(12,2),
  tuition_max_annual numeric(12,2),
  tuition_currency text not null default 'EUR',
  tuition_note text not null,
  estimated_living_monthly numeric(10,2),
  living_currency text not null default 'EUR',
  admission_requirements text[] not null default '{}',
  english_requirements text not null,
  application_periods text not null,
  official_sources jsonb not null default '[]'::jsonb,
  last_verified_at date not null,
  verification_status public.verification_status not null default 'officially_verified',
  record_kind public.record_kind not null default 'official',
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create index if not exists idx_universities_country on public.universities(country_code);
create index if not exists idx_universities_verification on public.universities(verification_status);

drop trigger if exists trg_universities_updated_at on public.universities;
create trigger trg_universities_updated_at
  before update on public.universities
  for each row execute function public.set_updated_at();

-- 4. Programs
create table if not exists public.programs (
  id uuid primary key default gen_random_uuid(),
  university_id uuid not null references public.universities(id) on delete cascade,
  slug text not null,
  name text not null,
  degree_level text not null default 'Bachelor''s',
  subject_area text not null,
  instruction_language text not null default 'English',
  duration_years numeric(3,1) not null default 3.0,
  tuition_annual numeric(12,2),
  tuition_currency text not null default 'EUR',
  application_period text not null default '',
  official_url text not null,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  unique (university_id, slug)
);

create index if not exists idx_programs_university on public.programs(university_id);

drop trigger if exists trg_programs_updated_at on public.programs;
create trigger trg_programs_updated_at
  before update on public.programs
  for each row execute function public.set_updated_at();

-- 5. Scholarships
create table if not exists public.scholarships (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique,
  name text not null,
  provider text not null,
  country_code text not null references public.countries(code) on delete restrict,
  university_id uuid references public.universities(id) on delete set null,
  institution_display text not null,
  degree_level text not null default 'Bachelor''s',
  instruction_languages text[] not null default array['English'],
  summary text not null,
  target_intake text not null default '2027',
  application_fee_amount numeric(10,2),
  application_fee_currency text not null default 'EUR',
  application_fee_note text not null default '',
  application_open_date date,
  application_deadline date,
  deadline_timezone text not null default 'UTC',
  deadline_note text not null default '',
  duration_text text not null,
  official_scholarship_url text not null,
  official_application_url text not null,
  source_reference text not null,
  last_verified_at date not null,
  verification_status public.verification_status not null default 'officially_verified',
  record_kind public.record_kind not null default 'official',
  is_archived boolean not null default false,
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create index if not exists idx_scholarships_country on public.scholarships(country_code);
create index if not exists idx_scholarships_university on public.scholarships(university_id);
create index if not exists idx_scholarships_deadline on public.scholarships(application_deadline);
create index if not exists idx_scholarships_status on public.scholarships(verification_status, is_archived);

drop trigger if exists trg_scholarships_updated_at on public.scholarships;
create trigger trg_scholarships_updated_at
  before update on public.scholarships
  for each row execute function public.set_updated_at();

-- 6. Scholarship Eligibility
create table if not exists public.scholarship_eligibility (
  scholarship_id uuid primary key references public.scholarships(id) on delete cascade,
  eligible_nationalities text[] not null default '{}',
  excluded_nationalities text[] not null default '{}',
  accepts_all_international boolean not null default true,
  eligible_subjects text[] not null default '{}',
  min_gpa_4_scale numeric(3,2),
  min_gpa_note text not null default 'Not specified as a fixed numerical cutoff',
  language_requirements jsonb not null default '{}'::jsonb,
  academic_requirements text[] not null default '{}',
  nationality_restrictions_note text not null default '',
  required_documents text[] not null default '{}',
  application_procedure text[] not null default '{}'
);

-- 7. Scholarship Benefits
create table if not exists public.scholarship_benefits (
  scholarship_id uuid primary key references public.scholarships(id) on delete cascade,
  funding_tier public.funding_tier not null,
  tuition_status public.coverage_status not null default 'not_specified',
  tuition_note text not null default '',
  living_status public.coverage_status not null default 'not_specified',
  living_stipend_monthly numeric(10,2),
  living_currency text not null default 'EUR',
  living_note text not null default '',
  accommodation_status public.coverage_status not null default 'not_specified',
  accommodation_note text not null default '',
  travel_status public.coverage_status not null default 'not_specified',
  travel_note text not null default '',
  insurance_status public.coverage_status not null default 'not_specified',
  insurance_note text not null default '',
  expenses_not_covered text[] not null default '{}'
);

-- 8. Scholarship Sources
create table if not exists public.scholarship_sources (
  id uuid primary key default gen_random_uuid(),
  scholarship_id uuid not null references public.scholarships(id) on delete cascade,
  title text not null,
  url text not null,
  publisher text not null,
  verified_at date not null,
  notes text not null default ''
);

create index if not exists idx_scholarship_sources_scholarship on public.scholarship_sources(scholarship_id);

-- 9. User Collections
create table if not exists public.user_collections (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  name text not null,
  description text not null default '',
  color text not null default '#8B7CFF',
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create index if not exists idx_user_collections_user on public.user_collections(user_id);

drop trigger if exists trg_user_collections_updated_at on public.user_collections;
create trigger trg_user_collections_updated_at
  before update on public.user_collections
  for each row execute function public.set_updated_at();

-- 10. Saved Scholarships
create table if not exists public.saved_scholarships (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  scholarship_id uuid not null references public.scholarships(id) on delete cascade,
  collection_id uuid references public.user_collections(id) on delete set null,
  notes text not null default '',
  created_at timestamptz not null default timezone('utc', now()),
  unique (user_id, scholarship_id)
);

create index if not exists idx_saved_scholarships_user on public.saved_scholarships(user_id);

-- 11. Saved Universities
create table if not exists public.saved_universities (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  university_id uuid not null references public.universities(id) on delete cascade,
  notes text not null default '',
  created_at timestamptz not null default timezone('utc', now()),
  unique (user_id, university_id)
);

create index if not exists idx_saved_universities_user on public.saved_universities(user_id);

-- 12. Applications
create table if not exists public.applications (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  scholarship_id uuid references public.scholarships(id) on delete set null,
  university_id uuid references public.universities(id) on delete set null,
  custom_title text not null,
  university_name text not null default '',
  country_code text references public.countries(code) on delete set null,
  status public.application_status not null default 'interested',
  deadline date,
  submission_date date,
  personal_notes text not null default '',
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create index if not exists idx_applications_user on public.applications(user_id);

drop trigger if exists trg_applications_updated_at on public.applications;
create trigger trg_applications_updated_at
  before update on public.applications
  for each row execute function public.set_updated_at();

-- 13. Application Tasks
create table if not exists public.application_tasks (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  application_id uuid not null references public.applications(id) on delete cascade,
  title text not null,
  due_date date,
  completed boolean not null default false,
  priority text not null default 'medium',
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create index if not exists idx_application_tasks_app on public.application_tasks(application_id);
create index if not exists idx_application_tasks_user on public.application_tasks(user_id);

drop trigger if exists trg_application_tasks_updated_at on public.application_tasks;
create trigger trg_application_tasks_updated_at
  before update on public.application_tasks
  for each row execute function public.set_updated_at();

-- 14. Documents
create table if not exists public.documents (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  application_id uuid references public.applications(id) on delete set null,
  name text not null,
  category text not null,
  status public.document_status not null default 'not_started',
  notes text not null default '',
  attachment_path text,
  attachment_size_bytes integer check (attachment_size_bytes is null or (attachment_size_bytes > 0 and attachment_size_bytes <= 5242880)),
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create index if not exists idx_documents_user on public.documents(user_id);

drop trigger if exists trg_documents_updated_at on public.documents;
create trigger trg_documents_updated_at
  before update on public.documents
  for each row execute function public.set_updated_at();

-- 15. Calendar Events
create table if not exists public.calendar_events (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  scholarship_id uuid references public.scholarships(id) on delete set null,
  application_id uuid references public.applications(id) on delete set null,
  title text not null,
  category text not null default 'personal_reminder',
  event_date date not null,
  timezone text not null default 'UTC',
  notes text not null default '',
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create index if not exists idx_calendar_events_user on public.calendar_events(user_id);

drop trigger if exists trg_calendar_events_updated_at on public.calendar_events;
create trigger trg_calendar_events_updated_at
  before update on public.calendar_events
  for each row execute function public.set_updated_at();

-- 16. Correction Reports
create table if not exists public.correction_reports (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete set null,
  target_type text not null check (target_type in ('scholarship', 'university', 'country')),
  target_id text not null,
  target_name text not null,
  summary text not null,
  suggested_url text not null default '',
  status text not null default 'open' check (status in ('open', 'verified_fixed', 'dismissed')),
  reviewer_notes text not null default '',
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

drop trigger if exists trg_correction_reports_updated_at on public.correction_reports;
create trigger trg_correction_reports_updated_at
  before update on public.correction_reports
  for each row execute function public.set_updated_at();

-- 17. Admin Audit Logs
create table if not exists public.admin_audit_logs (
  id uuid primary key default gen_random_uuid(),
  actor_id uuid references auth.users(id) on delete set null,
  action text not null,
  entity_type text not null,
  entity_id text not null,
  payload jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default timezone('utc', now())
);

create index if not exists idx_admin_audit_logs_created_at on public.admin_audit_logs(created_at desc);

-- Auto-create student profile row when a new auth user signs up
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, display_name)
  values (
    new.id,
    coalesce(new.raw_user_meta_data ->> 'display_name', split_part(new.email, '@', 1))
  )
  on conflict (id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();
