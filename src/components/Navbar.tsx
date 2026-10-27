"use client";

import React from "react";
import type { PortalIdentity } from "@/lib/api-client/types";

export type NavView = "DASHBOARD" | "DISPUTES" | "SECTORS" | "CONTRACT";

interface NavbarProps {
  currentView: NavView;
  onSelectView: (view: NavView) => void;
  persona: PortalIdentity;
  disputeCount?: number;
}

export function Navbar({
  currentView,
  onSelectView,
  persona,
  disputeCount = 0,
}: NavbarProps) {
  return (
    <header className="bg-slate-900 border-b border-slate-800 text-white sticky top-0 z-40">
      <div className="max-w-7xl mx-auto px-4 sm:px-6">
        <div className="flex flex-col gap-3 py-3 sm:flex-row sm:items-center sm:justify-between sm:min-h-16">
          {/* Logo */}
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-blue-600 flex items-center justify-center font-black text-white text-lg tracking-wider shadow-sm">
              FS
            </div>
            <div>
              <div className="font-bold text-base text-white tracking-tight flex items-center gap-2">
                <span>FairShift</span>
                <span className="text-[10px] font-mono bg-blue-950 text-blue-300 border border-blue-800 px-1.5 py-0.5 rounded">
                  v1.0 API
                </span>
              </div>
              <div className="text-[11px] text-slate-400 hidden sm:block">
                Workforce Shift & Wage Parity Ledger
              </div>
            </div>
          </div>

          {/* Navigation Links */}
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
              {persona.role === "WORKER" ? "Worker Portal" : "Employer Portal"}
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
              API Status
            </button>
          </nav>
        </div>
      </div>
    </header>
  );
}
