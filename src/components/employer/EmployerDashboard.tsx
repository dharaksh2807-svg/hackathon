"use client";

import React, { useState } from "react";
import type {
  Shift,
  Dispute,
  DashboardResponse,
  PortalIdentity,
  ResolveDisputeRequest,
  OrgWorker,
} from "@/lib/api-client/types";
import { Badge } from "../common/Badge";
import { RecordPayModal } from "./RecordPayModal";
import { ResolveDisputeModal } from "./ResolveDisputeModal";
import { AddWorkerModal } from "./AddWorkerModal";
import { DisputeDetailModal } from "../disputes/DisputeDetailModal";
import { EmptyState } from "../common/EmptyState";
import { formatPaise, formatDiscrepancy } from "@/lib/api-client/currency";
import { formatDateTimeKolkata, formatMinutes } from "@/lib/api-client/formatters";
import { useI18n } from "@/lib/i18n/context";
import { useToast } from "../common/Toast";

interface EmployerDashboardProps {
  persona: PortalIdentity;
  shifts: Shift[];
  disputes: Dispute[];
  dashboardData: DashboardResponse["data"] | null;
  workers: OrgWorker[];
  onSetRecordedPay: (shiftId: string, amountMinor: number) => Promise<void>;
  onResolveDispute: (disputeId: string, req: ResolveDisputeRequest) => Promise<void>;
  onAddWorker: (workerName: string, workerEmail: string) => Promise<void>;
}

