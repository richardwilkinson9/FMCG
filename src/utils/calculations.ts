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
 * Retailer P&L breakdown.
 * "Cost price to retailer" = the price the brand sells to the retailer at.
 * Retailer margin is on the RSP ex-VAT.
 */
export function retailerPnL(product: Product, retailerMarginPercent: number) {
  const rsp = rspExVat(product)
  const costToRetailer = rsp * (1 - retailerMarginPercent)
  const retailerMarginPerUnit = rsp - costToRetailer
  const brandGrossMarginPerUnit = costToRetailer - product.cogsPerUnit
  const brandGrossMarginPercent = costToRetailer > 0
    ? brandGrossMarginPerUnit / costToRetailer
    : 0

  return {
    rspExVat: rsp,
    costToRetailer,
    retailerMarginPerUnit,
    retailerMarginPercent,
    brandGrossMarginPerUnit,
    brandGrossMarginPercent,
    revenuePerCase: costToRetailer * product.unitsPerCase,
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
) {
  const rsp = exVat(rrpIncVat, vatRate)
  const costToRetailer = rsp * (1 - retailerMarginPercent)
  const requiredCogs = costToRetailer * (1 - targetBrandMarginPercent)
  return { requiredCogs, costToRetailer, rspExVat: rsp }
}

export function solveForRrp(
  cogsPerUnit: number,
  vatRate: number,
  retailerMarginPercent: number,
  targetBrandMarginPercent: number,
) {
  const costToRetailer = cogsPerUnit / (1 - targetBrandMarginPercent)
  const rsp = costToRetailer / (1 - retailerMarginPercent)
  const rrpIncVat = rsp * (1 + vatRate)
  return { rrpIncVat, costToRetailer, rspExVat: rsp }
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

export function listingModel(product: Product, retailerMarginPercent: number, inputs: ListingModelInputs) {
  const pnl = retailerPnL(product, retailerMarginPercent)
  const baseWeeklyVolume = product.weeklyRateOfSale * inputs.stores * inputs.skus
  const normalWeeks = inputs.weeksInPeriod - inputs.promoWeeks
  const promoWeeklyVolume = baseWeeklyVolume * (1 + inputs.promoUpliftPercent)

  const totalVolume = (baseWeeklyVolume * normalWeeks) + (promoWeeklyVolume * inputs.promoWeeks)
  const totalRevenue = totalVolume * pnl.costToRetailer
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
) {
  const pnl = retailerPnL(product, retailerMarginPercent)
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
) {
  const grocery = retailerPnL(product, retailerMarginPercent)
  const amazon = amazonFBAMargin(product, amazonFees)
  const tiktok = tiktokShopMargin(product, tiktokFees)

  return {
    grocery: {
      channel: 'UK Grocery',
      netRevenuePerUnit: grocery.costToRetailer,
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

/** Format a number as GBP */
export function formatGBP(value: number): string {
  return `£${value.toFixed(2)}`
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
