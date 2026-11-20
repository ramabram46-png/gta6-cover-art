[![make.fun · gta6-cover-art-01](https://make.fun/badge/gta6-cover-art-01.svg)](https://make.fun/bounty/gta6-cover-art-01)
[![rank](https://make.fun/badge/gta6-cover-art-01/ramabram46-png/gta6-cover-art/rank.svg)](https://make.fun/bounty/gta6-cover-art-01)
[![reward](https://make.fun/badge/gta6-cover-art-01/ramabram46-png/gta6-cover-art/reward.svg)](https://make.fun/bounty/gta6-cover-art-01)

# Vice Hour — GTA 6 Cover Studio

An offline web app that turns a photo and a caption into GTA 6 poster-style cover art, built for the [gta6-cover-art-01 bounty on make.fun](https://make.fun/bounty/gta6-cover-art-01).

## What it does

- **8 multi-panel layouts** (Hero, Split, Triptych, Quad, Big + Strip, Five Stack, Diagonal, Filmstrip) — drag to pan, wheel or corner handles to zoom, shift-drag onto a panel to swap photos, double-click resets, drop a photo on a panel to place it.
- **6 sunset / neon grades** — Vice Sunset, Neon Nights, Poster Ink (halftone duotone), Golden Hour, Palm Noir, Chrome Vice — each a full colour world: striped sun, neon grid, panel wash, grain.
- **Bold display lettering** — chrome gradient, cream solid or outline, in Big Shoulders (SIL OFL), with kicker and subcaption.
- **Poster furniture** — a circular seal stamp, an angled callout badge and a movie-style billing block, so an export reads as a real poster, not a collage.
- **PNG export in 1080×1080, 1080×1350 and 1920×1080**, plus undo/redo and one-photo-across-several-panels fill.

## Run it

Serve `app/` with any static server (`node serve.ts`, then http://localhost:8080) and open `index.html` in desktop Chrome. No network request: every script, font and sample photo is a file under `app/`. Fonts are SIL Open Font License (see `app/fonts/*-OFL.txt`). Sample photos were made for make.fun and are free to use.
