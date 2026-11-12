-- ScholarPath Row Level Security Policies Migration 0002
-- Enforces strict tenant isolation for user records and admin-only mutations for shared catalog records.

create or replace function public.is_admin()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.profiles
    where id = auth.uid()
      and role = 'admin'
  );
$$;

-- Enable RLS across all tables
alter table public.profiles enable row level security;
alter table public.countries enable row level security;
alter table public.universities enable row level security;
alter table public.programs enable row level security;
alter table public.scholarships enable row level security;
alter table public.scholarship_eligibility enable row level security;
alter table public.scholarship_benefits enable row level security;
alter table public.scholarship_sources enable row level security;
alter table public.user_collections enable row level security;
alter table public.saved_scholarships enable row level security;
alter table public.saved_universities enable row level security;
alter table public.applications enable row level security;
alter table public.application_tasks enable row level security;
alter table public.documents enable row level security;
alter table public.calendar_events enable row level security;
alter table public.correction_reports enable row level security;
alter table public.admin_audit_logs enable row level security;

-- Profiles: users read/update own profile; admins can read all
create policy "profiles_select_own_or_admin"
  on public.profiles for select
  using (auth.uid() = id or public.is_admin());

create policy "profiles_insert_own"
  on public.profiles for insert
  with check (auth.uid() = id and role = 'student');

create policy "profiles_update_own"
  on public.profiles for update
  using (auth.uid() = id or public.is_admin())
  with check (auth.uid() = id or public.is_admin());

-- Public read-only catalog policies, admin-only write policies
create policy "countries_public_select"
  on public.countries for select
  using (true);

create policy "countries_admin_all"
  on public.countries for all
  using (public.is_admin())
  with check (public.is_admin());

create policy "universities_public_select"
  on public.universities for select
  using (true);

create policy "universities_admin_all"
  on public.universities for all
  using (public.is_admin())
  with check (public.is_admin());

create policy "programs_public_select"
  on public.programs for select
  using (true);

create policy "programs_admin_all"
  on public.programs for all
  using (public.is_admin())
  with check (public.is_admin());

create policy "scholarships_public_select"
  on public.scholarships for select
  using (is_archived = false or public.is_admin());

create policy "scholarships_admin_all"
  on public.scholarships for all
  using (public.is_admin())
  with check (public.is_admin());

create policy "scholarship_eligibility_public_select"
  on public.scholarship_eligibility for select
  using (true);

create policy "scholarship_eligibility_admin_all"
  on public.scholarship_eligibility for all
  using (public.is_admin())
  with check (public.is_admin());

create policy "scholarship_benefits_public_select"
  on public.scholarship_benefits for select
  using (true);

create policy "scholarship_benefits_admin_all"
  on public.scholarship_benefits for all
  using (public.is_admin())
  with check (public.is_admin());

create policy "scholarship_sources_public_select"
  on public.scholarship_sources for select
  using (true);

create policy "scholarship_sources_admin_all"
  on public.scholarship_sources for all
  using (public.is_admin())
  with check (public.is_admin());

-- User-owned private planning resources
create policy "user_collections_owner"
  on public.user_collections for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create policy "saved_scholarships_owner"
  on public.saved_scholarships for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create policy "saved_universities_owner"
  on public.saved_universities for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create policy "applications_owner"
  on public.applications for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create policy "application_tasks_owner"
  on public.application_tasks for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create policy "documents_owner"
  on public.documents for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create policy "calendar_events_owner"
  on public.calendar_events for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

-- Correction reports: authenticated users can submit and view their own; admins manage all
create policy "correction_reports_select"
  on public.correction_reports for select
  using (auth.uid() = user_id or public.is_admin());

create policy "correction_reports_insert"
  on public.correction_reports for insert
  with check (auth.uid() = user_id);

create policy "correction_reports_admin_update"
  on public.correction_reports for update
  using (public.is_admin())
  with check (public.is_admin());

create policy "correction_reports_admin_delete"
  on public.correction_reports for delete
  using (public.is_admin());

-- Audit logs: admin read/insert only
create policy "admin_audit_logs_select"
  on public.admin_audit_logs for select
  using (public.is_admin());

create policy "admin_audit_logs_insert"
  on public.admin_audit_logs for insert
  with check (public.is_admin());

-- Optional Storage bucket for document attachments (if enabled)
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'student-documents',
  'student-documents',
  false,
  5242880,
  array['application/pdf', 'image/png', 'image/jpeg']
)
on conflict (id) do nothing;

create policy "student_docs_select_own"
  on storage.objects for select
  using (bucket_id = 'student-documents' and (storage.foldername(name))[1] = auth.uid()::text);

create policy "student_docs_insert_own"
  on storage.objects for insert
  with check (bucket_id = 'student-documents' and (storage.foldername(name))[1] = auth.uid()::text);

create policy "student_docs_delete_own"
  on storage.objects for delete
  using (bucket_id = 'student-documents' and (storage.foldername(name))[1] = auth.uid()::text);
