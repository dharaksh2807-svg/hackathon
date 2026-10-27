# FairShift — Phase 0

Architecture scaffold for a two-sector worker transparency MVP. **This is not yet a functioning app.** Phase 0 defines the database, seed fixtures, typed HTTP contract, pay arithmetic and security handoff. API handlers and functional UI are planned for subsequent phases.

## Setup

1. Install Node.js 22+, then `npm install`.
2. Create a Supabase project or run a local Supabase development stack.
3. Copy `.env.example` to `.env.local` and populate project URL, publishable key and **server-only** service-role key.
4. Apply `supabase/migrations/202610270001_initial.sql` using Supabase migrations / SQL editor.
5. Read `supabase/seed.sql` and `docs/ARCHITECTURE.md` for synthetic demo fixture setup. Do not run demo fixtures against production data.
6. Run `npm run dev` for the Phase 0 placeholder, `npm run check` for available checks.

**No hosted database, environment credentials, authenticated demo accounts or deployed app have been created by this workspace.**

Contract: [`docs/API_CONTRACT.md`](docs/API_CONTRACT.md) and [`src/lib/contracts.ts`](src/lib/contracts.ts). Parallel ownership: [`docs/OWNERSHIP.md`](docs/OWNERSHIP.md).

Verification and blockers: [`docs/PHASE0_REPORT.md`](docs/PHASE0_REPORT.md).
