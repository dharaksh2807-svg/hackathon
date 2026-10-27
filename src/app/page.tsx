"use client";

import { useState, useEffect, useCallback, useMemo, useRef } from "react";
import { I18nProvider, useI18n } from "@/lib/i18n/context";
import { ToastProvider, useToast } from "@/components/common/Toast";
import { WorkerOnboarding, useOnboarding } from "@/components/common/WorkerOnboarding";
import { LanguageSelector } from "@/components/common/LanguageSelector";
import { Navbar, type NavView } from "@/components/Navbar";
import { PersonaSwitcher } from "@/components/PersonaSwitcher";
import { SignIn } from "@/components/SignIn";
import { IntroSection } from "@/components/IntroSection";
import { WorkerHome } from "@/components/worker/WorkerHome";
import { WorkerDashboard } from "@/components/worker/WorkerDashboard";
import { EmployerDashboard } from "@/components/employer/EmployerDashboard";
import { DisputeList } from "@/components/disputes/DisputeList";
import { SectorComparisonView } from "@/components/SectorComparisonView";
import { ContractStatusView } from "@/components/ContractStatusView";
import { LoadingSkeleton } from "@/components/common/LoadingSkeleton";
import type { MeResponse, ResolveDisputeRequest, OrgWorker } from "@/lib/api-client/types";
import { ApiError, HttpApiClient } from "@/lib/api-client/client";
import { currentKolkataMonth, loadPortalData, portalIdentities, type PortalData } from "@/lib/api-client/portal";
import { getBrowserAuth } from "@/lib/browser-auth";

