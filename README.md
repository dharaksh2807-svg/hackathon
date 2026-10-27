# FairShift

Integrated Next.js worker and employer portals backed by Supabase Auth and PostgreSQL. Construction and college (`campus`) use distinct stored pay rules and immutable shift snapshots. API routes follow [the frozen contract](docs/API_CONTRACT.md); expected pay is calculated on the server in integer paise. Employer-recorded amounts are bookkeeping records, not proof that money was paid.

## Local setup

1. Use Node.js 22.15+ and run `npm ci`.
2. Configure an isolated Supabase development project. Copy `.env.example` to ignored `.env.local` and supply the project URL, publishable/anon key, and server-only service-role key. Never send or commit the service-role key.
3. Apply migrations once in filename order: `supabase/migrations/202610270001_initial.sql`, then `supabase/migrations/202610270002_backend.sql`. An existing Phase 0 database needs only migration 002. Do not reset a database or reapply migrations. Allow PostgREST to refresh its schema cache.
4. Provision email-confirmed worker/employer Auth accounts and organization memberships through trusted administrative tooling. The application provides password sign-in; organization and role choices come exclusively from `/api/me`.
5. For synthetic development records only, create the four Auth emails listed at the top of `supabase/seed.sql` with privately supplied passwords, then run that file. It preserves existing attendance, pay and dispute decisions on repeat runs. It skips membership/shift fixtures until all four identities exist.
6. Run `npm run dev`, sign in, and select the reporting month. For the supplied historical examples, choose October 2026.

The application always uses real same-origin APIs. Missing services produce errors; fixture adapters exist only for explicit tests. A worker checks in to a PLANNED shift, then checks out after at least one paid whole minute. A completed shift can be disputed. Employers record pay and resolve an OPEN dispute with an explanation; approval updates recorded pay atomically. Resolution requires an existing recorded-pay row. The worker sees updates after refreshing records, returning focus to the app, or signing in again.

Production requires HTTPS. Set `FAIRSHIFT_APP_ORIGIN` to the exact public origin (no trailing slash), especially behind TLS termination, and preserve the public `Host` header. Configure the public Supabase variables before building the browser bundle; keep the service-role key server-only at runtime. The scripts invoke local Node entrypoints so they work even in the supplied directory containing `27:10`.

## Validation

- `npm run typecheck`
- `npm test` — server and frontend focused tests; external SQL/live suites skip unless enabled.
- `npm run lint`
- `npm run build`
- `npm run check` — all of the above.

To exercise migrations, RLS and transactions without a running Supabase stack, install a test-only SQL driver outside the repository:

```sh
npm install --prefix /tmp/fairshift-integration-tools --no-package-lock --ignore-scripts @electric-sql/pglite
FAIRSHIFT_PGLITE_MODULE=/tmp/fairshift-integration-tools/node_modules/@electric-sql/pglite/dist/index.js npm test
```

This SQL test uses a minimal Auth schema shim. It verifies both sectors, persistence after reopening the database, authorization rules, attendance, approvals/rejections and rollback; it does not prove actual Supabase Auth or multi-connection race behavior.

For real authentication and HTTP integration/race verification, apply both migrations to a disposable project, then run:

```sh
FAIRSHIFT_LIVE_TEST=1 node --env-file=.env.local --experimental-strip-types --test tests/server/live.test.ts
```

It creates random test users/organizations, verifies two workers in one organization cannot access one another's records, exercises competing writes, and runs worker→employer→worker dispute workflows for both industries. It deletes only its generated fixtures afterward; it never resets the database. Do not run against production.

To include browser sign-in, attendance and dispute workflows for both sectors in the live suite, install Playwright outside the app and enable its optional driver:

```sh
npm install --prefix /tmp/fairshift-integration-tools --no-package-lock --ignore-scripts playwright
node /tmp/fairshift-integration-tools/node_modules/playwright/cli.js install chromium
FAIRSHIFT_LIVE_TEST=1 FAIRSHIFT_PLAYWRIGHT_MODULE=/tmp/fairshift-integration-tools/node_modules/playwright/index.mjs node --env-file=.env.local --experimental-strip-types --test tests/server/live.test.ts
```

The browser test uses real sign-in and API calls. Its trusted fixture client ages only its own checked-in test shifts by two minutes so checkout does not require a real wait. No client timestamp field or mocked HTTP response is used.

The frozen employer dashboard exposes at most 20 recent shifts for the selected month; the UI labels this limit and uses full server aggregates. Disputes are fetched across all pages and can be resolved even when their shift is outside that recent list. No new list/detail API has been added.

Source provenance, verification evidence, remaining limitations, and the exact changed-file list are in [the integration report](docs/INTEGRATION_REPORT.md).
