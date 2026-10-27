"use client";

import React, { useState } from "react";
import type {
  Shift,
  Dispute,
  DashboardResponse,
  PortalIdentity,
  ResolveDisputeRequest,
} from "@/lib/api-client/types";
import { Badge } from "../common/Badge";
import { RecordPayModal } from "./RecordPayModal";
import { ResolveDisputeModal } from "./ResolveDisputeModal";
import { DisputeDetailModal } from "../disputes/DisputeDetailModal";
import { EmptyState } from "../common/EmptyState";
import { formatPaise, formatDiscrepancy } from "@/lib/api-client/currency";
import { formatDateTimeKolkata, formatMinutes } from "@/lib/api-client/formatters";
import { useToast } from "../common/Toast";

interface EmployerDashboardProps {
  persona: PortalIdentity;
  shifts: Shift[];
  disputes: Dispute[];
  dashboardData: DashboardResponse["data"] | null;
  onSetRecordedPay: (shiftId: string, amountMinor: number) => Promise<void>;
  onResolveDispute: (disputeId: string, req: ResolveDisputeRequest) => Promise<void>;
}

export function EmployerDashboard({
  persona,
  shifts,
  disputes,
  dashboardData,
  onSetRecordedPay,
  onResolveDispute,
}: EmployerDashboardProps) {
  const { showToast } = useToast();
  const [activeTab, setActiveTab] = useState<"DISCREPANCIES" | "DISPUTES" | "ALL_SHIFTS">("DISCREPANCIES");

  // Modals
  const [payModalShift, setPayModalShift] = useState<Shift | null>(null);
  const [resolveModalDispute, setResolveModalDispute] = useState<Dispute | null>(null);
  const [inspectDispute, setInspectDispute] = useState<Dispute | null>(null);

  const handleRecordPaySubmit = async (shiftId: string, amountMinor: number) => {
    await onSetRecordedPay(shiftId, amountMinor);
    showToast({
      type: "success",
      title: "Recorded Pay Saved",
      message: `Updated recorded amount to ${formatPaise(amountMinor)}. Parity status recalculated.`,
    });
  };

  const handleResolveDisputeSubmit = async (disputeId: string, req: ResolveDisputeRequest) => {
    await onResolveDispute(disputeId, req);
    showToast({
      type: req.decision === "APPROVED" ? "success" : "info",
      title: req.decision === "APPROVED" ? "Dispute Approved & Pay Adjusted" : "Dispute Rejected",
      message: "Adjudication decision and explanation recorded in immutable audit log.",
    });
  };

  // Discrepant shifts (underpaid or unrecorded)
  const discrepantShifts = shifts.filter(
    (s) => s.status === "COMPLETED" && (s.comparisonStatus === "UNDERPAID" || s.comparisonStatus === "NOT_RECORDED")
  );

  const openDisputes = disputes.filter((d) => d.status === "OPEN");

  return (
    <div className="space-y-6" aria-label={`${persona.organizationName} employer dashboard`}>
      {/* High-Level Overview Metrics */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Metric 1: Expected Shift Obligations */}
        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-xs space-y-1">
          <div className="flex items-center justify-between text-xs font-semibold text-slate-500 uppercase tracking-wider">
            <span>Configured Wage Expected</span>
            <span className="text-emerald-700 font-bold">Rule Engine</span>
          </div>
          <div className="text-2xl font-black text-slate-900 tracking-tight">
            {dashboardData ? formatPaise(dashboardData.totalExpectedMinor) : "₹0.00"}
          </div>
          <div className="text-xs text-slate-500">
            Across {dashboardData?.completedShifts ?? 0} completed shifts this month
          </div>
        </div>

        {/* Metric 2: Recorded / Recorded */}
        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-xs space-y-1">
          <div className="flex items-center justify-between text-xs font-semibold text-slate-500 uppercase tracking-wider">
            <span>Employer Recorded Pay</span>
            <span className="text-slate-600">Recorded</span>
          </div>
          <div className="text-2xl font-black text-slate-900 tracking-tight">
            {dashboardData ? formatPaise(dashboardData.totalRecordedMinor) : "₹0.00"}
          </div>
          <div className="text-xs text-slate-500">
            {dashboardData?.recordedCount ?? 0} pay entries logged
          </div>
        </div>

        {/* Metric 3: Underpaid Alert */}
        <div
          className={`p-5 rounded-xl border shadow-xs space-y-1 ${
            (dashboardData?.underpaidShifts ?? 0) > 0
              ? "bg-amber-50/70 border-amber-300 text-amber-950"
              : "bg-white border-slate-200 text-slate-900"
          }`}
        >
          <div className="flex items-center justify-between text-xs font-semibold uppercase tracking-wider">
            <span>Underpaid Shifts</span>
            {(dashboardData?.underpaidShifts ?? 0) > 0 && (
              <span className="text-amber-800 font-bold">Audit Flag</span>
            )}
          </div>
          <div className="text-2xl font-black tracking-tight">
            {dashboardData?.underpaidShifts ?? 0}
          </div>
          <div className="text-xs text-slate-600">
            {(dashboardData?.underpaidShifts ?? 0) > 0
              ? "Shifts where recorded pay is below configured expected"
              : "Full parity across recorded rosters"}
          </div>
        </div>

        {/* Metric 4: Outstanding Disputes */}
        <div
          className={`p-5 rounded-xl border shadow-xs space-y-1 ${
            openDisputes.length > 0
              ? "bg-sky-50/70 border-sky-300 text-sky-950"
              : "bg-white border-slate-200 text-slate-900"
          }`}
        >
          <div className="flex items-center justify-between text-xs font-semibold uppercase tracking-wider">
            <span>Open Disputes</span>
            {openDisputes.length > 0 && <span className="text-sky-800 font-bold">Action Queue</span>}
          </div>
          <div className="text-2xl font-black tracking-tight">
            {openDisputes.length}
          </div>
          <div className="text-xs text-slate-600">
            {openDisputes.length > 0
              ? "Worker disputes awaiting formal adjudication"
              : "All disputes resolved or closed"}
          </div>
        </div>
      </div>

      <p className="text-xs text-slate-500">Shift tables show up to 20 recent shifts for the selected month. Totals above cover the full month; disputes cover all dates.</p>

      {/* Tabs navigation */}
      <div className="border-b border-slate-200">
        <div className="flex items-center gap-2 overflow-x-auto text-xs sm:text-sm font-semibold">
          <button
            type="button"
            onClick={() => setActiveTab("DISCREPANCIES")}
            className={`py-3 px-4 border-b-2 font-medium transition-colors flex items-center gap-2 whitespace-nowrap ${
              activeTab === "DISCREPANCIES"
                ? "border-amber-600 text-amber-900 bg-amber-50/40"
                : "border-transparent text-slate-600 hover:text-slate-900"
            }`}
          >
            <span>Wage Discrepancies & Entries</span>
            {discrepantShifts.length > 0 && (
              <span className="bg-amber-100 text-amber-900 px-2 py-0.5 rounded-full text-xs">
                {discrepantShifts.length}
              </span>
            )}
          </button>

          <button
            type="button"
            onClick={() => setActiveTab("DISPUTES")}
            className={`py-3 px-4 border-b-2 font-medium transition-colors flex items-center gap-2 whitespace-nowrap ${
              activeTab === "DISPUTES"
                ? "border-sky-600 text-sky-900 bg-sky-50/40"
                : "border-transparent text-slate-600 hover:text-slate-900"
            }`}
          >
            <span>Dispute Adjudication Queue</span>
            {openDisputes.length > 0 && (
              <span className="bg-sky-100 text-sky-900 px-2 py-0.5 rounded-full text-xs">
                {openDisputes.length}
              </span>
            )}
          </button>

          <button
            type="button"
            onClick={() => setActiveTab("ALL_SHIFTS")}
            className={`py-3 px-4 border-b-2 font-medium transition-colors flex items-center gap-2 whitespace-nowrap ${
              activeTab === "ALL_SHIFTS"
                ? "border-slate-900 text-slate-900 bg-slate-100/50"
                : "border-transparent text-slate-600 hover:text-slate-900"
            }`}
          >
            <span>Recent Shift Roster ({shifts.length}, up to 20)</span>
          </button>
        </div>
      </div>

      {/* TAB 1: Wage Discrepancies & Recorded Pay Table */}
      {activeTab === "DISCREPANCIES" && (
        <div className="space-y-4">
          <div className="flex items-center justify-between text-xs text-slate-600">
            <p>
              Completed shifts that are currently underpaid or awaiting an employer pay entry.
            </p>
          </div>

          {discrepantShifts.length === 0 ? (
            <EmptyState
              title="No Wage Discrepancies Found"
              description="All completed shifts have employer-recorded pay that satisfies or exceeds configured expectations."
            />
          ) : (
            <div className="border border-slate-200 rounded-xl overflow-hidden bg-white shadow-xs">
              <div className="overflow-x-auto">
                <table className="w-full text-xs sm:text-sm text-left">
                  <thead className="bg-slate-50 text-slate-700 font-semibold border-b border-slate-200 uppercase text-xs tracking-wider">
                    <tr>
                      <th className="py-3 px-4">Shift Details</th>
                      <th className="py-3 px-4">Worked Time</th>
                      <th className="py-3 px-4 text-right">Configured Expected</th>
                      <th className="py-3 px-4 text-right">Employer Recorded</th>
                      <th className="py-3 px-4">Variance Status</th>
                      <th className="py-3 px-4 text-right">Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 text-slate-800">
                    {discrepantShifts.map((shift) => {
                      const disc = formatDiscrepancy(shift.differenceMinor, shift.comparisonStatus);
                      return (
                        <tr key={shift.id} className="hover:bg-slate-50/60 transition-colors">
                          <td className="py-3 px-4">
                            <div className="font-semibold text-slate-900">{shift.siteLabel}</div>
                            <div className="text-xs text-slate-500">
                              {formatDateTimeKolkata(shift.scheduledStartAt)}
                            </div>
                          </td>
                          <td className="py-3 px-4 text-slate-700">
                            {shift.earnings ? formatMinutes(shift.earnings.workedMinutes) : "—"}
                          </td>
                          <td className="py-3 px-4 text-right font-semibold text-emerald-800">
                            {shift.earnings ? formatPaise(shift.earnings.expectedMinor) : "—"}
                          </td>
                          <td className="py-3 px-4 text-right font-medium text-slate-900">
                            {shift.recordedAmountMinor !== null ? formatPaise(shift.recordedAmountMinor) : "Awaiting entry"}
                          </td>
                          <td className="py-3 px-4">
                            <Badge variant={disc.badgeVariant} size="sm">
                              {disc.badgeLabel}
                            </Badge>
                          </td>
                          <td className="py-3 px-4 text-right">
                            <button
                              type="button"
                              onClick={() => setPayModalShift(shift)}
                              className="px-3 py-1.5 text-xs font-semibold text-white bg-slate-900 hover:bg-slate-800 rounded-lg transition-colors whitespace-nowrap"
                            >
                              {shift.recordedAmountMinor !== null ? "Adjust Pay" : "Enter Pay"}
                            </button>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      )}

      {/* TAB 2: Dispute Adjudication Queue */}
      {activeTab === "DISPUTES" && (
        <div className="space-y-4">
          {disputes.length === 0 ? (
            <EmptyState
              title="No Disputes on Record"
              description="No worker has opened a dispute in this organization."
            />
          ) : (
            <div className="grid grid-cols-1 gap-4">
              {disputes.map((dispute) => {
                const shift = shifts.find((s) => s.id === dispute.shiftId);
                return (
                  <div
                    key={dispute.id}
                    className="p-5 bg-white rounded-xl border border-slate-200 shadow-xs space-y-3"
                  >
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-100 pb-3">
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="font-bold text-slate-900 text-sm">
                            Dispute #{dispute.id.slice(0, 8)}…
                          </span>
                          <Badge
                            variant={
                              dispute.status === "OPEN"
                                ? "open"
                                : dispute.status === "APPROVED"
                                ? "approved"
                                : "rejected"
                            }
                            size="sm"
                          >
                            {dispute.status === "OPEN"
                              ? "Action Required"
                              : dispute.status === "APPROVED"
                              ? "Approved"
                              : "Rejected"}
                          </Badge>
                        </div>
                        <div className="text-xs text-slate-500 mt-0.5">
                          Filed on {formatDateTimeKolkata(dispute.createdAt)}
                          {shift ? ` for ${shift.siteLabel}` : ""}
                        </div>
                      </div>

                      <div className="flex items-center gap-2">
                        {dispute.status === "OPEN" ? (
                          <button
                            type="button"
                            onClick={() => setResolveModalDispute(dispute)}
                            className="px-3.5 py-1.5 text-xs font-semibold text-white bg-blue-600 hover:bg-blue-700 rounded-lg transition-colors"
                          >
                            Adjudicate Case
                          </button>
                        ) : (
                          <button
                            type="button"
                            onClick={() => setInspectDispute(dispute)}
                            className="px-3 py-1.5 text-xs font-medium text-slate-700 bg-white border border-slate-300 rounded-lg hover:bg-slate-50"
                          >
                            Inspect Audit Record
                          </button>
                        )}
                      </div>
                    </div>

                    {/* Dispute Body */}
                    <div className="p-3 bg-slate-50 rounded-lg border border-slate-200 text-xs sm:text-sm text-slate-800">
                      <span className="text-xs font-bold text-slate-500 uppercase tracking-wider block mb-1">
                        Worker&apos;s Reason:
                      </span>
                      &ldquo;{dispute.reason}&rdquo;
                    </div>

                    {/* Resolution explanation if resolved */}
                    {dispute.resolutionExplanation && (
                      <div className="p-3 bg-emerald-50/70 border border-emerald-200 rounded-lg text-xs text-emerald-950">
                        <span className="font-bold block mb-0.5">Employer Resolution Note:</span>
                        {dispute.resolutionExplanation}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* TAB 3: Recent Organization Shifts (up to 20) */}
      {activeTab === "ALL_SHIFTS" && (
        <div className="border border-slate-200 rounded-xl overflow-hidden bg-white shadow-xs">
          <div className="overflow-x-auto">
            <table className="w-full text-xs sm:text-sm text-left">
              <thead className="bg-slate-50 text-slate-700 font-semibold border-b border-slate-200 uppercase text-xs tracking-wider">
                <tr>
                  <th className="py-3 px-4">Site / Role</th>
                  <th className="py-3 px-4">Shift Status</th>
                  <th className="py-3 px-4">Worked Time</th>
                  <th className="py-3 px-4 text-right">Configured Expected</th>
                  <th className="py-3 px-4 text-right">Recorded Amount</th>
                  <th className="py-3 px-4">Comparison Parity</th>
                  <th className="py-3 px-4 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-slate-800">
                {shifts.map((shift) => {
                  const disc = formatDiscrepancy(shift.differenceMinor, shift.comparisonStatus);
                  return (
                    <tr key={shift.id} className="hover:bg-slate-50/60 transition-colors">
                      <td className="py-3 px-4">
                        <div className="font-semibold text-slate-900">{shift.siteLabel}</div>
                        <div className="text-xs text-slate-500">
                          {formatDateTimeKolkata(shift.scheduledStartAt)}
                        </div>
                      </td>
                      <td className="py-3 px-4">
                        <Badge
                          variant={
                            shift.status === "PLANNED"
                              ? "planned"
                              : shift.status === "CHECKED_IN"
                              ? "checked_in"
                              : "completed"
                          }
                          size="sm"
                        >
                          {shift.status}
                        </Badge>
                      </td>
                      <td className="py-3 px-4">
                        {shift.earnings ? formatMinutes(shift.earnings.workedMinutes) : "—"}
                      </td>
                      <td className="py-3 px-4 text-right font-semibold text-emerald-800">
                        {shift.earnings ? formatPaise(shift.earnings.expectedMinor) : "—"}
                      </td>
                      <td className="py-3 px-4 text-right font-medium text-slate-900">
                        {shift.recordedAmountMinor !== null ? formatPaise(shift.recordedAmountMinor) : "Not recorded"}
                      </td>
                      <td className="py-3 px-4">
                        <Badge variant={disc.badgeVariant} size="sm">
                          {disc.badgeLabel}
                        </Badge>
                      </td>
                      <td className="py-3 px-4 text-right">
                        {shift.status === "COMPLETED" && (
                          <button
                            type="button"
                            onClick={() => setPayModalShift(shift)}
                            className="px-2.5 py-1 text-xs font-medium text-slate-700 bg-white border border-slate-300 rounded hover:bg-slate-50"
                          >
                            Edit Pay
                          </button>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Modals */}
      <RecordPayModal
        key={payModalShift?.id ?? "closed"}
        shift={payModalShift}
        isOpen={Boolean(payModalShift)}
        onClose={() => setPayModalShift(null)}
        onSubmit={handleRecordPaySubmit}
      />

      <ResolveDisputeModal
        key={resolveModalDispute?.id ?? "closed"}
        dispute={resolveModalDispute}
        shift={resolveModalDispute ? shifts.find((s) => s.id === resolveModalDispute.shiftId) ?? null : null}
        isOpen={Boolean(resolveModalDispute)}
        onClose={() => setResolveModalDispute(null)}
        onSubmit={handleResolveDisputeSubmit}
      />

      <DisputeDetailModal
        dispute={disputes.find(dispute => dispute.id === inspectDispute?.id) ?? null}
        shift={inspectDispute ? shifts.find((s) => s.id === inspectDispute.shiftId) : null}
        isOpen={Boolean(inspectDispute)}
        onClose={() => setInspectDispute(null)}
        isEmployer={true}
      />
    </div>
  );
}
