import type { Config } from "tailwindcss";

const config: Config = {
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
      },
      fontFamily: {
        sans: ["system-ui", "-apple-system", "Segoe UI", "Roboto", "sans-serif"],
      },
    },
  },
  plugins: [],
};

export default config;
