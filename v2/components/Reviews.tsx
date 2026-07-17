"use client";

import { useEffect, useRef } from "react";
import { useLanguage } from "./LanguageProvider";
import { useTheme } from "./ThemeProvider";
import { SectionHeading } from "./SectionHeading";
import { Reveal } from "./Reveal";
import { CircularTestimonials } from "./ui/CircularTestimonials";
import { siteConfig } from "@/content/siteConfig";

// The testimonial carousel colors its text via inline styles (JS props, not
// Tailwind classes), so it can't rely on `dark:` variants — we swap the whole
// palette based on the resolved theme instead.
const TESTIMONIAL_COLORS = {
  light: {
    name: "#132f35", // aegean-900
    designation: "#2a6570", // aegean-600
    testimony: "#2f474c", // softened aegean ink
    arrowBackground: "#cc6440", // terracotta-500
    arrowForeground: "#ffffff",
    arrowHoverBackground: "#a94f32", // terracotta-600
  },
  dark: {
    name: "#e9f1f2", // ink-text
    designation: "#a3bcc1", // ink-muted
    testimony: "#cddbdd", // slightly dimmed ink-text
    arrowBackground: "#cc6440", // terracotta-500 (brand accent holds up on dark)
    arrowForeground: "#ffffff",
    arrowHoverBackground: "#e3805a", // terracotta-400
  },
} as const;

// Placeholder avatars from the 21st.dev demo — swap for real guest photos
// later by replacing these URLs (or pointing them at /public/images).
const DEMO_AVATARS = [
  "https://images.unsplash.com/photo-1512316609839-ce289d3eba0a?q=80&w=1368&auto=format&fit=crop&ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D",
  "https://images.unsplash.com/photo-1628749528992-f5702133b686?q=80&w=1368&auto=format&fit=crop&ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fA%3D%3D",
  "https://images.unsplash.com/photo-1524267213992-b76e8577d046?q=80&w=1368&auto=format&fit=crop&ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fA%3D%3D",
];

