"use client";

import React from "react";
import { useI18n } from "@/lib/i18n/context";
import { SUPPORTED_LANGUAGES, type LangCode } from "@/lib/i18n/translations";

interface LanguageSelectorProps {
  compact?: boolean;
  className?: string;
}

export function LanguageSelector({ compact = false, className = "" }: LanguageSelectorProps) {
  const { lang, setLang, t } = useI18n();

  if (compact) {
    return (
      <div className={`flex items-center gap-1 ${className}`} role="group" aria-label={t("selectLanguage")}>
        {SUPPORTED_LANGUAGES.map((l) => (
          <button
            key={l.code}
            type="button"
            onClick={() => setLang(l.code as LangCode)}
            className={`px-2 py-1 rounded-md text-xs font-semibold transition-all ${
              lang === l.code
                ? "bg-blue-600 text-white shadow-sm"
                : "bg-white/10 text-white/80 hover:bg-white/20 hover:text-white"
            }`}
            aria-pressed={lang === l.code}
            lang={l.code}
            title={l.englishLabel}
          >
            {l.nativeLabel}
          </button>
        ))}
      </div>
    );
  }

  return (
    <div className={`${className}`}>
      <p className="text-sm font-semibold text-slate-700 mb-2" id="lang-selector-label">
        {t("selectLanguage")}
      </p>
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2" role="group" aria-labelledby="lang-selector-label">
        {SUPPORTED_LANGUAGES.map((l) => (
          <button
            key={l.code}
            type="button"
            onClick={() => setLang(l.code as LangCode)}
            className={`flex flex-col items-center gap-0.5 px-3 py-3 rounded-xl border-2 text-center transition-all ${
              lang === l.code
                ? "border-blue-600 bg-blue-50 text-blue-900"
                : "border-slate-200 bg-white text-slate-700 hover:border-blue-300 hover:bg-blue-50/50"
            }`}
            aria-pressed={lang === l.code}
            lang={l.code}
          >
            <span className="text-lg font-bold" style={{ fontFamily: l.fontHint }}>
              {l.nativeLabel}
            </span>
            <span className="text-[11px] text-slate-500">{l.englishLabel}</span>
          </button>
        ))}
      </div>
    </div>
  );
}
