// Wires the editor: the photo tray, layout and grade pickers, caption and
// furniture controls, the poster canvas with direct manipulation, and PNG
// export. A `?shot=` query sets up a fixed scene for a screenshot instead.
// State is plain data (photos live in a pool beside it); undo/redo snapshots
// the state as JSON. The preview canvas is display-only: exports render to
// a fresh offscreen canvas at full size, so handles never reach the PNG.

import { drawPoster, sizeById, hitPanel, panelRectPx, SIZES } from './cover.js';
import { GRADES } from './grades.js';
import { LAYOUTS, layoutById } from './layouts.js';
import { loadFonts } from './fonts.js';
import { runShot } from './shots.js';

const canvas = document.getElementById('poster');
const ctx = canvas.getContext('2d');
const statusEl = document.getElementById('status');

/** Loads an image from a URL, resolving once it can be drawn. */
export function loadImage(url) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = reject;
    img.src = url;
  });
}

const state = {
  layout: 'triptych',
  grade: 'vice-sunset',
  size: 'square',
  caption: 'VICE HOUR',
  subcaption: 'A LEONIDA STORY',
  kicker: 'EST. 2026 · LEONIDA',
  callout: 'STARRING YOU',
  lettering: 'chrome',
  captionPos: 'bottom',
  furniture: { seal: true, billing: true, callout: true },
  panels: {},
  photos: [],
};

let selectedPanel = 'a';
const undoStack = [];
const redoStack = [];

/** Serialises the state without the image objects (they live in the pool). */
function snapshot() {
  return JSON.stringify({
    layout: state.layout, grade: state.grade, size: state.size,
    caption: state.caption, subcaption: state.subcaption, kicker: state.kicker,
    callout: state.callout, lettering: state.lettering, captionPos: state.captionPos,
    furniture: state.furniture, panels: state.panels,
  });
}

function restore(json) {
  const s = JSON.parse(json);
  Object.assign(state, s);
  selectedPanel = layoutById(state.layout).panels[0].id;
  ensurePanels();
  syncControls();
  redraw();
}

function pushHistory() {
  undoStack.push(snapshot());
  if (undoStack.length > 50) undoStack.shift();
  redoStack.length = 0;
  syncHistoryButtons();
}

function undo() {
  if (!undoStack.length) return;
  redoStack.push(snapshot());
  restore(undoStack.pop());
  syncHistoryButtons();
}

function redo() {
  if (!redoStack.length) return;
  undoStack.push(snapshot());
  restore(redoStack.pop());
  syncHistoryButtons();
}

/** Keeps a transform for every panel of the current layout; empty panels take the first photo. */
function ensurePanels() {
  const layout = layoutById(state.layout);
  const next = {};
  layout.panels.forEach((panel, i) => {
    const old = state.panels[panel.id];
    if (old) next[panel.id] = old;
    else {
      const photo = state.photos.length ? (i % state.photos.length) : null;
      next[panel.id] = { photo, zoom: 1, ox: 0, oy: 0 };
    }
  });
  state.panels = next;
  if (!state.panels[selectedPanel]) selectedPanel = layout.panels[0].id;
}

/** Draws the preview at the export size, then the selection overlay. */
function redraw() {
  const size = sizeById(state.size);
  canvas.width = size.w;
  canvas.height = size.h;
  drawPoster(ctx, size.w, size.h, state);
  drawSelection();
  const layout = layoutById(state.layout);
  const panel = layout.panels.find((p) => p.id === selectedPanel);
  document.getElementById('panel-label').textContent = panel
    ? `Panel ${panel.id.toUpperCase()} — ${layout.name}` : 'No panel';
}

