# GROSS. — Architecture & Conventions

*Docs map: [README.md](./README.md) = status + front door · [BRAND.md](./BRAND.md)
= the full brand system (voice, colour, type, canon strings) · [PROGRESS.md](./PROGRESS.md)
= build log · [MARKETING.md](./MARKETING.md) = strategy.*

## What is this?
**GROSS.** ("Do the gross maths.") — free commercial calculators for UK FMCG brand teams.
A single-page web app: a brutalist homepage plus nine linked calculators. Built with
Vite + React + TypeScript + Tailwind CSS (v4, tokens via `@theme` in `src/index.css`).
Deploys on Vercel.

## The golden rule (from the brand handover)
**The maths is sacred. The humour lives in the frame only.** Never change a formula,
rounding rule, or any wording that explains the maths. All calculation logic lives in
`src/utils/calculations.ts` as pure functions and is reused unchanged by every skin.

## Core design principle: Shared Product Spine + Shared Scenario
- A **Product** is defined ONCE and every calculator reads/edits it inline. Type in `src/types/product.ts`.
- All **calculator settings** (chain margins, trade spend, listing shape, supply, Amazon, TikTok)
  live in a single `Scenario` object in the store — NOT component state. Settings survive page
  switches, The Line-Up reads the exact same fees as the marketplace pages, and share URLs
  capture the complete model. Add fields to `src/store/scenario.ts`, never to `useState`.

## Brand pages → maths (ids are stable so old share links work)
| GROSS page | id | Component | Maths |
|---|---|---|---|
| The P&L | `retailer-pnl` | `RetailerPnL.tsx` | `retailerPnL()` |
| The Waterfall | `waterfall` | `Waterfall.tsx` | `retailerPnL().brandNetRevenue` + deduction %s (`scenario.waterfall`) |
| The Floor | `min-margin` | `MinimumMargin.tsx` | `solveForCostPrice()` / `solveForRrp()` |
| The Listing | `listing-model` | `ListingModel.tsx` | `listingModel()` / `weeklyProjection()` |
| The Payback | `trade-spend` | `TradeSpendROI.tsx` | `tradeSpendROI()` |
| The Stock Answer | `stock-forecast` | `StockForecast.tsx` | `stockLedger()` (horizon: `scenario.stock.planWeeks`) |
| The Amazon Cut | `amazon-fba` | `AmazonFBA.tsx` | `amazonFBAMargin()` + `estimateAmazonFBAFee()` + plan/units amortisation |
| The TikTok Cut | `tiktok-shop` | `TikTokShop.tsx` | `tiktokShopMargin()` |
| The Line-Up | `cross-channel` | `CrossChannel.tsx` | `crossChannelComparison()` |
| (unrouted) | — | `Portfolio.tsx` | kept in repo; not in the GROSS card set — awaiting a brand decision |

## Design tokens (never invent new colours or a fourth typeface)
- Colours (in `@theme`, `src/index.css`): `bile #C6F215`, `ink #0A0A0A`, `receipt #F7F5EF`,
  `reduced #FFD400` (max ONE element per page), `redpen #E4002B` (negatives/errors only).
- Fonts: Anton (display), Space Mono (**every numeral**), Inter (body) — self-hosted in
  `public/fonts/` (latin subsets), no third-party runtime dependency.
- `border-radius: 0` globally (only the circular sticker overrides with `!rounded-full`).
  All borders 2px Ink. No gradients, shadows, or photography. British English, sentence case,
  no exclamation marks, no emoji. Green and yellow never touch without a 2px Ink rule.

## Brand components (`src/components/gross/`)
- `Ticker` — marquee strip (pauses on hover; static under `prefers-reduced-motion`)
- `GrossNav`, `GrossFooter`, `Barcode`, `LedgerRat` (mascot SVG, `currentColor`, marginal use only)
- `CalcShell` — the shared calculator template: bile header band (SKU eyebrow, Anton title,
  best-before stamp), inputs-left / receipt-right split (stacks < 901px), rat empty state
  ("No product yet." — one line only), footer. `CalcActions` = Copy share link + Export
  (Export = the Excel model via `excelExport.ts`).
- `Receipt` + `RLine`/`RSection`/`Rule`/`AnswerBlock` — the till receipt with dashed
  tear-lines, health traffic-lights, inverted Ink answer block, deadpan verdict, and the
  fixed footer "VAT number: not applicable. This is a website."
- `Field`/`TextField`/`MonoToggle`/`InputSection` — 52px inputs, 2px Ink border, £/% affix
  boxes, Space Mono values; free typing (string buffer, commit-on-valid-parse).

## The weekly spine
`weeklyProjection()` in calculations.ts is the single demand engine: The Listing sums it,
The Stock Answer (stockLedger) consumes its promo shape, and the Excel export rebuilds it
as formulas. If you change phasing logic, change it there only.

