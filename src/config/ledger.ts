/**
 * THE LEDGER — the monthly letter's on-site archive.
 *
 * Each issue is DATA, not a component: add an entry here (and one line in
 * pages.ts + App's PAGES) and the issue page renders itself. Every number is a
 * declared worked example, computed by hand and locked in the maths regression
 * suite — no figure appears here that isn't reproduced by a test.
 *
 * Voice: deadpan, dry, blunt, British. Sentence case. Space Mono for numerals.
 */

/** One line of the working: a receipt row (label→value), or a sentence. */
export interface LedgerLine {
  /** Left-hand label (receipt row) */
  label?: string
  /** Right-hand mono value (receipt row) */
  value?: string
  /** Full-width sentence instead of a row */
  prose?: string
  /** A phrase within `prose` to render in Red-Pen (negatives/kill lines only) */
  redPhrase?: string
  bold?: boolean
}

export interface LedgerBlock {
  /** RSection eyebrow; omit for an unlabelled run of lines */
  section?: string
  lines: LedgerLine[]
}

/** The inputs behind the "run it with your numbers" share link. */
export interface LedgerShareScenario {
  productName: string
  rrpIncVat: number
  vatRate: number
  cogsPerUnit: number
  weeklyRateOfSale: number
  unitsPerCase: number
  stores: number
  retailerMargin: number
  targetBrandMargin: number
  solveMode: 'cost' | 'rrp'
}

export interface LedgerIssue {
  /** Zero-padded slug segment, e.g. '001' (route is /the-ledger/001) */
  slug: string
  number: number
  /** e.g. 'July 2026' */
  date: string
  /** Anton display title */
  title: string
  standfirst: string
  /** THE NUMBER — the single figure of the issue */
  theNumber: string
  theNumberSource: string[]
  blocks: LedgerBlock[]
  doublingLaw?: {
    heading: string
    rows: { margin: string; ros: string }[]
    caption: string
  }
  shareButtonLabel: string
  shareSupport: string
  shareScenario: LedgerShareScenario
  /** The Floor lands on this tool with the scenario pre-loaded */
  shareTool: string
  marginNote: string
  bestBefore: string
}

export const LEDGER_ISSUES: LedgerIssue[] = [
  {
    slug: '001',
    number: 1,
    date: 'July 2026',
    title: 'How wrong can you be',
    standfirst: 'Your margin is your insurance.',
    theNumber: '48p',
    theNumberSource: [
      'The margin per unit that survives a halved rate of sale in the worked',
      "example below. Yours is different - that's the point.",
    ],
    blocks: [
      {
        section: 'THE LISTING, DECLARED',
        lines: [
          { label: 'RSP (zero-rated)', value: '£2.50' },
          { label: 'Stores', value: '300' },
          { label: 'COGS per unit', value: '£0.90' },
          { label: 'Launch trade investment', value: '£15,000' },
          { label: 'Forecast rate of sale', value: '4 units/store/wk' },
          { prose: 'The forecast says 4. Forecasts are opinions.' },
        ],
      },
      {
        lines: [
          { prose: 'The most important question. What ROS does this listing NEED to survive?' },
          { prose: 'Say the honest downside is half. ROS 2.' },
          { label: 'Fixed money per week', value: '£15,000 ÷ 52 = £288' },
          { label: 'Downside units per week', value: '2 × 300 = 600' },
          { label: 'Margin that breaks even', value: '£288 ÷ 600 = 48p', bold: true },
          { prose: 'Under 48p a unit, a 50% forecast miss ends this listing.', redPhrase: 'ends this listing.' },
        ],
      },
      {
        section: 'INTO THE MEETING',
        lines: [
          { prose: 'Now walk 48p into the meeting:' },
          { label: '48p margin on 90p COGS = cost price', value: '£1.38' },
          { label: '£1.38 into £2.50 leaves the retailer', value: '44.8%' },
          { prose: "The buyer asking 45% instead of 44.8% sounds like rounding. It's the difference between surviving the miss and not." },
        ],
      },
      {
        section: "IF SURVIVING ISN'T THE AMBITION",
        lines: [
          { prose: 'If the listing must still MAKE £5,000 in the bad year:' },
          { label: 'Downside units, full year', value: '2 × 300 × 52 = 31,200' },
          { label: 'Margin required', value: '(£15,000 + £5,000) ÷ 31,200 = 64.1p', bold: true },
          { label: 'Cost price', value: '£1.54' },
          { label: "Retailer's share, maximum", value: '38.4%' },
          { prose: 'The same 64.1p that merely survives the bad year makes £25,000 if the forecast holds. Insurance that pays out in both states of the world.' },
        ],
      },
    ],
    doublingLaw: {
      heading: 'THE DOUBLING LAW',
      rows: [
        { margin: '60p', ros: '1.6 /store/wk' },
        { margin: '48p', ros: '2.0' },
        { margin: '30p', ros: '3.2' },
      ],
      caption: 'Halve the margin. Double the rate of sale you owe.',
    },
    shareButtonLabel: 'RUN IT WITH YOUR NUMBERS',
    shareSupport:
      'The Floor solves this backwards: give it the margin you need, it gives you the cost price - or the RRP - that clears it.',
    shareScenario: {
      productName: 'Worked example — Ledger 001',
      rrpIncVat: 2.5,
      vatRate: 0,
      cogsPerUnit: 0.9,
      weeklyRateOfSale: 2,
      unitsPerCase: 24,
      stores: 300,
      retailerMargin: 0.448,
      targetBrandMargin: 0.348,
      solveMode: 'cost',
    },
    shareTool: 'min-margin',
    marginNote:
      "You negotiate margin once. The shopper defines your rate of sale every week after. You've got no control over them.",
    bestBefore: 'your next range review',
  },
]

const BY_SLUG = new Map(LEDGER_ISSUES.map((i) => [i.slug, i]))

/** Look up an issue by its slug ('001'), or by the page id 'ledger-001'. */
export function ledgerIssue(slugOrId: string): LedgerIssue | undefined {
  return BY_SLUG.get(slugOrId.replace(/^ledger-/, ''))
}
