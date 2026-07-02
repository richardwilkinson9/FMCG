# FMCG Maths — Progress

## Done
- [x] Scaffolded Vite + React + TypeScript + Tailwind CSS project
- [x] Product spine: type definition, Zustand store, ProductManager UI
- [x] Category templates (6 categories: Confectionery, Soft Drinks, Snacks, Ambient, Health, Beauty)
- [x] Fee config file with dated defaults (Amazon FBA, TikTok Shop, UK Grocery, VAT)
- [x] Calculator 1: Retailer P&L / Margin Builder
- [x] Calculator 2: Minimum Margin Calculator (solve for cost price or RRP)
- [x] Calculator 3: Retailer Listing Model (revenue/volume/margin projection)
- [x] Calculator 4: Trade Spend ROI (break-even and target ROI)
- [x] Calculator 5: Stock Forecast (units to hold, reorder point)
- [x] Calculator 6: Amazon FBA Margin Calculator
- [x] Calculator 7: TikTok Shop Margin Calculator
- [x] Calculator 8: Cross-Channel Comparison (side-by-side table + bar chart)
- [x] URL state encoding/decoding for shareable links
- [x] Share via link button (copies URL to clipboard)
- [x] CSV export
- [x] PDF export stub (points to browser print-to-PDF)
- [x] Tooltip component for fee notes
- [x] Production build passing (tsc + vite)
- [x] CLAUDE.md and PROGRESS.md created
- [x] README.md with dev instructions and Vercel deployment guide
- [x] **Wholesaler margin** — optional wholesaler in the grocery chain (default 25%, editable). Affects Retailer P&L, Min Margin, Listing Model, Trade Spend ROI, and Cross-Channel.
- [x] **Amazon FBA fee estimator** — enter product weight, dimensions, and category to auto-calculate fulfilment fee (size-tier lookup) and referral rate (category lookup). Still fully overridable.
- [x] **TikTok Shop category selector** — pick your category to auto-set the correct platform commission (5% for Beauty/Electronics, 9% for most others). Still fully overridable.
- [x] Amazon category referral fee table (14 categories) and TikTok category commission table (10 categories) in fees.ts
- [x] Amazon UK FBA size-tier table (8 tiers from small envelope to large oversize) in fees.ts

## UX sprint (July 2026) — making the current site friendly, not adding features
- [x] **Scenario moved into the store** — all calculator settings (margins, wholesaler, stores, Amazon dims, TikTok category…) now persist across tab switches instead of resetting
- [x] **Share URLs now capture the full model** — products AND every calculator setting AND the active tab; old links still work via default-merging
- [x] **Cross-Channel now reads the same fees as the tabs** — duplicated fee inputs removed; grocery chain editable inline, Amazon/TikTok shown as a summary with jump-to-tab links
- [x] **NumberInput component** — free typing without the clear-to-zero snap, £/% symbols inside the field, labels properly associated with inputs
- [x] VAT entered as a percentage with one-click presets (20% / 5% / 0% zero-rated)
- [x] Thousands separators on all £ figures (£682,500.00 not £682500.00)
- [x] Sanity warnings replace nonsense outputs (margins ≥100%, promo weeks > period, zero-margin trade spend, loss-making Amazon products get an explanation)
- [x] Full-scenario CSV export — product + assumptions + results from every calculator (was: 6 product fields only)
- [x] Export PDF now actually prints (window.print + print stylesheet: no buttons/nav, cards don't split across pages)
- [x] "Duplicate to compare scenarios" button on products (current vs proposed pricing)
- [x] Accessibility: keyboard-focusable tooltips, table header scopes, aria-current on tabs, associated labels throughout
- [x] Explanatory subtext on key result cards ("Net revenue less COGS" etc.)
- [x] Email-capture stub appears after export (client-side only, as specced)
- [x] Meta description + proper page title for sharing/SEO
- [x] Verified end-to-end with browser automation: tab-switch persistence, free typing, URL round-trip, print view

## Next
- [ ] Verify all calculation logic with real-world examples
- [ ] Potentially add more category templates
- [ ] Consider a proper branded PDF (jsPDF) if print-to-PDF proves insufficient

## Open decisions
- PDF generation: currently stubbed (suggests browser print). Could add jsPDF or similar if a proper branded export is needed — adds ~100KB to the bundle.
- Email capture: stubbed in the UI. Needs a backend service (e.g. a simple Vercel serverless function + email provider) when ready.
- Amazon/TikTok live fee lookup: no free public API exists for barcode-based fee lookups. Current approach uses published fee schedules with product dimensions/weight/category. A future enhancement could integrate with Amazon SP-API if the user has seller credentials.
