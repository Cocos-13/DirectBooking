"use client";

import { useLanguage } from "./LanguageProvider";
import { useTheme } from "./ThemeProvider";

// Single pill button that flips light <-> dark, styled to match the adjacent
// LanguageToggle. Shows the icon of the theme you'd switch *to* (a moon while
// light, a sun while dark), which is the more intuitive affordance.
export function ThemeToggle() {
  const { theme, toggle } = useTheme();
  const { lang } = useLanguage();
  const isDark = theme === "dark";

  const label =
    lang === "el"
      ? isDark
        ? "Εναλλαγή σε φωτεινό θέμα"
        : "Εναλλαγή σε σκοτεινό θέμα"
      : isDark
        ? "Switch to light mode"
        : "Switch to dark mode";

  return (
    <button
      type="button"
      onClick={toggle}
      aria-label={label}
      title={label}
      className="inline-flex h-9 w-9 items-center justify-center rounded-full border border-aegean-700/15 bg-white/80 text-aegean-700 shadow-sm backdrop-blur transition-colors hover:bg-aegean-50 dark:border-ink-border dark:bg-ink-surface/80 dark:text-ink-text dark:hover:bg-ink-raised"
    >
      {isDark ? (
        // Sun
        <svg viewBox="0 0 24 24" className="h-[18px] w-[18px]" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" aria-hidden>
          <circle cx="12" cy="12" r="4" />
          <path d="M12 2v2M12 20v2M4.93 4.93l1.41 1.41M17.66 17.66l1.41 1.41M2 12h2M20 12h2M6.34 17.66l-1.41 1.41M19.07 4.93l-1.41 1.41" />
        </svg>
      ) : (
        // Moon
        <svg viewBox="0 0 24 24" className="h-[18px] w-[18px]" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" aria-hidden>
          <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z" />
        </svg>
      )}
    </button>
  );
}
