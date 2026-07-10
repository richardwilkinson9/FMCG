import { describe, it, expect } from 'vitest'
import fc from 'fast-check'
import type { Product } from '../types/product'
import {
  exVat,
  rspExVat,
  logisticsPerUnit,
  retailerPnL,
  solveForCostPrice,
  solveForRrp,
  investmentForWeek,
  investmentInPeriod,
  promosCoveringWeek,
  promoUpliftForWeek,
  promoFundingRateForWeek,
  promoDiscountForWeek,
  weeklyProjection,
  monthlyPhasing,
  cashPhasing,
  listingModel,
  tradeSpendROI,
  stockLedger,
  amazonFBAMargin,
  amazonAnnualPnL,
  tiktokShopMargin,
  tiktokAnnualPnL,
  amazonChannelPnL,
  tiktokChannelPnL,
  channelListed,
  skuCasesPerYear,
  DEFAULT_CHANNEL_CASES,
  estimateAmazonFBAFee,
  formatGBP,
  formatPercent,
  type PromoWindow,
  type AmazonFBAFees,
  type TikTokFees,
} from './calculations'

/**
 * Property-based tests — invariants that must hold for ALL valid inputs,
 * alongside the hand-computed suite in calculations.test.ts. These never
 * assert a specific number that was not derived from the code's own written
 * spec; they assert relationships (identities, conservation, round-trips).
 *
 * If one of these fails, the change that made it fail is wrong.
 */

// Relative-tolerance comparison for floating-point identities.
const close = (a: number, b: number, eps = 1e-9): boolean =>
  Math.abs(a - b) <= eps * Math.max(1, Math.abs(a), Math.abs(b))

const expectClose = (a: number, b: number, eps = 1e-9) => {
  if (!close(a, b, eps)) expect(a).toBe(b) // fails with a readable diff
}

// ── Generators ────────────────────────────────────────────────────────────────

const money = (min: number, max: number) =>
  fc.double({ min, max, noNaN: true, noDefaultInfinity: true })

const arbVatRate = fc.constantFrom(0, 0.05, 0.125, 0.2)
const arbMargin = money(0, 0.9)
const arbLogisticsPerUnit = money(0, 5)
const arbLogisticsPerCase = money(0, 60)

const arbProduct: fc.Arbitrary<Product> = fc.record({
  id: fc.constant('prop-test'),
  name: fc.constant('Property test SKU'),
  cogsPerUnit: money(0.01, 50),
  unitsPerCase: fc.integer({ min: 1, max: 48 }),
  rrpIncVat: money(0.1, 100),
  vatRate: arbVatRate,
  weeklyRateOfSale: money(0.1, 100),
})

const arbPromo: fc.Arbitrary<PromoWindow> = fc.record({
  startWeek: fc.integer({ min: 1, max: 60 }),
  weeks: fc.integer({ min: 1, max: 26 }),
  uplift: money(0, 3),
  discount: money(0, 0.9),
  supplierFunded: fc.boolean(),
})

const arbListingInputs = fc.record({
  stores: fc.integer({ min: 1, max: 2000 }),
  skus: fc.integer({ min: 1, max: 10 }),
  weeksInPeriod: fc.integer({ min: 1, max: 104 }),
  promos: fc.array(arbPromo, { minLength: 0, maxLength: 6 }),
})

const arbAmazonFees: fc.Arbitrary<AmazonFBAFees> = fc.record({
  referralFeePercent: money(0, 0.3),
  fulfilmentFeePerUnit: money(0, 10),
  monthlyStoragePerUnit: money(0, 3),
  fuelLogisticsSurcharge: money(0, 0.2),
})

const arbTikTokFees: fc.Arbitrary<TikTokFees> = fc.record({
  platformCommission: money(0, 0.2),
  affiliateCommission: money(0, 0.3),
  perOrderFee: money(0, 2),
  refundAdminPercent: money(0, 0.1),
})

// ── VAT and logistics ─────────────────────────────────────────────────────────

describe('exVat / logisticsPerUnit invariants', () => {
  it('exVat round-trips: exVat(x, r) × (1 + r) = x', () => {
    fc.assert(
      fc.property(money(0.01, 1000), arbVatRate, (incVat, rate) => {
        expectClose(exVat(incVat, rate) * (1 + rate), incVat)
      }),
    )
  })

  it('exVat never exceeds the VAT-inclusive price for non-negative rates', () => {
    fc.assert(
      fc.property(money(0.01, 1000), arbVatRate, (incVat, rate) => {
        expect(exVat(incVat, rate)).toBeLessThanOrEqual(incVat + 1e-12)
      }),
    )
  })

  it('logisticsPerUnit spreads the case cost exactly across the case', () => {
    fc.assert(
      fc.property(arbLogisticsPerCase, fc.integer({ min: 1, max: 48 }), (perCase, upc) => {
        expectClose(logisticsPerUnit(perCase, upc) * upc, perCase)
      }),
    )
  })

  it('logisticsPerUnit is 0 for a zero-unit case (guard, not a crash)', () => {
    fc.assert(
      fc.property(arbLogisticsPerCase, (perCase) => {
        expect(logisticsPerUnit(perCase, 0)).toBe(0)
      }),
    )
  })
})

