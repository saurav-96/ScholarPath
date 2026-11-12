# ScholarPath — Project Status & Engineering Log

Last Updated: 2026-11-13
Status: Application Complete & Verified — Deploying to GitHub Pages

## 1. Environment Inspection Results
- **Workspace**: ScholarPath project root
- **Node.js**: `v26.13.0`
- **npm**: `11.20.0` (invoked via `npm.cmd` / `npx.cmd` in PowerShell under `Restricted` execution policy)
- **Git**: `2.56.1.windows.1` (configured locally)
- **GitHub CLI (`gh`)**: `2.103.3` installed and authenticated (`github.com`)
- **Local Browser**: System Google Chrome used by local Playwright runs (`channel: 'chrome'`)
- **Supabase CLI**: Not installed locally (SQL migrations versioned in `supabase/migrations/` for manual/CLI application)

## 2. Completed Modules & Architecture
- **Design System & Shell**: Dark/light theme persistence, Linear/Stripe-inspired surface/accent palette (`#080B14`, `#101626`, `#151E30`, `#8B7CFF`, `#42D6C8`), responsive navbar/drawer, footer, accessible UI primitives, Toast notifications, ErrorBoundary.
- **Module A — Landing Page**: Hero search bar, dynamic catalog stats, featured verified scholarships, study destinations grid, coverage clarity breakdown, FAQ accordion.
- **Module B — Authentication & 7-Step Onboarding**: Sign up, login, password recovery, Demo Student & Admin Sandbox sessions, protected routes, 7-step onboarding flow, editable profile + independent test score management (`IELTS`, `TOEFL`, `PTE`, `Duolingo`, `SAT`, `Other`).
- **Module C & D — Scholarship Discovery & Details**: 27 seeded catalog records (`25` official sourced + `2` explicitly badged `[DEMO EXAMPLE]` synthetic entries), simultaneous filters, sorting, pagination, detailed 5-category coverage breakdown (`Tuition`, `Living`, `Accommodation`, `Travel`, `Insurance`), source/verification audit, correction reporting.
- **Module E — University Discovery & Side-by-Side Comparison**: 23 universities across 16 countries, comparison matrix (up to 4 institutions) with deep-link URL sync.
- **Module F, G & H — Dashboard, Eligibility Matcher & Saved Workspace**: Hard vs soft eligibility matcher scoring, saved scholarships, custom user collections.
- **Module I, J, K, L & M — Tracker, Docs, Countries, Financial Calculator & Calendar**: 9-stage personal application tracker + tasks, 11-category document vault + readiness tracker, 16 country guides, Recharts financial planner + Frankfurter ECB FX converter + manual override, dual-timezone calendar + custom events.
- **Dual-Mode Persistence & RBAC**: Supabase PostgreSQL/Auth/Storage schema & RLS (`supabase/migrations/0001_initial_schema.sql`, `0002_rls_policies.sql`) + zero-backend localStorage Demo Mode via `dataService`, protected by `<AdminRoute>` and runtime `assertAdmin`.
- **Admin CMS**: Role-gated 6-tab management console (Scholarships CRUD/Verify/Archive, Universities, Countries, CSV/JSON dry-run & commit importer, Quality & Reports queue, Audit Logs).

## 3. Verified Quality & Test Results (2026-11-13)
- `npm.cmd run typecheck`: Passed (0 errors)
- `npm.cmd run lint -- --max-warnings 0`: Passed (0 errors, 0 warnings)
- `npm.cmd test`: **8 passed (8)** test files, **29 passed (29)** tests
- `npm.cmd run build`: Passed (root `/` and verified subpath `VITE_BASE_PATH=/ScholarPath/` with `dist/404.html` SPA fallback)
- `npm.cmd run test:e2e`: **14 passed** (Journeys 1–7 across desktop `chromium` and `mobile` Pixel 7)
- Headless Chromium visual & DOM verification across desktop (`1440×900` & `1280×720`) and mobile (`390×844`): **0px horizontal overflow, 0 console errors, 0 page errors**

## 4. Resolved Defects During Verification
1. **Demo catalog reference mutation bug**: Fixed `getDemoCatalog()` and `upsertScholarshipAsAdmin()` in [dataService.ts](src/services/dataService.ts) to clone seeded arrays and apply immutable updates so Admin-created scholarships immediately recompute memoized tables/filters.
2. **Duplicate desktop/mobile filter inputs**: Updated [ScholarshipsPage.tsx](src/pages/ScholarshipsPage.tsx) to mount only one filter control tree matching viewport breakpoint.
3. **Async deep-link comparison initialization**: Updated [UniversityComparePage.tsx](src/pages/UniversityComparePage.tsx) to derive selected university IDs reactively from URL search params after catalog resolution rather than freezing initial empty loading state.
4. **Navbar 1280px collision & hero grid overflow**: Updated [Navbar.tsx](src/components/layout/Navbar.tsx), [AppShell.tsx](src/components/layout/AppShell.tsx), [Primitives.tsx](src/components/ui/Primitives.tsx), and [ScholarshipCard.tsx](src/components/scholarship/ScholarshipCard.tsx) for clean `1280px` admin spacing and `0px` horizontal overflow on mobile.
5. **Unsolicited CORS console errors on offline `/calculator` load**: Initialized [CalculatorPage.tsx](src/pages/CalculatorPage.tsx) cleanly with the verified fallback snapshot and wired ECB Frankfurter fetch ([fxService.ts](src/services/fxService.ts)) to explicit user-triggered refresh.

## 5. Deployment & Optional Backend Setup
- **GitHub Repository & Pages Deployment**: Repository published on `main` and deployed via [.github/workflows/deploy.yml](.github/workflows/deploy.yml) (with `VITE_BASE_PATH=/ScholarPath/` and `dist/404.html` SPA fallback).
- **Supabase Connected Mode (Optional)**: Configure `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY` (via local `.env` or GitHub Actions repository variables) and run SQL migrations in `supabase/migrations/`.
