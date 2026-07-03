import type { Product } from '../types/product'

/**
 * Core commercial maths derived from the Product spine.
 * These are pure functions — no side effects, easy to test.
 */

/** Strip VAT from a VAT-inclusive price */
export function exVat(incVat: number, vatRate: number): number {
  return incVat / (1 + vatRate)
}

/** Retailer selling price excluding VAT */
export function rspExVat(product: Product): number {
  return exVat(product.rrpIncVat, product.vatRate)
}

/** Cost price per case */
export function costPerCase(product: Product): number {
  return product.cogsPerUnit * product.unitsPerCase
}

/**
 * Retailer P&L breakdown, optionally via a wholesaler.
 *
 * Chain: Consumer pays RSP inc VAT
 *   → Retailer takes their margin on RSP ex-VAT
 *   → (if wholesaler) Wholesaler takes their margin on what the retailer pays
 *   → Brand receives the remainder
 *
 * wholesalerMarginPercent = 0 means selling direct to retailer (no wholesaler).
 */
export function retailerPnL(product: Product, retailerMarginPercent: number, wholesalerMarginPercent = 0) {
  const rsp = rspExVat(product)
  const costToRetailer = rsp * (1 - retailerMarginPercent)
  const retailerMarginPerUnit = rsp - costToRetailer

  const wholesalerMarginPerUnit = costToRetailer * wholesalerMarginPercent
  const costToWholesaler = costToRetailer - wholesalerMarginPerUnit

  const brandNetRevenue = costToWholesaler
  const brandGrossMarginPerUnit = brandNetRevenue - product.cogsPerUnit
  const brandGrossMarginPercent = brandNetRevenue > 0
    ? brandGrossMarginPerUnit / brandNetRevenue
    : 0

  return {
    rspExVat: rsp,
    costToRetailer,
    retailerMarginPerUnit,
    retailerMarginPercent,
    wholesalerMarginPerUnit,
    wholesalerMarginPercent,
    costToWholesaler,
    brandNetRevenue,
    brandGrossMarginPerUnit,
    brandGrossMarginPercent,
    revenuePerCase: brandNetRevenue * product.unitsPerCase,
    marginPerCase: brandGrossMarginPerUnit * product.unitsPerCase,
  }
}

/**
 * Minimum margin calculator — solve backwards.
 * Given target retailer margin % and target brand margin %,
 * find the required cost price or RRP.
 */
export function solveForCostPrice(
  rrpIncVat: number,
  vatRate: number,
  retailerMarginPercent: number,
  targetBrandMarginPercent: number,
  wholesalerMarginPercent = 0,
) {
  const rsp = exVat(rrpIncVat, vatRate)
  const costToRetailer = rsp * (1 - retailerMarginPercent)
  const costToWholesaler = costToRetailer * (1 - wholesalerMarginPercent)
  const requiredCogs = costToWholesaler * (1 - targetBrandMarginPercent)
  return { requiredCogs, costToRetailer, costToWholesaler, rspExVat: rsp }
}

export function solveForRrp(
  cogsPerUnit: number,
  vatRate: number,
  retailerMarginPercent: number,
  targetBrandMarginPercent: number,
  wholesalerMarginPercent = 0,
) {
  const costToWholesaler = cogsPerUnit / (1 - targetBrandMarginPercent)
  const costToRetailer = costToWholesaler / (1 - wholesalerMarginPercent)
  const rsp = costToRetailer / (1 - retailerMarginPercent)
  const rrpIncVat = rsp * (1 + vatRate)
  return { rrpIncVat, costToRetailer, costToWholesaler, rspExVat: rsp }
}

/**
 * Retailer listing model — project revenue, volume and margin over a period,
 * week by week, with the promotion placed as a block at a chosen start week.
 */
export interface ListingModelInputs {
  stores: number
  skus: number
  weeksInPeriod: number
  promoWeeks: number
  promoStartWeek: number
  promoUpliftPercent: number
}