// ── The retailer P&L chain ────────────────────────────────────────────────────

describe('retailerPnL invariants', () => {
  it('the chain conserves value: RSP = retailer margin + wholesaler margin + brand net revenue', () => {
    fc.assert(
      fc.property(arbProduct, arbMargin, arbMargin, arbLogisticsPerUnit, (p, rm, wm, log) => {
        const pnl = retailerPnL(p, rm, wm, log)
        expectClose(pnl.rspExVat, pnl.retailerMarginPerUnit + pnl.wholesalerMarginPerUnit + pnl.brandNetRevenue)
        expectClose(pnl.rspExVat, rspExVat(p))
      }),
    )
  })

  it('gross margin per unit = net revenue − landed cost, and never exceeds net revenue', () => {
    fc.assert(
      fc.property(arbProduct, arbMargin, arbMargin, arbLogisticsPerUnit, (p, rm, wm, log) => {
        const pnl = retailerPnL(p, rm, wm, log)
        expectClose(pnl.landedCostPerUnit, p.cogsPerUnit + log)
        expectClose(pnl.brandGrossMarginPerUnit, pnl.brandNetRevenue - pnl.landedCostPerUnit)
        // GM ≤ NSV: the landed cost is non-negative, so margin cannot exceed revenue
        expect(pnl.brandGrossMarginPerUnit).toBeLessThanOrEqual(pnl.brandNetRevenue + 1e-12)
      }),
    )
  })

  it('margin % is the per-unit margin over net revenue (0 when net revenue is 0)', () => {
    fc.assert(
      fc.property(arbProduct, arbMargin, arbMargin, arbLogisticsPerUnit, (p, rm, wm, log) => {
        const pnl = retailerPnL(p, rm, wm, log)
        if (pnl.brandNetRevenue > 0) {
          expectClose(pnl.brandGrossMarginPercent * pnl.brandNetRevenue, pnl.brandGrossMarginPerUnit)
        } else {
          expect(pnl.brandGrossMarginPercent).toBe(0)
        }
      }),
    )
  })

  it('per-case figures are the per-unit figures × units per case', () => {
    fc.assert(
      fc.property(arbProduct, arbMargin, arbMargin, arbLogisticsPerUnit, (p, rm, wm, log) => {
        const pnl = retailerPnL(p, rm, wm, log)
        expectClose(pnl.revenuePerCase, pnl.brandNetRevenue * p.unitsPerCase)
        expectClose(pnl.marginPerCase, pnl.brandGrossMarginPerUnit * p.unitsPerCase)
      }),
    )
  })

  it('a higher retailer margin never leaves the brand with more', () => {
    fc.assert(
      fc.property(arbProduct, arbMargin, arbMargin, money(0, 0.05), (p, rm, wm, bump) => {
        const lower = retailerPnL(p, rm, wm)
        const higher = retailerPnL(p, Math.min(0.95, rm + bump), wm)
        expect(higher.brandNetRevenue).toBeLessThanOrEqual(lower.brandNetRevenue + 1e-12)
      }),
    )
  })

  it('no wholesaler means no wholesaler margin and brand receives the retailer cost price', () => {
    fc.assert(
      fc.property(arbProduct, arbMargin, arbLogisticsPerUnit, (p, rm, log) => {
        const pnl = retailerPnL(p, rm, 0, log)
        expect(pnl.wholesalerMarginPerUnit).toBe(0)
        expectClose(pnl.brandNetRevenue, pnl.costToRetailer)
      }),
    )
  })
})

// ── The Floor: solver round-trips ─────────────────────────────────────────────

describe('solver round-trip identities', () => {
  it('solveForCostPrice: a product at the solved COGS hits the target margin exactly', () => {
    fc.assert(
      fc.property(
        money(0.5, 100), arbVatRate, arbMargin, money(0, 0.8), arbMargin, arbLogisticsPerUnit,
        (rrp, vat, rm, target, wm, log) => {
          const solved = solveForCostPrice(rrp, vat, rm, target, wm, log)
          const p: Product = {
            id: 'x', name: 'x', cogsPerUnit: solved.requiredCogs, unitsPerCase: 12,
            rrpIncVat: rrp, vatRate: vat, weeklyRateOfSale: 1,
          }
          const pnl = retailerPnL(p, rm, wm, log)
          fc.pre(pnl.brandNetRevenue > 0.01)
          expectClose(pnl.brandGrossMarginPercent, target, 1e-6)
        },
      ),
    )
  })

  it('solveForRrp: a product at the solved RRP hits the target margin exactly', () => {
    fc.assert(
      fc.property(
        money(0.05, 50), arbVatRate, arbMargin, money(0, 0.8), arbMargin, arbLogisticsPerUnit,
        (cogs, vat, rm, target, wm, log) => {
          const solved = solveForRrp(cogs, vat, rm, target, wm, log)
          const p: Product = {
            id: 'x', name: 'x', cogsPerUnit: cogs, unitsPerCase: 12,
            rrpIncVat: solved.rrpIncVat, vatRate: vat, weeklyRateOfSale: 1,
          }
          const pnl = retailerPnL(p, rm, wm, log)
          expectClose(pnl.brandGrossMarginPercent, target, 1e-6)
        },
      ),
    )
  })

  it('the two solvers are inverses: solveForRrp then solveForCostPrice returns the COGS', () => {
    fc.assert(
      fc.property(
        money(0.05, 50), arbVatRate, arbMargin, money(0, 0.8), arbMargin, arbLogisticsPerUnit,
        (cogs, vat, rm, target, wm, log) => {
          const rrp = solveForRrp(cogs, vat, rm, target, wm, log).rrpIncVat
          const back = solveForCostPrice(rrp, vat, rm, target, wm, log).requiredCogs
          expectClose(back, cogs, 1e-6)
        },
      ),
    )
  })
})

