import "./resolve.ts";
import test from "node:test";
const { shiftOutput } = await import("../../src/server/model.ts");
import assert from "node:assert/strict";
import { mkdtemp, readFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";

// Optional external test runner, NEVER a production persistence fallback.
// This runs actual PostgreSQL SQL/RLS through PGlite with an auth schema shim.
// It does not replace the separate live Supabase Auth integration test.
const driver = process.env.FAIRSHIFT_PGLITE_MODULE;
test("Postgres migration, persistence and transactional workflow", { skip: !driver && "Set FAIRSHIFT_PGLITE_MODULE (see backend setup notes)" }, async t => {
  const { PGlite } = await import(driver!);
  const folder = await mkdtemp(join(tmpdir(), "fairshift-postgres-test-"));
  let db = new PGlite(folder);
  const sql = async (q: string, params: unknown[] = []): Promise<Record<string, unknown>[]> => (await db.query(q, params)).rows;
  const cw = "70000000-0000-4000-8000-000000000001";
  const ce = "70000000-0000-4000-8000-000000000002";
  const sw = "70000000-0000-4000-8000-000000000003";
  const se = "70000000-0000-4000-8000-000000000004";
  const other = "70000000-0000-4000-8000-000000000005";
  const org = "10000000-0000-4000-8000-000000000001";
  const shift = "40000000-0000-4000-8000-000000000001";
  const planned = "40000000-0000-4000-8000-000000000003";
  const dispute = "60000000-0000-4000-8000-000000000001";
  const call = async (name: string, args: unknown[]) => {
    const placeholders = args.map((_, i) => `$${i + 1}`).join(",");
    return (await sql(`SELECT public.${name}(${placeholders}) AS value`, args))[0].value as Record<string, unknown>;
  };
  try {
    await db.exec(`CREATE ROLE anon; CREATE ROLE authenticated; CREATE ROLE service_role BYPASSRLS;
      CREATE SCHEMA auth; CREATE TABLE auth.users(id uuid PRIMARY KEY, email text);
      CREATE FUNCTION auth.uid() RETURNS uuid LANGUAGE sql AS $$ SELECT nullif(current_setting('request.jwt.claim.sub', true), '')::uuid $$;
      GRANT USAGE ON SCHEMA auth TO authenticated; GRANT EXECUTE ON FUNCTION auth.uid() TO authenticated;`);
    await db.exec(await readFile("supabase/migrations/202610270001_initial.sql", "utf8"));
    await db.exec(await readFile("supabase/migrations/202610270002_backend.sql", "utf8"));
    const seed = await readFile("supabase/seed.sql", "utf8");
    await db.exec(seed); // Explicitly exercise the no-auth-user seed path.
    for (const [id, email] of [[cw, "construction-worker"], [ce, "construction-employer"], [sw, "campus-worker"], [se, "campus-employer"]]) {
      await sql("INSERT INTO auth.users VALUES ($1,$2)", [id, `fairshift-${email}@example.test`]);
    }
    await db.exec(seed);
    await t.test("seed repeats without duplicate rows or audit events", async () => {
      await db.exec(seed);
      assert.equal((await sql("SELECT count(*)::int AS n FROM public.shifts"))[0].n, 4);
      assert.equal((await sql("SELECT count(*)::int AS n FROM public.dispute_history"))[0].n, 2);
      const campus = (await sql("SELECT pay_basis, weekend_eligible FROM public.shifts WHERE id='40000000-0000-4000-8000-000000000002'"))[0];
      assert.deepEqual(campus, { pay_basis: "PER_SHIFT", weekend_eligible: true });
    });
    await sql("INSERT INTO auth.users VALUES ($1,'synthetic-isolation@example.test')", [other]);
    await sql("INSERT INTO public.worker_memberships(id,organization_id,auth_user_id,role,display_name) VALUES ($1,$2,$3,'WORKER','Synthetic second worker')", [other, org, other]);
    await t.test("wrong org/worker/role cannot mutate targeted records", async () => {
      await assert.rejects(() => call("fairshift_create_dispute", [other, shift, "Synthetic isolation test"]), /NOT_FOUND/);
      await assert.rejects(() => call("fairshift_check_in", [sw, planned]), /NOT_FOUND/);
      await assert.rejects(() => call("fairshift_record_pay", [cw, shift, 0]), /FORBIDDEN/);
      await assert.rejects(() => call("fairshift_resolve_dispute", [se, dispute, "REJECTED", "Synthetic resolution", null]), /NOT_FOUND/);
    });
    await t.test("end-user RLS isolates workers and blocks direct mutation and RPC impersonation", async () => {
      await db.exec("SET ROLE authenticated");
      await sql("SELECT set_config('request.jwt.claim.sub',$1,false)", [other]);
      assert.equal((await sql("SELECT count(*)::int AS n FROM public.shifts"))[0].n, 0);
      assert.equal((await sql("SELECT count(*)::int AS n FROM public.disputes"))[0].n, 0);
      assert.equal((await sql("SELECT count(*)::int AS n FROM public.dispute_history"))[0].n, 0);
      await assert.rejects(() => sql("UPDATE public.shifts SET status='COMPLETED' WHERE id=$1", [shift]), /permission denied/);
      await assert.rejects(() => call("fairshift_record_pay", [ce, shift, 0]), /permission denied/);
      await db.exec("RESET ROLE");
    });
    await t.test("attendance uses database time, rejects duplicates and invalid checkout, and snapshots rules", async () => {
      await assert.rejects(() => call("fairshift_check_out", [cw, planned, 0]), /INVALID_STATE/);
      await assert.rejects(() => call("fairshift_record_pay", [ce, planned, 0]), /INVALID_STATE/);
      await assert.rejects(() => call("fairshift_create_dispute", [cw, planned, "Synthetic planned dispute"]), /INVALID_STATE/);
      const checked = await call("fairshift_check_in", [cw, planned]);
      assert.equal(checked.status, "CHECKED_IN");
      assert.ok(Math.abs(Date.now() - Date.parse(String(checked.checked_in_at))) < 10000);
      await assert.rejects(() => call("fairshift_check_in", [cw, planned]), /INVALID_STATE/);
      const another = (await sql("INSERT INTO public.shifts(organization_id,worker_membership_id,site_label,scheduled_start_at,scheduled_end_at) SELECT organization_id,worker_membership_id,'Synthetic duplicate attendance',scheduled_start_at,scheduled_end_at FROM public.shifts WHERE id=$1 RETURNING id", [planned]))[0].id;
      await assert.rejects(() => call("fairshift_check_in", [cw, another]), /INVALID_STATE/);
      await assert.rejects(() => call("fairshift_check_out", [cw, planned, 1440]), /VALIDATION_ERROR/);
      assert.equal((await sql("SELECT status FROM public.shifts WHERE id=$1", [planned]))[0].status, "CHECKED_IN");
      await sql("UPDATE public.shifts SET checked_in_at=clock_timestamp()-interval '9 hours' WHERE id=$1", [planned]);
      const completed = await call("fairshift_check_out", [cw, planned, 30]);
      assert.equal(completed.status, "COMPLETED");
      assert.equal(completed.unpaid_break_minutes, 30);
      await assert.rejects(() => call("fairshift_check_out", [cw, planned, 0]), /INVALID_STATE/);
      await sql("UPDATE public.sector_configs SET rate_minor=15000 WHERE organization_id=$1", [org]);
      assert.equal((await sql("SELECT rate_minor FROM public.shifts WHERE id=$1", [planned]))[0].rate_minor, 12000);
      await assert.rejects(() => sql("UPDATE public.shifts SET rate_minor=15000 WHERE id=$1", [planned]), /INVALID_STATE/);
    });
    await t.test("duplicate disputes and missing-pay resolution reject; approved pay and history commit together", async () => {
      await assert.rejects(() => call("fairshift_create_dispute", [cw, shift, "Synthetic duplicate dispute"]), /DUPLICATE_DISPUTE/);
      const opened = await call("fairshift_create_dispute", [cw, planned, "Synthetic dispute without recorded pay"]);
      await assert.rejects(() => call("fairshift_resolve_dispute", [ce, opened.id, "APPROVED", "Synthetic reviewed resolution", 110000]), /INVALID_STATE/);
      assert.equal((await sql("SELECT status FROM public.disputes WHERE id=$1", [opened.id]))[0].status, "OPEN");
      const recorded = await call("fairshift_record_pay", [ce, planned, 0]);
      assert.equal(recorded.amount_minor, 0);
      const resolved = await call("fairshift_resolve_dispute", [ce, opened.id, "APPROVED", "Synthetic reviewed resolution", 110000]);
      assert.equal((resolved.dispute as Record<string, unknown>).status, "APPROVED");
      assert.equal((resolved.recordedPay as Record<string, unknown>).amount_minor, 110000);
      assert.equal((await sql("SELECT count(*)::int AS n FROM public.dispute_history WHERE dispute_id=$1", [opened.id]))[0].n, 2);
      await assert.rejects(() => call("fairshift_resolve_dispute", [ce, opened.id, "REJECTED", "Synthetic second resolution", null]), /INVALID_STATE/);
    });
    await t.test("rejection leaves recorded pay unchanged and resolution failure rolls back correction", async () => {
      const before = await sql("SELECT amount_minor,entered_at FROM public.recorded_pay WHERE shift_id=$1", [shift]);
      await assert.rejects(() => call("fairshift_resolve_dispute", [ce, dispute, "APPROVED", "short", 1]), /VALIDATION_ERROR/);
      const rejected = await call("fairshift_resolve_dispute", [ce, dispute, "REJECTED", "Synthetic rejected resolution", null]);
      assert.equal((rejected.dispute as Record<string, unknown>).status, "REJECTED");
      assert.deepEqual(await sql("SELECT amount_minor,entered_at FROM public.recorded_pay WHERE shift_id=$1", [shift]), before);
    });
    await t.test("a downstream audit failure rolls back both correction and decision", async () => {
      const campusShift = "40000000-0000-4000-8000-000000000002";
      const campusDispute = "60000000-0000-4000-8000-000000000002";
      await db.exec("ALTER TABLE public.dispute_history ADD CONSTRAINT synthetic_reject_approval CHECK (status <> 'APPROVED') NOT VALID");
      await assert.rejects(() => call("fairshift_resolve_dispute", [se, campusDispute, "APPROVED", "Synthetic rollback verification", 70000]), /synthetic_reject_approval/);
      assert.equal((await sql("SELECT amount_minor FROM public.recorded_pay WHERE shift_id=$1", [campusShift]))[0].amount_minor, 65000);
      assert.equal((await sql("SELECT status FROM public.disputes WHERE id=$1", [campusDispute]))[0].status, "OPEN");
      await db.exec("ALTER TABLE public.dispute_history DROP CONSTRAINT synthetic_reject_approval");
    });
    await t.test("campus attendance and dispute lifecycle uses its own flat/weekend snapshot", async () => {
      const campusShift = "40000000-0000-4000-8000-000000000002";
      const campusPlanned = "40000000-0000-4000-8000-000000000004";
      const campusDispute = "60000000-0000-4000-8000-000000000002";
      const raw = (await sql("SELECT to_jsonb(s) AS value FROM public.shifts s WHERE id=$1", [campusShift]))[0].value as Record<string, unknown>;
      const calculated = shiftOutput({ ...raw, recorded_pay: { amount_minor: 65000 } }, "campus");
      assert.equal(calculated.earnings!.regularMinor, 65000);
      assert.equal(calculated.earnings!.weekendBonusMinor, 5000);
      assert.equal(calculated.earnings!.overtimeMinor, 0);
      assert.equal(calculated.earnings!.expectedMinor, 70000);
      assert.equal(calculated.differenceMinor, 5000);
      const note = "Reviewed Saturday duty; corrected the missing weekend allowance.";
      const resolved = await call("fairshift_resolve_dispute", [se, campusDispute, "APPROVED", note, 70000]);
      assert.equal((resolved.dispute as Record<string, unknown>).resolution_explanation, note);
      assert.equal((resolved.recordedPay as Record<string, unknown>).amount_minor, 70000);
      await db.exec("SET ROLE authenticated");
      await sql("SELECT set_config('request.jwt.claim.sub',$1,false)", [sw]);
      const visible = (await sql("SELECT status,resolution_explanation FROM public.disputes WHERE id=$1", [campusDispute]))[0];
      assert.deepEqual(visible, { status: "APPROVED", resolution_explanation: note });
      await db.exec("RESET ROLE");
      const opened = await call("fairshift_create_dispute", [sw, campusShift, "Please review the recorded shift details."]);
      assert.equal(opened.status, "OPEN");
      const rejected = await call("fairshift_resolve_dispute", [se, opened.id, "REJECTED", "Shift details match the verified attendance.", null]);
      assert.equal((rejected.recordedPay as Record<string, unknown>).amount_minor, 70000);
      await call("fairshift_check_in", [sw, campusPlanned]);
      await sql("UPDATE public.shifts SET checked_in_at=clock_timestamp()-interval '2 hours' WHERE id=$1", [campusPlanned]);
      const ended = await call("fairshift_check_out", [sw, campusPlanned, 0]);
      const weekday = shiftOutput(ended, "campus");
      assert.equal(weekday.earnings!.regularMinor, 65000);
      assert.equal(weekday.earnings!.expectedMinor, 65000);
      assert.equal(weekday.earnings!.overtimeMinor, 0);
    });
    await t.test("re-seeding preserves changed pay and resolved decisions", async () => {
      await db.exec(seed);
      assert.equal((await sql("SELECT status FROM public.disputes WHERE id=$1", [dispute]))[0].status, "REJECTED");
      assert.equal((await sql("SELECT amount_minor FROM public.recorded_pay WHERE shift_id=$1", [planned]))[0].amount_minor, 110000);
    });
    await t.test("file-backed database retains state after close/reopen", async () => {
      await db.close();
      db = new PGlite(folder);
      assert.equal((await sql("SELECT status FROM public.disputes WHERE id=$1", [dispute]))[0].status, "REJECTED");
    });
  } finally { await db.close(); await rm(folder, { recursive: true, force: true }); }
});