/** The selection outline and corner handles on the preview canvas only. */
function drawSelection() {
  const layout = layoutById(state.layout);
  const panel = layout.panels.find((p) => p.id === selectedPanel);
  if (!panel) return;
  const r = panelRectPx(panel, canvas.width, canvas.height);
  const tilt = Math.tan(((layout.slant ?? 0) * Math.PI) / 180) * r.h;
  ctx.save();
  ctx.strokeStyle = '#4DE3FF';
  ctx.lineWidth = Math.max(2, canvas.width * 0.002);
  ctx.setLineDash([10, 6]);
  ctx.strokeRect(r.x - 4, r.y - 4, r.w + 8, r.h + 8);
  ctx.setLineDash([]);
  const hs = Math.max(10, canvas.width * 0.012);
  const corners = [
    [r.x + tilt / 2, r.y], [r.x + r.w + tilt / 2, r.y],
    [r.x + r.w - tilt / 2, r.y + r.h], [r.x - tilt / 2, r.y + r.h],
  ];
  ctx.fillStyle = '#4DE3FF';
  for (const [x, y] of corners) ctx.fillRect(x - hs / 2, y - hs / 2, hs, hs);
  ctx.restore();
}

/** Exports the poster at full size and downloads it as a PNG. */
async function exportPNG() {
  const size = sizeById(state.size);
  const off = document.createElement('canvas');
  off.width = size.w;
  off.height = size.h;
  drawPoster(off.getContext('2d'), size.w, size.h, state);
  const blob = await new Promise((resolve) => off.toBlob(resolve, 'image/png'));
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = `vice-hour-${size.w}x${size.h}.png`;
  a.click();
  statusEl.textContent = `Saved vice-hour-${size.w}x${size.h}.png`;
}

/** The same export as a data URL, for the screenshot script to capture. */
async function exportDataURL(sizeId) {
  const size = sizeById(sizeId ?? state.size);
  const off = document.createElement('canvas');
  off.width = size.w;
  off.height = size.h;
  drawPoster(off.getContext('2d'), size.w, size.h, state);
  return off.toDataURL('image/png');
}

window.__viceHour = { state, exportDataURL, exportPNG, redraw };

// ---- control sync -------------------------------------------------------

const $ = (id) => document.getElementById(id);

function syncControls() {
  $('caption').value = state.caption;
  $('subcaption').value = state.subcaption;
  $('kicker').value = state.kicker;
  $('callout-text').value = state.callout;
  $('lettering').value = state.lettering;
  $('caption-pos').value = state.captionPos;
  $('f-seal').checked = state.furniture.seal;
  $('f-billing').checked = state.furniture.billing;
  $('f-callout').checked = state.furniture.callout;
  document.querySelectorAll('#layouts button').forEach((b) => {
    b.classList.toggle('active', b.dataset.layout === state.layout);
  });
  document.querySelectorAll('#grades button').forEach((b) => {
    b.classList.toggle('active', b.dataset.grade === state.grade);
  });
  document.querySelectorAll('#sizes button').forEach((b) => {
    b.classList.toggle('active', b.dataset.size === state.size);
  });
  const t = state.panels[selectedPanel];
  $('zoom').value = t ? t.zoom : 1;
  $('zoom-val').textContent = `${((t ? t.zoom : 1)).toFixed(2)}×`;
  syncHistoryButtons();
}

function syncHistoryButtons() {
  $('undo').disabled = !undoStack.length;
  $('redo').disabled = !redoStack.length;
}

/** Builds the layout picker: a tiny panel map per layout. */
function buildLayoutPicker() {
  const wrap = $('layouts');
  for (const layout of LAYOUTS) {
    const b = document.createElement('button');
    b.type = 'button';
    b.dataset.layout = layout.id;
    b.title = `${layout.name} — ${layout.blurb}`;
    const thumb = document.createElement('canvas');
    thumb.width = 72; thumb.height = 54;
    const t = thumb.getContext('2d');
    t.fillStyle = '#2A0E3E';
    t.fillRect(0, 0, 72, 54);
    for (const p of layout.panels) {
      t.fillStyle = '#FF7A5C';
      t.fillRect(p.x * 72 + 1, p.y * 54 + 1, p.w * 72 - 2, p.h * 54 - 2);
    }
    const label = document.createElement('span');
    label.textContent = layout.name;
    b.append(thumb, label);
    b.addEventListener('click', () => {
      if (state.layout === layout.id) return;
      pushHistory();
      state.layout = layout.id;
      ensurePanels();
      syncControls();
      redraw();
    });
    wrap.append(b);
  }
}

