"use client";

import React from "react";
import type { Shift, Dispute } from "@/lib/api-client/types";
import { Badge } from "../common/Badge";
import { formatPaise, formatDiscrepancy } from "@/lib/api-client/currency";
import { formatDateTimeKolkata, formatTimeOnlyKolkata, formatMinutes } from "@/lib/api-client/formatters";
import { useI18n } from "@/lib/i18n/context";

interface ShiftCardProps {
  shift: Shift;
  dispute?: Dispute | null;
  onCheckIn: (shiftId: string) => void;
  onCheckOut: (shift: Shift) => void;
  onViewBreakdown: (shift: Shift) => void;
  onRaiseDispute: (shift: Shift) => void;
  onViewDispute: (dispute: Dispute) => void;
  isCheckInLoading?: boolean;
}

export function ShiftCard({
  shift,
  dispute,
  onCheckIn,
  onCheckOut,
  onViewBreakdown,
  onRaiseDispute,
  onViewDispute,
  isCheckInLoading,
}: ShiftCardProps) {
  const { t } = useI18n();
  const discrepancy = formatDiscrepancy(shift.differenceMinor, shift.comparisonStatus);

  return (
    <div className="bg-white rounded-xl border border-slate-200 shadow-xs hover:border-slate-300 transition-all p-4 sm:p-5 flex flex-col justify-between gap-4">
      {/* Top Header: Title, Sector and Shift Status */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-100 pb-3">
        <div>
          <div className="flex items-center gap-2 flex-wrap">
            <h3 className="text-base font-bold text-slate-900 tracking-tight">
              {shift.siteLabel}
            </h3>
            <Badge variant={shift.sector === "construction" ? "construction" : "campus"} size="sm">
              {shift.sector === "construction" ? "Civil Works" : "Campus Support"}
            </Badge>
          </div>
          <div className="text-xs text-slate-500 mt-0.5">
            Scheduled: {formatDateTimeKolkata(shift.scheduledStartAt)} — {formatTimeOnlyKolkata(shift.scheduledEndAt)}
          </div>
        </div>

        <div className="flex items-center gap-2 self-start sm:self-center">
          <Badge
            variant={
              shift.status === "PLANNED"
                ? "planned"
                : shift.status === "CHECKED_IN"
                ? "checked_in"
                : "completed"
            }
          >
            {shift.status === "PLANNED"
              ? "Planned"
              : shift.status === "CHECKED_IN"
              ? "Checked In"
              : "Completed"}
          </Badge>
        </div>
      </div>

      {/* Middle Grid: Financials & Attendance */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 bg-slate-50/70 p-3 rounded-lg border border-slate-100 text-xs">
        <div>
          <span className="text-slate-500 block">{t("workedTime")}</span>
          <span className="font-semibold text-slate-800 text-sm">
            {shift.earnings ? formatMinutes(shift.earnings.workedMinutes) : "—"}
          </span>
          {shift.unpaidBreakMinutes > 0 && (
            <span className="text-[11px] text-slate-400 block font-normal">
              {t("unpaidBreak")}: {shift.unpaidBreakMinutes}m
            </span>
          )}
        </div>

        <div>
          <span className="text-slate-500 block">{t("moneyIShouldGet")}</span>
          <span className="font-semibold text-emerald-800 text-sm">
            {shift.earnings ? formatPaise(shift.earnings.expectedMinor) : t("loading")}
          </span>
        </div>

        <div>
          <span className="text-slate-500 block">{t("moneyMyEmployerEntered")}</span>
          <span className="font-semibold text-slate-900 text-sm">
            {shift.recordedAmountMinor !== null ? formatPaise(shift.recordedAmountMinor) : t("statusNotRecorded")}
          </span>
        </div>

        <div>
          <span className="text-slate-500 block">{t("moneyStillMissing")}</span>
          <div className="mt-0.5">
            <Badge variant={discrepancy.badgeVariant} size="sm">
              {shift.comparisonStatus === "MATCHED"
                ? t("statusMatchedPay")
                : shift.comparisonStatus === "UNDERPAID"
                ? t("statusUnderpaid")
                : shift.comparisonStatus === "OVERPAID"
                ? t("statusOverpaid")
                : t("statusNotRecorded")}
            </Badge>
          </div>
        </div>
      </div>

      {/* Discrepancy Alert Bar (if underpaid) */}
      {shift.comparisonStatus === "UNDERPAID" && (
        <div className="flex items-center justify-between p-2.5 bg-amber-50 border border-amber-200 rounded-lg text-xs text-amber-950">
          <div className="flex items-center gap-2">
            <span className="text-sm">⚠️</span>
            <span className="font-semibold">{discrepancy.formattedAmount}</span>
            <span className="text-slate-600 hidden sm:inline">— {t("moneyStillMissing")}</span>
          </div>
        </div>
      )}

      {/* Active Dispute Status Bar (if any) */}
      {dispute && (
        <div className="flex items-center justify-between p-2.5 bg-sky-50 border border-sky-200 rounded-lg text-xs text-sky-950">
          <div className="flex items-center gap-2">
            <span>⚖️</span>
            <span className="font-semibold">{t("complaintStatus")}</span>
            <Badge
              variant={
                dispute.status === "OPEN" ? "open" : dispute.status === "APPROVED" ? "approved" : "rejected"
              }
              size="sm"
            >
              {dispute.status === "OPEN"
                ? t("complaintOpen")
                : dispute.status === "APPROVED"
                ? t("complaintApproved")
                : t("complaintRejected")}
            </Badge>
          </div>
          <button
            type="button"
            onClick={() => onViewDispute(dispute)}
            className="text-xs font-semibold text-blue-700 hover:text-blue-900 underline"
          >
            {t("complaintViewDetail")}
          </button>
        </div>
      )}

      {/* Action Footer */}
      <div className="flex items-center justify-between gap-2 pt-2 border-t border-slate-100 flex-wrap">
        <div className="text-[11px] text-slate-400 font-mono">
          ID: {shift.id.slice(0, 8)}…
        </div>

        <div className="flex items-center gap-2">
          {shift.status === "PLANNED" && (
            <button
              type="button"
              onClick={() => onCheckIn(shift.id)}
              disabled={isCheckInLoading}
              className="px-4 py-2.5 text-sm font-semibold text-white bg-blue-600 rounded-xl hover:bg-blue-700 transition-colors disabled:opacity-50 flex items-center gap-1.5 min-h-[44px]"
            >
              <span>✅ {t("checkIn")}</span>
            </button>
          )}

          {shift.status === "CHECKED_IN" && (
            <button
              type="button"
              onClick={() => onCheckOut(shift)}
              className="px-4 py-2.5 text-sm font-semibold text-white bg-indigo-600 rounded-xl hover:bg-indigo-700 transition-colors flex items-center gap-1.5 min-h-[44px]"
            >
              <span>🏁 {t("checkOut")}</span>
            </button>
          )}

          {shift.status === "COMPLETED" && (
            <>
              <button
                type="button"
                onClick={() => onViewBreakdown(shift)}
                className="px-3 py-2 text-xs font-medium text-slate-700 bg-white border border-slate-300 rounded-xl hover:bg-slate-50 transition-colors min-h-[44px]"
              >
                {t("viewPayDetails")}
              </button>

              {(!dispute || dispute.status !== "OPEN") && (
                <button
                  type="button"
                  onClick={() => onRaiseDispute(shift)}
                  className="px-3 py-2 text-xs font-semibold text-amber-900 bg-amber-50 border border-amber-300 rounded-xl hover:bg-amber-100 transition-colors min-h-[44px]"
                >
                  ⚠️ {t("reportMissingMoney")}
                </button>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}
