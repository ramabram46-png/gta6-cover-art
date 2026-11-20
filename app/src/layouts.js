// Panel layouts: each layout is a set of panels in unit space (x, y, w, h as
// fractions of the poster), plus an optional slant — the angle, in degrees,
// of the cuts between panels. Panels are drawn in order; later panels sit on
// top of earlier ones where they overlap. A layout's hero panel is its first
// panel: the one the caption band and the sun sit behind.

/** All layouts the studio offers. `panels` are unit rects; `slant` tilts cuts. */
export const LAYOUTS = [
  {
    id: 'hero',
    name: 'Hero',
    blurb: 'One big frame, caption across the foot',
    panels: [{ id: 'a', x: 0.06, y: 0.07, w: 0.88, h: 0.62 }],
    captionZone: 'bottom',
  },
  {
    id: 'split',
    name: 'Split',
    blurb: 'Two frames, one slanted cut',
    slant: 6,
    panels: [
      { id: 'a', x: 0.05, y: 0.07, w: 0.44, h: 0.62 },
      { id: 'b', x: 0.51, y: 0.07, w: 0.44, h: 0.62 },
    ],
    captionZone: 'bottom',
  },
  {
    id: 'triptych',
    name: 'Triptych',
    blurb: 'Three tall frames',
    slant: 4,
    panels: [
      { id: 'a', x: 0.04, y: 0.07, w: 0.29, h: 0.62 },
      { id: 'b', x: 0.355, y: 0.07, w: 0.29, h: 0.62 },
      { id: 'c', x: 0.67, y: 0.07, w: 0.29, h: 0.62 },
    ],
    captionZone: 'bottom',
  },
  {
    id: 'quad',
    name: 'Quad',
    blurb: 'Four frames, two by two',
    panels: [
      { id: 'a', x: 0.05, y: 0.06, w: 0.435, h: 0.3 },
      { id: 'b', x: 0.515, y: 0.06, w: 0.435, h: 0.3 },
      { id: 'c', x: 0.05, y: 0.38, w: 0.435, h: 0.3 },
      { id: 'd', x: 0.515, y: 0.38, w: 0.435, h: 0.3 },
    ],
    captionZone: 'bottom',
  },
  {
    id: 'big-strip',
    name: 'Big + Strip',
    blurb: 'One hero frame, two stacked beside it',
    panels: [
      { id: 'a', x: 0.05, y: 0.07, w: 0.56, h: 0.62 },
      { id: 'b', x: 0.63, y: 0.07, w: 0.32, h: 0.3 },
      { id: 'c', x: 0.63, y: 0.39, w: 0.32, h: 0.3 },
    ],
    captionZone: 'bottom',
  },
  {
    id: 'five',
    name: 'Five Stack',
    blurb: 'Hero on top, four frames below',
    panels: [
      { id: 'a', x: 0.05, y: 0.06, w: 0.9, h: 0.38 },
      { id: 'b', x: 0.05, y: 0.46, w: 0.21, h: 0.22 },
      { id: 'c', x: 0.28, y: 0.46, w: 0.21, h: 0.22 },
      { id: 'd', x: 0.51, y: 0.46, w: 0.21, h: 0.22 },
      { id: 'e', x: 0.74, y: 0.46, w: 0.21, h: 0.22 },
    ],
    captionZone: 'bottom',
  },
  {
    id: 'diagonal',
    name: 'Diagonal',
    blurb: 'Three frames cut on a steep diagonal',
    slant: 12,
    panels: [
      { id: 'a', x: 0.04, y: 0.1, w: 0.3, h: 0.56 },
      { id: 'b', x: 0.35, y: 0.07, w: 0.3, h: 0.62 },
      { id: 'c', x: 0.66, y: 0.1, w: 0.3, h: 0.56 },
    ],
    captionZone: 'bottom',
  },
  {
    id: 'filmstrip',
    name: 'Filmstrip',
    blurb: 'Centre frame, thin strips top and bottom',
    panels: [
      { id: 'a', x: 0.05, y: 0.05, w: 0.9, h: 0.16 },
      { id: 'b', x: 0.08, y: 0.23, w: 0.84, h: 0.4 },
      { id: 'c', x: 0.05, y: 0.65, w: 0.9, h: 0.16 },
    ],
    captionZone: 'bottom',
  },
];

/** Looks a layout up by id, falling back to the hero layout. */
export function layoutById(id) {
  return LAYOUTS.find((l) => l.id === id) ?? LAYOUTS[0];
}
