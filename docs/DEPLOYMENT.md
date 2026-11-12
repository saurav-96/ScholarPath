# Deployment Guide (GitHub Pages & Optional Supabase)

ScholarPath builds into a static SPA inside `dist/` suitable for **GitHub Pages**, custom domains, Netlify, or Cloudflare Pages.

## 1. Local Static Build Verification

```bash
npm ci
npm run typecheck
npm run lint
npm test
npm run build
npm run preview -- --host 127.0.0.1 --port 4173
```

For subpath hosting simulation (e.g., `https://<username>.github.io/ScholarPath/`):

```bash
VITE_BASE_PATH=/ScholarPath/ npm run build
```

Note: `vite.config.ts` copies `dist/index.html` to `dist/404.html` automatically after bundling so nested routes resolve cleanly on refresh under GitHub Pages.

## 2. GitHub Actions CI/CD Setup

The workflow file [deploy.yml](../.github/workflows/deploy.yml) automates:
1. Dependency install, TypeScript check (`tsc -b`), ESLint, and Vitest unit/integration suite.
2. Root-path static build + Playwright Chromium E2E verification (`npx playwright test --project=chromium`).
3. Production Pages build using `VITE_BASE_PATH` (defaults automatically to `/<repo-name>/`, or override via repository variable `vars.VITE_BASE_PATH`) + `actions/deploy-pages@v4`.

### Steps to Publish to GitHub Pages

1. Push the repository to GitHub on branch `main`:
   ```bash
   git remote add origin https://github.com/<your-username>/<your-repo>.git
   git push -u origin main
   ```
2. Open **Repository Settings -> Pages** on GitHub and set **Build and deployment -> Source** to **GitHub Actions**.
3. *(Optional Connected Mode)* Under **Settings -> Secrets and variables -> Actions**:
   - Add Variables: `VITE_SUPABASE_URL`, and optionally `VITE_BASE_PATH` (set to `/` only if using a custom domain `CNAME`).
   - Add Secret or Variable: `VITE_SUPABASE_ANON_KEY`.
   - Leave Supabase variables empty to run publicly in **Demo Mode** (default offline/localStorage workspace with verified catalog).

## 3. Supabase Database Setup (Connected Mode Only)

1. Create a Supabase project.
2. Run SQL migrations in order via Supabase SQL Editor or CLI:
   - `supabase/migrations/0001_initial_schema.sql`
   - `supabase/migrations/0002_rls_policies.sql`
3. Promote an authorized user to curator/admin explicitly via Supabase SQL Editor:
   ```sql
   update public.profiles set role = 'admin' where id = '<auth-user-uuid>';
   ```
4. Never place `SUPABASE_SERVICE_ROLE_KEY` in `VITE_*` variables or frontend source.