// Renders text as a print halftone on a canvas: the glyphs are rasterized
// off-screen, then redrawn as a regular grid of dots whose radius tracks local
// ink density. Crisp, well-separated dots build the letters; a wide-blurred
// copy of the coverage lays down a soft halo of shrinking dots that fades out
// organically around them (no rectangle) — the "DOTS" poster look.
function HalftoneNumber({
  text,
  color,
  fontSizePx = 240,
  pitch = 6,
  spray = 4,
}: {
  text: string;
  color: string;
  fontSizePx?: number;
  pitch?: number;
  /** Blur radius (in dot cells) of the halo that sprays the dots out from the edges. */
  spray?: number;
}) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d", { willReadFrequently: true });
    if (!ctx) return;

    let cancelled = false;

    const draw = () => {
      if (cancelled) return;
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      // Resolve the actual (next/font) family name from the element's computed
      // style, since canvas can't read the `--font-display` CSS variable.
      const family = getComputedStyle(canvas).fontFamily || "system-ui, sans-serif";
      const font = `700 ${fontSizePx}px ${family}`;

      ctx.font = font;
      const m = ctx.measureText(text);
      const ascent = m.actualBoundingBoxAscent || fontSizePx * 0.72;
      const descent = m.actualBoundingBoxDescent || fontSizePx * 0.28;
      // The spray has two scales: a tight `near` halo (radius spreadR) and a
      // wide, faint `far` tail (radius farR) that carries stray dots outward.
      // Pad must clear the far tail's reach (~2×farR) so it never clips.
      const spreadR = Math.max(2, Math.round(spray));
      const farR = Math.round(spray * 3.2);
      const pad = pitch * (farR * 2 + 4);
      const w = Math.ceil(m.width + pad * 2);
      const h = Math.ceil(ascent + descent + pad * 2);

      canvas.width = Math.ceil(w * dpr);
      canvas.height = Math.ceil(h * dpr);
      canvas.style.width = `${w}px`;
      canvas.style.height = "auto";

      const bufW = canvas.width;
      const bufH = canvas.height;

      // Rasterize the glyphs so we can sample their coverage.
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      ctx.clearRect(0, 0, w, h);
      ctx.fillStyle = "#000";
      ctx.textBaseline = "alphabetic";
      ctx.font = font;
      ctx.fillText(text, pad, pad + ascent);

      const alpha = ctx.getImageData(0, 0, bufW, bufH).data;
      const sample = (lx: number, ly: number) => {
        const px = Math.min(bufW - 1, Math.max(0, Math.round(lx * dpr)));
        const py = Math.min(bufH - 1, Math.max(0, Math.round(ly * dpr)));
        return alpha[(py * bufW + px) * 4 + 3] / 255;
      };

      // Build a coarse coverage grid (one value per dot cell) by sampling the
      // rasterized glyphs, then a blurred copy whose values bleed outward past
      // the edges — that halo is what lets dots spray beyond the shape.
      const gw = Math.ceil(w / pitch);
      const gh = Math.ceil(h / pitch);
      const sharp = new Float32Array(gw * gh);
      for (let gy = 0; gy < gh; gy += 1) {
        for (let gx = 0; gx < gw; gx += 1) {
          const cx = (gx + 0.5) * pitch;
          const cy = (gy + 0.5) * pitch;
          let sum = 0;
          for (let oy = -1; oy <= 1; oy += 1) {
            for (let ox = -1; ox <= 1; ox += 1) {
              sum += sample(cx + (ox * pitch) / 3, cy + (oy * pitch) / 3);
            }
          }
          sharp[gy * gw + gx] = sum / 9;
        }
      }

      // Separable box blur (two passes ≈ gaussian) to spread coverage outward.
      const boxBlur = (src: Float32Array, radius: number) => {
        const norm = 1 / (radius * 2 + 1);
        const tmp = new Float32Array(src.length);
        for (let y = 0; y < gh; y += 1) {
          for (let x = 0; x < gw; x += 1) {
            let s = 0;
            for (let k = -radius; k <= radius; k += 1) {
              s += src[y * gw + Math.min(gw - 1, Math.max(0, x + k))];
            }
            tmp[y * gw + x] = s * norm;
          }
        }
        const out = new Float32Array(src.length);
        for (let x = 0; x < gw; x += 1) {
          for (let y = 0; y < gh; y += 1) {
            let s = 0;
            for (let k = -radius; k <= radius; k += 1) {
              s += tmp[Math.min(gh - 1, Math.max(0, y + k)) * gw + x];
            }
            out[y * gw + x] = s * norm;
          }
        }
        return out;
      };
      // Letters get a crisp 1-cell edge softening. The spray is built from two
      // blurs: `near` is the tight cloud hugging the glyphs; `far` is a very
      // wide, faint field whose long tail lets stray dots scatter far out and
      // dissolve, instead of the halo stopping at a hard radius.
      const soft = boxBlur(sharp, 1);
      const near = boxBlur(boxBlur(sharp, spreadR), spreadR);
      const far = boxBlur(boxBlur(sharp, farR), farR);

      // Deterministic per-cell noise for organic print grain (stable redraws).
      const noise = (seed: number) => {
        const v = Math.sin(seed) * 43758.5453;
        return v - Math.floor(v);
      };

      ctx.clearRect(0, 0, w, h);
      ctx.fillStyle = color;
      // Small dots: at full coverage a dot stays just under the pitch, so the
      // number reads as fine dots rather than heavy blobs.
      const maxR = pitch * 0.5;
      for (let gy = 0; gy < gh; gy += 1) {
        for (let gx = 0; gx < gw; gx += 1) {
          const idx = gy * gw + gx;
          const core = soft[idx];
          // Size grain so it reads like ink on paper, not a perfect vector grid.
          const grain = 0.82 + 0.3 * noise(idx * 2.137);
          let r: number;
          let jitter: number;
          if (core > 0.16) {
            // Inside a glyph: solid, tightly-placed dots keep the number
            // legible and the counters (the holes in 4/9/8) open.
            const dens = Math.min(1, core + near[idx] * 0.25);
            r = maxR * Math.sqrt(dens) * grain;
            jitter = pitch * 0.18;
          } else {
            // Outside the glyphs: a stochastic spray. A dot's spawn chance
            // follows the halo field, so dots are dense against the edge and
            // thin out into scattered specks; jitter grows as it thins so the
            // outer dots break off the grid and scatter naturally.
            const field = near[idx] * 0.4 + far[idx] * 0.5;
            const chance = Math.min(1, field * 1.6);
            if (chance < 0.006 || noise(idx * 91.7 + 13.1) > chance) continue;
            r = maxR * 0.7 * Math.sqrt(Math.min(1, field)) * grain;
            if (r < 0.1) continue;
            r = Math.max(r, 0.5);
            jitter = pitch * (0.2 + (1 - chance) * 0.7);
          }
          const jx = (noise(idx * 78.233) - 0.5) * jitter;
          const jy = (noise(idx * 39.42 + 1.7) - 0.5) * jitter;
          ctx.beginPath();
          ctx.arc((gx + 0.5) * pitch + jx, (gy + 0.5) * pitch + jy, r, 0, Math.PI * 2);
          ctx.fill();
        }
      }
    };

    // Wait for the display font before rasterizing, else we sample the fallback.
    let ro: ResizeObserver | undefined;
    void document.fonts.ready.then(() => {
      draw();
      // Redraw if the container width changes (responsive scaling of buffer).
      ro = new ResizeObserver(() => draw());
      if (canvas.parentElement) ro.observe(canvas.parentElement);
    });

    return () => {
      cancelled = true;
      ro?.disconnect();
    };
  }, [text, color, fontSizePx, pitch, spray]);

  return (
    <canvas
      ref={canvasRef}
      role="img"
      aria-label={text}
      className="font-display block h-auto max-w-full"
    />
  );
}

