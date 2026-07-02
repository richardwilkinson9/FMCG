import type { Product } from '../types/product'

/**
 * Encode/decode the full app state into URL query params for sharing.
 * Format: ?products=<base64-encoded JSON>&active=<productId>&calc=<calculatorId>
 */

export function encodeStateToUrl(
  products: Product[],
  activeProductId: string | null,
  activeCalculator: string,
): string {
  const data = { products, activeProductId, activeCalculator }
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
}

export function decodeStateFromUrl(): DecodedState | null {
  const params = new URLSearchParams(window.location.search)
  const encoded = params.get('s')
  if (!encoded) return null

  try {
    const json = decodeURIComponent(atob(encoded))
    const data = JSON.parse(json) as DecodedState
    if (!Array.isArray(data.products) || data.products.length === 0) return null
    return data
  } catch {
    return null
  }
}
