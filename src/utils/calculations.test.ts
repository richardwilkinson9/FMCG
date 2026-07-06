import { describe, it, expect } from 'vitest'
import type { Product } from '../types/product'
import {
  exVat,
  rspExVat,
  costPerCase,
  retailerPnL,
  solveForCostPrice,
  solveForRrp,
  weeklyProjection,
  listingModel,
  promoUpliftForWeek,
  promoFundingRateForWeek,
  promoDiscountForWeek,
  tradeSpendROI,
  stockLedger,
  amazonFBAMargin,
  tiktokShopMargin,
  amazonAnnualPnL,
  tiktokAnnualPnL,
  amazonChannelPnL,
  tiktokChannelPnL,
  channelListed,
  skuCasesPerYear,
  logisticsPerUnit,
  investmentForWeek,
  investmentInPeriod,
  monthlyPhasing,
  cashPhasing,
  estimateAmazonFBAFee,
  type PromoWindow,
  type AmazonFBAFees,
  type TikTokFees,
} from './calculations'

/**
 * THE MATHS IS SACRED. Every expected value below was computed BY HAND,
 * independently of the implementation. If a change makes one of these fail,
 * the change is wrong — not the test. Do not "update the expected value"
 * without redoing the arithmetic on paper.
 */

// The demo product from the GROSS design references
const volt: Product = {
  id: 'v1',
  name: 'VOLT 250ml',
  cogsPerUnit: 0.32,
  unitsPerCase: 24,
  rrpIncVat: 1.5,
  vatRate: 0.2,
  weeklyRateOfSale: 10,
}

describe('VAT and per-case basics', () => {
  it('strips VAT', () => {
    // 1.50 / 1.2 = 1.25
    expect(exVat(1.5, 0.2)).toBeCloseTo(1.25, 10)
    expect(rspExVat(volt)).toBeCloseTo(1.25, 10)
    // zero-rated food: unchanged
    expect(exVat(2.0, 0)).toBe(2.0)
  })

  it('cost per case', () => {
    expect(costPerCase(volt)).toBeCloseTo(0.32 * 24, 10) // 7.68
  })
})

describe('retailerPnL — the grocery chain', () => {
  it('direct to retailer at 35%', () => {
    const r = retailerPnL(volt, 0.35, 0)
    // shelf ex-VAT 1.25; retailer takes 35% = 0.4375; brand banks 0.8125
    expect(r.rspExVat).toBeCloseTo(1.25, 10)
    expect(r.retailerMarginPerUnit).toBeCloseTo(0.4375, 10)
    expect(r.brandNetRevenue).toBeCloseTo(0.8125, 10)
    // GM = 0.8125 − 0.32 = 0.4925; % of net = 0.4925/0.8125 = 0.606153…
    expect(r.brandGrossMarginPerUnit).toBeCloseTo(0.4925, 10)
    expect(r.brandGrossMarginPercent).toBeCloseTo(0.4925 / 0.8125, 10)
    expect(r.marginPerCase).toBeCloseTo(0.4925 * 24, 10) // 11.82
    expect(r.revenuePerCase).toBeCloseTo(0.8125 * 24, 10) // 19.50
  })

  it('via a wholesaler at 25%', () => {
    const r = retailerPnL(volt, 0.35, 0.25)
    // retailer pays 0.8125; wholesaler takes 25% of that = 0.203125; brand banks 0.609375
    expect(r.wholesalerMarginPerUnit).toBeCloseTo(0.203125, 10)
    expect(r.brandNetRevenue).toBeCloseTo(0.609375, 10)
    expect(r.brandGrossMarginPerUnit).toBeCloseTo(0.609375 - 0.32, 10)
  })

  it('zero net revenue does not divide by zero', () => {
    const r = retailerPnL(volt, 1.0, 0)
    expect(r.brandNetRevenue).toBeCloseTo(0, 10)
    expect(r.brandGrossMarginPercent).toBe(0)
  })
})