/** Builds the grade picker: a gradient chip per grade. */
function buildGradePicker() {
  const wrap = $('grades');
  for (const grade of GRADES) {
    const b = document.createElement('button');
    b.type = 'button';
    b.dataset.grade = grade.id;
    b.title = `${grade.name} — ${grade.blurb}`;
    const stops = grade.sky.map(([pos, c]) => `${c} ${Math.round(pos * 100)}%`).join(', ');
    b.style.background = `linear-gradient(160deg, ${stops})`;
    const label = document.createElement('span');
    label.textContent = grade.name;
    b.append(label);
    b.addEventListener('click', () => {
      if (state.grade === grade.id) return;
      pushHistory();
      state.grade = grade.id;
      syncControls();
      redraw();
    });
    wrap.append(b);
  }
}

/** Builds the export-size picker. */
function buildSizePicker() {
  const wrap = $('sizes');
  for (const size of SIZES) {
    const b = document.createElement('button');
    b.type = 'button';
    b.dataset.size = size.id;
    b.textContent = `${size.w} × ${size.h}`;
    b.addEventListener('click', () => {
      if (state.size === size.id) return;
      pushHistory();
      state.size = size.id;
      syncControls();
      redraw();
    });
    wrap.append(b);
  }
}

/** Builds the photo tray: samples plus uploads. */
function buildTray() {
  const tray = $('tray');
  tray.innerHTML = '';
  state.photos.forEach((photo, i) => {
    const b = document.createElement('button');
    b.type = 'button';
    b.className = 'tray-photo';
    b.draggable = true;
    b.title = photo.name;
    const img = document.createElement('img');
    img.src = photo.thumb;
    img.alt = photo.name;
    img.draggable = false;
    b.append(img);
    b.addEventListener('click', () => {
      pushHistory();
      state.panels[selectedPanel].photo = i;
      state.panels[selectedPanel].zoom = 1;
      state.panels[selectedPanel].ox = 0;
      state.panels[selectedPanel].oy = 0;
      redraw();
    });
    b.addEventListener('dragstart', (e) => {
      e.dataTransfer.setData('text/vice-hour-photo', String(i));
    });
    tray.append(b);
  });
}

/** Adds an uploaded file to the photo pool and assigns it to the panel hit. */
async function addUpload(file, panelId) {
  const url = URL.createObjectURL(file);
  const img = await loadImage(url);
  const thumbCanvas = document.createElement('canvas');
  thumbCanvas.width = 120;
  thumbCanvas.height = 120;
  const t = thumbCanvas.getContext('2d');
  const s = Math.max(120 / img.naturalWidth, 120 / img.naturalHeight);
  t.drawImage(img, (120 - img.naturalWidth * s) / 2, (120 - img.naturalHeight * s) / 2,
    img.naturalWidth * s, img.naturalHeight * s);
  pushHistory();
  state.photos.push({ name: file.name, img, thumb: thumbCanvas.toDataURL('image/jpeg', 0.8) });
  const idx = state.photos.length - 1;
  state.panels[panelId ?? selectedPanel].photo = idx;
  state.panels[panelId ?? selectedPanel].zoom = 1;
  state.panels[panelId ?? selectedPanel].ox = 0;
  state.panels[panelId ?? selectedPanel].oy = 0;
  buildTray();
  redraw();
}

// ---- canvas direct manipulation -----------------------------------------

function canvasPoint(e) {
  const box = canvas.getBoundingClientRect();
  return {
    x: ((e.clientX - box.left) / box.width) * canvas.width,
    y: ((e.clientY - box.top) / box.height) * canvas.height,
  };
}

let drag = null;

canvas.addEventListener('pointerdown', (e) => {
  canvas.setPointerCapture(e.pointerId);
  const p = canvasPoint(e);
  const id = hitPanel(p.x, p.y, layoutById(state.layout), canvas.width, canvas.height);
  if (!id) return;
  selectedPanel = id;
  syncControls();
  const t = state.panels[id];
  drag = {
    startX: p.x, startY: p.y, panelId: id,
    ox: t.ox, oy: t.oy, zoom: t.zoom,
    handle: nearHandle(p, id),
    moved: false,
  };
  redraw();
});

