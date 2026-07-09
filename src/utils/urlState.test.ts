import { describe, it, expect } from 'vitest'
import type { Product } from '../types/product'
import { encodeBlob, decodeBlob } from './urlState'
import { defaultScenario } from '../store/scenario'

/**
 * The share blob is the persistence layer — a regression here silently breaks
 * every share link, short link and the URL-restore on refresh.
 */

const product: Product = {
  id: 'p1',
  name: 'Tëst — product (24×330ml) 100%',
  cogsPerUnit: 0.32,
  unitsPerCase: 24,
  rrpIncVat: 1.5,
  vatRate: 0.2,
  weeklyRateOfSale: 10,
  category: 'Soft drinks',
  channels: { grocery: true, amazonCasesPerYear: 250 },
}

describe('share blob round-trip', () => {
  it('encodes and decodes the full model, unicode included', () => {
    const scenario = defaultScenario()
    scenario.logistics.perCase = 2.5
    scenario.cash.shelfFillCasesPerStore = 2
    const blob = encodeBlob([product], 'p1', 'cash-flow', scenario)
    // base64: URL-safe enough to survive a querystring after encodeURIComponent
    expect(typeof blob).toBe('string')
    const decoded = decodeBlob(blob)
    expect(decoded).not.toBeNull()
    expect(decoded!.products[0].name).toBe(product.name)
    expect(decoded!.products[0].channels?.amazonCasesPerYear).toBe(250)
    expect(decoded!.activeCalculator).toBe('cash-flow')
    expect(decoded!.scenario.logistics.perCase).toBeCloseTo(2.5, 10)
    expect(decoded!.scenario.cash.shelfFillCasesPerStore).toBe(2)
  })

  it('heals a blob with missing scenario sections via mergeScenario', () => {
    const raw = btoa(encodeURIComponent(JSON.stringify({
      products: [product],
      activeProductId: 'p1',
      activeCalculator: 'retailer-pnl',
      scenario: { grocery: { retailerMargin: 0.4, wholesalerEnabled: false, wholesalerMargin: 0.25 } },
    })))
    const decoded = decodeBlob(raw)
    expect(decoded).not.toBeNull()
    expect(decoded!.scenario.grocery.retailerMargin).toBeCloseTo(0.4, 10)
    // Sections absent from the blob come back as defaults, not undefined
    expect(decoded!.scenario.cash.debtorDays).toBe(60)
    expect(decoded!.scenario.listing.annualInvestment).toBe(0)
  })

  it('rejects junk instead of throwing', () => {
    expect(decodeBlob('not base64 at all !!!')).toBeNull()
    expect(decodeBlob(btoa(encodeURIComponent(JSON.stringify({ products: [] }))))).toBeNull()
    expect(decodeBlob(btoa('garbage%'))).toBeNull()
  })
})
