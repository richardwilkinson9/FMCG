import GUIDES_DATA from './guides.json'

/**
 * GUIDES — the long reads. Content lives in guides.json (shared with the
 * prerender, which injects it as crawlable HTML + FAQPage JSON-LD); this file
 * is the typed wrapper. Adding a guide = one JSON entry + one pages.ts entry
 * + one PAGES line in App.tsx.
 *
 * The FAQ renders on the page AND as FAQPage JSON-LD — Google requires the
 * answers to be visible, and they are.
 */

export interface GuideSection {
  heading?: string
  paras: string[]
}

export interface GuideFaq {
  q: string
  a: string
}

export interface Guide {
  /** Page id is `guide-<key>`; route is /guides/<key> */
  key: string
  title: string
  standfirst: string
  sections: GuideSection[]
  faq: GuideFaq[]
  /** The tool that runs this maths */
  toolId: string
  toolLabel: string
}

export const GUIDES = GUIDES_DATA as Guide[]

const BY_KEY = new Map(GUIDES.map((g) => [g.key, g]))

/** Look up a guide by key ('retailer-margin') or page id ('guide-retailer-margin'). */
export function guideByIdOrKey(idOrKey: string): Guide | undefined {
  return BY_KEY.get(idOrKey.replace(/^guide-/, ''))
}
