# FMCG Maths

Free commercial calculators for UK FMCG brand teams. Define a product once, and every calculator reads from it — no more re-entering cost price, case size or RRP in every spreadsheet.

## Calculators

1. **Retailer P&L / Margin Builder** — margin waterfall from cost price and RRP
2. **Minimum Margin Calculator** — solve backwards for the cost price or RRP that hits your target margins
3. **Retailer Listing Model** — project revenue, volume and gross margin across a store estate
4. **Trade Spend ROI** — how much incremental volume to break even on a trade investment
5. **Stock Forecast** — units to produce/hold, with a reorder point
6. **Amazon FBA Margin** — true margin after referral, fulfilment and storage fees
7. **TikTok Shop Margin** — true margin after platform commission, affiliate fees and charges
8. **Cross-Channel Comparison** — side-by-side net margin across Grocery, Amazon and TikTok

## Local development

```bash
# Install dependencies
npm install

# Start the dev server (opens at http://localhost:5173)
npm run dev

# Type-check
npx tsc --noEmit

# Production build
npm run build
```

## Deploying on Vercel

1. Push this repository to GitHub.
2. Go to [vercel.com](https://vercel.com) and sign in with your GitHub account.
3. Click **Add New Project** and import this repository.
4. Vercel will auto-detect Vite. The defaults are correct:
   - **Framework Preset:** Vite
   - **Build Command:** `npm run build`
   - **Output Directory:** `dist`
5. Click **Deploy**. That's it — your site is live.

Every push to `main` will trigger a new deployment automatically.

## Architecture

See [CLAUDE.md](./CLAUDE.md) for full architecture documentation, conventions, and where to find things.

## Updating fee defaults

All marketplace and retailer fee defaults live in `src/config/fees.ts`. Each fee has a dated note — update the values and notes when rate cards change. Every fee is also editable in the UI, so users can override defaults for their specific situation.

## Tech stack

- **Vite** + **React** + **TypeScript** — fast dev, type-safe
- **Tailwind CSS** — utility-first styling
- **Zustand** — lightweight state management
- No backend — everything runs in the browser
- State shared via URL query string (no server needed)
