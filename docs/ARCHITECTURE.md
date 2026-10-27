# FairShift — Phase 0 architecture (2026-10-27)

## Status and rationale

- **Status:** contracts, schema and baseline calculation library only. No working API handlers or functional product UI yet.
- **Stack:** Next.js 16 App Router, TypeScript, Tailwind CSS 4, Supabase Auth + PostgreSQL, Zod 4, native Node test runner.
- **Deployment:** none attempted. External Supabase project / local database not connected or tested.
- **Scope:** one Next.js monolith with HTTP route handlers, one Postgres database, two sector-specific pay rules; no microservices, payment processing, AI, surveillance or location tracking.

## Request path and trust boundaries

```
Browser (untrusted input)
  ├── UI / typed frontend API client (Antigravity)
  └── Supabase sign-in (Auth cookie via @supabase/ssr)
       ↓ HTTPS / cookie
Next.js proxy.ts (refresh auth cookie; never authorization by itself)
       ↓
Next.js app/api handlers (Codex)
  1. Validate Zod route/query/body; reject extra properties
  2. Verify signed-in identity with Supabase auth.getUser() (not getSession())
  3. Query worker_memberships for this user + requested organization
  4. Assert role and target record ownership in THIS organization
  5. Compute/record results; perform atomic DB transaction for linked updates
  6. Return sanitized contract result; no public auth tokens or SQL details
       ↓
Supabase Postgres (service-role client: SERVER ONLY, keyed from .env.local)
  + RLS read policies for authenticated end-user clients (defense in depth)
```

**Trust rule:** user, role, workerMembershipId and organization membership cannot be accepted from POST bodies, query claims or local storage. `orgId` only selects a candidate organization and must be checked against authenticated membership. For a shift/dispute mutation, fetch by BOTH resource ID and verified org ID; on worker actions, also match `worker_membership_id`. For disputes, follow `shift_id` to worker ownership. Never silently fall back to a global/all-org query. Never use the service-role client from any client component.

**Defense-in-depth:** database RLS has read-only policies, with private SQL SECURITY DEFINER predicates used solely by policies. Membership row SELECT is limited to the signed-in user; employer access to coworker metadata must go through the audited, role-checked server API and must not expose auth_user_id. Direct authenticated PostgREST clients cannot mutate payroll, shifts or roles. Next.js server service-role operations bypass RLS and therefore **must** check user/role/resource ownership themselves. Prefer the existing `src/server/auth.ts` guards; do not skip them. Never return membership records from another organization. Note: no auth-user creation or membership self-signup route is offered in this MVP; a trusted organizer provisions memberships.

## Relational data model

| Entity | Primary relationships | Purpose |
|---|---|---|
| `organizations` | id | One sector per organization (`construction` / `campus`), INR / Asia-Kolkata |
| `sector_configs` | `organization_id` unique | Current organization rule; hourly or flat-shift; multiplier, allowances, version |
| `worker_memberships` | `organization_id`, `auth_user_id`; unique pair | Auth principal-to-org role (`WORKER`, `EMPLOYER`) |
| `shifts` | `organization_id`, `worker_membership_id` | Scheduled/actual UTC times, break duration, site, **immutable rule snapshot** |
| `recorded_pay` | unique `shift_id`, `organization_id`, author membership | Employer-entered amount in INR paise; history of edits not in MVP |
| `disputes` | `shift_id`, opener, optional resolver | OPEN / APPROVED / REJECTED, explanation and decision time |

Composite foreign keys prohibit cross-organization shift, pay and dispute references. One OPEN dispute per shift is enforced by partial unique index. The service must check the membership role on writes (foreign keys ensure org, not role).

**Sector differences (not merely labels):**

| Rule | Construction | College / campus |
|---|---|---|
| `pay_basis` | `HOURLY` | `PER_SHIFT` |
| `rate_minor` | 12,000 paise/hour (₹120) | 65,000 paise/completed shift (₹650) |
| `overtime_after_minutes` | 480 paid minutes | 0 — no overtime on per-shift rate |
| `overtime_multiplier_bps` | 15,000 = 1.5× | 10,000 (unused in flat-shift calculation) |
| `fixed_allowance_minor` | 5,000 (₹50/site shift) | 0 |
| `weekend_bonus_minor` | 0 | 5,000 (₹50 on Saturday/Sunday local) |

These are **illustrative synthetic demo contracts, not legal wage rates, statutory compliance or payment promises**. Workers may dispute unfair or incorrect rules. Config must be snapshotted into the shift when the shift is created so changing a rule cannot rewrite history. `weekend_eligible` is determined when creating a shift by the scheduled start's **Asia/Kolkata** day, not browser timezone. A campus shift earns the full flat-shift base when marked COMPLETED, even if short; managers should resolve atypical hours via disputes rather than silent deductions. Any policy change beyond these rules needs joint contract approval.

## Pay arithmetic (deterministic)