// ── Customer investment instalments ───────────────────────────────────────────

describe('investment instalment invariants', () => {
  it('the four instalments across a 52-week year sum to the annual investment', () => {
    fc.assert(
      fc.property(money(0.01, 1_000_000), (annual) => {
        let sum = 0
        for (let w = 1; w <= 52; w++) sum += investmentForWeek(annual, w)
        expectClose(sum, annual)
        expectClose(investmentInPeriod(annual, 52), annual)
      }),
    )
  })

  it('investmentInPeriod equals the week-by-week sum for any horizon', () => {
    fc.assert(
      fc.property(money(0.01, 1_000_000), fc.integer({ min: 1, max: 104 }), (annual, weeks) => {
        let sum = 0
        for (let w = 1; w <= weeks; w++) sum += investmentForWeek(annual, w)
        expectClose(investmentInPeriod(annual, weeks), sum)
      }),
    )
  })

  it('instalments land only on weeks 1, 14, 27, 40 (mod 13) and are equal quarters', () => {
    fc.assert(
      fc.property(money(0.01, 1_000_000), fc.integer({ min: 1, max: 104 }), (annual, week) => {
        const v = investmentForWeek(annual, week)
        if ((week - 1) % 13 === 0) expectClose(v, annual / 4)
        else expect(v).toBe(0)
      }),
    )
  })

  it('zero or negative investment never pays anything', () => {
    fc.assert(
      fc.property(money(-1000, 0), fc.integer({ min: 1, max: 104 }), (annual, week) => {
        expect(investmentForWeek(annual, week)).toBe(0)
        expect(investmentInPeriod(annual, week)).toBe(0)
      }),
    )
  })
})

// ── The promo calendar ────────────────────────────────────────────────────────

describe('promo calendar invariants', () => {
  it('a week is covered exactly when start ≤ week < start + length', () => {
    fc.assert(
      fc.property(fc.array(arbPromo, { maxLength: 6 }), fc.integer({ min: 1, max: 104 }), (promos, week) => {
        const covering = promosCoveringWeek(promos, week)
        for (const p of promos) {
          const inside = week >= p.startWeek && week < p.startWeek + p.weeks
          expect(covering.includes(p)).toBe(inside)
        }
      }),
    )
  })

  it('overlapping promos stack additively for uplift, funding and discount', () => {
    fc.assert(
      fc.property(fc.array(arbPromo, { maxLength: 6 }), fc.integer({ min: 1, max: 104 }), (promos, week) => {
        const covering = promosCoveringWeek(promos, week)
        expectClose(promoUpliftForWeek(promos, week), covering.reduce((a, p) => a + p.uplift, 0))
        expectClose(
          promoFundingRateForWeek(promos, week),
          covering.reduce((a, p) => a + (p.supplierFunded ? p.discount : 0), 0),
        )
        expectClose(promoDiscountForWeek(promos, week), covering.reduce((a, p) => a + p.discount, 0))
      }),
    )
  })

  it('the funding rate never exceeds the consumer discount rate', () => {
    fc.assert(
      fc.property(fc.array(arbPromo, { maxLength: 6 }), fc.integer({ min: 1, max: 104 }), (promos, week) => {
        expect(promoFundingRateForWeek(promos, week)).toBeLessThanOrEqual(
          promoDiscountForWeek(promos, week) + 1e-12,
        )
      }),
    )
  })
})

// ── The weekly spine ──────────────────────────────────────────────────────────

