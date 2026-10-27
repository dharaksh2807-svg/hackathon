"use client";

import React, { useState } from "react";
import type { Shift } from "@/lib/api-client/types";
import { Modal } from "../common/Modal";
import { formatPaise } from "@/lib/api-client/currency";
import { useI18n } from "@/lib/i18n/context";

interface RaiseDisputeModalProps {
  shift: Shift | null;
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (shiftId: string, reason: string) => Promise<void>;
}

export function RaiseDisputeModal({ shift, isOpen, onClose, onSubmit }: RaiseDisputeModalProps) {
  const { t } = useI18n();
  const [reason, setReason] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!shift) return null;

  const charCount = reason.trim().length;
  const isValid = charCount >= 10 && charCount <= 1000;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isValid) {
      setError(t("errorMinChars"));
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
      title={t("complaintTitle")}
      description={`${shift.siteLabel}`}
      maxWidth="md"
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        {/* Pay Summary Callout */}
        <div className="p-3 bg-amber-50/70 border border-amber-200 rounded-lg text-xs space-y-1.5 text-slate-800">
          <div className="flex justify-between items-center">
            <span className="text-slate-600">{t("moneyIShouldGet")}:</span>
            <span className="font-semibold text-emerald-800">
              {shift.earnings ? formatPaise(shift.earnings.expectedMinor) : "—"}
            </span>
          </div>
          <div className="flex justify-between items-center">
            <span className="text-slate-600">{t("moneyMyEmployerEntered")}:</span>
            <span className="font-semibold text-slate-900">
              {shift.recordedAmountMinor !== null ? formatPaise(shift.recordedAmountMinor) : t("statusNotRecorded")}
            </span>
          </div>
          {shift.differenceMinor !== null && shift.differenceMinor > 0 && (
            <div className="flex justify-between items-center pt-1 border-t border-amber-200 font-bold text-amber-950">
              <span>{t("complaintShortfall")}:</span>
              <span>{formatPaise(shift.differenceMinor)}</span>
            </div>
          )}
        </div>

        {/* Dispute Reason Textarea */}
        <div>
          <label htmlFor="dispute-reason" className="block text-sm font-semibold text-slate-800 mb-1">
            {t("complaintReason")} <span className="text-rose-600">*</span>
          </label>
          <textarea
            id="dispute-reason"
            rows={4}
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            placeholder={t("complaintReasonPlaceholder")}
            className={`w-full p-3 text-sm border rounded-xl focus-visible:outline-blue-600 ${
              reason.length > 0 && !isValid ? "border-amber-400 bg-amber-50/20" : "border-slate-300"
            }`}
            required
            maxLength={1000}
          />
          <div className="flex items-center justify-between text-xs mt-1">
            <span className={charCount < 10 ? "text-amber-600 font-medium" : "text-slate-500"}>
              {charCount < 10
                ? t("errorMinChars")
                : `${charCount} / 1000 ${t("validCharsRemaining")}`}
            </span>
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
            className="px-4 py-2.5 text-sm font-medium text-slate-700 bg-white border border-slate-300 rounded-xl hover:bg-slate-50 min-h-[44px]"
            disabled={isSubmitting}
          >
            {t("complaintCancel")}
          </button>
          <button
            type="submit"
            disabled={!isValid || isSubmitting}
            className="px-4 py-2.5 text-sm font-semibold text-white bg-amber-600 rounded-xl hover:bg-amber-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors min-h-[44px]"
          >
            {isSubmitting ? t("complaintSubmitting") : t("complaintSubmit")}
          </button>
        </div>
      </form>
    </Modal>
  );
}