describe('solvers — The Floor', () => {
  it('solveForCostPrice inverts the chain', () => {
    // rsp 1.25 → cost to retailer 0.8125 → at 30% target brand margin,
    // required COGS = 0.8125 × 0.7 = 0.56875
    const s = solveForCostPrice(1.5, 0.2, 0.35, 0.3, 0)
    expect(s.requiredCogs).toBeCloseTo(0.56875, 10)
  })

  it('solveForRrp round-trips solveForCostPrice', () => {
    const s = solveForRrp(0.32, 0.2, 0.35, 0.3, 0.25)
    // Feed the answer back: the required COGS at that RRP must be 0.32
    const back = solveForCostPrice(s.rrpIncVat, 0.2, 0.35, 0.3, 0.25)
    expect(back.requiredCogs).toBeCloseTo(0.32, 10)
  })
})

describe('the promo calendar', () => {
  const promos: PromoWindow[] = [
    { startWeek: 9, weeks: 6, uplift: 0.65, discount: 0.25, supplierFunded: true },
    { startWeek: 35, weeks: 6, uplift: 0.5, discount: 0.2, supplierFunded: false },
  ]

  it('helpers read the calendar', () => {
    expect(promoUpliftForWeek(promos, 8)).toBe(0)
    expect(promoUpliftForWeek(promos, 9)).toBeCloseTo(0.65, 10)
    expect(promoUpliftForWeek(promos, 14)).toBeCloseTo(0.65, 10) // last week (9+6-1)
    expect(promoUpliftForWeek(promos, 15)).toBe(0)
    // only supplier-funded promos deduct off invoice
    expect(promoFundingRateForWeek(promos, 9)).toBeCloseTo(0.25, 10)
    expect(promoFundingRateForWeek(promos, 35)).toBe(0)
    // the shopper gets the cut either way
    expect(promoDiscountForWeek(promos, 35)).toBeCloseTo(0.2, 10)
  })

  it('overlapping promos stack (matches the deck SUMPRODUCT)', () => {
    const overlap: PromoWindow[] = [
      { startWeek: 1, weeks: 4, uplift: 0.5, discount: 0.2, supplierFunded: true },
      { startWeek: 3, weeks: 4, uplift: 0.3, discount: 0.1, supplierFunded: true },
    ]
    expect(promoUpliftForWeek(overlap, 3)).toBeCloseTo(0.8, 10)
    expect(promoFundingRateForWeek(overlap, 3)).toBeCloseTo(0.3, 10)
  })

  it('weekly projection: GSV/funding/NSV/GM, hand-checked totals', () => {
    const inputs = { stores: 500, skus: 1, weeksInPeriod: 52, promos }
    const m = listingModel(volt, 0.35, inputs, 0)
    // base 5,000/wk; promo1 8,250 ×6; promo2 7,500 ×6; 40 base weeks
    const vol = 40 * 5000 + 6 * 8250 + 6 * 7500 // 294,500
    expect(m.totalVolume).toBeCloseTo(vol, 6)
    const list = 0.8125
    expect(m.totalGsv).toBeCloseTo(vol * list, 6) // 239,281.25
    // only promo1 funded: 6 × 8,250 × 0.8125 × 0.25 = 10,054.6875
    expect(m.totalFunding).toBeCloseTo(10054.6875, 6)
    expect(m.totalNsv).toBeCloseTo(vol * list - 10054.6875, 6)
    expect(m.totalGrossMargin).toBeCloseTo(m.totalNsv - vol * 0.32, 6)
    expect(m.nsvPctOfGsv).toBeCloseTo(m.totalNsv / m.totalGsv, 10)
    expect(m.totalCases).toBeCloseTo(vol / 24, 6)
  })

  it('promo summaries attribute incremental units and funding', () => {
    const inputs = { stores: 500, skus: 1, weeksInPeriod: 52, promos }
    const m = listingModel(volt, 0.35, inputs, 0)
    expect(m.promoSummaries[0].incrementalUnits).toBeCloseTo(6 * 5000 * 0.65, 6) // 19,500
    expect(m.promoSummaries[0].fundingCost).toBeCloseTo(10054.6875, 6)
    expect(m.promoSummaries[1].fundingCost).toBe(0) // retailer funded
  })

  it('a promo hanging off the calendar is clipped', () => {
    const clipped: PromoWindow[] = [{ startWeek: 50, weeks: 6, uplift: 0.5, discount: 0.2, supplierFunded: true }]
    const m = listingModel(volt, 0.35, { stores: 500, skus: 1, weeksInPeriod: 52, promos: clipped }, 0)
    expect(m.promoSummaries[0].weeksInPeriod).toBe(3) // weeks 50, 51, 52
    expect(m.promoSummaries[0].clamped).toBe(true)
  })

  it('no promos: GSV = NSV', () => {
    const m = listingModel(volt, 0.35, { stores: 500, skus: 1, weeksInPeriod: 52, promos: [] }, 0)
    expect(m.totalGsv).toBeCloseTo(m.totalNsv, 10)
    expect(m.totalVolume).toBeCloseTo(52 * 5000, 6)
  })

  it('weeklyProjection cumulative columns agree with the totals', () => {
    const inputs = { stores: 500, skus: 1, weeksInPeriod: 52, promos }
    const weeks = weeklyProjection(volt, 0.35, inputs, 0)
    const last = weeks[weeks.length - 1]
    const sumGsv = weeks.reduce((a, w) => a + w.gsv, 0)
    expect(last.cumulativeGsv).toBeCloseTo(sumGsv, 6)
    expect(last.cumulativeNsv).toBeCloseTo(weeks.reduce((a, w) => a + w.nsv, 0), 6)
  })
})