describe('weeklyProjection invariants', () => {
  it('produces exactly one row per week with the gross-to-net identities on every row', () => {
    fc.assert(
      fc.property(arbProduct, arbMargin, arbListingInputs, arbMargin, arbLogisticsPerUnit,
        (p, rm, inputs, wm, log) => {
          const rows = weeklyProjection(p, rm, inputs, wm, log)
          const list = retailerPnL(p, rm, wm, log).brandNetRevenue
          const base = p.weeklyRateOfSale * inputs.stores * inputs.skus
          expect(rows).toHaveLength(inputs.weeksInPeriod)
          rows.forEach((r, i) => {
            expect(r.week).toBe(i + 1)
            // GSV = volume × list; the list price never moves
            expectClose(r.gsv, r.volume * list)
            // NSV = GSV − funding
            expectClose(r.nsv, r.gsv - r.funding)
            // GM = NSV − landed cost of the volume
            expectClose(r.grossMargin, r.nsv - r.volume * (p.cogsPerUnit + log))
            // GM never exceeds NSV (landed cost is non-negative)
            expect(r.grossMargin).toBeLessThanOrEqual(r.nsv + 1e-9 * Math.max(1, Math.abs(r.nsv)))
            // Volume is the base uplifted by the calendar, never below base
            expectClose(r.volume, base * (1 + promoUpliftForWeek(inputs.promos, r.week)))
            expect(r.onPromo).toBe(promosCoveringWeek(inputs.promos, r.week).length > 0)
          })
        },
      ),
      { numRuns: 50 },
    )
  })

  it('cumulative columns are exact running sums', () => {
    fc.assert(
      fc.property(arbProduct, arbMargin, arbListingInputs, (p, rm, inputs) => {
        const rows = weeklyProjection(p, rm, inputs)
        let v = 0, g = 0, f = 0, n = 0, m = 0
        for (const r of rows) {
          v += r.volume; g += r.gsv; f += r.funding; n += r.nsv; m += r.grossMargin
          expectClose(r.cumulativeVolume, v)
          expectClose(r.cumulativeGsv, g)
          expectClose(r.cumulativeFunding, f)
          expectClose(r.cumulativeNsv, n)
          expectClose(r.cumulativeMargin, m)
        }
      }),
      { numRuns: 50 },
    )
  })

  it('with no promos every week is the flat base week and funding is zero', () => {
    fc.assert(
      fc.property(arbProduct, arbMargin, fc.integer({ min: 1, max: 104 }),
        fc.integer({ min: 1, max: 2000 }), (p, rm, weeks, stores) => {
          const rows = weeklyProjection(p, rm, { stores, skus: 1, weeksInPeriod: weeks, promos: [] })
          const base = p.weeklyRateOfSale * stores
          for (const r of rows) {
            expectClose(r.volume, base)
            expect(r.funding).toBe(0)
            expect(r.onPromo).toBe(false)
          }
        },
      ),
      { numRuns: 50 },
    )
  })
})

// ── The 4-4-5 monthly roll-up ─────────────────────────────────────────────────

describe('monthlyPhasing invariants', () => {
  it('twelve months on the 4-4-5 calendar cover weeks 1–52 without gap or overlap', () => {
    const months = monthlyPhasing([])
    expect(months).toHaveLength(12)
    expect(months[0].weekStart).toBe(1)
    months.forEach((m, i) => {
      if (i > 0) expect(m.weekStart).toBe(months[i - 1].weekEnd + 1)
    })
    expect(months[11].weekEnd).toBe(52)
  })

  it('monthly totals always sum to the weekly totals of the first 52 weeks', () => {
    fc.assert(
      fc.property(arbProduct, arbMargin, arbListingInputs, money(0, 500_000),
        (p, rm, inputs, invest) => {
          const weeks = weeklyProjection(p, rm, inputs)
          const months = monthlyPhasing(weeks, invest)
          const covered = weeks.slice(0, 52)
          const sum = (f: (r: (typeof covered)[number]) => number) => covered.reduce((a, r) => a + f(r), 0)
          const msum = (f: (m: (typeof months)[number]) => number) => months.reduce((a, m) => a + f(m), 0)
          expectClose(msum((m) => m.volume), sum((r) => r.volume), 1e-7)
          expectClose(msum((m) => m.gsv), sum((r) => r.gsv), 1e-7)
          expectClose(msum((m) => m.funding), sum((r) => r.funding), 1e-7)
          expectClose(msum((m) => m.nsv), sum((r) => r.nsv), 1e-7)
          expectClose(msum((m) => m.grossMargin), sum((r) => r.grossMargin), 1e-7)
        },
      ),
      { numRuns: 50 },
    )
  })

  it('investment lands in M1/M4/M7/M10 only and sums to the annual figure', () => {
    fc.assert(
      fc.property(money(0.01, 1_000_000), (invest) => {
        const months = monthlyPhasing([], invest)
        months.forEach((m) => {
          if ([1, 4, 7, 10].includes(m.month)) expectClose(m.investment, invest / 4)
          else expect(m.investment).toBe(0)
          expectClose(m.netOfInvestment, m.grossMargin - m.investment)
        })
        expectClose(months.reduce((a, m) => a + m.investment, 0), invest)
      }),
    )
  })
})

// ── The Wait: cash phasing ────────────────────────────────────────────────────

