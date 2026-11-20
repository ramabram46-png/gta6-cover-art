// The poster renderer: draws a complete GTA-style cover onto a 2D canvas at
// any size. Everything is deterministic — same state, same pixels — so the
// editor preview and the exported PNG are the same drawing. The pipeline:
//   sky (gradient + stars + striped sun + neon grid)
//   panels (photo, cover-fit with pan/zoom, grade wash, halftone)
//   caption band (chrome / cream / outline lettering)
//   poster furniture (kicker, callout, seal, billing block)
//   grain + vignette
// One focal element rules the poster: the sun and the hero caption share the
// same warm axis; every other device supports them and then gets quiet.

import { gradeById, CHROME_STOPS } from './grades.js';
import { layoutById } from './layouts.js';

/** The three export sizes the bounty names. */
export const SIZES = [
  { id: 'square', name: 'Square', w: 1080, h: 1080 },
  { id: 'portrait', name: 'Portrait', w: 1080, h: 1350 },
  { id: 'wide', name: 'Wide', w: 1920, h: 1080 },
];

/** Looks an export size up by id. */
export function sizeById(id) {
  return SIZES.find((s) => s.id === id) ?? SIZES[0];
}

/** A tiny deterministic PRNG so stars and grain never move between renders. */
export function mulberry32(seed) {
  let a = seed >>> 0;
  return function next() {
    a |= 0; a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** Panel rect in pixels, from a layout's unit rect. */
export function panelRectPx(panel, W, H) {
  return {
    x: panel.x * W, y: panel.y * H,
    w: panel.w * W, h: panel.h * H,
  };
}

/** The panel path: a parallelogram whose sides tilt by the layout's slant. */
export function panelPath(ctx, rect, slantDeg) {
  const tilt = Math.tan(((slantDeg ?? 0) * Math.PI) / 180) * rect.h;
  ctx.beginPath();
  ctx.moveTo(rect.x + tilt / 2, rect.y);
  ctx.lineTo(rect.x + rect.w + tilt / 2, rect.y);
  ctx.lineTo(rect.x + rect.w - tilt / 2, rect.y + rect.h);
  ctx.lineTo(rect.x - tilt / 2, rect.y + rect.h);
  ctx.closePath();
}

/** Finds the panel under a point (for editor hit-testing), topmost last. */
export function hitPanel(px, py, layout, W, H) {
  for (let i = layout.panels.length - 1; i >= 0; i--) {
    const r = panelRectPx(layout.panels[i], W, H);
    const tilt = Math.tan(((layout.slant ?? 0) * Math.PI) / 180) * r.h;
    const top = r.x + tilt / 2, bottom = r.x - tilt / 2;
    const t = (py - r.y) / r.h;
    if (t < 0 || t > 1) continue;
    const left = top + (bottom - top) * t;
    if (px >= left && px <= left + r.w) return layout.panels[i].id;
  }
  return null;
}

/** Relative luminance of an sRGB hex colour (0..1). */
export function luminance(hex) {
  const n = parseInt(hex.slice(1), 16);
  const f = (c) => {
    const v = c / 255;
    return v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4);
  };
  return 0.2126 * f((n >> 16) & 255) + 0.7152 * f((n >> 8) & 255) + 0.0722 * f(n & 255);
}

/** WCAG contrast ratio between two hex colours. */
export function contrastRatio(a, b) {
  const la = luminance(a), lb = luminance(b);
  const hi = Math.max(la, lb), lo = Math.min(la, lb);
  return (hi + 0.05) / (lo + 0.05);
}

/** Draws the sky: vertical gradient, stars, the striped sun, the neon grid. */
export function drawSky(ctx, W, H, grade) {
  const sky = ctx.createLinearGradient(0, 0, 0, H);
  for (const [pos, color] of grade.sky) sky.addColorStop(pos, color);
  ctx.fillStyle = sky;
  ctx.fillRect(0, 0, W, H);
  const horizonY = grade.horizon * H;

  if (grade.stars) {
    const rnd = mulberry32(20261120);
    for (let i = 0; i < 130; i++) {
      const sx = rnd() * W;
      const sy = rnd() * horizonY * 0.82;
      const sr = (rnd() * 1.6 + 0.6) * (W / 1080);
      ctx.globalAlpha = 0.25 + rnd() * 0.65;
      ctx.fillStyle = '#FFFFFF';
      ctx.fillRect(sx, sy, sr, sr);
    }
    ctx.globalAlpha = 1;
  }

  // The sun: drawn on its own layer first, so the venetian-blind stripes
  // cut only the sun's own gradient and never the sky behind it.
  const sun = grade.sun;
  const cx = sun.cx * W, cy = sun.cy * H, r = sun.r * W;
  const glow = ctx.createRadialGradient(cx, cy, r * 0.2, cx, cy, r * 1.9);
  glow.addColorStop(0, hexA(grade.sunGlow, 0.55));
  glow.addColorStop(1, hexA(grade.sunGlow, 0));
  ctx.fillStyle = glow;
  ctx.fillRect(cx - r * 2, cy - r * 2, r * 4, r * 4);
  const sunLayer = document.createElement('canvas');
  sunLayer.width = Math.ceil(r * 2);
  sunLayer.height = Math.ceil(r * 2);
  const s = sunLayer.getContext('2d');
  const sunGrad = s.createLinearGradient(0, 0, 0, r * 2);
  sunGrad.addColorStop(0, sun.top);
  sunGrad.addColorStop(0.45, sun.mid);
  sunGrad.addColorStop(1, sun.low);
  s.fillStyle = sunGrad;
  s.beginPath();
  s.arc(r, r, r, 0, Math.PI * 2);
  s.fill();
  // Venetian-blind stripes across the sun's lower half, widening downwards.
  let y = r * 0.96, i = 0;
  s.globalCompositeOperation = 'destination-out';
  while (y < r * 2) {
    const band = Math.max(3, r * 0.055 - i * r * 0.004);
    const gap = r * 0.008 + i * r * 0.007;
    s.fillRect(0, y + band, r * 2, gap);
    y += band + gap;
    i++;
  }
  s.globalCompositeOperation = 'source-over';
  ctx.drawImage(sunLayer, cx - r, cy - r);
  // Thin bright limb on the sun's upper edge.
  ctx.save();
  ctx.beginPath();
  ctx.arc(cx, cy, r, Math.PI, Math.PI * 2);
  ctx.strokeStyle = hexA('#FFFFFF', 0.85);
  ctx.lineWidth = Math.max(2, W * 0.002);
  ctx.stroke();
  ctx.restore();

  if (grade.grid) {
    // Neon perspective grid below the horizon.
    const vx = W / 2, vy = horizonY;
    ctx.save();
    ctx.strokeStyle = grade.sunGlow;
    ctx.shadowColor = grade.sunGlow;
    ctx.shadowBlur = W * 0.008;
    ctx.lineWidth = Math.max(1.5, W * 0.0016);
    for (let k = -9; k <= 9; k++) {
      ctx.beginPath();
      ctx.moveTo(vx + k * W * 0.09, H);
      ctx.lineTo(vx, vy);
      ctx.stroke();
    }
    const N = 14;
    for (let k = 1; k <= N; k++) {
      const gy = horizonY + (H - horizonY) * Math.pow(k / N, 2.15);
      ctx.globalAlpha = 0.25 + (k / N) * 0.6;
      ctx.lineWidth = Math.max(1, W * 0.001 + (k / N) * W * 0.0016);
      ctx.beginPath();
      ctx.moveTo(0, gy);
      ctx.lineTo(W, gy);
      ctx.stroke();
    }
    ctx.restore();
  }
}

/** A hex colour with an alpha channel, as an rgba() string. */
export function hexA(hex, alpha) {
  const n = parseInt(hex.slice(1), 16);
  return `rgba(${(n >> 16) & 255},${(n >> 8) & 255},${n & 255},${alpha})`;
}

/** Draws one photo panel: cover-fit with pan/zoom, grade wash, frame. */
export function drawPanel(ctx, rect, slantDeg, photo, transform, grade, W) {
  ctx.save();
  panelPath(ctx, rect, slantDeg);
  ctx.clip();
  ctx.fillStyle = '#14081C';
  ctx.fillRect(rect.x - 10, rect.y - 10, rect.w + 20, rect.h + 20);
  if (photo) {
    const iw = photo.naturalWidth, ih = photo.naturalHeight;
    const base = Math.max(rect.w / iw, rect.h / ih);
    const scale = base * (transform?.zoom ?? 1);
    const dw = iw * scale, dh = ih * scale;
    const dx = rect.x + (rect.w - dw) / 2 + (transform?.ox ?? 0) * rect.w;
    const dy = rect.y + (rect.h - dh) / 2 + (transform?.oy ?? 0) * rect.h;
    if (grade.duotone) ctx.filter = 'grayscale(1) contrast(1.12) brightness(1.04)';
    ctx.drawImage(photo, dx, dy, dw, dh);
    ctx.filter = 'none';
    // Warm wash so photos from different cameras read as one poster.
    ctx.globalCompositeOperation = grade.panelWash.mode;
    ctx.globalAlpha = grade.panelWash.alpha;
    ctx.fillStyle = grade.panelWash.color;
    ctx.fillRect(rect.x - 10, rect.y - 10, rect.w + 20, rect.h + 20);
    ctx.globalCompositeOperation = grade.panelTop.mode;
    ctx.globalAlpha = grade.panelTop.alpha;
    ctx.fillStyle = grade.panelTop.color;
    ctx.fillRect(rect.x - 10, rect.y - 10, rect.w + 20, (rect.h + 20) / 2);
    ctx.globalAlpha = 1;
    ctx.globalCompositeOperation = 'source-over';
    if (grade.halftone) drawHalftone(ctx, rect);
  } else {
    ctx.fillStyle = '#241231';
    ctx.fillRect(rect.x, rect.y, rect.w, rect.h);
  }
  ctx.restore();
  // Frame: a hairline of cream light around the panel.
  ctx.save();
  panelPath(ctx, rect, slantDeg);
  ctx.strokeStyle = hexA('#FFF3E0', 0.85);
  ctx.lineWidth = Math.max(2, W * 0.0022);
  ctx.stroke();
  ctx.restore();
}

/** A halftone dot screen, tiled over a rect (print texture, Poster Ink). */
let halftonePattern = null;
export function drawHalftone(ctx, rect) {
  if (!halftonePattern) {
    const tile = document.createElement('canvas');
    tile.width = 7; tile.height = 7;
    const t = tile.getContext('2d');
    t.fillStyle = '#000000';
    t.beginPath(); t.arc(3.5, 3.5, 1.5, 0, Math.PI * 2); t.fill();
    halftonePattern = ctx.createPattern(tile, 'repeat');
  }
  ctx.save();
  ctx.globalCompositeOperation = 'multiply';
  ctx.globalAlpha = 0.22;
  ctx.fillStyle = halftonePattern;
  ctx.fillRect(rect.x, rect.y, rect.w, rect.h);
  ctx.restore();
}

/** Wraps caption words into at most three lines that fit the width. */
export function wrapCaption(ctx, text, maxWidth, size) {
  const words = text.trim().toUpperCase().split(/\s+/);
  const lines = [];
  let line = '';
  for (const word of words) {
    const trial = line ? `${line} ${word}` : word;
    if (ctx.measureText(trial).width <= maxWidth || !line) line = trial;
    else { lines.push(line); line = word; }
  }
  if (line) lines.push(line);
  return lines.slice(0, 3);
}

/** The hero caption: chrome gradient, cream solid, or outline lettering. */
export function drawCaption(ctx, W, H, state, grade) {
  const text = (state.caption || '').trim();
  if (!text) return;
  const zone = state.captionPos ?? 'bottom';
  const bandTop = zone === 'top' ? H * 0.02 : zone === 'center' ? H * 0.42 : H * 0.7;
  const bandH = H * 0.26;
  // A scrim behind the band so the letters always sit on dark ground.
  const scrim = ctx.createLinearGradient(0, bandTop, 0, bandTop + bandH);
  scrim.addColorStop(0, 'rgba(10,4,20,0)');
  scrim.addColorStop(0.45, 'rgba(10,4,20,0.5)');
  scrim.addColorStop(1, 'rgba(10,4,20,0.72)');
  ctx.fillStyle = scrim;
  ctx.fillRect(0, bandTop, W, bandTop + bandH);
  const maxW = W * 0.9;
  let size = H * 0.128;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  let lines = [];
  while (size > H * 0.04) {
    ctx.font = `700 ${size}px "Big Shoulders", "Arial Narrow", sans-serif`;
    lines = wrapCaption(ctx, text, maxW, size);
    const widest = Math.max(...lines.map((l) => ctx.measureText(l).width));
    if (widest <= maxW) break;
    size -= H * 0.006;
  }
  const lineH = size * 0.92;
  const totalH = lines.length * lineH;
  const cy = zone === 'top' ? H * 0.14 : zone === 'center' ? H * 0.52 : H * 0.815;
  const y0 = cy - totalH / 2 + lineH / 2;
  const style = state.lettering ?? grade.caption;
  for (let i = 0; i < lines.length; i++) {
    const y = y0 + i * lineH;
    ctx.save();
    ctx.shadowColor = hexA(grade.sunGlow, 0.9);
    ctx.shadowBlur = size * 0.18;
    ctx.lineJoin = 'round';
    if (style === 'chrome') {
      const g = ctx.createLinearGradient(0, y - size * 0.5, 0, y + size * 0.5);
      for (const [pos, color] of CHROME_STOPS) g.addColorStop(pos, color);
      ctx.fillStyle = g;
      ctx.strokeStyle = '#14081C';
      ctx.lineWidth = size * 0.055;
      ctx.strokeText(lines[i], W / 2, y);
      ctx.fillText(lines[i], W / 2, y);
    } else if (style === 'outline') {
      ctx.strokeStyle = '#FFF3E0';
      ctx.lineWidth = size * 0.045;
      ctx.strokeText(lines[i], W / 2, y);
      ctx.fillStyle = hexA('#14081C', 0.55);
      ctx.fillText(lines[i], W / 2, y);
    } else {
      ctx.fillStyle = '#FFF3E0';
      ctx.strokeStyle = '#14081C';
      ctx.lineWidth = size * 0.05;
      ctx.strokeText(lines[i], W / 2, y);
      ctx.fillText(lines[i], W / 2, y);
    }
    ctx.restore();
  }
  // Kicker above, subcaption below — quiet, letterspaced, mono.
  ctx.save();
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  if (state.kicker) {
    ctx.font = `400 ${Math.max(11, H * 0.016)}px "JetBrains Mono", monospace`;
    try { ctx.letterSpacing = `${Math.max(3, W * 0.004)}px`; } catch { /* older canvas */ }
    ctx.fillStyle = hexA('#4DE3FF', 0.95);
    ctx.fillText(state.kicker.toUpperCase(), W / 2, y0 - lineH * 0.62);
  }
  if (state.subcaption) {
    ctx.font = `400 ${Math.max(13, H * 0.02)}px Outfit, sans-serif`;
    try { ctx.letterSpacing = `${Math.max(2, W * 0.002)}px`; } catch { /* older canvas */ }
    ctx.fillStyle = hexA('#FFF3E0', 0.85);
    ctx.fillText(state.subcaption.toUpperCase(), W / 2, y0 + totalH / 2 + lineH * 0.42);
  }
  try { ctx.letterSpacing = '0px'; } catch { /* older canvas */ }
  ctx.restore();
}

/** The circular seal: ring, circular text, star centre. Tucked into the
 *  top-right corner, like a sticker on the poster's edge — never on a face. */
export function drawSeal(ctx, W, H) {
  const cx = W * 0.935, cy = H * 0.068, r = W * 0.032;
  ctx.save();
  ctx.translate(cx, cy);
  ctx.rotate(-0.12);
  ctx.fillStyle = hexA('#14081C', 0.82);
  ctx.beginPath(); ctx.arc(0, 0, r, 0, Math.PI * 2); ctx.fill();
  ctx.strokeStyle = '#FFD662';
  ctx.lineWidth = Math.max(2, r * 0.06);
  ctx.beginPath(); ctx.arc(0, 0, r * 0.92, 0, Math.PI * 2); ctx.stroke();
  ctx.lineWidth = Math.max(1, r * 0.03);
  ctx.beginPath(); ctx.arc(0, 0, r * 0.68, 0, Math.PI * 2); ctx.stroke();
  const ringText = 'VICE HOUR • LEONIDA • EST. 2026 • ';
  ctx.fillStyle = '#FFD662';
  ctx.font = `700 ${Math.max(9, r * 0.16)}px Outfit, sans-serif`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  const step = (Math.PI * 2) / ringText.length;
  for (let i = 0; i < ringText.length; i++) {
    const a = -Math.PI / 2 + i * step;
    ctx.save();
    ctx.rotate(a);
    ctx.translate(0, -r * 0.8);
    ctx.fillText(ringText[i], 0, 0);
    ctx.restore();
  }
  ctx.font = `700 ${r * 0.52}px "Big Shoulders", sans-serif`;
  ctx.fillStyle = '#FFF3E0';
  ctx.fillText('★', 0, r * 0.02);
  ctx.restore();
}

/** The angled callout badge, top-left. */
export function drawCallout(ctx, W, H, text) {
  if (!text) return;
  const size = Math.max(13, H * 0.02);
  ctx.save();
  ctx.font = `700 ${size}px Outfit, sans-serif`;
  const padX = size * 1.1;
  const tw = ctx.measureText(text.toUpperCase()).width + padX * 2;
  const th = size * 2.1;
  ctx.translate(W * 0.055, H * 0.1);
  ctx.rotate(-0.1);
  ctx.fillStyle = '#E91B61';
  ctx.shadowColor = hexA('#E91B61', 0.8);
  ctx.shadowBlur = size * 0.5;
  ctx.fillRect(0, 0, tw, th);
  ctx.shadowBlur = 0;
  ctx.fillStyle = '#FFF3E0';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(text.toUpperCase(), tw / 2, th / 2 + size * 0.05);
  ctx.restore();
}

/** The billing block: tiny credits along the foot, like a movie poster. */
export function drawBilling(ctx, W, H) {
  ctx.save();
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillStyle = hexA('#FFF3E0', 0.62);
  const s1 = Math.max(9, H * 0.0115);
  const s2 = Math.max(8, H * 0.0098);
  ctx.font = `400 ${s1}px Outfit, sans-serif`;
  try { ctx.letterSpacing = `${Math.max(2, W * 0.0016)}px`; } catch { /* older canvas */ }
  ctx.fillText('A VICE HOUR PRODUCTION', W / 2, H * 0.965);
  ctx.font = `400 ${s2}px Outfit, sans-serif`;
  ctx.fillText('STARRING YOU · DIRECTED BY YOU · LEONIDA · 2026', W / 2, H * 0.982);
  try { ctx.letterSpacing = '0px'; } catch { /* older canvas */ }
  ctx.restore();
}

/** Film grain: deterministic dots, low alpha, over the whole poster. */
export function drawGrain(ctx, W, H, amount, seed) {
  if (!amount) return;
  const rnd = mulberry32(seed);
  const count = Math.floor((W * H) / 900);
  ctx.save();
  for (let i = 0; i < count; i++) {
    const v = rnd();
    ctx.fillStyle = v > 0.5 ? `rgba(255,255,255,${0.05 * amount / 5})` : `rgba(0,0,0,${0.07 * amount / 5})`;
    ctx.fillRect(rnd() * W, rnd() * H, 1.4, 1.4);
  }
  ctx.restore();
  // Vignette: darkened corners so the poster holds together.
  const vg = ctx.createRadialGradient(W / 2, H / 2, Math.min(W, H) * 0.42, W / 2, H / 2, Math.max(W, H) * 0.75);
  vg.addColorStop(0, 'rgba(10,4,20,0)');
  vg.addColorStop(1, 'rgba(10,4,20,0.32)');
  ctx.fillStyle = vg;
  ctx.fillRect(0, 0, W, H);
}

/** Draws the whole poster for a state onto the canvas's 2D context. */
export function drawPoster(ctx, W, H, state) {
  const grade = gradeById(state.grade);
  const layout = layoutById(state.layout);
  ctx.clearRect(0, 0, W, H);
  drawSky(ctx, W, H, grade);
  for (const panel of layout.panels) {
    const rect = panelRectPx(panel, W, H);
    const t = state.panels?.[panel.id];
    const photo = t && t.photo != null ? state.photos[t.photo]?.img ?? null : null;
    drawPanel(ctx, rect, layout.slant ?? 0, photo, t, grade, W);
  }
  drawCaption(ctx, W, H, state, grade);
  if (state.furniture?.callout) drawCallout(ctx, W, H, state.callout);
  if (state.furniture?.seal) drawSeal(ctx, W, H);
  if (state.furniture?.billing) drawBilling(ctx, W, H);
  drawGrain(ctx, W, H, grade.grain ?? 5, 20261120);
}
