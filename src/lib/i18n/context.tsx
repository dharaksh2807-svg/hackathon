/**
 * FairShift i18n Context
 * Provides language selection, persistence, and t() translation function.
 */

"use client";

import React, { createContext, useContext, useState, useCallback, type ReactNode } from "react";
import { TRANSLATIONS, SUPPORTED_LANGUAGES, type LangCode, type TranslationKey } from "./translations";

const STORAGE_KEY = "fairshift_lang";

interface I18nContextValue {
  lang: LangCode;
  setLang: (lang: LangCode) => void;
  t: (key: TranslationKey) => string;
}

const I18nContext = createContext<I18nContextValue | null>(null);

function detectInitialLang(): LangCode {
  if (typeof window === "undefined") return "en";
  try {
    const stored = localStorage.getItem(STORAGE_KEY) as LangCode | null;
    if (stored && SUPPORTED_LANGUAGES.some((l) => l.code === stored)) return stored;
    // Try browser language hint
    const nav = navigator.language?.substring(0, 2);
    if (nav === "hi") return "hi";
    if (nav === "ta") return "ta";
    if (nav === "te") return "te";
  } catch {}
  return "en";
}

export function I18nProvider({ children }: { children: ReactNode }) {
  const [lang, setLangState] = useState<LangCode>(detectInitialLang);

  const setLang = useCallback((newLang: LangCode) => {
    setLangState(newLang);
    try {
      localStorage.setItem(STORAGE_KEY, newLang);
    } catch {}
  }, []);

  const t = useCallback(
    (key: TranslationKey): string => {
      return TRANSLATIONS[lang][key] ?? TRANSLATIONS.en[key] ?? key;
    },
    [lang]
  );

  return <I18nContext.Provider value={{ lang, setLang, t }}>{children}</I18nContext.Provider>;
}

export function useI18n(): I18nContextValue {
  const ctx = useContext(I18nContext);
  if (!ctx) throw new Error("useI18n must be used inside I18nProvider");
  return ctx;
}