describe('cashPhasing invariants', () => {
  const arbDays = fc.integer({ min: 0, max: 120 })
  const arbFill = fc.record({ nsv: money(0, 50_000), cost: money(0, 50_000) })

  it('cash totals equal the accrual totals shifted in time: everything invoiced lands', () => {
    fc.assert(
      fc.property(arbProduct, arbMargin, arbListingInputs, arbDays, arbDays, arbLogisticsPerUnit,
        money(0, 200_000), arbFill,
        (p, rm, inputs, debtor, creditor, log, invest, fill) => {
          const weeks = weeklyProjection(p, rm, inputs)
          const { rows, totalIn, totalOut } = cashPhasing(weeks, p, debtor, creditor, log, invest, fill)
          const accrualNsv = weeks.reduce((a, w) => a + w.nsv, 0)
          const accrualCost = weeks.reduce((a, w) => a + w.volume * (p.cogsPerUnit + log), 0)
          const horizon = rows.length
          let investOut = 0
          for (let w = 1; w <= horizon; w++) investOut += investmentForWeek(invest, w)
          expectClose(totalIn, accrualNsv + fill.nsv, 1e-7)
          expectClose(totalOut, accrualCost + investOut + fill.cost, 1e-7)
        },
      ),
      { numRuns: 50 },
    )
  })

  it('every row nets in = out and the running balance ends at totalIn − totalOut', () => {
    fc.assert(
      fc.property(arbProduct, arbMargin, arbListingInputs, arbDays, arbDays,
        (p, rm, inputs, debtor, creditor) => {
          const weeks = weeklyProjection(p, rm, inputs)
          const { rows, totalIn, totalOut, peakGap } = cashPhasing(weeks, p, debtor, creditor)
          let cumulative = 0
          for (const r of rows) {
            expectClose(r.net, r.cashIn - r.cashOut)
            cumulative += r.net
            expectClose(r.cumulative, cumulative, 1e-7)
          }
          expectClose(rows[rows.length - 1].cumulative, totalIn - totalOut, 1e-7)
          // The peak gap is the worst running balance, never positive
          expect(peakGap).toBeLessThanOrEqual(0)
          rows.forEach((r) => expect(peakGap).toBeLessThanOrEqual(r.cumulative + 1e-9))
        },
      ),
      { numRuns: 50 },
    )
  })
})

// ── The Listing: period totals ────────────────────────────────────────────────

describe('listingModel invariants', () => {
  it('period totals equal the weekly spine and the derived ratios are consistent', () => {
    fc.assert(
      fc.property(arbProduct, arbMargin, arbListingInputs, arbMargin, arbLogisticsPerUnit, money(0, 500_000),
        (p, rm, inputs, wm, log, invest) => {
          const model = listingModel(p, rm, inputs, wm, log, invest)
          const last = model.weeks[model.weeks.length - 1]
          expectClose(model.totalVolume, last.cumulativeVolume)
          expectClose(model.totalGsv, last.cumulativeGsv)
          expectClose(model.totalFunding, last.cumulativeFunding)
          expectClose(model.totalNsv, last.cumulativeNsv)
          expectClose(model.totalGrossMargin, last.cumulativeMargin)
          // NSV = GSV − funding at the period level too
          expectClose(model.totalNsv, model.totalGsv - model.totalFunding, 1e-7)
          // NSV never exceeds GSV (funding is non-negative)
          expect(model.totalNsv).toBeLessThanOrEqual(model.totalGsv + 1e-9 * Math.max(1, model.totalGsv))
          // GM never exceeds NSV
          expect(model.totalGrossMargin).toBeLessThanOrEqual(model.totalNsv + 1e-9 * Math.max(1, Math.abs(model.totalNsv)))
          if (model.totalGsv > 0) expectClose(model.nsvPctOfGsv * model.totalGsv, model.totalNsv, 1e-7)
          if (model.totalNsv > 0) expectClose(model.gmPctOfNsv * model.totalNsv, model.totalGrossMargin, 1e-7)
          expectClose(model.totalRevenue, model.totalNsv)
          expectClose(model.totalCases * p.unitsPerCase, model.totalVolume, 1e-7)
          // Fixed cash sits below gross margin
          expectClose(model.totalInvestment, investmentInPeriod(invest, inputs.weeksInPeriod))
          expectClose(model.marginAfterInvestment, model.totalGrossMargin - model.totalInvestment, 1e-7)
          // The peak week is at least the base week
          expect(model.peakWeeklyVolume).toBeGreaterThanOrEqual(model.weeklyVolume - 1e-9)
        },
      ),
      { numRuns: 50 },
    )
  })

  it('promo summaries: clamped flags and funding reconcile with the weekly rows', () => {
    fc.assert(
      fc.property(arbProduct, arbMargin, arbListingInputs, (p, rm, inputs) => {
        const model = listingModel(p, rm, inputs)
        const totalSummaryFunding = model.promoSummaries.reduce((a, s) => a + s.fundingCost, 0)
        expect(model.promoSummaries).toHaveLength(inputs.promos.length)
        model.promoSummaries.forEach((s, i) => {
          const promo = inputs.promos[i]
          expect(s.weeksInPeriod).toBeLessThanOrEqual(promo.weeks)
          expect(s.clamped).toBe(s.weeksInPeriod < promo.weeks)
          expect(s.fundingCost).toBeGreaterThanOrEqual(0)
        })
        // Overlapping funded promos stack in the weekly rows exactly as the
        // per-promo summaries do: same total funding either way
        expectClose(totalSummaryFunding, model.totalFunding, 1e-7)
      }),
      { numRuns: 50 },
    )
  })
})

// ── The Payback ───────────────────────────────────────────────────────────────

