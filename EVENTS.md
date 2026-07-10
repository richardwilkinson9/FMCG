# The event taxonomy

The anti-drift contract for GROSS.'s anonymous analytics. Every event is fired
through **`logEvent(name, slug)`** (`src/utils/analytics.ts`), which lazy-loads
`src/store/cloud.ts` and inserts one `{ name, slug }` row into the Supabase
`events` table. Cookieless, no PII, fire-and-forget, insert-only, never awaited,
never throws — "This is a website."

**This document is canonical.** If you add, rename, or move an event, update this
table *and* `e2e/events.spec.ts` in the same commit. The spec asserts the exact
trail of each journey and rejects any event name not listed here, so silent
drift (Workstream 7) fails CI.

## Slug convention

For all in-app events the **slug is the active calculator's page id** — the
stable `id` from `src/config/pages.ts` (e.g. `min-margin`, `retailer-pnl`,
`products`, `home`), **not** the URL slug (`the-floor`, `the-pnl`, `the-shelf`).
The exceptions are called out below (`union`, `shortlink_open`, `client_error`).

## The nine events

| Event | Fires when | Slug | Source | Asserted by (`events.spec.ts`) |
|---|---|---|---|---|
| `view` | The active calculator changes — including the initial mount. Loading `/` emits `view:home`; navigating to a tool emits a second `view` for that tool. | page id of the view | `src/App.tsx` ~L179 (effect on `activeCalculator`) | *loading a calculator route emits view* → `['view:home','view:min-margin']` |
| `share` | "Copy share link" is clicked. Fires synchronously inside the click, **before** the short-link cloud call — so it is independent of Supabase. | page id of the current tool | `src/components/gross/CalcShell.tsx` ~L108 (`copyLink`) | *copy share link emits share* → `['share:min-margin']` |
| `export` | The Excel deck finishes building and downloads (`downloadExcelModel` resolves). | page id of the current tool | `CalcShell.tsx` ~L129 (`runExport`) | *export with an email on file emits a lone export* → `['export:min-margin']`; also the tail of the gate journey |
| `export_email` | The once-per-browser export email gate is submitted with a valid address. Fires **before** the export runs, so the gated flow emits `export_email` then `export`. | page id of the current tool | `CalcShell.tsx` ~L154 (`submitEmailAndExport`) | *the email-gate export emits export_email then export* → `['export_email:min-margin','export:min-margin']` |
| `import` | An uploaded `.xlsx` deck is read back successfully and its model is applied to the store. | `products` (always — upload lives on The Shelf) | `src/pages/Shelf.tsx` ~L83 (`uploadDeck`) | *uploading a deck emits import* → `['import:products']` |
| `receipt_image` | "Save the receipt as an image" renders the `.print-block` to PNG and the download anchor is clicked. | page id of the current tool | `CalcShell.tsx` ~L174 (`saveReceiptImage`) | *save-receipt-as-image emits receipt_image* → `['receipt_image:min-margin']` |
| `union` | A Union sign-up **succeeds** (`unionSignup` returns `ok`). Gated on success — a failed/aborted sign-up emits nothing. | `''` from the homepage form (`Home.tsx`); `'the-ledger'` from the Ledger page (`Ledger.tsx`) | `src/pages/Home.tsx` ~L45 · `src/pages/Ledger.tsx` ~L24 | *a successful union sign-up emits union* → `['union:']` (homepage) |
| `shortlink_open` | A `/s/<id>` short link resolves to a stored blob on boot (`resolveShortLink` finds a row). Fires before the model is restored. | the short-link **id** | `src/store/cloud.ts` ~L246 (`resolveShortLink`) | *resolving a short link emits shortlink_open* → tail contains `shortlink_open:rat123` |
| `client_error` | A `window.onerror` or `unhandledrejection` fires at runtime. | `<release> <error message>`, whole thing sliced to 90 chars — `<release>` is the build's short commit SHA (`VERCEL_GIT_COMMIT_SHA` first 7, injected via Vite `define` as `__RELEASE__`), or `dev` locally, so the beacon says which deploy threw it | `src/main.tsx` ~L31 (`reportClientError`) | Not driven directly (see below); the drift sweep asserts it does **not** appear in a clean session |

## Journey trails at a glance

- **Load a tool:** `view:home` → `view:<pageId>`
- **Share:** `share:<pageId>`
- **Export (email on file):** `export:<pageId>`
- **Export (email gate):** `export_email:<pageId>` → `export:<pageId>`
- **Upload a deck:** `import:products`
- **Save receipt PNG:** `receipt_image:<pageId>`
- **Union sign-up (success):** `union:` (home) / `union:the-ledger` (Ledger)
- **Open a short link:** `shortlink_open:<id>` (then a `view` for the restored tool)

## How the tests capture events in-sandbox

Supabase (`tdaiskvfjtavxgdasefo.supabase.co`) and the live site are blocked by
the sandbox proxy. The other e2e specs `abort` the Supabase route to exercise
fail-soft paths; this spec instead **stubs** it (`stubSupabase` in
`events.spec.ts`):

1. A `context.route('https://*.supabase.co/**', …)` handler answers the CORS
   preflight (`OPTIONS` → `204` with `access-control-allow-*`), so the browser
   lets the real POST through.
2. Requests to `/rest/v1/events` have their JSON body parsed and the
   `{ name, slug }` recorded, then are fulfilled `201`.
3. Every other Supabase call (`union_signups`, `share_links`, `models`, stats)
   is fulfilled `2xx` so the app's **success** branches run — this is what lets
   `union` and `shortlink_open` fire at all (both are gated on a cloud success
   that never happens under a plain abort).
4. `share_links` `GET` optionally returns a captured share blob so
   `resolveShortLink` finds a row and emits `shortlink_open`.

Each assertion snapshots the captured-events length *before* the action under
test, polls the tail until it equals the expected trail, then holds ~700 ms and
re-asserts — so a **late, unexpected** event still fails. Timings are tolerant
because `logEvent` is fire-and-forget (lazy `import()` + async insert).

## Known gaps / notes

- **`client_error` is not positively asserted.** Triggering a genuine
  `window.onerror` / `unhandledrejection` would require injecting a runtime
  fault into `src/`, which is out of scope for a black-box journey suite. It is
  covered *negatively*: the drift-sweep test asserts a clean multi-step session
  emits **no** `client_error`. Its shape (name + release-prefixed,
  truncated-message slug) is documented above from `src/main.tsx`. The release
  prefix is fail-soft: a missing `__RELEASE__` falls back to `dev` and never
  throws.
- **`union` and `shortlink_open` require the cloud to succeed.** Under real
  sandbox conditions (Supabase blocked) `union` never fires from a failed
  sign-up and `shortlink_open` never fires from a dead link — both fail soft.
  The tests stub a `2xx` specifically to prove the success-path event. This is a
  deliberate divergence from the abort-based specs, documented here so it isn't
  mistaken for drift.
- **Slug is the page id, not the URL slug.** `view:min-margin` (not
  `view:the-floor`). If you ever change what `activeCalculator` carries, both the
  events and this table move together.