export interface WeeklyProjectionRow {
  week: number
  onPromo: boolean
  volume: number
  revenue: number
  grossMargin: number
  cumulativeVolume: number
  cumulativeRevenue: number
  cumulativeMargin: number
}

export function weeklyProjection(
  product: Product,
  retailerMarginPercent: number,
  inputs: ListingModelInputs,
  wholesalerMarginPercent = 0,
): WeeklyProjectionRow[] {
  const pnl = retailerPnL(product, retailerMarginPercent, wholesalerMarginPercent)
  const baseWeeklyVolume = product.weeklyRateOfSale * inputs.stores * inputs.skus

  const rows: WeeklyProjectionRow[] = []
  let cumulativeVolume = 0
  let cumulativeRevenue = 0
  let cumulativeMargin = 0

  for (let week = 1; week <= inputs.weeksInPeriod; week++) {
    const onPromo =
      week >= inputs.promoStartWeek && week < inputs.promoStartWeek + inputs.promoWeeks
    const volume = baseWeeklyVolume * (onPromo ? 1 + inputs.promoUpliftPercent : 1)
    const revenue = volume * pnl.brandNetRevenue
    const grossMargin = volume * pnl.brandGrossMarginPerUnit

    cumulativeVolume += volume
    cumulativeRevenue += revenue
    cumulativeMargin += grossMargin

    rows.push({ week, onPromo, volume, revenue, grossMargin, cumulativeVolume, cumulativeRevenue, cumulativeMargin })
  }
  return rows
}

/** Period totals, derived from the weekly projection so the two always agree. */
export function listingModel(product: Product, retailerMarginPercent: number, inputs: ListingModelInputs, wholesalerMarginPercent = 0) {
  const weeks = weeklyProjection(product, retailerMarginPercent, inputs, wholesalerMarginPercent)
  const last = weeks[weeks.length - 1]
  const baseWeeklyVolume = product.weeklyRateOfSale * inputs.stores * inputs.skus

  return {
    totalVolume: last?.cumulativeVolume ?? 0,
    totalRevenue: last?.cumulativeRevenue ?? 0,
    totalGrossMargin: last?.cumulativeMargin ?? 0,
    totalCases: (last?.cumulativeVolume ?? 0) / product.unitsPerCase,
    weeklyVolume: baseWeeklyVolume,
    promoWeeklyVolume: baseWeeklyVolume * (1 + inputs.promoUpliftPercent),
    weeks,
  }
}

/**
 * Trade spend ROI — how much incremental volume to break even / hit target ROI.
 */
export function tradeSpendROI(
  product: Product,
  retailerMarginPercent: number,
  investment: number,
  targetROI: number,
  wholesalerMarginPercent = 0,
) {
  const pnl = retailerPnL(product, retailerMarginPercent, wholesalerMarginPercent)
  const marginPerUnit = pnl.brandGrossMarginPerUnit

  const breakEvenUnits = marginPerUnit > 0 ? investment / marginPerUnit : Infinity
  const targetReturnUnits = marginPerUnit > 0
    ? (investment * (1 + targetROI)) / marginPerUnit
    : Infinity

  return {
    breakEvenUnits,
    breakEvenCases: breakEvenUnits / product.unitsPerCase,
    targetReturnUnits,
    targetReturnCases: targetReturnUnits / product.unitsPerCase,
    marginPerUnit,
    marginPerCase: marginPerUnit * product.unitsPerCase,
  }
}

/**
 * Weekly stock ledger — a supply plan driven by the weekly demand projection
 * (so promo spikes pull orders forward, which is exactly when stockouts happen).
 *
 * Policy: order-up-to. Each week, if stock on hand plus stock already on order
 * won't cover demand over the lead time, place an order that tops the position
 * up to cover the next (lead time + weeks of cover), rounded up to whole cases.
 */
export interface StockWeekRow {
  week: number
  demand: number
  opening: number
  arrivals: number
  orderPlaced: number
  closing: number
  /** Demand that couldn't be met from stock this week */
  shortfall: number
}

