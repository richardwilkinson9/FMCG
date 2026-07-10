# GROSS. — the performance budget

*What the site is allowed to weigh, what it weighs today, and how to check.
Future changes are judged against this file. Measured 2026-07-10 on the
production build (`npm run build`, sizes from the Vite output + `gzip -c | wc -c`).*

## The budget

| Line | Budget | Today | Room |
|---|---|---|---|
| First-load JS (entry chunk, gzipped) | < 120 KB | 77.8 KB | 42 KB |
| First-load CSS (gzipped) | < 10 KB | 6.2 KB | 3.8 KB |
| Fonts, all four files (woff2) | < 90 KB | 83.7 KB | 6.3 KB |
| Any lazy calculator chunk (gzipped) | < 25 KB | ≤ 18.1 KB (CalcShell) | — |
| Supabase / cloud layer | never in first paint | lazy (`cloud-*.js`) | — |
| exceljs | never in first paint | lazy, dynamic import | — |

The rules behind the numbers:

- **The entry chunk carries Home and the router, nothing else.** Calculators are
  lazy chunks (`App.tsx` PAGES); analytics loads the cloud layer lazily. If a
  change drags Supabase or exceljs into `index-*.js`, the build output makes it
  obvious — the entry chunk jumps by ~50 KB gzipped. That is a regression; undo it.
- **Fonts are subset, not trimmed blind.** The four files in `public/fonts/` are
  subset to: Basic Latin (U+0020–007E), Latin-1 Supplement (U+00A0–00FF — user-typed
  product names keep their accents), U+0131, U+0152–0153, dashes/quotes/ellipsis
  (U+2013–2014, U+2018–201E, U+2026), € (U+20AC), ↑ (U+2191) and the true minus
  U+2212 that prefixes every receipt deduction. The arrows ←/→ and triangles ▴/▾
  used in some UI copy were **never in these fonts** — they render from system
  fallback before and after, so excluding them changes nothing.
- **Inter stays variable.** The wght 100–900 axis survives subsetting
  (verify: `python3 -c "from fontTools.ttLib import TTFont; print(TTFont('public/fonts/Inter-var.woff2')['fvar'].axes[0].__dict__)"`).

## Font subsetting — measured result

| File | Before | After | Saving |
|---|---|---|---|
| Anton-400.woff2 | 18,612 B | 15,852 B | −14.8% |
| SpaceMono-400.woff2 | 16,520 B | 14,376 B | −13.0% |
| SpaceMono-700.woff2 | 16,724 B | 14,700 B | −12.1% |
| Inter-var.woff2 | 48,256 B | 38,732 B | −19.7% |
| **Total** | **100,112 B** | **83,660 B** | **−16.4%** |

First-paint bytes (HTML + entry JS gz + CSS gz + all fonts): ~194 KB → ~178 KB.
The sources were already Google Fonts latin subsets, so this is the honest
ceiling — cutting Latin-1 letters would save a few more KB and put system-font
glyphs inside Space Mono receipts the day someone types "Nestlé". Not worth it.

All four fonts are preloaded in `index.html` (SpaceMono-700 included — it sets
the bold receipt lines above the fold and previously swapped in late).

## Resubsetting recipe

When a font file is replaced (new upstream version), re-run:

```sh
pip install fonttools brotli
pyftsubset public/fonts/<file>.woff2 --flavor=woff2 \
  --output-file=public/fonts/<file>.woff2.new \
  --unicodes='U+0020-007E,U+00A0-00FF,U+0131,U+0152-0153,U+2013-2014,U+2018-201E,U+2026,U+20AC,U+2191,U+2212' \
  --layout-features='*'
```

Then verify before replacing: the codepoint set above is fully covered, GPOS
(kerning) is present, and Inter still has its fvar axis. If a new glyph enters
the product copy (a new arrow, a new currency), add its codepoint here AND to
the list in `src/index.css` — the two must stay in step.

## Caching (vercel.json)

- `/assets/*` are content-hashed → `max-age=31536000, immutable`.
- `/fonts/*` and `/og/*` keep their filenames across content changes → one day
  + `stale-while-revalidate`; do NOT mark them immutable unless the filenames
  gain version suffixes.

## How to check a change

```sh
npm run build            # entry chunk + css sizes print in the output
ls -la public/fonts/     # font bytes
```

Compare against the table at the top. Over budget = the change is wrong, not
the budget.
