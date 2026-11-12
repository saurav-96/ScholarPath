# ScholarPath Database Schema & Security

SQL migrations live in:

- [0001_initial_schema.sql](../supabase/migrations/0001_initial_schema.sql)
- [0002_rls_policies.sql](../supabase/migrations/0002_rls_policies.sql)

## Normalized Tables (17 Tables)

1. **`public.profiles`**: References `auth.users(id)`, holds student country of origin, intended degree, academic interests, target intake, preferred countries, funding preference, `expected_gpa` (`0.00–4.00`), `english_qualifications` (`jsonb`), and `role` (`student` | `admin`). Protected by `prevent_role_escalation()` trigger and `on_auth_user_created` (`handle_new_user()`).
2. **`public.countries`**: Study destination metadata keyed by 2-letter ISO `code` (official portal link, tuition overview, monthly living cost estimates, verification status).
3. **`public.universities`**: University profiles (`country_code`, city, institution type, official URLs, annual tuition min/max, living estimates, `record_kind`, `verification_status`).
4. **`public.programs`**: Degree programs tied to `universities(id)` with subject area, instruction language, duration, and official program link.
5. **`public.scholarships`**: Core scholarship records referencing `countries(code)` and optionally `universities(id)`.
6. **`public.scholarship_eligibility`**: 1:1 normalized eligibility rules (eligible/excluded nationalities, subjects, `min_gpa_4_scale`, language threshold JSON, required documents, application procedure).
7. **`public.scholarship_benefits`**: 1:1 normalized funding breakdown (`funding_tier`, `tuition_status`, `living_status`, `living_stipend_monthly`, `accommodation_status`, `travel_status`, `insurance_status`, `expenses_not_covered`).
8. **`public.scholarship_sources`**: Official citation URLs, publishers, and verification dates per scholarship.
9. **`public.user_collections`**: Student-created bookmark folders (`name`, `description`, `color`).
10. **`public.saved_scholarships`**: User-scoped scholarship bookmarks + collection reference + private notes.
11. **`public.saved_universities`**: User-scoped university bookmarks + private notes.
12. **`public.applications`**: Personal application tracker entries (`status` enum across 9 stages, deadline, submission date, personal notes).
13. **`public.application_tasks`**: Checklist tasks tied to `applications(id)` (`due_date`, `completed`, `priority`).
14. **`public.documents`**: Document preparation tracker (`category`, `status`, notes, optional `attachment_path` & `attachment_size_bytes <= 5242880`).
15. **`public.calendar_events`**: User-created exam dates and deadline reminders.
16. **`public.correction_reports`**: Student-submitted flags for outdated URLs or deadlines (`open` | `verified_fixed` | `dismissed`).
17. **`public.admin_audit_logs`**: Immutable administrative mutation history (`actor_id`, `action`, `entity_type`, `entity_id`, `payload`).

## Row Level Security (RLS) Summary

- **Public Catalog Read**: `countries`, `universities`, `programs`, non-archived `scholarships`, `scholarship_eligibility`, `scholarship_benefits`, and `scholarship_sources` allow public `SELECT`.
- **Admin-Only Catalog Writes**: All `INSERT`, `UPDATE`, and `DELETE` policies on catalog tables and `admin_audit_logs` require `public.is_admin()`.
- **Strict User Ownership**: `user_collections`, `saved_scholarships`, `saved_universities`, `applications`, `application_tasks`, `documents`, and `calendar_events` enforce `auth.uid() = user_id`.
- **Private Document Storage Bucket**: `student-documents` (private, max 5 MB, PDF/PNG/JPEG) scopes objects to `(storage.foldername(name))[1] = auth.uid()::text`.
