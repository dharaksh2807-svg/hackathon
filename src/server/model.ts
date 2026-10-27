import { z } from "zod";
import { DisputeSchema, MoneyMinorSchema, SectorSchema, ShiftSchema } from "../lib/contracts";
import { calculateExpectedPay, comparePay, getPaidMinutes } from "../lib/pay";
import type { Shift } from "../lib/contracts";

const payRow = z.object({ amount_minor: MoneyMinorSchema });
export const ShiftRowSchema = z.object({
  id: z.string(), organization_id: z.string(), worker_membership_id: z.string(),
  site_label: z.string(), status: z.enum(["PLANNED", "CHECKED_IN", "COMPLETED"]),
  scheduled_start_at: z.string(), scheduled_end_at: z.string(),
  checked_in_at: z.string().nullable(), checked_out_at: z.string().nullable(),
  unpaid_break_minutes: z.number(), weekend_eligible: z.boolean(), rule_version: z.number(),
  pay_basis: z.enum(["HOURLY", "PER_SHIFT"]), rate_minor: z.number(), overtime_after_minutes: z.number(),
  overtime_multiplier_bps: z.number(), fixed_allowance_minor: z.number(), weekend_bonus_minor: z.number(),
  recorded_pay: z.union([payRow, z.array(payRow).max(1)]).nullable().optional(),
});
export const DisputeRowSchema = z.object({
  id: z.string(), organization_id: z.string(), shift_id: z.string(), opened_by_membership_id: z.string(),
  reason: z.string(), status: z.enum(["OPEN", "APPROVED", "REJECTED"]),
  resolution_explanation: z.string().nullable(), resolved_by_membership_id: z.string().nullable(),
  created_at: z.string(), resolved_at: z.string().nullable(),
});
export const PayRowSchema = z.object({ shift_id: z.string(), amount_minor: MoneyMinorSchema, entered_at: z.string() });
export const OrganizationRowSchema = z.object({ id: z.string(), name: z.string(), sector: SectorSchema });
export const MembershipRowSchema = z.object({
  id: z.string(), organization_id: z.string(), auth_user_id: z.string(), role: z.enum(["WORKER", "EMPLOYER"]),
});
export function utc(value: string): string { return new Date(value).toISOString(); }

export function shiftOutput(value: unknown, sector: z.infer<typeof SectorSchema>): Shift {
  const row = ShiftRowSchema.parse(value);
  const pay = Array.isArray(row.recorded_pay) ? row.recorded_pay[0] : row.recorded_pay;
  const recordedAmountMinor = pay?.amount_minor ?? null;
  const earnings = row.status === "COMPLETED" ? calculateExpectedPay({
    basis: row.pay_basis, rateMinor: row.rate_minor, overtimeAfterMinutes: row.overtime_after_minutes,
    overtimeMultiplierBps: row.overtime_multiplier_bps, fixedAllowanceMinor: row.fixed_allowance_minor,
    weekendBonusMinor: row.weekend_bonus_minor, version: row.rule_version,
  }, getPaidMinutes(utc(row.checked_in_at!), utc(row.checked_out_at!), row.unpaid_break_minutes), row.weekend_eligible) : null;
  const comparison = earnings ? comparePay(earnings.expectedMinor, recordedAmountMinor) : { status: "NOT_RECORDED", differenceMinor: null };
  return ShiftSchema.parse({
    id: row.id, organizationId: row.organization_id, workerMembershipId: row.worker_membership_id, sector,
    siteLabel: row.site_label, status: row.status, scheduledStartAt: utc(row.scheduled_start_at),
    scheduledEndAt: utc(row.scheduled_end_at), checkedInAt: row.checked_in_at ? utc(row.checked_in_at) : null,
    checkedOutAt: row.checked_out_at ? utc(row.checked_out_at) : null, unpaidBreakMinutes: row.unpaid_break_minutes,
    earnings, recordedAmountMinor, comparisonStatus: comparison.status, differenceMinor: comparison.differenceMinor,
  });
}
export function disputeOutput(value: unknown) {
  const r = DisputeRowSchema.parse(value);
  return DisputeSchema.parse({ id: r.id, organizationId: r.organization_id, shiftId: r.shift_id,
    openedByMembershipId: r.opened_by_membership_id, reason: r.reason, status: r.status,
    resolutionExplanation: r.resolution_explanation, resolvedByMembershipId: r.resolved_by_membership_id,
    createdAt: utc(r.created_at), resolvedAt: r.resolved_at ? utc(r.resolved_at) : null });
}
export function payOutput(value: unknown) {
  const r = PayRowSchema.parse(value);
  return { shiftId: r.shift_id, amountMinor: r.amount_minor, enteredAt: utc(r.entered_at) };
}

export function monthBounds(month: string): [string, string] {
  if (!/^\d{4}-(0[1-9]|1[0-2])$/.test(month)) throw new RangeError("Invalid month");
  const start = new Date(`${month}-01T00:00:00+05:30`);
  // start is the previous UTC date (18:30), so advance in the local calendar.
  const [year, m] = month.split("-").map(Number);
  const next = new Date(0);
  next.setUTCFullYear(year, m, 1);
  next.setUTCHours(0, 0, 0, 0);
  return [start.toISOString(), new Date(next.getTime() - 330 * 60_000).toISOString()];
}
export function totals(shifts: Shift[]) {
  const completed = shifts.filter(s => s.status === "COMPLETED");
  return {
    totalExpectedMinor: MoneyMinorSchema.parse(completed.reduce((n, s) => n + s.earnings!.expectedMinor, 0)),
    totalRecordedMinor: MoneyMinorSchema.parse(completed.reduce((n, s) => n + (s.recordedAmountMinor ?? 0), 0)),
    recordedCount: completed.filter(s => s.recordedAmountMinor !== null).length,
    completedCount: completed.length, underpaidCount: completed.filter(s => s.comparisonStatus === "UNDERPAID").length,
  };
}
