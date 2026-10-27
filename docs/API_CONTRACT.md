# FairShift API v1 — immutable Phase 0 handoff

**Authoritative machine-readable schemas:** [`src/lib/contracts.ts`](../src/lib/contracts.ts). That file exports **strict Zod request and response schemas** and inferred TypeScript types. **API routes below are designed, not yet implemented** in Phase 0. Backend implementation must conform to schemas exactly; any contract modification needs both owners to approve before code changes.

## Wire rules

- Base prefix `/api`. JSON request bodies and responses, except GET (query parameters only). All property names `camelCase`; all IDs UUID strings. All dates ISO8601 UTC ending `Z` (example `2026-10-23T02:30:00.000Z`); no client timestamps for attendance.
- Money as integer **paise** in numbers bounded to `[0,2147483647]`, no decimal currency numbers or floats. Signed `differenceMinor` = `expected - recorded`; may be negative. All example numbers below are paise, not rupees.
- Successful responses use `{ "data": ... }`; list endpoints additionally include `{ "paging": { "limit": 50, "offset": 0, "nextOffset": null } }`. `nextOffset` is null if no more data; ordering by start/created date DESC and ID DESC for stable ties. Pagination default limit 50, maximum 100, offset 0–100000. Financial summaries scoped to `month=YYYY-MM` in organization `Asia/Kolkata` time.
- Failure body **always** `{ "error": { "code": "...", "message": "..." } }`, optionally a `requestId`. Never return stack traces, another organization's data, cookie contents or keys. `Cache-Control: private, no-store` on every authenticated response. Requests that mutate state require authenticated same-site session + standard CSRF protection via SameSite cookies and explicit Origin/Host validation for JSON write endpoints (not CORS `*`).
- All unlisted body properties are rejected via strict Zod schemas. Unknown query keys are rejected. Queries must be URI-decoded, checked, and mapped into the exported schemas; route path IDs validate as UUIDs. Each response must parse against the named response schema.
- Errors: `400 VALIDATION_ERROR` bad shape/range/date; `401 UNAUTHENTICATED`; `403 FORBIDDEN` no required org role; `404 NOT_FOUND` resource missing or belongs to another org/worker; `409 INVALID_STATE` illegal shift/dispute transition; `409 DUPLICATE_DISPUTE` open duplicate; `409 CONFLICT` stale concurrent write; `429 RATE_LIMITED`; `500 SERVER_ERROR` generic message. `503` for unavailable configured DB may use `SERVER_ERROR`. Do **not** return `200` fake data if persistence is unavailable.

## Routes (single source of URL/method truth)

| Method and path | Query / body schema | Success and response schema | Permission |
|---|---|---|---|
| `GET /api/me` | No query/body | `200 MeResponseSchema` | Authenticated; only own memberships |
| `GET /api/worker/shifts` | `ShiftsQuerySchema` (`orgId` required; optional `from`,`to`, `limit`,`offset`) | `200 ShiftsResponseSchema` | `WORKER` membership in org; **own** shifts |
| `GET /api/worker/earnings` | `MonthQuerySchema` (`orgId`,`month` required) | `200 EarningsResponseSchema` | `WORKER` in org; **own** COMPLETED shifts |
| `POST /api/worker/shifts/{shiftId}/check-in` | `EmptyBodySchema` `{}` | `200 ShiftResponseSchema` | `WORKER`, owns target shift; PLANNED only |
| `POST /api/worker/shifts/{shiftId}/check-out` | `CheckoutRequestSchema` | `200 ShiftResponseSchema` | `WORKER`, owns target; CHECKED_IN only |
| `GET /api/disputes` | `DisputesQuerySchema` (`orgId` required; optional `status`,`limit`,`offset`) | `200 DisputesResponseSchema` | `WORKER` sees own disputes only, `EMPLOYER` org disputes |
| `POST /api/disputes` | `CreateDisputeRequestSchema` | `201 DisputeResponseSchema` | `WORKER`, owns referenced COMPLETED shift; no other OPEN dispute for shift |
| `GET /api/employer/dashboard` | `DashboardQuerySchema` (`orgId`,`month` required, optional `sector`) | `200 DashboardResponseSchema` | `EMPLOYER` org; sector must equal stored org sector if specified |
| `PUT /api/employer/shifts/{shiftId}/recorded-pay` | `SetRecordedPayRequestSchema` | `200 RecordedPayResponseSchema` | `EMPLOYER` org; COMPLETED shift only, single upsert |
| `PATCH /api/employer/disputes/{disputeId}/resolve` | `ResolveDisputeRequestSchema` | `200 ResolveDisputeResponseSchema` | `EMPLOYER` org; OPEN dispute, decision recorded atomically |

