"use client";

import React, { useState } from "react";
import { useI18n } from "@/lib/i18n/context";
import { LanguageSelector } from "./LanguageSelector";

const STORAGE_KEY = "fairshift_onboarding_done";

const STEPS = [
  {
    icon: "📅",
    bgClass: "from-blue-500 to-blue-700",
    titleKey: "onboardingStep1Title" as const,
    descKey: "onboardingStep1Desc" as const,
  },
  {
    icon: "💰",
    bgClass: "from-emerald-500 to-emerald-700",
    titleKey: "onboardingStep2Title" as const,
    descKey: "onboardingStep2Desc" as const,
  },
  {
    icon: "⚠️",
    bgClass: "from-amber-500 to-amber-700",
    titleKey: "onboardingStep3Title" as const,
    descKey: "onboardingStep3Desc" as const,
  },
];

interface WorkerOnboardingProps {
  onComplete: () => void;
}

export function WorkerOnboarding({ onComplete }: WorkerOnboardingProps) {
  const { t } = useI18n();
  const [step, setStep] = useState<"lang" | 0 | 1 | 2>("lang");

  const handleDone = () => {
    try {
      localStorage.setItem(STORAGE_KEY, "1");
    } catch {}
    onComplete();
  };

  const isLangStep = step === "lang";
  const isLastStep = step === 2;
  const stepIndex = typeof step === "number" ? step : -1;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/80 backdrop-blur-sm p-4">
      <div className="bg-white rounded-3xl shadow-2xl w-full max-w-sm overflow-hidden">
        {/* Language selection step */}
        {isLangStep ? (
          <div className="p-6 space-y-5">
            <div className="text-center">
              <div className="w-16 h-16 mx-auto mb-3 rounded-2xl bg-blue-600 flex items-center justify-center text-3xl shadow-lg">
                🌐
              </div>
              <h2 className="text-xl font-black text-slate-900">FairShift</h2>
              <p className="text-sm text-slate-500 mt-1">Your wages, your rights</p>
            </div>
            <LanguageSelector />
            <div className="flex gap-3 pt-2">
              <button
                type="button"
                onClick={handleDone}
                className="flex-1 py-3 text-sm font-medium text-slate-500 border border-slate-200 rounded-xl hover:bg-slate-50 transition-colors"
              >
                {t("onboardingSkip")}
              </button>
              <button
                type="button"
                onClick={() => setStep(0)}
                className="flex-1 py-3 text-sm font-bold text-white bg-blue-600 rounded-xl hover:bg-blue-700 transition-colors shadow-sm"
              >
                {t("onboardingNext")} →
              </button>
            </div>
          </div>
        ) : (
          /* Feature steps */
          (() => {
            const current = STEPS[stepIndex]!;
            return (
              <div>
                {/* Icon header */}
                <div className={`bg-gradient-to-br ${current.bgClass} p-8 flex flex-col items-center gap-3`}>
                  <span className="text-6xl filter drop-shadow-lg">{current.icon}</span>
                  <div className="flex gap-2 mt-1">
                    {STEPS.map((_, i) => (
                      <div
                        key={i}
                        className={`w-2 h-2 rounded-full transition-all ${
                          i === stepIndex ? "bg-white w-6" : "bg-white/40"
                        }`}
                      />
                    ))}
                  </div>
                </div>

                {/* Content */}
                <div className="p-6 space-y-4">
                  <div className="text-center space-y-2">
                    <h3 className="text-xl font-black text-slate-900">{t(current.titleKey)}</h3>
                    <p className="text-sm text-slate-600 leading-relaxed">{t(current.descKey)}</p>
                  </div>

                  <div className="flex gap-3 pt-2">
                    <button
                      type="button"
                      onClick={() => setStep(stepIndex > 0 ? ((stepIndex - 1) as 0 | 1) : "lang")}
                      className="flex-1 py-3 text-sm font-medium text-slate-500 border border-slate-200 rounded-xl hover:bg-slate-50 transition-colors"
                    >
                      ← {t("onboardingBack")}
                    </button>

                    {isLastStep ? (
                      <button
                        type="button"
                        onClick={handleDone}
                        className="flex-1 py-3 text-sm font-bold text-white bg-emerald-600 rounded-xl hover:bg-emerald-700 transition-colors shadow-sm"
                      >
                        {t("onboardingStart")} ✓
                      </button>
                    ) : (
                      <button
                        type="button"
                        onClick={() => setStep((stepIndex + 1) as 1 | 2)}
                        className="flex-1 py-3 text-sm font-bold text-white bg-blue-600 rounded-xl hover:bg-blue-700 transition-colors shadow-sm"
                      >
                        {t("onboardingNext")} →
                      </button>
                    )}
                  </div>

                  <button
                    type="button"
                    onClick={handleDone}
                    className="w-full text-xs text-slate-400 hover:text-slate-600 py-1 transition-colors"
                  >
                    {t("onboardingSkip")}
                  </button>
                </div>
              </div>
            );
          })()
        )}
      </div>
    </div>
  );
}

export function useOnboarding() {
  const [showOnboarding, setShowOnboarding] = useState(() => {
    if (typeof window === "undefined") return false;
    try {
      return !localStorage.getItem(STORAGE_KEY);
    } catch {
      return false;
    }
  });

  const completeOnboarding = () => setShowOnboarding(false);

  return { showOnboarding, completeOnboarding };
}
