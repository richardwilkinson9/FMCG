# NEOH AG investment deck

Static, self-contained deck. Nothing to build at deploy time — `index.html`
carries every image and font inline and unpacks itself in the browser. Not part
of the GROSS. app (the root `.vercelignore` keeps this folder out of the GROSS.
deployment).

## Deploying it

Its own Vercel project, pointed at this folder:

- Framework preset: **Other**
- Root directory: **`neoh-deck`**
- Build command: none
- Output directory: leave empty (serves this folder as-is)

`vercel.json` here sets `cleanUrls` and an `X-Robots-Tag: noindex, nofollow`
header — the deck is marked strictly confidential, so it should not be indexed.
If it needs to be properly private rather than just unlisted, turn on Vercel
Deployment Protection (password or SSO) for the project.

## Two layouts, one file

`index.html` is generated from the original `NEOH_AG_Investmentdeck_STANDALONE`
export. The slide markup is the designer's, byte-for-byte; only the deck-viewer
runtime it shipped with was replaced, because that runtime's chrome (a thumbnail
rail) does not belong on a public link.

**Desktop (≥900px)** — the original six 1920×1080 slides, scaled so a whole
slide always fits the window (`min(vw/1920, vh/1080)`, not width alone: scaling
to width leaves the slide taller than the viewport and you never see a full
one). Slides snap one per screen; arrow keys, space, Page Up/Down, Home and End
step through them.

**Mobile (<900px)** — purpose-built reflowed layouts, one per slide, in
`src/mobile.html` + `src/mobile.css`. This is a genuine rebuild rather than a
scale-down: at 390px a scaled 1920 slide renders body copy at 3.7px, and no
fit-to-screen trick fixes that. Sections snap on `scroll-snap-type: y proximity`
— proximity, not mandatory, because several mobile slides are taller than the
viewport and mandatory snapping fights the reader on those.

Design decisions worth knowing:

- The cover headline drops from Obviously **Wide** to regular Obviously. The
  wide cut cannot set "REINVENTING" inside a phone measure.
- The competitor map is the one chart that cannot reflow — it is a positional
  scatter, and its meaning *is* the positions. It is cloned from the desktop
  slide at runtime (so the two can never drift apart), scaled to 0.8 and put in
  a horizontal scroller that starts at the far right, where ZERO+ sits. The
  reader lands on the payoff and pans left through the compromise zone.
- Product shots switch from `contain` to `cover` in 4:3 frames; `contain` left
  mismatched bands where the source art's own background stopped short.
- Measure is capped at 680px so the 600–899px band reads like a page.

## Rebuilding

`src/build.py` regenerates `index.html`. It needs the original standalone export
next to it as `standalone.html` — that file is the asset master (~8MB of inlined
images and fonts) and is deliberately not committed:

```
cd neoh-deck/src
cp /path/to/NEOH_AG_Investmentdeck_STANDALONE.html standalone.html
python3 build.py
```

Every transform asserts on its match and the script fails loudly rather than
silently producing a broken bundle, so a changed input export will error instead
of shipping.

## A note on the fonts

The original export declares `@font-face` for Urbana and Myriad Pro, but both
files are **zero bytes** in its own manifest — they were never embedded, most
likely for licensing. All UI and body text has therefore always fallen back
through the stack to Helvetica/Arial, in the original as much as here. Only the
Obviously display cuts are real. Nothing to fix; worth knowing before anyone
chases a font bug that isn't one.

## The slides

1. Cover — Reinventing sweetening technology
2. Core IP — the taste × health compromise is over
3. Competitor comparison
4. What is ZERO+ — a data-driven formula
5. Structure & growth — two business streams
6. Our products
