// The grade system: each grade is a complete Vice City colour world — a sky
// ramp, a striped sun, a panel tint and a caption treatment. The sky is drawn
// as a vertical gradient; the sun is a disc whose lower half is cut into
// venetian-blind stripes; panels get a warm wash so photos from different
// cameras read as one poster. All colours are sRGB hex; the caption's
// rendered contrast is checked against the sky behind it (see cover.js).

/** One grade: the sky, the sun, the panel wash and the lettering it wants. */
export const GRADES = [
  {
    id: 'vice-sunset',
    name: 'Vice Sunset',
    blurb: 'Indigo sky, magenta horizon, striped gold sun',
    sky: [
      [0.0, '#0B0320'], [0.28, '#2A0E4E'], [0.48, '#6E1A6E'],
      [0.58, '#C23A7E'], [0.62, '#FF7A5C'], [0.68, '#2A0E3E'],
      [0.85, '#12071F'], [1.0, '#0A0416'],
    ],
    horizon: 0.6,
    sun: { cx: 0.5, cy: 0.46, r: 0.22, top: '#FFF3C4', mid: '#FFC44D', low: '#FF3D77' },
    sunGlow: '#FF5E96',
    grid: true,
    stars: true,
    panelWash: { color: '#FF6B4A', alpha: 0.16, mode: 'overlay' },
    panelTop: { color: '#FF9E57', alpha: 0.1, mode: 'soft-light' },
    caption: 'chrome',
    halftone: false,
    grain: 5,
  },
  {
    id: 'neon-nights',
    name: 'Neon Nights',
    blurb: 'Near-black indigo, hot magenta, cyan rims',
    sky: [
      [0.0, '#04020E'], [0.3, '#0E1030'], [0.52, '#2B1150'],
      [0.6, '#FF2E88'], [0.66, '#160A2E'], [1.0, '#05030F'],
    ],
    horizon: 0.58,
    sun: { cx: 0.5, cy: 0.46, r: 0.19, top: '#FFE9F5', mid: '#FF7AD9', low: '#FF2E88' },
    sunGlow: '#FF2E88',
    grid: true,
    stars: true,
    panelWash: { color: '#FF2E88', alpha: 0.14, mode: 'overlay' },
    panelTop: { color: '#4DE3FF', alpha: 0.08, mode: 'soft-light' },
    caption: 'chrome',
    halftone: false,
    grain: 6,
  },
  {
    id: 'poster-ink',
    name: 'Poster Ink',
    blurb: 'Print duotone: magenta + ink, halftone dot screen',
    sky: [
      [0.0, '#1C0B26'], [0.45, '#3A1230'], [0.6, '#8A1E4E'],
      [0.66, '#2A0B22'], [1.0, '#160818'],
    ],
    horizon: 0.6,
    sun: { cx: 0.5, cy: 0.52, r: 0.2, top: '#FFE9D6', mid: '#FF9E7A', low: '#E91B61' },
    sunGlow: '#E91B61',
    grid: false,
    stars: false,
    panelWash: { color: '#E91B61', alpha: 0.22, mode: 'multiply' },
    panelTop: { color: '#FFFFFF', alpha: 0.06, mode: 'overlay' },
    caption: 'cream',
    halftone: true,
    duotone: true,
    grain: 8,
  },
  {
    id: 'golden-hour',
    name: 'Golden Hour',
    blurb: 'Warm gold, soft sun, low-contrast dusk',
    sky: [
      [0.0, '#1A1030'], [0.3, '#4A2040'], [0.5, '#8A3A44'],
      [0.58, '#FF9E57'], [0.64, '#FFD662'], [0.7, '#3A2038'],
      [1.0, '#140A20'],
    ],
    horizon: 0.6,
    sun: { cx: 0.5, cy: 0.52, r: 0.22, top: '#FFF8DC', mid: '#FFD662', low: '#FF983E' },
    sunGlow: '#FFB347',
    grid: false,
    stars: false,
    panelWash: { color: '#FFB347', alpha: 0.18, mode: 'overlay' },
    panelTop: { color: '#FFE9B8', alpha: 0.12, mode: 'soft-light' },
    caption: 'cream',
    halftone: false,
    grain: 4,
  },
  {
    id: 'palm-noir',
    name: 'Palm Noir',
    blurb: 'Near-monochrome plum, one gold accent',
    sky: [
      [0.0, '#0D0616'], [0.35, '#1E0F2E'], [0.55, '#33163E'],
      [0.62, '#6E2A4E'], [0.68, '#1A0B24'], [1.0, '#0A0410'],
    ],
    horizon: 0.6,
    sun: { cx: 0.5, cy: 0.52, r: 0.18, top: '#F5E9C8', mid: '#D9A441', low: '#8A5A2E' },
    sunGlow: '#D9A441',
    grid: false,
    stars: true,
    panelWash: { color: '#8A5A2E', alpha: 0.12, mode: 'overlay' },
    panelTop: { color: '#FFFFFF', alpha: 0.05, mode: 'soft-light' },
    caption: 'cream',
    halftone: false,
    grain: 6,
  },
  {
    id: 'chrome-vice',
    name: 'Chrome Vice',
    blurb: 'Chrome title, cyan / magenta split sky',
    sky: [
      [0.0, '#031018'], [0.3, '#0B2A44'], [0.5, '#1E4A6E'],
      [0.58, '#FF5E96'], [0.64, '#0B1A30'], [1.0, '#040A14'],
    ],
    horizon: 0.58,
    sun: { cx: 0.5, cy: 0.46, r: 0.2, top: '#FFFFFF', mid: '#7AD9FF', low: '#FF2E88' },
    sunGlow: '#4DE3FF',
    grid: true,
    stars: true,
    panelWash: { color: '#4DE3FF', alpha: 0.1, mode: 'overlay' },
    panelTop: { color: '#FF5E96', alpha: 0.1, mode: 'soft-light' },
    caption: 'chrome',
    halftone: false,
    grain: 5,
  },
];

/** Looks a grade up by id, falling back to the first grade. */
export function gradeById(id) {
  return GRADES.find((g) => g.id === id) ?? GRADES[0];
}

/** The chrome gradient for hero lettering: ice blue into gold into magenta. */
export const CHROME_STOPS = [
  [0.0, '#8FC4FF'], [0.2, '#D6E8FF'], [0.42, '#FFFFFF'], [0.5, '#FFFFFF'],
  [0.57, '#FFE28A'], [0.69, '#FF9646'], [0.85, '#FF4682'], [1.0, '#CB185C'],
];
