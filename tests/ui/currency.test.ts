import test from "node:test";
import assert from "node:assert/strict";
import {
  formatPaise,
  formatPaiseCompact,
  rupeesToPaise,
  paiseToRupees,
  formatDiscrepancy,
} from "../../src/lib/api-client/currency.ts";

test("formatPaise formats integer minor units to Indian currency with commas", () => {
  assert.equal(formatPaise(110000), "₹1,100.00");
  assert.equal(formatPaise(104000), "₹1,040.00");
  assert.equal(formatPaise(6000), "₹60.00");
  assert.equal(formatPaise(0), "₹0.00");
  assert.equal(formatPaise(null), "—");
  assert.equal(formatPaise(undefined), "—");
  assert.equal(formatPaise(-6000), "-₹60.00");
});

test("formatPaiseCompact formats whole rupee amounts compactly", () => {
  assert.equal(formatPaiseCompact(110000), "₹1,100");
  assert.equal(formatPaiseCompact(65000), "₹650");
  assert.equal(formatPaiseCompact(null), "—");
});

test("rupeesToPaise accurately converts numeric and string rupee inputs", () => {
  assert.equal(rupeesToPaise("1100"), 110000);
  assert.equal(rupeesToPaise("1040.00"), 104000);
  assert.equal(rupeesToPaise(650.5), 65050);
  assert.throws(() => rupeesToPaise(-10), RangeError);
  assert.throws(() => rupeesToPaise("invalid"), RangeError);
});

test("paiseToRupees converts integer paise to fixed 2-decimal string", () => {
  assert.equal(paiseToRupees(110000), "1100.00");
  assert.equal(paiseToRupees(6000), "60.00");
  assert.equal(paiseToRupees(null), "0.00");
});

test("formatDiscrepancy accurately identifies underpaid, matched, and pending shifts", () => {
  const underpaid = formatDiscrepancy(6000, "UNDERPAID");
  assert.equal(underpaid.badgeVariant, "underpaid");
  assert.equal(underpaid.badgeLabel, "Underpaid by ₹60.00");
  assert.equal(underpaid.paise, 6000);

  const matched = formatDiscrepancy(0, "MATCHED");
  assert.equal(matched.badgeVariant, "matched");
  assert.equal(matched.badgeLabel, "Pay Matched");
  assert.equal(matched.paise, 0);

  const pending = formatDiscrepancy(null, "NOT_RECORDED");
  assert.equal(pending.badgeVariant, "unrecorded");
  assert.equal(pending.badgeLabel, "Awaiting Pay Entry");
  assert.equal(pending.paise, null);

  const overpaid = formatDiscrepancy(-5000, "OVERPAID");
  assert.equal(overpaid.badgeVariant, "overpaid");
  assert.equal(overpaid.badgeLabel, "Overpaid by ₹50.00");
  assert.equal(overpaid.paise, -5000);
});


test("pay entry converts decimals exactly and rejects partial, overprecise or overflowing amounts", () => {
  assert.equal(rupeesToPaise("1.15"), 115);
  assert.equal(rupeesToPaise("0.29"), 29);
  assert.equal(rupeesToPaise("21474836.47"), 2147483647);
  for (const value of ["1.50junk", "1.005", "21474836.48", "1e3", ""]) {
    assert.throws(() => rupeesToPaise(value), RangeError);
  }
});