describe('tradeSpendROI — The Payback', () => {
  it('break-even units = investment / margin per unit', () => {
    const r = tradeSpendROI(volt, 0.35, 10000, 2.0, 0)
    // margin/unit 0.4925 → 10,000 / 0.4925 = 20,304.568…
    expect(r.breakEvenUnits).toBeCloseTo(10000 / 0.4925, 6)
    expect(r.targetReturnUnits).toBeCloseTo(30000 / 0.4925, 6)
    expect(r.breakEvenCases).toBeCloseTo(10000 / 0.4925 / 24, 6)
  })

  it('no margin → Infinity, not a crash', () => {
    const r = tradeSpendROI({ ...volt, cogsPerUnit: 5 }, 0.35, 10000, 2.0, 0)
    expect(r.breakEvenUnits).toBe(Infinity)
  })
})

describe('stockLedger — The Stock Answer', () => {
  it('flat demand, no starting stock: orders cover lead + cover in whole cases', () => {
    const demand = new Array(10).fill(100)
    const plan = stockLedger(demand, 500, 2, 2, 24)
    // Demand is met until stock runs out; every order is a whole number of cases
    for (const row of plan.rows) {
      expect(row.orderPlaced % 24).toBe(0)
      expect(row.closing).toBeGreaterThanOrEqual(0)
    }
    // conservation: start + arrivals = consumed + closing + unmet backstop
    const totalArrived = plan.rows.reduce((a, r) => a + r.arrivals, 0)
    const consumed = plan.rows.reduce((a, r) => a + (r.demand - r.shortfall), 0)
    expect(500 + totalArrived - consumed).toBeCloseTo(plan.endingStock, 6)
  })

  it('starving lead time causes recorded stockouts', () => {
    const plan = stockLedger(new Array(8).fill(1000), 500, 4, 0, 1)
    expect(plan.stockoutWeeks).toBeGreaterThan(0)
    expect(plan.lostUnits).toBeGreaterThan(0)
  })
})

const amazonFees: AmazonFBAFees = {
  referralFeePercent: 0.15,
  fulfilmentFeePerUnit: 0.1,
  monthlyStoragePerUnit: 0.02,
  fuelLogisticsSurcharge: 0.015,
}

const tiktokFees: TikTokFees = {
  platformCommission: 0.09,
  affiliateCommission: 0.05,
  perOrderFee: 0.3,
  refundAdminPercent: 0.01,
}

