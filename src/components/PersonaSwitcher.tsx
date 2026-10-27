"use client";

import React from "react";
import { DEMO_PERSONAS, type DemoPersona } from "@/lib/api-client/types";
import { Badge } from "./common/Badge";

interface PersonaSwitcherProps {
  currentPersona: DemoPersona;
  onSelectPersona: (persona: DemoPersona) => void;
  isDemoMode: boolean;
  onToggleDemoMode: (isDemo: boolean) => void;
}

export function PersonaSwitcher({
  currentPersona,
  onSelectPersona,
  isDemoMode,
  onToggleDemoMode,
}: PersonaSwitcherProps) {
  return (
    <div className="bg-white border-b border-slate-200">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-3">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3">
          {/* Identity context info */}
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-slate-900 text-white flex items-center justify-center font-bold text-sm tracking-wide shrink-0">
              {currentPersona.avatarInitials}
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <span className="font-semibold text-slate-900 text-sm">
                  {currentPersona.name}
                </span>
                <Badge variant={currentPersona.role === "WORKER" ? "neutral" : "planned"} size="sm">
                  {currentPersona.role === "WORKER" ? "Authorized Worker" : "Authorized Employer"}
                </Badge>
                <Badge variant={currentPersona.sector === "construction" ? "construction" : "campus"} size="sm">
                  {currentPersona.sector === "construction" ? "Construction" : "College Facilities"}
                </Badge>
              </div>
              <div className="text-xs text-slate-500 flex items-center gap-2 flex-wrap">
                <span>{currentPersona.organizationName}</span>
                <span>•</span>
                <span className="font-mono text-[11px] text-slate-400">
                  orgId: {currentPersona.organizationId.slice(0, 8)}…
                </span>
              </div>
            </div>
          </div>

          {/* Persona selector & Mode Switcher */}
          <div className="flex items-center gap-2 flex-wrap sm:flex-nowrap">
            <div className="flex items-center gap-1.5 bg-slate-100 p-1 rounded-lg border border-slate-200 text-xs">
              <span className="text-slate-500 px-2 font-medium">Switch Account:</span>
              {DEMO_PERSONAS.map((persona) => {
                const isSelected = persona.id === currentPersona.id;
                return (
                  <button
                    key={persona.id}
                    type="button"
                    onClick={() => onSelectPersona(persona)}
                    className={`px-2.5 py-1.5 rounded-md font-medium transition-all ${
                      isSelected
                        ? "bg-white text-slate-900 shadow-xs border border-slate-200"
                        : "text-slate-600 hover:text-slate-900 hover:bg-slate-200/60"
                    }`}
                    title={`${persona.name} — ${persona.organizationName}`}
                  >
                    <span className="mr-1">{persona.sector === "construction" ? "🏗️" : "🎓"}</span>
                    <span>{persona.role === "WORKER" ? "Worker" : "Employer"}</span>
                  </button>
                );
              })}
            </div>

            {/* Offline vs Live Mode Indicator */}
            <div className="flex items-center gap-2 pl-2 border-l border-slate-200">
              <button
                type="button"
                onClick={() => onToggleDemoMode(!isDemoMode)}
                className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-semibold border transition-all ${
                  isDemoMode
                    ? "bg-amber-50 text-amber-900 border-amber-300 hover:bg-amber-100"
                    : "bg-blue-50 text-blue-900 border-blue-300 hover:bg-blue-100"
                }`}
                title="Click to toggle between Synthetic Demo Fixtures and Live API"
              >
                <span className={`w-2 h-2 rounded-full ${isDemoMode ? "bg-amber-500" : "bg-blue-600 animate-pulse"}`} />
                <span>{isDemoMode ? "Offline Demo Mode" : "Live API Mode"}</span>
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