Path variables are validated UUIDs. `orgId` is always a **candidate authorization scope** checked against the authenticated user; on path-only endpoints infer org from the target record, then independently check actor membership and target ownership. Never trust `orgId`, role or worker ID from client as proof of access.

## Core response shapes (exact fields/types; Zod is normative)

**`Membership`**: `{id: UUID, organizationId: UUID, organizationName: string, sector: 'construction'|'campus', role: 'WORKER'|'EMPLOYER'}`.

**`Shift`**: `{id: UUID, organizationId: UUID, workerMembershipId: UUID, sector: Sector, siteLabel: string, status: 'PLANNED'|'CHECKED_IN'|'COMPLETED', scheduledStartAt: UTC, scheduledEndAt: UTC, checkedInAt: UTC|null, checkedOutAt: UTC|null, unpaidBreakMinutes: integer, earnings: Breakdown|null, recordedAmountMinor: Money|null, comparisonStatus: 'MATCHED'|'UNDERPAID'|'OVERPAID'|'NOT_RECORDED', differenceMinor: signed Money|null}`. `earnings` is null unless COMPLETED. No recorded pay ⇒ NOT_RECORDED and null difference. `recordedAmountMinor` is a nullable integer including valid `0` — not a falsy shortcut.

**`Breakdown`**: `{workedMinutes: integer 1–1440, regularMinor: Money, overtimeMinor: Money, fixedAllowanceMinor: Money, weekendBonusMinor: Money, expectedMinor: Money}`. Breakdown from immutable shift rate snapshot. **Source code for deterministic calculation:** `src/lib/pay.ts`.

**`Dispute`**: `{id: UUID, organizationId: UUID, shiftId: UUID, openedByMembershipId: UUID, reason: string, status: 'OPEN'|'APPROVED'|'REJECTED', resolutionExplanation: string|null, resolvedByMembershipId: UUID|null, createdAt: UTC, resolvedAt: UTC|null}`.

**`GET /api/me`**: `{data:{user:{id:UUID,email:string|null},memberships:Membership[]}}`. If user belongs to no organizations, memberships is empty (not an error).

**`GET /api/worker/shifts`**: `{data:Shift[],paging:{limit:int,offset:int,nextOffset:int|null}}`, sorted by `scheduledStartAt DESC`, then `id DESC`. `from` and `to` are inclusive UTC scheduled-start bounds; reject `from > to`.

**`GET /api/worker/earnings`**: `{data:{organizationId:UUID,sector:Sector,month:'YYYY-MM',currency:'INR',totalExpectedMinor:Money,totalRecordedMinor:Money,recordedCount:int,completedCount:int,underpaidCount:int,shifts:Shift[]}}`. Only COMPLETED shifts starting in that local month. `underpaidCount` excludes not-recorded shifts. `recordedCount` explicitly shows if totalRecordedMinor is partial. This endpoint returns all shifts in the month (limit one worker-month; if excessive, implement pagination via joint approved contract change).

**`POST /api/worker/shifts/{id}/check-in`**: empty `{}` body, response `{data:Shift}`. Set `checkedInAt` to **DB server time** via atomic update from PLANNED to CHECKED_IN; reject if already checked in/completed. No client-selected time. `POST .../check-out` body `{ "unpaidBreakMinutes": 30 }`, response `{data:Shift}`. Set `checkedOutAt` DB now; require paid minutes 1–1440 and unpaid break not longer than elapsed minutes; flip to COMPLETED atomically. `weekendEligible` is snapshotted from `scheduledStartAt` in org timezone when shift created.