describe('marketplace per-unit margins', () => {
  it('amazonFBAMargin hand-check', () => {
    const r = amazonFBAMargin(volt, amazonFees)
    // sp 1.25; referral 0.1875; fulfilment 0.1×1.015 = 0.1015; storage 0.02
    expect(r.referralFee).toBeCloseTo(0.1875, 10)
    expect(r.fulfilmentFee).toBeCloseTo(0.1015, 10)
    const totalFees = 0.1875 + 0.1015 + 0.02
    expect(r.totalFees).toBeCloseTo(totalFees, 10)
    expect(r.netRevenue).toBeCloseTo(1.25 - totalFees, 10)
    expect(r.grossProfit).toBeCloseTo(1.25 - totalFees - 0.32, 10)
    expect(r.netPctOfGross).toBeCloseTo((1.25 - totalFees) / 1.25, 10)
  })

  it('tiktokShopMargin hand-check', () => {
    const r = tiktokShopMargin(volt, tiktokFees)
    // platform 0.1125, affiliate 0.0625, refund 0.0125, order 0.30 → 0.4875
    expect(r.totalFees).toBeCloseTo(0.1125 + 0.0625 + 0.0125 + 0.3, 10)
    expect(r.netRevenue).toBeCloseTo(1.25 - 0.4875, 10)
    expect(r.grossProfit).toBeCloseTo(1.25 - 0.4875 - 0.32, 10)
  })
})

describe('full-year marketplace P&L', () => {
  it('amazonAnnualPnL: 250 cases hand-check', () => {
    const y = amazonAnnualPnL(volt, amazonFees, 25, 250)
    expect(y.units).toBe(6000)
    expect(y.gsv).toBeCloseTo(6000 * 1.25, 6) // 7,500
    expect(y.referral).toBeCloseTo(7500 * 0.15, 6) // 1,125
    expect(y.fulfilment).toBeCloseTo(6000 * 0.1015, 6) // 609
    expect(y.storage).toBeCloseTo(6000 * 0.02, 6) // 120
    expect(y.plan).toBe(300) // £25 × 12, charged for real
    const nsv = 7500 - 1125 - 609 - 120 - 300
    expect(y.nsv).toBeCloseTo(nsv, 6)
    expect(y.cogs).toBeCloseTo(1920, 6)
    expect(y.gm).toBeCloseTo(nsv - 1920, 6)
    expect(y.nsvPctOfGsv).toBeCloseTo(nsv / 7500, 10)
    expect(y.gmPctOfNsv).toBeCloseTo((nsv - 1920) / nsv, 10)
  })

  it('tiktokAnnualPnL: 250 cases hand-check', () => {
    const y = tiktokAnnualPnL(volt, tiktokFees, 250)
    // gsv 7,500; platform 675; affiliate 375; orders 1,800; refunds 75
    expect(y.totalFees).toBeCloseTo(675 + 375 + 1800 + 75, 6)
    expect(y.nsv).toBeCloseTo(7500 - 2925, 6) // 4,575
    expect(y.gm).toBeCloseTo(4575 - 1920, 6) // 2,655
  })
})

