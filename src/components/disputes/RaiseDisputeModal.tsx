"use client";

import React, { useState } from "react";
import type { Shift } from "@/lib/api-client/types";
import { Modal } from "../common/Modal";
import { formatPaise } from "@/lib/api-client/currency";

interface RaiseDisputeModalProps {
  shift: Shift | null;
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (shiftId: string, reason: string) => Promise<void>;
}

export function RaiseDisputeModal({ shift, isOpen, onClose, onSubmit }: RaiseDisputeModalProps) {
  const [reason, setReason] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!shift) return null;

  const charCount = reason.trim().length;
  const isValid = charCount >= 10 && charCount <= 1000;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isValid) {
      setError("Please provide a reason between 10 and 1,000 characters.");
      return;
    }

    setError(null);
    setIsSubmitting(true);
    try {
      await onSubmit(shift.id, reason.trim());
      setReason("");
      onClose();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Failed to submit dispute.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Raise Shift Earnings Dispute"
      description={`Contest pay discrepancy for ${shift.siteLabel}`}
      maxWidth="md"
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        {/* Pay Summary Callout */}
        <div className="p-3 bg-amber-50/70 border border-amber-200 rounded-lg text-xs space-y-1.5 text-slate-800">
          <div className="flex justify-between items-center">
            <span className="text-slate-600">Expected Configured Pay:</span>
            <span className="font-semibold text-emerald-800">
              {shift.earnings ? formatPaise(shift.earnings.expectedMinor) : "—"}
            </span>
          </div>
          <div className="flex justify-between items-center">
            <span className="text-slate-600">Employer-Recorded Pay:</span>
            <span className="font-semibold text-slate-900">
              {shift.recordedAmountMinor !== null ? formatPaise(shift.recordedAmountMinor) : "Not recorded"}
            </span>
          </div>
          {shift.differenceMinor !== null && shift.differenceMinor > 0 && (
            <div className="flex justify-between items-center pt-1 border-t border-amber-200 font-bold text-amber-950">
              <span>Shortfall Claimed:</span>
              <span>{formatPaise(shift.differenceMinor)}</span>
            </div>
          )}
        </div>

        {/* Dispute Reason Textarea */}
        <div>
          <label htmlFor="dispute-reason" className="block text-xs font-semibold text-slate-800 mb-1">
            Reason for Dispute <span className="text-rose-600">*</span>
          </label>
          <textarea
            id="dispute-reason"
            aria-invalid={reason.length > 0 && !isValid}
            aria-describedby={error ? "dispute-help dispute-error" : "dispute-help"}
            rows={4}
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            placeholder="Explain specifically why the pay record is incorrect (e.g., worked 30 mins overtime past 5 PM, weekend bonus was omitted, or site hazard allowance was not applied)."
            className={`w-full p-3 text-xs sm:text-sm border rounded-lg focus-visible:outline-blue-600 ${
              reason.length > 0 && !isValid ? "border-amber-400 bg-amber-50/20" : "border-slate-300"
            }`}
            required
            maxLength={1000}
          />
          <div id="dispute-help" className="flex items-center justify-between text-xs mt-1">
            <span className={charCount < 10 ? "text-amber-800 font-medium" : "text-slate-500"}>
              {charCount < 10
                ? `Minimum 10 characters required (${10 - charCount} more needed)`
                : `${charCount} / 1000 characters`}
            </span>
            <span className="text-slate-500">Strict contract validation</span>
          </div>
        </div>

        {error && (
          <div id="dispute-error" role="alert" className="p-2.5 bg-rose-50 border border-rose-200 rounded-lg text-xs text-rose-800">
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
            disabled={!isValid || isSubmitting}
            className="px-4 py-2 text-xs font-semibold text-white bg-amber-800 rounded-lg hover:bg-amber-900 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            {isSubmitting ? "Submitting Dispute..." : "Submit Formal Dispute"}
          </button>
        </div>
      </form>
    </Modal>
  );
}
