"use client";

import React, { useState } from "react";
import type { Shift, Dispute, EarningsResponse, PortalIdentity } from "@/lib/api-client/types";
import { DailyEarningsTracker } from "./DailyEarningsTracker";
import { ShiftCard } from "./ShiftCard";
import { CheckOutModal } from "./CheckOutModal";
import { EarningsBreakdownModal } from "./EarningsBreakdownModal";
import { RaiseDisputeModal } from "../disputes/RaiseDisputeModal";
import { DisputeDetailModal } from "../disputes/DisputeDetailModal";
import { EmptyState } from "../common/EmptyState";
import { formatPaise } from "@/lib/api-client/currency";
import { useToast } from "../common/Toast";
import { useI18n } from "@/lib/i18n/context";

interface WorkerDashboardProps {
  persona: PortalIdentity;
  shifts: Shift[];
  disputes: Dispute[];
  earnings: EarningsResponse["data"] | null;
  onCheckIn: (shiftId: string) => Promise<void>;
  onCheckOut: (shiftId: string, unpaidBreakMinutes: number) => Promise<void>;
  onCreateDispute: (shiftId: string, reason: string) => Promise<void>;
  initialFilter?: "ALL" | "DISCREPANCIES" | "ACTIVE" | "COMPLETED";
}

