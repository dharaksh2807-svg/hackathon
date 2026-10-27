"use client";

import React, { useState, useEffect, useCallback } from "react";
import { ToastProvider, useToast } from "@/components/common/Toast";
import { Navbar, type NavView } from "@/components/Navbar";
import { PersonaSwitcher } from "@/components/PersonaSwitcher";
import { IntroSection } from "@/components/IntroSection";
import { WorkerDashboard } from "@/components/worker/WorkerDashboard";
import { EmployerDashboard } from "@/components/employer/EmployerDashboard";
import { DisputeList } from "@/components/disputes/DisputeList";
import { SectorComparisonView } from "@/components/SectorComparisonView";
import { ContractStatusView } from "@/components/ContractStatusView";
import { LoadingSkeleton } from "@/components/common/LoadingSkeleton";

import {
  DEMO_PERSONAS,
  type DemoPersona,
  type Shift,
  type Dispute,
  type EarningsResponse,
  type DashboardResponse,
  type ResolveDisputeRequest,
} from "@/lib/api-client/types";

import {
  HttpApiClient,
  DemoApiClient,
  type FairShiftApiClient,
} from "@/lib/api-client/client";

function FairShiftApp() {
  const { showToast } = useToast();

  // Active persona & view states
  const [currentPersona, setCurrentPersona] = useState<DemoPersona>(DEMO_PERSONAS[0]);
  const [currentView, setCurrentView] = useState<NavView>("DASHBOARD");
  const [isDemoMode, setIsDemoMode] = useState<boolean>(true);

  // Data states
  const [shifts, setShifts] = useState<Shift[]>([]);
  const [disputes, setDisputes] = useState<Dispute[]>([]);
  const [earnings, setEarnings] = useState<EarningsResponse["data"] | null>(null);
  const [dashboardData, setDashboardData] = useState<DashboardResponse["data"] | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [apiError, setApiError] = useState<string | null>(null);

  // Instantiate clients (Demo adapter is stateful singleton across renders)
  const [demoClient] = useState<DemoApiClient>(() => new DemoApiClient());
  const [httpClient] = useState<HttpApiClient>(() => new HttpApiClient());

  const getActiveClient = useCallback((): FairShiftApiClient => {
    return isDemoMode ? demoClient : httpClient;
  }, [isDemoMode, demoClient, httpClient]);

  // Load data for active persona and organization
  const loadData = useCallback(async () => {
    setIsLoading(true);
    setApiError(null);
    const client = getActiveClient();

    try {
      if (currentPersona.role === "WORKER") {
        const [shiftsRes, earningsRes, disputesRes] = await Promise.all([
          client.getWorkerShifts({ orgId: currentPersona.organizationId }),
          client.getWorkerEarnings({ orgId: currentPersona.organizationId, month: "2026-10" }),
          client.getDisputes({ orgId: currentPersona.organizationId }),
        ]);

        setShifts(shiftsRes.data);
        setEarnings(earningsRes.data);
        setDisputes(disputesRes.data);
      } else {
        const [dashRes, shiftsRes, disputesRes] = await Promise.all([
          client.getEmployerDashboard({ orgId: currentPersona.organizationId, month: "2026-10", sector: currentPersona.sector }),
          client.getWorkerShifts({ orgId: currentPersona.organizationId }),
          client.getDisputes({ orgId: currentPersona.organizationId }),
        ]);

        setDashboardData(dashRes.data);
        setShifts(shiftsRes.data);
        setDisputes(disputesRes.data);
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Failed to load organization data.";
      setApiError(msg);
      if (!isDemoMode) {
        showToast({
          type: "warning",
          title: "Live API Unavailable",
          message: "Codex backend in progress. Switch to Offline Demo Mode to test full UI interactivity.",
        });
      }
    } finally {
      setIsLoading(false);
    }
  }, [currentPersona, getActiveClient, isDemoMode, showToast]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // Actions
  const handleCheckIn = async (shiftId: string) => {
    const client = getActiveClient();
    await client.checkIn(shiftId);
    await loadData();
  };

  const handleCheckOut = async (shiftId: string, unpaidBreakMinutes: number) => {
    const client = getActiveClient();
    await client.checkOut(shiftId, unpaidBreakMinutes);
    await loadData();
  };

  const handleCreateDispute = async (shiftId: string, reason: string) => {
    const client = getActiveClient();
    await client.createDispute({ shiftId, reason });
    await loadData();
  };

  const handleSetRecordedPay = async (shiftId: string, amountMinor: number) => {
    const client = getActiveClient();
    await client.setRecordedPay(shiftId, amountMinor);
    await loadData();
  };

  const handleResolveDispute = async (disputeId: string, req: ResolveDisputeRequest) => {
    const client = getActiveClient();
    await client.resolveDispute(disputeId, req);
    await loadData();
  };

  const handleToggleDemoMode = (newIsDemo: boolean) => {
    setIsDemoMode(newIsDemo);
    showToast({
      type: "info",
      title: newIsDemo ? "Switched to Synthetic Demo Fixtures" : "Switched to Live /api Endpoints",
      message: newIsDemo
        ? "Now running on deterministic seed data with local interactive simulation."
        : "Now communicating directly with real backend route handlers.",
    });
  };

  const handleSelectPersona = (persona: DemoPersona) => {
    setCurrentPersona(persona);
    showToast({
      type: "info",
      title: `Active Account: ${persona.name}`,
      message: `Authorized as ${persona.role} for ${persona.organizationName}.`,
    });
  };

  return (
    <div className="min-h-screen flex flex-col bg-slate-50 text-slate-900 font-sans">
      {/* Top Navbar */}
      <Navbar
        currentView={currentView}
        onSelectView={setCurrentView}
        persona={currentPersona}
        disputeCount={disputes.filter((d) => d.status === "OPEN").length}
      />

      {/* Authenticated Persona Switcher */}
      <PersonaSwitcher
        currentPersona={currentPersona}
        onSelectPersona={handleSelectPersona}
        isDemoMode={isDemoMode}
        onToggleDemoMode={handleToggleDemoMode}
      />

      {/* Intro & Architecture Overview */}
      <IntroSection />

      {/* Live Mode Notice (if active) */}
      {!isDemoMode && apiError && (
        <div className="bg-amber-500/10 border-b border-amber-500/30 text-amber-950 p-4">
          <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 text-xs sm:text-sm">
            <div className="flex items-center gap-2">
              <span className="text-lg">⚡</span>
              <div>
                <strong>Live API Mode Selected:</strong> Route handler returned{" "}
                <code className="font-mono bg-white/70 px-1.5 py-0.5 rounded border border-amber-300">
                  {apiError}
                </code>
                . Frontend is ready and waiting for Codex backend implementation.
              </div>
            </div>
            <button
              type="button"
              onClick={() => handleToggleDemoMode(true)}
              className="px-3 py-1.5 bg-amber-600 text-white font-semibold rounded-lg hover:bg-amber-700 transition-colors whitespace-nowrap text-xs shadow-xs"
            >
              Switch to Offline Demo Fixtures
            </button>
          </div>
        </div>
      )}

      {/* Main Content Area */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 py-6 sm:py-8">
        {isLoading ? (
          <div className="space-y-4">
            <LoadingSkeleton lines={4} />
            <LoadingSkeleton lines={3} />
          </div>
        ) : (
          <>
            {currentView === "DASHBOARD" && currentPersona.role === "WORKER" && (
              <WorkerDashboard
                persona={currentPersona}
                shifts={shifts}
                disputes={disputes}
                earnings={earnings}
                onCheckIn={handleCheckIn}
                onCheckOut={handleCheckOut}
                onCreateDispute={handleCreateDispute}
              />
            )}

            {currentView === "DASHBOARD" && currentPersona.role === "EMPLOYER" && (
              <EmployerDashboard
                persona={currentPersona}
                shifts={shifts}
                disputes={disputes}
                dashboardData={dashboardData}
                onSetRecordedPay={handleSetRecordedPay}
                onResolveDispute={handleResolveDispute}
              />
            )}

            {currentView === "DISPUTES" && (
              <DisputeList
                persona={currentPersona}
                disputes={disputes}
                shifts={shifts}
                onResolveDispute={currentPersona.role === "EMPLOYER" ? handleResolveDispute : undefined}
              />
            )}

            {currentView === "SECTORS" && <SectorComparisonView />}

            {currentView === "CONTRACT" && <ContractStatusView />}
          </>
        )}
      </main>

      {/* Enterprise Footer */}
      <footer className="bg-white border-t border-slate-200 py-6 text-xs text-slate-500">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 flex flex-col sm:flex-row items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <span className="font-bold text-slate-700">FairShift</span>
            <span>•</span>
            <span>Workforce Shift & Wage Parity Ledger</span>
            <span>•</span>
            <span className="font-mono text-slate-400">Asia/Kolkata</span>
          </div>
          <div className="flex items-center gap-3">
            <span>Contract v1.0 Frozen</span>
            <span>•</span>
            <span>Integer Paise Arithmetic (roundHalfUp)</span>
            <span>•</span>
            <span>Codex / Antigravity Parallel Integration</span>
          </div>
        </div>
      </footer>
    </div>
  );
}

export default function Home() {
  return (
    <ToastProvider>
      <FairShiftApp />
    </ToastProvider>
  );
}
