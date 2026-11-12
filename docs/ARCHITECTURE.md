# ScholarPath Architecture

## Overview

ScholarPath is a static-compatible React + TypeScript single-page application designed to run seamlessly in two modes:

1. **Demo Mode (Zero-Backend Default)**: Runs without Supabase environment variables using an offline-ready catalog (`src/data/countries.ts`, `src/data/universities.ts`, `src/data/scholarships.ts`) combined with `localStorage` persistence (`scholarpath_demo_session_v1`, `scholarpath_demo_user_state_v1`, `scholarpath_demo_admin_catalog_v1`).
2. **Connected Mode (Supabase PostgreSQL + Auth + Storage)**: Enabled automatically when `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY` are configured at build time (`src/lib/env.ts` & `src/services/supabaseClient.ts`).

All database/storage reads and writes flow through the unified facade `dataService` (`src/services/dataService.ts`), isolating React components and hooks (`src/hooks/useScholarPathData.ts`) from persistence details.

## Routing & GitHub Pages SPA Compatibility

- **Code-split lazy routing**: `src/App.tsx` lazy-loads all feature pages (`LandingPage`, `ScholarshipsPage`, `ScholarshipDetailPage`, `UniversitiesPage`, `UniversityDetailPage`, `UniversityComparePage`, `CountriesPage`, `CountryDetailPage`, `MatcherPage`, `CalculatorPage`, `CalendarPage`, `DashboardPage`, `SavedPage`, `ApplicationsPage`, `DocumentsPage`, `AdminPage`, auth pages).
- **Subpath Compatibility**: `vite.config.ts` honors `VITE_BASE_PATH` (default `/`), and `BrowserRouter` binds `basename` from `getAppEnv().basePath`.
- **Deep Link / Refresh Fallback**: During `vite build`, a custom Rollup `closeBundle` plugin (`githubPagesSpaPlugin` in `vite.config.ts`) copies `dist/index.html` to `dist/404.html` so direct reloads on nested routes such as `/scholarships/padua-international-excellence-scholarship` or `/universities/politecnico-di-torino` resolve cleanly on GitHub Pages.

## Security & Role-Based Access Control (RBAC)

- **Secret Hygiene**: Only the public `VITE_SUPABASE_ANON_KEY` is ever exposed to the frontend bundle. Service-role keys are forbidden in frontend code.
- **Database Enforcement**: `supabase/migrations/0001_initial_schema.sql` attaches `prevent_role_escalation()` trigger to `public.profiles` so non-admins cannot promote themselves. `supabase/migrations/0002_rls_policies.sql` restricts public catalog mutations (`countries`, `universities`, `programs`, `scholarships`, `scholarship_eligibility`, `scholarship_benefits`, `scholarship_sources`), audit logs, and global correction report management to `public.is_admin()`.
- **Service & Route Guards**: UI route `/admin` is wrapped by `<AdminRoute>` (`src/components/auth/RouteGuards.tsx`), which renders an explicit `403 — Administrator Access Required` panel for student roles. Every admin method on `dataService` also calls `assertAdmin(session)` and throws `UnauthorizedError`.
- **Input Validation**: Forms and bulk CSV/JSON imports validate all entries via Zod (`src/schemas/validation.ts`), including `safeUrlSchema` (`http://` and `https://` only) to block `javascript:` or non-HTTP links.

## Explainable Eligibility Matching & Financial Engine

- **Eligibility Matching (`src/lib/matching.ts`)**: Strictly separates **Hard Eligibility Rules** (nationality inclusions/exclusions, degree level alignment, subject area coverage, GPA benchmark, and English proficiency thresholds) from **Soft Preferences** (preferred destination countries, language preference, funding tier alignment, zero application fee). Hard disqualifiers cap match score at `<= 24` and assign `ineligible` status regardless of preference alignment.
- **AI Explanation Adapter (`src/services/aiAdapter.ts`)**: Uses deterministic local profile-to-scholarship narrative generation by default, with optional `VITE_AI_ENDPOINT` integration when a backend proxy/Edge Function is configured.
- **Financial Calculator (`src/lib/finance.ts` & `src/services/fxService.ts`)**: Computes exact annual tuition + 12-month living/accommodation + insurance + travel costs against scholarship waivers/stipends and personal budgets, paired with ECB reference exchange rates (via Frankfurter API) or user-supplied overrides explicitly badged `User-provided rate`.
