import test from "node:test";
import assert from "node:assert/strict";
import { randomUUID, randomBytes } from "node:crypto";
import { spawn } from "node:child_process";
import { setTimeout as delay } from "node:timers/promises";
import { createClient } from "@supabase/supabase-js";
import { createServerClient, type CookieOptions } from "@supabase/ssr";
import {
  DashboardResponseSchema, DisputeResponseSchema, EarningsResponseSchema, ErrorResponseSchema,
  MeResponseSchema, RecordedPayResponseSchema, ResolveDisputeResponseSchema, ShiftResponseSchema,
  ShiftsResponseSchema, DisputesResponseSchema,
} from "../../src/lib/contracts.ts";

const enabled = process.env.FAIRSHIFT_LIVE_TEST === "1";
test("live Supabase Auth identities, HTTP authorization/isolation and concurrent mutations", {
  skip: !enabled && "Requires disposable Supabase project; see README", timeout: 360_000,
}, async t => {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
  const secret = process.env.SUPABASE_SERVICE_ROLE_KEY;
  assert.ok(url && key && secret, "All three Supabase environment variables are required");
  const admin = createClient(url, secret, { auth: { persistSession: false, autoRefreshToken: false } });
  const users: string[] = [];
  const orgs = [randomUUID(), randomUUID()];
  const memberIds = [randomUUID(), randomUUID(), randomUUID(), randomUUID(), randomUUID()];
  const shiftIds = [randomUUID(), randomUUID(), randomUUID(), randomUUID()];
  const password = randomBytes(32).toString("base64url");
  const marker = randomUUID();
  const sessions: { cookie: string; client: ReturnType<typeof createServerClient> }[] = [];
  const port = 23000 + Math.floor(Math.random() * 10000);
  const base = `http://127.0.0.1:${port}`;
  let child: ReturnType<typeof spawn> | undefined;
  const checked = <T extends { data: unknown; error: { message: string } | null }>(reply: T): NonNullable<T["data"]> => {
    if (reply.error) throw new Error("Live fixture operation failed; verify migrations and test project configuration");
    assert.ok(reply.data !== null);
    return reply.data as NonNullable<T["data"]>;
  };
  const request = async (session: number | null, path: string, method = "GET", body?: unknown) => fetch(`${base}${path}`, {
    method, headers: { ...(session === null ? {} : { cookie: sessions[session].cookie }),
      ...(method === "GET" ? {} : { origin: base, "content-type": "application/json" }) },
    ...(body === undefined ? {} : { body: JSON.stringify(body) }),
  });
  const failure = async (response: Response, status: number, code: string) => {
    assert.equal(response.status, status);
    assert.equal(response.headers.get("cache-control"), "private, no-store");
    assert.equal(ErrorResponseSchema.parse(await response.json()).error.code, code);
  };
  try {
    for (let i = 0; i < 5; i++) {
      const email = `fairshift-live-${marker}-${i}@example.test`;
      const auth = checked(await admin.auth.admin.createUser({ email, password, email_confirm: true }));
      assert.ok(auth.user);
      users.push(auth.user.id);
      const jar = new Map<string, { name: string; value: string; options: CookieOptions }>();
      const client = createServerClient(url, key, {
        cookies: { getAll: () => [...jar.values()], setAll: (changes: { name: string; value: string; options: CookieOptions }[]) => changes.forEach(c => jar.set(c.name, c)) },
      });
      checked(await client.auth.signInWithPassword({ email, password }));
      sessions.push({ client, cookie: [...jar.values()].map(c => `${c.name}=${c.value}`).join("; ") });
    }
    checked(await admin.from("organizations").insert([
      { id: orgs[0], name: "Synthetic Live Construction", sector: "construction" },
      { id: orgs[1], name: "Synthetic Live College", sector: "campus" },
    ]));
    checked(await admin.from("sector_configs").insert(orgs.map((organization_id, i) => ({
      organization_id, version: 1, pay_basis: i ? "PER_SHIFT" : "HOURLY", rate_minor: i ? 65000 : 12000,
      overtime_after_minutes: i ? 0 : 480, overtime_multiplier_bps: i ? 10000 : 15000,
      fixed_allowance_minor: i ? 0 : 5000, weekend_bonus_minor: i ? 5000 : 0,
    }))));
    // Two workers in the SAME org are necessary to test worker-to-worker isolation.
    checked(await admin.from("worker_memberships").insert(users.map((auth_user_id, i) => ({
      id: memberIds[i], auth_user_id, organization_id: orgs[i >= 3 ? 1 : 0],
      role: i === 2 || i === 4 ? "EMPLOYER" : "WORKER", display_name: `Synthetic identity ${i}`,
    }))));
    const scheduled = "2026-10-23T02:30:00Z";
    const ended = "2026-10-23T11:30:00Z";
    checked(await admin.from("shifts").insert(shiftIds.map((id, i) => ({
      id, organization_id: orgs[i === 3 ? 1 : 0], worker_membership_id: memberIds[i === 3 ? 3 : i === 2 ? 0 : i],
      site_label: "Synthetic test fixture", scheduled_start_at: i === 3 ? "2026-10-24T03:30:00Z" : scheduled, scheduled_end_at: i === 3 ? "2026-10-24T11:30:00Z" : ended,
      // NOT NULL columns are populated by the DB snapshot trigger, including the correct sector rule.
      status: i < 2 || i === 3 ? "COMPLETED" : "PLANNED",
      checked_in_at: i === 2 ? null : i === 3 ? "2026-10-24T03:30:00Z" : scheduled, checked_out_at: i === 2 ? null : i === 3 ? "2026-10-24T11:30:00Z" : ended,
      unpaid_break_minutes: i === 3 ? 0 : i === 2 ? 0 : 30,
    }))));
    child = spawn(process.execPath, ["node_modules/next/dist/bin/next", "dev", "--webpack", "--hostname", "127.0.0.1", "--port", String(port)],
      { env: { ...process.env, FAIRSHIFT_APP_ORIGIN: base }, stdio: "ignore" });
    let ready = false;
    for (let i = 0; i < 90; i++) {
      if (child.exitCode !== null) throw new Error("Next test server exited before becoming ready");
      try { const r = await request(null, "/api/me"); if (r.status === 401) { ready = true; break; } } catch { /* server starting */ }
      await delay(500);
    }
    assert.ok(ready, "Next test server must be ready and return unauthenticated JSON");
    await t.test("real sessions, strict errors, RLS and worker/org isolation", async () => {
      await failure(await request(null, "/api/me"), 401, "UNAUTHENTICATED");
      const me = MeResponseSchema.parse(await (await request(0, "/api/me")).json());
      assert.equal(me.data.user.id, users[0]);
      assert.equal(me.data.memberships.length, 1);
      await failure(await request(0, "/api/me?role=EMPLOYER"), 400, "VALIDATION_ERROR");
      await failure(await request(0, `/api/worker/shifts?orgId=${orgs[1]}`), 403, "FORBIDDEN");
      await failure(await request(0, `/api/employer/dashboard?orgId=${orgs[0]}&month=2026-10`), 403, "FORBIDDEN");
      await failure(await request(1, `/api/worker/shifts/${shiftIds[2]}/check-in`, "POST", {}), 404, "NOT_FOUND");
      await failure(await request(0, "/api/disputes", "POST", { shiftId: shiftIds[1], reason: "Another worker shift" }), 404, "NOT_FOUND");
      const shifts = ShiftsResponseSchema.parse(await (await request(0, `/api/worker/shifts?orgId=${orgs[0]}`)).json());
      assert.equal(shifts.data.length, 2);
      assert.ok(shifts.data.every(s => s.workerMembershipId === memberIds[0]));
      const ownRows = checked(await sessions[1].client.from("shifts").select("id"));
      assert.deepEqual(ownRows.map((r: { id: string }) => r.id), [shiftIds[1]]);
      const forbidden = await sessions[0].client.rpc("fairshift_record_pay", { p_actor_user_id: users[2], p_shift_id: shiftIds[0], p_amount_minor: 1 });
      assert.ok(forbidden.error, "End-user RPC impersonation must be denied");
      const campus = EarningsResponseSchema.parse(await (await request(3, `/api/worker/earnings?orgId=${orgs[1]}&month=2026-10`)).json());
      assert.equal(campus.data.totalExpectedMinor, 70000); // Saturday flat shift plus weekend allowance.
    });
    await t.test("concurrent check-in, duplicate disputes and competing resolutions have one winner", async () => {
      const checkins = await Promise.all([request(0, `/api/worker/shifts/${shiftIds[2]}/check-in`, "POST", {}), request(0, `/api/worker/shifts/${shiftIds[2]}/check-in`, "POST", {})]);
      assert.deepEqual(checkins.map(r => r.status).sort(), [200, 409]);
      await failure(await request(0, `/api/worker/shifts/${shiftIds[2]}/check-out`, "POST", { unpaidBreakMinutes: 1440 }), 400, "VALIDATION_ERROR");
      checked(await admin.from("shifts").update({ checked_in_at: new Date(Date.now() - 9 * 3600000).toISOString() }).eq("id", shiftIds[2]));
      const checkout = await request(0, `/api/worker/shifts/${shiftIds[2]}/check-out`, "POST", { unpaidBreakMinutes: 30 });
      assert.equal(checkout.status, 200);
      assert.equal(ShiftResponseSchema.parse(await checkout.json()).data.earnings!.expectedMinor, 110000);
      const record = await request(2, `/api/employer/shifts/${shiftIds[2]}/recorded-pay`, "PUT", { amountMinor: 104000 });
      assert.equal(record.status, 200);
      assert.equal(RecordedPayResponseSchema.parse(await record.json()).data.amountMinor, 104000);
      const opens = await Promise.all([0, 1].map(() => request(0, "/api/disputes", "POST", { shiftId: shiftIds[2], reason: "Synthetic missing overtime" })));
      assert.deepEqual(opens.map(r => r.status).sort(), [201, 409]);
      const opened = DisputeResponseSchema.parse(await opens.find(r => r.status === 201)!.json()).data;
      const isolated = DisputesResponseSchema.parse(await (await request(1, `/api/disputes?orgId=${orgs[0]}`)).json());
      assert.equal(isolated.data.length, 0);
      const resolutions = await Promise.all([0, 1].map(() => request(2, `/api/employer/disputes/${opened.id}/resolve`, "PATCH",
        { decision: "APPROVED", explanation: "Synthetic review corrected overtime", correctedRecordedAmountMinor: 110000 })));
      assert.deepEqual(resolutions.map(r => r.status).sort(), [200, 409]);
      const resolved = ResolveDisputeResponseSchema.parse(await resolutions.find(r => r.status === 200)!.json());
      assert.equal(resolved.data.dispute.status, "APPROVED");
      assert.equal(resolved.data.recordedPay.amountMinor, 110000);
      const history = checked(await admin.from("dispute_history").select("status").eq("dispute_id", opened.id).order("created_at"));
      assert.deepEqual(history.map(r => r.status), ["OPEN", "APPROVED"]);
      const dashboard = DashboardResponseSchema.parse(await (await request(2, `/api/employer/dashboard?orgId=${orgs[0]}&month=2026-10`)).json());
      assert.equal(dashboard.data.workerCount, 2);
      assert.equal(dashboard.data.totalShifts, 3);
    });
    await t.test("worker-to-employer dispute workflow round trips independently for both sectors", async () => {
      for (const [worker, employer, orgIndex, shiftIndex, expected, recorded] of [[0, 2, 0, 0, 110000, 104000], [3, 4, 1, 3, 70000, 65000]]) {
        const target = shiftIds[shiftIndex];
        assert.equal((await request(employer, `/api/employer/shifts/${target}/recorded-pay`, "PUT", { amountMinor: recorded })).status, 200);
        const before = ShiftsResponseSchema.parse(await (await request(worker, `/api/worker/shifts?orgId=${orgs[orgIndex]}`)).json());
        const shift = before.data.find(item => item.id === target)!;
        assert.equal(shift.earnings!.expectedMinor, expected);
        assert.equal(shift.differenceMinor, expected - recorded);
        const createdResponse = await request(worker, "/api/disputes", "POST", { shiftId: target, reason: "Please review the missing sector allowance." });
        assert.equal(createdResponse.status, 201);
        const created = DisputeResponseSchema.parse(await createdResponse.json()).data;
        const employerList = DisputesResponseSchema.parse(await (await request(employer, `/api/disputes?orgId=${orgs[orgIndex]}`)).json());
        assert.equal(employerList.data.find(item => item.id === created.id)?.status, "OPEN");
        const note = "Attendance reviewed; corrected the missing sector allowance.";
        const resolvedResponse = await request(employer, `/api/employer/disputes/${created.id}/resolve`, "PATCH", { decision: "APPROVED", explanation: note, correctedRecordedAmountMinor: expected });
        assert.equal(resolvedResponse.status, 200);
        ResolveDisputeResponseSchema.parse(await resolvedResponse.json());
        const workerList = DisputesResponseSchema.parse(await (await request(worker, `/api/disputes?orgId=${orgs[orgIndex]}`)).json());
        const visible = workerList.data.find(item => item.id === created.id)!;
        assert.equal(visible.status, "APPROVED");
        assert.equal(visible.resolutionExplanation, note);
        const after = ShiftsResponseSchema.parse(await (await request(worker, `/api/worker/shifts?orgId=${orgs[orgIndex]}`)).json());
        assert.equal(after.data.find(item => item.id === target)?.comparisonStatus, "MATCHED");
      }
    });
    await t.test("browser sign-in, attendance and worker/employer dispute workflow in both sectors", {
      skip: !process.env.FAIRSHIFT_PLAYWRIGHT_MODULE && "Set FAIRSHIFT_PLAYWRIGHT_MODULE to an external Playwright installation",
    }, async () => {
      const { verifyBrowserFlows } = await import("./browser-flow.ts");
      await verifyBrowserFlows({
        driver: process.env.FAIRSHIFT_PLAYWRIGHT_MODULE!, base, marker, password, orgs, memberIds, admin,
        recordPay: (employer, shiftId, amountMinor) => request(employer, `/api/employer/shifts/${shiftId}/recorded-pay`, "PUT", { amountMinor }),
      });
    });
  } finally {
    if (child && child.exitCode === null) { child.kill("SIGTERM"); await new Promise<void>(resolve => child!.once("exit", () => resolve())); }
    // Delete in FK order; every filter is restricted to randomly generated test orgs.
    for (const table of ["disputes", "recorded_pay", "shifts", "sector_configs", "worker_memberships", "organizations"]) {
      const column = table === "organizations" ? "id" : "organization_id";
      checked(await admin.from(table).delete().in(column, orgs));
    }
    for (const id of users) checked(await admin.auth.admin.deleteUser(id));
  }
});