describe('tradeSpendROI invariants', () => {
  it('break-even units × margin per unit returns exactly the investment', () => {
    fc.assert(
      fc.property(arbProduct, arbMargin, money(100, 1_000_000), money(0, 5), arbMargin, arbLogisticsPerUnit,
        (p, rm, investment, roi, wm, log) => {
          const r = tradeSpendROI(p, rm, investment, roi, wm, log)
          if (r.marginPerUnit > 0) {
            expectClose(r.breakEvenUnits * r.marginPerUnit, investment, 1e-7)
            expectClose(r.targetReturnUnits * r.marginPerUnit, investment * (1 + roi), 1e-7)
            // Target always demands at least break-even
            expect(r.targetReturnUnits).toBeGreaterThanOrEqual(r.breakEvenUnits - 1e-9)
            expectClose(r.breakEvenCases * p.unitsPerCase, r.breakEvenUnits, 1e-7)
          } else {
            // No margin per unit: payback never arrives
            expect(r.breakEvenUnits).toBe(Infinity)
            expect(r.targetReturnUnits).toBe(Infinity)
          }
          expectClose(r.marginPerCase, r.marginPerUnit * p.unitsPerCase)
        },
      ),
    )
  })
})

// ── The Stock Answer ──────────────────────────────────────────────────────────

describe('stockLedger invariants', () => {
  const arbDemand = fc.array(money(0, 2000), { minLength: 1, maxLength: 60 })
  const arbLedgerArgs = fc.record({
    demand: arbDemand,
    startingStock: money(0, 20_000),
    leadWeeks: fc.integer({ min: 1, max: 8 }),
    coverWeeks: fc.integer({ min: 0, max: 12 }),
    unitsPerCase: fc.integer({ min: 1, max: 48 }),
  })

  it('stock conservation holds on every row and stock is never negative', () => {
    fc.assert(
      fc.property(arbLedgerArgs, ({ demand, startingStock, leadWeeks, coverWeeks, unitsPerCase }) => {
        const ledger = stockLedger(demand, startingStock, leadWeeks, coverWeeks, unitsPerCase)
        expect(ledger.rows).toHaveLength(demand.length)
        ledger.rows.forEach((r, i) => {
          const available = r.opening + r.arrivals
          expectClose(r.closing, Math.max(0, available - r.demand), 1e-7)
          expectClose(r.shortfall, Math.max(0, r.demand - available), 1e-7)
          expect(r.closing).toBeGreaterThanOrEqual(0)
          expect(r.shortfall).toBeGreaterThanOrEqual(0)
          if (i > 0) expect(r.opening).toBe(ledger.rows[i - 1].closing)
          else expect(r.opening).toBe(startingStock)
        })
      }),
      { numRuns: 100 },
    )
  })

  it('orders are whole cases and the summary lines reconcile with the rows', () => {
    fc.assert(
      fc.property(arbLedgerArgs, ({ demand, startingStock, leadWeeks, coverWeeks, unitsPerCase }) => {
        const ledger = stockLedger(demand, startingStock, leadWeeks, coverWeeks, unitsPerCase)
        ledger.rows.forEach((r) => {
          // Order-up-to rounds UP to whole cases
          expectClose(r.orderPlaced % unitsPerCase, 0, 1e-7)
          expect(r.orderPlaced).toBeGreaterThanOrEqual(0)
        })
        expectClose(ledger.totalOrdered, ledger.rows.reduce((a, r) => a + r.orderPlaced, 0), 1e-7)
        expectClose(ledger.totalOrderedCases * unitsPerCase, ledger.totalOrdered, 1e-7)
        expect(ledger.orderCount).toBe(ledger.rows.filter((r) => r.orderPlaced > 0).length)
        expect(ledger.stockoutWeeks).toBe(ledger.rows.filter((r) => r.shortfall > 0).length)
        expectClose(ledger.lostUnits, ledger.rows.reduce((a, r) => a + r.shortfall, 0), 1e-7)
        expect(ledger.endingStock).toBe(ledger.rows[ledger.rows.length - 1].closing)
        const peak = Math.max(...ledger.rows.map((r) => r.closing), startingStock)
        expect(ledger.peakStock).toBe(peak)
      }),
      { numRuns: 100 },
    )
  })

  it('every arrival is an order placed exactly leadWeeks earlier', () => {
    fc.assert(
      fc.property(arbLedgerArgs, ({ demand, startingStock, leadWeeks, coverWeeks, unitsPerCase }) => {
        const ledger = stockLedger(demand, startingStock, leadWeeks, coverWeeks, unitsPerCase)
        ledger.rows.forEach((r, w) => {
          const placed = w - leadWeeks >= 0 ? ledger.rows[w - leadWeeks].orderPlaced : 0
          expectClose(r.arrivals, placed, 1e-9)
        })
      }),
      { numRuns: 100 },
    )
  })
})

// ── The marketplaces ──────────────────────────────────────────────────────────

