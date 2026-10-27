import test from "node:test";
import assert from "node:assert/strict";
import { ApiError } from "../../src/lib/api-client/client.ts";
import { DemoApiClient } from "../../src/lib/api-client/demo-client.ts";
import { FIXTURE_ORGS } from "../../src/lib/api-client/fixtures.ts";

test("DemoApiClient lifecycle: check-in transitions PLANNED shift to CHECKED_IN", async () => {
  const client = new DemoApiClient();
  const plannedShiftId = "40000000-0000-4000-8000-000000000014";

  const res = await client.checkIn(plannedShiftId);
  assert.equal(res.data.status, "CHECKED_IN");
  assert.ok(res.data.checkedInAt !== null);

  // Attempting to check in again must throw INVALID_STATE error
  await assert.rejects(
    async () => client.checkIn(plannedShiftId),
    (err: unknown) => err instanceof ApiError && err.code === "INVALID_STATE"
  );
});

test("DemoApiClient lifecycle: check-out transitions CHECKED_IN shift to COMPLETED", async () => {
  const client = new DemoApiClient();
  const checkedInShiftId = "40000000-0000-4000-8000-000000000013";

  const res = await client.checkOut(checkedInShiftId, 30);
  assert.equal(res.data.status, "COMPLETED");
  assert.equal(res.data.unpaidBreakMinutes, 30);
  assert.ok(res.data.checkedOutAt !== null);
  assert.ok(res.data.earnings !== null);
});

test("DemoApiClient disputes: validates reason length and prevents duplicate open disputes", async () => {
  const client = new DemoApiClient();
  const shiftId = "40000000-0000-4000-8000-000000000011";

  // Successfully create a dispute
  const res = await client.createDispute({
    shiftId,
    reason: "Missing 45 minutes of overtime pay from Friday shift.",
  });
  assert.equal(res.data.status, "OPEN");
  assert.equal(res.data.shiftId, shiftId);

  // Duplicate open dispute for the same shift must fail
  await assert.rejects(
    async () =>
      client.createDispute({
        shiftId,
        reason: "Another claim for the exact same shift.",
      }),
    (err: unknown) => err instanceof ApiError && err.code === "DUPLICATE_DISPUTE"
  );
});

test("DemoApiClient employer actions: set recorded pay updates status and variance", async () => {
  const client = new DemoApiClient();
  const shiftId = "40000000-0000-4000-8000-000000000012";

  // Expected pay for this completed shift is 101,000 paise
  const res = await client.setRecordedPay(shiftId, 101000);
  assert.equal(res.data.amountMinor, 101000);

  // Verify that the shift now reflects MATCHED parity
  const shiftsRes = await client.getWorkerShifts({ orgId: FIXTURE_ORGS.construction.id });
  const updatedShift = shiftsRes.data.find((s) => s.id === shiftId);
  assert.ok(updatedShift);
  assert.equal(updatedShift.comparisonStatus, "MATCHED");
  assert.equal(updatedShift.differenceMinor, 0);
});

test("DemoApiClient employer dispute adjudication: APPROVED decision updates pay atomically", async () => {
  const client = new DemoApiClient();
  const disputeId = "60000000-0000-4000-8000-000000000001";

  const res = await client.resolveDispute(disputeId, {
    decision: "APPROVED",
    explanation: "Approved overtime and site allowance after checking attendance card.",
    correctedRecordedAmountMinor: 110000,
  });

  assert.equal(res.data.dispute.status, "APPROVED");
  assert.equal(res.data.recordedPay.amountMinor, 110000);
});
