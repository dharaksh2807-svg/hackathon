"use client";

import React, { useState } from "react";

export function IntroSection() {
  const [isExpanded, setIsExpanded] = useState(true);

  return (
    <div className="bg-slate-900 text-white border-b border-slate-800">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-5">
        <div className="flex flex-col sm:flex-row items-start justify-between gap-4">
          <div>
            <div className="inline-flex items-center gap-2 px-2.5 py-1 rounded-md bg-blue-950 border border-blue-800 text-blue-300 text-xs font-semibold uppercase tracking-wider mb-2">
              <span>Fair Workforce Transparency Protocol</span>
            </div>
            <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-white">
              FairShift — Shift Attendance & Earnings Comparison
            </h1>
            <p className="mt-1 text-slate-300 text-sm max-w-3xl leading-relaxed">
              Identifying differences between expected and recorded shift pay. Workers track exact expected earnings calculated from immutable shift rule snapshots, compare them against employer-recorded pay, and raise structured disputes with audit logs.
            </p>
          </div>

          <button
            type="button"
            aria-expanded={isExpanded}
            onClick={() => setIsExpanded(!isExpanded)}
            className="text-xs text-slate-400 hover:text-white px-3 py-1.5 rounded-lg border border-slate-700 hover:border-slate-500 transition-colors shrink-0"
          >
            {isExpanded ? "Hide Architecture Guide ▲" : "Show Architecture Guide ▼"}
          </button>
        </div>

        {isExpanded && (
          <div className="mt-5 grid grid-cols-1 md:grid-cols-3 gap-4 pt-4 border-t border-slate-800/80 text-xs sm:text-sm">
            {/* Column 1: The Problem */}
            <div className="p-3.5 bg-slate-800/60 rounded-lg border border-slate-700/60 space-y-1.5">
              <div className="flex items-center gap-2 font-semibold text-amber-400">
                <span>⚠️ The Wage Discrepancy Problem</span>
              </div>
              <p className="text-slate-300 text-xs leading-relaxed">
                Informal rosters and delayed accounting routinely lose track of overtime beyond 8 hours, hazardous site allowances, and weekend duty differentials. Frontline workers only find out after pay day.
              </p>
            </div>

            {/* Column 2: The FairShift Solution */}
            <div className="p-3.5 bg-slate-800/60 rounded-lg border border-slate-700/60 space-y-1.5">
              <div className="flex items-center gap-2 font-semibold text-emerald-400">
                <span>🛡️ Immutable Pay Snapshots</span>
              </div>
              <p className="text-slate-300 text-xs leading-relaxed">
                Every shift locks its configured rates at creation. Server timestamps and worker-reported breaks calculate expected pay in integer paise (<code className="text-blue-300">roundHalfUp</code>). Differences trigger instant <span className="text-amber-300 font-semibold">UNDERPAID</span> indicators.
              </p>
            </div>

            {/* Column 3: Two Distinct Sectors */}
            <div className="p-3.5 bg-slate-800/60 rounded-lg border border-slate-700/60 space-y-1.5">
              <div className="flex items-center gap-2 font-semibold text-blue-400">
                <span>🏗️ Multi-Sector Support</span>
              </div>
              <p className="text-slate-300 text-xs leading-relaxed">
                Tailored for distinct operating models: <strong>Construction</strong> (hourly ₹120 + 1.5× OT after 480m + ₹50 site allowance) vs <strong>College Facilities</strong> (flat ₹650 per shift + ₹50 Saturday/Sunday bonus).
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
