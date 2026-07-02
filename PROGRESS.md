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

## Next
- [ ] Visual polish: test in browser, responsive tweaks
- [ ] Verify all calculation logic with real-world examples
- [ ] Potentially add more category templates
- [ ] Wire up real PDF generation if needed
- [ ] Email capture stub on export

## Open decisions
- PDF generation: currently stubbed (suggests browser print). Could add jsPDF or similar if a proper branded export is needed — adds ~100KB to the bundle.
- Email capture: stubbed in the UI. Needs a backend service (e.g. a simple Vercel serverless function + email provider) when ready.
