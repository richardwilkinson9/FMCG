import { describe, it, expect } from 'vitest'
import type { Product } from '../types/product'
import {
  investmentForWeek,
  investmentInPeriod,
  weeklyProjection,
  listingModel,
  cashPhasing,
  tradeSpendROI,
  stockLedger,
  amazonFBAMargin,
  tiktokShopMargin,
  amazonAnnualPnL,
  tiktokAnnualPnL,
  amazonChannelPnL,
  tiktokChannelPnL,
  crossChannelComparison,
  estimateAmazonFBAFee,
  getAmazonReferralRate,
  getTikTokCommission,
  formatNumber,
  formatGBP,
  retailerPnL,
} from './calculations'
import { AMAZON_SIZE_TIERS, AMAZON_CATEGORY_FEES, TIKTOK_CATEGORY_FEES } from '../config/fees'

/**
 * Mutation-kill suite. Every test here exists because a Stryker mutant of
 * calculations.ts survived the hand-computed suite and the property suite —
 * these pin the exact boundaries, guards and columns those mutants exposed
 * as untested. All expected values are hand-derived; none were copied from
 * the code's output.
 *
 * Two mutants are equivalent (output-identical) and cannot be killed:
 *  - investmentForWeek: `annualInvestment <= 0` → `< 0` (at 0 the payout is
 *    0/4 = 0 either way)
 *  - tiktokChannelPnL: skuCasesPerYear(p, 'tiktok') → skuCasesPerYear(p, '')
 *    (any non-'amazon' string takes the tiktok branch)
 */

const product = (over: Partial<Product> = {}): Product => ({
  id: 'mut',
  name: 'Mutation SKU',
  cogsPerUnit: 0.8,
  unitsPerCase: 6,
  rrpIncVat: 3.0,
  vatRate: 0.2,
  weeklyRateOfSale: 5,
  ...over,
})

const zeroAmazonFees = { referralFeePercent: 0, fulfilmentFeePerUnit: 0, monthlyStoragePerUnit: 0, fuelLogisticsSurcharge: 0 }
const zeroTikTokFees = { platformCommission: 0, affiliateCommission: 0, perOrderFee: 0, refundAdminPercent: 0 }

// ── Investment guards ─────────────────────────────────────────────────────────

describe('investment guard boundaries', () => {
  it('negative investment pays nothing even on an instalment week', () => {
    expect(investmentForWeek(-100, 1)).toBe(0)
    expect(investmentForWeek(-100, 14)).toBe(0)
    expect(investmentInPeriod(-100, 52)).toBe(0)
  })

  it('weeks before week 1 pay nothing, including negative instalment-pattern weeks', () => {
    expect(investmentForWeek(1000, 0)).toBe(0)
    // -12 satisfies (week − 1) % 13 === 0 in JS (−13 % 13 is −0), so only the
    // week < 1 guard stands between it and a phantom instalment
    expect(investmentForWeek(1000, -12)).toBe(0)
  })

  it('a period shorter than a week collects nothing, whatever the arithmetic says', () => {
    expect(investmentInPeriod(1000, 0)).toBe(0)
    // −13 would compute a NEGATIVE instalment count without the guard
    expect(investmentInPeriod(1000, -13)).toBe(0)
  })
})

// ── Retail sales value (the consumer till line) ───────────────────────────────

