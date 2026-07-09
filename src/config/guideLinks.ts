/**
 * Tool → guide cross-links, kept as a tiny hand-maintained map so CalcShell
 * (shared by every calculator) doesn't pull the full guides.json payload.
 * When you add a guide with a matching tool, add a line here — the prerender
 * guard checks guides.json ↔ pages.ts; this map is the on-page link only.
 */
export const GUIDE_FOR_TOOL: Record<string, { pageId: string; title: string }> = {
  'retailer-pnl': { pageId: 'guide-retailer-margin', title: 'How retailer margin actually works' },
  'waterfall': { pageId: 'guide-gross-to-net', title: 'Gross-to-net: where your revenue actually goes' },
  'amazon-fba': { pageId: 'guide-amazon-fba-fees-uk', title: 'Amazon FBA fees in the UK, added up honestly' },
  'portfolio': { pageId: 'guide-fmcg-margin-benchmarks', title: 'FMCG margin benchmarks: what brands actually make' },
  'cash-flow': { pageId: 'guide-payment-terms-uk-grocery', title: 'Payment terms in UK grocery: the cash cost of being paid later' },
  'trade-spend': { pageId: 'guide-what-a-promo-costs', title: 'What a supermarket promotion actually costs the brand' },
}
