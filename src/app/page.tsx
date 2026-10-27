"use client";

import { useState, useEffect, useCallback, useMemo, useRef } from "react";
import { ToastProvider, useToast } from "@/components/common/Toast";
import { Navbar, type NavView } from "@/components/Navbar";
import { PersonaSwitcher } from "@/components/PersonaSwitcher";
import { SignIn } from "@/components/SignIn";
import { IntroSection } from "@/components/IntroSection";
import { WorkerDashboard } from "@/components/worker/WorkerDashboard";
import { EmployerDashboard } from "@/components/employer/EmployerDashboard";
import { DisputeList } from "@/components/disputes/DisputeList";
import { SectorComparisonView } from "@/components/SectorComparisonView";
import { ContractStatusView } from "@/components/ContractStatusView";
import { LoadingSkeleton } from "@/components/common/LoadingSkeleton";
import type { MeResponse, ResolveDisputeRequest } from "@/lib/api-client/types";
import { ApiError, HttpApiClient } from "@/lib/api-client/client";
import { currentKolkataMonth, loadPortalData, portalIdentities, type PortalData } from "@/lib/api-client/portal";
import { getBrowserAuth } from "@/lib/browser-auth";

function FairShiftApp() {
  const { showToast } = useToast();
  const [client] = useState(() => new HttpApiClient());
  const [me, setMe] = useState<MeResponse["data"] | null>(null);
  const [needsSignIn, setNeedsSignIn] = useState(false);
  const [sessionError, setSessionError] = useState<string | null>(null);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [currentView, setCurrentView] = useState<NavView>("DASHBOARD");
  const [month, setMonth] = useState(() => currentKolkataMonth());
  const [loaded, setLoaded] = useState<{ key: string; data: PortalData } | null>(null);
  const [apiError, setApiError] = useState<{ key: string; message: string } | null>(null);
  const requestVersion = useRef(0);
  const sessionVersion = useRef(0);
  const identities = useMemo(() => me ? portalIdentities(me) : [], [me]);
  const currentPersona = identities.find(identity => identity.id === selectedId) ?? identities[0];
  const scopeKey = currentPersona ? `${currentPersona.id}:${month}` : "";

  const refreshSession = useCallback(async () => {
    const version = ++sessionVersion.current;
    return client.getMe().then(response => {
      if (version !== sessionVersion.current) return;
      setMe(response.data);
      setNeedsSignIn(false);
      setSessionError(null);
    }, error => {
      if (version !== sessionVersion.current) return;
      ++requestVersion.current;
      setMe(null);
      setLoaded(null);
      setNeedsSignIn(error instanceof ApiError && error.status === 401);
      setSessionError(error instanceof Error ? error.message : "Unable to verify your session.");
    });
  }, [client]);

  useEffect(() => {
    void refreshSession();
    const onFocus = () => { void refreshSession(); };
    window.addEventListener("focus", onFocus);
    const invalidateSession = () => { ++sessionVersion.current; };
    return () => { invalidateSession(); window.removeEventListener("focus", onFocus); };
  }, [refreshSession]);

  const loadData = useCallback(async () => {
    if (!currentPersona) return;
    const version = ++requestVersion.current;
    return loadPortalData(client, currentPersona, month).then(data => {
      if (version === requestVersion.current) { setApiError(null); setLoaded({ key: scopeKey, data }); }
    }, error => {
      if (version !== requestVersion.current) return;
      setLoaded(null);
      setApiError({ key: scopeKey, message: error instanceof Error ? error.message : "Unable to load records." });
      if (error instanceof ApiError && error.status === 401) {
        setMe(null);
        setNeedsSignIn(true);
      }
      throw error;
    });
  }, [client, currentPersona, month, scopeKey]);

  useEffect(() => {
    void loadData().catch(() => {}); // loadData displays the actual failure in the page.
    const invalidateRequest = () => { ++requestVersion.current; };
    return invalidateRequest;
  }, [loadData]);

  const signOut = async () => {
    ++sessionVersion.current;
    ++requestVersion.current;
    setLoaded(null);
    try {
      const { error } = await getBrowserAuth().auth.signOut();
      if (error) throw error;
      setMe(null);
      setNeedsSignIn(true);
      window.location.reload();
    } catch (error) {
      showToast({ type: "error", title: "Sign-out failed", message: error instanceof Error ? error.message : "Please retry." });
      void refreshSession();
    }
  };

  async function mutate(action: () => Promise<unknown>) {
    await action();
    try { await loadData(); }
    catch { throw new Error("Your change was saved, but updated records could not be loaded. Retry loading before making another change."); }
  }

  if (needsSignIn) return <SignIn />;
  if (!me) return (
    <main className="max-w-xl mx-auto p-8">
      <h1 className="text-xl font-bold mb-4">FairShift</h1>
      {sessionError ? <div role="alert"><p>{sessionError}</p><button className="mt-4 border rounded-lg px-4 py-2" onClick={() => void refreshSession()}>Retry connection</button></div> : <LoadingSkeleton lines={3} />}
    </main>
  );
  if (!currentPersona) return <main className="max-w-xl mx-auto p-8 space-y-4"><h1 className="text-xl font-bold">FairShift</h1><p>No organization memberships are assigned to this account. Contact your organization administrator.</p><button onClick={signOut}>Sign out</button></main>;

  const data = loaded?.key === scopeKey ? loaded.data : null;
  const error = apiError?.key === scopeKey ? apiError.message : null;
  const handleResolveDispute = (id: string, request: ResolveDisputeRequest) => mutate(() => client.resolveDispute(id, request));

  return (
    <div className="min-h-screen flex flex-col bg-slate-50 text-slate-900 font-sans">
      <Navbar currentView={currentView} onSelectView={setCurrentView} persona={currentPersona} disputeCount={data?.disputes.filter(dispute => dispute.status === "OPEN").length ?? 0} />
      <PersonaSwitcher currentPersona={currentPersona} identities={identities} onSelectPersona={identity => { setLoaded(null); setSelectedId(identity.id); }} onSignOut={signOut} />
      <IntroSection />
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 py-6 sm:py-8">
        <div className="flex items-center gap-3 mb-5 text-sm">
          <label htmlFor="report-month">Reporting month (Asia/Kolkata)</label>
          <input id="report-month" type="month" value={month} onChange={event => { if (/^\d{4}-(0[1-9]|1[0-2])$/.test(event.target.value)) { setLoaded(null); setMonth(event.target.value); } }} className="border rounded-lg p-2" />
          <button className="border rounded-lg p-2" onClick={() => void loadData().catch(() => {})}>Refresh records</button>
        </div>
        {error ? <div role="alert" className="p-4 border border-rose-300 rounded-lg bg-rose-50 text-rose-900"><p>Unable to load records: {error}</p><button className="mt-3 underline" onClick={() => void loadData().catch(() => {})}>Retry loading</button></div> : !data ? <LoadingSkeleton lines={5} /> : (
          <div key={scopeKey}>
            {currentView === "DASHBOARD" && currentPersona.role === "WORKER" && <WorkerDashboard persona={currentPersona} shifts={data.shifts} disputes={data.disputes} earnings={data.earnings} onCheckIn={id => mutate(() => client.checkIn(id))} onCheckOut={(id, minutes) => mutate(() => client.checkOut(id, minutes))} onCreateDispute={(shiftId, reason) => mutate(() => client.createDispute({ shiftId, reason }))} />}
            {currentView === "DASHBOARD" && currentPersona.role === "EMPLOYER" && <EmployerDashboard persona={currentPersona} shifts={data.shifts} disputes={data.disputes} dashboardData={data.dashboard} onSetRecordedPay={(id, amount) => mutate(() => client.setRecordedPay(id, amount))} onResolveDispute={handleResolveDispute} />}
            {currentView === "DISPUTES" && <DisputeList persona={currentPersona} disputes={data.disputes} shifts={data.shifts} onResolveDispute={currentPersona.role === "EMPLOYER" ? handleResolveDispute : undefined} />}
            {currentView === "SECTORS" && <SectorComparisonView />}
            {currentView === "CONTRACT" && <ContractStatusView />}
          </div>
        )}
      </main>
      <footer className="bg-white border-t border-slate-200 py-6 text-xs text-slate-500 text-center">FairShift • Workforce Shift &amp; Wage Parity Ledger • Asia/Kolkata</footer>
    </div>
  );
}

export default function Home() {
  return <ToastProvider><FairShiftApp /></ToastProvider>;
}
