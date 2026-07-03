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
  stockLedger,
  amazonFBAMargin,
  tiktokShopMargin,
} from './calculations'

/**
 * Quick flat CSV: the product, every assumption, computed results, and the
 * week-by-week rows for pasting. For a manipulable model with live formulas,
 * use the Excel export (utils/excelExport.ts) instead.
 */

type Row = string[]

const money = (v: number) => v.toFixed(2)
const pct = (v: number) => `${(v * 100).toFixed(1)}%`
const num = (v: number) => Math.round(v).toString()

function csvField(s: string): string {
  return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s
}

export function buildScenarioCsv(product: Product, scenario: Scenario): string {
  const ws = activeWholesalerMargin(scenario.grocery)
  const grocery = retailerPnL(product, scenario.grocery.retailerMargin, ws)
  const listingInputs = {
    stores: scenario.listing.stores,
    skus: scenario.listing.skus,
    weeksInPeriod: scenario.listing.weeksInPeriod,
    promos: scenario.listing.promos,
  }
  const listing = listingModel(product, scenario.grocery.retailerMargin, listingInputs, ws)
  const trade = tradeSpendROI(
    product,
    scenario.grocery.retailerMargin,
    scenario.tradeSpend.investment,
    scenario.tradeSpend.targetROI,
    ws,
  )
  const plan = stockLedger(
    listing.weeks.map((w) => w.volume),
    scenario.stock.startingStockUnits,
    scenario.stock.leadWeeks,
    scenario.stock.weeksOfCover,
    product.unitsPerCase,
  )
  const amazonFees = effectiveAmazonFees(scenario.amazon)
  const amazon = amazonFBAMargin(product, amazonFees)
  const tiktokFees = effectiveTikTokFees(scenario.tiktok)
  const tiktok = tiktokShopMargin(product, tiktokFees)

  const rows: Row[] = [
    ['Section', 'Metric', 'Value'],
    ['Product', 'Name', product.name],
    ['Product', 'COGS per unit (£)', money(product.cogsPerUnit)],
    ['Product', 'Units per case', num(product.unitsPerCase)],
    ['Product', 'RRP inc. VAT (£)', money(product.rrpIncVat)],
    ['Product', 'VAT rate', pct(product.vatRate)],
    ['Product', 'Weekly rate of sale per store', String(product.weeklyRateOfSale)],

    ['Grocery chain', 'Retailer margin', pct(scenario.grocery.retailerMargin)],
    ['Grocery chain', 'Wholesaler margin', scenario.grocery.wholesalerEnabled ? pct(scenario.grocery.wholesalerMargin) : 'n/a (direct)'],
    ['Grocery P&L', 'RSP ex-VAT (£)', money(grocery.rspExVat)],
    ['Grocery P&L', 'Cost to retailer (£)', money(grocery.costToRetailer)],
    ['Grocery P&L', 'Your net revenue per unit (£)', money(grocery.brandNetRevenue)],
    ['Grocery P&L', 'Your gross margin per unit (£)', money(grocery.brandGrossMarginPerUnit)],
    ['Grocery P&L', 'Your gross margin %', pct(grocery.brandGrossMarginPercent)],
    ['Grocery P&L', 'Margin per case (£)', money(grocery.marginPerCase)],

    ['Listing model', 'Stores', num(scenario.listing.stores)],
    ['Listing model', 'SKUs', num(scenario.listing.skus)],
    ['Listing model', 'Weeks in period', num(scenario.listing.weeksInPeriod)],
    ...scenario.listing.promos.map((p, i): Row => [
      'Listing model',
      `Promo ${i + 1}`,
      `${p.mechanic} · wk ${p.startWeek} · ${p.weeks} wks · +${(p.uplift * 100).toFixed(0)}% volume · ${p.supplierFunded ? 'supplier funded' : 'retailer funded'}`,
    ]),
    ['Listing model', 'Total volume (units)', num(listing.totalVolume)],
    ['Listing model', 'Total cases', num(listing.totalCases)],
    ['Listing model', 'GSV (£)', money(listing.totalGsv)],
    ['Listing model', 'Promo funding (£)', money(listing.totalFunding)],
    ['Listing model', 'NSV (£)', money(listing.totalNsv)],
    ['Listing model', 'NSV as % of GSV', pct(listing.nsvPctOfGsv)],
    ['Listing model', 'Total gross margin (£)', money(listing.totalGrossMargin)],
    ['Listing model', 'GM as % of NSV', pct(listing.gmPctOfNsv)],

    ['Trade spend', 'Investment (£)', money(scenario.tradeSpend.investment)],
    ['Trade spend', 'Target ROI', pct(scenario.tradeSpend.targetROI)],
    ['Trade spend', 'Break-even units', num(Math.ceil(trade.breakEvenUnits))],
    ['Trade spend', 'Break-even cases', num(Math.ceil(trade.breakEvenCases))],
    ['Trade spend', 'Units for target ROI', num(Math.ceil(trade.targetReturnUnits))],

    ['Supply plan', 'Starting stock (units)', num(scenario.stock.startingStockUnits)],
    ['Supply plan', 'Lead time (weeks)', num(scenario.stock.leadWeeks)],
    ['Supply plan', 'Weeks of cover', num(scenario.stock.weeksOfCover)],
    ['Supply plan', 'Total to order (units)', num(plan.totalOrdered)],
    ['Supply plan', 'Total to order (cases)', num(plan.totalOrderedCases)],
    ['Supply plan', 'Purchase orders', num(plan.orderCount)],
    ['Supply plan', 'Peak stock (units)', num(plan.peakStock)],
    ['Supply plan', 'Stockout weeks', num(plan.stockoutWeeks)],

    ['Amazon FBA', 'Referral fee', pct(amazonFees.referralFeePercent)],
    ['Amazon FBA', 'Fulfilment fee per unit (£)', money(amazonFees.fulfilmentFeePerUnit)],
    ['Amazon FBA', 'Plan fee per month (£)', money(scenario.amazon.planMonthly)],
    ['Amazon FBA', 'Expected monthly units', num(scenario.amazon.monthlyUnits)],
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

    // Week-by-week phasing for pasting into planning docs
    [],
    ['Week', 'On promo', 'Volume (units)', 'GSV (£)', 'Funding (£)', 'NSV (£)', 'Margin (£)', 'Order placed (units)', 'Closing stock (units)'],
    ...listing.weeks.map((w, i): Row => [
      String(w.week),
      w.onPromo ? 'Yes' : '',
      num(w.volume),
      money(w.gsv),
      money(w.funding),
      money(w.nsv),
      money(w.grossMargin),
      num(plan.rows[i]?.orderPlaced ?? 0),
      num(plan.rows[i]?.closing ?? 0),
    ]),
  ]

  return rows.map((r) => r.map(csvField).join(',')).join('\n')
}