describe('weeklyProjection retail sales value', () => {
  it('promo weeks ring the till at the cut shelf price: volume × RRP × (1 − discount)', () => {
    const p = product() // rrp 3.00
    const rows = weeklyProjection(p, 0.35, {
      stores: 10, skus: 1, weeksInPeriod: 2,
      promos: [{ startWeek: 2, weeks: 1, uplift: 1, discount: 0.25, supplierFunded: true }],
    })
    // Base week: 5 × 10 = 50 units at full £3.00 through the till
    expect(rows[0].retailSalesValue).toBeCloseTo(50 * 3.0, 10)
    // Promo week: 100 units at £3.00 × 0.75 = £225
    expect(rows[1].volume).toBeCloseTo(100, 10)
    expect(rows[1].retailSalesValue).toBeCloseTo(100 * 3.0 * 0.75, 10)
  })

  it('a stacked discount past 100% clamps the till at zero, never negative', () => {
    const p = product()
    const rows = weeklyProjection(p, 0.35, {
      stores: 10, skus: 1, weeksInPeriod: 1,
      promos: [
        { startWeek: 1, weeks: 1, uplift: 0, discount: 0.8, supplierFunded: false },
        { startWeek: 1, weeks: 1, uplift: 0, discount: 0.7, supplierFunded: false },
      ],
    })
    expect(rows[0].retailSalesValue).toBe(0)
  })
})

// ── listingModel: empty period, ratios, clamps ────────────────────────────────

describe('listingModel guards and clamps', () => {
  it('a zero-week period returns an all-zero plan rather than crashing', () => {
    const m = listingModel(product(), 0.35, { stores: 10, skus: 1, weeksInPeriod: 0, promos: [] })
    expect(m.weeks).toHaveLength(0)
    expect(m.totalVolume).toBe(0)
    expect(m.totalGsv).toBe(0)
    expect(m.totalFunding).toBe(0)
    expect(m.totalNsv).toBe(0)
    expect(m.totalGrossMargin).toBe(0)
    expect(m.totalCases).toBe(0)
    // Ratio guards: 0/0 must come out as 0, not NaN
    expect(m.nsvPctOfGsv).toBe(0)
    expect(m.gmPctOfNsv).toBe(0)
  })

  it('the base weekly volume multiplies stores AND skus', () => {
    const m = listingModel(product(), 0.35, { stores: 10, skus: 3, weeksInPeriod: 1, promos: [] })
    expect(m.weeklyVolume).toBeCloseTo(5 * 10 * 3, 10)
  })

  it('total retail sales value sums the till line across the period', () => {
    const m = listingModel(product(), 0.35, { stores: 10, skus: 1, weeksInPeriod: 4, promos: [] })
    // 4 flat weeks × 50 units × £3.00
    expect(m.totalRetailSalesValue).toBeCloseTo(4 * 50 * 3.0, 10)
  })

  it('promo weeks outside the period are clamped out of the summary, including week 1', () => {
    const p = product()
    const inputs = {
      stores: 10, skus: 1, weeksInPeriod: 4,
      promos: [{ startWeek: -1, weeks: 4, uplift: 0.5, discount: 0.2, supplierFunded: true }],
    }
    const m = listingModel(p, 0.35, inputs)
    // Weeks −1, 0, 1, 2 — only weeks 1 and 2 are inside the period
    expect(m.promoSummaries[0].weeksInPeriod).toBe(2)
    expect(m.promoSummaries[0].clamped).toBe(true)
    // A promo covering week 1 exactly counts week 1
    const m2 = listingModel(p, 0.35, {
      ...inputs,
      promos: [{ startWeek: 1, weeks: 2, uplift: 0.5, discount: 0.2, supplierFunded: true }],
    })
    expect(m2.promoSummaries[0].weeksInPeriod).toBe(2)
    expect(m2.promoSummaries[0].clamped).toBe(false)
  })
})

// ── cashPhasing: the flat-zero tie ────────────────────────────────────────────

describe('cashPhasing peak gap tie-breaking', () => {
  it('a cashless plan never moves the peak-gap week off zero', () => {
    const { rows, peakGap, peakGapWeek } = cashPhasing([], product(), 30, 30)
    expect(rows.length).toBeGreaterThan(0)
    expect(peakGap).toBe(0)
    // Ties do NOT advance the week: only a strictly worse balance moves it
    expect(peakGapWeek).toBe(0)
  })
})

// ── tradeSpendROI: the zero-margin edge ───────────────────────────────────────

