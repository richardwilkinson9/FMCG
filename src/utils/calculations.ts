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
 * Retailer listing model — project revenue, volume and margin over a period.
 */
export interface ListingModelInputs {
  stores: number
  skus: number
  weeksInPeriod: number
  promoWeeks: number
  promoUpliftPercent: number
}

export function listingModel(product: Product, retailerMarginPercent: number, inputs: ListingModelInputs, wholesalerMarginPercent = 0) {
  const pnl = retailerPnL(product, retailerMarginPercent, wholesalerMarginPercent)
  const baseWeeklyVolume = product.weeklyRateOfSale * inputs.stores * inputs.skus
  const normalWeeks = inputs.weeksInPeriod - inputs.promoWeeks
  const promoWeeklyVolume = baseWeeklyVolume * (1 + inputs.promoUpliftPercent)

  const totalVolume = (baseWeeklyVolume * normalWeeks) + (promoWeeklyVolume * inputs.promoWeeks)
  const totalRevenue = totalVolume * pnl.brandNetRevenue
  const totalGrossMargin = totalVolume * pnl.brandGrossMarginPerUnit

  return {
    totalVolume,
    totalRevenue,
    totalGrossMargin,
    totalCases: totalVolume / product.unitsPerCase,
    weeklyVolume: baseWeeklyVolume,
    promoWeeklyVolume,
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
 * Stock forecast — how much to produce/hold based on ROS and distribution.
 */
export function stockForecast(
  product: Product,
  stores: number,
  weeksOfCover: number,
  reorderLeadWeeks: number,
) {
  const weeklyDemand = product.weeklyRateOfSale * stores
  const totalStockUnits = weeklyDemand * weeksOfCover
  const totalStockCases = totalStockUnits / product.unitsPerCase
  const reorderPointUnits = weeklyDemand * reorderLeadWeeks
  const reorderPointCases = reorderPointUnits / product.unitsPerCase

  return {
    weeklyDemand,
    totalStockUnits,
    totalStockCases,
    reorderPointUnits,
    reorderPointCases,
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
