"use client";

import { useLanguage } from "./LanguageProvider";
import type { Lang } from "@/content/translations";

const LANGS: Lang[] = ["el", "en"];

export function LanguageToggle() {
  const { lang, setLang } = useLanguage();

  return (
    <div className="inline-flex rounded-full border border-aegean-700/15 bg-white/80 p-1 text-sm font-medium shadow-sm backdrop-blur">
      {LANGS.map((l) => (
        <button
          key={l}
          type="button"
          onClick={() => setLang(l)}
          aria-pressed={lang === l}
          aria-label={l === "el" ? "Ελληνικά" : "English"}
          className={`rounded-full px-3 py-1 transition-colors ${
            lang === l ? "bg-aegean-600 text-white" : "text-aegean-700 hover:bg-aegean-50"
          }`}
        >
          {l.toUpperCase()}
        </button>
      ))}
    </div>
  );
}
