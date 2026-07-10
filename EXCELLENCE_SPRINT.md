# GROSS. — The overnight excellence sprint

*What 50 top engineers would leave behind after one night — no new features, no added
complexity, no dilution of the goal. July 2026. Machine-readable twin of
`marketing/GROSS-excellence-sprint.docx`.*

## The brief

The site does one thing: free, blunt, correct commercial maths for UK FMCG brand teams.
The sprint's only permitted outcome is that same site — faster, harder to break, provably
correct, usable by everyone, and observable — with zero new surface area. Any engineer
proposing a feature is reassigned to testing.

Teams are listed with their overnight deliverable and the acceptance test that proves it.
Everything is expressed so a team of one (plus an AI pair) can adopt it incrementally
afterwards — the sprint is a destination description, not a fantasy.

## Workstream 1 — Correctness (12 engineers)

The maths is the product; trust is the brand. Tonight it becomes provably right rather
than carefully right.

- **Independent re-implementation**: every formula in calculations.ts re-implemented from
  the written spec by an engineer who has never seen the code; outputs compared across
  10,000 generated scenarios. Any divergence is a defect in code or spec — both get fixed.
- **Property-based tests** alongside the hand-computed suite: invariants that must hold
  for all inputs (GM never exceeds NSV; solver round-trips are identities; monthly phasing
  always sums to the annual plan; cash totals equal accrual totals shifted in time).
- **Fuzzing the boundaries**: the share-blob decoder, short-link resolver and Excel
  importer each fuzzed for hours — malformed JSON, truncated base64, hostile spreadsheets.
  Every crash becomes a graceful rejection with a test.
- **Golden-file deck tests**: the exported Excel opened headlessly (LibreOffice) and
  recalculated; every formula cell must recompute to its cached value. The round-trip
  (export → edit → import) runs in CI with a canonical edit set.
- **Mutation testing** over calculations.ts: if a mutant survives the test suite, the
  suite gains a test.
- **External validation pack**: a one-page derivation of every formula, reviewed by two
  FMCG finance practitioners; their sign-off (and any dissent) published on The Rate Card.

**Definition of done**: zero divergences across implementations; mutation score >95% on
the maths; importer/decoder fuzz-clean for 4+ hours; CI enforces all of it.

## Workstream 2 — Performance (8 engineers)

- **Budgets set and enforced in CI**: LCP <1.5s on a mid-range phone over 4G; first-load
  JS <120KB gzipped; Lighthouse ≥95 on every route, checked per PR.
- **Font pipeline**: subset the three faces to the glyphs actually used (numerals + Latin
  basic), inline the critical subset, swap-in the rest. Typical saving: 60–70% of font
  bytes on first paint.
- **Chunk choreography**: prefetch the Excel engine on first receipt interaction (intent),
  not on click; guide/ledger chunks preloaded from their index pages; everything else
  stays lazy.
- **Edge caching audit**: correct immutable headers on hashed assets, HTML revalidation
  tuned, 404/redirect behaviour under Vercel's CDN verified.
- **Render hygiene**: the receipt re-render path profiled; any component re-rendering on
  unrelated keystrokes gets memoised — measured, not guessed.

**Definition of done**: budgets green in CI on a throttled device profile; a written perf
budget doc future changes are judged against.

## Workstream 3 — Reliability & resilience (7 engineers)

- **Failure drills**: Supabase down, Supabase slow, stale chunks after deploy,
  localStorage disabled, third-party script blocked. Each drill must end in a usable
  calculator — the site's core must never depend on the network beyond first load.