export function stockLedger(
  weeklyDemand: number[],
  startingStock: number,
  leadWeeks: number,
  coverWeeks: number,
  unitsPerCase: number,
) {
  const n = weeklyDemand.length
  const orders = new Array<number>(n).fill(0)
  const rows: StockWeekRow[] = []

  const demandBetween = (from: number, to: number) => {
    let sum = 0
    for (let i = from; i <= Math.min(to, n - 1); i++) sum += weeklyDemand[i]
    return sum
  }

  let opening = startingStock
  let pipeline = 0 // ordered but not yet arrived

  for (let w = 0; w < n; w++) {
    const arrivals = w - leadWeeks >= 0 ? orders[w - leadWeeks] : 0
    pipeline -= arrivals

    const available = opening + arrivals
    const demand = weeklyDemand[w]
    const shortfall = Math.max(0, demand - available)
    const closing = Math.max(0, available - demand)

    // Reorder check: will on-hand + on-order cover the lead time?
    const leadTimeDemand = demandBetween(w + 1, w + leadWeeks)
    let orderPlaced = 0
    if (closing + pipeline < leadTimeDemand) {
      const target = demandBetween(w + 1, w + leadWeeks + coverWeeks)
      const rawQty = Math.max(0, target - closing - pipeline)
      orderPlaced = unitsPerCase > 0 ? Math.ceil(rawQty / unitsPerCase) * unitsPerCase : rawQty
      orders[w] = orderPlaced
      pipeline += orderPlaced
    }

    rows.push({ week: w + 1, demand, opening, arrivals, orderPlaced, closing, shortfall })
    opening = closing
  }

  const totalOrdered = orders.reduce((a, b) => a + b, 0)
  return {
    rows,
    totalOrdered,
    totalOrderedCases: unitsPerCase > 0 ? totalOrdered / unitsPerCase : 0,
    orderCount: orders.filter((o) => o > 0).length,
    stockoutWeeks: rows.filter((r) => r.shortfall > 0).length,
    lostUnits: rows.reduce((a, r) => a + r.shortfall, 0),
    peakStock: Math.max(...rows.map((r) => r.closing), startingStock),
    endingStock: rows[n - 1]?.closing ?? startingStock,
  }
}

/**
 * Amazon FBA margin calculator.
 */
export interface AmazonFBAFees {
  referralFeePercent: number
  fulfilmentFeePerUnit: number
  monthlyStoragePerUnit: number
  fuelLogisticsSurcharge: number
}

export function amazonFBAMargin(product: Product, fees: AmazonFBAFees) {
  const sellingPrice = product.rrpIncVat
  const sellingPriceExVat = exVat(sellingPrice, product.vatRate)

  const referralFee = sellingPriceExVat * fees.referralFeePercent
  const fulfilmentFee = fees.fulfilmentFeePerUnit * (1 + fees.fuelLogisticsSurcharge)
  const storageFee = fees.monthlyStoragePerUnit
  const totalFees = referralFee + fulfilmentFee + storageFee

  const netRevenue = sellingPriceExVat - totalFees
  const grossProfit = netRevenue - product.cogsPerUnit
  const grossMarginPercent = sellingPriceExVat > 0 ? grossProfit / sellingPriceExVat : 0

  return {
    sellingPriceExVat,
    referralFee,
    fulfilmentFee,
    storageFee,
    totalFees,
    netRevenue,
    grossProfit,
    grossMarginPercent,
  }
}

/**
 * TikTok Shop margin calculator.
 */
export interface TikTokFees {
  platformCommission: number
  affiliateCommission: number
  perOrderFee: number
  refundAdminPercent: number
}

