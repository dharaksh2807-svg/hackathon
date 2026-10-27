"use client";

import React from "react";
import { SECTOR_DEFINITIONS } from "@/lib/api-client/types";
import { Badge } from "./common/Badge";

export function SectorComparisonView() {
  const construction = SECTOR_DEFINITIONS.construction;
  const campus = SECTOR_DEFINITIONS.campus;

  return (
    <div className="space-y-8 max-w-7xl mx-auto">
      {/* Intro */}
      <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-xs space-y-2">
        <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-slate-100 text-slate-800 text-xs font-semibold uppercase tracking-wider">
          <span>Cross-Sector Rules Validation</span>
        </div>
        <h2 className="text-xl sm:text-2xl font-bold text-slate-900 tracking-tight">
          Two-Sector Demonstration: Construction vs College Facilities
        </h2>
        <p className="text-sm text-slate-600 leading-relaxed max-w-4xl">
          The same backend supports distinct configured pay models, rate snapshots, overtime thresholds, and dispute workflows. The amounts below illustrate the synthetic seed configurations.
        </p>
      </div>

      {/* Side-by-Side Comparison Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Construction Card */}
        <div className="bg-white rounded-xl border-2 border-amber-300 shadow-xs overflow-hidden flex flex-col justify-between">
          <div className="bg-amber-50 p-5 border-b border-amber-200">
            <div className="flex items-center justify-between">
              <Badge variant="construction" size="md">
                Sector: Construction
              </Badge>
              <span className="text-xs font-mono text-amber-900 bg-amber-200/60 px-2 py-0.5 rounded">
                Version: 1
              </span>
            </div>
            <h3 className="mt-2 text-lg font-bold text-slate-950">
              {construction.name}
            </h3>
            <p className="text-xs text-slate-700 mt-1">
              Civil engineering, masonry, structural scaffolding, and high-risk field trades.
            </p>
          </div>

          <div className="p-5 space-y-4 text-xs sm:text-sm text-slate-800">
            <div className="space-y-2 divide-y divide-slate-100">
              <div className="flex justify-between py-1.5">
                <span className="text-slate-500">Pay Basis:</span>
                <span className="font-semibold text-slate-900 font-mono">HOURLY</span>
              </div>
              <div className="flex justify-between py-1.5">
                <span className="text-slate-500">Standard Base Rate:</span>
                <span className="font-semibold text-slate-900">₹120.00 / hour (12,000 paise)</span>
              </div>
              <div className="flex justify-between py-1.5">
                <span className="text-slate-500">Overtime Threshold:</span>
                <span className="font-semibold text-slate-900">After 8 hours (480 minutes)</span>
              </div>
              <div className="flex justify-between py-1.5">
                <span className="text-slate-500">Overtime Multiplier:</span>
                <span className="font-semibold text-amber-800">1.5× (15,000 bps = ₹180.00/h)</span>
              </div>
              <div className="flex justify-between py-1.5">
                <span className="text-slate-500">Example Site Allowance:</span>
                <span className="font-semibold text-emerald-800">₹50.00 fixed per shift</span>
              </div>
              <div className="flex justify-between py-1.5">
                <span className="text-slate-500">Weekend Premium:</span>
                <span className="font-semibold text-slate-500">None (flat standard rate)</span>
              </div>
            </div>

            {/* Arithmetic Walkthrough */}
            <div className="p-3.5 bg-amber-50/70 border border-amber-200 rounded-lg space-y-2">
              <span className="font-bold text-amber-950 block text-xs uppercase tracking-wider">
                Concrete Seed Shift Scenario (23 Oct 2026):
              </span>
              <p className="text-xs text-slate-700 leading-relaxed">
                9 hours present minus 30m break = 510m paid.
              </p>
              <div className="bg-white p-2.5 rounded border border-amber-200 font-mono text-[11px] space-y-0.5 text-slate-900">
                <div>Regular: 480m @ ₹120/h = ₹960.00 (96,000 paise)</div>
                <div>Overtime: 30m @ ₹180/h = ₹90.00 (9,000 paise)</div>
                <div>Hazard Allowance: ₹50.00 (5,000 paise)</div>
                <div className="font-bold border-t border-slate-200 pt-1 text-emerald-800">
                  Total Expected = ₹1,100.00 (110,000 paise)
                </div>
                <div className="text-slate-700">Employer Recorded = ₹1,040.00</div>
                <div className="font-bold text-amber-900">
                  Discrepancy = +₹60.00 (6,000 paise Shortfall)
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Campus Facilities Card */}
        <div className="bg-white rounded-xl border-2 border-teal-300 shadow-xs overflow-hidden flex flex-col justify-between">
          <div className="bg-teal-50 p-5 border-b border-teal-200">
            <div className="flex items-center justify-between">
              <Badge variant="campus" size="md">
                Sector: College Facilities
              </Badge>
              <span className="text-xs font-mono text-teal-900 bg-teal-200/60 px-2 py-0.5 rounded">
                Version: 1
              </span>
            </div>
            <h3 className="mt-2 text-lg font-bold text-slate-950">
              {campus.name}
            </h3>
            <p className="text-xs text-slate-700 mt-1">
              Higher education cleaning, library maintenance, hostel care, and convocation setup.
            </p>
          </div>

          <div className="p-5 space-y-4 text-xs sm:text-sm text-slate-800">
            <div className="space-y-2 divide-y divide-slate-100">
              <div className="flex justify-between py-1.5">
                <span className="text-slate-500">Pay Basis:</span>
                <span className="font-semibold text-slate-900 font-mono">PER_SHIFT</span>
              </div>
              <div className="flex justify-between py-1.5">
                <span className="text-slate-500">Standard Base Rate:</span>
                <span className="font-semibold text-slate-900">₹650.00 / shift (65,000 paise)</span>
              </div>
              <div className="flex justify-between py-1.5">
                <span className="text-slate-500">Overtime Threshold:</span>
                <span className="font-semibold text-slate-500">0 (Fixed shift basis)</span>
              </div>
              <div className="flex justify-between py-1.5">
                <span className="text-slate-500">Overtime Multiplier:</span>
                <span className="font-semibold text-slate-500">Not Applicable (10,000 bps)</span>
              </div>
              <div className="flex justify-between py-1.5">
                <span className="text-slate-500">Hazard Allowance:</span>
                <span className="font-semibold text-slate-500">None</span>
              </div>
              <div className="flex justify-between py-1.5">
                <span className="text-slate-500">Weekend Premium:</span>
                <span className="font-semibold text-teal-800">₹50.00 (Saturday & Sunday duty)</span>
              </div>
            </div>

            {/* Arithmetic Walkthrough */}
            <div className="p-3.5 bg-teal-50/70 border border-teal-200 rounded-lg space-y-2">
              <span className="font-bold text-teal-950 block text-xs uppercase tracking-wider">
                Concrete Seed Shift Scenario (24 Oct 2026):
              </span>
              <p className="text-xs text-slate-700 leading-relaxed">
                Saturday housekeeping shift in Main Library.
              </p>
              <div className="bg-white p-2.5 rounded border border-teal-200 font-mono text-[11px] space-y-0.5 text-slate-900">
                <div>Flat Shift Base: ₹650.00 (65,000 paise)</div>
                <div>Weekend Duty Bonus (Sat): ₹50.00 (5,000 paise)</div>
                <div>Fixed Allowance: ₹0.00</div>
                <div className="font-bold border-t border-slate-200 pt-1 text-emerald-800">
                  Total Expected = ₹700.00 (70,000 paise)
                </div>
                <div className="text-slate-700">Employer Recorded = ₹650.00 (Standard rate logged)</div>
                <div className="font-bold text-teal-950">
                  Discrepancy = +₹50.00 (5,000 paise Shortfall)
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Parity Principles Table */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-xs p-6 space-y-4">
        <h3 className="text-base font-bold text-slate-900">
          Pay Calculation Rules
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs text-slate-700">
          <div className="p-3 bg-slate-50 rounded-lg border border-slate-200 space-y-1">
            <span className="font-bold text-slate-900 block">1. Integer Paise Math</span>
            <p className="text-slate-600">
              Money is strictly handled as bounded nonnegative integers (paise). Floating point precision rounding is strictly prohibited in payroll arithmetic.
            </p>
          </div>
          <div className="p-3 bg-slate-50 rounded-lg border border-slate-200 space-y-1">
            <span className="font-bold text-slate-900 block">2. Immutable Rate Snapshot</span>
            <p className="text-slate-600">
              When a shift is created, its rates, basis, overtime rules, and weekend eligibility are permanently copied into the shift row. Future policy revisions never modify historical shifts.
            </p>
          </div>
          <div className="p-3 bg-slate-50 rounded-lg border border-slate-200 space-y-1">
            <span className="font-bold text-slate-900 block">3. Dispute Adjudication Trail</span>
            <p className="text-slate-600">
              When an employer approves a dispute, the recorded pay is updated atomically with a mandatory explanation note. Workers see their own dispute resolutions; employers see resolutions within their organization.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
