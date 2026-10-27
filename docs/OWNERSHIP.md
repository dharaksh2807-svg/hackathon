# FairShift — single-branch ownership freeze

**One existing Git branch:** `main` in this new local scaffold. No additional branches and no parallel writes to the same path. Both agents must inspect `git status --short` before edits; all changes happen against the same branch with separate directory ownership. Avoid simultaneous `npm install`, `git add -A` or commits while another agent is writing. Prefer a single coordinating integrator to commit tested cross-agent changes.

| Path | Responsible agent | Change policy after Phase 0 |
|---|---|---|
| `src/app/api/**` | **Codex** | Exclusive API routes |
| `src/server/**` | **Codex** | Exclusive auth/roles/backend/data access |
| `supabase/**` incl. migrations/seed | **Codex** | Exclusive SQL migration updates; never edit an applied migration (add a new one) |
| `tests/server/**` | **Codex** | Exclusive backend/security tests |
| `src/lib/pay.ts` | **Codex** | Exclusive pay calculation |
| `src/app/page.tsx`, `src/app/layout.tsx`, `src/app/globals.css` | **Antigravity** | UI layout/styles; replace Phase 0 placeholder in later phase |
| `src/components/**`, `src/lib/api-client/**`, `tests/ui/**` | **Antigravity** | UI components, accessible frontend client and UI tests |
| `src/lib/contracts.ts` | **FROZEN — Codex custodian** | Backend-owned schema; modifications require explicit coordination with Antigravity |
| `docs/API_CONTRACT.md` | **FROZEN — Codex custodian** | Must change atomically with contracts.ts after both agents agree |
| `src/proxy.ts` + auth integration | **Codex** | Exclusive session cookie/auth setup; Antigravity calls APIs only |
| `package.json`, future `package-lock.json` | **FROZEN — Codex custodian** | Agents request additions; only coordinator installs/updates |
| `tsconfig.json`, `next.config.ts`, `eslint.config.mjs`, `postcss.config.mjs`, `.env.example`, `.gitignore` | **FROZEN — Codex custodian** | Changes only after both agents coordinate |
| `docs/ARCHITECTURE.md`, `docs/OWNERSHIP.md`, `README.md` | **Codex** | Backend/integrator documents; notify UI owner if contract-impacting |

## Parallel work rules

1. **Do not create a second Git branch or checkout a different branch.** Work in distinct subdirectories of the same checkout. If agents share the exact filesystem, do not let both run file-mutating tooling or commit concurrently.
2. Antigravity uses types from `src/lib/contracts.ts` read-only, imports the frontend client from its own folder, and does **not** edit `src/app/api`, migrations or auth boundary.
3. Codex does not edit Antigravity's pages, components or global styles. Codex may document required UI states instead.
4. Shared contract changes require a brief API diff recorded in `docs/API_CONTRACT.md`, review by both owners, and integration by Codex. Never silently change endpoint name, envelope or field type.
5. UI and backend can run development processes independently, but **one integrator** stages only the completed files it owns and commits after explicit verification. Do not commit secrets, `.env.local`, `node_modules` or generated `.next` outputs.
6. Stop after Phase 0 for this delivery; no Phase 1 route handlers or frontend dashboard code were implemented.
