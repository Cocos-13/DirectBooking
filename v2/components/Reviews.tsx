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
    name: "#f1f2f3", // ink-text
    designation: "#aeb2b6", // ink-muted
    testimony: "#dadcde", // slightly dimmed ink-text
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

// Renders text as a living print halftone on a canvas (the "final black"
// animation from playgrounds/rating-dots). The glyphs are rasterized
// off-screen and sampled into two dot populations, built once and replayed
// every frame: crisp core dots that form the letters (with a barely-there
// shimmer), and a spray of loose dots around them that drifts, twinkles, and
// splits into a back layer behind the glyphs and a front layer over them for
// depth. Honors prefers-reduced-motion by rendering a single static frame.
function HalftoneNumber({
  text,
  color,
  fontSizePx = 240,
  pitch = 4,
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
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    // Glyph rasterization happens on an off-screen mask so the visible canvas
    // never needs willReadFrequently.
    const mask = document.createElement("canvas");
    const maskCtx = mask.getContext("2d", { willReadFrequently: true });
    if (!maskCtx) return;

    const TAU = Math.PI * 2;
    const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)");

    type CoreDot = { x: number; y: number; r: number; phase: number };
    type SprayDot = {
      x: number;
      y: number;
      r: number;
      ampX: number;
      ampY: number;
      phase: number;
      wobble: number;
      speed: number;
      twinkleSpeed: number;
      front: boolean;
      drift: number;
    };

    let cancelled = false;
    let rafId = 0;
    let dpr = 1;
    let metrics: { w: number; h: number } | null = null;
    let coreDots: CoreDot[] = [];
    let sprayDots: SprayDot[] = [];

    // Deterministic per-cell noise for organic print grain (stable rebuilds).
    const noise = (seed: number) => {
      const v = Math.sin(seed) * 43758.5453;
      return v - Math.floor(v);
    };

    // Separable box blur (two passes ≈ gaussian). Separate horizontal and
    // vertical radii let the spray field spread wider than it is tall.
    const boxBlur = (
      src: Float32Array,
      gw: number,
      gh: number,
      radiusX: number,
      radiusY = radiusX,
    ) => {
      const normX = 1 / (radiusX * 2 + 1);
      const tmp = new Float32Array(src.length);
      for (let y = 0; y < gh; y += 1) {
        for (let x = 0; x < gw; x += 1) {
          let s = 0;
          for (let k = -radiusX; k <= radiusX; k += 1) {
            s += src[y * gw + Math.min(gw - 1, Math.max(0, x + k))];
          }
          tmp[y * gw + x] = s * normX;
        }
      }
      const normY = 1 / (radiusY * 2 + 1);
      const out = new Float32Array(src.length);
      for (let x = 0; x < gw; x += 1) {
        for (let y = 0; y < gh; y += 1) {
          let s = 0;
          for (let k = -radiusY; k <= radiusY; k += 1) {
            s += tmp[Math.min(gh - 1, Math.max(0, y + k)) * gw + x];
          }
          out[y * gw + x] = s * normY;
        }
      }
      return out;
    };

    // Same sampling pipeline as the static original; the only change is that
    // dots are collected into arrays once instead of painted on the spot.
    const rebuild = () => {
      dpr = Math.min(window.devicePixelRatio || 1, 2);
      // Resolve the actual (next/font) family name from the element's computed
      // style, since canvas can't read the `--font-display` CSS variable.
      const family = getComputedStyle(canvas).fontFamily || "system-ui, sans-serif";
      const font = `700 ${fontSizePx}px ${family}`;

      maskCtx.font = font;
      const m = maskCtx.measureText(text);
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
      mask.width = canvas.width;
      mask.height = canvas.height;

      const bufW = mask.width;
      const bufH = mask.height;

      // Rasterize the glyphs so we can sample their coverage.
      maskCtx.setTransform(dpr, 0, 0, dpr, 0, 0);
      maskCtx.clearRect(0, 0, w, h);
      maskCtx.fillStyle = "#000";
      maskCtx.textBaseline = "alphabetic";
      maskCtx.font = font;
      maskCtx.fillText(text, pad, pad + ascent);

      const alpha = maskCtx.getImageData(0, 0, bufW, bufH).data;
      const sample = (lx: number, ly: number) => {
        const px = Math.min(bufW - 1, Math.max(0, Math.round(lx * dpr)));
        const py = Math.min(bufH - 1, Math.max(0, Math.round(ly * dpr)));
        return alpha[(py * bufW + px) * 4 + 3] / 255;
      };

      // Build a coarse coverage grid (one value per dot cell) by sampling the
      // rasterized glyphs, then blurred copies whose values bleed outward past
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

      const soft = boxBlur(sharp, gw, gh, 1);
      // Elliptical spray field: ~0.9x the Original's reach sideways, ~0.55x
      // as tall, so the cloud hugs the text above and below.
      const nearX = Math.max(2, Math.round(spreadR * 0.9));
      const nearY = Math.max(1, Math.round(spreadR * 0.55));
      const farX = Math.max(3, Math.round(farR * 0.9));
      const farY = Math.max(2, Math.round(farR * 0.55));
      const near = boxBlur(boxBlur(sharp, gw, gh, nearX, nearY), gw, gh, nearX, nearY);
      const far = boxBlur(boxBlur(sharp, gw, gh, farX, farY), gw, gh, farX, farY);

      const nextCore: CoreDot[] = [];
      const nextSpray: SprayDot[] = [];
      // Small dots: at full coverage a dot stays just under the pitch, so the
      // number reads as fine dots rather than heavy blobs.
      const maxR = pitch * 0.5;

      for (let gy = 0; gy < gh; gy += 1) {
        for (let gx = 0; gx < gw; gx += 1) {
          const idx = gy * gw + gx;
          const core = soft[idx];
          // Size grain so it reads like ink on paper, not a perfect vector grid.
          const grain = 0.82 + 0.3 * noise(idx * 2.137);

          if (core > 0.16) {
            // Inside a glyph: solid, tightly-placed dots keep the number
            // legible and the counters (the holes in 4/9/8) open.
            const dens = Math.min(1, core + near[idx] * 0.25);
            const r = maxR * Math.sqrt(dens) * grain;
            const jitter = pitch * 0.18;
            nextCore.push({
              x: (gx + 0.5) * pitch + (noise(idx * 78.233) - 0.5) * jitter,
              y: (gy + 0.5) * pitch + (noise(idx * 39.42 + 1.7) - 0.5) * jitter,
              r,
              phase: noise(idx * 17.3) * TAU,
            });
          } else {
            // Outside the glyphs: a stochastic spray. A dot's spawn chance
            // follows the halo field, so dots are dense against the edge and
            // thin out into scattered specks.
            const field = near[idx] * 0.4 + far[idx] * 0.5;
            const chance = Math.min(1, field * 1.6);
            if (chance < 0.006 || noise(idx * 91.7 + 13.1) > chance) continue;
            let r = maxR * 0.7 * Math.sqrt(Math.min(1, field)) * grain;
            if (r < 0.1) continue;
            r = Math.max(r, 0.5);
            const loose = 1 - chance; // 0 near the glyph edge, 1 far out
            const jitter = pitch * (0.2 + loose * 0.7);
            const n1 = noise(idx * 51.5 + 3.3);
            const n2 = noise(idx * 61.9 + 7.7);
            nextSpray.push({
              x: (gx + 0.5) * pitch + (noise(idx * 78.233) - 0.5) * jitter,
              y: (gy + 0.5) * pitch + (noise(idx * 39.42 + 1.7) - 0.5) * jitter,
              r,
              // loose dots roam, edge dots barely leave their halftone spot
              ampX: pitch * (0.26 + loose * 1.05) * (0.6 + n1 * 0.8),
              ampY: pitch * (0.18 + loose * 0.8) * (0.6 + n2 * 0.8),
              phase: n1 * TAU,
              wobble: n2 * TAU,
              speed: 0.7 * (0.55 + n2 * 1.15),
              twinkleSpeed: 0.9 + n1 * 1.4,
              front: noise(idx * 111.2 + 5.9) < 0.35,
              drift: 0.9 + noise(idx * 70.1 + 2.2) * 1.9,
            });
          }
        }
      }

      coreDots = nextCore;
      sprayDots = nextSpray;
      metrics = { w, h };
    };

    const drawSpray = (time: number, front: boolean) => {
      for (let i = 0; i < sprayDots.length; i += 1) {
        const p = sprayDots[i];
        if (p.front !== front) continue;
        const t = time * p.speed + p.phase;
        const x = p.x + Math.sin(t) * p.ampX + Math.cos(t * 0.61 + p.wobble) * p.ampY * 0.6;
        const y =
          p.y + Math.cos(t * 0.83 + p.wobble) * p.ampY - Math.sin(time * 0.18 + p.phase) * p.drift;
        // smooth twinkle: never fully off, front layer reads a touch brighter
        const tw = 0.66 + 0.34 * (0.5 + Math.sin(t * p.twinkleSpeed * 2.1 + p.wobble) * 0.5);
        ctx.globalAlpha = front ? Math.min(1, tw * 1.12) : tw * 0.9;
        const r = p.r * (0.94 + 0.06 * Math.sin(t + p.wobble));
        ctx.beginPath();
        ctx.arc(x, y, r, 0, TAU);
        ctx.fill();
      }
    };

    const drawCore = (time: number) => {
      ctx.globalAlpha = 1;
      for (let i = 0; i < coreDots.length; i += 1) {
        const dot = coreDots[i];
        const shimmer = 1 + Math.sin(time * 0.85 + dot.phase) * 0.03;
        ctx.beginPath();
        ctx.arc(dot.x, dot.y, dot.r * shimmer, 0, TAU);
        ctx.fill();
      }
    };

    // Back spray, then core, then front spray — the depth split that makes
    // the cloud feel dimensional.
    const render = (time: number) => {
      if (!metrics) return;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      ctx.clearRect(0, 0, metrics.w, metrics.h);
      ctx.fillStyle = color;
      drawSpray(time, false);
      drawCore(time);
      drawSpray(time, true);
      ctx.globalAlpha = 1;
    };

    const tick = (timestamp: number) => {
      if (cancelled) return;
      render(timestamp * 0.001);
      rafId = requestAnimationFrame(tick);
    };

    const restart = () => {
      if (cancelled) return;
      cancelAnimationFrame(rafId);
      rebuild();
      // Paint immediately — rAF is suspended in hidden tabs, and the static
      // frame is also all that reduced-motion users get.
      render(reducedMotion.matches ? 0 : performance.now() * 0.001);
      if (!reducedMotion.matches) {
        rafId = requestAnimationFrame(tick);
      }
    };

    const onMotionChange = () => restart();
    reducedMotion.addEventListener("change", onMotionChange);

    // Wait for the display font before rasterizing, else we sample the fallback.
    let ro: ResizeObserver | undefined;
    void document.fonts.ready.then(() => {
      if (cancelled) return;
      restart();
      // Rebuild if the container width changes (responsive scaling of buffer).
      ro = new ResizeObserver(() => restart());
      if (canvas.parentElement) ro.observe(canvas.parentElement);
    });

    return () => {
      cancelled = true;
      cancelAnimationFrame(rafId);
      reducedMotion.removeEventListener("change", onMotionChange);
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

// A compact 5-star row that clarifies the score's scale (the halftone number
// alone doesn't say "out of 5"). Five outlined stars establish the scale; a
// terracotta-filled copy is clipped to `value / outOf` so the fill is honest
// (4.96 reads as very nearly — but not quite — full). Sizing is `em`-based so
// the whole row scales with the wrapper's font-size.
function StarRating({ value, outOf = 5 }: { value: number; outOf?: number }) {
  const pct = Math.max(0, Math.min(1, value / outOf)) * 100;
  const stars = Array.from({ length: outOf }, (_, i) => (
    <svg key={i} viewBox="0 0 24 24" fill="currentColor" className="h-[1em] w-[1em] shrink-0">
      <path d="M12 17.27 18.18 21l-1.64-7.03L22 9.24l-7.19-.61L12 2 9.19 8.63 2 9.24l5.46 4.73L5.82 21z" />
    </svg>
  ));
  return (
    <div
      aria-hidden
      className="relative inline-flex text-[clamp(0.85rem,3.4vw,1.45rem)] leading-none"
    >
      {/* Base: empty (outline-tone) stars establishing the 0–5 scale */}
      <div className="flex gap-[0.14em] text-aegean-900/20 dark:text-ink-text/25">{stars}</div>
      {/* Overlay: filled stars clipped to the exact score fraction */}
      <div
        className="absolute inset-0 flex gap-[0.14em] overflow-hidden text-terracotta-500"
        style={{ width: `${pct}%` }}
      >
        {stars}
      </div>
    </div>
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
          scattered dots at the edges. The SUPERHOST wordmark sits on a lower
          layer, sliding behind the number: a gradient mask fades its lower
          half to transparent while the animated dots paint over it, so the
          word reads clearly at the top and dissolves into the score below. */}
      <Reveal delay={80}>
        <div className="relative mt-12 flex flex-col items-center text-center">
          <div className="relative flex w-full items-center justify-center">
            {airbnbIsSuperhost && (
              <>
                {/* Visual wordmark only — "Superhost" is Airbnb's brand term in
                    every locale, and the full localized label lives in the
                    sr-only twin below. */}
                <span
                  aria-hidden
                  className="pointer-events-none absolute left-1/2 top-[40%] z-0 -translate-x-1/2 -translate-y-full select-none whitespace-nowrap font-wordmark text-[clamp(2.25rem,10.5vw,7.5rem)] uppercase leading-none tracking-[0.06em] text-black/20 dark:text-ink-text/20 [-webkit-mask-image:linear-gradient(to_bottom,black_20%,transparent_90%)] [mask-image:linear-gradient(to_bottom,black_20%,transparent_90%)]"
                >
                  Superhost
                </span>
                <span className="sr-only">{t.reviews.superhost}</span>
              </>
            )}
            <div className="relative z-10">
              <HalftoneNumber
                text={airbnbScore.toFixed(2)}
                color={theme === "dark" ? "#f4f7f7" : "#000000"}
              />
            </div>
          </div>

          {/* Scale cue — five stars make it read as "out of 5" at a glance,
              in any language. sr-only text spells the scale out for readers. */}
          <div className="relative -mt-10 sm:-mt-8">
            <StarRating value={airbnbScore} />
            <span className="sr-only">
              {airbnbScore.toFixed(2)} {t.reviews.ratingScale}
            </span>
          </div>

          <p className="relative mt-2.5 text-sm text-aegean-900/60 dark:text-ink-muted">
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