describe('amazonFBAMargin invariants', () => {
  it('fees, net revenue and profit reconcile; profit never exceeds net revenue', () => {
    fc.assert(
      fc.property(arbProduct, arbAmazonFees, arbLogisticsPerUnit, (p, fees, log) => {
        const m = amazonFBAMargin(p, fees, log)
        expectClose(m.sellingPriceExVat, exVat(p.rrpIncVat, p.vatRate))
        expectClose(m.totalFees, m.referralFee + m.fulfilmentFee + m.storageFee)
        expectClose(m.netRevenue, m.sellingPriceExVat - m.totalFees)
        expectClose(m.grossProfit, m.netRevenue - p.cogsPerUnit - log)
        expect(m.grossProfit).toBeLessThanOrEqual(m.netRevenue + 1e-12)
        // Fees are non-negative, so net never exceeds the ex-VAT price
        expect(m.netRevenue).toBeLessThanOrEqual(m.sellingPriceExVat + 1e-12)
        if (m.sellingPriceExVat > 0) {
          expectClose(m.grossMarginPercent * m.sellingPriceExVat, m.grossProfit)
          expectClose(m.netPctOfGross * m.sellingPriceExVat, m.netRevenue)
        }
        if (m.netRevenue > 0) expectClose(m.grossMarginPctOfNet * m.netRevenue, m.grossProfit)
      }),
    )
  })
})

describe('tiktokShopMargin invariants', () => {
  it('fees, net revenue and profit reconcile; profit never exceeds net revenue', () => {
    fc.assert(
      fc.property(arbProduct, arbTikTokFees, arbLogisticsPerUnit, (p, fees, log) => {
        const m = tiktokShopMargin(p, fees, log)
        expectClose(m.totalFees, m.platformFee + m.affiliateFee + m.perOrderFee + m.refundCost)
        expectClose(m.netRevenue, m.sellingPriceExVat - m.totalFees)
        expectClose(m.grossProfit, m.netRevenue - p.cogsPerUnit - log)
        expect(m.grossProfit).toBeLessThanOrEqual(m.netRevenue + 1e-12)
        expect(m.netRevenue).toBeLessThanOrEqual(m.sellingPriceExVat + 1e-12)
      }),
    )
  })
})

describe('annual marketplace P&L invariants', () => {
  const arbCases = fc.integer({ min: 0, max: 10_000 })
  const arbPlan = money(0, 100)

  it('amazonAnnualPnL: GSV→NSV→GM identities hold and agree with the per-unit margin', () => {
    fc.assert(
      fc.property(arbProduct, arbAmazonFees, arbPlan, arbCases, arbLogisticsPerCase,
        (p, fees, plan, cases, logPerCase) => {
          const y = amazonAnnualPnL(p, fees, plan, cases, logPerCase)
          expect(y.units).toBe(cases * p.unitsPerCase)
          expectClose(y.gsv, y.units * exVat(p.rrpIncVat, p.vatRate), 1e-7)
          expectClose(y.totalFees, y.referral + y.fulfilment + y.storage + y.plan, 1e-7)
          expectClose(y.plan, plan * 12)
          expectClose(y.nsv, y.gsv - y.totalFees, 1e-7)
          expectClose(y.cogs, y.units * p.cogsPerUnit, 1e-7)
          expectClose(y.logistics, cases * logPerCase, 1e-7)
          expectClose(y.gm, y.nsv - y.cogs - y.logistics, 1e-7)
          // NSV as % of GSV and GM as % of NSV, exactly as the receipt shows them
          if (y.gsv > 0) expectClose(y.nsvPctOfGsv * y.gsv, y.nsv, 1e-7)
          if (y.nsv > 0) expectClose(y.gmPctOfNsv * y.nsv, y.gm, 1e-7)
          // With no selling plan, the annual view is the per-unit view × units,
          // freight folded per case: the two engines must agree
          const perUnit = amazonFBAMargin(p, fees, logisticsPerUnit(logPerCase, p.unitsPerCase))
          const noPlan = amazonAnnualPnL(p, fees, 0, cases, logPerCase)
          expectClose(noPlan.nsv, y.units * perUnit.netRevenue, 1e-6)
          expectClose(noPlan.gm, y.units * perUnit.grossProfit, 1e-6)
        },
      ),
    )
  })

  it('tiktokAnnualPnL: GSV→NSV→GM identities hold and agree with the per-unit margin', () => {
    fc.assert(
      fc.property(arbProduct, arbTikTokFees, arbCases, arbLogisticsPerCase,
        (p, fees, cases, logPerCase) => {
          const y = tiktokAnnualPnL(p, fees, cases, logPerCase)
          expect(y.units).toBe(cases * p.unitsPerCase)
          expectClose(y.totalFees, y.platform + y.affiliate + y.orderFees + y.refunds, 1e-7)
          expectClose(y.nsv, y.gsv - y.totalFees, 1e-7)
          expectClose(y.gm, y.nsv - y.cogs - y.logistics, 1e-7)
          // One unit per order (the cautious read): annual = per-unit × units
          const perUnit = tiktokShopMargin(p, fees, logisticsPerUnit(logPerCase, p.unitsPerCase))
          expectClose(y.nsv, y.units * perUnit.netRevenue, 1e-6)
          expectClose(y.gm, y.units * perUnit.grossProfit, 1e-6)
        },
      ),
    )
  })
})

// ── Channels ──────────────────────────────────────────────────────────────────