## The promo calendar (multi-promo model)
`scenario.listing.promos` is an array of up to six `Promo` windows (start week, length,
mechanic label, `discount`, `uplift`, `supplierFunded`). Mechanic presets live in
`PROMO_MECHANICS` (scenario.ts); `suggestPromoTiming()` spreads promos evenly. Gross-to-net
convention: GSV = volume × list price (invoice, never moves); a supplier-funded promo
deducts `GSV × discount` off invoice (retailer keeps their margin %); NSV = GSV − funding;
GM = NSV − COGS. Weekly rows carry gsv/funding/nsv; helpers `promoUpliftForWeek` /
`promoFundingRateForWeek` are the only way to read the calendar. In the Excel deck the six
slots are named column ranges (PromoStarts/PromoLens/PromoUplifts/PromoDiscs/PromoFunded)
consumed by SUMPRODUCT — overlapping promos stack in both engines. Old share links with
the single-promo fields (promoStartWeek/promoWeeks/promoUplift) are migrated in
`mergeScenario`. Full-year marketplace P&L: `amazonAnnualPnL` / `tiktokAnnualPnL` read
`scenario.amazon.casesPerYear` / `scenario.tiktok.casesPerYear` (named cells AmzCasesYear /
TtkCasesYear in the deck); NSV always shown as % of GSV, GM as % of NSV.

## Excel model export
`utils/excelExport.ts` builds a real .xlsx via exceljs (dynamic import — never in the
main bundle). Branded as "the GROSS deck": Ink/Bile cover, receipt-styled sheets, answer
blocks as inverted Ink rows, conditional formatting for promo weeks and stockouts. Every
input is a NAMED cell on the Assumptions sheet; every derived cell is a formula with a
cached result. The Stock Plan order column is plain editable values. Verdict sentences are
printed at export (numbers recalculate; sentences do not).
exceljs pins `uuid` via package.json `overrides` to clear an npm audit advisory.
`utils/export.ts` (flat CSV) is retained but currently unwired.

## Session & sign-in surfacing
`store/session.ts` — shared `useSession()` hook; loads the cloud layer lazily
on first use (Supabase stays out of the first paint), one subscription feeds
every consumer. Consumed by GrossNav (persistent SIGN IN / THE ARCHIVE button,
visible on mobile) and CalcShell's SaveStrip (the save/sign-in nudge under
every calculator's actions). Both land on The Shelf's `#archive` anchor.
CHANGE PRODUCT navigates to The Shelf — never clear the selection;
`getActiveProduct()` falls back to the first product so calculators can't
dead-end on the empty state while products exist.

## Cloud layer (Supabase)
`src/store/cloud.ts` — magic-link auth + the synced Archive + Union sign-ups.
Signed out, the Archive is localStorage (`src/store/archive.ts`); signed in it is
the `models` table (RLS per user), every save an INSERT so same-name saves build
version history. All calls are timeout-guarded and fail soft. Schema/policies in
SETUP_SUPABASE.md; the publishable key in `src/config/supabase.ts` is public by
design. Buyers (named term sets) live in `scenario.buyers` — arrays in the
scenario must REPLACE on merge (see updateScenario/mergeScenario).

## Routing, SEO & share cards
`src/config/pages.ts` is the single registry (id ↔ slug ↔ title/description/intro)
that drives client routing, the document `<title>`/meta/OG (`utils/routeMeta.ts`),
the crawlable `IntroLine` under each header, the sitemap, the per-route prerender
and the OG cards. Clean paths (`/the-payback`) coexist with the `?s=` blob: on load
the blob wins (full shared model), otherwise the path selects the tool
(`pageIdFromPath`). `encodeStateToUrl` writes `/<slug>?s=<blob>`. `scripts/prerender.mjs`
(runs in `npm run build`) writes `dist/<slug>/index.html` per route with correct
meta so JS-blind social scrapers get the right card, plus `sitemap.xml`.
`scripts/gen-og.mjs` (`npm run gen:og`) renders the static 1200×630 OG cards to
`public/og/` with Chromium — run once and commit; the Vercel build needs no browser.
`vercel.json` gives clean URLs + an SPA fallback. Adding a page = one entry in
`pages.ts` + the component in `App.tsx`'s PAGES.

## The Rate Card (methodology) & benchmarks
`src/pages/Methodology.tsx` (slug `the-rate-card`) lists every fee default, its
value, the date checked and its source — the trust backbone; the "check the rate
card" tags (`RateCardTag` in CalcShell) link to it. `src/config/benchmarks.ts` holds
indicative UK FMCG brand gross-margin RANGES by category (never point figures),
shown on The P&L against the product's optional `category`, with provenance on The
Rate Card. Benchmarks are explicitly not-sacred: broad, dated, editable.

## Anonymous analytics
`logEvent(name, slug)` in `store/cloud.ts` — cookieless, no PII, fire-and-forget,
insert-only into the Supabase `events` table. Wired to view (App), share/export
(CalcActions) and union sign-up (Home). Never awaited, never throws.

