# GROSS. — Architecture & Conventions

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

## Excel model export
`utils/excelExport.ts` builds a real .xlsx via exceljs (dynamic import — never in the
main bundle). Branded as "the GROSS deck": Ink/Bile cover, receipt-styled sheets, answer
blocks as inverted Ink rows, conditional formatting for promo weeks and stockouts. Every
input is a NAMED cell on the Assumptions sheet; every derived cell is a formula with a
cached result. The Stock Plan order column is plain editable values. Verdict sentences are
printed at export (numbers recalculate; sentences do not).
exceljs pins `uuid` via package.json `overrides` to clear an npm audit advisory.
`utils/export.ts` (flat CSV) is retained but currently unwired.

## State management
- **Zustand** — selective subscriptions, simple API. State is in-memory; no localStorage.
- The full model is debounce-synced into the address bar (replaceState in App.tsx), so a
  refresh restores everything and the URL is always the share link.
- Share URLs (`?s=<base64>`) encode products + full scenario + active page; old links
  decode against defaults (`mergeScenario`), unknown page ids fall back to home.

## Fee config
All dated fee defaults in `src/config/fees.ts` (incl. `AMAZON_SIZE_TIERS`,
`AMAZON_CATEGORY_FEES`, `TIKTOK_CATEGORY_FEES`). Every fee is an editable input with a
"dated default — check the rate card" tag. Percentages stored as decimals everywhere;
only the UI converts.

## Voice (for any copy)
Deadpan, dry, blunt, British. Real FMCG jargon used correctly. Short sentences. The exact
verdict/health strings come from the design handover — don't paraphrase them. Banned:
empower, unlock, seamless, solution, journey, supercharge, elevate.

## Commands
- `npm run dev` — start dev server
- `npm run build` — production build (runs tsc then vite build)
- `npx tsc --noEmit` — type-check without building
