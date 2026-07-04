# GROSS. — Brand guidelines

*The working brand system, distilled from the design handover and everything
built since. This is the reference for anyone making anything — a page, a
slide, an email, a deck. When in doubt: blunter, plainer, more ink.*

---

## 1. The idea

**GROSS.** is commercial maths for UK FMCG, said out loud. The name is the
double meaning and the whole brand: *gross* margin, and *gross* — what the
deductions do to it. The design is a supermarket flipped into a brutalist
poster: till receipts, shelf-edge labels, SKU codes, barcodes, best-before
stamps. The voice is a commercial director muttering the truth.

**Tagline:** Do the gross maths.
**The promise:** The maths is checked. The rat is not real.

Two commandments outrank every other rule:
1. **The maths is sacred.** Never joke in a number. Never publish an unchecked
   figure. Humour lives in the frame — labels, verdicts, footers — never in
   the calculation.
2. **Trust is the asset.** Every default is dated and sourced (The Rate Card).
   Nothing a user enters is stored without them choosing it. Money never
   touches the Rate Card's independence.

## 2. Voice

Deadpan. Dry. Blunt. British. So blunt it's almost rude — but rude *about the
maths*, never about the reader's ability. Short sentences. Real FMCG jargon
used correctly — back margin, gross-to-net, range review, ROS — that's the
shibboleth that proves we're one of them.

**Rules:**
- Sentence case. No exclamation marks. No emoji.
- Never paraphrase the fixed strings (verdicts, health labels, footers) —
  they're canon (see §6).
- Banned words: *empower, unlock, seamless, solution, journey, supercharge,
  elevate.* If it could appear on a corporate slide, cut it.
- Self-deprecation is on-brand ("VAT number: not applicable. This is a
  website."). Hype is not.

**Calibration examples:**
- Yes: "The retailer takes 35%. You said thank you."
- Yes: "Back margin is still margin. It still comes off your invoice."
- No: "Unlock powerful margin insights!" (banned word, exclamation, hype)
- No: jokes inside a receipt's numbers.

## 3. Colour

| Token | Hex | Use |
|---|---|---|
| **Bile** | `#C6F215` | The brand green. Grounds, highlights, answer text on ink |
| **Ink** | `#0A0A0A` | Type, borders, inverted blocks |
| **Receipt** | `#F7F5EF` | Paper — page grounds, receipt cards |
| **Reduced** | `#FFD400` | The yellow discount sticker. **Max ONE element per page/slide** |
| **Red-pen** | `#E4002B` | **Negatives and errors ONLY.** Never decoration |

**Hard rules:**
- Bile and Reduced (green + yellow) never touch without a 2px+ Ink rule
  between them.
- No other colours. No tints, no gradients, no shadows, no photography.
- Red-pen appearing anywhere means a number is negative or something is wrong.

## 4. Type

| Font | Role |
|---|---|
| **Anton** | Display: headlines, tool names, the wordmark. Tight leading (~0.85–1.02), slight negative tracking |
| **Space Mono** | **Every numeral**, receipts, labels, eyebrows, SKUs, buttons. Bold for totals |
| **Inter** | Body copy only |

Self-hosted (latin subsets in `public/fonts/`) — no font CDNs. In Excel/print
fallbacks: Arial Black / Courier New.

The wordmark is always **GROSS.** — Anton, with the full stop. The stop is
part of the mark.

## 5. Layout & graphic language

- `border-radius: 0` everywhere. The **only** circle allowed is the rotated
  sticker (NEW / KEEP SWIPING), which is always Reduced yellow with an Ink
  border.
- All borders 2px+ solid Ink. Boxes, chips, fields: bordered, never floating.
- Motifs, used sparingly and correctly:
  - **The receipt** — dashed tear lines top/bottom, `GROSS. // TOOL` header,
    dated; line items with dotted rules; the answer as an inverted Ink block
    with Bile text; footer: *"VAT number: not applicable. This is a website."*
  - **Shelf-edge card** — bordered cell with SKU eyebrow (`SKU 50 04405 ·
    GROCERY · LISTING MODEL`) and a group tag.
  - **Best-before stamp** — rotated bordered box: `DEFAULTS CHECKED / 03 JUL
    2026 / verify the rate card`.
  - **Barcode** — divider/filler ornament, Ink bars.
  - **Ticker** — marquee strip of deadpan truths ("YOUR ROS ASSUMPTION IS
    OPTIMISTIC"); pauses on hover, static under reduced motion.
  - **Ledger the Rat** — the mascot. Marginal positions only (footer, empty
    state, small print), max once per page, never explains anything.
- Inputs: 52px tall, 2px Ink border, £/% affix boxes, Space Mono values.
- Health traffic lights: Bile = healthy, Reduced = tight, Red-pen = trouble.

## 6. Fixed strings (canon — never paraphrase)

- Health chips: `HEALTHY - WHO'S A GOOD BOY/GIRL/DOG` · `TIGHT - YOU BETTER BE
  SURE OF YOUR ROS` · `THIN - NO BONUS HERE` · `UNDERWATER - DON'T YOU DARE`
- Receipt footer: `VAT number: not applicable. This is a website.`
- Site footer: `GROSS. CHECK YOUR MATHS. THE RAT IS NOT REAL.`
- Empty state: `No product yet.` (one line, the rat, nothing else)
- The tone of verdicts: one blunt sentence, a real number in it, no hedging.
  ("Every unit loses money - don't be an idiot." / "Thin, but hey, Jeff loves
  you.")

## 7. Naming

Tools are named like aisle signs: **The** + one blunt noun. *The P&L, The
Waterfall, The Floor, The Listing, The Payback, The Stock Answer, The Amazon
Cut, The TikTok Cut, The Line-Up, The Range, The Shelf, The Rate Card.* The
newsletter is **The Ledger**; its audience is **The Union**; saved models live
in **The Archive**; saved terms are **The Buyers**; comparison is **The
Audit**. New features get names from the same shelf.

## 8. Applications

- **The website** — the reference implementation of all of the above.
- **The Excel deck** — Ink/Bile cover, receipt-styled sheets, named cells,
  verdicts printed at export. Numbers recalculate; sentences don't.
- **OG share cards** (`public/og/`) — bile or receipt ground, Anton title,
  deadpan tagline, barcode bar, `getgross.co.uk`.
- **Social carousels** (`marketing/carousel/`, generator in `scripts/`) —
  three sanctioned directions: *v1 bile poster*, *v2 ink poster* (inverted),
  *v3 till roll* (the slide is a receipt). 1080×1350. Copy ≤10 words a slide.
  Real numbers only — someone will check.
- **The Ledger (email)** — "one receipt a week": THE NUMBER → THE RECEIPT →
  THE MARGIN NOTE. One scroll, one idea, under two minutes. Same voice, same
  bans, every figure dated and sourced.

## 9. The quick test

Before shipping anything, ask:
1. Would a NAM forward it to the desk next to them? (useful + blunt)
2. Is every number real, dated, and checkable? (sacred maths)
3. Does it look like a supermarket had a breakdown in a print shop? (bile,
   ink, receipts, zero radius)
4. Did anything "elevate", "unlock" or go on a "journey"? (delete it)
5. Is the yellow touching the green? (put an ink rule between them)
