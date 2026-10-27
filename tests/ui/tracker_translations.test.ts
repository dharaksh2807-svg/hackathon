import test from "node:test";
import assert from "node:assert/strict";
import { TRANSLATIONS, type LangCode } from "../../src/lib/i18n/translations.ts";
import { FIXTURE_CONSTRUCTION_SHIFTS, FIXTURE_CAMPUS_SHIFTS } from "../../src/lib/api-client/fixtures.ts";

test("all supported languages contain daily earnings and home navigation keys", () => {
  const languages: LangCode[] = ["en", "hi", "ta", "te"];
  const requiredKeys = [
    "navDashboard",
    "dailyEarningsTitle",
    "dailyEarningsSubtitle",
    "timeframeWeekly",
    "timeframeMonthly",
    "expectedLegend",
    "recordedLegend",
    "differenceLegend",
    "tapBarHint",
    "workedHours",
    "shiftSite",
    "statusMatched",
    "statusPendingEntry",
    "statusShortfall",
    "noEarningsData",
    "noEarningsDesc",
  ] as const;

  for (const lang of languages) {
    const dict = TRANSLATIONS[lang];
    assert.ok(dict, `Dictionary missing for ${lang}`);
    for (const key of requiredKeys) {
      assert.ok(dict[key], `Missing translation key '${key}' in ${lang}`);
      assert.equal(typeof dict[key], "string", `Translation key '${key}' in ${lang} must be string`);
      assert.notEqual(dict[key].trim(), "", `Translation key '${key}' in ${lang} must not be empty`);
    }
  }
});

test("Home label translations are short and familiar across languages", () => {
  assert.equal(TRANSLATIONS.en.navDashboard, "Home");
  assert.equal(TRANSLATIONS.hi.navDashboard, "होम");
  assert.equal(TRANSLATIONS.ta.navDashboard, "முகப்பு");
  assert.equal(TRANSLATIONS.te.navDashboard, "హోమ్");
});

test("Completed shifts from fixtures have valid earnings and date data for tracker", () => {
  const allShifts = [...FIXTURE_CONSTRUCTION_SHIFTS, ...FIXTURE_CAMPUS_SHIFTS];
  const completed = allShifts.filter((s) => s.status === "COMPLETED");

  assert.ok(completed.length >= 4, "Expected at least 4 completed shifts in fixtures");

  for (const shift of completed) {
    assert.ok(shift.earnings, `Completed shift ${shift.id} missing earnings breakdown`);
    assert.ok(shift.earnings.expectedMinor > 0, `Expected pay must be > 0 for shift ${shift.id}`);
    assert.ok(shift.earnings.workedMinutes > 0, `Worked minutes must be > 0 for shift ${shift.id}`);
    assert.ok(shift.scheduledStartAt, `Missing start timestamp for shift ${shift.id}`);
    const date = new Date(shift.scheduledStartAt);
    assert.ok(!isNaN(date.getTime()), `Invalid start timestamp for shift ${shift.id}`);
  }
});