export function EmployerDashboard({
  persona,
  shifts,
  disputes,
  dashboardData,
  workers,
  onSetRecordedPay,
  onResolveDispute,
  onAddWorker,
}: EmployerDashboardProps) {
  const { showToast } = useToast();
  const { t } = useI18n();
  const [activeTab, setActiveTab] = useState<"DISCREPANCIES" | "DISPUTES" | "ALL_SHIFTS" | "WORKERS">("DISCREPANCIES");

  // Modals
  const [payModalShift, setPayModalShift] = useState<Shift | null>(null);
  const [resolveModalDispute, setResolveModalDispute] = useState<Dispute | null>(null);
  const [inspectDispute, setInspectDispute] = useState<Dispute | null>(null);
  const [showAddWorkerModal, setShowAddWorkerModal] = useState(false);

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

  const handleAddWorkerSubmit = async (workerName: string, workerEmail: string) => {
    await onAddWorker(workerName, workerEmail);
    showToast({
      type: "success",
      title: "Worker Invited",
      message: `${workerName} has been added to your organization with email ${workerEmail}.`,
    });
  };

  // Discrepant shifts (underpaid or unrecorded)
  const discrepantShifts = shifts.filter(
    (s) => s.status === "COMPLETED" && (s.comparisonStatus === "UNDERPAID" || s.comparisonStatus === "NOT_RECORDED")
  );

  const openDisputes = disputes.filter((d) => d.status === "OPEN");

  const workerCount = dashboardData?.workerCount ?? workers.length;
  const wageScale = Math.max(dashboardData?.totalExpectedMinor ?? 0, dashboardData?.totalRecordedMinor ?? 0, 1);
  const sections = [
    { id: "DISCREPANCIES", title: "Pay to Review", detail: "Check pay differences", icon: "💰", count: discrepantShifts.length, color: "from-amber-700 to-amber-800" },
    { id: "DISPUTES", title: "Dispute Review Queue", detail: "Review and resolve complaints", icon: "🙋", count: openDisputes.length, color: "from-blue-600 to-blue-700" },
    { id: "ALL_SHIFTS", title: "Recent Shifts", detail: "View shift records", icon: "📅", count: shifts.length, color: "from-emerald-700 to-emerald-800" },
    { id: "WORKERS", title: "Workers", detail: "Manage your team", icon: "👥", count: workers.length, color: "from-violet-600 to-violet-700" },
  ] as const;
  const selectedSection = sections.find(section => section.id === activeTab)!;

  return (
    <div className="space-y-6 min-w-0">
      <div className="bg-gradient-to-br from-slate-900 to-slate-800 rounded-2xl p-5 sm:p-7 text-white shadow-sm">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-5">
          <div className="min-w-0 space-y-2">
            <p className="text-sm font-semibold text-blue-200">{t("employerPortal")}</p>
            <h1 className="text-2xl sm:text-3xl font-black tracking-tight break-words">{persona.organizationName}</h1>
            <p className="text-sm text-slate-300">Your team, shifts and pay — all in one place.</p>
          </div>
            <button
              type="button"
              id="add-worker-btn"
              onClick={() => setShowAddWorkerModal(true)}
              className="min-h-[48px] flex items-center justify-center gap-2 px-5 py-3 text-sm font-bold text-white bg-blue-600 hover:bg-blue-700 rounded-xl transition-colors shadow-lg shadow-blue-950/30 shrink-0"
            >
              <svg
                className="w-3.5 h-3.5"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                strokeWidth={2.5}
              >
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
              </svg>
              Add Worker
            </button>
        </div>
        <div className="mt-6 flex flex-wrap gap-2 text-xs font-medium text-slate-200">
          <span className="rounded-lg bg-white/10 px-3 py-2">👥 {workerCount} {workerCount === 1 ? "worker" : "workers"}</span>
          <span className="rounded-lg bg-white/10 px-3 py-2">📅 {dashboardData?.totalShifts ?? shifts.length} shifts this month</span>
          <span className="rounded-lg bg-white/10 px-3 py-2">{dashboardData?.month ?? "Selected reporting month"}</span>
        </div>
      </div>

      <div className="grid grid-cols-1 min-[400px]:grid-cols-2 xl:grid-cols-4 gap-4">
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-5 space-y-3">
          <div className="flex items-center justify-between gap-2">
            <span className="text-sm font-semibold text-slate-600">{t("expectedLegend")}</span>
            <span className="flex items-center justify-center w-11 h-11 rounded-xl bg-emerald-50 text-xl" aria-hidden="true">💰</span>
          </div>
          <p className="text-3xl font-black tracking-tight text-emerald-700 break-words">{dashboardData ? formatPaise(dashboardData.totalExpectedMinor) : "—"}</p>
          <p className="text-xs text-slate-500">{dashboardData?.completedShifts ?? 0} completed shifts this month</p>
        </div>
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-5 space-y-3">
          <div className="flex items-center justify-between gap-2">
            <span className="text-sm font-semibold text-slate-600">Employer Recorded Pay</span>
            <span className="flex items-center justify-center w-11 h-11 rounded-xl bg-blue-50 text-xl" aria-hidden="true">📋</span>
          </div>
          <p className="text-3xl font-black tracking-tight text-slate-900 break-words">{dashboardData ? formatPaise(dashboardData.totalRecordedMinor) : "—"}</p>
          <p className="text-xs text-slate-500">{dashboardData?.recordedCount ?? 0} shifts with pay entered</p>
        </div>
        <div className="rounded-2xl border border-amber-200 bg-amber-50/70 shadow-sm p-5 space-y-3">
          <div className="flex items-center justify-between gap-2">
            <span className="text-sm font-semibold text-amber-950">Underpaid Shifts</span>
            <span className="flex items-center justify-center w-11 h-11 rounded-xl bg-amber-100 text-xl" aria-hidden="true">⚠️</span>
          </div>
          <p className="text-3xl font-black tracking-tight text-amber-950">{dashboardData?.underpaidShifts ?? 0}</p>
          <p className="text-xs text-amber-900">Recorded pay below the expected amount</p>
        </div>
        <div className="rounded-2xl border border-blue-200 bg-blue-50/70 shadow-sm p-5 space-y-3">
          <div className="flex items-center justify-between gap-2">
            <span className="text-sm font-semibold text-blue-950">Open Disputes</span>
            <span className="flex items-center justify-center w-11 h-11 rounded-xl bg-blue-100 text-xl" aria-hidden="true">🙋</span>
          </div>
          <p className="text-3xl font-black tracking-tight text-blue-950">{openDisputes.length}</p>
          <p className="text-xs text-blue-900">Worker complaints waiting for your review</p>
        </div>
      </div>

      <section aria-labelledby="employer-wages-title" className="bg-white rounded-2xl border border-slate-200 shadow-sm p-5 sm:p-6 space-y-5">
        <div>
          <h2 id="employer-wages-title" className="text-lg sm:text-xl font-black text-slate-900">Wage overview</h2>
          <p className="mt-1 text-sm text-slate-500">Expected wages and employer entries for the selected month.</p>
        </div>
        {[
          { label: t("expectedLegend"), amount: dashboardData?.totalExpectedMinor, color: "bg-emerald-500", text: "text-emerald-700" },
          { label: "Employer Recorded Pay", amount: dashboardData?.totalRecordedMinor, color: "bg-blue-500", text: "text-blue-700" },
        ].map(item => (
          <div key={item.label} className="space-y-2">
            <div className="flex flex-wrap items-center justify-between gap-2 text-sm">
              <span className="font-semibold text-slate-600">{item.label}</span>
              <span className={`font-black ${item.text}`}>{item.amount === undefined ? "—" : formatPaise(item.amount)}</span>
            </div>
            <div className="h-3 rounded-full bg-slate-100 overflow-hidden" aria-hidden="true">
              <div className={`h-full rounded-full ${item.color}`} style={{ width: `${((item.amount ?? 0) / wageScale) * 100}%` }} />
            </div>
          </div>
        ))}
        <p className="text-xs text-slate-500">Employer entries are records, not confirmation that payment was received.</p>
      </section>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3" role="group" aria-label="Employer dashboard sections">
        {sections.map(section => (
          <button key={section.id} id={`employer-nav-${section.id}`} type="button"
            aria-label={`${section.title} (${section.count}) — ${section.detail}`}
            onClick={() => setActiveTab(section.id)} aria-pressed={activeTab === section.id} aria-controls="employer-records"
            className={`bg-gradient-to-br ${section.color} text-white rounded-2xl p-4 text-left min-h-[140px] shadow-md hover:shadow-lg active:scale-[0.98] transition-all focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-blue-600 ${activeTab === section.id ? "ring-2 ring-offset-2 ring-slate-900" : ""}`}>
            <div className="flex items-center justify-between gap-2 mb-3">
              <span className="w-10 h-10 rounded-xl bg-white/20 flex items-center justify-center text-2xl" aria-hidden="true">{section.icon}</span>
              <span className="rounded-full bg-black/15 px-2.5 py-1 text-xs font-bold">{section.count}</span>
            </div>
            <span className="block font-black text-sm sm:text-base leading-snug">{section.title}</span>
            <span className="block text-xs text-white mt-1">{section.detail}</span>
          </button>
        ))}
      </div>

      <section id="employer-records" aria-labelledby={`employer-nav-${activeTab}`} className="min-w-0 bg-white rounded-2xl border border-slate-200 shadow-sm p-4 sm:p-6 space-y-5">
        <div className="border-b border-slate-100 pb-4">
          <h2 className="text-xl font-black tracking-tight text-slate-900">{selectedSection.title}</h2>
          <p className="text-sm text-slate-500 mt-1">{selectedSection.detail}{activeTab === "ALL_SHIFTS" ? " — up to 20 recent shifts this month." : "."}</p>
        </div>
      {/* TAB 1: Wage Discrepancies & Recorded Pay Table */}
      {activeTab === "DISCREPANCIES" && (
        <div className="space-y-4">
          <div className="flex items-center justify-between text-xs text-slate-600">
            <p>
              Up to 20 recent shifts this month that are underpaid or awaiting a pay entry. Summary totals cover the full month.
            </p>
          </div>

          {discrepantShifts.length === 0 ? (
            <EmptyState
              title="No Wage Discrepancies Found"
              description="No pay differences in the recent shifts shown. Check the monthly summary for all shifts."
            />
          ) : (
            <div className="border border-slate-200 rounded-2xl overflow-hidden bg-white">
              <div className="md:hidden divide-y divide-slate-100">
                {discrepantShifts.map(shift => <MobileShiftRecord key={shift.id} shift={shift} onEdit={setPayModalShift} />)}
              </div>
              <div className="hidden md:block overflow-x-auto">
                <table className="w-full min-w-[760px] text-sm text-left">
                  <thead className="bg-slate-50 text-slate-700 font-semibold border-b border-slate-200 uppercase text-xs tracking-wider">
                    <tr>
                      <th className="py-3 px-4">Shift Details</th>
                      <th className="py-3 px-4">Worked Time</th>
                      <th className="py-3 px-4 text-right">Expected Pay</th>
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
                              className="min-h-[44px] px-4 py-2 text-xs font-bold text-white bg-blue-600 hover:bg-blue-700 rounded-xl transition-colors whitespace-nowrap"
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

      {/* TAB 2: Dispute Review Queue */}
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
                    className="p-5 bg-white rounded-2xl border border-slate-200 shadow-sm space-y-4"
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
                            onClick={() => {
                              setResolveModalDispute(dispute);
                            }}
                            className="min-h-[44px] px-4 py-2 text-sm font-bold text-white bg-blue-600 hover:bg-blue-700 rounded-xl transition-colors"
                          >
                            Review Dispute
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

      {/* TAB 3: All Organization Shifts */}
      {activeTab === "ALL_SHIFTS" && (
        <div className="border border-slate-200 rounded-2xl overflow-hidden bg-white">
          <div className="md:hidden divide-y divide-slate-100">
            {shifts.map(shift => <MobileShiftRecord key={shift.id} shift={shift} onEdit={setPayModalShift} />)}
          </div>
          <div className="hidden md:block overflow-x-auto">
            <table className="w-full min-w-[760px] text-sm text-left">
              <thead className="bg-slate-50 text-slate-700 font-semibold border-b border-slate-200 uppercase text-xs tracking-wider">
                <tr>
                  <th className="py-3 px-4">Site / Role</th>
                  <th className="py-3 px-4">Shift Status</th>
                  <th className="py-3 px-4">Worked Time</th>
                  <th className="py-3 px-4 text-right">Expected Pay</th>
                  <th className="py-3 px-4 text-right">Recorded Amount</th>
                  <th className="py-3 px-4">Pay Comparison</th>
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

      {/* TAB 4: Worker Roster */}
      {activeTab === "WORKERS" && (
        <div className="space-y-4">
          {/* Header with Add Worker button */}
          <div className="flex flex-col sm:flex-row gap-3 sm:items-center justify-between">
            <p className="text-xs text-slate-600">
              Workers enrolled in <strong>{persona.organizationName}</strong>. Each worker can
              check in to shifts and raise pay disputes.
            </p>

          </div>

          {workers.length === 0 ? (
            <EmptyState
              title="No Workers Yet"
              description="Add your first worker above. They will receive an invitation email and can immediately start recording shifts."
            />
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {workers.map((w) => {
                const initials = w.displayName
                  .split(" ")
                  .slice(0, 2)
                  .map((p) => p[0]?.toUpperCase() ?? "")
                  .join("");
                const joined = new Date(w.joinedAt);
                const joinedLabel = isNaN(joined.getTime())
                  ? w.joinedAt
                  : joined.toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" });

                return (
                  <div
                    key={w.membershipId}
                    className="flex items-start gap-3 p-5 bg-violet-50/30 rounded-2xl border border-violet-100 shadow-sm hover:border-violet-300 transition-colors"
                  >
                    {/* Avatar */}
                    <div className="w-12 h-12 rounded-xl bg-violet-100 text-violet-800 flex items-center justify-center font-black text-sm shrink-0 select-none">
                      {initials || "?"}
                    </div>

                    {/* Details */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-semibold text-slate-900 text-sm truncate">
                          {w.displayName}
                        </span>
                        <Badge variant="planned" size="sm">
                          Worker
                        </Badge>
                      </div>
                      {w.workerEmail && (
                        <div className="text-xs text-slate-500 mt-0.5 truncate">{w.workerEmail}</div>
                      )}
                      <div className="text-[11px] text-slate-400 mt-1">Joined {joinedLabel}</div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      </section>

      {/* Modals */}
      <RecordPayModal
        key={payModalShift?.id ?? "pay-closed"}
        shift={payModalShift}
        isOpen={Boolean(payModalShift)}
        onClose={() => setPayModalShift(null)}
        onSubmit={handleRecordPaySubmit}
      />

      <ResolveDisputeModal
        key={resolveModalDispute?.id ?? "resolve-closed"}
        dispute={resolveModalDispute}
        shift={resolveModalDispute ? shifts.find((s) => s.id === resolveModalDispute.shiftId) ?? null : null}
        isOpen={Boolean(resolveModalDispute)}
        onClose={() => setResolveModalDispute(null)}
        onSubmit={handleResolveDisputeSubmit}
      />

      <DisputeDetailModal
        dispute={inspectDispute}
        shift={inspectDispute ? shifts.find((s) => s.id === inspectDispute.shiftId) : null}
        isOpen={Boolean(inspectDispute)}
        onClose={() => setInspectDispute(null)}
        isEmployer={true}
      />

      <AddWorkerModal
        key={showAddWorkerModal ? "add-open" : "add-closed"}
        isOpen={showAddWorkerModal}
        organizationName={persona.organizationName}
        onClose={() => setShowAddWorkerModal(false)}
        onSubmit={handleAddWorkerSubmit}
      />
    </div>
  );
}


function MobileShiftRecord({ shift, onEdit }: { shift: Shift; onEdit: (shift: Shift) => void }) {
  const comparison = formatDiscrepancy(shift.differenceMinor, shift.comparisonStatus);
  return (
    <article className="p-4 space-y-4">
      <div className="space-y-1">
        <h3 className="font-bold text-slate-900 break-words">{shift.siteLabel}</h3>
        <p className="text-xs text-slate-500">{formatDateTimeKolkata(shift.scheduledStartAt)}</p>
      </div>
      <div className="flex flex-wrap gap-2 items-center">
        <Badge variant={comparison.badgeVariant} size="sm">{comparison.badgeLabel}</Badge>
        <span className="text-xs font-medium text-slate-500">{shift.status.replaceAll("_", " ")}</span>
      </div>
      <div className="grid grid-cols-2 gap-3 text-xs">
        <div className="rounded-xl bg-emerald-50 p-3 space-y-1">
          <p className="text-emerald-900">Expected Pay</p>
          <p className="text-base font-black text-emerald-800 break-words">{shift.earnings ? formatPaise(shift.earnings.expectedMinor) : "—"}</p>
        </div>
        <div className="rounded-xl bg-blue-50 p-3 space-y-1">
          <p className="text-blue-900">Employer Recorded</p>
          <p className="text-base font-black text-blue-900 break-words">{shift.recordedAmountMinor !== null ? formatPaise(shift.recordedAmountMinor) : "Awaiting entry"}</p>
        </div>
      </div>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <span className="text-xs text-slate-500">Worked time: {shift.earnings ? formatMinutes(shift.earnings.workedMinutes) : "—"}</span>
        {shift.status === "COMPLETED" && <button type="button" onClick={() => onEdit(shift)} className="min-h-[44px] px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-sm font-bold">
          {shift.recordedAmountMinor !== null ? "Adjust Pay" : "Enter Pay"}
        </button>}
      </div>
    </article>
  );
}
