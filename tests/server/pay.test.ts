import test from "node:test";
import assert from "node:assert/strict";
import { calculateExpectedPay, comparePay, roundHalfUp, getPaidMinutes, isWeekendKolkata, type PayRuleSnapshot } from "../../src/lib/pay.ts";

const construction: PayRuleSnapshot = { basis: "HOURLY", rateMinor: 12_000, overtimeAfterMinutes: 480,
  overtimeMultiplierBps: 15_000, fixedAllowanceMinor: 5_000, weekendBonusMinor: 0, version: 1 };
const campus: PayRuleSnapshot = { basis: "PER_SHIFT", rateMinor: 65_000, overtimeAfterMinutes: 0,
  overtimeMultiplierBps: 10_000, fixedAllowanceMinor: 0, weekendBonusMinor: 5_000, version: 1 };

test("construction: 8.5h with overtime and allowance yields INR 1100", () => {
  assert.deepEqual(calculateExpectedPay(construction, 510, false), {
    workedMinutes: 510, regularMinor: 96_000, overtimeMinor: 9_000,
    fixedAllowanceMinor: 5_000, weekendBonusMinor: 0, expectedMinor: 110_000,
  });
  assert.deepEqual(comparePay(110_000, 104_000), { status: "UNDERPAID", differenceMinor: 6_000 });
});

test("campus weekend flat shift yields INR 700; INR 650 recorded => INR 50 short", () => {
  assert.equal(calculateExpectedPay(campus, 480, true).expectedMinor, 70_000);
  assert.deepEqual(comparePay(70_000, 65_000), { status: "UNDERPAID", differenceMinor: 5_000 });
});

test("absence of recorded pay is not a discrepancy", () => {
  assert.deepEqual(comparePay(70_000, null), { status: "NOT_RECORDED", differenceMinor: null });
});

test("integer half-up rounding is deterministic", () => {
  assert.equal(roundHalfUp(1n, 2n), 1);
  assert.equal(roundHalfUp(1n, 3n), 0);
  assert.equal(roundHalfUp(5n, 2n), 3);
});

test("invalid rules/amounts are rejected", () => {
  assert.throws(() => calculateExpectedPay(construction, 1441, false));
  assert.throws(() => comparePay(100, -1));
  assert.throws(() => calculateExpectedPay({ ...construction, rateMinor: 1.5 }, 60, false));
});

test("UTC elapsed minutes and unpaid break use whole-minute floor", () => {
  assert.equal(getPaidMinutes("2026-10-23T02:30:00Z", "2026-10-23T11:30:30Z", 30), 510);
  assert.throws(() => getPaidMinutes("2026-10-23T02:30:00Z", "2026-10-23T02:40:00Z", 11));
});

test("campus weekend uses Asia/Kolkata rather than server time zone", () => {
  assert.equal(isWeekendKolkata("2026-10-24T03:30:00Z"), true);
  assert.equal(isWeekendKolkata("2026-10-23T02:30:00Z"), false);
  // Friday 19:00 UTC is Saturday 00:30 local.
  assert.equal(isWeekendKolkata("2026-10-23T19:00:00Z"), true);
});
