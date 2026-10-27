"use client";

import React, { useState } from "react";
import type { Dispute, Shift, ResolveDisputeRequest } from "@/lib/api-client/types";
import { Modal } from "../common/Modal";
import { formatPaise, rupeesToPaise, paiseToRupees } from "@/lib/api-client/currency";
import { formatDateTimeKolkata } from "@/lib/api-client/formatters";

interface ResolveDisputeModalProps {
  dispute: Dispute | null;
  shift: Shift | null;
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (disputeId: string, req: ResolveDisputeRequest) => Promise<void>;
}

export function ResolveDisputeModal({
  dispute,
  shift,
  isOpen,
  onClose,
  onSubmit,
}: ResolveDisputeModalProps) {
  const [decision, setDecision] = useState<"APPROVED" | "REJECTED">("APPROVED");
  const [explanation, setExplanation] = useState("");
  const [rupeesInput, setRupeesInput] = useState(() => shift?.earnings ? paiseToRupees(shift.earnings.expectedMinor) : shift?.recordedAmountMinor != null ? paiseToRupees(shift.recordedAmountMinor) : "");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!dispute) return null;

  const charCount = explanation.trim().length;
  const isExplanationValid = charCount >= 10 && charCount <= 2000;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isExplanationValid) {
      setError("Please provide an adjudication explanation of at least 10 characters.");
      return;
    }

    let payload: ResolveDisputeRequest;

    if (decision === "APPROVED") {
      let correctedPaise: number;
      try {
        correctedPaise = rupeesToPaise(rupeesInput);
      } catch {
        setError("Please enter a valid corrected pay amount.");
        return;
      }

      payload = {
        decision: "APPROVED",
        explanation: explanation.trim(),
        correctedRecordedAmountMinor: correctedPaise,
      };
    } else {
      payload = {
        decision: "REJECTED",
        explanation: explanation.trim(),
      };
    }

    setError(null);
    setIsSubmitting(true);
    try {
      await onSubmit(dispute.id, payload);
      setExplanation("");
      onClose();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Failed to resolve dispute.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Adjudicate Wage Dispute"
      description={`Case #${dispute.id.slice(0, 8)}… — ${shift?.siteLabel ?? dispute.shiftId}`}
      maxWidth="lg"
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        {/* Worker's claim box */}
        <div className="p-3.5 bg-slate-50 border border-slate-200 rounded-lg text-xs space-y-1.5">
          <div className="flex items-center justify-between text-slate-500">
            <span className="font-semibold uppercase tracking-wider text-slate-700">Worker&apos;s Claim</span>
            <span>{formatDateTimeKolkata(dispute.createdAt)}</span>
          </div>
          <div className="font-medium text-slate-900 text-xs sm:text-sm bg-white p-2.5 rounded border border-slate-200">
            &ldquo;{dispute.reason}&rdquo;
          </div>
          <div className="flex items-center justify-between pt-1 text-slate-600">
            <span>Statutory Expected: {shift?.earnings ? formatPaise(shift.earnings.expectedMinor) : "—"}</span>
            <span>Recorded Pay: {shift && shift.recordedAmountMinor !== null ? formatPaise(shift.recordedAmountMinor) : "Unavailable"}</span>
          </div>
        </div>

        {!shift && <p className="text-xs text-slate-600">Shift earnings are unavailable here. Enter the corrected amount to approve. Resolution requires existing recorded pay.</p>}

        {/* Decision Radio Choice */}
        <div>
          <label className="block text-xs font-bold text-slate-900 uppercase tracking-wider mb-2">
            Adjudication Decision <span className="text-rose-600">*</span>
          </label>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <label
              className={`flex items-start gap-3 p-3 rounded-lg border cursor-pointer transition-all ${
                decision === "APPROVED"
                  ? "bg-emerald-50 border-emerald-400 ring-2 ring-emerald-600/20"
                  : "bg-white border-slate-200 hover:bg-slate-50"
              }`}
            >
              <input
                type="radio"
                name="decision"
                value="APPROVED"
                checked={decision === "APPROVED"}
                onChange={() => setDecision("APPROVED")}
                className="mt-0.5 text-emerald-600 focus:ring-emerald-500"
              />
              <div className="space-y-0.5 text-xs">
                <span className="font-bold text-emerald-950 block">Approve & Adjust Pay</span>
                <span className="text-slate-600 block text-[11px]">
                  Confirm worker claim and update recorded pay to the corrected amount.
                </span>
              </div>
            </label>

            <label
              className={`flex items-start gap-3 p-3 rounded-lg border cursor-pointer transition-all ${
                decision === "REJECTED"
                  ? "bg-rose-50 border-rose-300 ring-2 ring-rose-600/20"
                  : "bg-white border-slate-200 hover:bg-slate-50"
              }`}
            >
              <input
                type="radio"
                name="decision"
                value="REJECTED"
                checked={decision === "REJECTED"}
                onChange={() => setDecision("REJECTED")}
                className="mt-0.5 text-rose-600 focus:ring-rose-500"
              />
              <div className="space-y-0.5 text-xs">
                <span className="font-bold text-rose-950 block">Reject Dispute</span>
                <span className="text-slate-600 block text-[11px]">
                  Maintain existing recorded pay. A formal explanation is required by contract.
                </span>
              </div>
            </label>
          </div>
        </div>

        {/* If APPROVED: Corrected Amount Field */}
        {decision === "APPROVED" && (
          <div className="p-3 bg-emerald-50/50 border border-emerald-200 rounded-lg space-y-2">
            <label htmlFor="corrected-amount" className="block text-xs font-semibold text-emerald-950">
              Corrected Recorded Pay (INR ₹) <span className="text-rose-600">*</span>
            </label>
            <div className="relative">
              <span className="absolute left-3 top-2 text-slate-400 font-bold text-sm">₹</span>
              <input
                id="corrected-amount"
                type="number"
                step="0.01"
                min="0"
                value={rupeesInput}
                onChange={(e) => setRupeesInput(e.target.value)}
                className="w-full pl-8 pr-3 py-1.5 text-sm border border-emerald-300 rounded-lg focus-visible:outline-emerald-600 font-mono bg-white"
                required
              />
            </div>
            <p className="text-[11px] text-emerald-800">
              Contract requires an atomic update to recorded pay upon approving a dispute.
            </p>
          </div>
        )}

        {/* Formal Explanation Textarea */}
        <div>
          <label htmlFor="resolve-explanation" className="block text-xs font-semibold text-slate-800 mb-1">
            Formal Resolution Note / Explanation <span className="text-rose-600">*</span>
          </label>
          <textarea
            id="resolve-explanation"
            rows={3}
            value={explanation}
            onChange={(e) => setExplanation(e.target.value)}
            placeholder={
              decision === "APPROVED"
                ? "e.g., Verified gate biometric logs and approved 30m overtime + site hazard allowance."
                : "e.g., Attendance records and shift sign-in match the paid hours under the agreed contract."
            }
            className={`w-full p-2.5 text-xs sm:text-sm border rounded-lg focus-visible:outline-blue-600 ${
              explanation.length > 0 && !isExplanationValid ? "border-amber-400" : "border-slate-300"
            }`}
            required
            maxLength={2000}
          />
          <div className="flex justify-between items-center text-xs text-slate-500 mt-1">
            <span className={charCount < 10 ? "text-amber-600 font-medium" : "text-slate-500"}>
              {charCount < 10 ? `Minimum 10 characters required (${10 - charCount} more needed)` : `${charCount} / 2000 characters`}
            </span>
            <span className="text-slate-400">Recorded permanently in audit trail</span>
          </div>
        </div>

        {error && (
          <div className="p-2.5 bg-rose-50 border border-rose-200 rounded-lg text-xs text-rose-800">
            {error}
          </div>
        )}

        <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 text-xs font-medium text-slate-700 bg-white border border-slate-300 rounded-lg hover:bg-slate-50"
            disabled={isSubmitting}
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={!isExplanationValid || isSubmitting}
            className={`px-4 py-2 text-xs font-semibold text-white rounded-lg disabled:opacity-50 transition-colors ${
              decision === "APPROVED" ? "bg-emerald-600 hover:bg-emerald-700" : "bg-rose-700 hover:bg-rose-800"
            }`}
          >
            {isSubmitting
              ? "Recording Adjudication..."
              : decision === "APPROVED"
              ? "Confirm & Save Adjustment"
              : "Confirm Rejection"}
          </button>
        </div>
      </form>
    </Modal>
  );
}
