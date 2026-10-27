/**
 * Currency conversion and formatting utilities for FairShift.
 * All monetary amounts in the contract are represented as integer paise (1 INR = 100 paise).
 */

export function formatPaise(paise: number | null | undefined): string {
  if (paise === null || paise === undefined) {
    return "—";
  }
  const isNegative = paise < 0;
  const absPaise = Math.abs(paise);
  const rupees = Math.floor(absPaise / 100);
  const remainder = absPaise % 100;
  const formatted = `${rupees.toLocaleString("en-IN")}.${remainder.toString().padStart(2, "0")}`;
  return isNegative ? `-₹${formatted}` : `₹${formatted}`;
}

export function formatPaiseCompact(paise: number | null | undefined): string {
  if (paise === null || paise === undefined) return "—";
  const isNegative = paise < 0;
  const absPaise = Math.abs(paise);
  const rupees = Math.round(absPaise / 100);
  const formatted = `₹${rupees.toLocaleString("en-IN")}`;
  return isNegative ? `-${formatted}` : formatted;
}

export function rupeesToPaise(rupeesInput: number | string): number {
  const text = String(rupeesInput).trim();
  if (!/^\d+(?:\.\d{1,2})?$/.test(text)) throw new RangeError("Enter a nonnegative rupee amount with at most two decimal places");
  const [whole, fraction = ""] = text.split(".");
  const minor = BigInt(whole) * 100n + BigInt(fraction.padEnd(2, "0"));
  if (minor > 2_147_483_647n) throw new RangeError("Amount exceeds the supported maximum");
  return Number(minor);
}

export function paiseToRupees(paise: number | null | undefined): string {
  if (paise === null || paise === undefined) return "0.00";
  return (paise / 100).toFixed(2);
}

export interface DiscrepancyFormat {
  formattedAmount: string;
  badgeLabel: string;
  badgeVariant: "matched" | "underpaid" | "overpaid" | "unrecorded";
  description: string;
  paise: number | null;
}

/**
 * Format shift discrepancy based on signed differenceMinor = expected - recorded.
 */
export function formatDiscrepancy(
  differenceMinor: number | null | undefined,
  comparisonStatus: "MATCHED" | "UNDERPAID" | "OVERPAID" | "NOT_RECORDED"
): DiscrepancyFormat {
  if (comparisonStatus === "NOT_RECORDED" || differenceMinor === null || differenceMinor === undefined) {
    return {
      formattedAmount: "Pending",
      badgeLabel: "Awaiting Pay Entry",
      badgeVariant: "unrecorded",
      description: "Employer has not yet recorded the pay for this completed shift.",
      paise: null,
    };
  }

  if (comparisonStatus === "MATCHED" || differenceMinor === 0) {
    return {
      formattedAmount: "₹0.00",
      badgeLabel: "Pay Matched",
      badgeVariant: "matched",
      description: "Recorded earnings precisely match statutory and rule calculations.",
      paise: 0,
    };
  }

  if (comparisonStatus === "UNDERPAID" || differenceMinor > 0) {
    return {
      formattedAmount: `Shortfall: ${formatPaise(differenceMinor)}`,
      badgeLabel: `Underpaid by ${formatPaise(differenceMinor)}`,
      badgeVariant: "underpaid",
      description: `Worker is owed ${formatPaise(differenceMinor)} (${differenceMinor.toLocaleString()} paise) above the recorded amount.`,
      paise: differenceMinor,
    };
  }

  // OVERPAID (differenceMinor < 0)
  const surplus = Math.abs(differenceMinor);
  return {
    formattedAmount: `Surplus: ${formatPaise(surplus)}`,
    badgeLabel: `Overpaid by ${formatPaise(surplus)}`,
    badgeVariant: "overpaid",
    description: `Employer recorded ${formatPaise(surplus)} more than statutory shift expectation.`,
    paise: differenceMinor,
  };
}
