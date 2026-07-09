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

## Ground rules baked into every entry

- Target: company page Gross. (company_id 136074586) only.
- The connector cannot post a first comment, so links sit in the post body
  as plain URLs with UTM tags (house rule fallback).
- Every number traces to the site or repo docs. The 45%/44.8% post is
  sourced from `src/config/ledger.ts` (Ledger 001).
- Parentheses in post text are escaped at post time per LinkedIn's
  little-text-format; keep them unescaped here.
- Image URLs point at getgross.co.uk/linkedin/… (served from `public/`).
  They resolve only after this branch reaches production.

---

## Week 1

### Q-001
- date: 2026-07-13 (Mon 07:45 UK)
- item: DICTIONARY /04 — investment behind it
- image: https://getgross.co.uk/linkedin/dictionary/04-investment-behind-it.png
- status: PENDING

```
your buyer:

'we'd need to see some investment behind it' — give us money.

at least know what the money does to the listing before you say yes.

what customer investment does to a listing, worked: https://getgross.co.uk/the-listing?utm_source=linkedin&utm_medium=organic&utm_campaign=dictionary-04
```

### Q-002
- date: 2026-07-15 (Wed 07:45 UK)
- item: RECEIPT /01 — you bank 49p
- image: https://getgross.co.uk/linkedin/receipt/01-you-bank-49p.png
- status: PENDING

```
a £1.50 bestseller, read like a till receipt.

VAT takes 25p. the retailer takes 44p. the factory takes 32p.
you bank 49p — and promo funding, freight and the buyer's next email all come out of that.

free calculators that read your numbers the same way: https://getgross.co.uk/the-pnl?utm_source=linkedin&utm_medium=organic&utm_campaign=receipt-01
```

### Q-003
- date: 2026-07-17 (Fri 08:30 UK)
- item: Teaser — 03-truism (margin is an opinion, cash is a fact)
- image: https://getgross.co.uk/linkedin/03-truism.png
- status: PENDING

```
a listing can be all margin on paper and still put you underwater — the retailer pays in 60 days, your supplier wants paying in 30.

the gap has a number. free tool: https://getgross.co.uk/the-wait?utm_source=linkedin&utm_medium=organic&utm_campaign=teaser-03-truism
```

## Week 2

### Q-004
- date: 2026-07-20 (Mon 07:45 UK)
- item: DICTIONARY /05 — price-sensitive shopper
- image: https://getgross.co.uk/linkedin/dictionary/05-price-sensitive-shopper.png
- status: PENDING

```
your buyer:

'our shopper is price-sensitive' — permanent promo. you fund it.

what a promo actually costs: https://getgross.co.uk/the-payback?utm_source=linkedin&utm_medium=organic&utm_campaign=dictionary-05
```

### Q-005
- date: 2026-07-22 (Wed 07:45 UK)
- item: NUMBER /01 — 48p. DEPENDENCY: Ledger 001 must be live on-site and
  emailed the same day (calendar week 2 anchor). If Ledger 001 slips, hold
  this at PENDING.
- image: https://getgross.co.uk/linkedin/number/01-forty-eight-p.png
- status: PENDING

```
48p.

the margin per unit that survives a halved rate of sale — on one worked example. yours is a different number, and you should know it before the buyer asks for two more points.

working shown, free: https://getgross.co.uk/the-ledger/001?utm_source=linkedin&utm_medium=organic&utm_campaign=number-01
```

### Q-006
- date: 2026-07-24 (Fri 08:30 UK)
- item: Plain-text — the 45% vs 44.8% story (no image). Numbers from
  Ledger 001 (`src/config/ledger.ts`).
- image: none
- status: PENDING

```
the plan says 4 a store a week. say the honest downside is half.

£15,000 of launch money is £288 a week. at 2 a store across 300 stores that's 600 units. £288 ÷ 600 = 48p — the margin per unit that breaks even in the bad year.

48p on 90p COGS is a £1.38 cost price. £1.38 into £2.50 leaves the retailer 44.8%.

the buyer asking 45% instead of 44.8% sounds like rounding. it's the difference between surviving the miss and not.

the whole working: https://getgross.co.uk/the-ledger/001?utm_source=linkedin&utm_medium=organic&utm_campaign=ledger-001-plaintext
```

## Week 3

### Q-007
- date: 2026-07-27 (Mon 07:45 UK)
- item: DICTIONARY /06 — long-term play
- image: https://getgross.co.uk/linkedin/dictionary/06-long-term-play.png
- status: PENDING

```
your buyer:

'we see this as a long-term play' — you fund year one.

year one has a number. nobody puts it on the table in the meeting.

put a number on year one: https://getgross.co.uk/the-wait?utm_source=linkedin&utm_medium=organic&utm_campaign=dictionary-06
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

stress-test the listing before you sign it, free: https://getgross.co.uk/the-listing?utm_source=linkedin&utm_medium=organic&utm_campaign=badday-01
```

### Q-009
- date: 2026-07-31 (Fri 08:30 UK)
- item: Teaser — 05-thirty-five (their 35% isn't your 35%)
- image: https://getgross.co.uk/linkedin/05-thirty-five.png
- status: PENDING

```
same number. two different bases. one of you is measuring off the wrong one, and it's usually not the person who wrote the terms.

the working: https://getgross.co.uk/guides/retailer-margin?utm_source=linkedin&utm_medium=organic&utm_campaign=teaser-05-thirty-five
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

https://getgross.co.uk?utm_source=linkedin&utm_medium=organic&utm_campaign=dictionary-07
```

### Q-011
- date: 2026-08-05 (Wed 07:45 UK)
- item: Guide launch post — retailer-margin guide. Caption is written on the
  day per the calendar.
- image: none yet
- status: BUILD

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

https://getgross.co.uk?utm_source=linkedin&utm_medium=organic&utm_campaign=dictionary-08
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

level the table: https://getgross.co.uk/the-pnl?utm_source=linkedin&utm_medium=organic&utm_campaign=teaser-01-provocation
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
