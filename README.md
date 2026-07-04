# GROSS.

**Do the gross maths.** Free commercial calculators for UK FMCG brand teams —
live at **[getgross.co.uk](https://getgross.co.uk)**.

Define a product once and eleven calculators read from it: retailer margins,
gross-to-net, promo paybacks, supply plans, Amazon and TikTok fees, the whole
range side by side. Every model exports as a formula-live branded Excel deck.
Free, no sign-up, no webinar, no "journey".

---

## Where the project is right now (July 2026)

**Built and live-ready — the product is feature-complete for launch:**

| Area | State |
|---|---|
| 11 calculators + The Rate Card | ✅ Built, branded, verified |
| Shared product spine + scenario | ✅ One product definition drives every tool |
| Promo calendar | ✅ Up to 6 promos/yr, mechanics, supplier funding, GSV→NSV→GM |
| Channels | ✅ Per-SKU in/out per channel, whole-channel P&Ls, sell-by-case Amazon |
| Excel export ("the deck") | ✅ Formula-live, named cells, whole range, all channels |
| Share links | ✅ Full model in the URL; clean per-tool paths; OG cards |
| Cloud (Supabase) | ✅ Magic-link login, synced Archive w/ version history, The Union, anonymous analytics — needs the SQL in [SETUP_SUPABASE.md](./SETUP_SUPABASE.md) run once |
| SEO | ✅ Per-tool indexable pages, prerendered crawlable content, JSON-LD, sitemap — **owner to-do: verify in Google Search Console + submit sitemap** |
| Maths regression suite | ✅ 27 hand-computed tests; run inside every build |
| Marketing assets | ✅ 3 carousel designs (30 slides + LinkedIn PDFs) in `marketing/`; strategy in [MARKETING.md](./MARKETING.md) |
| The Ledger (newsletter) | ⬜ Sign-ups collecting; **issue #1 not yet written** — the next real task |

Deployment: Vercel project `fmcg`, production deploys from branch
`claude/fmcg-maths-mvp-f72yht`, domain `getgross.co.uk` via Cloudflare DNS.

## The tools

| Page | What it answers |
|---|---|
| The Shelf | Define the range once — every tool reads it |
| The P&L | What the retailer really makes on you (+ category benchmark) |
| The Waterfall | Every deduction between shelf price and your bank |
| The Floor | The lowest cost price / RRP that still clears your margin |
| The Listing | The range review, week by week, with the full promo calendar |
| The Payback | How much volume a promo needs to pay itself back |
| The Stock Answer | What to order and when, following the promo calendar |
| The Amazon Cut | FBA fees per unit + the whole Amazon channel P&L |
| The TikTok Cut | TikTok Shop fees per unit + the whole channel P&L |
| The Line-Up | Every channel side by side, ranked on profit after freight |
| The Range | The whole portfolio on one till roll, gross to net |
| The Rate Card | Every fee default, dated and sourced — the trust backbone |

## Documentation map

| File | What it holds |
|---|---|
| [CLAUDE.md](./CLAUDE.md) | Architecture, conventions, where everything lives — read first when developing |
| [BRAND.md](./BRAND.md) | The brand system: voice, colours, type, layout rules, copy bans |
| [PROGRESS.md](./PROGRESS.md) | The full build log, sprint by sprint |
| [MARKETING.md](./MARKETING.md) | Strategy: funnel, The Ledger plan, channels, monetisation sequence |
| [SETUP_SUPABASE.md](./SETUP_SUPABASE.md) | One-off cloud setup (SQL + auth URLs) |

## Development

```bash
npm install
npm run dev        # dev server at localhost:5173
npm test           # the maths regression suite (27 tests, hand-computed)
npx tsc --noEmit   # type-check
npm run build      # tsc + tests + vite build + prerender (SEO pages + sitemap)
npm run gen:og     # regenerate the static OG share cards (needs Chromium; commit output)
node scripts/gen-carousel.mjs  # regenerate the social carousels (3 designs)
```

The build **fails** if a formula regression breaks a test or if the SEO
prerender can't parse the page registry — both on purpose.

## The two golden rules

1. **The maths is sacred.** All calculation logic lives in
   `src/utils/calculations.ts` as pure functions, locked by
   `calculations.test.ts` with hand-computed expected values. If a change fails
   a test, the change is wrong. The humour lives in the frame only.
2. **The free promise is forever.** The calculators and the Excel deck are
   free, no sign-up. Monetisation (see MARKETING.md) sells the frame — never
   the calculation.

## Tech stack

- **Vite + React 19 + TypeScript** · **Tailwind CSS v4** (tokens in `src/index.css`)
- **Zustand** — in-memory state; the URL is the persistence (`?s=` share blob)
- **exceljs** (lazy chunk) — the formula-live Excel deck
- **Supabase** — auth, synced archive, union sign-ups, anonymous events (all fail-soft)
- **Vercel** — hosting, clean URLs, SPA fallback
- **vitest** — the maths regression suite
- Fonts self-hosted (Anton, Space Mono, Inter) — no third-party runtime calls

## Structure

```
src/
  calculators/   the eleven tools (lazy chunks)
  pages/         Home, The Shelf, The Rate Card
  components/gross/  the design system (Receipt, CalcShell, Field, ChannelPlan…)
  store/         useStore (products), scenario (all settings), cloud, archive
  utils/         calculations.ts (SACRED) + tests, excelExport, urlState, routeMeta
  config/        pages (route registry), fees (dated defaults), benchmarks, supabase
scripts/         prerender (SEO), gen-og (share cards), gen-carousel (social)
marketing/       carousel assets (3 designs × 10 slides + LinkedIn PDFs)
public/          fonts, OG cards, robots.txt
```