describe('tradeSpendROI zero-margin edge', () => {
  it('exactly zero margin per unit means payback never arrives (Infinity, not NaN)', () => {
    // rsp ex VAT = 1.20/1.2 = £1.00; 50% retailer margin leaves £0.50; COGS
    // £0.50 exactly → margin per unit is exactly 0
    const p = product({ rrpIncVat: 1.2, vatRate: 0.2, cogsPerUnit: 0.5 })
    const r = tradeSpendROI(p, 0.5, 0, 2)
    expect(r.marginPerUnit).toBeCloseTo(0, 12)
    expect(r.breakEvenUnits).toBe(Infinity)
    expect(r.targetReturnUnits).toBe(Infinity)
  })

  it('target-return cases divide units by the case size', () => {
    const p = product({ unitsPerCase: 6 })
    const r = tradeSpendROI(p, 0.35, 1000, 1)
    expect(r.targetReturnCases).toBeCloseTo(r.targetReturnUnits / 6, 10)
  })
})

// ── stockLedger: two hand-traced ledgers ──────────────────────────────────────

describe('stockLedger hand-traced plans', () => {
  it('steady demand: order-up-to tops up on the exact reorder boundary', () => {
    // demand 10/wk × 6, start 20, lead 2, cover 1, case of 5 — hand-traced:
    //  w1: avail 20, close 10; lead demand 20 > 10 → order to cover 30: 20
    //  w2: avail 10, close 0; position 0 + 20 on order = lead demand 20 → NO order
    //  w3: 20 arrives, close 10; order 20 again
    //  w4: close 0; position 20 = lead demand → no order
    //  w5: 20 arrives, close 10; lead demand (last week only) 10 → no order
    //  w6: close 0
    const ledger = stockLedger([10, 10, 10, 10, 10, 10], 20, 2, 1, 5)
    expect(ledger.rows.map((r) => r.week)).toEqual([1, 2, 3, 4, 5, 6])
    expect(ledger.rows.map((r) => r.orderPlaced)).toEqual([20, 0, 20, 0, 0, 0])
    expect(ledger.rows.map((r) => r.arrivals)).toEqual([0, 0, 20, 0, 20, 0])
    expect(ledger.rows.map((r) => r.closing)).toEqual([10, 0, 10, 0, 10, 0])
    expect(ledger.rows.map((r) => r.shortfall)).toEqual([0, 0, 0, 0, 0, 0])
    expect(ledger.totalOrdered).toBe(40)
    expect(ledger.orderCount).toBe(2)
    expect(ledger.stockoutWeeks).toBe(0)
    expect(ledger.peakStock).toBe(20)
    expect(ledger.endingStock).toBe(0)
  })

  it('a spike orders on top of stock already in the pipeline', () => {
    // demand [1, 1, 500, 1, 1], start 10, lead 2, cover 0, case of 1:
    //  w1: close 9; lead demand 501 → order 501 − 9 = 492
    //  w2: close 8; position 8 + 492 = 500 < 501 → top-up order of exactly 1
    //      (the pipeline must be counted, not ignored and not double-counted)
    //  w3: 492 arrives, meets the spike, close 0; lead demand 2 > 1 on order →
    //      order 1 more
    //  w4: 1 arrives, close 0
    //  w5: 1 arrives, close 0
    const ledger = stockLedger([1, 1, 500, 1, 1], 10, 2, 0, 1)
    expect(ledger.rows.map((r) => r.orderPlaced)).toEqual([492, 1, 1, 0, 0])
    expect(ledger.rows.map((r) => r.arrivals)).toEqual([0, 0, 492, 1, 1])
    expect(ledger.rows.map((r) => r.closing)).toEqual([9, 8, 0, 0, 0])
    expect(ledger.lostUnits).toBe(0)
    expect(ledger.totalOrdered).toBe(494)
    expect(ledger.orderCount).toBe(3)
  })

  it('an empty plan returns the starting position untouched', () => {
    const ledger = stockLedger([], 77, 2, 1, 6)
    expect(ledger.rows).toHaveLength(0)
    expect(ledger.endingStock).toBe(77)
    expect(ledger.peakStock).toBe(77)
    expect(ledger.totalOrdered).toBe(0)
    expect(ledger.totalOrderedCases).toBe(0)
  })

  it('a zero-unit case size falls back to raw quantities without dividing', () => {
    const ledger = stockLedger([10, 10, 10], 0, 1, 1, 0)
    expect(ledger.totalOrderedCases).toBe(0)
    ledger.rows.forEach((r) => expect(Number.isFinite(r.orderPlaced)).toBe(true))
  })
})