export function Reviews() {
  const { t } = useLanguage();
  const { theme } = useTheme();
  const { airbnbScore, airbnbReviewCount, airbnbIsSuperhost } = siteConfig.ratings;

  const testimonials = siteConfig.reviews.map((review, i) => ({
    quote: review.text,
    name: review.name,
    designation: t.reviews.guestLabel,
    src: DEMO_AVATARS[i % DEMO_AVATARS.length],
  }));

  return (
    <section id="reviews" className="mx-auto max-w-5xl px-4 py-16 sm:py-24">
      <Reveal>
        <SectionHeading eyebrow={t.reviews.eyebrow}>{t.reviews.heading}</SectionHeading>
      </Reveal>

      {/* Rating anchor — the primary trust signal. The score is rendered as a
          halftone dot matrix (poster style): solid at its core, dissolving into
          scattered dots at the edges. No box; a confident label sits beneath. */}
      <Reveal delay={80}>
        <div className="relative mt-12 flex flex-col items-center text-center">
          <div className="flex w-full items-center justify-center">
            <HalftoneNumber
              text={airbnbScore.toFixed(2)}
              color={theme === "dark" ? "#f4f7f7" : "#000000"}
            />
          </div>

          {airbnbIsSuperhost && (
            <p className="relative -mt-1 text-lg font-semibold tracking-tight text-aegean-900 dark:text-ink-text sm:text-xl">
              {t.reviews.superhost}
            </p>
          )}

          <p className="relative mt-1.5 text-sm text-aegean-900/60 dark:text-ink-muted">
            {t.reviews.ratingCount.replace("{count}", String(airbnbReviewCount))}
          </p>
        </div>
      </Reveal>

      {/* Individual reviews — animated circular carousel (21st.dev) */}
      <Reveal delay={120}>
        <div className="mt-10 flex justify-center">
          <CircularTestimonials
            testimonials={testimonials}
            autoplay
            colors={theme === "dark" ? TESTIMONIAL_COLORS.dark : TESTIMONIAL_COLORS.light}
            fontSizes={{ name: "1.6rem", designation: "0.95rem", quote: "1.05rem" }}
          />
        </div>
      </Reveal>

      <div className="mt-6 text-center">
        <a
          href={siteConfig.listings.airbnbUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-block text-sm font-semibold text-aegean-600 transition-colors hover:text-aegean-700 hover:underline dark:text-aegean-200 dark:hover:text-aegean-100"
        >
          {t.reviews.viewAllCta} →
        </a>
      </div>
    </section>
  );
}
