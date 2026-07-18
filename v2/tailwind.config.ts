import type { Config } from "tailwindcss";

const config: Config = {
  // Dark mode is opt-in via a `dark` class on <html>, toggled by ThemeProvider
  // (and applied pre-hydration by the inline script in app/layout.tsx to avoid
  // a flash of the light theme).
  darkMode: "class",
  content: [
    "./app/**/*.{ts,tsx}",
    "./components/**/*.{ts,tsx}",
    "./content/**/*.{ts,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        // Warm, sun-on-stone palette — evokes Patras / Peloponnese coast
        // without leaning on generic "travel blue".
        terracotta: {
          50: "#fdf4f1",
          100: "#fbe6df",
          400: "#e3805a",
          500: "#cc6440",
          600: "#a94f32",
          700: "#873f28",
        },
        aegean: {
          50: "#f0f7f8",
          100: "#dcedef",
          200: "#c3e0e3",
          400: "#4f9aa6",
          500: "#367e8a",
          600: "#2a6570",
          700: "#204e57",
          900: "#132f35",
        },
        sand: {
          50: "#fbf9f5",
          100: "#f4efe4",
          200: "#e8dfc9",
        },
        // Dark-mode "ink" palette — the mirror of the sand/aegean light scheme.
        // Deep desaturated aegean tones so dark mode still reads as the same
        // warm-coast brand rather than a generic slate-grey theme. Semantic
        // names (bg/surface/raised/border/text/muted/faint) map 1:1 onto the
        // roles the light palette fills with sand-50/white/sand-200/aegean-900.
        ink: {
          bg: "#0c2024", // page background — one step below aegean-900
          surface: "#14323a", // cards / raised panels
          raised: "#1c414a", // hover / elevated surfaces
          border: "#274d55", // borders + dividers
          text: "#e9f1f2", // primary text
          muted: "#a3bcc1", // secondary text
          faint: "#6f8c92", // tertiary / disabled text
        },
      },
      fontFamily: {
        sans: ["system-ui", "-apple-system", "Segoe UI", "Roboto", "sans-serif"],
        display: ["var(--font-display)", "system-ui", "sans-serif"],
        wordmark: ["var(--font-wordmark)", "var(--font-display)", "system-ui", "sans-serif"],
      },
      // Soft, layered elevation — all shadows tinted with aegean-900 (the ink
      // color) rather than pure black, so cards feel like they belong to the
      // warm palette instead of floating on a generic grey drop-shadow.
      boxShadow: {
        "elev-1": "0 1px 2px rgba(19, 47, 53, 0.04), 0 2px 6px rgba(19, 47, 53, 0.05)",
        "elev-2": "0 2px 6px rgba(19, 47, 53, 0.05), 0 10px 24px rgba(19, 47, 53, 0.08)",
        "elev-3": "0 8px 18px rgba(19, 47, 53, 0.08), 0 22px 48px rgba(19, 47, 53, 0.14)",
      },
      keyframes: {
        // Entrance for above-the-fold content (hero) and scroll reveals.
        "fade-in-up": {
          "0%": { opacity: "0", transform: "translateY(18px)" },
          "100%": { opacity: "1", transform: "translateY(0)" },
        },
        // Lightbox photo transitions — a gentle fade paired with a small
        // horizontal glide in the direction of travel (next = in from right,
        // prev = in from left), so switching photos feels smooth like Airbnb.
        "photo-in-right": {
          "0%": { opacity: "0", transform: "translateX(24px)" },
          "100%": { opacity: "1", transform: "translateX(0)" },
        },
        "photo-in-left": {
          "0%": { opacity: "0", transform: "translateX(-24px)" },
          "100%": { opacity: "1", transform: "translateX(0)" },
        },
        // Testimonial carousel: block fade for the swapped quote, plus a
        // per-word blur-in (staggered via inline animation-delay).
        "testimonial-in": {
          "0%": { opacity: "0", transform: "translateY(16px)" },
          "100%": { opacity: "1", transform: "translateY(0)" },
        },
        "blur-in": {
          "0%": { filter: "blur(10px)", opacity: "0", transform: "translateY(5px)" },
          "100%": { filter: "blur(0)", opacity: "1", transform: "translateY(0)" },
        },
      },
      animation: {
        "fade-in-up": "fade-in-up 0.7s cubic-bezier(0.22, 1, 0.36, 1) both",
        "photo-in-right": "photo-in-right 0.55s cubic-bezier(0.22, 1, 0.36, 1) both",
        "photo-in-left": "photo-in-left 0.55s cubic-bezier(0.22, 1, 0.36, 1) both",
        "testimonial-in": "testimonial-in 0.45s cubic-bezier(0.22, 1, 0.36, 1) both",
        "blur-in": "blur-in 0.4s ease-out both",
      },
    },
  },
  plugins: [],
};

export default config;
