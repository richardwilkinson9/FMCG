import { describe, it, expect } from 'vitest'
import fc from 'fast-check'
import { decodeBlob } from './urlState'
import { mergeScenario, defaultScenario, MAX_PROMOS } from '../store/scenario'

/**
 * Fuzzing the share-blob decoder and the scenario healer. The safety property:
 * hostile input NEVER throws out of the public API — it either becomes a fully
 * shaped, valid state or a null (which the app treats as "no blob").
 */

const scenarioSectionKeys = Object.keys(defaultScenario())

/** Anything JSON can encode, including deeply hostile shapes. */
const arbJsonish = fc.jsonValue()

/** A syntactically valid blob wrapping arbitrary JSON. */
const encodeHostile = (value: unknown): string => btoa(encodeURIComponent(JSON.stringify(value)))

describe('decodeBlob never throws', () => {
  it('survives arbitrary strings (not base64, truncated, unicode, huge)', () => {
    fc.assert(
      fc.property(fc.string({ maxLength: 5000 }), (s) => {
        const result = decodeBlob(s)
        expect(result === null || typeof result === 'object').toBe(true)
      }),
      { numRuns: 500 },
    )
  })

  it('survives valid base64 of arbitrary bytes', () => {
    fc.assert(
      fc.property(fc.uint8Array({ maxLength: 2000 }), (bytes) => {
        const b64 = btoa(String.fromCharCode(...bytes))
        const result = decodeBlob(b64)
        expect(result === null || typeof result === 'object').toBe(true)
      }),
      { numRuns: 500 },
    )
  })

  it('survives well-formed blobs carrying arbitrary JSON shapes', () => {
    fc.assert(
      fc.property(arbJsonish, (value) => {
        const result = decodeBlob(encodeHostile(value))
        expect(result === null || typeof result === 'object').toBe(true)
      }),
      { numRuns: 500 },
    )
  })

  it('truncating a genuine blob at any point never throws', () => {
    const genuine = encodeHostile({
      products: [{ id: 'a', name: 'A', cogsPerUnit: 1, unitsPerCase: 6, rrpIncVat: 2, vatRate: 0.2, weeklyRateOfSale: 3 }],
      activeProductId: 'a',
      activeCalculator: 'retailer-pnl',
      scenario: defaultScenario(),
    })
    fc.assert(
      fc.property(fc.integer({ min: 0, max: genuine.length }), (cut) => {
        const result = decodeBlob(genuine.slice(0, cut))
        expect(result === null || typeof result === 'object').toBe(true)
      }),
      { numRuns: 300 },
    )
  })

  it('rejects blobs without a non-empty products array', () => {
    expect(decodeBlob(encodeHostile({}))).toBeNull()
    expect(decodeBlob(encodeHostile({ products: [] }))).toBeNull()
    expect(decodeBlob(encodeHostile({ products: 'nope' }))).toBeNull()
    expect(decodeBlob(encodeHostile(null))).toBeNull()
    expect(decodeBlob(encodeHostile(42))).toBeNull()
  })

  it('a decoded blob always comes back with a fully shaped scenario', () => {
    fc.assert(
      fc.property(arbJsonish, arbJsonish, (scenario, extra) => {
        const result = decodeBlob(
          encodeHostile({
            products: [{ id: 'a', name: 'A' }],
            activeCalculator: extra,
            scenario,
          }),
        )
        expect(result).not.toBeNull()
        // Every scenario section exists after healing, whatever came in
        for (const key of scenarioSectionKeys) {
          expect(result!.scenario).toHaveProperty(key)
        }
        // The active product falls back to the first product
        expect(result!.activeProductId).toBe('a')
      }),
      { numRuns: 300 },
    )
  })
})

describe('mergeScenario healing properties', () => {
  it('never throws and always returns every section for any input', () => {
    fc.assert(
      fc.property(arbJsonish, (input) => {
        const merged = mergeScenario(input)
        for (const key of scenarioSectionKeys) expect(merged).toHaveProperty(key)
        expect(Array.isArray(merged.buyers)).toBe(true)
        expect(Array.isArray(merged.listing.promos)).toBe(true)
      }),
      { numRuns: 500 },
    )
  })

  it('promos are clamped to six and every promo field is present and typed', () => {
    fc.assert(
      fc.property(fc.array(arbJsonish, { maxLength: 12 }), (promos) => {
        const merged = mergeScenario({ listing: { promos } })
        expect(merged.listing.promos.length).toBeLessThanOrEqual(MAX_PROMOS)
        for (const p of merged.listing.promos) {
          expect(typeof p.id).toBe('string')
          expect(typeof p.startWeek).toBe('number')
          expect(typeof p.weeks).toBe('number')
          expect(typeof p.mechanic).toBe('string')
          expect(typeof p.discount).toBe('number')
          expect(typeof p.uplift).toBe('number')
          expect(typeof p.supplierFunded).toBe('boolean')
        }
      }),
      { numRuns: 300 },
    )
  })

  it('legacy single-promo links migrate to the calendar (never both shapes)', () => {
    fc.assert(
      fc.property(
        fc.integer({ min: 1, max: 52 }),
        fc.integer({ min: 0, max: 12 }),
        fc.double({ min: 0, max: 2, noNaN: true }),
        (promoStartWeek, promoWeeks, promoUplift) => {
          const merged = mergeScenario({ listing: { promoStartWeek, promoWeeks, promoUplift } })
          const listing = merged.listing as unknown as Record<string, unknown>
          expect(listing.promoStartWeek).toBeUndefined()
          expect(listing.promoWeeks).toBeUndefined()
          expect(listing.promoUplift).toBeUndefined()
          if (promoWeeks > 0) {
            expect(merged.listing.promos).toHaveLength(1)
            expect(merged.listing.promos[0].startWeek).toBe(promoStartWeek)
            expect(merged.listing.promos[0].weeks).toBe(promoWeeks)
            expect(merged.listing.promos[0].uplift).toBe(promoUplift)
            // The old model had no price cut
            expect(merged.listing.promos[0].discount).toBe(0)
          } else {
            expect(merged.listing.promos).toHaveLength(0)
          }
        },
      ),
    )
  })

  it('legacy per-channel logistics migrates to the single constant', () => {
    fc.assert(
      fc.property(fc.double({ min: 0.01, max: 60, noNaN: true }), (perCase) => {
        for (const section of ['grocery', 'amazon', 'tiktok']) {
          const merged = mergeScenario({ [section]: { logisticsPerCase: perCase } })
          expect(merged.logistics.perCase).toBe(perCase)
        }
      }),
      { numRuns: 100 },
    )
  })

  it('buyers replace wholesale — a decoded array is never spread into an object', () => {
    const buyers = [{ id: 'b1', name: 'Buyer one', retailerMargin: 0.4, wholesalerEnabled: false, wholesalerMargin: 0.1, promoFunding: 0.1, backMargin: 0.02, otherTrade: 0.01 }]
    const merged = mergeScenario({ buyers })
    expect(merged.buyers).toEqual(buyers)
    // Hostile non-array leaves the default empty list
    expect(mergeScenario({ buyers: { evil: true } }).buyers).toEqual([])
  })
})