describe('channels — membership + whole-channel P&L', () => {
  const withChannels = (over: Product['channels']): Product => ({ ...volt, id: Math.random().toString(), channels: over })

  it('absent channels = listed everywhere with default volume', () => {
    expect(channelListed(volt, 'amazon')).toBe(true)
    expect(channelListed(withChannels({ amazon: false }), 'amazon')).toBe(false)
    expect(skuCasesPerYear(volt, 'amazon')).toBe(250)
    expect(skuCasesPerYear(withChannels({ amazonCasesPerYear: 40 }), 'amazon')).toBe(40)
  })

  it('amazonChannelPnL: plan charged once, delisted SKU excluded, logistics summed', () => {
    const a = withChannels({ amazonCasesPerYear: 250 })
    const b: Product = { ...volt, id: 'b', name: 'B', cogsPerUnit: 0.4, rrpIncVat: 2.0, unitsPerCase: 12, channels: { amazonCasesPerYear: 100 } }
    const c = withChannels({ amazon: false })
    const ch = amazonChannelPnL([a, b, c], () => amazonFees, 25, 2)
    expect(ch.skuCount).toBe(2)
    // GSV: A 6,000 × 1.25 + B 1,200 × (2/1.2)
    const gsv = 6000 * 1.25 + 1200 * (2 / 1.2)
    expect(ch.gsv).toBeCloseTo(gsv, 6)
    expect(ch.plan).toBe(300) // once, not per SKU
    expect(ch.logistics).toBeCloseTo((250 + 100) * 2, 6)
    // GM = sum of per-SKU GM (no plan, no freight) − channel plan − freight:
    // 350 cases × £2 = £700 of landed cost inside the margin
    const yA = amazonAnnualPnL(a, amazonFees, 0, 250)
    const yB = amazonAnnualPnL(b, amazonFees, 0, 100)
    expect(ch.gm).toBeCloseTo(yA.gm + yB.gm - 300 - 700, 6)
  })

  it('tiktokChannelPnL aggregates listed SKUs', () => {
    const a = withChannels({ tiktokCasesPerYear: 250 })
    const c = withChannels({ tiktok: false })
    const ch = tiktokChannelPnL([a, c], tiktokFees, 0)
    expect(ch.skuCount).toBe(1)
    const y = tiktokAnnualPnL(a, tiktokFees, 250)
    expect(ch.gm).toBeCloseTo(y.gm, 6)
  })
})

describe('logistics — landed cost inside the margin', () => {
  it('spreads £/case across the units', () => {
    expect(logisticsPerUnit(3, 24)).toBeCloseTo(0.125, 10)
    expect(logisticsPerUnit(3, 0)).toBe(0) // no division by zero
  })

  it('retailerPnL folds freight into gross margin', () => {
    // £3/case ÷ 24 units = £0.125/unit. Net revenue 0.8125;
    // landed cost 0.32 + 0.125 = 0.445; GM = 0.8125 − 0.445 = 0.3675
    const r = retailerPnL(volt, 0.35, 0, 0.125)
    expect(r.logisticsPerUnit).toBeCloseTo(0.125, 10)
    expect(r.landedCostPerUnit).toBeCloseTo(0.445, 10)
    expect(r.brandGrossMarginPerUnit).toBeCloseTo(0.3675, 10)
    expect(r.brandGrossMarginPercent).toBeCloseTo(0.3675 / 0.8125, 10)
  })

  it('solveForCostPrice leaves room for the freight', () => {
    // landed room = 0.8125 × 0.7 = 0.56875; COGS ceiling = 0.56875 − 0.125 = 0.44375
    const s = solveForCostPrice(1.5, 0.2, 0.35, 0.3, 0, 0.125)
    expect(s.requiredCogs).toBeCloseTo(0.44375, 10)
  })

  it('solveForRrp round-trips with freight in the chain', () => {
    const s = solveForRrp(0.32, 0.2, 0.35, 0.3, 0.25, 0.125)
    const back = solveForCostPrice(s.rrpIncVat, 0.2, 0.35, 0.3, 0.25, 0.125)
    expect(back.requiredCogs).toBeCloseTo(0.32, 10)
  })

  it('amazonAnnualPnL charges freight per case inside GM', () => {
    // Same numbers as the 250-case hand-check, plus 250 × £2 = £500 of freight
    const plain = amazonAnnualPnL(volt, amazonFees, 25, 250)
    const y = amazonAnnualPnL(volt, amazonFees, 25, 250, 2)
    expect(y.logistics).toBeCloseTo(500, 6)
    expect(y.nsv).toBeCloseTo(plain.nsv, 6) // freight is not a fee — NSV holds
    expect(y.gm).toBeCloseTo(plain.gm - 500, 6)
  })
})

