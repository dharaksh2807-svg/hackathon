"use client";

import React from "react";
import type { Dispute, Shift } from "@/lib/api-client/types";
import { Modal } from "../common/Modal";
import { Badge } from "../common/Badge";
import { formatDateTimeKolkata } from "@/lib/api-client/formatters";
import { formatPaise } from "@/lib/api-client/currency";

interface DisputeDetailModalProps {
  dispute: Dispute | null;
  shift?: Shift | null;
  isOpen: boolean;
  onClose: () => void;
  onResolveClick?: (dispute: Dispute) => void;
  isEmployer?: boolean;
}

export function DisputeDetailModal({
  dispute,
  shift,
  isOpen,
  onClose,
  onResolveClick,
  isEmployer = false,
}: DisputeDetailModalProps) {
  if (!dispute) return null;

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Dispute Case Inspection"
      description={`Dispute #${dispute.id.slice(0, 8)}…`}
      maxWidth="lg"
      footer={
        <div className="flex items-center justify-between w-full">
          <span className="text-xs text-slate-500 font-mono">
            Status: {dispute.status}
          </span>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-xs font-medium text-slate-700 bg-white border border-slate-300 rounded-lg hover:bg-slate-50"
            >
              Close
            </button>
            {isEmployer && dispute.status === "OPEN" && onResolveClick && (
              <button
                type="button"
                onClick={() => {
                  onClose();
                  onResolveClick(dispute);
                }}
                className="px-4 py-2 text-xs font-semibold text-white bg-blue-600 rounded-lg hover:bg-blue-700 transition-colors"
              >
                Adjudicate Dispute
              </button>
            )}
          </div>
        </div>
      }
    >
      {/* Status Bar */}
      <div className="flex items-center justify-between p-3.5 bg-slate-50 border border-slate-200 rounded-lg text-xs">
        <div className="space-y-0.5">
          <div className="text-slate-500">Case Status</div>
          <div className="flex items-center gap-2">
            <Badge
              variant={
                dispute.status === "OPEN" ? "open" : dispute.status === "APPROVED" ? "approved" : "rejected"
              }
            >
              {dispute.status === "OPEN"
                ? "Pending Employer Review"
                : dispute.status === "APPROVED"
                ? "Dispute Approved & Pay Adjusted"
                : "Dispute Rejected by Employer"}
            </Badge>
          </div>
        </div>
        <div className="text-right space-y-0.5">
          <div className="text-slate-500">Opened On</div>
          <div className="font-medium text-slate-800">{formatDateTimeKolkata(dispute.createdAt)}</div>
        </div>
      </div>

      {/* Target Shift Context */}
      {shift && (
        <div className="p-3 bg-slate-50/70 border border-slate-200 rounded-lg text-xs space-y-1">
          <div className="font-semibold text-slate-900">{shift.siteLabel}</div>
          <div className="flex justify-between text-slate-600">
            <span>Shift Date: {formatDateTimeKolkata(shift.scheduledStartAt)}</span>
            <span>Expected: {shift.earnings ? formatPaise(shift.earnings.expectedMinor) : "—"}</span>
          </div>
          <div className="flex justify-between text-slate-600">
            <span>Employer Recorded Pay:</span>
            <span className="font-medium text-slate-900">
              {shift.recordedAmountMinor !== null ? formatPaise(shift.recordedAmountMinor) : "Not recorded"}
            </span>
          </div>
        </div>
      )}

      {/* Worker Claim Section */}
      <div className="space-y-1.5">
        <h4 className="text-xs font-bold text-slate-900 uppercase tracking-wider">
          Worker Dispute Explanation
        </h4>
        <div className="p-3 bg-white border border-slate-200 rounded-lg text-xs sm:text-sm text-slate-800 leading-relaxed font-sans">
          &ldquo;{dispute.reason}&rdquo;
        </div>
      </div>

      {/* Employer Resolution Note */}
      {dispute.status !== "OPEN" && (
        <div
          className={`space-y-1.5 p-3.5 rounded-lg border ${
            dispute.status === "APPROVED"
              ? "bg-emerald-50/80 border-emerald-300 text-emerald-950"
              : "bg-rose-50/80 border-rose-200 text-rose-950"
          }`}
        >
          <div className="flex items-center justify-between text-xs">
            <span className="font-bold uppercase tracking-wider">
              Employer Adjudication Decision
            </span>
            <span>{formatDateTimeKolkata(dispute.resolvedAt)}</span>
          </div>
          <div className="text-xs sm:text-sm font-medium leading-relaxed">
            {dispute.resolutionExplanation || "No explanatory note provided."}
          </div>
          {dispute.resolvedByMembershipId && (
            <div className="text-[11px] text-slate-500 font-mono pt-1">
              Adjudicator membership ID: {dispute.resolvedByMembershipId.slice(0, 8)}…
            </div>
          )}
        </div>
      )}
    </Modal>
  );
}
