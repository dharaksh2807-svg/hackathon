import test from "node:test";
import assert from "node:assert/strict";
import { SECTOR_DEFINITIONS } from "../../src/lib/api-client/types.ts";
import {
  FIXTURE_CONSTRUCTION_SHIFTS,
  FIXTURE_CAMPUS_SHIFTS,
  getFixtureWorkerEarnings,
} from "../../src/lib/api-client/fixtures.ts";

test("Two-sector configurations enforce distinct compensation mechanisms", () => {
  const construction = SECTOR_DEFINITIONS.construction;
  const campus = SECTOR_DEFINITIONS.campus;

  // Pay basis must be distinct
  assert.equal(construction.payBasis, "HOURLY");
  assert.equal(campus.payBasis, "PER_SHIFT");

  // Rates are distinct
  assert.equal(construction.baseRateMinor, 12000); // ₹120/hr
  assert.equal(campus.baseRateMinor, 65000); // ₹650/shift

  // Overtime policies are distinct
  assert.equal(construction.overtimeThresholdMinutes, 480);
  assert.equal(construction.overtimeMultiplierBps, 15000);
  assert.equal(campus.overtimeThresholdMinutes, 0);

  // Allowances and bonuses are distinct
  assert.equal(construction.fixedAllowanceMinor, 5000); // ₹50 hazard
  assert.equal(construction.weekendBonusMinor, 0);
  assert.equal(campus.fixedAllowanceMinor, 0);
  assert.equal(campus.weekendBonusMinor, 5000); // ₹50 Saturday/Sunday bonus
});

test("Sector shifts have distinct records and realistic discrepancy reasons", () => {
  const constructionShift = FIXTURE_CONSTRUCTION_SHIFTS[0];
  const campusShift = FIXTURE_CAMPUS_SHIFTS[0];

  assert.notEqual(constructionShift.id, campusShift.id);
  assert.notEqual(constructionShift.organizationId, campusShift.organizationId);
  assert.notEqual(constructionShift.siteLabel, campusShift.siteLabel);

  // Construction discrepancy: 110,000 expected vs 104,000 recorded = 6,000 underpaid
  assert.equal(constructionShift.earnings?.expectedMinor, 110000);
  assert.equal(constructionShift.recordedAmountMinor, 104000);
  assert.equal(constructionShift.differenceMinor, 6000);
  assert.equal(constructionShift.comparisonStatus, "UNDERPAID");

  // Campus discrepancy: 70,000 expected vs 65,000 recorded = 5,000 underpaid
  assert.equal(campusShift.earnings?.expectedMinor, 70000);
  assert.equal(campusShift.recordedAmountMinor, 65000);
  assert.equal(campusShift.differenceMinor, 5000);
  assert.equal(campusShift.comparisonStatus, "UNDERPAID");
});

test("Earnings summaries calculate independent sector aggregates", () => {
  const constructionEarnings = getFixtureWorkerEarnings("construction");
  const campusEarnings = getFixtureWorkerEarnings("campus");

  assert.equal(constructionEarnings.sector, "construction");
  assert.equal(campusEarnings.sector, "campus");
  assert.ok(constructionEarnings.totalExpectedMinor > 0);
  assert.ok(campusEarnings.totalExpectedMinor > 0);
  assert.notEqual(constructionEarnings.totalExpectedMinor, campusEarnings.totalExpectedMinor);
});
