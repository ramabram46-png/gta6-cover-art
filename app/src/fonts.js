// Loads the bundled OFL fonts (files under app/fonts/) before any drawing,
// so the preview and the export use the same letterforms. Each face is
// registered with the FontFace API and awaited; drawing waits on this.

const FACES = [
  { family: 'Big Shoulders', weight: '700', file: 'fonts/BigShoulders-Bold.ttf' },
  { family: 'Big Shoulders', weight: '400', file: 'fonts/BigShoulders-Regular.ttf' },
  { family: 'Outfit', weight: '700', file: 'fonts/Outfit-Bold.ttf' },
  { family: 'Outfit', weight: '400', file: 'fonts/Outfit-Regular.ttf' },
  { family: 'JetBrains Mono', weight: '400', file: 'fonts/JetBrainsMono-Regular.ttf' },
  { family: 'Boldonse', weight: '400', file: 'fonts/Boldonse-Regular.ttf' },
];

let loaded = null;

/** Loads every bundled face once; resolves when all are ready to draw. */
export function loadFonts() {
  if (loaded) return loaded;
  loaded = (async () => {
    const jobs = FACES.map(async (face) => {
      try {
        const font = new FontFace(face.family, `url(${face.file})`, { weight: face.weight });
        const ready = await font.load();
        document.fonts.add(ready);
      } catch (err) {
        console.warn('font failed:', face.file, err);
      }
    });
    await Promise.all(jobs);
    // Force the faces into the font cache at the sizes the poster uses.
    await Promise.all([
      document.fonts.load('700 100px "Big Shoulders"'),
      document.fonts.load('400 100px "Big Shoulders"'),
      document.fonts.load('700 40px Outfit'),
      document.fonts.load('400 40px Outfit'),
      document.fonts.load('400 24px "JetBrains Mono"'),
      document.fonts.load('400 100px Boldonse'),
    ]);
  })();
  return loaded;
}