- **Cross-browser/device matrix in CI**: Playwright against Chromium, WebKit (Safari/iOS
  is the audience's phone), Firefox; iPhone SE and mid-Android profiles; the full route
  sweep plus the five golden user journeys (calculate, share, export, upload deck,
  sign up).
- **Visual regression suite**: pixel snapshots of every receipt at two widths; the brand
  is the pixels, so unintended pixel drift fails the build.
- **Deploy safety**: preview deploys per PR, one-click rollback runbook, uptime monitoring
  with a 5-minute alert, and a documented "site is down" checklist that fits on one screen.

**Definition of done**: every drill passes; the matrix runs on every PR in <10 minutes;
a rollback has been rehearsed, not just documented.

## Workstream 4 — Accessibility (5 engineers)

- **WCAG 2.2 AA across the board**: full keyboard operation of every calculator (including
  promo cards and tables), screen-reader-sensible receipts (the answer block reads as an
  answer, not a soup of spans), correct labels on every input including the £/% affixes.
- **Contrast verification** of every brand colour pairing in context; where bile-on-receipt
  fails for small text, weight or size fixes it — never a new colour.
- **Automated gate**: axe checks in CI on every route; manual screen-reader pass
  (VoiceOver + NVDA) recorded as a checklist that future changes re-run.

**Definition of done**: zero serious/critical axe violations; a blind user can run The P&L
end-to-end; reduced-motion honoured everywhere.

## Workstream 5 — Security & privacy (6 engineers)

- **Headers**: a strict Content-Security-Policy (self + Supabase + LinkedIn pixel, nothing
  else), HSTS, frame-ancestors none, referrer-policy tightened.
- **RLS pen-test**: every Supabase table and view attacked with the public key — attempt
  reads of the list, writes to others' models, enumeration of share links; findings fixed
  and re-tested. Rate-limiting on anonymous writes (events, share links) via edge rules.
- **Dependency audit**: lockfile reviewed, unused packages removed, the Excel library's
  advisory surface documented; update policy written.
- **Privacy decision made explicit**: the Insight Tag's PECR position documented; a
  one-line consent approach designed (on-brand, deadpan) and ready to enable the day it's
  wanted — decision recorded either way.

**Definition of done**: CSP live without breakage; pen-test log with zero open highs;
a security.txt and a disclosure inbox.

## Workstream 6 — SEO & structured data (4 engineers)

- **Validation matrix**: every route's JSON-LD through Google's validators; OG/Twitter
  cards rendered by the actual scrapers (LinkedIn Post Inspector included — it's the
  channel that matters).
- **Internal-link graph audit**: no orphan pages, guides ↔ tools ↔ Ledger fully meshed,
  anchor text varied and honest.
- **Crawl efficiency**: canonical correctness under cleanUrls, redirect chains flattened,
  sitemap lastmod strategy verified against actual change dates.

**Definition of done**: zero validation errors; a crawl of the site by a real crawler
with a clean report attached.

## Workstream 7 — Observability & data quality (4 engineers)

- **Event taxonomy hardened**: every event named, documented, and tested (a journey test
  asserts the exact event trail it should emit). No more silent analytics drift.
- **The Till upgraded in place**: same page, same look — now backed by tested views, with
  week-over-week deltas and a data-freshness stamp. Still owner-only, still noindexed.
- **Client error beacon** extended with release tagging (which deploy threw it) — still
  anonymous, still 90 characters, still fail-soft.

**Definition of done**: a dashboard the owner reads in 60 seconds; an alert if events
flatline (instrumentation death is invisible otherwise).

## Workstream 8 — Code health & CI (4 engineers)

- **Strictness maxed**: TypeScript strict flags all on; a banned-words check for copy
  files (the voice, enforced by machine); dead code eliminated; remaining any-shaped
  corners typed.
- **The pipeline**: typecheck → unit → property → e2e matrix → visual → axe → Lighthouse
  → build → prerender guards, all on every PR, all green before merge; main is always
  deployable.
- **Docs made load-bearing**: CLAUDE.md and the setup docs verified against reality by a
  fresh engineer following them cold; every drift fixed.

**Definition of done**: a new engineer ships a safe change in under an hour using only the
repo's own documentation.

## What we deliberately did NOT do

- No new calculators, pages, settings, themes, or modes. No redesign. No CMS, no accounts
  requirement, no framework migration, no microservices, no rewrite of the Excel engine
  "because we'd have done it differently."
- Nothing that adds a decision for the user. The site's power is that it does one thing
  bluntly; tonight made that one thing bulletproof.

## If you can only keep five things

The realistic adoption path for a team of one, in order:

1. Property-based tests + mutation testing on calculations.ts (Workstream 1) — the
   deepest trust win per hour.
2. The Playwright matrix with WebKit/iPhone profiles on the golden journeys
   (Workstream 3) — most of the audience reads this site on a phone, and it's currently
   only machine-tested on Chromium.
3. Font subsetting + CI Lighthouse budget (Workstream 2) — the biggest felt speed win
   remaining.
4. The CSP + RLS pen-test pass (Workstream 5) — an evening that removes whole classes of
   future incident.
5. The axe CI gate + receipt screen-reader pass (Workstream 4) — correctness for
   everyone, and it never regresses once gated.

This document describes outcomes and acceptance criteria only. Nothing in it changes what
the site is: free calculators, blunt voice, sacred maths.
