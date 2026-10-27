"use client";

import React, { useState } from "react";
import type { Shift } from "@/lib/api-client/types";
import { Modal } from "../common/Modal";
import { formatPaise, rupeesToPaise, paiseToRupees } from "@/lib/api-client/currency";

interface RecordPayModalProps {
  shift: Shift | null;
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (shiftId: string, amountMinor: number) => Promise<void>;
}

export function RecordPayModal({ shift, isOpen, onClose, onSubmit }: RecordPayModalProps) {
  const [rupeesInput, setRupeesInput] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Initialize input when shift opens
  React.useEffect(() => {
    if (shift) {
      if (shift.recordedAmountMinor !== null) {
        setRupeesInput(paiseToRupees(shift.recordedAmountMinor));
      } else if (shift.earnings) {
        setRupeesInput(paiseToRupees(shift.earnings.expectedMinor));
      } else {
        setRupeesInput("");
      }
    }
  }, [shift]);

  if (!shift) return null;

  let enteredPaise: number | null = null;
  try {
    if (rupeesInput.trim() !== "") {
      enteredPaise = rupeesToPaise(rupeesInput);
    }
  } catch {
    enteredPaise = null;
  }

  const expectedPaise = shift.earnings?.expectedMinor ?? 0;
  const differencePaise = enteredPaise !== null ? expectedPaise - enteredPaise : null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (enteredPaise === null || enteredPaise < 0) {
      setError("Please enter a valid monetary amount in Rupees.");
      return;
    }

    setError(null);
    setIsSubmitting(true);
    try {
      await onSubmit(shift.id, enteredPaise);
      onClose();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Failed to record pay.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Record / Adjust Shift Pay"
      description={`Assign employer-attested payment for ${shift.siteLabel}`}
      maxWidth="md"
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        {/* Statutory Expectation Callout */}
        <div className="p-3 bg-slate-50 border border-slate-200 rounded-lg text-xs space-y-1.5">
          <div className="flex justify-between items-center">
            <span className="text-slate-600">Statutory Expected Pay:</span>
            <span className="font-semibold text-emerald-800 text-sm">
              {formatPaise(expectedPaise)}
            </span>
          </div>
          <div className="flex justify-between items-center text-slate-500 text-[11px]">
            <span>Sector Rule Snapshot:</span>
            <span>
              {shift.sector === "construction"
                ? "Hourly base + overtime + hazard allowance"
                : "Flat shift stipend + weekend differential"}
            </span>
          </div>
        </div>

        {/* Input */}
        <div>
          <label htmlFor="recorded-amount" className="block text-xs font-semibold text-slate-800 mb-1">
            Employer Recorded Amount (INR ₹) <span className="text-rose-600">*</span>
          </label>
          <div className="relative">
            <span className="absolute left-3 top-2.5 text-slate-400 font-bold text-sm">₹</span>
            <input
              id="recorded-amount"
              type="number"
              step="0.01"
              min="0"
              max="21474836"
              value={rupeesInput}
              onChange={(e) => setRupeesInput(e.target.value)}
              className="w-full pl-8 pr-3 py-2 text-sm border border-slate-300 rounded-lg focus-visible:outline-blue-600 font-mono"
              placeholder="e.g., 1100.00"
              required
            />
          </div>
          <div className="flex items-center justify-between text-[11px] text-slate-500 mt-1">
            <span>
              Integer paise equivalent:{" "}
              <strong className="text-slate-700 font-mono">
                {enteredPaise !== null ? `${enteredPaise.toLocaleString()} paise` : "—"}
              </strong>
            </span>
            <span className="text-slate-400">Strict contract standard</span>
          </div>
        </div>

        {/* Live Discrepancy Preview */}
        {differencePaise !== null && (
          <div
            className={`p-3 rounded-lg border text-xs ${
              differencePaise === 0
                ? "bg-emerald-50 border-emerald-300 text-emerald-900"
                : differencePaise > 0
                ? "bg-amber-50 border-amber-300 text-amber-950"
                : "bg-purple-50 border-purple-300 text-purple-950"
            }`}
          >
            <div className="font-bold flex items-center gap-1.5">
              <span>Preview Parity:</span>
              <span>
                {differencePaise === 0
                  ? "✅ Perfectly Matched"
                  : differencePaise > 0
                  ? `⚠️ Underpaid by ${formatPaise(differencePaise)}`
                  : `ℹ️ Overpaid by ${formatPaise(Math.abs(differencePaise))}`}
              </span>
            </div>
            <p className="mt-0.5 text-[11px] opacity-90">
              {differencePaise === 0
                ? "The worker will see a balanced green indicator."
                : differencePaise > 0
                ? "This amount is below the statutory calculation and will trigger an UNDERPAID alert for the worker."
                : "Recorded amount exceeds the statutory calculation."}
            </p>
          </div>
        )}

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
            disabled={isSubmitting || enteredPaise === null}
            className="px-4 py-2 text-xs font-semibold text-white bg-slate-900 rounded-lg hover:bg-slate-800 disabled:opacity-50 transition-colors"
          >
            {isSubmitting ? "Recording..." : "Save Recorded Pay"}
          </button>
        </div>
      </form>
    </Modal>
  );
}
