/**
 * FairShift Voice Assistance
 * Uses browser-native SpeechSynthesis — no microphone, no recording, no paid APIs.
 * Gracefully disabled when voices are unavailable.
 */

"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { SUPPORTED_LANGUAGES, type LangCode } from "@/lib/i18n/translations";

// BCP-47 language tags for SpeechSynthesis
const LANG_TAGS: Record<LangCode, string[]> = {
  en: ["en-IN", "en-GB", "en-US"],
  hi: ["hi-IN"],
  ta: ["ta-IN"],
  te: ["te-IN"],
};

function pickVoice(lang: LangCode): SpeechSynthesisVoice | null {
  if (typeof window === "undefined" || !window.speechSynthesis) return null;
  const voices = window.speechSynthesis.getVoices();
  const tags = LANG_TAGS[lang];
  for (const tag of tags) {
    const match = voices.find((v) => v.lang === tag || v.lang.startsWith(tag.substring(0, 2)));
    if (match) return match;
  }
  return null;
}

export function useVoice(lang: LangCode) {
  const [supported, setSupported] = useState(false);
  const [playing, setPlaying] = useState(false);
  const utteranceRef = useRef<SpeechSynthesisUtterance | null>(null);

  useEffect(() => {
    if (typeof window === "undefined" || !window.speechSynthesis) {
      setSupported(false);
      return;
    }
    const checkVoices = () => {
      const voice = pickVoice(lang);
      setSupported(Boolean(voice));
    };
    checkVoices();
    window.speechSynthesis.addEventListener("voiceschanged", checkVoices);
    return () => window.speechSynthesis.removeEventListener("voiceschanged", checkVoices);
  }, [lang]);

  const speak = useCallback(
    (text: string) => {
      if (!supported || typeof window === "undefined" || !window.speechSynthesis) return;
      window.speechSynthesis.cancel();
      const utterance = new SpeechSynthesisUtterance(text);
      const voice = pickVoice(lang);
      if (voice) utterance.voice = voice;
      utterance.lang = LANG_TAGS[lang][0];
      utterance.rate = 0.9;
      utterance.onstart = () => setPlaying(true);
      utterance.onend = () => setPlaying(false);
      utterance.onerror = () => setPlaying(false);
      utteranceRef.current = utterance;
      window.speechSynthesis.speak(utterance);
    },
    [lang, supported]
  );

  const stop = useCallback(() => {
    if (typeof window !== "undefined" && window.speechSynthesis) {
      window.speechSynthesis.cancel();
      setPlaying(false);
    }
  }, []);

  return { supported, playing, speak, stop };
}

interface VoiceButtonProps {
  text: string;
  lang: LangCode;
  label: string;
  playingLabel: string;
  unavailableLabel: string;
  className?: string;
}

export function VoiceButton({ text, lang, label, playingLabel, unavailableLabel, className = "" }: VoiceButtonProps) {
  const { supported, playing, speak, stop } = useVoice(lang);

  if (!supported) {
    return (
      <span className={`text-xs text-slate-400 flex items-center gap-1 ${className}`} aria-hidden="true">
        <span>🔇</span>
        <span className="sr-only">{unavailableLabel}</span>
      </span>
    );
  }

  return (
    <button
      type="button"
      onClick={() => (playing ? stop() : speak(text))}
      className={`flex items-center gap-1.5 text-xs font-medium px-2 py-1 rounded-lg border transition-all
        ${playing
          ? "bg-blue-100 text-blue-800 border-blue-300 animate-pulse"
          : "bg-white text-slate-600 border-slate-200 hover:border-blue-300 hover:text-blue-700"
        } ${className}`}
      aria-label={playing ? playingLabel : label}
      title={playing ? playingLabel : label}
    >
      <span aria-hidden="true">{playing ? "🔊" : "🔈"}</span>
      <span className="hidden sm:inline">{playing ? playingLabel : label}</span>
    </button>
  );
}
