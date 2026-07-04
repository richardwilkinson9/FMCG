# GROSS. — Marketing strategy

*Written 04 Jul 2026, from the strategy sessions in the build. This is the
portable master copy — the living plan can run in a Claude Project / wherever,
but this file stays versioned next to the product it describes. Update it when
the strategy actually changes, not weekly.*

---

## 1. What this is, commercially

**The product** (free forever): eleven commercial calculators + the Excel deck
for UK FMCG brand teams. **The business**: the audience it accretes. The tools
are top-of-funnel; The Ledger (newsletter) is the relationship; the relationship
is the eventual revenue. Nothing may ever compromise: (a) the maths being right,
(b) the free promise, (c) the Rate Card's independence.

**Audience** — narrow and senior, which is the asset: NAMs, SNAMs, commercial /
category directors, founder-operators, ecom leads, and the buyers opposite them.
~8,000 of *these* people beats 500k of anyone else.

**Positioning** — the sharpest, bluntest commercial maths on the internet, in a
voice that sounds like a commercial director muttering the truth. "Do the gross
maths." Everyone else in FMCG-adjacent content is corporate mush; the brand cuts
through *because* it refuses to be polite.

**Voice rules (apply to every asset):** deadpan, dry, blunt, British. Short
sentences. Real jargon used correctly (back margin, gross-to-net, range review —
the shibboleth). Sentence case. No emoji, no exclamation marks. Banned: empower,
unlock, seamless, solution, journey, supercharge, elevate. Funny in the frame,
never in the maths.

---

## 2. The funnel

```
Search / LinkedIn / forwards
        ↓
Free tool (per-tool SEO pages, OG share cards)
        ↓
Export the deck / share a model   ← peak-intent moments
        ↓
The Union (The Ledger newsletter) ← the asset
        ↓
Sponsorship → Pro → Teams → Benchmarks (see §5)
```

Two compounding loops to optimise before spending a penny on ads:
- **Tool loop:** tool → email capture → email drives tool use → shared `?s=`
  scenario → new users.
- **Content loop:** newsletter "Number" → LinkedIn post → discovery → email.

Instrumentation is live: anonymous `events` table (view / share / export /
union, by tool). Let it tell you which tools people actually use and write
toward those.

---

## 3. The Ledger (newsletter) — the core asset

**Format — "one receipt a week."** Three fixed blocks, instantly recognisable:
1. **THE NUMBER** — one real, dated, sourced FMCG commercial figure unpacked
   (a fee change, a margin norm, a mechanic's true cost). The forwardable core.
2. **THE RECEIPT** — a worked mini-example with a share-link that opens GROSS.
   pre-loaded with that exact scenario.
3. **THE MARGIN NOTE** — one deadpan closing line + the relevant tool link.

Hard rule: one scroll, one idea, under two minutes.

**The promise** (already live on the site): *the rate card, kept current — when
Amazon or a multiple moves a fee, you get the email before your buyer does.*

**Cadence:** weekly, same day/time forever (Tue or Wed morning). Consistency
beats frequency; never go daily.

**Guardrails:** every number dated + sourced; no selling in the first ~10
issues; max one clearly-labelled sponsor; sponsors never touch the Rate Card;
one wrong figure to this audience is unrecoverable.

**Content columns to rotate:** The Number · The Rate Card moved · The buyer's-
eye view · Reader's model (anonymised teardown) · The gross truth (myth vs
maths).

**Traction plan (0 → ~1,000):**
1. Site capture: Union box + a post-export prompt (peak intent).
2. LinkedIn: post each issue's Number as a standalone deadpan post 2–3×/week.
3. Personal network: the first 200 are DMs; ask three people to forward it.
4. Built-in referral line: "forward this to the NAM who needs it."
5. Other people's stages: The Grocer et al., FMCG podcasts, founder groups.
6. The tools ARE the lead magnet — no gated PDF nonsense.

**Metrics that matter:** open rate (target 45–55%+) and forward rate. Prune
dead subscribers; small-and-engaged beats big-and-cold.

**Quarterly flagship:** one big dated piece (e.g. "The 2026 UK FMCG rate card",
"What promos actually cost this year") for backlinks and PR.

---

## 4. Channels

- **SEO** (built): per-tool indexable pages, prerendered crawlable content +
  internal-link mesh, JSON-LD, sitemap, OG cards. Search is the patient,
  compounding channel for "FMCG margin calculator"-class queries.
  *Owner action: verify domain in Google Search Console, submit sitemap.*
- **LinkedIn** (primary social): where the audience lives. The Number, carousel
  posts (see repo `marketing/`), share-link screenshots. Voice does the work.
- **Sharing** (built): `?s=` links + OG cards mean every shared model is an ad.
- **Communities/podcasts/press:** guest slots > broad reach. Pitch the flagship
  pieces.
- **Paid:** later, narrow (LinkedIn job-title targeting) and only once the
  organic loops demonstrably convert.

---

## 5. Monetisation sequence (SWOT-tested; the free core is never gated)

Sell the frame, never the calculation. Five sellable things: audience,
workflow, data, distribution, intent.

| Phase | What | Notes |
|---|---|---|
| Short | **Ledger sponsorship** | One deadpan slot/issue, £50–150 CPM territory once the list is real (~2–3k engaged). Never near the Rate Card. |
| Short | **Pro (£8–15/mo)** | Workflow, not maths: white-label/branded deck, unlimited saved models + history, team shares. The branded deck is the wedge. |
| Selective | **Referrals** | Only high-trust, high-value categories (trade finance/FX, maybe 3PL). Curated, never pay-to-rank. |
| Long | **Teams/agency SaaS (£200–600/mo)** | The real recurring engine. Shared workspaces, terms, approvals, white-label. Agencies are the channel. |
| Long | **Benchmarks data product** | Consented, aggregated, anonymised category benchmarks → subscription/reports (brands, PE/VC DD). Highest ceiling; governance must be bulletproof. Start consent capture early. |
| Opportunistic | **GROSS. School / API** | Only if the audience or inbound pulls them. |

Guardrails: money never touches the Rate Card's independence; nothing a user
could recognise as their own numbers is ever sold without explicit opt-in.

---

## 6. Current state (Jul 2026)

Built and live-ready: 11 tools + Rate Card, per-tool SEO + OG cards, share
links, Excel deck (whole range), Supabase auth/archive/union/events, promo
calendar, channels model, logistics, benchmarks. Newsletter: sign-ups
collecting; first issue not yet written. List size: ~0. Everything in §3–4 is
sequenced on writing issue #1.

**Next actions, in order:**
1. Google Search Console + sitemap submission (owner).
2. Write Ledger issue #1 (The Number: pick a live fee change).
3. Post-export email prompt on the site (build).
4. LinkedIn cadence: 2 posts/week from the Number bank.
5. First carousel post (assets in `marketing/`).