All pay amounts are **32-bit nonnegative integer INR paise** in API and DB (max 2,147,483,647). Overtime multiplier is integral basis points (10,000 = 1×). `workedMinutes = floor((checkedOutAt - checkedInAt) / 60,000 ms) - unpaidBreakMinutes`, valid range **1–1440**, with server-generated actual timestamps. Only COMPLETED shifts have an earnings breakdown. Client-submitted break time is worker-attested, 0–1440, cannot exceed elapsed minutes; worker cannot set check-in or check-out timestamps. Check-in and check-out must be state-checked and atomic to avoid races.

For `HOURLY`: `regularMinutes = min(workedMinutes, overtimeAfterMinutes)`, `overtimeMinutes = max(workedMinutes - overtimeAfterMinutes, 0)`, `regular = roundHalfUp(rateMinor × regularMinutes / 60)`, `overtime = roundHalfUp(rateMinor × overtimeMinutes × overtimeMultiplierBps / (60 × 10000))`. For `PER_SHIFT`, `regular = rateMinor` and `overtime = 0`. Then `expected = regular + overtime + fixedAllowance + (weekendEligible ? weekendBonus : 0)`. Calculate using **BigInt/rational arithmetic**, not floating-point currency; **round half up on each variable rate line** before summing. Reject overflowing sums; no taxes, deductions, penalties or legal claims are modeled.

`differenceMinor = expectedMinor - recordedAmountMinor`. Positive = **UNDERPAID**, negative = **OVERPAID**, zero = **MATCHED**. No recorded amount means `NOT_RECORDED` with null difference — **not** underpayment. Monthly reports group by the shift's scheduled start in the organization's Asia/Kolkata calendar month; totals sum COMPLETED shifts only. `totalRecordedMinor` sums **only recorded** amounts and `recordedCount` makes incompleteness explicit. Empty months return zeros, not invented financial entries.

## Synthetic demo cases

Apply `supabase/migrations/202610270001_initial.sql` and `supabase/seed.sql`. Seed installs orgs/configs unconditionally. Complete worker-linked fixtures require four **synthetic Supabase Auth identities**, whose exact test emails are listed in `seed.sql`; re-run seed after provisioning those identities. The seed intentionally skips worker-linked data if no matching Auth users exist, rather than forging credentials or violating foreign keys.

- **Construction** (2026-10-23, Friday): 9 hours present, 30-min unpaid break = 510 paid minutes; 96,000 base + 9,000 overtime + 5,000 site allowance = **110,000 expected** (₹1,100), **104,000 recorded** (₹1,040), **6,000 short** (₹60). One OPEN dispute.
- **Campus** (2026-10-24, Saturday): 480 paid minutes, 65,000 flat rate + 5,000 weekend bonus = **70,000 expected** (₹700), **65,000 recorded** (₹650), **5,000 short** (₹50). One OPEN dispute.

Demo identities must have synthetic labels, no real personal data. To actually sign in, configure Supabase Auth in your own environment and manage safe development-only credentials externally. Do not use these fixture values for real payroll.

## Security and accessibility handoff

- Session: Supabase SSR cookies; use `auth.getUser()` in each server handler. `proxy.ts` only refreshes cookies and never replaces authorization. All sensitive API GET responses use `Cache-Control: private, no-store`.
- Input: use `src/lib/contracts.ts` Zod `.strict()` request validation; enforce max lengths, pagination bounds, state transitions and idempotency/conflict decisions. Error responses must not expose internal SQL, keys or cross-tenant existence.
- Employer permissions: see authorized org's workers, shifts, recorded pay, disputes; update recorded amount only for completed shifts; resolve disputes with explanation. Worker permissions: own shifts, own recorded pay, own disputes only; never change payroll amounts.
- Resolution: APPROVED requires a corrected recorded amount and atomic update to pay + dispute; REJECTED requires an explanation and no pay change. Always store resolver membership, timestamp and explanation. Cannot resolve a closed dispute. These are business-process decisions, not money transfers.
- Money/time: consistent INR paise and UTC ISO8601 `Z` on wire. Display worker-local Asia/Kolkata dates/accessibly; labels must distinguish *expected* vs *recorded*.
- Accessibility for UI owner: semantic headings, forms with labels/errors, keyboard-operated controls, visible focus, AA-contrast target, text status alongside color, live announcements after check-in and dispute creation, reduced-motion support, mobile responsive tables.
- Out of scope: self-registration role approval, multi-currency, offline writes, statutory payroll advice, incident/safety reports, localization, payment systems, GPS, AI, analytics tracking.

## Phase 0 verification and remaining work

- Unit tests for pay arithmetic exist; these are not a substitute for live DB RLS tests or browser E2E.
- Code install/build/lint/typecheck require npm registry access. Run `npm install`, `npm run check` once available; generate and commit a resolved lockfile before deployment.
- SQL migration and seed have **not** been executed on live/local Supabase in this environment; confirm RLS via worker A / worker B / employer A account tests.
- Phase 1 backend: implement authenticated API route handlers, guarded mutations, atomic dispute/pay resolution, recorded-pay updates, transaction/race tests; no API handlers are claimed complete in Phase 0.
- Phase 1 frontend: implement worker/employer screens and typed API client after contracts freeze; no full UI claimed complete in Phase 0.