// ── Marketplace ratio guards at zero and negative revenue ─────────────────────

describe('marketplace percentage guards', () => {
  it('amazonFBAMargin: a free product reports 0% margins, not NaN or −Infinity', () => {
    const m = amazonFBAMargin(product({ rrpIncVat: 0 }), zeroAmazonFees)
    expect(m.sellingPriceExVat).toBe(0)
    expect(m.netRevenue).toBe(0)
    expect(m.grossProfit).toBeCloseTo(-0.8, 10)
    expect(m.grossMarginPercent).toBe(0)
    expect(m.grossMarginPctOfNet).toBe(0)
    expect(m.netPctOfGross).toBe(0)
  })

  it('tiktokShopMargin: a free product reports 0% margins, not NaN or −Infinity', () => {
    const m = tiktokShopMargin(product({ rrpIncVat: 0 }), zeroTikTokFees)
    expect(m.sellingPriceExVat).toBe(0)
    expect(m.netRevenue).toBe(0)
    expect(m.grossMarginPercent).toBe(0)
    expect(m.grossMarginPctOfNet).toBe(0)
    expect(m.netPctOfGross).toBe(0)
  })

  it('tiktokShopMargin percentages are the true ratios when revenue is positive', () => {
    // sp ex VAT = 3/1.2 = 2.50; fees = 0.225 + 0.25 + 0.20 + 0.025 = 0.70;
    // net = 1.80; profit = 1.80 − 0.8 = 1.00
    const m = tiktokShopMargin(product(), {
      platformCommission: 0.09, affiliateCommission: 0.1, perOrderFee: 0.2, refundAdminPercent: 0.01,
    })
    expect(m.netRevenue).toBeCloseTo(1.8, 10)
    expect(m.grossMarginPercent).toBeCloseTo(1.0 / 2.5, 10)
    expect(m.grossMarginPctOfNet).toBeCloseTo(1.0 / 1.8, 10)
    expect(m.netPctOfGross).toBeCloseTo(1.8 / 2.5, 10)
  })

  it('amazonAnnualPnL: zero cases and zero plan yield an all-zero year with 0% ratios', () => {
    const y = amazonAnnualPnL(product(), zeroAmazonFees, 0, 0)
    expect(y.gsv).toBe(0)
    expect(y.nsv).toBe(0)
    expect(y.gm).toBe(0)
    expect(y.nsvPctOfGsv).toBe(0)
    expect(y.gmPctOfNsv).toBe(0)
    expect(y.gmPctOfGsv).toBe(0)
  })

  it('amazonAnnualPnL: GM as a share of GSV is the true ratio on a real year', () => {
    // 100 cases × 6 units × £2.50 = £1,500 GSV, no fees → GM = 1500 − 480 = £1,020
    const y = amazonAnnualPnL(product(), zeroAmazonFees, 0, 100)
    expect(y.gm).toBeCloseTo(1020, 10)
    expect(y.gmPctOfGsv).toBeCloseTo(1020 / 1500, 10)
  })

  it('amazonAnnualPnL: a plan with no sales leaves NSV negative and ratios pinned at 0', () => {
    const y = amazonAnnualPnL(product(), zeroAmazonFees, 25, 0)
    expect(y.nsv).toBe(-300)
    expect(y.nsvPctOfGsv).toBe(0)
    expect(y.gmPctOfNsv).toBe(0)
    expect(y.gmPctOfGsv).toBe(0)
  })

  it('tiktokAnnualPnL ratios are the true percentages on a real year and 0 on an empty one', () => {
    const p = product() // sp 2.50, upc 6
    const y = tiktokAnnualPnL(p, zeroTikTokFees, 100, 0)
    // 600 units × £2.50 = £1,500 GSV; no fees → NSV = GSV; GM = 1500 − 480 = 1020
    expect(y.gsv).toBeCloseTo(1500, 10)
    expect(y.nsvPctOfGsv).toBeCloseTo(1, 10)
    expect(y.gmPctOfNsv).toBeCloseTo(1020 / 1500, 10)
    expect(y.gmPctOfGsv).toBeCloseTo(1020 / 1500, 10)
    const empty = tiktokAnnualPnL(p, zeroTikTokFees, 0, 0)
    expect(empty.nsvPctOfGsv).toBe(0)
    expect(empty.gmPctOfNsv).toBe(0)
    expect(empty.gmPctOfGsv).toBe(0)
  })

  it('channel P&Ls report 0% ratios on an empty range and true ratios on a real one', () => {
    const amzEmpty = amazonChannelPnL([], () => zeroAmazonFees, 0, 0)
    expect(amzEmpty.nsvPctOfGsv).toBe(0)
    expect(amzEmpty.gmPctOfNsv).toBe(0)
    const ttkEmpty = tiktokChannelPnL([], zeroTikTokFees, 0)
    expect(ttkEmpty.nsvPctOfGsv).toBe(0)
    expect(ttkEmpty.gmPctOfNsv).toBe(0)

    const p = product({ channels: { amazonCasesPerYear: 100, tiktokCasesPerYear: 100 } })
    const amz = amazonChannelPnL([p], () => zeroAmazonFees, 0, 0)
    expect(amz.nsvPctOfGsv).toBeCloseTo(1, 10)
    expect(amz.gmPctOfNsv).toBeCloseTo(amz.gm / amz.nsv, 12)
    const ttk = tiktokChannelPnL([p], zeroTikTokFees, 0)
    expect(ttk.nsvPctOfGsv).toBeCloseTo(1, 10)
    expect(ttk.gmPctOfNsv).toBeCloseTo(ttk.gm / ttk.nsv, 12)
  })
})