export function tiktokShopMargin(product: Product, fees: TikTokFees) {
  const sellingPrice = product.rrpIncVat
  const sellingPriceExVat = exVat(sellingPrice, product.vatRate)

  const platformFee = sellingPriceExVat * fees.platformCommission
  const affiliateFee = sellingPriceExVat * fees.affiliateCommission
  const refundCost = sellingPriceExVat * fees.refundAdminPercent
  const totalFees = platformFee + affiliateFee + fees.perOrderFee + refundCost

  const netRevenue = sellingPriceExVat - totalFees
  const grossProfit = netRevenue - product.cogsPerUnit
  const grossMarginPercent = sellingPriceExVat > 0 ? grossProfit / sellingPriceExVat : 0

  return {
    sellingPriceExVat,
    platformFee,
    affiliateFee,
    perOrderFee: fees.perOrderFee,
    refundCost,
    totalFees,
    netRevenue,
    grossProfit,
    grossMarginPercent,
  }
}

/**
 * Cross-channel comparison — compute net margin across all channels for one product.
 */
export function crossChannelComparison(
  product: Product,
  retailerMarginPercent: number,
  amazonFees: AmazonFBAFees,
  tiktokFees: TikTokFees,
  wholesalerMarginPercent = 0,
) {
  const grocery = retailerPnL(product, retailerMarginPercent, wholesalerMarginPercent)
  const amazon = amazonFBAMargin(product, amazonFees)
  const tiktok = tiktokShopMargin(product, tiktokFees)

  return {
    grocery: {
      channel: wholesalerMarginPercent > 0 ? 'UK Grocery (via wholesaler)' : 'UK Grocery',
      netRevenuePerUnit: grocery.brandNetRevenue,
      cogsPerUnit: product.cogsPerUnit,
      grossProfitPerUnit: grocery.brandGrossMarginPerUnit,
      grossMarginPercent: grocery.brandGrossMarginPercent,
    },
    amazon: {
      channel: 'Amazon FBA',
      netRevenuePerUnit: amazon.netRevenue,
      cogsPerUnit: product.cogsPerUnit,
      grossProfitPerUnit: amazon.grossProfit,
      grossMarginPercent: amazon.grossMarginPercent,
    },
    tiktok: {
      channel: 'TikTok Shop',
      netRevenuePerUnit: tiktok.netRevenue,
      cogsPerUnit: product.cogsPerUnit,
      grossProfitPerUnit: tiktok.grossProfit,
      grossMarginPercent: tiktok.grossMarginPercent,
    },
  }
}

/**
 * Amazon FBA fee estimator — determines fulfilment fee from product dimensions and weight.
 * Uses Amazon's UK size-tier schedule.
 */
import { AMAZON_SIZE_TIERS, AMAZON_CATEGORY_FEES, TIKTOK_CATEGORY_FEES } from '../config/fees'

export function estimateAmazonFBAFee(weightG: number, longestCm: number, medianCm: number, shortestCm: number) {
  for (const tier of AMAZON_SIZE_TIERS) {
    if (
      weightG <= tier.maxWeightG &&
      longestCm <= tier.maxLongestCm &&
      medianCm <= tier.maxMedianCm &&
      shortestCm <= tier.maxShortestCm
    ) {
      return { tier: tier.name, fee: tier.fee }
    }
  }
  const last = AMAZON_SIZE_TIERS[AMAZON_SIZE_TIERS.length - 1]
  return { tier: last.name + ' (oversize)', fee: last.fee }
}

export function getAmazonReferralRate(categoryName: string): number {
  const match = AMAZON_CATEGORY_FEES.find((c) => c.category === categoryName)
  return match ? match.referralPercent : 0.15
}

export function getTikTokCommission(categoryName: string): number {
  const match = TIKTOK_CATEGORY_FEES.find((c) => c.category === categoryName)
  return match ? match.commissionPercent : 0.09
}

/** Format a number as GBP with thousands separators, e.g. £682,500.00 */
export function formatGBP(value: number): string {
  const magnitude = Math.abs(value).toLocaleString('en-GB', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })
  return `${value < 0 ? '−' : ''}£${magnitude}`
}

/** Format a number as a percentage */
export function formatPercent(value: number): string {
  return `${(value * 100).toFixed(1)}%`
}

/** Format a large number with commas */
export function formatNumber(value: number, decimals = 0): string {
  return value.toLocaleString('en-GB', {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  })
}
