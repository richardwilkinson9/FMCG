import type { Product } from '../types/product'
import { type Scenario, mergeScenario } from '../store/scenario'

/**
 * Encode/decode the full app state into the URL for sharing.
 * Format: ?s=<base64-encoded JSON of { products, activeProductId, activeCalculator, scenario }>
 *
 * The scenario (all calculator settings) is included so a shared link reopens
 * the recipient's screen EXACTLY as the sender left it — margins, fees,
 * store counts, the lot. Older links without a scenario still work; missing
 * sections fall back to defaults.
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

export function decodeStateFromUrl(): DecodedState | null {
  const params = new URLSearchParams(window.location.search)
  const encoded = params.get('s')
  if (!encoded) return null

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
