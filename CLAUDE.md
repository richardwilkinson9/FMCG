# FMCG Maths — Architecture & Conventions

## What is this?
A single-page web app hosting linked commercial calculators for UK FMCG brand teams. Built with Vite + React + TypeScript + Tailwind CSS. Deploys on Vercel.

## Core design principle: Shared Product Spine
A Product is defined ONCE and every calculator reads from it. The Product type lives in `src/types/product.ts`. Users can create multiple products and switch between them.

## Project structure
```
src/
  types/product.ts        — Product interface, CategoryTemplate type
  config/fees.ts          — ALL fee defaults (Amazon, TikTok, Grocery, VAT) with dated notes
  config/templates.ts     — Category templates (confectionery, drinks, snacks, etc.)
  store/useStore.ts       — Zustand store: products[], activeProductId, activeCalculator
  utils/calculations.ts   — Pure functions: all commercial maths (margin, P&L, stock, etc.)
  utils/urlState.ts       — Encode/decode app state to/from URL for sharing
  components/             — Shared UI: ProductManager, Tooltip, FeeInput, ResultCard, ShareExport
  calculators/            — One file per calculator, all read from the shared store
```

## State management
- **Zustand** — chosen over Context for selective subscriptions (less re-rendering) and simpler API.
- State is in-memory. No localStorage. Shareable via URL query string (`?s=<base64>`).

## Fee config
All editable fee defaults live in `src/config/fees.ts`. Each has a `label`, `value`, and `note` (tooltip). Update this one file when rate cards change.

## Conventions
- British English throughout the UI ("optimise", "programme", £ not $).
- Every fee is an editable input, never hardcoded logic.
- Pure calculation functions in `utils/calculations.ts` — no side effects.
- Each calculator is a self-contained component reading from the Zustand store.

## Commands
- `npm run dev` — start dev server
- `npm run build` — production build (runs tsc then vite build)
- `npx tsc --noEmit` — type-check without building
