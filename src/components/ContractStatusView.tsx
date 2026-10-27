"use client";

import React, { useState } from "react";
import { Badge } from "./common/Badge";

interface EndpointInfo {
  method: "GET" | "POST" | "PUT" | "PATCH";
  path: string;
  queryOrBody: string;
  response: string;
  permission: string;
  purpose: string;
}

const ENDPOINTS: EndpointInfo[] = [
  {
    method: "GET",
    path: "/api/me",
    queryOrBody: "None",
    response: "MeResponseSchema",
    permission: "Authenticated user; own memberships",
    purpose: "Session identity, user ID, email, and organization memberships.",
  },
  {
    method: "GET",
    path: "/api/worker/shifts",
    queryOrBody: "orgId, from?, to?, limit?, offset?",
    response: "ShiftsResponseSchema",
    permission: "WORKER membership; own shifts",
    purpose: "Worker's historical & upcoming shifts with status and parity.",
  },
  {
    method: "GET",
    path: "/api/worker/earnings",
    queryOrBody: "orgId, month (YYYY-MM)",
    response: "EarningsResponseSchema",
    permission: "WORKER membership; own COMPLETED shifts",
    purpose: "Monthly aggregated expected vs recorded earnings.",
  },
  {
    method: "POST",
    path: "/api/worker/shifts/{shiftId}/check-in",
    queryOrBody: "Empty body {}",
    response: "ShiftResponseSchema",
    permission: "WORKER; owns PLANNED shift",
    purpose: "Atomic check-in recording DB server timestamp.",
  },
  {
    method: "POST",
    path: "/api/worker/shifts/{shiftId}/check-out",
    queryOrBody: "{ unpaidBreakMinutes: 0..1440 }",
    response: "ShiftResponseSchema",
    permission: "WORKER; owns CHECKED_IN shift",
    purpose: "Atomic check-out with break attestation and earnings calculation.",
  },
  {
    method: "GET",
    path: "/api/disputes",
    queryOrBody: "orgId, status?, limit?, offset?",
    response: "DisputesResponseSchema",
    permission: "WORKER (own) / EMPLOYER (all org)",
    purpose: "Dispute ledger with status, reasons, and resolution notes.",
  },
  {
    method: "POST",
    path: "/api/disputes",
    queryOrBody: "{ shiftId, reason (10..1000) }",
    response: "DisputeResponseSchema (201 Created)",
    permission: "WORKER; owns COMPLETED shift",
    purpose: "Register formal wage dispute on completed shift.",
  },
  {
    method: "GET",
    path: "/api/employer/dashboard",
    queryOrBody: "orgId, month (YYYY-MM), sector?",
    response: "DashboardResponseSchema",
    permission: "EMPLOYER membership in org",
    purpose: "Executive shift overview, worker counts, and discrepancy metrics.",
  },
  {
    method: "PUT",
    path: "/api/employer/shifts/{shiftId}/recorded-pay",
    queryOrBody: "{ amountMinor: integer paise }",
    response: "RecordedPayResponseSchema",
    permission: "EMPLOYER; COMPLETED shift",
    purpose: "Assign or update employer-recorded pay for shift.",
  },
  {
    method: "PATCH",
    path: "/api/employer/disputes/{disputeId}/resolve",
    queryOrBody: "{ decision: APPROVED/REJECTED, explanation, correctedRecordedAmountMinor? }",
    response: "ResolveDisputeResponseSchema",
    permission: "EMPLOYER in dispute's organization",
    purpose: "Formal dispute adjudication with atomic pay correction.",
  },
];

export function ContractStatusView() {
  const [testResult, setTestResult] = useState<string | null>(null);
  const [isTesting, setIsTesting] = useState(false);

  const runConnectionTest = async () => {
    setIsTesting(true);
    setTestResult(null);
    try {
      const res = await fetch("/api/me", { method: "GET" });
      if (res.ok) {
        setTestResult(`✅ Connected: Backend returned HTTP ${res.status}.`);
      } else {
        const json = await res.json().catch(() => null);
        setTestResult(
          `ℹ️ Backend route returned HTTP ${res.status} (${json?.error?.code || "SERVER_ERROR"}).`
        );
      }
    } catch {
      setTestResult("Unable to reach the backend. Check the connection and retry.");
    } finally {
      setIsTesting(false);
    }
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      {/* Header Banner */}
      <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-xs space-y-3">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-xl font-bold text-slate-900 tracking-tight">
                Frozen REST API Contract Status
              </h2>
              <Badge variant="approved">Contract Frozen</Badge>
            </div>
            <p className="text-xs text-slate-500 mt-1">
              Authoritative schemas: <code className="text-slate-800 font-mono">src/lib/contracts.ts</code> and <code className="text-slate-800 font-mono">docs/API_CONTRACT.md</code>
            </p>
          </div>

          <button
            type="button"
            onClick={runConnectionTest}
            disabled={isTesting}
            className="px-4 py-2 text-xs font-semibold text-white bg-slate-900 hover:bg-slate-800 rounded-lg transition-colors disabled:opacity-50 self-start sm:self-auto"
          >
            {isTesting ? "Pinging /api/me..." : "Probe Live /api/me Endpoint"}
          </button>
        </div>

        {testResult && (
          <div className="p-3 bg-slate-50 border border-slate-200 rounded-lg text-xs font-mono text-slate-800">
            {testResult}
          </div>
        )}
      </div>

      {/* Contract Endpoints Table */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-xs text-left">
            <thead className="bg-slate-50 text-slate-700 font-semibold border-b border-slate-200 uppercase text-[11px] tracking-wider">
              <tr>
                <th className="py-3 px-4">Method & Route</th>
                <th className="py-3 px-4">Query / Body Input</th>
                <th className="py-3 px-4">Response Contract</th>
                <th className="py-3 px-4">Role Enforcement</th>
                <th className="py-3 px-4">Purpose</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-slate-800 font-sans">
              {ENDPOINTS.map((ep, i) => (
                <tr key={i} className="hover:bg-slate-50/60 transition-colors">
                  <td className="py-3 px-4 font-mono font-semibold whitespace-nowrap">
                    <span
                      className={`inline-block px-1.5 py-0.5 rounded text-[10px] mr-1.5 ${
                        ep.method === "GET"
                          ? "bg-blue-100 text-blue-900"
                          : ep.method === "POST"
                          ? "bg-emerald-100 text-emerald-900"
                          : ep.method === "PUT"
                          ? "bg-amber-100 text-amber-900"
                          : "bg-purple-100 text-purple-900"
                      }`}
                    >
                      {ep.method}
                    </span>
                    <span className="text-slate-900">{ep.path}</span>
                  </td>
                  <td className="py-3 px-4 font-mono text-[11px] text-slate-600">
                    {ep.queryOrBody}
                  </td>
                  <td className="py-3 px-4 font-mono text-[11px] text-emerald-800">
                    {ep.response}
                  </td>
                  <td className="py-3 px-4 text-slate-700">
                    {ep.permission}
                  </td>
                  <td className="py-3 px-4 text-slate-500 text-[11px]">
                    {ep.purpose}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
