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

export function LanguageProvider({ children }: { children: ReactNode }) {
  // Server-rendered default is always "el"; we sync to the visitor's saved
  // choice / browser language client-side after mount to avoid a hydration
  // mismatch. This causes one harmless re-render right after load.
  const [lang, setLangState] = useState<Lang>("el");

  useEffect(() => {
    const stored = window.localStorage.getItem(STORAGE_KEY);
    if (stored === "el" || stored === "en") {
      setLangState(stored);
      return;
    }
    const browserLang = window.navigator.language?.toLowerCase().startsWith("en") ? "en" : "el";
    setLangState(browserLang);
  }, []);

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
