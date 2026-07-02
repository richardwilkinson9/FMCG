import type { Product } from '../types/product'
import type { Scenario } from '../store/scenario'
import {
  activeWholesalerMargin,
  effectiveAmazonFees,
  effectiveTikTokFees,
} from '../store/scenario'
import {
  retailerPnL,
  listingModel,
  tradeSpendROI,
  stockForecast,
  amazonFBAMargin,
  tiktokShopMargin,
} from './calculations'

/**
 * Build a full-scenario CSV: the product, every assumption, and the computed
 * results from every calculator — everything you'd want to paste into a deck
 * or hand to finance. Not just the six product fields.
 */

type Row = [section: string, metric: string, value: string]

const money = (v: number) => v.toFixed(2)
const pct = (v: number) => `${(v * 100).toFixed(1)}%`
const num = (v: number) => Math.round(v).toString()

function csvField(s: string): string {
  return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s
}

export function buildScenarioCsv(product: Product, scenario: Scenario): string {
  const ws = activeWholesalerMargin(scenario.grocery)
  const grocery = retailerPnL(product, scenario.grocery.retailerMargin, ws)
  const listing = listingModel(product, scenario.grocery.retailerMargin, {
    stores: scenario.listing.stores,
    skus: scenario.listing.skus,
    weeksInPeriod: scenario.listing.weeksInPeriod,
    promoWeeks: scenario.listing.promoWeeks,
    promoUpliftPercent: scenario.listing.promoUplift,
  }, ws)
  const trade = tradeSpendROI(
    product,
    scenario.grocery.retailerMargin,
    scenario.tradeSpend.investment,
    scenario.tradeSpend.targetROI,
    ws,
  )
  const stock = stockForecast(
    product,
    scenario.stock.stores,
    scenario.stock.weeksOfCover,
    scenario.stock.leadWeeks,
  )
  const amazonFees = effectiveAmazonFees(scenario.amazon)
  const amazon = amazonFBAMargin(product, amazonFees)
  const tiktokFees = effectiveTikTokFees(scenario.tiktok)
  const tiktok = tiktokShopMargin(product, tiktokFees)

  const rows: Row[] = [
    ['Product', 'Name', product.name],
    ['Product', 'COGS per unit (£)', money(product.cogsPerUnit)],
    ['Product', 'Units per case', num(product.unitsPerCase)],
    ['Product', 'RRP inc. VAT (£)', money(product.rrpIncVat)],
    ['Product', 'VAT rate', pct(product.vatRate)],
    ['Product', 'Weekly rate of sale per store', String(product.weeklyRateOfSale)],

    ['Grocery chain', 'Retailer margin', pct(scenario.grocery.retailerMargin)],
    ['Grocery chain', 'Wholesaler in chain', scenario.grocery.wholesalerEnabled ? 'Yes' : 'No'],
    ...(scenario.grocery.wholesalerEnabled
      ? [['Grocery chain', 'Wholesaler margin', pct(scenario.grocery.wholesalerMargin)] as Row]
      : []),
    ['Grocery P&L', 'RSP ex-VAT (£)', money(grocery.rspExVat)],
    ['Grocery P&L', 'Cost to retailer (£)', money(grocery.costToRetailer)],
    ...(scenario.grocery.wholesalerEnabled
      ? [['Grocery P&L', 'Cost to wholesaler / your price (£)', money(grocery.costToWholesaler)] as Row]
      : []),
    ['Grocery P&L', 'Your net revenue per unit (£)', money(grocery.brandNetRevenue)],
    ['Grocery P&L', 'Your gross margin per unit (£)', money(grocery.brandGrossMarginPerUnit)],
    ['Grocery P&L', 'Your gross margin %', pct(grocery.brandGrossMarginPercent)],
    ['Grocery P&L', 'Margin per case (£)', money(grocery.marginPerCase)],

    ['Listing model', 'Stores', num(scenario.listing.stores)],
    ['Listing model', 'SKUs', num(scenario.listing.skus)],
    ['Listing model', 'Weeks in period', num(scenario.listing.weeksInPeriod)],
    ['Listing model', 'Promo weeks', num(scenario.listing.promoWeeks)],
    ['Listing model', 'Promo volume uplift', pct(scenario.listing.promoUplift)],
    ['Listing model', 'Total volume (units)', num(listing.totalVolume)],
    ['Listing model', 'Total cases', num(listing.totalCases)],
    ['Listing model', 'Total revenue (£)', money(listing.totalRevenue)],
    ['Listing model', 'Total gross margin (£)', money(listing.totalGrossMargin)],

    ['Trade spend', 'Investment (£)', money(scenario.tradeSpend.investment)],
    ['Trade spend', 'Target ROI', pct(scenario.tradeSpend.targetROI)],
    ['Trade spend', 'Break-even units', num(Math.ceil(trade.breakEvenUnits))],
    ['Trade spend', 'Break-even cases', num(Math.ceil(trade.breakEvenCases))],
    ['Trade spend', 'Units for target ROI', num(Math.ceil(trade.targetReturnUnits))],

    ['Stock forecast', 'Stores', num(scenario.stock.stores)],
    ['Stock forecast', 'Weeks of cover', num(scenario.stock.weeksOfCover)],
    ['Stock forecast', 'Reorder lead time (weeks)', num(scenario.stock.leadWeeks)],
    ['Stock forecast', 'Weekly demand (units)', num(stock.weeklyDemand)],
    ['Stock forecast', 'Stock to hold (units)', num(stock.totalStockUnits)],
    ['Stock forecast', 'Stock to hold (cases)', num(Math.ceil(stock.totalStockCases))],
    ['Stock forecast', 'Reorder point (units)', num(stock.reorderPointUnits)],

    ['Amazon FBA', 'Referral fee', pct(amazonFees.referralFeePercent)],
    ['Amazon FBA', 'Fulfilment fee per unit (£)', money(amazonFees.fulfilmentFeePerUnit)],
    ['Amazon FBA', 'Total fees per unit (£)', money(amazon.totalFees)],
    ['Amazon FBA', 'Net revenue per unit (£)', money(amazon.netRevenue)],
    ['Amazon FBA', 'Gross profit per unit (£)', money(amazon.grossProfit)],
    ['Amazon FBA', 'Gross margin %', pct(amazon.grossMarginPercent)],

    ['TikTok Shop', 'Platform commission', pct(tiktokFees.platformCommission)],
    ['TikTok Shop', 'Affiliate commission', pct(tiktokFees.affiliateCommission)],
    ['TikTok Shop', 'Total fees per unit (£)', money(tiktok.totalFees)],
    ['TikTok Shop', 'Net revenue per unit (£)', money(tiktok.netRevenue)],
    ['TikTok Shop', 'Gross profit per unit (£)', money(tiktok.grossProfit)],
    ['TikTok Shop', 'Gross margin %', pct(tiktok.grossMarginPercent)],

    ['Cross-channel', 'Grocery gross margin %', pct(grocery.brandGrossMarginPercent)],
    ['Cross-channel', 'Amazon FBA gross margin %', pct(amazon.grossMarginPercent)],
    ['Cross-channel', 'TikTok Shop gross margin %', pct(tiktok.grossMarginPercent)],
  ]

  const lines = ['Section,Metric,Value']
  for (const [section, metric, value] of rows) {
    lines.push([csvField(section), csvField(metric), csvField(value)].join(','))
  }
  return lines.join('\n')
}
