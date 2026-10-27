/** Currency is INR paise (integer minor units). Never calculate payroll with JS floats. */
export type PayBasis = "HOURLY" | "PER_SHIFT";
export type PayRuleSnapshot = {
  basis: PayBasis;
  rateMinor: number;
  overtimeAfterMinutes: number;
  overtimeMultiplierBps: number;
  fixedAllowanceMinor: number;
  weekendBonusMinor: number;
  version: number;
};

export type EarningsBreakdown = {
  workedMinutes: number;
  regularMinor: number;
  overtimeMinor: number;
  fixedAllowanceMinor: number;
  weekendBonusMinor: number;
  expectedMinor: number;
};

export type ComparisonStatus = "MATCHED" | "UNDERPAID" | "OVERPAID" | "NOT_RECORDED";

function safeMinor(v: number): number {
  if (!Number.isSafeInteger(v) || v < 0 || v > 2_147_483_647) throw new RangeError("Invalid minor-unit amount");
  return v;
}

/** Round half up once per line item. All numerators and denominators are positive. */
export function roundHalfUp(numerator: bigint, denominator: bigint): number {
  if (numerator < 0n || denominator <= 0n) throw new RangeError("Invalid rounding arguments");
  const value = (numerator * 2n + denominator) / (2n * denominator);
  if (value > 2_147_483_647n) throw new RangeError("Amount overflow");
  return Number(value);
}

export function calculateExpectedPay(rule: PayRuleSnapshot, workedMinutes: number, weekendEligible: boolean): EarningsBreakdown {
  if (typeof weekendEligible !== "boolean") throw new RangeError("Invalid weekend eligibility");
  if (!Number.isSafeInteger(workedMinutes) || workedMinutes < 1 || workedMinutes > 1_440) throw new RangeError("Invalid worked minutes");
  for (const amount of [rule.rateMinor, rule.fixedAllowanceMinor, rule.weekendBonusMinor]) safeMinor(amount);
  if (!Number.isSafeInteger(rule.overtimeAfterMinutes) || rule.overtimeAfterMinutes < 0 || rule.overtimeAfterMinutes > 1_440) throw new RangeError("Invalid overtime threshold");
  if (!Number.isSafeInteger(rule.overtimeMultiplierBps) || rule.overtimeMultiplierBps < 10_000 || rule.overtimeMultiplierBps > 30_000) throw new RangeError("Invalid overtime multiplier");
  if (!Number.isSafeInteger(rule.version) || rule.version < 1) throw new RangeError("Invalid rule version");
  if (rule.basis === "HOURLY" && rule.overtimeAfterMinutes === 0) throw new RangeError("Hourly overtime threshold must be positive");
  if (rule.basis === "PER_SHIFT" && rule.overtimeAfterMinutes !== 0) throw new RangeError("Flat shift overtime threshold must be zero");

  let regularMinor: number;
  let overtimeMinor = 0;
  if (rule.basis === "HOURLY") {
    const regularMinutes = Math.min(workedMinutes, rule.overtimeAfterMinutes);
    const overtimeMinutes = Math.max(0, workedMinutes - rule.overtimeAfterMinutes);
    regularMinor = roundHalfUp(BigInt(rule.rateMinor) * BigInt(regularMinutes), 60n);
    overtimeMinor = roundHalfUp(
      BigInt(rule.rateMinor) * BigInt(overtimeMinutes) * BigInt(rule.overtimeMultiplierBps),
      60n * 10_000n,
    );
  } else if (rule.basis === "PER_SHIFT") {
    regularMinor = rule.rateMinor;
  } else {
    throw new RangeError("Invalid pay basis");
  }
  const fixedAllowanceMinor = rule.fixedAllowanceMinor;
  const weekendBonusMinor = weekendEligible ? rule.weekendBonusMinor : 0;
  const expectedMinor = safeMinor(regularMinor + overtimeMinor + fixedAllowanceMinor + weekendBonusMinor);
  return { workedMinutes, regularMinor, overtimeMinor, fixedAllowanceMinor, weekendBonusMinor, expectedMinor };
}

export function comparePay(expectedMinor: number, recordedMinor: number | null): { status: ComparisonStatus; differenceMinor: number | null } {
  safeMinor(expectedMinor);
  if (recordedMinor === null) return { status: "NOT_RECORDED", differenceMinor: null };
  safeMinor(recordedMinor);
  const differenceMinor = expectedMinor - recordedMinor;
  return {
    status: differenceMinor > 0 ? "UNDERPAID" : differenceMinor < 0 ? "OVERPAID" : "MATCHED",
    differenceMinor,
  };
}

/** Derive paid whole minutes from server timestamps and worker-attested unpaid breaks. */
export function getPaidMinutes(checkedInAtUtc: string, checkedOutAtUtc: string, unpaidBreakMinutes: number): number {
  if (!checkedInAtUtc.endsWith("Z") || !checkedOutAtUtc.endsWith("Z")) throw new RangeError("UTC timestamps required");
  const start = Date.parse(checkedInAtUtc);
  const end = Date.parse(checkedOutAtUtc);
  if (!Number.isFinite(start) || !Number.isFinite(end) || end <= start) throw new RangeError("Invalid attendance interval");
  if (!Number.isSafeInteger(unpaidBreakMinutes) || unpaidBreakMinutes < 0 || unpaidBreakMinutes > 1_440) throw new RangeError("Invalid break minutes");
  const wholeMinutes = Math.floor((end - start) / 60_000);
  const paidMinutes = wholeMinutes - unpaidBreakMinutes;
  if (paidMinutes < 1 || paidMinutes > 1_440) throw new RangeError("Paid shift must be 1–1440 minutes");
  return paidMinutes;
}

/** Local weekend applies to the scheduled start date, never the viewer's browser timezone. */
export function isWeekendKolkata(scheduledStartAtUtc: string): boolean {
  if (!scheduledStartAtUtc.endsWith("Z") || !Number.isFinite(Date.parse(scheduledStartAtUtc))) {
    throw new RangeError("UTC scheduled start required");
  }
  const weekday = new Intl.DateTimeFormat("en-US", { weekday: "short", timeZone: "Asia/Kolkata" })
    .format(new Date(scheduledStartAtUtc));
  return weekday === "Sat" || weekday === "Sun";
}
