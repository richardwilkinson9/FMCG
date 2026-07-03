# FMCG Maths — Architecture & Conventions

## What is this?
A single-page web app hosting linked commercial calculators for UK FMCG brand teams. Built with Vite + React + TypeScript + Tailwind CSS. Deploys on Vercel.

## Core design principle: Shared Product Spine + Shared Scenario
- A **Product** is defined ONCE and every calculator reads from it. Type in `src/types/product.ts`.
- All **calculator settings** (retailer margin, wholesaler, store counts, Amazon dimensions, TikTok category…) live in a single `Scenario` object in the store — NOT component state. This means settings survive tab switches, the Cross-Channel view reads the exact same fees as the individual tabs, and share URLs capture the complete model.
- Do not put calculator settings in `useState` — add a field to the relevant `Scenario` section in `src/store/scenario.ts` instead.

## Project structure
```
src/
  types/product.ts          — Product interface, CategoryTemplate type
  config/fees.ts            — ALL fee defaults (Amazon, TikTok, Grocery, VAT) with dated notes
  config/templates.ts       — Category templates (confectionery, drinks, snacks, etc.)
  store/scenario.ts         — Scenario types, defaults, merge (for old URLs), effective-fee resolvers
  store/useStore.ts         — Zustand store: products[], activeProductId, activeCalculator, scenario
  utils/calculations.ts     — Pure functions: all commercial maths (margin, P&L, weekly
                              projection, stock ledger, etc.)
  utils/urlState.ts         — Encode/decode app state (incl. scenario) to/from URL for sharing
  utils/export.ts           — Flat CSV builder (product + assumptions + results + weekly rows)
  utils/excelExport.ts      — Excel MODEL builder (exceljs, dynamically imported): named
                              assumption cells + formula-driven sheets that recalculate in Excel
  components/
    NumberInput.tsx         — THE number field. Free typing (no zero-snap), £/% adornments,
                              proper label association, disabled+note mode. Use this, never a raw input.
    FeeInput.tsx            — NumberInput wrapper bound to a FeeDefault (label + tooltip from config)
    GroceryChainSettings.tsx— Shared retailer-margin + wholesaler controls, bound to the store
    ProductManager, Tooltip, ResultCard, ShareExport
  calculators/              — One file per calculator, all read product + scenario from the store
```

## The weekly spine
`weeklyProjection()` in calculations.ts is the single demand engine: the Listing Model
totals are summed from it, the Supply Plan (stockLedger) consumes its volumes, and the
Excel export rebuilds it as formulas. If you change phasing logic, change it there only.

## Excel model export
`utils/excelExport.ts` builds a real .xlsx via exceljs (dynamic import — never in the
main bundle). Design rules:
- Every input is a NAMED cell on the Assumptions sheet (RRP, RetailerMargin, Stores…).
- Every derived cell is a formula referencing those names, with a cached `result` so
  non-recalculating viewers still show numbers.
- The Stock Plan order column is plain editable values; arrivals/closing are formulas,
  so planners can override orders in Excel and the ledger recalculates.
- exceljs pins `uuid` via package.json `overrides` to clear an npm audit advisory.

## State management
- **Zustand** — chosen over Context for selective subscriptions (less re-rendering) and simpler API.
- State is in-memory. No localStorage. Shareable via URL query string (`?s=<base64>`), which encodes products **and** the full scenario. Old links without a scenario decode against defaults (see `mergeScenario`).

## Fee config
All editable fee defaults live in `src/config/fees.ts`. Each has a `label`, `value`, and `note` (tooltip). Update this one file when rate cards change. Also contains:
- `AMAZON_SIZE_TIERS` — UK FBA fulfilment fee by size/weight tier (used by the fee estimator)
- `AMAZON_CATEGORY_FEES` — referral fee % by Amazon category
- `TIKTOK_CATEGORY_FEES` — platform commission % by TikTok Shop category

When an estimator is ON, the derived fee inputs render disabled with a "set by … above" note — resolution happens in `effectiveAmazonFees` / `effectiveTikTokFees` in `store/scenario.ts` (no useEffect syncing).

## Wholesaler support
All grocery calculators (P&L, Min Margin, Listing Model, Trade Spend, Cross-Channel) support an optional wholesaler in the chain, configured once via `GroceryChainSettings`. When enabled, the wholesaler takes a margin on the retailer's buy price, reducing the brand's net revenue. Default 25%, editable.

## Conventions
- British English throughout the UI ("optimise", "programme", £ not $).
- Every fee is an editable input, never hardcoded logic.
- Percentages are stored as decimals (0.35) everywhere; only the UI converts to/from "35".
- Pure calculation functions in `utils/calculations.ts` — no side effects.
- Money formatting via `formatGBP` (thousands separators); never `toFixed` directly in the UI.
- Guard degenerate inputs (margins ≥ 100%, promo weeks > period) with amber warning boxes rather than rendering Infinity/negative nonsense.
- Accessibility: labels associated via htmlFor/id (NumberInput does this), tooltips keyboard-focusable, `scope` on table headers, `aria-current` on active tabs.
- Print: "Export PDF" = `window.print()`. Mark screen-only chrome with `.no-print`; keep result cards whole with `.print-block` (styles in `index.css`).

## Commands
- `npm run dev` — start dev server
- `npm run build` — production build (runs tsc then vite build)
- `npx tsc --noEmit` — type-check without building