canvas.addEventListener('pointermove', (e) => {
  if (!drag) return;
  const p = canvasPoint(e);
  const layout = layoutById(state.layout);
  const panel = layout.panels.find((x) => x.id === drag.panelId);
  const r = panelRectPx(panel, canvas.width, canvas.height);
  const t = state.panels[drag.panelId];
  const dx = p.x - drag.startX, dy = p.y - drag.startY;
  if (Math.abs(dx) + Math.abs(dy) > 3) drag.moved = true;
  if (drag.handle) {
    // A corner handle zooms the photo: drag outward to zoom in.
    const cx = r.x + r.w / 2, cy = r.y + r.h / 2;
    const d0 = Math.hypot(drag.startX - cx, drag.startY - cy);
    const d1 = Math.hypot(p.x - cx, p.y - cy);
    t.zoom = clamp(drag.zoom * (d1 / Math.max(d0, 1)), 1, 4);
  } else if (e.shiftKey) {
    // Shift-drag: hover the target panel; the swap lands on release.
    const over = hitPanel(p.x, p.y, layout, canvas.width, canvas.height);
    drag.swapTarget = over && over !== drag.panelId ? over : null;
  } else {
    t.ox = clamp(drag.ox + dx / r.w, -0.5, 0.5);
    t.oy = clamp(drag.oy + dy / r.h, -0.5, 0.5);
  }
  syncControls();
  redraw();
});

canvas.addEventListener('pointerup', (e) => {
  if (!drag) return;
  if (drag.swapTarget) {
    pushHistory();
    const a = state.panels[drag.panelId];
    const b = state.panels[drag.swapTarget];
    const tmp = a.photo;
    a.photo = b.photo;
    b.photo = tmp;
    statusEl.textContent = `Swapped panels ${drag.panelId.toUpperCase()} and ${drag.swapTarget.toUpperCase()}`;
  } else if (drag.moved) {
    pushHistory();
  }
  drag = null;
  redraw();
});

canvas.addEventListener('dblclick', () => {
  pushHistory();
  const t = state.panels[selectedPanel];
  t.zoom = 1; t.ox = 0; t.oy = 0;
  syncControls();
  redraw();
});

canvas.addEventListener('wheel', (e) => {
  e.preventDefault();
  const t = state.panels[selectedPanel];
  t.zoom = clamp(t.zoom * Math.exp(-e.deltaY * 0.0012), 1, 4);
  syncControls();
  redraw();
  clearTimeout(canvas._wheelTimer);
  canvas._wheelTimer = setTimeout(pushHistory, 400);
}, { passive: false });

canvas.addEventListener('dragover', (e) => e.preventDefault());
canvas.addEventListener('drop', async (e) => {
  e.preventDefault();
  const photoIdx = e.dataTransfer.getData('text/vice-hour-photo');
  const p = canvasPoint(e);
  const id = hitPanel(p.x, p.y, layoutById(state.layout), canvas.width, canvas.height);
  if (!id) return;
  if (photoIdx !== '') {
    pushHistory();
    state.panels[id].photo = Number(photoIdx);
    state.panels[id].zoom = 1;
    state.panels[id].ox = 0;
    state.panels[id].oy = 0;
    selectedPanel = id;
    syncControls();
    redraw();
    return;
  }
  const file = e.dataTransfer.files?.[0];
  if (file) await addUpload(file, id);
});

/** The corner handle (if any) within 14px of a point on the selected panel. */
function nearHandle(p, panelId) {
  const layout = layoutById(state.layout);
  const panel = layout.panels.find((x) => x.id === panelId);
  const r = panelRectPx(panel, canvas.width, canvas.height);
  const tilt = Math.tan(((layout.slant ?? 0) * Math.PI) / 180) * r.h;
  const hs = Math.max(14, canvas.width * 0.014);
  const corners = [
    [r.x + tilt / 2, r.y], [r.x + r.w + tilt / 2, r.y],
    [r.x + r.w - tilt / 2, r.y + r.h], [r.x - tilt / 2, r.y + r.h],
  ];
  return corners.some(([x, y]) => Math.abs(p.x - x) < hs && Math.abs(p.y - y) < hs);
}

