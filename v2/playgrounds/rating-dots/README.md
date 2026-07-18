# rating-dots

Halftone rating-number playground (the "4.96" dot effect for Reviews).
Three standalone versions — open any `index.html` in a browser, no build step.

- **original/** — the static halftone baseline (port of `components/Reviews.tsx`'s HalftoneNumber).
- **final-black/** — animated version, single ink color. Original look + drifting/twinkling spray with front/back depth.
- **final-bronze/** — same animation with honey-gold (light mode) / bronze (dark mode) palettes.

All tuning happens in each folder's `script.js`:

- **Spray width/height** — the block starting `// spray field:`; the two width
  multipliers and the two height multipliers (change each pair together).
- **Dot movement speed** — the `speed: X * (0.55 + n2 * 1.15)` line; the leading
  number is the knob.
- **Colors (final-bronze only)** — the `PALETTES` object near the top.
- **Defaults for pitch/spray/fontSize** — the `state` object at the top
  (the on-page sliders override them live).
