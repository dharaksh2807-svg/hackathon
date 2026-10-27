"use client";

import React from "react";
import type { Shift, Dispute } from "@/lib/api-client/types";
import { Modal } from "../common/Modal";
import { Badge } from "../common/Badge";
import { formatPaise, formatDiscrepancy } from "@/lib/api-client/currency";
import { formatDateTimeKolkata, formatMinutes } from "@/lib/api-client/formatters";

interface EarningsBreakdownModalProps {
  shift: Shift | null;
  dispute?: Dispute | null;
  isOpen: boolean;
  onClose: () => void;
  onRaiseDispute: (shift: Shift) => void;
  onViewDispute: (dispute: Dispute) => void;
}

export function EarningsBreakdownModal({
  shift,
  dispute,
  isOpen,
  onClose,
  onRaiseDispute,
  onViewDispute,
}: EarningsBreakdownModalProps) {
  if (!shift) return null;

  const earnings = shift.earnings;
  const discrepancy = formatDiscrepancy(shift.differenceMinor, shift.comparisonStatus);

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Statutory Shift Earnings Breakdown"
      description={`Audit record for ${shift.siteLabel} (${shift.sector === "construction" ? "Civil Works" : "Campus Facilities"})`}
      maxWidth="lg"
      footer={
        <div className="flex items-center justify-between w-full">
          <div className="text-xs text-slate-500 font-mono">
            Shift ID: {shift.id.slice(0, 8)}…
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onClose}
              className="px-3.5 py-1.5 text-xs font-medium text-slate-700 bg-white border border-slate-300 rounded-lg hover:bg-slate-50"
            >
              Close
            </button>
            {dispute ? (
              <button
                type="button"
                onClick={() => {
                  onClose();
                  onViewDispute(dispute);
                }}
                className="px-3.5 py-1.5 text-xs font-semibold text-sky-900 bg-sky-100 border border-sky-300 rounded-lg hover:bg-sky-200"
              >
                Inspect Dispute ({dispute.status})
              </button>
            ) : shift.status === "COMPLETED" ? (
              <button
                type="button"
                onClick={() => {
                  onClose();
                  onRaiseDispute(shift);
                }}
                className="px-3.5 py-1.5 text-xs font-semibold text-white bg-amber-600 rounded-lg hover:bg-amber-700 transition-colors"
              >
                Raise Wage Dispute
              </button>
            ) : null}
          </div>
        </div>
      }
    >
      {/* Shift Time and Attendance Summary */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 p-3 bg-slate-50 rounded-lg border border-slate-200 text-xs">
        <div>
          <span className="text-slate-500 block">Scheduled Start</span>
          <span className="font-medium text-slate-800">{formatDateTimeKolkata(shift.scheduledStartAt)}</span>
        </div>
        <div>
          <span className="text-slate-500 block">Actual Checked In</span>
          <span className="font-medium text-slate-800">{formatDateTimeKolkata(shift.checkedInAt)}</span>
        </div>
        <div>
          <span className="text-slate-500 block">Actual Checked Out</span>
          <span className="font-medium text-slate-800">{formatDateTimeKolkata(shift.checkedOutAt)}</span>
        </div>
        <div>
          <span className="text-slate-500 block">Unpaid Break</span>
          <span className="font-medium text-slate-800">{shift.unpaidBreakMinutes} mins</span>
        </div>
      </div>

      {/* Discrepancy Callout Banner */}
      <div
        className={`p-3.5 rounded-lg border flex items-start gap-3 ${
          shift.comparisonStatus === "UNDERPAID"
            ? "bg-amber-50 border-amber-300 text-amber-950"
            : shift.comparisonStatus === "MATCHED"
            ? "bg-emerald-50 border-emerald-300 text-emerald-950"
            : "bg-slate-50 border-slate-300 text-slate-900"
        }`}
      >
        <div className="text-lg">
          {shift.comparisonStatus === "UNDERPAID" ? "⚠️" : shift.comparisonStatus === "MATCHED" ? "✅" : "ℹ️"}
        </div>
        <div className="space-y-0.5 text-xs sm:text-sm">
          <div className="font-bold flex items-center gap-2">
            <span>{discrepancy.badgeLabel}</span>
            <Badge variant={discrepancy.badgeVariant} size="sm">
              {shift.comparisonStatus}
            </Badge>
          </div>
          <p className="text-slate-700 text-xs leading-relaxed">
            {discrepancy.description}
          </p>
        </div>
      </div>

      {/* Earnings Line-Item Table */}
      {earnings ? (
        <div className="border border-slate-200 rounded-lg overflow-hidden">
          <table className="w-full text-xs sm:text-sm text-left">
            <thead className="bg-slate-100/80 text-slate-700 font-semibold border-b border-slate-200 text-xs uppercase tracking-wider">
              <tr>
                <th className="py-2.5 px-3">Pay Component</th>
                <th className="py-2.5 px-3 text-right">Calculation Basis</th>
                <th className="py-2.5 px-3 text-right">Statutory Expected</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-slate-800">
              <tr>
                <td className="py-2.5 px-3">
                  <div className="font-medium">Regular Shift Pay</div>
                  <div className="text-xs text-slate-500">
                    {shift.sector === "construction" ? "Standard base hours (up to 8h)" : "Flat statutory shift rate"}
                  </div>
                </td>
                <td className="py-2.5 px-3 text-right text-slate-600 font-mono text-xs">
                  {shift.sector === "construction"
                    ? `${formatMinutes(Math.min(earnings.workedMinutes, 480))} @ ₹120/h`
                    : "Flat stipend"}
                </td>
                <td className="py-2.5 px-3 text-right font-medium text-slate-900">
                  {formatPaise(earnings.regularMinor)}
                </td>
              </tr>

              <tr>
                <td className="py-2.5 px-3">
                  <div className="font-medium">Overtime Pay (1.5× Rate)</div>
                  <div className="text-xs text-slate-500">
                    {shift.sector === "construction"
                      ? "Mandatory 150% multiplier beyond 480 minutes"
                      : "Not applicable for flat-rate contracts"}
                  </div>
                </td>
                <td className="py-2.5 px-3 text-right text-slate-600 font-mono text-xs">
                  {shift.sector === "construction" && earnings.workedMinutes > 480
                    ? `${formatMinutes(earnings.workedMinutes - 480)} @ ₹180/h`
                    : "—"}
                </td>
                <td className="py-2.5 px-3 text-right font-medium text-slate-900">
                  {formatPaise(earnings.overtimeMinor)}
                </td>
              </tr>

              <tr>
                <td className="py-2.5 px-3">
                  <div className="font-medium">Fixed Hazard / Site Allowance</div>
                  <div className="text-xs text-slate-500">Mandatory per-shift civil works safety stipend</div>
                </td>
                <td className="py-2.5 px-3 text-right text-slate-600 font-mono text-xs">
                  {shift.sector === "construction" ? "₹50.00 / shift" : "—"}
                </td>
                <td className="py-2.5 px-3 text-right font-medium text-slate-900">
                  {formatPaise(earnings.fixedAllowanceMinor)}
                </td>
              </tr>

              <tr>
                <td className="py-2.5 px-3">
                  <div className="font-medium">Weekend Duty Differential</div>
                  <div className="text-xs text-slate-500">Statutory premium for Saturday and Sunday roster</div>
                </td>
                <td className="py-2.5 px-3 text-right text-slate-600 font-mono text-xs">
                  {shift.sector === "campus" && earnings.weekendBonusMinor > 0 ? "Saturday / Sunday rate" : "—"}
                </td>
                <td className="py-2.5 px-3 text-right font-medium text-slate-900">
                  {formatPaise(earnings.weekendBonusMinor)}
                </td>
              </tr>
            </tbody>
            <tfoot className="bg-slate-50/90 font-semibold border-t-2 border-slate-300 text-slate-900 text-xs sm:text-sm">
              <tr>
                <td colSpan={2} className="py-2.5 px-3 text-right">
                  Total Expected Earnings:
                </td>
                <td className="py-2.5 px-3 text-right text-emerald-800 text-sm">
                  {formatPaise(earnings.expectedMinor)}
                </td>
              </tr>
              <tr>
                <td colSpan={2} className="py-2 px-3 text-right text-slate-600">
                  Employer-Recorded Pay:
                </td>
                <td className="py-2 px-3 text-right text-slate-900 text-sm font-medium">
                  {shift.recordedAmountMinor !== null ? formatPaise(shift.recordedAmountMinor) : "Not recorded yet"}
                </td>
              </tr>
              {shift.differenceMinor !== null && (
                <tr className={shift.differenceMinor > 0 ? "bg-amber-100/70 text-amber-950" : "bg-slate-100"}>
                  <td colSpan={2} className="py-2.5 px-3 text-right font-bold">
                    Net Variance (Expected - Recorded):
                  </td>
                  <td className="py-2.5 px-3 text-right font-bold text-sm">
                    {shift.differenceMinor > 0 ? `+${formatPaise(shift.differenceMinor)} (Underpaid)` : formatPaise(shift.differenceMinor)}
                  </td>
                </tr>
              )}
            </tfoot>
          </table>
        </div>
      ) : (
        <div className="p-4 bg-slate-50 rounded-lg text-slate-600 text-xs text-center border border-slate-200">
          Earnings breakdown calculation is finalized once shift attendance is marked COMPLETED.
        </div>
      )}
    </Modal>
  );
}
