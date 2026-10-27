import test from "node:test";
import assert from "node:assert/strict";
import { ApiError, HttpApiClient, getApiClient } from "../../src/lib/api-client/client.ts";
import { currentKolkataMonth, loadPortalData, portalIdentities } from "../../src/lib/api-client/portal.ts";
import { FIXTURE_MEMBERSHIPS, FIXTURE_CONSTRUCTION_SHIFTS, getFixtureWorkerEarnings, getFixtureEmployerDashboard } from "../../src/lib/api-client/fixtures.ts";
import type { MeResponse } from "../../src/lib/contracts.ts";

const me: MeResponse["data"] = {
  user: { id: "70000000-0000-4000-8000-000000000001", email: "session@example.test" },
  memberships: FIXTURE_MEMBERSHIPS,
};

test("application client defaults to HTTP and errors never select fixture data", async t => {
  assert.ok(getApiClient() instanceof HttpApiClient);
  t.mock.method(globalThis, "fetch", async () => Response.json({ error: { code: "SERVER_ERROR", message: "Database is unavailable" } }, { status: 503 }));
  await assert.rejects(() => new HttpApiClient().getMe(), (error: unknown) => error instanceof ApiError && error.status === 503 && error.message === "Database is unavailable");
});

test("successful HTTP responses must match the frozen runtime schema", async t => {
  t.mock.method(globalThis, "fetch", async () => Response.json({ data: { fabricated: true } }));
  await assert.rejects(() => new HttpApiClient().getMe(), (error: unknown) => error instanceof ApiError && error.code === "INVALID_RESPONSE");
});

test("HTTP writes use frozen routes, methods, integer paise and session credentials", async t => {
  const calls: { path: string; options: RequestInit }[] = [];
  t.mock.method(globalThis, "fetch", async (url: string, options: RequestInit) => {
    calls.push({ path: url, options });
    return Response.json({ error: { code: "UNAUTHENTICATED", message: "Sign in required" } }, { status: 401 });
  });
  const client = new HttpApiClient();
  const shift = FIXTURE_CONSTRUCTION_SHIFTS[0];
  await assert.rejects(() => client.checkIn(shift.id));
  await assert.rejects(() => client.checkOut(shift.id, 30));
  await assert.rejects(() => client.createDispute({ shiftId: shift.id, reason: "Missing overtime allowance" }));
  await assert.rejects(() => client.setRecordedPay(shift.id, 110000));
  await assert.rejects(() => client.resolveDispute(shift.id, { decision: "APPROVED", explanation: "Overtime verified against attendance", correctedRecordedAmountMinor: 110000 }));
  assert.deepEqual(calls.map(c => [c.path, c.options.method]), [
    [`/api/worker/shifts/${shift.id}/check-in`, "POST"], [`/api/worker/shifts/${shift.id}/check-out`, "POST"],
    ["/api/disputes", "POST"], [`/api/employer/shifts/${shift.id}/recorded-pay`, "PUT"], [`/api/employer/disputes/${shift.id}/resolve`, "PATCH"],
  ]);
  assert.deepEqual(JSON.parse(String(calls[0].options.body)), {});
  assert.deepEqual(JSON.parse(String(calls[1].options.body)), { unpaidBreakMinutes: 30 });
  assert.deepEqual(JSON.parse(String(calls[3].options.body)), { amountMinor: 110000 });
  for (const { options } of calls) {
    assert.equal(options.credentials, "same-origin");
    assert.equal(options.cache, "no-store");
    assert.equal(new Headers(options.headers).get("content-type"), "application/json");
  }
});

test("portal choices derive only from memberships returned for the verified session", () => {
  assert.deepEqual(portalIdentities({ ...me, memberships: [] }), []);
  const identities = portalIdentities({ ...me, memberships: [me.memberships[2]] });
  assert.equal(identities.length, 1);
  assert.equal(identities[0].email, "session@example.test");
  assert.equal(identities[0].membershipId, me.memberships[2].id);
  assert.equal(identities[0].sector, "campus");
});

test("worker loading follows pagination and uses selected month and authorized organization", async t => {
  const identity = portalIdentities(me).find(i => i.role === "WORKER" && i.sector === "construction")!;
  const calls: URL[] = [];
  t.mock.method(globalThis, "fetch", async (path: string) => {
    const url = new URL(path, "http://localhost"); calls.push(url);
    assert.equal(url.searchParams.get("orgId"), identity.organizationId);
    if (url.pathname === "/api/worker/earnings") {
      assert.equal(url.searchParams.get("month"), "2026-10");
      return Response.json({ data: getFixtureWorkerEarnings("construction") });
    }
    const offset = Number(url.searchParams.get("offset"));
    return Response.json({ data: url.pathname === "/api/worker/shifts" ? [FIXTURE_CONSTRUCTION_SHIFTS[offset === 0 ? 0 : 1]] : [], paging: { limit: 100, offset, nextOffset: offset === 0 ? 100 : null } });
  });
  const result = await loadPortalData(new HttpApiClient(), identity, "2026-10");
  assert.equal(result.shifts.length, 2);
  assert.equal(result.dashboard, null);
  assert.equal(calls.filter(url => url.pathname === "/api/disputes").length, 2);
});

test("each employer loads its real dashboard route without calling worker-only shifts", async t => {
  const calls: URL[] = [];
  t.mock.method(globalThis, "fetch", async (path: string) => {
    const url = new URL(path, "http://localhost"); calls.push(url);
    assert.notEqual(url.pathname, "/api/worker/shifts");
    if (url.pathname === "/api/disputes") return Response.json({ data: [], paging: { limit: 100, offset: 0, nextOffset: null } });
    const sector = url.searchParams.get("sector") === "construction" ? "construction" : "campus";
    return Response.json({ data: getFixtureEmployerDashboard(sector) });
  });
  for (const identity of portalIdentities(me).filter(i => i.role === "EMPLOYER")) {
    const result = await loadPortalData(new HttpApiClient(), identity, "2026-10");
    assert.equal(result.dashboard?.sector, identity.sector);
    assert.deepEqual(result.shifts, result.dashboard?.recentShifts);
    assert.equal(result.earnings, null);
  }
  assert.equal(calls.length, 4);
});

test("reporting month follows Kolkata at UTC month and year boundaries", () => {
  assert.equal(currentKolkataMonth(new Date("2026-10-31T19:00:00Z")), "2026-11");
  assert.equal(currentKolkataMonth(new Date("2026-12-31T19:00:00Z")), "2027-01");
});