function FairShiftApp() {
  const { showToast } = useToast();
  const { t, lang } = useI18n();
  const { showOnboarding, completeOnboarding } = useOnboarding();
  const [showLanguagePanel, setShowLanguagePanel] = useState(false);

  const [client] = useState(() => new HttpApiClient());
  const [me, setMe] = useState<MeResponse["data"] | null>(null);
  const [needsSignIn, setNeedsSignIn] = useState(false);
  const [sessionError, setSessionError] = useState<string | null>(null);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [month, setMonth] = useState(() => currentKolkataMonth());
  const [loaded, setLoaded] = useState<{ key: string; data: PortalData } | null>(null);
  const [apiError, setApiError] = useState<{ key: string; message: string } | null>(null);
  const [workers, setWorkers] = useState<OrgWorker[]>([]);

  const requestVersion = useRef(0);
  const sessionVersion = useRef(0);
  const identities = useMemo(() => me ? portalIdentities(me) : [], [me]);
  const currentPersona = identities.find(identity => identity.id === selectedId) ?? identities[0];
  const isWorker = currentPersona?.role === "WORKER";

  const [currentView, setCurrentView] = useState<NavView>(() => (isWorker ? "HOME" : "DASHBOARD"));
  const [prevPersonaId, setPrevPersonaId] = useState<string | null>(null);

  if (currentPersona && currentPersona.id !== prevPersonaId) {
    setPrevPersonaId(currentPersona.id);
    setCurrentView(currentPersona.role === "WORKER" ? "HOME" : "DASHBOARD");
  }

  const scopeKey = currentPersona ? `${currentPersona.id}:${month}` : "";

  // Scroll to top when view changes so Home button and header are immediately visible
  useEffect(() => {
    window.scrollTo({ top: 0, behavior: "instant" });
  }, [currentView]);

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
    if (currentPersona.role !== "WORKER") {
      void client.listOrgWorkers({ orgId: currentPersona.organizationId }).then(res => {
        if (version === requestVersion.current) setWorkers(res.data);
      }).catch(() => {});
    }
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
    try { await action(); }
    catch (error) {
      if (error instanceof ApiError && error.status === 401) {
        ++requestVersion.current;
        setLoaded(null);
        setMe(null);
        setNeedsSignIn(true);
      }
      throw error;
    }
    try { await loadData(); }
    catch { throw new Error("Your change was saved, but updated records could not be loaded. Retry loading before making another change."); }
  }

  if (needsSignIn) return <SignIn />;
  if (!me) return (
    <main className="max-w-xl mx-auto p-8">
      <h1 className="text-xl font-bold mb-4">{t("appName")}</h1>
      {sessionError ? (
        <div role="alert">
          <p>{sessionError}</p>
          <button className="mt-4 border rounded-lg px-4 py-2" onClick={() => void refreshSession()}>
            Retry connection
          </button>
        </div>
      ) : (
        <LoadingSkeleton lines={3} />
      )}
    </main>
  );

  if (!currentPersona) return (
    <main className="max-w-xl mx-auto p-8 space-y-4">
      <h1 className="text-xl font-bold">{t("appName")}</h1>
      <p>No organization memberships are assigned to this account. Contact your organization administrator.</p>
      <button onClick={signOut}>Sign out</button>
    </main>
  );

  const data = loaded?.key === scopeKey ? loaded.data : null;
  const error = apiError?.key === scopeKey ? apiError.message : null;
  const openDisputeCount = data?.disputes.filter(dispute => dispute.status === "OPEN").length ?? 0;
  const handleResolveDispute = (id: string, request: ResolveDisputeRequest) => mutate(() => client.resolveDispute(id, request));
  const handleAddWorker = (name: string, email: string) => {
    if (!currentPersona) return Promise.reject(new Error("No organization selected"));
    return mutate(() => client.addWorker({
      orgId: currentPersona.organizationId,
      workerName: name,
      workerEmail: email,
    }));
  };

  return (
    <div className="min-h-screen flex flex-col bg-slate-50 text-slate-900 font-sans pb-16 sm:pb-0">
      {/* Onboarding modal — for workers on first visit */}
      {showOnboarding && isWorker && (
        <WorkerOnboarding onComplete={completeOnboarding} />
      )}

      {/* Language selection panel overlay */}
      {showLanguagePanel && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm p-5 space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-base font-bold text-slate-900">{t("selectLanguage")}</h2>
              <button
                type="button"
                onClick={() => setShowLanguagePanel(false)}
                className="text-slate-400 hover:text-slate-600 text-xl leading-none"
                aria-label={t("close")}
              >
                ×
              </button>
            </div>
            <LanguageSelector />
            <button
              type="button"
              onClick={() => setShowLanguagePanel(false)}
              className="w-full py-3 bg-blue-600 text-white font-semibold rounded-xl hover:bg-blue-700 transition-colors"
            >
              {t("close")}
            </button>
          </div>
        </div>
      )}

      {/* Top Navbar */}
      <Navbar
        currentView={currentView}
        onSelectView={setCurrentView}
        persona={currentPersona}
        disputeCount={openDisputeCount}
        onOpenLanguage={() => setShowLanguagePanel(true)}
      />

      <PersonaSwitcher
        currentPersona={currentPersona}
        identities={identities}
        onSelectPersona={identity => { setLoaded(null); setSelectedId(identity.id); }}
        onSignOut={signOut}
      />

      <IntroSection />

      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 py-6 sm:py-8">
        <div className="flex flex-wrap items-center gap-3 mb-5 text-sm">
          <label htmlFor="report-month" className="font-medium text-slate-700">
            Reporting month (Asia/Kolkata)
          </label>
          <input
            id="report-month"
            type="month"
            value={month}
            onChange={event => {
              if (/^\d{4}-(0[1-9]|1[0-2])$/.test(event.target.value)) {
                setLoaded(null);
                setMonth(event.target.value);
              }
            }}
            className="border border-slate-300 rounded-lg p-2 bg-white text-slate-800"
          />
          <button
            className="border border-slate-300 bg-white hover:bg-slate-50 text-slate-700 rounded-lg px-3 py-2 font-medium transition-colors"
            onClick={() => void loadData().catch(() => {})}
          >
            Refresh records
          </button>
        </div>

        {error ? (
          <div role="alert" className="p-4 border border-rose-300 rounded-lg bg-rose-50 text-rose-900">
            <p>Unable to load records: {error}</p>
            <button className="mt-3 underline" onClick={() => void loadData().catch(() => {})}>
              Retry loading
            </button>
          </div>
        ) : !data ? (
          <LoadingSkeleton lines={5} />
        ) : (
          <div key={scopeKey}>
            {/* ===== WORKER VIEWS ===== */}
            {isWorker && currentView === "HOME" && (
              <WorkerHome
                shifts={data.shifts}
                earnings={data.earnings}
                disputes={data.disputes}
                workerName={currentPersona.name || "Worker"}
                onGoToShifts={() => setCurrentView("MY_WORK")}
                onGoToEarnings={() => setCurrentView("MY_MONEY")}
                onGoToMissingMoney={() => setCurrentView("MISSING_MONEY")}
                onGoToHelp={() => setCurrentView("GET_HELP")}
              />
            )}

            {isWorker && (currentView === "MY_WORK" || currentView === "MY_MONEY" || currentView === "MISSING_MONEY") && (
              <div className="space-y-4">
                {/* Prominent Return Home Banner */}
                <div className="bg-white p-2.5 sm:p-3 rounded-2xl border border-slate-200 shadow-xs flex items-center justify-between gap-3">
                  <button
                    type="button"
                    onClick={() => setCurrentView("HOME")}
                    className="min-h-[44px] px-4 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 active:bg-blue-800 text-white font-black text-sm sm:text-base flex items-center gap-2.5 shadow-sm transition-all focus-visible:outline-2 focus-visible:outline-blue-500 active:scale-98"
                    aria-label={`${t("navDashboard")} — 🏠`}
                  >
                    <span className="text-xl sm:text-2xl leading-none" aria-hidden="true">🏠</span>
                    <span>← {t("navDashboard")}</span>
                  </button>
                  <span className="text-xs sm:text-sm font-bold text-slate-600 pr-2 truncate">
                    {currentView === "MY_WORK" && t("actionMyWork")}
                    {currentView === "MY_MONEY" && t("actionMyMoney")}
                    {currentView === "MISSING_MONEY" && t("actionMissingMoney")}
                  </span>
                </div>

                <WorkerDashboard
                  persona={currentPersona}
                  shifts={data.shifts}
                  disputes={data.disputes}
                  earnings={data.earnings}
                  onCheckIn={id => mutate(() => client.checkIn(id))}
                  onCheckOut={(id, minutes) => mutate(() => client.checkOut(id, minutes))}
                  onCreateDispute={(shiftId, reason) => mutate(() => client.createDispute({ shiftId, reason }))}
                  initialFilter={
                    currentView === "MISSING_MONEY" ? "DISCREPANCIES"
                    : currentView === "MY_MONEY" ? "COMPLETED"
                    : "ALL"
                  }
                />
              </div>
            )}

            {isWorker && (currentView === "GET_HELP" || currentView === "DISPUTES") && (
              <div className="space-y-4">
                {/* Prominent Return Home Banner */}
                <div className="bg-white p-2.5 sm:p-3 rounded-2xl border border-slate-200 shadow-xs flex items-center justify-between gap-3">
                  <button
                    type="button"
                    onClick={() => setCurrentView("HOME")}
                    className="min-h-[44px] px-4 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 active:bg-blue-800 text-white font-black text-sm sm:text-base flex items-center gap-2.5 shadow-sm transition-all focus-visible:outline-2 focus-visible:outline-blue-500 active:scale-98"
                    aria-label={`${t("navDashboard")} — 🏠`}
                  >
                    <span className="text-xl sm:text-2xl leading-none" aria-hidden="true">🏠</span>
                    <span>← {t("navDashboard")}</span>
                  </button>
                  <span className="text-xs sm:text-sm font-bold text-slate-600 pr-2 truncate">
                    {t("actionGetHelp")}
                  </span>
                </div>

                {/* Help section header */}
                <div className="bg-gradient-to-br from-violet-600 to-violet-800 rounded-2xl p-5 text-white space-y-2">
                  <div className="text-3xl">🙋</div>
                  <h2 className="text-xl font-black">{t("helpTitle")}</h2>
                  <div className="space-y-2 text-sm text-violet-100">
                    <p>{t("helpStep1")}</p>
                    <p>{t("helpStep2")}</p>
                    <p>{t("helpStep3")}</p>
                    <p>{t("helpStep4")}</p>
                  </div>
                </div>

                {/* Complaint list */}
                <DisputeList
                  persona={currentPersona}
                  disputes={data.disputes}
                  shifts={data.shifts}
                />
              </div>
            )}

            {/* ===== EMPLOYER VIEWS ===== */}
            {!isWorker && currentView === "DASHBOARD" && (
              <EmployerDashboard
                persona={currentPersona}
                shifts={data.shifts}
                disputes={data.disputes}
                dashboardData={data.dashboard}
                workers={workers}
                onSetRecordedPay={(id, amount) => mutate(() => client.setRecordedPay(id, amount))}
                onResolveDispute={handleResolveDispute}
                onAddWorker={handleAddWorker}
              />
            )}
            {!isWorker && currentView === "DISPUTES" && (
              <DisputeList
                persona={currentPersona}
                disputes={data.disputes}
                shifts={data.shifts}
                onResolveDispute={handleResolveDispute}
              />
            )}
            {!isWorker && currentView === "SECTORS" && <SectorComparisonView />}
            {!isWorker && currentView === "CONTRACT" && <ContractStatusView />}
          </div>
        )}
      </main>

      {/* Footer */}
      <footer className="bg-white border-t border-slate-200 py-4 text-xs text-slate-500">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 flex flex-col sm:flex-row items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <span className="font-bold text-slate-700">{t("appName")}</span>
            <span>•</span>
            <span>{t("appTagline")}</span>
          </div>
          {!isWorker && (
            <div className="flex items-center gap-2 text-slate-400">
              <span>Contract v1.0</span>
              <span>•</span>
              <span>Integer Paise (roundHalfUp)</span>
              <span>•</span>
              <span className="font-mono">Asia/Kolkata</span>
            </div>
          )}
        </div>
      </footer>

      {/* Mobile Persistent Navigation for Workers */}
      {isWorker && (
        <nav
          aria-label="Worker persistent mobile navigation"
          className="fixed bottom-0 left-0 right-0 z-40 bg-white/95 backdrop-blur-md border-t border-slate-200 shadow-2xl px-3 py-1.5 flex items-center justify-around sm:hidden"
        >
          {/* Prominent HOME Button on Mobile */}
          <button
            type="button"
            onClick={() => setCurrentView("HOME")}
            className={`min-h-[48px] min-w-[96px] px-4 py-1.5 rounded-xl flex flex-col items-center justify-center gap-0.5 transition-all ${
              currentView === "HOME"
                ? "bg-blue-600 text-white font-black shadow-md ring-2 ring-blue-300"
                : "bg-slate-100 text-slate-800 font-bold hover:bg-slate-200 active:scale-95"
            }`}
            aria-label={`${t("navDashboard")} — 🏠`}
          >
            <span className="text-2xl leading-none" aria-hidden="true">🏠</span>
            <span className="text-xs font-black leading-tight tracking-tight">{t("navDashboard")}</span>
          </button>

          {/* Complaints / Help Button on Mobile */}
          <button
            type="button"
            onClick={() => setCurrentView("GET_HELP")}
            className={`relative min-h-[48px] min-w-[96px] px-4 py-1.5 rounded-xl flex flex-col items-center justify-center gap-0.5 transition-all ${
              currentView === "GET_HELP" || currentView === "DISPUTES"
                ? "bg-blue-600 text-white font-black shadow-md ring-2 ring-blue-300"
                : "bg-slate-100 text-slate-800 font-bold hover:bg-slate-200 active:scale-95"
            }`}
            aria-label={t("navComplaints")}
          >
            <span className="text-2xl leading-none" aria-hidden="true">🙋</span>
            <span className="text-xs font-bold leading-tight">{t("navComplaints")}</span>
            {openDisputeCount > 0 && (
              <span className="absolute top-1 right-4 bg-amber-500 text-white text-[10px] font-black px-1.5 py-0.2 rounded-full">
                {openDisputeCount}
              </span>
            )}
          </button>

          {/* Language Toggle Button on Mobile */}
          <button
            type="button"
            onClick={() => setShowLanguagePanel(true)}
            className="min-h-[48px] min-w-[70px] px-3 py-1.5 rounded-xl bg-slate-100 text-slate-800 font-bold hover:bg-slate-200 active:scale-95 flex flex-col items-center justify-center gap-0.5 transition-all"
            aria-label={t("languageLabel")}
          >
            <span className="text-2xl leading-none" aria-hidden="true">🌐</span>
            <span className="text-xs font-bold leading-tight uppercase">{lang}</span>
          </button>
        </nav>
      )}
    </div>
  );
}

export default function Home() {
  return (
    <I18nProvider>
      <ToastProvider>
        <FairShiftApp />
      </ToastProvider>
    </I18nProvider>
  );
}
