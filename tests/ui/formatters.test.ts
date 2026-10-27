import test from "node:test";
import assert from "node:assert/strict";
import {
  formatDateTimeKolkata,
  formatDateOnlyKolkata,
  formatTimeOnlyKolkata,
  formatMinutes,
  isLocalWeekend,
} from "../../src/lib/api-client/formatters.ts";

test("formatMinutes formats minute integers into human readable hours and minutes", () => {
  assert.equal(formatMinutes(510), "8h 30m");
  assert.equal(formatMinutes(480), "8h");
  assert.equal(formatMinutes(45), "45m");
  assert.equal(formatMinutes(0), "0m");
  assert.equal(formatMinutes(null), "—");
  assert.equal(formatMinutes(undefined), "—");
});

test("formatDateTimeKolkata formats UTC timestamps in Asia/Kolkata timezone", () => {
  // 2026-10-23T02:30:00.000Z is 08:00 AM IST (+5:30)
  const formatted = formatDateTimeKolkata("2026-10-23T02:30:00.000Z");
  assert.match(formatted, /23/);
  assert.match(formatted, /Oct/);
  assert.match(formatted, /2026/);
  assert.match(formatted, /08:00/);
});

test("isLocalWeekend identifies Saturdays and Sundays in Kolkata time", () => {
  // 2026-10-24T03:30:00Z is Saturday in IST
  assert.equal(isLocalWeekend("2026-10-24T03:30:00.000Z"), true);
  // 2026-10-25T03:30:00Z is Sunday in IST
  assert.equal(isLocalWeekend("2026-10-25T03:30:00.000Z"), true);
  // 2026-10-23T02:30:00Z is Friday in IST
  assert.equal(isLocalWeekend("2026-10-23T02:30:00.000Z"), false);
});