describe('customer investment — fixed cash, quarterly instalments', () => {
  it('pays £/4 at weeks 1, 14, 27, 40 and nothing between', () => {
    expect(investmentForWeek(10000, 1)).toBeCloseTo(2500, 10)
    expect(investmentForWeek(10000, 2)).toBe(0)
    expect(investmentForWeek(10000, 13)).toBe(0)
    expect(investmentForWeek(10000, 14)).toBeCloseTo(2500, 10)
    expect(investmentForWeek(10000, 27)).toBeCloseTo(2500, 10)
    expect(investmentForWeek(10000, 40)).toBeCloseTo(2500, 10)
    expect(investmentForWeek(10000, 52)).toBe(0)
    expect(investmentForWeek(10000, 53)).toBeCloseTo(2500, 10) // year 2, Q1
    expect(investmentForWeek(0, 1)).toBe(0)
  })

  it('counts the instalments inside the period', () => {
    expect(investmentInPeriod(10000, 52)).toBeCloseTo(10000, 10) // 4 payments
    expect(investmentInPeriod(10000, 26)).toBeCloseTo(5000, 10) // weeks 1 and 14
    expect(investmentInPeriod(10000, 13)).toBeCloseTo(2500, 10) // week 1 only
    expect(investmentInPeriod(10000, 104)).toBeCloseTo(20000, 10) // 8 payments over 2 years
  })

  it('listingModel deducts it below gross margin', () => {
    const inputs = { stores: 500, skus: 1, weeksInPeriod: 52, promos: [] }
    const plain = listingModel(volt, 0.35, inputs, 0, 0)
    const withInv = listingModel(volt, 0.35, inputs, 0, 0, 10000)
    expect(withInv.totalGrossMargin).toBeCloseTo(plain.totalGrossMargin, 6) // GM untouched
    expect(withInv.totalInvestment).toBeCloseTo(10000, 6)
    expect(withInv.marginAfterInvestment).toBeCloseTo(plain.totalGrossMargin - 10000, 6)
  })
})

describe('monthly phasing — the 4-4-5 calendar', () => {
  const inputs = { stores: 500, skus: 1, weeksInPeriod: 52, promos: [] }

  it('rolls 52 weeks into 12 months of 4-4-5 and reconciles to the year', () => {
    // Base weekly volume 500 × 10 = 5,000; GM/unit (no logistics) = 0.4925
    const weeks = weeklyProjection(volt, 0.35, inputs, 0, 0)
    const months = monthlyPhasing(weeks, 10000)
    expect(months).toHaveLength(12)
    // M1 = weeks 1–4: 20,000 units; M3 = weeks 9–13 (5 weeks): 25,000 units
    expect(months[0].weekStart).toBe(1); expect(months[0].weekEnd).toBe(4)
    expect(months[2].weekStart).toBe(9); expect(months[2].weekEnd).toBe(13)
    expect(months[11].weekEnd).toBe(52)
    expect(months[0].volume).toBeCloseTo(20000, 6)
    expect(months[2].volume).toBeCloseTo(25000, 6)
    expect(months[0].grossMargin).toBeCloseTo(20000 * 0.4925, 6) // 9,850
    // Quarterly instalments land in M1, M4, M7, M10 (weeks 1, 14, 27, 40)
    const invByMonth = months.map((m) => m.investment)
    expect(invByMonth).toEqual([2500, 0, 0, 2500, 0, 0, 2500, 0, 0, 2500, 0, 0])
    expect(months[0].netOfInvestment).toBeCloseTo(9850 - 2500, 6)
    // The 12 months must sum exactly to the annual plan
    const lm = listingModel(volt, 0.35, inputs, 0, 0, 10000)
    expect(months.reduce((a, m) => a + m.gsv, 0)).toBeCloseTo(lm.totalGsv, 6)
    expect(months.reduce((a, m) => a + m.grossMargin, 0)).toBeCloseTo(lm.totalGrossMargin, 6)
    expect(months.reduce((a, m) => a + m.investment, 0)).toBeCloseTo(lm.totalInvestment, 6)
  })

  it('a short projection leaves the tail months empty but keeps the instalment calendar', () => {
    const weeks = weeklyProjection(volt, 0.35, { ...inputs, weeksInPeriod: 26 }, 0, 0)
    const months = monthlyPhasing(weeks, 10000)
    expect(months[5].volume).toBeCloseTo(5000 * 5, 6) // M6 = weeks 22–26, still inside
    expect(months[6].volume).toBe(0) // M7 starts at week 27 — past the period
    expect(months[6].investment).toBeCloseTo(2500, 6) // the Q3 instalment still falls there
  })
})

