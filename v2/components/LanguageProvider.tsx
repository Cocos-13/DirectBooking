"use client";

import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
import { translations, type Dictionary, type Lang } from "@/content/translations";

interface LanguageContextValue {
  lang: Lang;
  setLang: (l: Lang) => void;
  t: Dictionary;
}

const LanguageContext = createContext<LanguageContextValue | null>(null);
const STORAGE_KEY = "patras-apartment-lang";

// Picks a language from the visitor's OS/browser preference list, honouring its
// order: a phone set to [de, en, el] gets English, [de, el] gets Greek. Systems
// that ask for neither language (and browsers that expose nothing) fall back to
// Greek — the site's primary market.
function detectLang(): Lang {
  const prefs = window.navigator.languages?.length
    ? window.navigator.languages
    : [window.navigator.language ?? ""];
  for (const pref of prefs) {
    const tag = pref.toLowerCase();
    if (tag.startsWith("el")) return "el";
    if (tag.startsWith("en")) return "en";
  }
  return "el";
}

export function LanguageProvider({ children }: { children: ReactNode }) {
  // Server-rendered default is always "el"; we sync to the visitor's saved
  // choice / browser language client-side after mount to avoid a hydration
  // mismatch. This causes one harmless re-render right after load.
  const [lang, setLangState] = useState<Lang>("el");

  useEffect(() => {
    const stored = window.localStorage.getItem(STORAGE_KEY);
    setLangState(stored === "el" || stored === "en" ? stored : detectLang());
  }, []);

  // Keep the document language in sync with what's actually on screen, so
  // screen readers pick the right voice and browsers offer the right
  // translation. <html lang> is server-rendered as "el" (see app/layout.tsx).
  useEffect(() => {
    document.documentElement.lang = lang;
  }, [lang]);

  function setLang(l: Lang) {
    setLangState(l);
    window.localStorage.setItem(STORAGE_KEY, l);
  }

  return (
    <LanguageContext.Provider value={{ lang, setLang, t: translations[lang] }}>
      {children}
    </LanguageContext.Provider>
  );
}

export function useLanguage(): LanguageContextValue {
  const ctx = useContext(LanguageContext);
  if (!ctx) throw new Error("useLanguage must be used within a LanguageProvider");
  return ctx;
}
