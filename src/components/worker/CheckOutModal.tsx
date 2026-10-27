"use client";

import React, { useState } from "react";
import type { Shift } from "@/lib/api-client/types";
import { Modal } from "../common/Modal";
import { formatDateTimeKolkata } from "@/lib/api-client/formatters";

interface CheckOutModalProps {
  shift: Shift | null;
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (shiftId: string, unpaidBreakMinutes: number) => Promise<void>;
}

export function CheckOutModal({ shift, isOpen, onClose, onSubmit }: CheckOutModalProps) {
  const [breakMinutes, setBreakMinutes] = useState(30);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!shift) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (breakMinutes < 0 || breakMinutes > 1440) {
      setError("Unpaid break minutes must be between 0 and 1,440.");
      return;
    }
    setError(null);
    setIsSubmitting(true);
    try {
      await onSubmit(shift.id, breakMinutes);
      onClose();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Failed to record checkout.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Complete Shift & Record Check-Out"
      description={`Attest attendance for ${shift.siteLabel}`}
      maxWidth="md"
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="p-3 bg-slate-50 border border-slate-200 rounded-lg text-xs space-y-1">
          <div className="flex justify-between">
            <span className="text-slate-500">Checked In At:</span>
            <span className="font-medium text-slate-800">{formatDateTimeKolkata(shift.checkedInAt)}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-slate-500">Scheduled End:</span>
            <span className="font-medium text-slate-800">{formatDateTimeKolkata(shift.scheduledEndAt)}</span>
          </div>
        </div>

        <div>
          <label htmlFor="unpaid-break" className="block text-xs font-semibold text-slate-700 mb-1">
            Unpaid Break Duration (Minutes)
          </label>
          <div className="flex items-center gap-2">
            <input
              id="unpaid-break"
              type="number"
              min={0}
              max={1440}
              step={5}
              value={breakMinutes}
              onChange={(e) => setBreakMinutes(parseInt(e.target.value, 10) || 0)}
              className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus-visible:outline-blue-600"
              required
            />
            <span className="text-xs text-slate-500 font-medium whitespace-nowrap">Minutes</span>
          </div>
          <p className="mt-1 text-xs text-slate-500">
            Standard lunch or meal pauses are deducted from payable hours.
          </p>
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
            disabled={isSubmitting}
            className="px-4 py-2 text-xs font-semibold text-white bg-slate-900 rounded-lg hover:bg-slate-800 disabled:opacity-50 transition-colors flex items-center gap-1.5"
          >
            {isSubmitting ? "Attesting Check-Out..." : "Confirm & Check Out"}
          </button>
        </div>
      </form>
    </Modal>
  );
}