// ── The Line-Up ───────────────────────────────────────────────────────────────

describe('crossChannelComparison', () => {
  const amazonFees = { referralFeePercent: 0.15, fulfilmentFeePerUnit: 0.5, monthlyStoragePerUnit: 0.1, fuelLogisticsSurcharge: 0 }
  const tiktokFees = { platformCommission: 0.09, affiliateCommission: 0.1, perOrderFee: 0.2, refundAdminPercent: 0.01 }

  it('each channel row mirrors its own calculator exactly', () => {
    const p = product()
    const c = crossChannelComparison(p, 0.35, amazonFees, tiktokFees, 0, 0.1)
    const grocery = retailerPnL(p, 0.35, 0, 0.1)
    const amazon = amazonFBAMargin(p, amazonFees, 0.1)
    const tiktok = tiktokShopMargin(p, tiktokFees, 0.1)
    expect(c.grocery.netRevenuePerUnit).toBe(grocery.brandNetRevenue)
    expect(c.grocery.grossProfitPerUnit).toBe(grocery.brandGrossMarginPerUnit)
    expect(c.grocery.grossMarginPercent).toBe(grocery.brandGrossMarginPercent)
    expect(c.amazon.netRevenuePerUnit).toBe(amazon.netRevenue)
    expect(c.amazon.grossProfitPerUnit).toBe(amazon.grossProfit)
    expect(c.tiktok.netRevenuePerUnit).toBe(tiktok.netRevenue)
    expect(c.tiktok.grossProfitPerUnit).toBe(tiktok.grossProfit)
    // Hand check on the grocery line: rsp £2.50, 35% margin → £1.625 to the
    // brand; landed 0.8 + 0.1 → margin £0.725
    expect(c.grocery.netRevenuePerUnit).toBeCloseTo(1.625, 10)
    expect(c.grocery.grossProfitPerUnit).toBeCloseTo(0.725, 10)
  })

  it('the grocery channel is labelled by route to market', () => {
    const p = product()
    expect(crossChannelComparison(p, 0.35, amazonFees, tiktokFees, 0).grocery.channel).toBe('UK Grocery')
    expect(crossChannelComparison(p, 0.35, amazonFees, tiktokFees, 0.12).grocery.channel).toBe('UK Grocery (via wholesaler)')
    const c = crossChannelComparison(p, 0.35, amazonFees, tiktokFees)
    expect(c.amazon.channel).toBe('Amazon FBA')
    expect(c.tiktok.channel).toBe('TikTok Shop')
  })
})

