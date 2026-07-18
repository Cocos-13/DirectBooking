"use client";

import { createContext, useContext, useEffect, useState, type ReactNode } from "react";

export type Theme = "light" | "dark";

interface ThemeContextValue {
  theme: Theme;
  setTheme: (t: Theme) => void;
  toggle: () => void;
}

const ThemeContext = createContext<ThemeContextValue | null>(null);

// Keep in sync with the pre-hydration script in app/layout.tsx.
export const THEME_STORAGE_KEY = "patras-apartment-theme";

export function ThemeProvider({ children }: { children: ReactNode }) {
  // The inline script in <head> already resolved the theme and stamped the
  // `dark` class on <html> before paint, so there's no flash. Here we mirror
  // that resolved value into React state after mount — the server render
  // always assumes "light" (its default HTML), so we read the real value from
  // the DOM to stay consistent and avoid a hydration mismatch on the class.
  const [theme, setThemeState] = useState<Theme>("light");

  useEffect(() => {
    setThemeState(document.documentElement.classList.contains("dark") ? "dark" : "light");
  }, []);

  function setTheme(t: Theme) {
    setThemeState(t);
    document.documentElement.classList.toggle("dark", t === "dark");
    try {
      window.localStorage.setItem(THEME_STORAGE_KEY, t);
    } catch {
      // Private-mode / storage-disabled: theme still applies for this session.
    }
  }

  function toggle() {
    setTheme(theme === "dark" ? "light" : "dark");
  }

  return (
    <ThemeContext.Provider value={{ theme, setTheme, toggle }}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme(): ThemeContextValue {
  const ctx = useContext(ThemeContext);
  if (!ctx) throw new Error("useTheme must be used within a ThemeProvider");
  return ctx;
}
