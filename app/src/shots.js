// Fixed scenes for screenshots: ?shot=editor shows the editor with a sample
// photo loaded and a panel selected; ?shot=cover shows a finished poster
// alone, full-viewport, at the size the query asks for. window.__shotReady
// is set once the scene is painted, and window.__viceHour exposes the
// export for the screenshot script to capture the PNG the app wrote.

import { drawPoster, sizeById } from './cover.js';

const SCENES = {
  cover: {
    layout: 'triptych', grade: 'vice-sunset', size: 'wide',
    caption: 'VICE HOUR', subcaption: 'A LEONIDA STORY', kicker: 'EST. 2026 · LEONIDA',
    callout: 'STARRING YOU', lettering: 'chrome', captionPos: 'bottom',
    furniture: { seal: true, billing: true, callout: true },
    photos: ['pier', 'boulevard', 'pier'],
  },
  portrait: {
    layout: 'quad', grade: 'poster-ink', size: 'portrait',
    caption: 'GOLDEN\nGIRL', subcaption: 'SUMMER IN LEONIDA', kicker: 'VICE HOUR PRESENTS',
    callout: 'NEW', lettering: 'cream', captionPos: 'bottom',
    furniture: { seal: true, billing: true, callout: false },
    photos: ['boulevard', 'pier', 'boulevard', 'pier'],
  },
  square: {
    layout: 'split', grade: 'golden-hour', size: 'square',
    caption: 'PIER\nNIGHTS', subcaption: 'LAST CAST AT DUSK', kicker: 'EST. 2026 · LEONIDA',
    callout: 'STARRING YOU', lettering: 'cream', captionPos: 'bottom',
    furniture: { seal: false, billing: true, callout: true },
    photos: ['pier', 'boulevard'],
  },
};

/** Builds a scene's state from its sample photos. */
export async function buildScene(name, loadImage) {
  const scene = SCENES[name];
  if (!scene) return null;
  const size = sizeById(scene.size);
  const imgs = [];
  for (const sample of scene.photos) imgs.push(await loadImage(`samples/${sample}.jpg`));
  const panels = {};
  const layoutPanels = { triptych: ['a', 'b', 'c'], quad: ['a', 'b', 'c', 'd'], split: ['a', 'b'] }[scene.layout];
  layoutPanels.forEach((id, i) => {
    panels[id] = { photo: i % imgs.length, zoom: 1, ox: 0, oy: 0 };
  });
  return {
    layout: scene.layout,
    grade: scene.grade,
    size: scene.size,
    caption: scene.caption,
    subcaption: scene.subcaption,
    kicker: scene.kicker,
    callout: scene.callout,
    lettering: scene.lettering,
    captionPos: scene.captionPos,
    furniture: scene.furniture,
    panels,
    photos: imgs.map((img, i) => ({ name: scene.photos[i], img })),
  };
}

/** Runs a ?shot= scene on a bare canvas: poster alone, no editor chrome. */
export async function runShot(shot, canvas, loadImage) {
  const state = await buildScene(shot, loadImage);
  if (!state) return false;
  const size = sizeById(state.size);
  canvas.width = size.w;
  canvas.height = size.h;
  document.body.classList.add('shot-cover');
  const ctx = canvas.getContext('2d');
  drawPoster(ctx, size.w, size.h, state);
  window.__viceHour = window.__viceHour ?? {};
  window.__viceHour.sceneState = state;
  requestAnimationFrame(() => requestAnimationFrame(() => { window.__shotReady = true; }));
  return true;
}