function clamp(v, lo, hi) {
  return Math.min(hi, Math.max(lo, v));
}

// ---- control wiring -----------------------------------------------------

function wireControls() {
  const text = (id, key) => {
    $(id).addEventListener('input', () => {
      state[key] = $(id).value;
      redraw();
    });
    $(id).addEventListener('change', pushHistory);
  };
  text('caption', 'caption');
  text('subcaption', 'subcaption');
  text('kicker', 'kicker');
  text('callout-text', 'callout');
  $('lettering').addEventListener('change', () => {
    pushHistory();
    state.lettering = $('lettering').value;
    redraw();
  });
  $('caption-pos').addEventListener('change', () => {
    pushHistory();
    state.captionPos = $('caption-pos').value;
    redraw();
  });
  const furn = (id, key) => {
    $(id).addEventListener('change', () => {
      pushHistory();
      state.furniture[key] = $(id).checked;
      redraw();
    });
  };
  furn('f-seal', 'seal');
  furn('f-billing', 'billing');
  furn('f-callout', 'callout');
  $('zoom').addEventListener('input', () => {
    state.panels[selectedPanel].zoom = Number($('zoom').value);
    $('zoom-val').textContent = `${Number($('zoom').value).toFixed(2)}×`;
    redraw();
  });
  $('zoom').addEventListener('change', pushHistory);
  $('reset-photo').addEventListener('click', () => {
    pushHistory();
    const t = state.panels[selectedPanel];
    t.zoom = 1; t.ox = 0; t.oy = 0;
    syncControls();
    redraw();
  });
  $('fill-all').addEventListener('click', () => {
    pushHistory();
    const t = state.panels[selectedPanel];
    const layout = layoutById(state.layout);
    layout.panels.forEach((panel, i) => {
      state.panels[panel.id].photo = t.photo;
      state.panels[panel.id].zoom = t.zoom;
      // A different crop per panel: the same photo, several framings.
      state.panels[panel.id].ox = (i % 3 - 1) * 0.12;
      state.panels[panel.id].oy = 0;
    });
    redraw();
  });
  $('undo').addEventListener('click', undo);
  $('redo').addEventListener('click', redo);
  document.addEventListener('keydown', (e) => {
    if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'z' && !e.shiftKey) { e.preventDefault(); undo(); }
    if ((e.ctrlKey || e.metaKey) && (e.key.toLowerCase() === 'y' || (e.key.toLowerCase() === 'z' && e.shiftKey))) { e.preventDefault(); redo(); }
  });
  $('upload').addEventListener('change', async (e) => {
    const file = e.target.files[0];
    if (file) await addUpload(file);
    e.target.value = '';
  });
  $('export').addEventListener('click', exportPNG);
}

// ---- boot ---------------------------------------------------------------

async function boot() {
  const params = new URLSearchParams(location.search);
  const shot = params.get('shot');
  await loadFonts();
  if (shot && shot !== 'editor') {
    await runShot(shot, canvas, loadImage);
    return;
  }
  const pier = await loadImage('samples/pier.jpg');
  const boulevard = await loadImage('samples/boulevard.jpg');
  state.photos = [
    { name: 'pier.jpg', img: pier, thumb: 'samples/pier.jpg' },
    { name: 'boulevard.jpg', img: boulevard, thumb: 'samples/boulevard.jpg' },
  ];
  ensurePanels();
  buildLayoutPicker();
  buildGradePicker();
  buildSizePicker();
  buildTray();
  wireControls();
  syncControls();
  redraw();
  if (shot === 'editor') {
    // Editor screenshot scene: triptych, pier loaded, middle panel selected.
    selectedPanel = 'b';
    syncControls();
    redraw();
    requestAnimationFrame(() => requestAnimationFrame(() => { window.__shotReady = true; }));
  }
}

boot();
