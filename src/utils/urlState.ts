import type { Product } from '../types/product'
import { type Scenario, mergeScenario } from '../store/scenario'
import { pathForPageId } from '../config/pages'

/**
 * Encode/decode the full app state into the URL for sharing.
 * Format: /<slug>?s=<base64-encoded JSON of { products, activeProductId, activeCalculator, scenario }>
 *
 * The clean path (/the-payback) is the indexable, human-readable URL; the `?s=`
 * blob carries the full model so a shared link reopens the recipient's screen
 * EXACTLY as the sender left it — margins, fees, store counts, the lot. A link
 * with no blob (e.g. from search) just opens that tool on the defaults. Older
 * links without a scenario still work; missing sections fall back to defaults.
 */

export function encodeStateToUrl(
  products: Product[],
  activeProductId: string | null,
  activeCalculator: string,
  scenario: Scenario,
): string {
  const data = { products, activeProductId, activeCalculator, scenario }
  const json = JSON.stringify(data)
  const encoded = btoa(encodeURIComponent(json))
  const url = new URL(window.location.href)
  url.pathname = pathForPageId(activeCalculator)
  url.search = ''
  url.searchParams.set('s', encoded)
  return url.toString()
}

interface DecodedState {
  products: Product[]
  activeProductId: string | null
  activeCalculator: string
  scenario: Scenario
}

/** Decode one `?s=` blob (also used by short links, which store the same blob). */
export function decodeBlob(encoded: string): DecodedState | null {
  try {
    const json = decodeURIComponent(atob(encoded))
    const data = JSON.parse(json) as Partial<DecodedState>
    if (!Array.isArray(data.products) || data.products.length === 0) return null
    return {
      products: data.products,
      activeProductId: data.activeProductId ?? data.products[0].id,
      activeCalculator: data.activeCalculator ?? 'retailer-pnl',
      scenario: mergeScenario(data.scenario),
    }
  } catch {
    return null
  }
}

export function decodeStateFromUrl(): DecodedState | null {
  const params = new URLSearchParams(window.location.search)
  const encoded = params.get('s')
  if (!encoded) return null
  return decodeBlob(encoded)
}

/** The raw blob for the current state — what a short link stores. */
export function encodeBlob(
  products: Product[],
  activeProductId: string | null,
  activeCalculator: string,
  scenario: Scenario,
): string {
  return btoa(encodeURIComponent(JSON.stringify({ products, activeProductId, activeCalculator, scenario })))
}