// ── The fee estimator: exact tier boundaries ──────────────────────────────────

describe('estimateAmazonFBAFee tier boundaries', () => {
  const first = AMAZON_SIZE_TIERS[0]
  const last = AMAZON_SIZE_TIERS[AMAZON_SIZE_TIERS.length - 1]

  it('dimensions exactly on the first tier’s maxima stay in the first tier', () => {
    const r = estimateAmazonFBAFee(first.maxWeightG, first.maxLongestCm, first.maxMedianCm, first.maxShortestCm)
    expect(r.tier).toBe(first.name)
    expect(r.fee).toBe(first.fee)
  })

  it('exceeding any single dimension bumps the item out of the tier', () => {
    const base = [first.maxWeightG, first.maxLongestCm, first.maxMedianCm, first.maxShortestCm] as const
    const bumped = [
      estimateAmazonFBAFee(base[0] + 1, base[1], base[2], base[3]),
      estimateAmazonFBAFee(base[0], base[1] + 1, base[2], base[3]),
      estimateAmazonFBAFee(base[0], base[1], base[2] + 1, base[3]),
      estimateAmazonFBAFee(base[0], base[1], base[2], base[3] + 1),
    ]
    for (const r of bumped) expect(r.tier).not.toBe(first.name)
  })

  it('nothing fits: the item is priced as oversize on the last tier', () => {
    const r = estimateAmazonFBAFee(1e9, 1e9, 1e9, 1e9)
    expect(r.tier).toBe(`${last.name} (oversize)`)
    expect(r.fee).toBe(last.fee)
  })
})

// ── Category rate lookups ─────────────────────────────────────────────────────

describe('category fee lookups', () => {
  it('every configured Amazon category returns its own referral rate', () => {
    for (const c of AMAZON_CATEGORY_FEES) {
      expect(getAmazonReferralRate(c.category)).toBe(c.referralPercent)
    }
    expect(getAmazonReferralRate('No such aisle')).toBe(0.15)
  })

  it('every configured TikTok category returns its own commission', () => {
    for (const c of TIKTOK_CATEGORY_FEES) {
      expect(getTikTokCommission(c.category)).toBe(c.commissionPercent)
    }
    expect(getTikTokCommission('No such aisle')).toBe(0.09)
  })
})

// ── Number formatting ─────────────────────────────────────────────────────────

describe('formatNumber', () => {
  it('groups thousands in en-GB style and honours the decimals argument', () => {
    expect(formatNumber(1234567.891)).toBe('1,234,568')
    expect(formatNumber(1234567.891, 2)).toBe('1,234,567.89')
    expect(formatNumber(0)).toBe('0')
  })
})

describe('formatGBP zero boundary', () => {
  it('zero is £0.00 with no minus sign', () => {
    expect(formatGBP(0)).toBe('£0.00')
  })
})
