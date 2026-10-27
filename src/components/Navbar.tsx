"use client";

import React from "react";
import type { PortalIdentity } from "@/lib/api-client/types";
import { useI18n } from "@/lib/i18n/context";

export type WorkerView = "HOME" | "MY_WORK" | "MY_MONEY" | "MISSING_MONEY" | "GET_HELP";
export type EmployerView = "DASHBOARD" | "DISPUTES" | "SECTORS" | "CONTRACT";
export type NavView = WorkerView | EmployerView;

interface NavbarProps {
  currentView: NavView;
  onSelectView: (view: NavView) => void;
  persona: PortalIdentity;
  disputeCount?: number;
  onOpenLanguage?: () => void;
}

export function Navbar({
  currentView,
  onSelectView,
  persona,
  disputeCount = 0,
  onOpenLanguage,
}: NavbarProps) {
  const { t, lang } = useI18n();
  const isWorker = persona.role === "WORKER";

  return (
    <header className="bg-slate-900 border-b border-slate-800 text-white sticky top-0 z-40">
      <div className="max-w-7xl mx-auto px-4 sm:px-6">
        <div className="flex items-center justify-between h-16">
          {/* Logo */}
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-blue-600 flex items-center justify-center font-black text-white text-base tracking-wider shadow-sm">
              FS
            </div>
            <div>
              <div className="font-bold text-base text-white tracking-tight flex items-center gap-2">
                <span>{t("appName")}</span>
                <span className="text-[10px] font-mono bg-blue-950 text-blue-300 border border-blue-800 px-1.5 py-0.5 rounded">
                  v1.0 API
                </span>
              </div>
              <div className="text-[11px] text-slate-400 hidden sm:block">
                {t("appTagline")}
              </div>
            </div>
          </div>

          {/* Navigation Links — role adaptive */}
          {isWorker ? (
            <nav aria-label="Worker navigation" className="flex items-center gap-1.5 sm:gap-2">
              {/* Prominent HOME button */}
              <button
                type="button"
                aria-current={currentView === "HOME" ? "page" : undefined}
                onClick={() => onSelectView("HOME")}
                className={`min-h-[44px] px-3.5 sm:px-4 py-2 rounded-xl text-xs sm:text-sm font-black transition-all flex items-center gap-1.5 sm:gap-2 shadow-sm ${
                  currentView === "HOME"
                    ? "bg-blue-600 text-white ring-2 ring-blue-300 border border-blue-500 shadow-md"
                    : "bg-slate-800 text-slate-100 hover:text-white hover:bg-slate-700 border border-slate-700 active:scale-95"
                }`}
                aria-label={`${t("navDashboard")} — 🏠`}
                title={t("navDashboard")}
              >
                <span className="text-xl sm:text-2xl leading-none" aria-hidden="true">🏠</span>
                <span className="tracking-tight">{t("navDashboard")}</span>
              </button>

              {/* Complaints / Help */}
              <button
                type="button"
                aria-current={currentView === "GET_HELP" ? "page" : undefined}
                onClick={() => onSelectView("GET_HELP")}
                className={`relative min-h-[44px] px-3 py-2 rounded-xl text-xs sm:text-sm font-bold transition-all flex items-center gap-1.5 ${
                  currentView === "GET_HELP"
                    ? "bg-blue-600 text-white ring-2 ring-blue-300 border border-blue-500 shadow-md"
                    : "text-slate-300 hover:text-white hover:bg-slate-800/60"
                }`}
                aria-label={t("navComplaints")}
              >
                <span className="text-lg leading-none" aria-hidden="true">🙋</span>
                <span className="hidden sm:inline">{t("navComplaints")}</span>
                {disputeCount > 0 && (
                  <span className="bg-amber-500 text-white text-[10px] font-bold px-1.5 py-0.5 rounded-full">
                    {disputeCount}
                  </span>
                )}
              </button>

              {/* Language toggle button */}
              {onOpenLanguage && (
                <button
                  type="button"
                  onClick={onOpenLanguage}
                  className="min-h-[44px] px-2.5 py-2 rounded-xl text-xs font-semibold text-slate-300 hover:text-white hover:bg-slate-800/60 transition-all flex items-center gap-1"
                  aria-label={t("languageLabel")}
                  title={t("languageLabel")}
                >
                  <span className="text-xl leading-none" aria-hidden="true">🌐</span>
                  <span className="text-xs uppercase font-bold text-slate-300 hidden sm:inline">{lang}</span>
                </button>
              )}
            </nav>
          ) : (
            <nav aria-label="Main navigation" className="flex flex-wrap items-center gap-1 sm:gap-2">
              <button
                type="button"
                aria-current={currentView === "DASHBOARD" ? "page" : undefined}
                onClick={() => onSelectView("DASHBOARD")}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                  currentView === "DASHBOARD"
                    ? "bg-slate-800 text-white shadow-xs border border-slate-700"
                    : "text-slate-300 hover:text-white hover:bg-slate-800/60"
                }`}
              >
                {t("employerPortal")}
              </button>

              <button
                type="button"
                aria-current={currentView === "DISPUTES" ? "page" : undefined}
                onClick={() => onSelectView("DISPUTES")}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all flex items-center gap-1.5 ${
                  currentView === "DISPUTES"
                    ? "bg-slate-800 text-white shadow-xs border border-slate-700"
                    : "text-slate-300 hover:text-white hover:bg-slate-800/60"
                }`}
              >
                <span>Disputes</span>
                {disputeCount > 0 && (
                  <span className="bg-sky-600 text-white text-[10px] font-bold px-1.5 py-0.2 rounded-full">
                    {disputeCount}
                  </span>
                )}
              </button>

              <button
                type="button"
                aria-current={currentView === "SECTORS" ? "page" : undefined}
                onClick={() => onSelectView("SECTORS")}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                  currentView === "SECTORS"
                    ? "bg-slate-800 text-white shadow-xs border border-slate-700"
                    : "text-slate-300 hover:text-white hover:bg-slate-800/60"
                }`}
              >
                Two Sectors
              </button>

              <button
                type="button"
                aria-current={currentView === "CONTRACT" ? "page" : undefined}
                onClick={() => onSelectView("CONTRACT")}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                  currentView === "CONTRACT"
                    ? "bg-slate-800 text-white shadow-xs border border-slate-700"
                    : "text-slate-300 hover:text-white hover:bg-slate-800/60"
                }`}
              >
                {t("navApiStatus")}
              </button>

              {onOpenLanguage && (
                <button
                  type="button"
                  onClick={onOpenLanguage}
                  className="px-2.5 py-1.5 rounded-lg text-xs font-semibold text-slate-300 hover:text-white hover:bg-slate-800/60 transition-all flex items-center gap-1"
                  aria-label={t("languageLabel")}
                  title={t("languageLabel")}
                >
                  <span className="text-base leading-none" aria-hidden="true">🌐</span>
                  <span className="text-xs uppercase font-bold text-slate-300">{lang}</span>
                </button>
              )}
            </nav>
          )}
        </div>
      </div>
    </header>
  );
}
