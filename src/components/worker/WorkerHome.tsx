"use client";

import React from "react";
import { useI18n } from "@/lib/i18n/context";
import { formatPaise } from "@/lib/api-client/currency";
import type { EarningsResponse, Dispute, Shift } from "@/lib/api-client/types";
import { DailyEarningsTracker } from "./DailyEarningsTracker";

interface WorkerHomeActionTile {
  id: string;
  icon: string;
  labelKey: "actionMyWork" | "actionMyMoney" | "actionMissingMoney" | "actionGetHelp";
  descKey: "actionMyWorkDesc" | "actionMyMoneyDesc" | "actionMissingMoneyDesc" | "actionGetHelpDesc";
  bgClass: string;
  iconBgClass: string;
  badgeCount?: number;
  badgeVariant?: "warning" | "info";
  onClick: () => void;
}

interface WorkerHomeProps {
  shifts?: Shift[];
  earnings: EarningsResponse["data"] | null;
  disputes: Dispute[];
  workerName: string;
  onGoToShifts: () => void;
  onGoToEarnings: () => void;
  onGoToMissingMoney: () => void;
  onGoToHelp: () => void;
}

export function WorkerHome({
  shifts = [],
  earnings,
  disputes,
  workerName,
  onGoToShifts,
  onGoToEarnings,
  onGoToMissingMoney,
  onGoToHelp,
}: WorkerHomeProps) {
  const { t } = useI18n();

  const openDisputeCount = disputes.filter((d) => d.status === "OPEN").length;
  const missingMoneyCount = earnings?.underpaidCount ?? 0;
  const effectiveShifts = shifts.length > 0 ? shifts : (earnings?.shifts ?? []);
  // Compute total shortfall from shifts in the earnings response
  const totalShortfallMinor = (earnings?.shifts ?? [])
    .filter((s) => s.comparisonStatus === "UNDERPAID" && s.differenceMinor && s.differenceMinor > 0)
    .reduce((acc, s) => acc + (s.differenceMinor ?? 0), 0);

  const tiles: WorkerHomeActionTile[] = [
    {
      id: "my-work",
      icon: "📅",
      labelKey: "actionMyWork",
      descKey: "actionMyWorkDesc",
      bgClass: "from-blue-500 to-blue-600",
      iconBgClass: "bg-blue-400/30",
      onClick: onGoToShifts,
    },
    {
      id: "my-money",
      icon: "💰",
      labelKey: "actionMyMoney",
      descKey: "actionMyMoneyDesc",
      bgClass: "from-emerald-500 to-emerald-600",
      iconBgClass: "bg-emerald-400/30",
      onClick: onGoToEarnings,
    },
    {
      id: "missing-money",
      icon: "⚠️",
      labelKey: "actionMissingMoney",
      descKey: "actionMissingMoneyDesc",
      bgClass: "from-amber-500 to-amber-600",
      iconBgClass: "bg-amber-400/30",
      badgeCount: missingMoneyCount,
      badgeVariant: "warning",
      onClick: onGoToMissingMoney,
    },
    {
      id: "get-help",
      icon: "🙋",
      labelKey: "actionGetHelp",
      descKey: "actionGetHelpDesc",
      bgClass: "from-violet-500 to-violet-600",
      iconBgClass: "bg-violet-400/30",
      badgeCount: openDisputeCount,
      badgeVariant: "info",
      onClick: onGoToHelp,
    },
  ];

  // First name only, no technical suffixes
  const firstName = workerName.split(" ")[0] ?? workerName;

  return (
    <div className="space-y-6">
      {/* Greeting */}
      <div className="bg-gradient-to-br from-slate-900 to-slate-800 rounded-2xl p-5 text-white">
        <p className="text-slate-400 text-sm">👋 Hello,</p>
        <h1 className="text-2xl font-black mt-0.5 tracking-tight">{firstName}</h1>

        {/* Quick money summary */}
        {earnings && (
          <div className="mt-4 grid grid-cols-3 gap-3">
            <div className="bg-white/10 rounded-xl p-3 text-center">
              <div className="text-xs text-slate-400 mb-1">{t("moneyIShouldGet")}</div>
              <div className="text-base font-black text-emerald-300 leading-tight">
                {formatPaise(earnings.totalExpectedMinor)}
              </div>
            </div>
            <div className="bg-white/10 rounded-xl p-3 text-center">
              <div className="text-xs text-slate-400 mb-1">{t("moneyMyEmployerEntered")}</div>
              <div className="text-base font-black text-white leading-tight">
                {formatPaise(earnings.totalRecordedMinor)}
              </div>
            </div>
            <div className={`rounded-xl p-3 text-center ${
              totalShortfallMinor > 0
                ? "bg-amber-500/30 border border-amber-400/30"
                : "bg-white/10"
            }`}>
              <div className="text-xs text-slate-400 mb-1">{t("moneyStillMissing")}</div>
              <div className={`text-base font-black leading-tight ${
                totalShortfallMinor > 0 ? "text-amber-300" : "text-slate-300"
              }`}>
                {formatPaise(totalShortfallMinor)}
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Daily Earnings Tracker Graph */}
      <DailyEarningsTracker shifts={effectiveShifts} />

      {/* 4 Main Action Tiles */}
      <div className="grid grid-cols-2 gap-3">
        {tiles.map((tile) => (
          <button
            key={tile.id}
            type="button"
            onClick={tile.onClick}
            className={`relative bg-gradient-to-br ${tile.bgClass} text-white rounded-2xl p-4 text-left
              shadow-lg hover:shadow-xl active:scale-95 transition-all duration-150 min-h-[120px]
              flex flex-col justify-between focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-400`}
            aria-label={`${t(tile.labelKey)} — ${t(tile.descKey)}`}
          >
            {/* Badge */}
            {tile.badgeCount !== undefined && tile.badgeCount > 0 && (
              <span className={`absolute top-2 right-2 min-w-[20px] h-5 px-1.5 rounded-full text-[11px] font-black
                flex items-center justify-center shadow
                ${tile.badgeVariant === "warning" ? "bg-red-500 text-white" : "bg-white/20 text-white"}`}
                aria-label={`${tile.badgeCount} pending`}
              >
                {tile.badgeCount}
              </span>
            )}

            {/* Icon */}
            <div className={`w-12 h-12 ${tile.iconBgClass} rounded-xl flex items-center justify-center text-2xl`}>
              {tile.icon}
            </div>

            {/* Label */}
            <div>
              <div className="font-black text-base leading-snug">{t(tile.labelKey)}</div>
              <div className="text-white/75 text-xs mt-0.5 leading-snug">{t(tile.descKey)}</div>
            </div>
          </button>
        ))}
      </div>
    </div>
  );
}
