"use client";

import React, { useState, useMemo } from "react";
import type { Shift } from "@/lib/api-client/types";
import { useI18n } from "@/lib/i18n/context";
import { formatPaise, formatPaiseCompact } from "@/lib/api-client/currency";
import { formatMinutes, formatDateOnlyKolkata } from "@/lib/api-client/formatters";

interface DailyEarningsTrackerProps {
  shifts: Shift[];
}

type Timeframe = "WEEKLY" | "MONTHLY";

interface DailyItem {
  id: string;
  dateIso: string;
  dayNumber: number;
  monthShort: string;
  dayLabel: string;
  weekdayLabel: string;
  fullDateLabel: string;
  workedMinutes: number;
  workedFormatted: string;
  expectedPaise: number;
  recordedPaise: number | null;
  differencePaise: number | null;
  comparisonStatus: Shift["comparisonStatus"];
  siteLabel: string;
}

export function DailyEarningsTracker({ shifts }: DailyEarningsTrackerProps) {
  const { t } = useI18n();

  // Extract completed shifts that have earnings calculation
  const completedShifts = useMemo(() => {
    return shifts
      .filter((s) => s.status === "COMPLETED" && s.earnings !== null)
      .sort((a, b) => new Date(a.scheduledStartAt).getTime() - new Date(b.scheduledStartAt).getTime());
  }, [shifts]);

  // Transform to DailyItem
  const allDailyItems = useMemo<DailyItem[]>(() => {
    return completedShifts.map((shift) => {
      const date = new Date(shift.scheduledStartAt);
      const dayFormatter = new Intl.DateTimeFormat("en-IN", {
        timeZone: "Asia/Kolkata",
        day: "numeric",
      });
      const monthFormatter = new Intl.DateTimeFormat("en-IN", {
        timeZone: "Asia/Kolkata",
        month: "short",
      });
      const weekdayFormatter = new Intl.DateTimeFormat("en-IN", {
        timeZone: "Asia/Kolkata",
        weekday: "short",
      });

      const dayNumStr = dayFormatter.format(date);
      const monthStr = monthFormatter.format(date);
      const weekdayStr = weekdayFormatter.format(date);

      return {
        id: shift.id,
        dateIso: shift.scheduledStartAt,
        dayNumber: parseInt(dayNumStr, 10) || 1,
        monthShort: monthStr,
        dayLabel: `${dayNumStr} ${monthStr}`,
        weekdayLabel: weekdayStr,
        fullDateLabel: formatDateOnlyKolkata(shift.scheduledStartAt),
        workedMinutes: shift.earnings?.workedMinutes ?? 0,
        workedFormatted: formatMinutes(shift.earnings?.workedMinutes ?? 0),
        expectedPaise: shift.earnings?.expectedMinor ?? 0,
        recordedPaise: shift.recordedAmountMinor,
        differencePaise: shift.differenceMinor,
        comparisonStatus: shift.comparisonStatus,
        siteLabel: shift.siteLabel,
      };
    });
  }, [completedShifts]);

  // Determine initial timeframe: weekly if shifts fall within past 7 days, else monthly
  const [timeframe, setTimeframe] = useState<Timeframe>("MONTHLY");

  // Filter items based on timeframe
  const displayItems = useMemo<DailyItem[]>(() => {
    if (allDailyItems.length === 0) return [];
    if (timeframe === "MONTHLY") {
      return allDailyItems;
    }

    // Weekly: get items from the latest week (last 7 days based on the latest shift or today)
    const latestDate = new Date(allDailyItems[allDailyItems.length - 1].dateIso);
    const sevenDaysPrior = new Date(latestDate.getTime() - 7 * 24 * 60 * 60 * 1000);
    const weeklyItems = allDailyItems.filter((item) => new Date(item.dateIso) >= sevenDaysPrior);

    return weeklyItems.length > 0 ? weeklyItems : allDailyItems;
  }, [allDailyItems, timeframe]);

  // Selected day for the detailed view (defaults to latest shift)
  const [selectedShiftId, setSelectedShiftId] = useState<string | null>(null);

  // Sync selection when displayItems changes
  const activeSelectedId = useMemo(() => {
    if (selectedShiftId && displayItems.some((i) => i.id === selectedShiftId)) {
      return selectedShiftId;
    }
    return displayItems.length > 0 ? displayItems[displayItems.length - 1].id : null;
  }, [selectedShiftId, displayItems]);

  const selectedItem = useMemo(() => {
    return displayItems.find((i) => i.id === activeSelectedId) ?? null;
  }, [displayItems, activeSelectedId]);

  // Compute maximum amount for Y-axis scaling
  const maxPaise = useMemo(() => {
    if (displayItems.length === 0) return 100_000;
    const highest = Math.max(
      ...displayItems.map((i) => Math.max(i.expectedPaise, i.recordedPaise ?? 0))
    );
    // Add 15% headroom and round to nearest 10,000 paise (₹100)
    return Math.max(Math.ceil((highest * 1.15) / 10_000) * 10_000, 100_000);
  }, [displayItems]);

  return (
    <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-4 sm:p-6 space-y-5">
      {/* Header with Title and Timeframe Toggle */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-100">
        <div className="space-y-0.5">
          <div className="flex items-center gap-2">
            <span className="text-xl sm:text-2xl" aria-hidden="true">📊</span>
            <h2 className="text-lg sm:text-xl font-black text-slate-900 tracking-tight">
              {t("dailyEarningsTitle")}
            </h2>
          </div>
          <p className="text-xs sm:text-sm text-slate-500 font-medium">
            {t("dailyEarningsSubtitle")}
          </p>
        </div>

        {/* Timeframe Toggle Buttons (Weekly / Monthly) */}
        <div
          className="inline-flex items-center bg-slate-100 p-1 rounded-xl border border-slate-200 self-start sm:self-auto"
          role="group"
          aria-label="Timeframe selection"
        >
          <button
            type="button"
            onClick={() => setTimeframe("WEEKLY")}
            className={`min-h-[40px] px-3.5 py-1.5 rounded-lg text-xs sm:text-sm font-bold transition-all ${
              timeframe === "WEEKLY"
                ? "bg-white text-blue-700 shadow-xs border border-slate-200/80"
                : "text-slate-600 hover:text-slate-900"
            }`}
          >
            {t("timeframeWeekly")}
          </button>
          <button
            type="button"
            onClick={() => setTimeframe("MONTHLY")}
            className={`min-h-[40px] px-3.5 py-1.5 rounded-lg text-xs sm:text-sm font-bold transition-all ${
              timeframe === "MONTHLY"
                ? "bg-white text-blue-700 shadow-xs border border-slate-200/80"
                : "text-slate-600 hover:text-slate-900"
            }`}
          >
            {t("timeframeMonthly")}
          </button>
        </div>
      </div>

      {/* Legend & Guidance */}
      <div className="flex flex-wrap items-center justify-between gap-2.5 text-xs">
        <div className="flex flex-wrap items-center gap-3">
          <div className="flex items-center gap-1.5">
            <span className="w-3.5 h-3.5 rounded-md bg-emerald-500 shadow-xs inline-block" />
            <span className="font-bold text-slate-700">{t("expectedLegend")}</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-3.5 h-3.5 rounded-md bg-blue-600 shadow-xs inline-block" />
            <span className="font-bold text-slate-700">{t("recordedLegend")}</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-3.5 h-3.5 rounded-md bg-amber-500 shadow-xs inline-block" />
            <span className="font-bold text-slate-700">{t("differenceLegend")}</span>
          </div>
        </div>
        <span className="text-[11px] font-medium text-slate-400 hidden sm:inline">
          {t("tapBarHint")}
        </span>
      </div>

      {/* Empty State */}
      {displayItems.length === 0 ? (
        <div className="py-12 px-4 text-center bg-slate-50 rounded-2xl border border-dashed border-slate-200 space-y-2">
          <div className="text-4xl">📊</div>
          <h3 className="text-base font-bold text-slate-800">{t("noEarningsData")}</h3>
          <p className="text-xs text-slate-500 max-w-sm mx-auto">{t("noEarningsDesc")}</p>
          {timeframe === "WEEKLY" && allDailyItems.length > 0 && (
            <button
              type="button"
              onClick={() => setTimeframe("MONTHLY")}
              className="mt-2 min-h-[44px] px-4 py-2 bg-blue-600 text-white rounded-xl text-xs font-bold shadow-xs hover:bg-blue-700 transition-colors"
            >
              {t("timeframeMonthly")} ({allDailyItems.length})
            </button>
          )}
        </div>
      ) : (
        <>
          {/* Chart Canvas */}
          <div className="relative pt-4 pb-2 bg-gradient-to-b from-slate-50/60 to-white rounded-2xl p-3 sm:p-5 border border-slate-100">
            {/* Y-axis guidelines */}
            <div className="absolute inset-x-3 sm:inset-x-5 top-4 bottom-14 flex flex-col justify-between pointer-events-none select-none">
              {[maxPaise, Math.round(maxPaise / 2), 0].map((paiseVal, idx) => (
                <div key={idx} className="flex items-center w-full">
                  <span className="text-[10px] font-mono font-semibold text-slate-400 w-12 sm:w-16 shrink-0 text-left">
                    {formatPaiseCompact(paiseVal)}
                  </span>
                  <div className="w-full border-b border-dashed border-slate-200" />
                </div>
              ))}
            </div>

            {/* Bars Area */}
            <div className="relative h-60 pl-12 sm:pl-16 pr-1 flex items-end justify-around gap-2 sm:gap-6 z-10">
              {displayItems.map((item) => {
                const isSelected = item.id === activeSelectedId;
                const expectedHeightPct = Math.min(Math.round((item.expectedPaise / maxPaise) * 100), 100);
                const recordedHeightPct =
                  item.recordedPaise !== null
                    ? Math.min(Math.round((item.recordedPaise / maxPaise) * 100), 100)
                    : 0;

                const isUnderpaid = item.comparisonStatus === "UNDERPAID";
                const isPending = item.recordedPaise === null;

                return (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => setSelectedShiftId(item.id)}
                    className={`group flex-1 max-w-[84px] h-full flex flex-col justify-end items-center cursor-pointer min-h-[48px] rounded-xl p-1.5 transition-all outline-none focus-visible:ring-2 focus-visible:ring-blue-500 ${
                      isSelected
                        ? "bg-blue-50/80 ring-2 ring-blue-500 shadow-sm"
                        : "hover:bg-slate-100/60"
                    }`}
                    aria-label={`${item.fullDateLabel}: Expected ${formatPaise(item.expectedPaise)}, Recorded ${
                      item.recordedPaise !== null ? formatPaise(item.recordedPaise) : "pending"
                    }`}
                  >
                    {/* Bars Container */}
                    <div className="w-full h-44 flex items-end justify-center gap-1.5 sm:gap-2 pb-1">
                      {/* Expected Bar (Emerald) */}
                      <div className="w-1/2 flex flex-col items-center justify-end h-full">
                        <span className="text-[10px] font-bold text-emerald-800 mb-0.5 leading-none">
                          {formatPaiseCompact(item.expectedPaise)}
                        </span>
                        <div
                          style={{ height: `${expectedHeightPct}%` }}
                          className={`w-full min-w-[14px] max-w-[26px] bg-emerald-500 rounded-t-md transition-all duration-200 shadow-xs group-hover:bg-emerald-600 ${
                            isSelected ? "ring-2 ring-emerald-400" : ""
                          }`}
                        />
                      </div>

                      {/* Recorded Bar (Blue / Amber / Dashed) */}
                      <div className="w-1/2 flex flex-col items-center justify-end h-full">
                        <span
                          className={`text-[10px] font-bold mb-0.5 leading-none ${
                            isUnderpaid
                              ? "text-amber-800"
                              : isPending
                              ? "text-slate-400"
                              : "text-blue-800"
                          }`}
                        >
                          {item.recordedPaise !== null
                            ? formatPaiseCompact(item.recordedPaise)
                            : "⏳"}
                        </span>
                        {item.recordedPaise !== null ? (
                          <div
                            style={{ height: `${recordedHeightPct}%` }}
                            className={`w-full min-w-[14px] max-w-[26px] rounded-t-md transition-all duration-200 shadow-xs ${
                              isUnderpaid
                                ? "bg-amber-500 group-hover:bg-amber-600"
                                : "bg-blue-600 group-hover:bg-blue-700"
                            } ${isSelected ? "ring-2 ring-offset-1 ring-blue-400" : ""}`}
                          />
                        ) : (
                          <div
                            style={{ height: `${expectedHeightPct}%` }}
                            className="w-full min-w-[14px] max-w-[26px] rounded-t-md border-2 border-dashed border-slate-300 bg-slate-200/50 flex items-center justify-center"
                            title={t("statusPendingEntry")}
                          />
                        )}
                      </div>
                    </div>

                    {/* X-axis Label (Day & Weekday) */}
                    <div className="w-full pt-2 border-t border-slate-200 text-center">
                      <div
                        className={`text-xs font-black leading-tight ${
                          isSelected ? "text-blue-700" : "text-slate-900"
                        }`}
                      >
                        {item.dayNumber} {item.monthShort}
                      </div>
                      <div className="text-[10px] font-semibold text-slate-500 uppercase tracking-wider">
                        {item.weekdayLabel}
                      </div>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Selected Day Details Panel (Tap to inspect) */}
          {selectedItem && (
            <div className="bg-gradient-to-br from-slate-900 via-slate-900 to-slate-800 text-white rounded-2xl p-4 sm:p-5 shadow-lg border border-slate-700 space-y-4 transition-all">
              {/* Card Header: Date & Site */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1.5 border-b border-slate-800 pb-3">
                <div className="flex items-center gap-2">
                  <span className="text-xl" aria-hidden="true">📅</span>
                  <div>
                    <h3 className="text-base sm:text-lg font-black text-white">
                      {selectedItem.fullDateLabel}
                    </h3>
                    <p className="text-xs text-slate-400">{selectedItem.siteLabel}</p>
                  </div>
                </div>

                {/* Status Badge */}
                <div>
                  {selectedItem.comparisonStatus === "MATCHED" && (
                    <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                      ✅ {t("statusMatched")}
                    </span>
                  )}
                  {selectedItem.comparisonStatus === "UNDERPAID" && (
                    <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-bold bg-amber-500/20 text-amber-300 border border-amber-500/40">
                      ⚠️ {t("differenceLegend")}: {formatPaise(selectedItem.differencePaise)}
                    </span>
                  )}
                  {selectedItem.comparisonStatus === "NOT_RECORDED" && (
                    <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-bold bg-slate-700 text-slate-300 border border-slate-600">
                      ⏳ {t("statusPendingEntry")}
                    </span>
                  )}
                </div>
              </div>

              {/* 3 Metric Stat Blocks */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                {/* Worked Time */}
                <div className="bg-white/10 rounded-xl p-3.5 space-y-1">
                  <div className="text-xs font-medium text-slate-300 flex items-center gap-1">
                    <span>⏱️</span>
                    <span>{t("workedHours")}</span>
                  </div>
                  <div className="text-xl sm:text-2xl font-black text-white">
                    {selectedItem.workedFormatted}
                  </div>
                  <div className="text-[11px] text-slate-400">
                    {selectedItem.workedMinutes} min
                  </div>
                </div>

                {/* Expected Pay */}
                <div className="bg-emerald-950/40 border border-emerald-500/30 rounded-xl p-3.5 space-y-1">
                  <div className="text-xs font-medium text-emerald-300 flex items-center gap-1">
                    <span>💰</span>
                    <span>{t("expectedLegend")}</span>
                  </div>
                  <div className="text-xl sm:text-2xl font-black text-emerald-400">
                    {formatPaise(selectedItem.expectedPaise)}
                  </div>
                  <div className="text-[11px] text-emerald-200/70">
                    {t("moneyIShouldGet")}
                  </div>
                </div>

                {/* Recorded Pay */}
                <div className="bg-white/10 rounded-xl p-3.5 space-y-1">
                  <div className="text-xs font-medium text-slate-300 flex items-center gap-1">
                    <span>📋</span>
                    <span>{t("recordedLegend")}</span>
                  </div>
                  <div className="text-xl sm:text-2xl font-black text-white">
                    {selectedItem.recordedPaise !== null
                      ? formatPaise(selectedItem.recordedPaise)
                      : t("statusPendingEntry")}
                  </div>
                  <div className="text-[11px] text-slate-400">
                    {selectedItem.recordedPaise !== null
                      ? t("moneyMyEmployerEntered")
                      : t("statusPendingEntry")}
                  </div>
                </div>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}
