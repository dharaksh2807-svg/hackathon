import "./resolve.ts";
import test from "node:test";
import assert from "node:assert/strict";
const { monthBounds, shiftOutput, totals, disputeOutput } = await import("../../src/server/model.ts");

const row = {
  id: "40000000-0000-4000-8000-000000000001", organization_id: "10000000-0000-4000-8000-000000000001",
  worker_membership_id: "30000000-0000-4000-8000-000000000001", site_label: "Synthetic Site", status: "COMPLETED",
  scheduled_start_at: "2026-10-23T02:30:00+00:00", scheduled_end_at: "2026-10-23T11:30:00+00:00",
  checked_in_at: "2026-10-23T02:30:00+00:00", checked_out_at: "2026-10-23T11:30:00+00:00",
  unpaid_break_minutes: 30, weekend_eligible: false, rule_version: 1, pay_basis: "HOURLY", rate_minor: 12000,
  overtime_after_minutes: 480, overtime_multiplier_bps: 15000, fixed_allowance_minor: 5000, weekend_bonus_minor: 0,
};
test("shift mapping computes from snapshot, normalizes UTC and strips internal fields", () => {
  const shift = shiftOutput({ ...row, recorded_pay: { amount_minor: 104000 }, secret: "never expose" }, "construction");
  assert.equal(shift.earnings!.expectedMinor, 110000);
  assert.equal(shift.differenceMinor, 6000);
  assert.equal(shift.checkedInAt, "2026-10-23T02:30:00.000Z");
  assert.equal("rate_minor" in shift, false);
  assert.equal("secret" in shift, false);
});
test("zero recorded pay is real; missing amounts and unfinished shifts have no discrepancy", () => {
  assert.equal(shiftOutput({ ...row, recorded_pay: [{ amount_minor: 0 }] }, "construction").differenceMinor, 110000);
  assert.equal(shiftOutput(row, "construction").comparisonStatus, "NOT_RECORDED");
  assert.equal(shiftOutput({ ...row, status: "PLANNED", checked_in_at: null, checked_out_at: null }, "construction").earnings, null);
});
test("monthly sums expose partial recording and exclude incomplete shifts", () => {
  const complete = shiftOutput({ ...row, recorded_pay: { amount_minor: 104000 } }, "construction");
  const missing = shiftOutput(row, "construction");
  const planned = shiftOutput({ ...row, status: "PLANNED", checked_in_at: null, checked_out_at: null }, "construction");
  assert.deepEqual(totals([complete, missing, planned]), { totalExpectedMinor: 220000, totalRecordedMinor: 104000,
    recordedCount: 1, completedCount: 2, underpaidCount: 1 });
  assert.deepEqual(totals([]), { totalExpectedMinor: 0, totalRecordedMinor: 0, recordedCount: 0, completedCount: 0, underpaidCount: 0 });
});
test("Kolkata month boundaries include UTC previous-day evening, leap years and year rollover", () => {
  assert.deepEqual(monthBounds("2026-10"), ["2026-09-30T18:30:00.000Z", "2026-10-31T18:30:00.000Z"]);
  assert.deepEqual(monthBounds("2024-02"), ["2024-01-31T18:30:00.000Z", "2024-02-29T18:30:00.000Z"]);
  assert.deepEqual(monthBounds("2026-12"), ["2026-11-30T18:30:00.000Z", "2026-12-31T18:30:00.000Z"]);
});
test("dispute mapping exposes only the frozen fields", () => {
  const d = disputeOutput({ id: row.id, organization_id: row.organization_id, shift_id: row.id,
    opened_by_membership_id: row.worker_membership_id, reason: "Synthetic reason", status: "OPEN",
    resolution_explanation: null, resolved_by_membership_id: null, created_at: row.checked_in_at, resolved_at: null,
    updated_at: row.checked_in_at });
  assert.equal("updated_at" in d, false);
  assert.equal(d.createdAt, "2026-10-23T02:30:00.000Z");
});