describe('channel P&L invariants', () => {
  const arbChannels = fc.option(
    fc.record(
      {
        grocery: fc.boolean(),
        amazon: fc.boolean(),
        tiktok: fc.boolean(),
        amazonCasesPerYear: fc.integer({ min: 0, max: 5000 }),
        tiktokCasesPerYear: fc.integer({ min: 0, max: 5000 }),
      },
      { requiredKeys: [] },
    ),
    { nil: undefined },
  )
  const arbRangeProduct = fc
    .tuple(arbProduct, arbChannels)
    .map(([p, channels]) => ({ ...p, channels }))
  const arbRange = fc.array(arbRangeProduct, { minLength: 0, maxLength: 8 })

  it('absent channel flags mean listed; absent cases/year means the default', () => {
    fc.assert(
      fc.property(arbRangeProduct, (p) => {
        for (const ch of ['grocery', 'amazon', 'tiktok'] as const) {
          expect(channelListed(p, ch)).toBe(p.channels?.[ch] ?? true)
        }
        expect(skuCasesPerYear(p, 'amazon')).toBe(p.channels?.amazonCasesPerYear ?? DEFAULT_CHANNEL_CASES)
        expect(skuCasesPerYear(p, 'tiktok')).toBe(p.channels?.tiktokCasesPerYear ?? DEFAULT_CHANNEL_CASES)
      }),
    )
  })

  it('amazonChannelPnL sums exactly the listed SKUs and charges the plan once', () => {
    fc.assert(
      fc.property(arbRange, arbAmazonFees, money(0, 100), arbLogisticsPerCase,
        (products, fees, plan, logPerCase) => {
          const ch = amazonChannelPnL(products, () => fees, plan, logPerCase)
          const listed = products.filter((p) => channelListed(p, 'amazon'))
          expect(ch.skuCount).toBe(listed.length)
          expect(ch.rows).toHaveLength(listed.length)
          const expGsv = listed.reduce(
            (a, p) => a + skuCasesPerYear(p, 'amazon') * p.unitsPerCase * exVat(p.rrpIncVat, p.vatRate),
            0,
          )
          expectClose(ch.gsv, expGsv, 1e-6)
          expectClose(ch.plan, plan * 12)
          expectClose(ch.nsv, ch.gsv - ch.fees - ch.plan, 1e-7)
          expectClose(ch.gm, ch.nsv - ch.cogs - ch.logistics, 1e-7)
          expect(ch.gm).toBeLessThanOrEqual(ch.nsv + 1e-9 * Math.max(1, Math.abs(ch.nsv)))
        },
      ),
      { numRuns: 50 },
    )
  })

  it('tiktokChannelPnL sums exactly the listed SKUs', () => {
    fc.assert(
      fc.property(arbRange, arbTikTokFees, arbLogisticsPerCase, (products, fees, logPerCase) => {
        const ch = tiktokChannelPnL(products, fees, logPerCase)
        const listed = products.filter((p) => channelListed(p, 'tiktok'))
        expect(ch.skuCount).toBe(listed.length)
        expectClose(ch.nsv, ch.gsv - ch.fees, 1e-7)
        expectClose(ch.gm, ch.nsv - ch.cogs - ch.logistics, 1e-7)
        const perSku = listed.map((p) => tiktokAnnualPnL(p, fees, skuCasesPerYear(p, 'tiktok'), logPerCase))
        expectClose(ch.gsv, perSku.reduce((a, y) => a + y.gsv, 0), 1e-6)
        expectClose(ch.cogs, perSku.reduce((a, y) => a + y.cogs, 0), 1e-6)
      }),
      { numRuns: 50 },
    )
  })
})

// ── The fee estimator ─────────────────────────────────────────────────────────

describe('estimateAmazonFBAFee invariants', () => {
  const arbDims = fc.record({
    weightG: money(1, 35_000),
    longestCm: money(1, 150),
    medianCm: money(1, 100),
    shortestCm: money(1, 60),
  })

  it('a bigger or heavier item never gets a cheaper tier fee', () => {
    fc.assert(
      fc.property(arbDims, money(1, 1.5), (d, scale) => {
        const base = estimateAmazonFBAFee(d.weightG, d.longestCm, d.medianCm, d.shortestCm)
        const bigger = estimateAmazonFBAFee(
          d.weightG * scale, d.longestCm * scale, d.medianCm * scale, d.shortestCm * scale,
        )
        expect(bigger.fee).toBeGreaterThanOrEqual(base.fee - 1e-12)
      }),
    )
  })

  it('always returns a positive fee and a named tier', () => {
    fc.assert(
      fc.property(arbDims, (d) => {
        const r = estimateAmazonFBAFee(d.weightG, d.longestCm, d.medianCm, d.shortestCm)
        expect(r.fee).toBeGreaterThan(0)
        expect(r.tier.length).toBeGreaterThan(0)
      }),
    )
  })
})

// ── Formatting (presentation only — the strings the receipts print) ──────────

describe('format helpers', () => {
  it('formatGBP always shows two decimals and marks negatives with a minus sign', () => {
    fc.assert(
      fc.property(money(-1_000_000, 1_000_000), (v) => {
        const s = formatGBP(v)
        expect(s).toMatch(/^−?£[\d,]+\.\d{2}$/)
        expect(s.startsWith('−')).toBe(v < 0)
      }),
    )
  })

  it('formatPercent multiplies by 100 with one decimal place', () => {
    fc.assert(
      fc.property(money(-10, 10), (v) => {
        expect(formatPercent(v)).toBe(`${(v * 100).toFixed(1)}%`)
      }),
    )
  })
})
