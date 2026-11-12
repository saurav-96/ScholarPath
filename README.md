# ScholarPath

**Discover Opportunities. Compare Universities. Build Your Future.**

ScholarPath is a production-oriented international scholarship discovery, university affordability comparison, and undergraduate application planning platform built with React, TypeScript, Tailwind CSS, TanStack Query, Zod, Recharts, and optional Supabase PostgreSQL/Auth/Storage.

## Key Capabilities

- **Source-Verified Undergraduate Catalog**: Curated dataset covering 16 study destinations, 23 universities, and 25 officially sourced scholarships (with explicit `official` vs `synthetic_demo` provenance labels and last-verified dates).
- **Multi-Filter Scholarship Discovery & Detail Breakdown**: Filter simultaneously by degree, country, subject, nationality, zero application fee, full tuition vs full funding (tuition + living/housing/travel/insurance separated explicitly), open/upcoming deadlines, and English instruction.
- **Explainable Eligibility Matcher**: Evaluates student citizenship, expected GPA (0.0–4.0), independent English/SAT qualifications (IELTS, TOEFL iBT, PTE, Duolingo, SAT, Other), subjects, and financial preferences, keeping hard disqualifiers strictly separate from soft preferences.
- **Side-by-Side University Comparison (Up to 4 Institutions)**: Compare annual international tuition fees, living cost estimates, admissions criteria, instruction languages, and linked scholarships.
- **Financial & Multi-Currency Calculator**: Models annual tuition + 12-month living/housing + insurance + travel vs scholarship aid and personal budgets, backed by live ECB reference exchange rates (Frankfurter API) or user-supplied custom rates.
- **Personal Application Tracker, Document Vault & Dual-Timezone Calendar**: Manage all 9 application stages, checklists, document readiness, and exam/deadline reminders locally in Demo Mode or synced via Supabase Row Level Security.
- **Role-Protected Admin Verification CMS**: Restricted to administrator roles (`role === 'admin'`), featuring verification workflows, bulk JSON/CSV validation & dry-run importer, correction report review, and audit logs.
- **Dual-Mode Architecture (Zero-Backend Demo Mode + Connected Supabase Mode)**: Works out of the box as a static SPA deployable on **GitHub Pages** without exposing any secret credentials, upgrading automatically when `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY` are supplied.

## Tech Stack

- **Frontend**: React 18, TypeScript, Vite 5, Tailwind CSS, Lucide Icons, Framer Motion, React Router v6
- **State, Forms & Charts**: TanStack Query v5, React Hook Form, Zod, Recharts
- **Optional Backend**: Supabase (PostgreSQL, Auth, Row Level Security, Storage)
- **Testing & CI/CD**: Vitest, React Testing Library, Playwright E2E, GitHub Actions -> GitHub Pages

## Quick Start

```bash
# 1. Install dependencies
npm install

# 2. Start development server (runs cleanly in Demo Mode with zero env vars)
npm run dev

# 3. Verify typecheck, lint, tests, and production bundle
npm run typecheck
npm run lint
npm test
npm run build
```

See detailed documentation in:

- [Architecture Guide](./docs/ARCHITECTURE.md)
- [Database & RLS Policies](./docs/DATABASE.md)
- [Official Data Sources & Verification Policy](./docs/DATA_SOURCES.md)
- [GitHub Pages & Supabase Deployment Guide](./docs/DEPLOYMENT.md)
- [Testing & QA Report](./docs/TESTING.md)

## License

MIT License — see [LICENSE](./LICENSE).
