"use client";

import React, { useState } from "react";
import type { Dispute, Shift, DemoPersona, ResolveDisputeRequest } from "@/lib/api-client/types";
import { Badge } from "../common/Badge";
import { EmptyState } from "../common/EmptyState";
import { DisputeDetailModal } from "./DisputeDetailModal";
import { ResolveDisputeModal } from "../employer/ResolveDisputeModal";
import { formatDateTimeKolkata } from "@/lib/api-client/formatters";
import { formatPaise } from "@/lib/api-client/currency";

interface DisputeListProps {
  persona: DemoPersona;
  disputes: Dispute[];
  shifts: Shift[];
  onResolveDispute?: (disputeId: string, req: ResolveDisputeRequest) => Promise<void>;
}

export function DisputeList({
  persona,
  disputes,
  shifts,
  onResolveDispute,
}: DisputeListProps) {
  const [filter, setFilter] = useState<"ALL" | "OPEN" | "APPROVED" | "REJECTED">("ALL");
  const [selectedDispute, setSelectedDispute] = useState<Dispute | null>(null);
  const [resolveDispute, setResolveDispute] = useState<Dispute | null>(null);

  const filteredDisputes = disputes.filter((d) => {
    if (filter === "ALL") return true;
    return d.status === filter;
  });

  const openCount = disputes.filter((d) => d.status === "OPEN").length;
  const approvedCount = disputes.filter((d) => d.status === "APPROVED").length;
  const rejectedCount = disputes.filter((d) => d.status === "REJECTED").length;

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-xs space-y-2">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h2 className="text-xl font-bold text-slate-900 tracking-tight">
              {persona.role === "WORKER" ? "My Wage Disputes" : "Organization Dispute Ledger"}
            </h2>
            <p className="text-xs text-slate-500 mt-0.5">
              Organization: {persona.organizationName} • Scoped to authenticated membership
            </p>
          </div>

          {/* Filter Pills */}
          <div className="flex items-center gap-1.5 bg-slate-100 p-1 rounded-lg border border-slate-200 text-xs">
            <button
              type="button"
              onClick={() => setFilter("ALL")}
              className={`px-3 py-1.5 rounded-md font-medium transition-all ${
                filter === "ALL" ? "bg-white text-slate-900 shadow-xs" : "text-slate-600 hover:text-slate-900"
              }`}
            >
              All ({disputes.length})
            </button>
            <button
              type="button"
              onClick={() => setFilter("OPEN")}
              className={`px-3 py-1.5 rounded-md font-medium transition-all flex items-center gap-1 ${
                filter === "OPEN" ? "bg-sky-500 text-white font-semibold shadow-xs" : "text-slate-600 hover:text-slate-900"
              }`}
            >
              <span>Open</span>
              {openCount > 0 && <span className="text-[10px] bg-sky-950/20 px-1.5 rounded-full">{openCount}</span>}
            </button>
            <button
              type="button"
              onClick={() => setFilter("APPROVED")}
              className={`px-3 py-1.5 rounded-md font-medium transition-all ${
                filter === "APPROVED" ? "bg-emerald-600 text-white font-semibold shadow-xs" : "text-slate-600 hover:text-slate-900"
              }`}
            >
              Approved ({approvedCount})
            </button>
            <button
              type="button"
              onClick={() => setFilter("REJECTED")}
              className={`px-3 py-1.5 rounded-md font-medium transition-all ${
                filter === "REJECTED" ? "bg-rose-600 text-white font-semibold shadow-xs" : "text-slate-600 hover:text-slate-900"
              }`}
            >
              Rejected ({rejectedCount})
            </button>
          </div>
        </div>
      </div>

      {/* List */}
      {filteredDisputes.length === 0 ? (
        <EmptyState
          title="No Disputes Match Filter"
          description="There are no disputes matching the current status filter."
          action={filter !== "ALL" ? { label: "Show All Disputes", onClick: () => setFilter("ALL") } : undefined}
        />
      ) : (
        <div className="grid grid-cols-1 gap-4">
          {filteredDisputes.map((dispute) => {
            const shift = shifts.find((s) => s.id === dispute.shiftId);
            return (
              <div
                key={dispute.id}
                className="bg-white p-5 rounded-xl border border-slate-200 shadow-xs space-y-3 hover:border-slate-300 transition-colors"
              >
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-100 pb-3">
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-slate-900 text-sm">
                        Case #{dispute.id.slice(0, 8)}…
                      </span>
                      <Badge
                        variant={
                          dispute.status === "OPEN"
                            ? "open"
                            : dispute.status === "APPROVED"
                            ? "approved"
                            : "rejected"
                        }
                      >
                        {dispute.status === "OPEN"
                          ? "Pending Review"
                          : dispute.status === "APPROVED"
                          ? "Approved & Adjusted"
                          : "Rejected"}
                      </Badge>
                    </div>
                    <div className="text-xs text-slate-500 mt-0.5">
                      Target Shift: {shift ? shift.siteLabel : dispute.shiftId.slice(0, 8)} • Filed on {formatDateTimeKolkata(dispute.createdAt)}
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => setSelectedDispute(dispute)}
                      className="px-3 py-1.5 text-xs font-medium text-slate-700 bg-white border border-slate-300 rounded-lg hover:bg-slate-50"
                    >
                      Inspect Full Audit
                    </button>
                    {persona.role === "EMPLOYER" && dispute.status === "OPEN" && onResolveDispute && (
                      <button
                        type="button"
                        onClick={() => setResolveDispute(dispute)}
                        className="px-3.5 py-1.5 text-xs font-semibold text-white bg-blue-600 rounded-lg hover:bg-blue-700 transition-colors"
                      >
                        Adjudicate
                      </button>
                    )}
                  </div>
                </div>

                {/* Claim Statement */}
                <div className="p-3 bg-slate-50 rounded-lg border border-slate-100 text-xs sm:text-sm text-slate-800">
                  <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block mb-1">
                    Worker Claim Statement:
                  </span>
                  &ldquo;{dispute.reason}&rdquo;
                </div>

                {/* If Resolved */}
                {dispute.resolutionExplanation && (
                  <div
                    className={`p-3 rounded-lg border text-xs sm:text-sm ${
                      dispute.status === "APPROVED"
                        ? "bg-emerald-50/70 border-emerald-200 text-emerald-950"
                        : "bg-rose-50/70 border-rose-200 text-rose-950"
                    }`}
                  >
                    <div className="flex items-center justify-between text-xs font-bold mb-1">
                      <span>Employer Resolution Explanation:</span>
                      <span className="font-normal text-[11px] opacity-75">
                        {formatDateTimeKolkata(dispute.resolvedAt)}
                      </span>
                    </div>
                    <p className="text-xs leading-relaxed">{dispute.resolutionExplanation}</p>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* Modals */}
      <DisputeDetailModal
        dispute={selectedDispute}
        shift={selectedDispute ? shifts.find((s) => s.id === selectedDispute.shiftId) : null}
        isOpen={Boolean(selectedDispute)}
        onClose={() => setSelectedDispute(null)}
        isEmployer={persona.role === "EMPLOYER"}
        onResolveClick={(d) => {
          setSelectedDispute(null);
          setResolveDispute(d);
        }}
      />

      {onResolveDispute && (
        <ResolveDisputeModal
          dispute={resolveDispute}
          shift={resolveDispute ? shifts.find((s) => s.id === resolveDispute.shiftId) ?? null : null}
          isOpen={Boolean(resolveDispute)}
          onClose={() => setResolveDispute(null)}
          onSubmit={async (id, req) => {
            await onResolveDispute(id, req);
            setResolveDispute(null);
          }}
        />
      )}
    </div>
  );
}
