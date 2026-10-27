# FairShift pre-submission audit — 2026-10-27

**Recommendation: NOT READY for deployment until the live-project checks below pass.** Local correctness, security guards, production build, and focused accessibility checks pass. No production records or deployment were modified.

## Verified passes

- Construction hourly/overtime/allowance and campus flat/weekend calculations; whole-minute break handling, integer rounding, zero/missing/over-recorded pay, and discrepancy detection.
- Actual PostgreSQL migration/functions in a disposable file-backed PGlite database: attendance state guards and duplicate check-in, dispute creation, approval/rejection, rollback, immutable rate snapshots, saved resolution visibility, and persistence after reopening the database.
- SQL role/RLS isolation: worker/org restrictions, direct dispute edits denied, all five privileged mutation functions denied to anonymous/authenticated roles, and worker resolution denied. The Auth schema here is a shim, not evidence of real Supabase identity isolation.
- All ten production API operations returned `401 UNAUTHENTICATED` without a session, despite spoofed role/ID headers. Invalid checkout inputs returned 400; cross-origin writes returned 403; private/no-store headers were present. This used noncredential public placeholders, not a fabricated authenticated token.
- No detected secrets in intended source files or 30 production static assets. Neither the actual configured private key, its environment-variable name, nor a private build canary appeared in client assets. `npm audit --omit=dev --json` reported zero known production vulnerabilities.
- Browser UI checks: focus entry/trapping/restoration and inert background, visible focus, labels and live validation errors, sampled validation-text contrast >=4.5:1, textual statuses, and 320px/375px worker/employer layouts in both sectors. These six regressions explicitly intercept synthetic HTTP responses; they do not establish real sign-in or browser persistence.

## Consequential defects fixed

| Severity | Defect and correction |
| --- | --- |
| P1 | Employer dashboard's adjudication button silently did nothing for disputes outside its recent-shift list. Removed the shift-presence guard; the existing resolution form now opens and accepts a correction/note. |
| P2 | Checkout required breaks in multiples of five and truncated input with `parseInt`. It now accepts every contract-valid whole minute and rejects blank/fractional values without silently altering them. |
| P2 | Modal keyboard focus remained behind dialogs. Added initial focus, Tab/Shift+Tab containment, background inertness, unique accessible labels, and focus restoration. |
| P2 | Mobile navigation/report controls/filter pills overflowed; the reproduced 320px worker page was 455px wide. Wrapped the relevant controls while preserving desktop layout. |
| P2 | A mutation rejected with 401 left cached pay records visible. Clear those records and return to labeled sign-in. |
| P2 | Employer pay entry excluded the highest valid 47 paise. Both pay forms now use the exact contract maximum, 21,474,836.47 rupees. |
| P2 | UI described configured examples as statutory wages, recorded pay as disbursed, and worker-reported breaks as verified. Corrected those claims; no AI, anonymity or payment-processing capability was added. |
| P2 | Validation feedback lacked announcements/associations and some helper/action colors had poor contrast. Added alerts/descriptions/invalid state and darker relevant text/action colors. |

The six targeted browser regressions reproduced their failures before the corresponding fixes. Added six browser regressions and expanded SQL permission coverage. The live test now checks schema readiness before creating synthetic Auth identities.

## Tests actually executed

| Command/check | Result |
| --- | --- |
| `npm run typecheck` | PASS |
| `npm run lint` | PASS: 0 errors, 3 existing warnings |
| `FAIRSHIFT_PGLITE_MODULE=/tmp/fairshift-integration-tools/node_modules/@electric-sql/pglite/dist/index.js npm test` | 62 passed, 0 failed, 1 skipped; 63 tests including SQL subtests |
| `FAIRSHIFT_BROWSER_URL=http://127.0.0.1:3190 FAIRSHIFT_PLAYWRIGHT_MODULE=/tmp/fairshift-integration-tools/node_modules/playwright/index.mjs node --experimental-strip-types --test tests/browser/audit.test.ts` | 6 passed, 0 failed |
| `npm run build` with a synthetic private-key canary in the server environment | PASS; all ten API operations registered |
| Production API negative-security smoke | PASS: 10 unauthenticated denials, 3 invalid checkout denials, cross-origin denial |
| Source/client secret and canary scan; production dependency audit | PASS, no findings |
| Opt-in real Supabase suite (with browser driver enabled) | FAIL at its read-only schema preflight: all seven tables unavailable (`PGRST205`); no Auth users/records created and no authenticated success cases executed |

## Remaining defects and untested areas

- **P1 deployment blocker:** the configured isolated project has not yet exposed the required migrated tables. The owner is applying migrations 001 and 002. Real Auth identity isolation, concurrent writes, real data in both dashboards, and saved updates across browser refreshes remain unverified until the live suite and its browser driver run successfully. No synthetic Auth users or database records were created while prerequisites were unavailable.
- **P2 contract/UI limit:** employers see only twenty recent shifts. An older shift without any recorded-pay row needs the existing authorized recorded-pay API before dispute resolution; the UI cannot make that first entry outside its recent roster. Broader employer listing requires a separate contract change.
- **P3:** three existing lint warnings remain in `postcss.config.mjs` and `tests/ui/formatters.test.ts`. A full screen-reader/contrast matrix, load test, and hosted HTTPS deployment were not performed.

Independent dashboard reads are already parallelized. Remaining sequential membership checks and paginated reads enforce authorization or complete financial totals; no speculative query refactor or application dependency was added. `.env.local` remains ignored. Work stays on `main`; nothing was pushed.
