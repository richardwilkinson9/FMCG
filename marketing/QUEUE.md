# The posting queue — the approved archive

The Mon/Wed/Fri publishing routine reads this file. It posts an entry only
when BOTH are true: the entry's date is today, and its status is APPROVED.
Anything else — PENDING, BUILD, MANUAL, no entry for the day — is skipped,
never improvised. Missed slots stay missed (standing rule: never post two in
a day to catch up).

## Statuses

- `PENDING` — drafted, awaiting your approval. Edit the text freely.
- `APPROVED` — cleared to post. Bulk approve by changing PENDING → APPROVED,
  or tell the session "approve Q-001 to Q-009" / "approve all pending".
- `POSTED` — done; the post URN is recorded on the entry.
- `BUILD` — asset or copy doesn't exist yet. The routine skips it. Replace
  with real text/image and set PENDING when built.
- `MANUAL` — can't be posted by the connector (polls, reshares). Yours.
- `CUT` — dropped by the owner. Never posts; kept for the record.

One post per day, ever: if a date somehow has two entries, the first
APPROVED one wins and the rest stay put.

Low stock: whenever fewer than three APPROVED posts remain ahead of today,
the routine tells the owner it's time to bulk approve the next batch.

Dead image: if an entry's image URL isn't fetchable at post time, the
routine skips the post and tells the owner — it never posts image-less
or improvises a substitute.

Error-then-retry: a Zapier "Could not find entity" error can still have
published the post (it did on 13 Jul). Before any retry, the routine runs
the engagement read and checks the page for a post with identical text;
if one exists, treat the post as made and do not retry.

## Ground rules baked into every entry

