import "./resolve.ts";
import test from "node:test";
import assert from "node:assert/strict";
import { createClient } from "@supabase/supabase-js";
const { FairShiftService } = await import("../../src/server/service.ts");
const actor = { authUserId: "70000000-0000-4000-8000-000000000001", email: "synthetic@example.test" };
const orgId = "10000000-0000-4000-8000-000000000001";
const memberId = "30000000-0000-4000-8000-000000000001";
const shiftId = "40000000-0000-4000-8000-000000000001";
function database(resolve: (url: URL) => unknown[]) {
  const requests: URL[] = [];
  const client = createClient("https://synthetic-database.test", "synthetic-unit-key", {
    auth: { persistSession: false, autoRefreshToken: false },
    global: { fetch: async (request, init) => {
      const url = new URL(request instanceof Request ? request.url : String(request));
      requests.push(url);
      const rows = resolve(url);
      const accept = new Headers(init?.headers).get("accept") ?? "";
      return Response.json(accept.includes("vnd.pgrst.object") ? rows[0] : rows);
    } },
  });
  return { client, requests };
}
const member = { id: memberId, organization_id: orgId, auth_user_id: actor.authUserId, role: "WORKER" };
const organization = { id: orgId, name: "Synthetic construction", sector: "construction" };

test("guard queries include verified identity/org; absent membership stops privileged reads", async () => {
  const db = database(() => []);
  const service = new FairShiftService(actor, db.client, db.client);
  await assert.rejects(() => service.shifts({ orgId, limit: 50, offset: 0 }), { code: "FORBIDDEN" });
  assert.equal(db.requests.length, 1);
  assert.equal(db.requests[0].searchParams.get("auth_user_id"), `eq.${actor.authUserId}`);
  assert.equal(db.requests[0].searchParams.get("organization_id"), `eq.${orgId}`);
});
test("worker target ownership is independently checked before any mutation RPC", async () => {
  const db = database(url => url.pathname.endsWith("worker_memberships") ? [member] : [organization]);
  const userDb = database(() => [{ id: shiftId, organization_id: orgId, worker_membership_id: "30000000-0000-4000-8000-000000000002" }]);
  const service = new FairShiftService(actor, db.client, userDb.client);
  await assert.rejects(() => service.attendance(shiftId), { code: "NOT_FOUND" });
  await assert.rejects(() => service.createDispute(shiftId, "Synthetic other worker"), { code: "NOT_FOUND" });
  assert.equal(db.requests.some(url => url.pathname.includes("/rpc/")), false);
});
test("worker dispute lists always include organization and own opening membership filters", async () => {
  const db = database(url => url.pathname.endsWith("worker_memberships") ? [member] : url.pathname.endsWith("organizations") ? [organization] : []);
  const service = new FairShiftService(actor, db.client, db.client);
  const list = await service.disputes({ orgId, status: "OPEN", limit: 50, offset: 0 });
  assert.deepEqual(list.data, []);
  const query = db.requests.at(-1)!;
  assert.equal(query.searchParams.get("organization_id"), `eq.${orgId}`);
  assert.equal(query.searchParams.get("opened_by_membership_id"), `eq.${memberId}`);
  assert.equal(query.searchParams.get("status"), "eq.OPEN");
});
test("worker cannot use employer methods, and cross-org targets remain undiscoverable", async () => {
  const db = database(() => [member]);
  const hidden = database(() => []);
  const service = new FairShiftService(actor, db.client, hidden.client);
  await assert.rejects(() => service.dashboard({ orgId, month: "2026-10" }), { code: "FORBIDDEN" });
  await assert.rejects(() => service.recordPay(shiftId, 1), { code: "NOT_FOUND" });
  assert.equal(db.requests.some(url => url.pathname.includes("/rpc/")), false);
});
test("membershipless me returns empty memberships rather than invented demo access", async () => {
  const db = database(() => []);
  const service = new FairShiftService(actor, db.client, db.client);
  assert.deepEqual(await service.me(), { data: { user: { id: actor.authUserId, email: actor.email }, memberships: [] } });
});

test("monthly reports advance by actual page size, including a database row cap", async () => {
  const row = { id: shiftId, organization_id: orgId, worker_membership_id: memberId, site_label: "Synthetic Site",
    status: "COMPLETED", scheduled_start_at: "2026-10-23T02:30:00Z", scheduled_end_at: "2026-10-23T11:30:00Z",
    checked_in_at: "2026-10-23T02:30:00Z", checked_out_at: "2026-10-23T11:30:00Z", unpaid_break_minutes: 30,
    weekend_eligible: false, rule_version: 1, pay_basis: "HOURLY", rate_minor: 12000, overtime_after_minutes: 480,
    overtime_multiplier_bps: 15000, fixed_allowance_minor: 5000, weekend_bonus_minor: 0 };
  const db = database(url => {
    if (url.pathname.endsWith("worker_memberships")) return [member];
    if (url.pathname.endsWith("organizations")) return [organization];
    const offset = Number(url.searchParams.get("offset"));
    return offset < 3 ? [{ ...row, id: `40000000-0000-4000-8000-00000000000${offset + 1}` }] : [];
  });
  const service = new FairShiftService(actor, db.client, db.client);
  const response = await service.earnings({ orgId, month: "2026-10" });
  assert.equal(response.data.completedCount, 3);
  assert.equal(response.data.totalExpectedMinor, 330000);
  for (const q of db.requests.filter(url => url.pathname.endsWith("shifts"))) {
    assert.equal(q.searchParams.get("organization_id"), `eq.${orgId}`);
    assert.equal(q.searchParams.get("worker_membership_id"), `eq.${memberId}`);
    assert.equal(q.searchParams.get("status"), "eq.COMPLETED");
  }
});
