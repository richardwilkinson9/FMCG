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

## Persona sprint (July 2026) — comprehensive without diluting simplicity
Approach: analysed the site as a wholesale sales exec, ecom exec, NAM, SNAM,
Commercial Director, CFO, founder and intern. Conclusion: they need different
DEPTHS of the same artefacts, not different tools.
- [x] **Week-by-week projection** in the Listing Model — promo placed at a chosen
      start week; volume/revenue/margin + cumulatives per week; clamp warning when
      the promo runs past the period (the NAM's phasing)
- [x] **Supply Plan** (replaces flat Stock Forecast) — weekly stock ledger driven by
      the Listing Model's demand incl. promo spikes; order-up-to policy in whole
      cases; stockout detection with unmet-demand counts (supply chain by SKU)
- [x] **Excel MODEL export** (.xlsx via exceljs, dynamically imported ~256KB gzip,
      main bundle unaffected) — Assumptions sheet with NAMED cells; Grocery P&L,
      Weekly Projection, Stock Plan and Channels sheets are formula-driven and
      recalculate when any assumption changes in Excel; stock orders are editable
      values (the CFO's manipulable model, not hard data)
- [x] **Portfolio tab** — all products side by side: per-channel margins, period
      volume/revenue/margin, totals row with blended margin (the SNAM/CD view)
- [x] **Amazon fixed costs** — £25/month plan amortised over expected monthly units;
      fully-loaded profit; break-even RRP card (the ecom exec's pricing floor)
- [x] CSV export extended with supply plan summary + weekly phasing rows
- [x] Verified: downloaded the generated .xlsx and confirmed named ranges, cross-sheet
      formulas and editable order column read back correctly

## GROSS rebrand (July 2026) — full design handover implemented
Recreated the "GROSS." brutalist design system from the handover bundle
(design_handoff_gross_rebrand) in the existing React/TS/Zustand codebase.
The maths was not touched — every formula still comes from calculations.ts.
- [x] Tokens (Bile/Ink/Receipt/Reduced/Red-Pen), Anton + Space Mono + Inter
      **self-hosted** in public/fonts (Google Fonts CDN dropped), radius-0 global
- [x] Brand primitives: Ticker (hover-pause, reduced-motion safe), Receipt with
      tear-lines + health traffic-lights + Ink answer block + fixed VAT footer,
      shelf-edge cards, best-before stamp, dated-default tags, Reduced-Yellow
      NEW sticker (one per page), barcode dividers, Ledger the Rat (verbatim SVG)
- [x] Homepage: hero, PRODUCTS→CALCULATORS→RECEIPT spine explainer, 9-card grid,
      Line-Up feature band with a LIVE receipt from the actual product spine,
      Union strip (client-side stub), full ink footer
- [x] All nine calculator pages on the shared CalcShell template (inputs left,
      live receipt right, stacks <901px, rat empty state, deadpan verdicts and
      health thresholds copied verbatim from the design logic)
- [x] **The Waterfall** — new gross-to-net view (promo funding / back margin /
      other trade as % of list) with the Ink/Yellow/Green split bar; new
      scenario.waterfall section; includes the wholesaler leg when enabled
- [x] The Stock Answer gained its own planning horizon (scenario.stock.planWeeks)
      while sharing the promo shape with The Listing
- [x] Copy share link (full state) and Export (Excel model) wired on every page
- [x] Old share links still decode; unknown page ids fall back to the homepage
- [x] Verified in-browser: all pages vs handover screenshots, share-link round
      trip, empty-state recovery, Export download, fonts, reduced-motion CSS

## Export + depth sprint (July 2026)
- [x] **Export rebuilt as the GROSS Excel deck** — branded cover (Ink/Bile,
      wordmark), styled Assumptions with named cells, receipt-styled sheets
      (The P&L, The Waterfall, Weekly Projection with live promo-week
      highlighting, Stock Plan with editable orders + red stockout rows,
      The Cuts, The Line-Up). All formulas live; verdict sentences printed
      at export. Fonts fall back to Arial Black / Courier New.
- [x] **URL auto-sync** — full model debounced into the address bar via
      replaceState: refresh never loses work, the URL is always the share
      link. Still no localStorage, by design.
- [x] Depth pass on every tool:
      P&L "IF THE BUYER PUSHES" sensitivity (+2.5/+5pts); Waterfall total
      trade-spend line; Floor margin/case at target; Listing retail sales
      value + cases/store/week (red under 0.5); Payback break-even as %
      uplift on the base over the promo window; Stock Answer "THE DIARY"
      (first + largest order, week and cases); Amazon & TikTok break-even
      sale prices; Line-Up per-channel break-even prices; Range period
      volume line; £ formatting fixed in the Listing loss verdict.
- [x] Homepage step-2 copy now says 11 tools.

## Reliability + The Archive (July 2026)
- [x] **Stale-tab export fix** — after a redeploy, old tabs hold purged lazy
      chunks so Export silently failed. Now: vite:preloadError triggers one
      automatic reload (model survives via the URL), and the Export button
      shows "Failed — refresh the page" instead of doing nothing.
- [x] **The Archive** — save the current model under a name on The Shelf;
      LOAD / BIN saved models; survives refresh (localStorage — the LIVE
      model still never touches storage). Records are versioned so they can
      sync to an account when log-in lands.

## Cloud sprint (July 2026)
- [x] **Log-in** — Supabase magic-link from The Shelf ("SIGN IN TO SYNC");
      publishable key ships in the bundle (safe by design), schema + RLS in
      SETUP_SUPABASE.md. All cloud calls timeout-guarded and fail soft.
- [x] **Synced Archive with version history** — signed in, every save is an
      INSERT to the models table; re-saving a name stacks versions ("N
      VERSIONS" chip). Local saves migrate to the account on first sign-in.
- [x] **THE AUDIT** — pick any two saves and get a receipt-style diff: per
      product (cost, RSP, ROS, margin/unit, margin %) and whole-model period
      margin, money-losing deltas in Red-Pen.
- [x] **The Union for real** — homepage sign-ups insert into union_signups
      (write-only via the public key; read the list in the dashboard).
- [x] **THE BUYERS** — save current terms (retailer margin, wholesaler,
      trade spend) as a named buyer on The P&L / The Waterfall; one chip
      click reprices every page. Fixed an array-corruption bug in
      updateScenario/mergeScenario found by the test suite.
- [ ] USER TO DO: run the SQL in SETUP_SUPABASE.md + set the auth redirect
      URLs — then sign-in and The Union go live.

## Next
- [ ] Verify all calculation logic with real-world examples
- [ ] Consider a proper branded PDF (jsPDF) if print proves insufficient
- [ ] Possible future: multiple promo windows per period (workaround: edit the
      promo flag column in the Excel export)

## Open decisions
- **The Portfolio** (multi-product table) was not in the GROSS card set. The
  component is kept in the repo but unrouted, per the handover's note to
  confirm with the user whether it gets a GROSS name/page.
- The homepage "Start with a product" button links to The Payback, exactly as
  in the design reference.
- PDF generation: currently stubbed (suggests browser print). Could add jsPDF or similar if a proper branded export is needed — adds ~100KB to the bundle.
- Email capture: stubbed in the UI. Needs a backend service (e.g. a simple Vercel serverless function + email provider) when ready.
- Amazon/TikTok live fee lookup: no free public API exists for barcode-based fee lookups. Current approach uses published fee schedules with product dimensions/weight/category. A future enhancement could integrate with Amazon SP-API if the user has seller credentials.