- Target: company page Gross. (company_id 136074586) only.
- No links in the post body (owner's rule, Jul 2026). The connector cannot
  post a first comment either, so posts carry no links at all; the page
  About section carries the site link.
- Every number traces to the site or repo docs. The 45%/44.8% post is
  sourced from `src/config/ledger.ts` (Ledger 001).
- Reserved little-text-format characters are escaped at post time:
  parentheses, asterisks, and the rest of LinkedIn's reserved set
  ( ) * [ ] { } < > @ | ~ _ — keep them unescaped here; the routine
  escapes on the way out.
- Image URLs point at getgross.co.uk/linkedin/… (served from `public/`).
  They resolve only after this branch reaches production.

---

## Week 1

### Q-001
- date: 2026-07-13 (Mon 07:45 UK)
- item: DICTIONARY /04 — investment behind it
- image: https://getgross.co.uk/linkedin/dictionary/04-investment-behind-it.png
- status: POSTED (urn:li:share:7482345676249595904, 13 Jul 2026 07:45 UK)

```
'we'd need to see some investment behind it' — give us money.

at least know what the money buys you before you say yes.
```

### Q-002
- date: 2026-07-24 (Fri 08:30 UK) — was Wed 15 Jul; the 07:45 trigger never
  fired (infrastructure outage) and the slot passed, so it moved to the
  empty 24 Jul slot rather than posting in the evening. Owner may re-date.
- item: RECEIPT /01 — you bank 49p
- image: https://getgross.co.uk/linkedin/receipt/01-you-bank-49p.png
- status: APPROVED

```
a £1.50 bestseller, read like a till receipt.

VAT takes 25p. the retailer takes 44p. the factory takes 32p.
you bank 49p - before you pay your supplier, your transport, your promo, your trade spend. you're lucky if you're left with 10p.
```

### Q-003
- date: 2026-07-17 (Fri 08:30 UK)
- item: Teaser — 03-truism (margin is an opinion, cash is a fact)
- image: https://getgross.co.uk/linkedin/03-truism.png
- status: POSTED (urn:li:share:7483786271346130944, 17 Jul 2026 08:30 UK;
  the connector returned its cosmetic "Could not find entity" error but
  the duplicate check confirmed the post live — no retry made)

```
a listing can be all sunshine and sparkles on paper...and still put you underwater when the retailer pays in 60 days end of month, and your supplier wants paying in 30.
```

## Week 2

### Q-004
- date: 2026-07-20 (Mon 07:45 UK)
- item: DICTIONARY /05 — price-sensitive shopper
- image: https://getgross.co.uk/linkedin/dictionary/05-price-sensitive-shopper.png
- status: POSTED (urn:li:share:7484861367728975872, 20 Jul 2026 07:45 UK;
  cosmetic connector error again, dup-check confirmed live, no retry;
  first-comment link added by the page)

```
your buyer:

'our shopper is price-sensitive' — permanent promo. funded by you.
```

### Q-005
- date: 2026-07-22 (Wed 07:45 UK)
- item: NUMBER /01 — 48p. Cut by owner, 9 Jul 2026. Slot taken by Q-025.
- status: CUT

### Q-025
- date: 2026-07-22 (Wed 07:45 UK)
- item: INSIDER /01 — the origin story. Copy and image approved by owner
  9 Jul 2026. Pin it from the page UI after it posts, if wanted.
- image: https://getgross.co.uk/linkedin/pinned/03-type-only.png
- status: POSTED (urn:li:share:7485586512395460608, 22 Jul 2026 07:48 UK;
  first attempt bounced on the unescaped asterisk in "f*ck" — reserved
  in LinkedIn little-text-format; posted escaped, renders as written.
  First-comment link added by the page)

```
nobody runs GROSS.

it's maintained by a long-suffering FMCG veteran who's watched too many good brands f*ck up listings with bad maths. 

so the tools are free, and the working is always shown. if a number on the site is wrong, say so — it gets fixed and the fix gets dated.
```

### Q-006
- date: 2026-07-24 (Fri 08:30 UK)
- item: Plain-text — the 45% vs 44.8% story. Cut by owner, 9 Jul 2026.
  Slot taken by Q-026.
- status: CUT

### Q-026
- date: 2026-07-24 (Fri 08:30 UK)
- item: INSIDER /02 — who writes this. Cut by owner, 9 Jul 2026. Slot
  now taken by the re-dated Q-002.
- status: CUT

## Week 3

### Q-007
- date: 2026-07-27 (Mon 07:45 UK)
- item: DICTIONARY /06 — long-term play
- image: https://getgross.co.uk/linkedin/dictionary/06-long-term-play.png
- status: APPROVED

```
your buyer:

'we see this as a long-term play' - you fund year one. (and year two and year three)
```

### Q-008
- date: 2026-07-29 (Wed 07:45 UK)
- item: BAD DAY /01 — the plan vs the year
- image: https://getgross.co.uk/linkedin/badday/01-the-plan-vs-the-year.png
- status: PENDING

```
the plan said 4 a store a week and £25k.
the year said 2 a store a week and nothing.

same listing. same buyer. same margin. the only thing that changed was the forecast being wrong — which is the one thing forecasts are reliably good at.

stress-test the listing before you sign it. free, on the site.
```

### Q-009
- date: 2026-07-31 (Fri 08:30 UK)
- item: Teaser — 05-thirty-five (their 35% isn't your 35%)
- image: https://getgross.co.uk/linkedin/05-thirty-five.png
- status: PENDING

```
same number. two different bases. one of you is measuring off the wrong one, and it's usually not the person who wrote the terms.
```

## Week 4

### Q-010
- date: 2026-08-03 (Mon 07:45 UK)
- item: DICTIONARY /07 — we'll trial it
- image: https://getgross.co.uk/linkedin/dictionary/07-we-will-trial-it.png
- status: PENDING

```
your buyer:

'we'll trial it' — four stores. bottom shelf. January.
```

### Q-011
- date: 2026-08-05 (Wed 07:45 UK)
- item: Guide launch post — retailer-margin guide. Caption is written on the
  day per the calendar. If the guide ships in time, approve this and leave
  Q-027 pending for a later slot.
- image: none yet
- status: BUILD

### Q-027
- date: 2026-08-05 (Wed 07:45 UK)
- item: INSIDER /03 — why no name (anonymity as the feature). Copy approved
  by owner 9 Jul 2026 (exclamation marks are the owner's deliberate
  exception to the house rule); image is the org-chart card, re-rendered
  9 Jul without the rat box and the job-title line, owner approved.
  Fallback for this slot if the guide post isn't built.
- image: https://getgross.co.uk/linkedin/pinned/04-org-chart.png
- status: APPROVED

```
why there's no name on the site: the person who maintains it still sits in the meetings the calculators are for.

anonymity keeps the candour. oooo secretive!! 
```

### Q-012
- date: 2026-08-07 (Fri 08:30 UK)
- item: Poll — "your buyer's favourite sentence?" The connector cannot
  create polls; post it by hand from the page.
- status: MANUAL

## Week 5

### Q-013
- date: 2026-08-10 (Mon 07:45 UK)
- item: DICTIONARY /08 — behind it in H2
- image: https://getgross.co.uk/linkedin/dictionary/08-behind-it-in-h2.png
- status: PENDING

```
your buyer:

'we'll get behind it in H2' — we won't.
```

### Q-014
- date: 2026-08-12 (Wed 07:45 UK)
- item: RECEIPT /02 — Amazon FBA receipt (the 40% take). Asset not built.
- status: BUILD

### Q-015
- date: 2026-08-14 (Fri 08:30 UK)
- item: Reshare best performer of weeks 1–4 with one new line. Needs the
  analytics read and a reshare, which the connector can't do.
- status: MANUAL

## Week 6

### Q-016
- date: 2026-08-17 (Mon 07:45 UK)
- item: Dictionary — new batch (pick 3 from the bench). Not built.
- status: BUILD

### Q-017
- date: 2026-08-19 (Wed 07:45 UK)
- item: Ledger 002 goes out → its NUMBER card. Not built.
- status: BUILD

### Q-018
- date: 2026-08-21 (Fri 08:30 UK)
- item: Plain-text — reader question + deadpan answer. Not written.
- status: BUILD

## Week 7

### Q-019
- date: 2026-08-24 (Mon 07:45 UK)
- item: Dictionary (from the week 6 batch). Not built.
- status: BUILD

### Q-020
- date: 2026-08-26 (Wed 07:45 UK)
- item: BAD DAY /02 — promo edition (uplift promised vs uplift delivered).
  Not built.
- status: BUILD

### Q-021
- date: 2026-08-28 (Fri 08:30 UK)
- item: Teaser — 01-provocation (do you actually know…)
- image: https://getgross.co.uk/linkedin/01-provocation.png
- status: PENDING

```
most brand teams know their margin to one decimal place and the retailer's to none. the buyer knows both.
```

## Week 8

### Q-022
- date: 2026-08-31 (Mon 07:45 UK)
- item: Dictionary (from the week 6 batch). Not built.
- status: BUILD

### Q-023
- date: 2026-09-02 (Wed 07:45 UK)
- item: Guide launch post — gross-to-net. Not built.
- status: BUILD

### Q-024
- date: 2026-09-04 (Fri 08:30 UK)
- item: Recap — "8 weeks of translations" carousel (existing carousel
  pipeline). Document post; likely MANUAL — the connector posts single
  images, not PDFs. Confirm nearer the date.
- status: BUILD
