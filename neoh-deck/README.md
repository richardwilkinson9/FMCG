# NEOH AG investment deck

Static, self-contained deck. Nothing to build — `index.html` carries every image
and font inline and unpacks itself in the browser. Not part of the GROSS. app
(the root `.vercelignore` keeps this folder out of the GROSS. deployment).

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

## What is in here

Six slides, 1920 × 1358 each, scaled to the viewport width by a small inline
script and stacked vertically — one scrolling page rather than a click-through
deck viewer:

1. Cover — Reinventing sweetening technology
2. Core IP — the taste × health compromise is over
3. Competitor map
4. What is ZERO+ — a data-driven formula
5. Structure & growth — two business streams
6. Our products
