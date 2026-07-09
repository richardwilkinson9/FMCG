/**
 * PAGE REGISTRY — the single source of truth for every routable view.
 *
 * One entry drives: client routing (slug ↔ id), the document <title> and meta
 * description, the crawlable intro line under each header, the sitemap, the
 * prerendered per-route HTML, and the static OG share cards. Ids are stable so
 * old share links keep working; slugs are the clean, shareable, indexable URLs.
 *
 * If you add a calculator, add it here and everything downstream follows.
 */

export interface PageMeta {
  /** Stable internal id (also the key in App's PAGES registry) */
  id: string
  /** Clean URL path segment. Home is '' (the site root). */
  slug: string
  /** Short label for nav / cards */
  navTitle: string
  /** <title> for the tab and search results (keep the brand suffix) */
  seoTitle: string
  /** Meta description + OG description */
  description: string
  /** One deadpan, crawlable line rendered under the page header */
  intro: string
  /** Whether it appears in the sitemap (home + the tools; utility pages opt in) */
  indexed: boolean
}

const SUFFIX = 'GROSS.'

export const PAGE_META: PageMeta[] = [
  {
    id: 'home',
    slug: '',
    navTitle: 'Home',
    seoTitle: 'GROSS. — Free commercial calculators for UK FMCG brand teams',
    description:
      "Free commercial calculators for UK FMCG brand teams. Retailer margins, gross-to-net, trade spend payback, supply plans, Amazon FBA and TikTok Shop fees — do the gross maths.",
    intro: '',
    indexed: true,
  },
  {
    id: 'products',
    slug: 'the-shelf',
    navTitle: 'The Shelf',
    seoTitle: `The Shelf — define your FMCG range once | ${SUFFIX}`,
    description:
      'Define your range once. Enter each product’s cost price, RSP, units per case and rate of sale — every GROSS. calculator reads the same product spine.',
    intro:
      'Your range, defined once. Enter each product’s cost price, RSP, units per case and rate of sale — every calculator reads the same spine.',
    indexed: true,
  },
  {
    id: 'retailer-pnl',
    slug: 'the-pnl',
    navTitle: 'The P&L',
    seoTitle: `The P&L — UK retailer margin calculator | ${SUFFIX}`,
    description:
      'See what the retailer really makes on you. A UK grocery P&L read top-down: shelf price, VAT, retailer and wholesaler margin, and what you bank per unit.',
    intro:
      'See what the retailer really makes on you. Reads top-down: shelf price, VAT, who takes what, and what you actually bank per unit.',
    indexed: true,
  },
  {
    id: 'waterfall',
    slug: 'the-waterfall',
    navTitle: 'The Waterfall',
    seoTitle: `The Waterfall — gross-to-net trade spend | ${SUFFIX}`,
    description:
      'Every deduction between the shelf price and your bank. Gross sales value to net net, with promo funding, back margin and other trade spend off your list price.',
    intro:
      'Every deduction between the shelf price and your bank. Gross to net net, with promo funding, back margin and other trade spend.',
    indexed: true,
  },
  {
    id: 'min-margin',
    slug: 'the-floor',
    navTitle: 'The Floor',
    seoTitle: `The Floor — minimum margin & pricing floor | ${SUFFIX}`,
    description:
      'The lowest cost price — or the RRP — that still clears your target margin. Solve the FMCG pricing floor backwards from the number you need to hit.',
    intro:
      'The lowest cost price, or the RRP, that still clears your target margin. Solved backwards from the number you need to hit.',
    indexed: true,
  },
  {
    id: 'listing-model',
    slug: 'the-listing',
    navTitle: 'The Listing',
    seoTitle: `The Listing — range review & promo plan model | ${SUFFIX}`,
    description:
      'Model the range review before the buyer does. A week-by-week listing projection with a full promo calendar: volume, GSV, promo funding, NSV and gross margin across the year.',
    intro:
      'Model the range review before the buyer does. Week by week, with a full promo calendar behind the annual GSV-to-net plan.',
    indexed: true,
  },
  {
    id: 'trade-spend',
    slug: 'the-payback',
    navTitle: 'The Payback',
    seoTitle: `The Payback — trade spend ROI & promo break-even | ${SUFFIX}`,
    description:
      'How much incremental volume a promotion needs to pay itself back. Trade spend ROI and break-even in cases for any UK FMCG promo mechanic.',
    intro:
      'How much incremental volume a promo needs to pay itself back. Break-even in cases, and the uplift that implies on your base.',
    indexed: true,
  },
  {
    id: 'stock-forecast',
    slug: 'the-stock-answer',
    navTitle: 'The Stock Answer',
    seoTitle: `The Stock Answer — FMCG supply & reorder plan | ${SUFFIX}`,
    description:
      'What to order, and when, before you run out. A weekly supply plan that follows your promo calendar — order-up-to cover in whole cases, with stockout warnings.',
    intro:
      'What to order, and when, before you run out. A weekly supply plan that follows your promo calendar, in whole cases.',
    indexed: true,
  },
  {
    id: 'amazon-fba',
    slug: 'the-amazon-cut',
    navTitle: 'The Amazon Cut',
    seoTitle: `The Amazon Cut — FBA fee & margin calculator | ${SUFFIX}`,
    description:
      'What Amazon FBA takes before you see a penny. Referral, fulfilment, storage and the selling plan per unit, plus a full-year GSV-to-net margin P&L by cases sold.',
    intro:
      'What FBA takes before you see a penny. Every fee per unit, plus a full-year GSV-to-net P&L by cases sold.',
    indexed: true,
  },
  {
    id: 'tiktok-shop',
    slug: 'the-tiktok-cut',
    navTitle: 'The TikTok Cut',
    seoTitle: `The TikTok Cut — TikTok Shop fee calculator | ${SUFFIX}`,
    description:
      'What TikTok Shop takes on every sale. Platform commission, affiliate, per-order fee and refunds per unit, plus a full-year GSV-to-net margin P&L.',
    intro:
      'What TikTok Shop takes on every sale. Every fee per unit, plus a full-year GSV-to-net P&L by cases sold.',
    indexed: true,
  },
  {
    id: 'cross-channel',
    slug: 'the-line-up',
    navTitle: 'The Line-Up',
    seoTitle: `The Line-Up — cross-channel margin comparison | ${SUFFIX}`,
    description:
      'Net margin on the same product across grocery, Amazon FBA and TikTok Shop, side by side. The biggest channel is rarely the one that pays.',
    intro:
      'The same product across grocery, Amazon and TikTok, side by side. The biggest channel is rarely the one that pays.',
    indexed: true,
  },
  {
    id: 'portfolio',
    slug: 'the-range',
    navTitle: 'The Range',
    seoTitle: `The Range — FMCG portfolio margin view | ${SUFFIX}`,
    description:
      'The whole portfolio on one till roll. Blended margin, the product that carries the range, and the full-year GSV-to-net plan across every SKU.',
    intro:
      'The whole portfolio on one till roll. Blended margin, the SKU that carries the range, and the full-year plan.',
    indexed: true,
  },
  {
    id: 'cash-flow',
    slug: 'the-wait',
    navTitle: 'The Wait',
    seoTitle: `The Wait — FMCG cash flow & payment terms | ${SUFFIX}`,
    description:
      'Margin is an opinion; cash is a fact. When the retailer actually pays you, when you pay your supplier, and the gap your bank account has to survive.',
    intro:
      'Margin is an opinion; cash is a fact. When the money actually moves — and the gap your bank account has to survive.',
    indexed: true,
  },
  {
    id: 'ledger',
    slug: 'the-ledger',
    navTitle: 'The Ledger',
    seoTitle: `The Ledger — the GROSS. monthly letter | ${SUFFIX}`,
    description:
      'One email a month on the commercial maths of UK FMCG: margins, trade spend, fees and the numbers behind the shelf. No selling. Unsubscribe any time.',
    intro:
      'One email a month on the commercial maths of UK FMCG. No selling. The archive lives here.',
    indexed: true,
  },
  {
    id: 'ledger-001',
    slug: 'the-ledger/001',
    navTitle: 'The Ledger No. 001',
    seoTitle: `The Ledger No. 001 — how wrong can you be | ${SUFFIX}`,
    description:
      'Margin is the insurance on a bad forecast. A worked example: the minimum margin that survives a halved rate of sale, solved backwards with The Floor.',
    intro:
      'Your margin is your insurance. The minimum margin that survives a halved rate of sale, worked in full.',
    indexed: true,
  },
  {
    id: 'guides',
    slug: 'guides',
    navTitle: 'The Guides',
    seoTitle: `The Guides — the maths of UK FMCG, written down | ${SUFFIX}`,
    description:
      'How retailer margin works, where gross-to-net revenue goes, what Amazon FBA really costs, and what margins UK FMCG brands actually make. The long reads behind the calculators.',
    intro:
      'The long reads behind the calculators: retailer margin, gross-to-net, FBA fees and margin benchmarks, written down properly.',
    indexed: true,
  },
  {
    id: 'guide-retailer-margin',
    slug: 'guides/retailer-margin',
    navTitle: 'How retailer margin actually works',
    seoTitle: `How retailer margin actually works (UK grocery) | ${SUFFIX}`,
    description:
      'Front margin vs back margin, margin vs mark-up, VAT, the wholesaler layer — the most argued-about number in UK grocery taken apart line by line, with a free calculator.',
    intro:
      'Front margin, back margin, margin vs mark-up and the wholesaler layer — with the arithmetic shown.',
    indexed: true,
  },
  {
    id: 'guide-gross-to-net',
    slug: 'guides/gross-to-net',
    navTitle: 'Gross-to-net: where your revenue goes',
    seoTitle: `Gross-to-net in FMCG: GSV, NSV and trade spend | ${SUFFIX}`,
    description:
      'GSV, NSV, promo funding and back margin: the waterfall between your invoice and your bank, what a healthy one looks like, and how to model yours free.',
    intro:
      'GSV, NSV, promo funding and back margin — the waterfall between invoice and bank, and what a healthy one looks like.',
    indexed: true,
  },
  {
    id: 'guide-amazon-fba-fees-uk',
    slug: 'guides/amazon-fba-fees-uk',
    navTitle: 'Amazon FBA fees in the UK',
    seoTitle: `Amazon FBA fees UK: what FBA really costs FMCG brands | ${SUFFIX}`,
    description:
      'Referral, fulfilment, storage and the selling plan added up honestly — why case size beats fee negotiation, and the break-even price to check before you list.',
    intro:
      'Referral, fulfilment, storage and the plan, added up honestly — plus the break-even price nobody checks.',
    indexed: true,
  },
  {
    id: 'guide-fmcg-margin-benchmarks',
    slug: 'guides/fmcg-margin-benchmarks',
    navTitle: 'FMCG margin benchmarks',
    seoTitle: `FMCG margin benchmarks UK: what brands actually make | ${SUFFIX}`,
    description:
      'Indicative UK gross-margin ranges by category — confectionery, soft drinks, snacks, chilled, beauty — measured properly, dated, and honest about being ranges.',
    intro:
      'Indicative UK brand gross-margin ranges by category, measured on the right base and honest about being ranges.',
    indexed: true,
  },
  {
    id: 'guide-payment-terms-uk-grocery',
    slug: 'guides/payment-terms-uk-grocery',
    navTitle: 'Payment terms in UK grocery',
    seoTitle: `Payment terms in UK grocery: the cash cost of 60 days | ${SUFFIX}`,
    description:
      'How supermarket payment terms turn into working capital: the debtor-day maths, the shelf-fill trap, what faster payment is worth, and a free tool to model your own cash curve.',
    intro:
      'Sixty days is not a detail — it is working capital, and it is yours. The debtor-day maths, the shelf-fill trap, and what terms are worth.',
    indexed: true,
  },
  {
    id: 'guide-what-a-promo-costs',
    slug: 'guides/what-a-promo-costs',
    navTitle: 'What a promotion actually costs',
    seoTitle: `What a supermarket promotion actually costs the brand | ${SUFFIX}`,
    description:
      'Supplier funding mechanics, the uplift myth, cannibalised base sales and the payback test — what UK grocery promotions really cost, with a free calculator to run yours.',
    intro:
      'Funding off invoice, the uplift with the widest error bars in the building, and the payback test nobody runs. Worked openly.',
    indexed: true,
  },
  {
    id: 'till',
    slug: 'the-till',
    navTitle: 'The Till',
    seoTitle: `The Till | ${SUFFIX}`,
    description: 'Back office. Nothing to see here.',
    intro: '',
    indexed: false,
  },
  {
    id: 'methodology',
    slug: 'the-rate-card',
    navTitle: 'The Rate Card',
    seoTitle: `The Rate Card — every fee default & source | ${SUFFIX}`,
    description:
      'Every fee default in GROSS., what it is, when it was checked and where it comes from. The maths is only as good as the rate card.',
    intro:
      'Every default in GROSS., what it is, when it was checked and where it comes from. The maths is only as good as the rate card.',
    indexed: true,
  },
]

const BY_ID = new Map(PAGE_META.map((p) => [p.id, p]))
const BY_SLUG = new Map(PAGE_META.map((p) => [p.slug, p]))

export function pageById(id: string): PageMeta | undefined {
  return BY_ID.get(id)
}

/** Map a URL pathname (e.g. "/the-payback") to a page id, or null if unknown. */
export function pageIdFromPath(pathname: string): string | null {
  const slug = pathname.replace(/^\/+|\/+$/g, '')
  if (slug === '') return 'home'
  return BY_SLUG.get(slug)?.id ?? null
}

/** The clean path for a page id (leading slash; "/" for home). */
export function pathForPageId(id: string): string {
  const slug = BY_ID.get(id)?.slug
  return slug ? `/${slug}` : '/'
}
