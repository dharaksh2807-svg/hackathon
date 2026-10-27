"use client";

import React, { useState } from "react";
import { Modal } from "../common/Modal";

interface AddWorkerModalProps {
  isOpen: boolean;
  organizationName: string;
  onClose: () => void;
  /** Receives validated name + email; throws on API error. */
  onSubmit: (workerName: string, workerEmail: string) => Promise<void>;
}

export function AddWorkerModal({
  isOpen,
  organizationName,
  onClose,
  onSubmit,
}: AddWorkerModalProps) {
  const [workerName, setWorkerName] = useState("");
  const [workerEmail, setWorkerEmail] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const handleClose = () => {
    if (isSubmitting) return;
    setWorkerName("");
    setWorkerEmail("");
    setError(null);
    setSuccess(false);
    setIsSubmitting(false);
    onClose();
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    const name = workerName.trim();
    const email = workerEmail.trim().toLowerCase();

    if (name.length < 1) {
      setError("Worker name is required.");
      return;
    }
    if (name.length > 100) {
      setError("Worker name must be at most 100 characters.");
      return;
    }
    // Basic email format check (the Zod schema on the server validates fully)
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      setError("Please enter a valid email address.");
      return;
    }

    setIsSubmitting(true);
    try {
      await onSubmit(name, email);
      setSuccess(true);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Failed to add worker.";
      setError(msg);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={handleClose}
      title="Add Worker to Your Team"
      description={`Invite a worker to join ${organizationName}. New accounts receive a setup email; existing accounts keep their sign-in.`}
      maxWidth="md"
    >
      {success ? (
        /* ── Success state ── */
        <div className="py-4 flex flex-col items-center gap-3 text-center">
          <div className="w-14 h-14 rounded-full bg-emerald-100 flex items-center justify-center text-3xl">
            ✅
          </div>
          <div>
            <p className="font-bold text-slate-900 text-base">Worker Added!</p>
            <p className="text-xs text-slate-600 mt-1">
              Your organization membership is ready for{" "}
              <strong className="text-slate-800">{workerEmail}</strong>. New workers receive a setup email. Existing workers can use their current sign-in.
            </p>
          </div>
          <button type="button" onClick={handleClose} className="rounded-lg bg-blue-600 text-white px-4 py-2 font-semibold">Done</button>
        </div>
      ) : (
        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Security notice */}
          <div className="flex items-start gap-2.5 p-3 bg-blue-50 border border-blue-200 rounded-lg text-xs text-blue-900">
            <span className="text-base mt-0.5 shrink-0">ℹ️</span>
            <div>
              <span className="font-semibold block mb-0.5">Worker accounts only</span>
              Only workers can be added here. To add an employer or administrator, contact your
              FairShift account manager.
            </div>
          </div>

          {/* Worker name */}
          <div>
            <label
              htmlFor="add-worker-name"
              className="block text-xs font-semibold text-slate-800 mb-1.5"
            >
              Worker Full Name <span className="text-rose-600">*</span>
            </label>
            <input
              id="add-worker-name"
              type="text"
              value={workerName}
              onChange={(e) => setWorkerName(e.target.value)}
              className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus-visible:outline-blue-600 placeholder:text-slate-400"
              placeholder="e.g., Arun Sharma"
              maxLength={100}
              required
              autoFocus
              disabled={isSubmitting}
            />
            <p className="text-[11px] text-slate-500 mt-1">
              This name will appear on their shift records and pay statements.
            </p>
          </div>

          {/* Email */}
          <div>
            <label
              htmlFor="add-worker-email"
              className="block text-xs font-semibold text-slate-800 mb-1.5"
            >
              Email Address <span className="text-rose-600">*</span>
            </label>
            <input
              id="add-worker-email"
              type="email"
              value={workerEmail}
              onChange={(e) => setWorkerEmail(e.target.value)}
              className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus-visible:outline-blue-600 placeholder:text-slate-400"
              placeholder="e.g., arun.sharma@example.com"
              maxLength={254}
              required
              disabled={isSubmitting}
            />
            <p className="text-[11px] text-slate-500 mt-1">
              An invitation link will be sent to this address. The worker must use it to sign
              in for the first time.
            </p>
          </div>

          {/* Duplicate / API error */}
          {error && (
            <div role="alert" className="p-3 bg-rose-50 border border-rose-200 rounded-lg text-xs text-rose-800">
              {error}
            </div>
          )}

          {/* Footer buttons */}
          <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
            <button
              type="button"
              onClick={handleClose}
              disabled={isSubmitting}
              className="px-4 py-2 text-xs font-medium text-slate-700 bg-white border border-slate-300 rounded-lg hover:bg-slate-50 disabled:opacity-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting || workerName.trim().length === 0 || workerEmail.trim().length === 0}
              className="px-4 py-2 text-xs font-semibold text-white bg-blue-600 rounded-lg hover:bg-blue-700 disabled:opacity-50 transition-colors flex items-center gap-1.5"
            >
              {isSubmitting ? (
                <>
                  <span className="w-3 h-3 border-2 border-white/40 border-t-white rounded-full animate-spin" />
                  <span>Sending Invite…</span>
                </>
              ) : (
                "Invite Worker"
              )}
            </button>
          </div>
        </form>
      )}
    </Modal>
  );
}