export function WorkerDashboard({
  persona,
  shifts,
  disputes,
  earnings,
  onCheckIn,
  onCheckOut,
  onCreateDispute,
  initialFilter = "ALL",
}: WorkerDashboardProps) {
  const { showToast } = useToast();
  const { t } = useI18n();
  const [activeFilter, setActiveFilter] = useState<"ALL" | "DISCREPANCIES" | "ACTIVE" | "COMPLETED">(initialFilter);

  // Modal states
  const [checkoutShift, setCheckoutShift] = useState<Shift | null>(null);
  const [breakdownShift, setBreakdownShift] = useState<Shift | null>(null);
  const [disputeShift, setDisputeShift] = useState<Shift | null>(null);
  const [inspectDispute, setInspectDispute] = useState<Dispute | null>(null);
  const [checkInLoadingId, setCheckInLoadingId] = useState<string | null>(null);

  const handleCheckInClick = async (shiftId: string) => {
    setCheckInLoadingId(shiftId);
    try {
      await onCheckIn(shiftId);
      showToast({
        type: "success",
        title: "Checked In Successfully",
        message: "Attendance timestamp recorded from server time.",
      });
    } catch (err: unknown) {
      showToast({
        type: "error",
        title: "Check-In Failed",
        message: err instanceof Error ? err.message : "Unable to record check-in.",
      });
    } finally {
      setCheckInLoadingId(null);
    }
  };

  const handleCheckOutSubmit = async (shiftId: string, unpaidBreakMinutes: number) => {
    await onCheckOut(shiftId, unpaidBreakMinutes);
    showToast({
      type: "success",
      title: "Shift Completed & Attested",
      message: `Checked out with ${unpaidBreakMinutes}m break. Pay calculated based on shift rule snapshot.`,
    });
  };

  const handleCreateDisputeSubmit = async (shiftId: string, reason: string) => {
    await onCreateDispute(shiftId, reason);
    showToast({
      type: "warning",
      title: "Dispute Opened",
      message: "Wage dispute registered in the organization audit queue.",
    });
  };

  // Filter shifts
  const filteredShifts = shifts.filter((shift) => {
    if (activeFilter === "DISCREPANCIES") {
      return shift.comparisonStatus === "UNDERPAID" && Boolean(earnings?.shifts.some(item => item.id === shift.id));
    }
    if (activeFilter === "ACTIVE") {
      return shift.status === "PLANNED" || shift.status === "CHECKED_IN";
    }
    if (activeFilter === "COMPLETED") {
      return shift.status === "COMPLETED" && Boolean(earnings?.shifts.some(item => item.id === shift.id));
    }
    return true;
  });

  const underpaidCount = earnings?.underpaidCount ?? 0;
  const netShortfallPaise = (earnings?.shifts ?? [])
    .filter((s) => s.comparisonStatus === "UNDERPAID" && s.differenceMinor && s.differenceMinor > 0)
    .reduce((acc, s) => acc + (s.differenceMinor ?? 0), 0);

  return (
    <div className="space-y-6">
      {activeFilter === "COMPLETED" && <DailyEarningsTracker shifts={earnings?.shifts ?? []} />}
      {/* Monthly Earnings Summary Cards — worker-friendly labels */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Card 1: Expected Earnings */}
        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-xs space-y-1">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500 leading-tight">{t("moneyIShouldGet")}</span>
            <span className="text-lg">💰</span>
          </div>
          <div className="text-2xl font-black text-emerald-700 tracking-tight">
            {earnings ? formatPaise(earnings.totalExpectedMinor) : "₹0.00"}
          </div>
          <div className="text-xs text-slate-500">
            {earnings?.completedCount ?? 0} {t("completedShiftsCount")}
          </div>
        </div>

        {/* Card 2: Recorded Pay */}
        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-xs space-y-1">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500 leading-tight">{t("moneyMyEmployerEntered")}</span>
            <span className="text-lg">📋</span>
          </div>
          <div className="text-2xl font-black text-slate-900 tracking-tight">
            {earnings ? formatPaise(earnings.totalRecordedMinor) : "₹0.00"}
          </div>
          <div className="text-xs text-slate-500">
            {earnings?.recordedCount ?? 0} / {earnings?.completedCount ?? 0} {t("recordedShiftsCount")}
          </div>
        </div>

        {/* Card 3: Missing Money Alert */}
        <div
          className={`p-5 rounded-xl border shadow-xs space-y-1 ${
            underpaidCount > 0
              ? "bg-amber-50/70 border-amber-300 text-amber-950"
              : "bg-white border-slate-200 text-slate-900"
          }`}
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold leading-tight">{t("moneyStillMissing")}</span>
            <span className="text-lg">{underpaidCount > 0 ? "⚠️" : "✅"}</span>
          </div>
          <div className="text-2xl font-black tracking-tight">
            {underpaidCount > 0 ? formatPaise(netShortfallPaise) : "₹0.00"}
          </div>
          <div className="text-xs text-slate-600">
            {underpaidCount > 0
              ? `${underpaidCount} ${t("missingMoneyShifts")}`
              : t("allMatchedMessage")}
          </div>
        </div>

        {/* Card 4: Open Complaints */}
        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-xs space-y-1">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500 leading-tight">{t("openComplaints")}</span>
            <span className="text-lg">⚖️</span>
          </div>
          <div className="text-2xl font-black text-slate-900 tracking-tight">
            {disputes.filter((d) => d.status === "OPEN").length}
          </div>
          <div className="text-xs text-slate-500">
            {disputes.length} {t("totalComplaints")}
          </div>
        </div>
      </div>

      {/* Shifts Section Header & Filter Tabs */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-200 pb-3">
        <div>
          <h2 className="text-lg font-bold text-slate-900">{t("myShifts")}</h2>
          <p className="text-xs text-slate-500">
            {t("organization")}: {persona.organizationName}
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-1.5 bg-slate-100 p-1 rounded-lg border border-slate-200 text-xs self-start sm:self-auto">
          <button
            type="button"
            onClick={() => setActiveFilter("ALL")}
            className={`px-3 py-1.5 rounded-md font-medium transition-all ${
              activeFilter === "ALL"
                ? "bg-white text-slate-900 shadow-xs font-semibold"
                : "text-slate-600 hover:text-slate-900"
            }`}
          >
            {t("allShifts")} ({shifts.length})
          </button>
          <button
            type="button"
            onClick={() => setActiveFilter("DISCREPANCIES")}
            className={`px-3 py-1.5 rounded-md font-medium transition-all flex items-center gap-1.5 ${
              activeFilter === "DISCREPANCIES"
                ? "bg-amber-500 text-white shadow-xs font-semibold"
                : "text-amber-900 hover:bg-amber-100/50"
            }`}
          >
            <span>⚠️ {t("unpaidShifts")}</span>
            {underpaidCount > 0 && (
              <span className="bg-amber-950/20 px-1.5 py-0.5 rounded-full text-[10px]">
                {underpaidCount}
              </span>
            )}
          </button>
          <button
            type="button"
            onClick={() => setActiveFilter("ACTIVE")}
            className={`px-3 py-1.5 rounded-md font-medium transition-all ${
              activeFilter === "ACTIVE"
                ? "bg-white text-slate-900 shadow-xs font-semibold"
                : "text-slate-600 hover:text-slate-900"
            }`}
          >
            {t("activeShifts")}
          </button>
          <button
            type="button"
            onClick={() => setActiveFilter("COMPLETED")}
            className={`px-3 py-1.5 rounded-md font-medium transition-all ${
              activeFilter === "COMPLETED"
                ? "bg-white text-slate-900 shadow-xs font-semibold"
                : "text-slate-600 hover:text-slate-900"
            }`}
          >
            {t("completedShifts")}
          </button>
        </div>
      </div>

      {/* Shifts List */}
      {filteredShifts.length === 0 ? (
        <EmptyState
          title={activeFilter === "DISCREPANCIES" ? t("noMissingMoney") : t("noShiftsFound")}
          description={
            activeFilter === "DISCREPANCIES"
              ? t("allMatchedMessage")
              : t("noShiftsFound")
          }
          action={
            activeFilter !== "ALL"
              ? { label: `${t("allShifts")}`, onClick: () => setActiveFilter("ALL") }
              : undefined
          }
        />
      ) : (
        <div className="grid grid-cols-1 gap-4">
          {filteredShifts.map((shift) => {
            const shiftDispute = disputes.find((d) => d.shiftId === shift.id);
            return (
              <ShiftCard
                key={shift.id}
                shift={shift}
                dispute={shiftDispute}
                onCheckIn={handleCheckInClick}
                onCheckOut={(s) => setCheckoutShift(s)}
                onViewBreakdown={(s) => setBreakdownShift(s)}
                onRaiseDispute={(s) => setDisputeShift(s)}
                onViewDispute={(d) => setInspectDispute(d)}
                isCheckInLoading={checkInLoadingId === shift.id}
              />
            );
          })}
        </div>
      )}

      {/* Modals */}
      <CheckOutModal
        key={checkoutShift?.id ?? "closed"}
        shift={checkoutShift}
        isOpen={Boolean(checkoutShift)}
        onClose={() => setCheckoutShift(null)}
        onSubmit={handleCheckOutSubmit}
      />

      <EarningsBreakdownModal
        shift={shifts.find(shift => shift.id === breakdownShift?.id) ?? null}
        dispute={breakdownShift ? disputes.find((d) => d.shiftId === breakdownShift.id) : null}
        isOpen={Boolean(breakdownShift)}
        onClose={() => setBreakdownShift(null)}
        onRaiseDispute={(s) => setDisputeShift(s)}
        onViewDispute={(d) => setInspectDispute(d)}
      />

      <RaiseDisputeModal
        key={disputeShift?.id ?? "closed"}
        shift={disputeShift}
        isOpen={Boolean(disputeShift)}
        onClose={() => setDisputeShift(null)}
        onSubmit={handleCreateDisputeSubmit}
      />

      <DisputeDetailModal
        dispute={disputes.find(dispute => dispute.id === inspectDispute?.id) ?? null}
        shift={inspectDispute ? shifts.find((s) => s.id === inspectDispute.shiftId) : null}
        isOpen={Boolean(inspectDispute)}
        onClose={() => setInspectDispute(null)}
      />
    </div>
  );
}