**`GET /api/disputes`**: `{data:Dispute[],paging:{limit,offset,nextOffset}}`, newest first. Worker only sees own opened disputes; employer sees org disputes. Optional `status` exact enum.

**`POST /api/disputes`**:
```json
{"shiftId":"40000000-0000-4000-8000-000000000001","reason":"My overtime allowance is missing from the recorded amount."}
```
Return `{data:Dispute}` with 201. Server derives opening membership from session + shift; never accepts `openedByMembershipId`. Require owned, COMPLETED shift; allow disputes even if pay matches or is not yet recorded, so a worker can contest shift details. Reject duplicate OPEN per shift.

**`GET /api/employer/dashboard`**: `{data:{organizationId:UUID,sector:Sector,month:'YYYY-MM',currency:'INR',workerCount:int,totalShifts:int,completedShifts:int,underpaidShifts:int,openDisputes:int,totalExpectedMinor:Money,totalRecordedMinor:Money,recordedCount:int,recentShifts:Shift[]}}`. Only org of authenticated employer. Worker count = current WORKER memberships in org (not month-active workers); `openDisputes` count is all OPEN disputes in the organization (not month-specific). Shift totals and earnings only include shifts beginning in requested local month; `recentShifts` is up to 20 of that month's shifts. Optional `sector` is an assertion, not a cross-org discovery filter; reject mismatch with 400.

**`PUT /api/employer/shifts/{id}/recorded-pay`**: body `{ "amountMinor": 104000 }`; return `{data:{shiftId:UUID,amountMinor:Money,enteredAt:UTC}}`. Upsert the single employer-recorded amount for the completed shift, attributable to actor's **employer membership**. No creation for planned/in-progress shifts. `PUT` is repeatable, overwrites the current recorded amount and refreshes `enteredAt`, not audit history. If a historic audit is required later, add append-only events in an approved change.

**`PATCH /api/employer/disputes/{id}/resolve`**:
```json
{"decision":"APPROVED","explanation":"Corrected missing overtime line after reviewing attendance.","correctedRecordedAmountMinor":110000}
```
Or `{ "decision": "REJECTED", "explanation": "Attendance and recorded pay match the signed shift rule." }`. Return `{data:{dispute:Dispute, recordedPay:{shiftId:UUID,amountMinor:Money,enteredAt:UTC}}}`. APPROVED must atomically set recorded pay to corrected amount and store status / explanation / resolver / timestamp. REJECTED must leave pay unchanged and return existing recorded-pay row. For MVP this requires a recorded-pay row: if none exists, reject resolution with `409 INVALID_STATE` and ask employer to record pay first. If status was already resolved, return `409 INVALID_STATE` rather than silently repeat. Only employer in the **dispute's org** may resolve.

## Example discrepancy arithmetic

```
Construction:
expectedMinor = round(12000 * 480/60) + round(12000 * 30 * 15000/(60*10000)) + 5000
              = 96000 + 9000 + 5000 = 110000
recordedMinor = 104000 → differenceMinor = +6000 → UNDERPAID

Campus Saturday:
expectedMinor = flatShift 65000 + weekendBonus 5000 = 70000
recordedMinor = 65000 → differenceMinor = +5000 → UNDERPAID
```

## Guardrails for implementers

1. Route handlers live in `src/app/api/**`, backend logic in `src/server/**`; import `src/lib/contracts.ts` and `src/lib/pay.ts`, don't duplicate business logic in UI.
2. DB table columns are `snake_case`, wire JSON is `camelCase`; use explicit transforms to avoid accidental leakage of secret/internal DB columns.
3. Compute expected pay on server from immutable snapshot. Never accept `expectedMinor`, `workerMembershipId`, `role`, `checkedInAt`, `checkedOutAt` or resolution actor identity from browser.
4. Use transactions or DB-stored atomic functions for check-in, check-out and dispute resolution; race/duplicate tests required in Phase 1.
5. Test cross-organization requests and worker-to-worker access with actual Supabase Auth identities. A mock auth token is not evidence of correct authorization.