describe('the wait — cash phasing', () => {
  const inputs = { stores: 500, skus: 1, weeksInPeriod: 4, promos: [] }
  // 4 flat weeks: volume 5,000/wk; NSV/wk = 5,000 × 0.8125 = 4,062.50;
  // goods cost/wk = 5,000 × 0.32 = 1,600 (no logistics)

  it('lags cash in by debtor weeks and cash out by creditor weeks', () => {
    const weeks = weeklyProjection(volt, 0.35, inputs, 0, 0)
    // 28 days in, 7 days out → lagIn 4 weeks, lagOut 1 week
    const flow = cashPhasing(weeks, volt, 28, 7, 0, 0)
    expect(flow.rows).toHaveLength(8) // 4 sales weeks + 4-week tail
    expect(flow.rows[0].cashIn).toBe(0) // week 1: nothing in yet
    expect(flow.rows[0].cashOut).toBe(0) // week 1: supplier not yet paid
    expect(flow.rows[1].cashOut).toBeCloseTo(1600, 6) // week 2: pay for week 1 goods
    expect(flow.rows[4].cashIn).toBeCloseTo(4062.5, 6) // week 5: week 1 NSV lands
    // Worst point: all four goods bills paid, no cash in yet (end of week 5 the
    // first NSV has landed, so the trough is week 4–5 boundary)
    expect(flow.peakGap).toBeCloseTo(-(1600 * 3), 6) // weeks 2–4 paid out, nothing in
    expect(flow.totalIn).toBeCloseTo(4062.5 * 4, 6)
    expect(flow.totalOut).toBeCloseTo(1600 * 4, 6)
  })

  it('same-day terms mean no gap on a profitable line', () => {
    const weeks = weeklyProjection(volt, 0.35, inputs, 0, 0)
    const flow = cashPhasing(weeks, volt, 0, 0, 0, 0)
    expect(flow.peakGap).toBe(0)
    expect(flow.rows[0].net).toBeCloseTo(4062.5 - 1600, 6)
  })

  it('investment instalments leave in their calendar weeks', () => {
    const weeks = weeklyProjection(volt, 0.35, inputs, 0, 0)
    const flow = cashPhasing(weeks, volt, 0, 0, 0, 10000)
    expect(flow.rows[0].cashOut).toBeCloseTo(1600 + 2500, 6) // week 1 instalment
    expect(flow.rows[1].cashOut).toBeCloseTo(1600, 6)
  })
})

describe('Ledger 001 — published figures', () => {
  it('break-even margin at the downside is 48p', () => {
    expect((15000 / 52) / (2 * 300)).toBeCloseTo(0.48077, 5)
  })

  it('The Floor round-trips the declared COGS', () => {
    const { requiredCogs } = solveForCostPrice(2.50, 0, 0.448, 0.348)
    expect(requiredCogs).toBeCloseTo(0.89976, 4)
  })

  it('45% retailer margin fails the 48p floor', () => {
    expect(2.50 * 0.55 - 0.90).toBeLessThan(0.48077)
  })

  it('the doubling law is exactly inverse', () => {
    const be = (m: number) => (15000 / 52) / (m * 300)
    expect(be(0.30) / be(0.60)).toBeCloseTo(2, 10)
  })
})

describe('Amazon fee estimator', () => {
  it('picks the smallest tier that fits and falls through to oversize', () => {
    expect(estimateAmazonFBAFee(50, 20, 10, 2).tier).toBe('Small envelope')
    expect(estimateAmazonFBAFee(200, 20, 10, 5).fee).toBeGreaterThan(0)
    expect(estimateAmazonFBAFee(99999, 999, 999, 999).tier).toContain('oversize')
  })
})
