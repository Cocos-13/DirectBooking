// Port of components/Reviews.tsx's HalftoneNumber canvas renderer.
// Rasterizes the text off-screen, samples ink coverage on a dot grid, then
// redraws it as a halftone: crisp dots inside the glyphs, a stochastic spray
// of shrinking dots bleeding outward from the edges.

const canvas = document.getElementById("ratingCanvas");
const ctx = canvas.getContext("2d", { willReadFrequently: true });

const state = {
  text: "4.96",
  fontSizePx: 240,
  pitch: 4,
  spray: 4,
};

function currentColor() {
  return document.body.classList.contains("dark") ? "#f4f7f7" : "#000000";
}

function noise(seed) {
  const v = Math.sin(seed) * 43758.5453;
  return v - Math.floor(v);
}

function draw() {
  const { text, fontSizePx, pitch, spray } = state;
  const color = currentColor();

  const dpr = Math.min(window.devicePixelRatio || 1, 2);
  const family = getComputedStyle(canvas).fontFamily || "system-ui, sans-serif";
  const font = `700 ${fontSizePx}px ${family}`;

  ctx.font = font;
  const m = ctx.measureText(text);
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

  const bufW = canvas.width;
  const bufH = canvas.height;

  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  ctx.clearRect(0, 0, w, h);
  ctx.fillStyle = "#000";
  ctx.textBaseline = "alphabetic";
  ctx.font = font;
  ctx.fillText(text, pad, pad + ascent);

  const alpha = ctx.getImageData(0, 0, bufW, bufH).data;
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

  const boxBlur = (src, radius) => {
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

  const soft = boxBlur(sharp, 1);
  const near = boxBlur(boxBlur(sharp, spreadR), spreadR);
  const far = boxBlur(boxBlur(sharp, farR), farR);

  ctx.clearRect(0, 0, w, h);
  ctx.fillStyle = color;
  const maxR = pitch * 0.5;
  for (let gy = 0; gy < gh; gy += 1) {
    for (let gx = 0; gx < gw; gx += 1) {
      const idx = gy * gw + gx;
      const core = soft[idx];
      const grain = 0.82 + 0.3 * noise(idx * 2.137);
      let r;
      let jitter;
      if (core > 0.16) {
        const dens = Math.min(1, core + near[idx] * 0.25);
        r = maxR * Math.sqrt(dens) * grain;
        jitter = pitch * 0.18;
      } else {
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
}

let ro;
function setup() {
  document.fonts.ready.then(() => {
    draw();
    ro = new ResizeObserver(() => draw());
    if (canvas.parentElement) ro.observe(canvas.parentElement);
  });
}

setup();

document.getElementById("themeToggle").addEventListener("click", () => {
  document.body.classList.toggle("dark");
  draw();
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
  draw();
});
sprayInput.addEventListener("input", (e) => {
  state.spray = parseFloat(e.target.value);
  sprayVal.textContent = state.spray;
  draw();
});
fontSizeInput.addEventListener("input", (e) => {
  state.fontSizePx = parseFloat(e.target.value);
  fontSizeVal.textContent = state.fontSizePx;
  draw();
});
