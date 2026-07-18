// Hybrid: the Original halftone renderer, brought to life.
//
// The build step is a faithful port of version-original — same grid pitch,
// same blur fields, same thresholds, dot sizes, grain, and jitter — so a
// paused frame is visually identical to the Original. Instead of drawing
// immediately, dots are stored once and replayed each frame:
//
//   from Version C: precomputed particle lists, per-particle phase/speed
//   randomness, and the front/back depth split — a share of the spray
//   drifts BEHIND the glyphs, the rest in front, which is what gives the
//   cloud its dimensional richness.
//
//   from Version E: the polish — a barely-there core shimmer, smooth
//   twinkle easing on the spray, and drift amplitude that scales with how
//   loose a dot already is (edge dots stay anchored, far dots wander).
//
// Single ink color, no gradients, no glow, no shadowBlur. globalAlpha is
// used per dot instead of building rgba strings, keeping the loop at 60fps.

const canvas = document.getElementById("ratingCanvas");
const ctx = canvas.getContext("2d");
const mask = document.createElement("canvas");
const maskCtx = mask.getContext("2d", { willReadFrequently: true });

const state = {
  text: "4.96",
  fontSizePx: 240,
  pitch: 4,
  spray: 4,
};

const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)");
const TAU = Math.PI * 2;

let dpr = 1;
let metrics = null;
let coreDots = [];
let sprayDots = [];
let rafId = 0;

function currentColor() {
  return document.body.classList.contains("dark") ? "#f4f7f7" : "#000000";
}

function noise(seed) {
  const v = Math.sin(seed) * 43758.5453;
  return v - Math.floor(v);
}

// Separate horizontal/vertical radii let the spray field spread wider than
// it is tall, hugging the text top and bottom while reaching out sideways.
function boxBlur(src, gw, gh, radiusX, radiusY) {
  const ry = radiusY === undefined ? radiusX : radiusY;
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
  const normY = 1 / (ry * 2 + 1);
  const out = new Float32Array(src.length);
  for (let x = 0; x < gw; x += 1) {
    for (let y = 0; y < gh; y += 1) {
      let s = 0;
      for (let k = -ry; k <= ry; k += 1) {
        s += tmp[Math.min(gh - 1, Math.max(0, y + k)) * gw + x];
      }
      out[y * gw + x] = s * normY;
    }
  }
  return out;
}