## State management
- **Zustand** — selective subscriptions, simple API. State is in-memory; no localStorage.
- The full model is debounce-synced into the address bar (replaceState in App.tsx), so a
  refresh restores everything and the URL is always the share link.
- Share URLs (`?s=<base64>`) encode products + full scenario + active page; old links
  decode against defaults (`mergeScenario`), unknown page ids fall back to home.

## Channels & the whole-range export
Each product carries optional `channels` (`src/types/product.ts`): per-channel
listed flags (`grocery`/`amazon`/`tiktok`, absent = listed) + per-SKU
`amazonCasesPerYear`/`tiktokCasesPerYear`. Helpers `channelListed`,
`skuCasesPerYear`, `amazonChannelPnL`, `tiktokChannelPnL` (calculations.ts)
aggregate the whole channel across listed SKUs — the Amazon selling plan is a
single channel cost (×12), charged once, not per SKU. `ChannelPlan.tsx` (THE
FULL CHANNEL) renders on The Amazon Cut / The TikTok Cut: toggle each SKU in/out,
edit its cases/year, see the whole-channel GSV→NSV→GM→after-logistics. The Range
has a grocery in/out checkbox per SKU (grocery totals count listed only). The
Excel deck's `downloadExcelModel(product, scenario, products)` adds a **The Range**
sheet: every product, editable 1/0 GROC/AMZ/TTK flags + cases/year, per-channel
values, and channel P&L totals via SUMPRODUCT over the flags (toggle in Excel →
totals follow). Per-SKU channel values on that sheet are a snapshot; the primary
SKU's sheets stay fully live.

## Inbound logistics & Amazon selling unit
Each channel carries an **inbound logistics** figure — freight to the customer's
DC/FC, £ per case, NOT the shopper's delivery: `grocery.logisticsPerCase`,
`amazon.logisticsPerCase`, `tiktok.logisticsPerCase`. It sits BELOW gross margin
(a distribution cost, never part of COGS or the sacred gross-margin formula):
components/deck add a "margin/contribution/profit after logistics" line via
`logisticsPerUnit(perCase, unitsPerCase)`. Shown on The P&L, Waterfall, Amazon,
TikTok, Line-Up (ranking is on profit-after-freight), Listing annual plan, The
Range, The Payback (break-even uses contribution after freight), and the deck
(named cells GroceryLogistics/AmzLogistics/TtkLogistics).
**Amazon selling unit**: `amazon.sellByCase` — one listing = one case, so
fulfilment/storage are charged per case and `effectiveAmazonFees(a, unitsPerCase)`
divides them per consumer unit (why cases win). `amazon.monthlyUnits` is throughput
in the selling unit; `amazonCasesPerYear()` derives cases/year from it (the deck's
AmzCasesYear); `amazonMonthlyUnits()` gives consumer units/month for the plan
amortisation. Every `effectiveAmazonFees` caller passes `product.unitsPerCase`.

## Routing history
`App.tsx` pushes a history entry on each in-app navigation (clean path) and a
`popstate` handler restores the tool from the entry, so browser Back stays inside
GROSS instead of leaving the site; the debounced replaceState re-adds the `?s=` blob.

## Fee config
All dated fee defaults in `src/config/fees.ts` (incl. `AMAZON_SIZE_TIERS`,
`AMAZON_CATEGORY_FEES`, `TIKTOK_CATEGORY_FEES`). Every fee is an editable input with a
"dated default — check the rate card" tag. Percentages stored as decimals everywhere;
only the UI converts.

## Voice (for any copy)
Deadpan, dry, blunt, British. Real FMCG jargon used correctly. Short sentences. The exact
verdict/health strings come from the design handover — don't paraphrase them. Banned:
empower, unlock, seamless, solution, journey, supercharge, elevate.

## The maths regression suite
`src/utils/calculations.test.ts` (vitest) locks every formula with HAND-COMPUTED
expected values and runs inside `npm run build`, so a formula regression cannot
deploy. If a change fails a test, the change is wrong — never "update the
expected value" without redoing the arithmetic on paper.

## Performance & crawlability
Calculator pages are lazy chunks (`lazy()` in App.tsx's PAGES; Home is eager);
analytics loads the cloud layer lazily (`utils/analytics.ts`) so Supabase stays
out of the first paint. `scripts/prerender.mjs` injects into each route's HTML:
static crawlable body content INSIDE #root (H1, description, internal-link mesh
— React replaces it on mount), JSON-LD (WebSite/Organization on home,
WebApplication + BreadcrumbList per tool), and writes sitemap.xml with lastmod.
It FAILS THE BUILD if the pages.ts parse looks wrong. Note: `vite preview` only
resolves prerendered routes with a trailing slash; Vercel's cleanUrls serves
them correctly without.

## Commands
- `npm run dev` — start dev server
- `npm run build` — production build (tsc, vitest, vite build, prerender)
- `npm test` — run the maths regression suite
- `npx tsc --noEmit` — type-check without building
