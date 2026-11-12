# ScholarPath — Testing & Quality Verification Guide

## 1. Automated Verification Stack

ScholarPath runs static typechecking, strict ESLint checks, unit/integration tests via **Vitest + React Testing Library**, production static bundle verification, and multi-viewport **Playwright** end-to-end tests.

| Layer | Tooling | Scope | Command |
| :--- | :--- | :--- | :--- |
| Type Safety | TypeScript (`tsc -b --force`) | Strict compiler verification across `src/` & `tests/` | `npm run typecheck` |
| Static Analysis | ESLint (`eslint src tests --max-warnings 0`) | React hooks rules, TypeScript rules, zero warnings | `npm run lint -- --max-warnings 0` |
| Unit & Integration | Vitest + React Testing Library (`jsdom`) | Matching logic, filters, finance math, dates, CSV/JSON importer, Zod schemas, Dual-Mode `dataService`, routing/RBAC guards | `npm test` |
| Production Bundle | Vite 5 + GitHub Pages SPA Plugin | Root `/` build, `VITE_BASE_PATH` subpath build, `dist/404.html` fallback | `npm run build` |
| End-to-End (Desktop & Mobile) | Playwright (`chromium` 1280×720 + `mobile` Pixel 7) | 7 complete user & admin journeys across 14 browser runs | `npm run test:e2e` |

## 2. Unit & Integration Test Suites (`tests/`)

### Unit Suites (`tests/unit/`)
- [matching.test.ts](../tests/unit/matching.test.ts) — Verifies hard eligibility rules (nationality exclusions, GPA cutoffs, IELTS proficiency checks) remain separated from soft preferences and cap ineligible scores (`<= 24`), plus independent score qualification evaluation (`IELTS`, `TOEFL`, `PTE`, `Duolingo`, `SAT`, `Other`).
- [finance.test.ts](../tests/unit/finance.test.ts) — Verifies tuition cap calculations, surplus vs unfunded gap computation, monthly out-of-pocket budget estimates, and multi-currency USD pivot conversions.
- [filters.test.ts](../tests/unit/filters.test.ts) — Verifies simultaneous filtering (`country`, `noApplicationFee`, `fullyFunded`, `acceptsInternational`, `hideSyntheticDemo`, query text) and sorting options (`deadline`, `funding_coverage`).
- [dates.test.ts](../tests/unit/dates.test.ts) — Verifies rolling deadline handling, overdue vs urgent windows, dual local + source timezone formatting, and zero `Invalid Date` / `NaN` outputs.
- [importer.test.ts](../tests/unit/importer.test.ts) — Verifies quoted CSV header/row parsing, duplicate detection against existing slugs/names, and `javascript:` URL rejection.
- [validation.test.ts](../tests/unit/validation.test.ts) — Verifies Zod validation for student profiles, GPA bounds (`0–4.0`), `safeUrlSchema`, and correction reports.

### Integration Suites (`tests/integration/`)
- [dataService.test.tsx](../tests/integration/dataService.test.tsx) — Verifies Demo Mode initialization, persistence (`localStorage`), and runtime `UnauthorizedError` blocking on student calls to admin mutations (`upsertScholarshipAsAdmin`, `resolveCorrectionReport`).
- [routes.test.tsx](../tests/integration/routes.test.tsx) — Verifies route rendering for `/`, `/calculator` (zero `NaN`), and `/admin` (`403` guard for `role === 'student'`, full CMS access for `role === 'admin'`).

## 3. End-to-End Test Journeys (`tests/e2e/scholarpath.spec.ts`)

1. **Journey 1 — Guest Search, Multi-Filter & Scholarship Detail**: Uses landing hero search (`IT` + `Computer`), expands filters (desktop sidebar or mobile toggle drawer), combines `No application fee` + `Official verified records only`, and verifies `Opera Universitaria di Trento Scholarship` detail breakdown and official application link with zero `pageerror` exceptions.
2. **Journey 2 — 7-Step Onboarding & Eligibility Matcher**: Completes all 7 steps (`Nepal`, `GPA 3.85`, funding preference `full_tuition_and_living`) and confirms matcher profile summary updates dynamically.
3. **Journey 3 — Save Scholarship & University Comparison**: Filters `/scholarships?q=EDISU`, saves `EDISU Piemonte Regional Scholarship`, verifies persistence on `/saved`, and deep-links to `/compare/universities?ids=uni-padua,uni-trento,uni-polito` inspecting table headers.
4. **Journey 4 — Tracker, Checklist Tasks, Documents, Calculator & Calendar**: Adds an application to the tracker, appends a checklist item, visits `/documents`, verifies `/calculator` computes without `NaN`, and verifies `/calendar` renders.
5. **Journey 5 — RBAC & Admin Verification Flow**: Confirms `student` receives `403 — Administrator Access Required` on `/admin`, switches to Admin Sandbox, publishes a new verified scholarship (`E2E Nordic CS Grant 2027`), and confirms live appearance in public `/scholarships` discovery.
6. **Journey 6 — Mobile Responsiveness & Horizontal Overflow**: Sets `390×844` viewport, verifies `scrollWidth - clientWidth <= 2`, and opens mobile navigation drawer.
7. **Journey 7 — Nested Route Reload Persistence**: Directly visits `/universities/politecnico-di-torino` and reloads to confirm SPA client routing integrity.

## 4. Verified Run Results (2026-11-13)

- `npm.cmd run typecheck`: **0 errors**
- `npm.cmd run lint -- --max-warnings 0`: **0 errors, 0 warnings**
- `npm.cmd test`: **8 test files passed, 29 tests passed**
- `npm.cmd run build`: **Built cleanly (`vite build`)**
- `VITE_BASE_PATH=/ScholarPath/ npm.cmd run build`: **Verified subpath asset paths (`/ScholarPath/assets/...`) and `dist/404.html` SPA fallback generation**
- `npm.cmd run test:e2e`: **14 passed** (7 Chromium desktop + 7 Mobile Pixel 7)
- Headless Chromium visual + console audit across desktop (`1440×900` & `1280×720`) and mobile (`390×844`): **0px horizontal overflow, 0 console errors, 0 page errors**