// Identical sampling pipeline to the Original; the only change is that dots
// are collected into arrays instead of being painted on the spot.
function rebuild() {
  const { text, fontSizePx, pitch, spray } = state;

  dpr = Math.min(window.devicePixelRatio || 1, 2);
  const family = getComputedStyle(canvas).fontFamily || "system-ui, sans-serif";
  const font = `700 ${fontSizePx}px ${family}`;

  maskCtx.font = font;
  const m = maskCtx.measureText(text);
  const ascent = m.actualBoundingBoxAscent || fontSizePx * 0.72;
  const descent = m.actualBoundingBoxDescent || fontSizePx * 0.28;

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

  maskCtx.setTransform(dpr, 0, 0, dpr, 0, 0);
  maskCtx.clearRect(0, 0, w, h);
  maskCtx.fillStyle = "#000";
  maskCtx.textBaseline = "alphabetic";
  maskCtx.font = font;
  maskCtx.fillText(text, pad, pad + ascent);

  const alpha = maskCtx.getImageData(0, 0, bufW, bufH).data;
  const sample = (lx, ly) => {
    const px = Math.min(bufW - 1, Math.max(0, Math.round(lx * dpr)));
    const py = Math.min(bufH - 1, Math.max(0, Math.round(ly * dpr)));
    return alpha[(py * bufW + px) * 4 + 3] / 255;
  };

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
  // spray field: ~0.9x wider than the Original sideways, ~0.55x as tall
  const nearX = Math.max(2, Math.round(spreadR * 0.9));
  const nearY = Math.max(1, Math.round(spreadR * 0.55));
  const farX = Math.max(3, Math.round(farR * 0.9));
  const farY = Math.max(2, Math.round(farR * 0.55));
  const near = boxBlur(boxBlur(sharp, gw, gh, nearX, nearY), gw, gh, nearX, nearY);
  const far = boxBlur(boxBlur(sharp, gw, gh, farX, farY), gw, gh, farX, farY);

  const nextCore = [];
  const nextSpray = [];
  const maxR = pitch * 0.5;

  for (let gy = 0; gy < gh; gy += 1) {
    for (let gx = 0; gx < gw; gx += 1) {
      const idx = gy * gw + gx;
      const core = soft[idx];
      const grain = 0.82 + 0.3 * noise(idx * 2.137);

      if (core > 0.16) {
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
          // loose dots roam, edge dots barely leave their halftone position
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
}

function drawSpray(time, front) {
  for (let i = 0; i < sprayDots.length; i += 1) {
    const p = sprayDots[i];
    if (p.front !== front) continue;
    const t = time * p.speed + p.phase;
    const x = p.x + Math.sin(t) * p.ampX + Math.cos(t * 0.61 + p.wobble) * p.ampY * 0.6;
    const y = p.y + Math.cos(t * 0.83 + p.wobble) * p.ampY - Math.sin(time * 0.18 + p.phase) * p.drift;
    // smooth twinkle: never fully off, front layer reads a touch brighter
    const tw = 0.66 + 0.34 * (0.5 + Math.sin(t * p.twinkleSpeed * 2.1 + p.wobble) * 0.5);
    ctx.globalAlpha = front ? Math.min(1, tw * 1.12) : tw * 0.9;
    const r = p.r * (0.94 + 0.06 * Math.sin(t + p.wobble));
    ctx.beginPath();
    ctx.arc(x, y, r, 0, TAU);
    ctx.fill();
  }
}

function drawCore(time) {
  ctx.globalAlpha = 1;
  for (let i = 0; i < coreDots.length; i += 1) {
    const dot = coreDots[i];
    const shimmer = 1 + Math.sin(time * 0.85 + dot.phase) * 0.03;
    ctx.beginPath();
    ctx.arc(dot.x, dot.y, dot.r * shimmer, 0, TAU);
    ctx.fill();
  }
}

function render(time) {
  if (!metrics) return;
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  ctx.clearRect(0, 0, metrics.w, metrics.h);
  ctx.fillStyle = currentColor();
  drawSpray(time, false);
  drawCore(time);
  drawSpray(time, true);
  ctx.globalAlpha = 1;
}

function tick(timestamp) {
  render(timestamp * 0.001);
  rafId = requestAnimationFrame(tick);
}

function restart() {
  cancelAnimationFrame(rafId);
  rebuild();
  if (reducedMotion.matches) {
    render(0);
  } else {
    rafId = requestAnimationFrame(tick);
  }
}

document.fonts.ready.then(() => {
  restart();
  const ro = new ResizeObserver(() => restart());
  if (canvas.parentElement) ro.observe(canvas.parentElement);
});

reducedMotion.addEventListener("change", () => restart());

document.getElementById("themeToggle").addEventListener("click", () => {
  document.body.classList.toggle("dark");
  if (reducedMotion.matches) render(0);
});

const pitchInput = document.getElementById("pitchInput");
const sprayInput = document.getElementById("sprayInput");
const fontSizeInput = document.getElementById("fontSizeInput");
const pitchVal = document.getElementById("pitchVal");
const sprayVal = document.getElementById("sprayVal");
const fontSizeVal = document.getElementById("fontSizeVal");

pitchInput.addEventListener("input", (e) => {
  state.pitch = parseFloat(e.target.value);
  pitchVal.textContent = state.pitch;
  restart();
});
sprayInput.addEventListener("input", (e) => {
  state.spray = parseFloat(e.target.value);
  sprayVal.textContent = state.spray;
  restart();
});
fontSizeInput.addEventListener("input", (e) => {
  state.fontSizePx = parseFloat(e.target.value);
  fontSizeVal.textContent = state.fontSizePx;
  restart();
});
