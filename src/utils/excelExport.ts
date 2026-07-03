import type { Product } from '../types/product'
import type { Scenario } from '../store/scenario'
import {
  activeWholesalerMargin,
  effectiveAmazonFees,
  effectiveTikTokFees,
} from '../store/scenario'
import {
  retailerPnL,
  amazonFBAMargin,
  tiktokShopMargin,
  weeklyProjection,
  stockLedger,
} from './calculations'

/**
 * Excel MODEL export — not a data dump.
 *
 * Every input lives on the Assumptions sheet as a NAMED cell (RRP, RetailerMargin,
 * Stores…), and every other sheet is built from formulas that reference those
 * names. Change an assumption in Excel and the whole workbook recalculates:
 * the weekly phasing moves with PromoStart, the stock plan re-derives arrivals
 * from the (editable) order column, the channel P&Ls reprice.
 *
 * Formula cells also carry precomputed results so viewers that don't
 * recalculate on open (Quick Look, some mobile apps) still show numbers.
 */

const GBP = '£#,##0.00'
const PCT = '0.0%'
const INT = '#,##0'

export async function downloadExcelModel(product: Product, scenario: Scenario): Promise<void> {
  const ExcelJS = await import('exceljs')
  const wb = new ExcelJS.Workbook()
  wb.creator = 'FMCG Maths'

  const ws = activeWholesalerMargin(scenario.grocery)
  const amazonFees = effectiveAmazonFees(scenario.amazon)
  const tiktokFees = effectiveTikTokFees(scenario.tiktok)
  const grocery = retailerPnL(product, scenario.grocery.retailerMargin, ws)
  const amazon = amazonFBAMargin(product, amazonFees)
  const tiktok = tiktokShopMargin(product, tiktokFees)
  const listingInputs = {
    stores: scenario.listing.stores,
    skus: scenario.listing.skus,
    weeksInPeriod: scenario.listing.weeksInPeriod,
    promoWeeks: scenario.listing.promoWeeks,
    promoStartWeek: scenario.listing.promoStartWeek,
    promoUpliftPercent: scenario.listing.promoUplift,
  }
  const weeks = weeklyProjection(product, scenario.grocery.retailerMargin, listingInputs, ws)
  const plan = stockLedger(
    weeks.map((w) => w.volume),
    scenario.stock.startingStockUnits,
    scenario.stock.leadWeeks,
    scenario.stock.weeksOfCover,
    product.unitsPerCase,
  )
  const nWeeks = weeks.length

  // ── Assumptions ─────────────────────────────────────────────────────────────
  const aws = wb.addWorksheet('Assumptions')
  aws.columns = [{ width: 34 }, { width: 16 }, { width: 58 }]

  let row = 1
  const heading = (text: string) => {
    const cell = aws.getCell(`A${row}`)
    cell.value = text
    cell.font = { bold: true }
    row++
  }
  const assumption = (
    label: string,
    value: number | string,
    name: string | null,
    fmt: string | null,
    note = '',
  ) => {
    aws.getCell(`A${row}`).value = label
    const cell = aws.getCell(`B${row}`)
    cell.value = value
    if (fmt) cell.numFmt = fmt
    if (note) aws.getCell(`C${row}`).value = note
    if (name) wb.definedNames.add(`Assumptions!$B$${row}`, name)
    row++
  }

  heading('FMCG Maths — model assumptions')
  aws.getCell(`C${row - 1}`).value = 'Change any value in column B; every sheet recalculates.'
  row++

  heading('Product')
  assumption('Name', product.name, null, null)
  assumption('COGS per unit', product.cogsPerUnit, 'COGS', GBP, 'Cost to make/buy one consumer unit')
  assumption('Units per case', product.unitsPerCase, 'UnitsPerCase', INT)
  assumption('RRP inc. VAT', product.rrpIncVat, 'RRP', GBP, 'Shelf price the shopper pays')
  assumption('VAT rate', product.vatRate, 'VAT', PCT)
  assumption('Weekly rate of sale per store', product.weeklyRateOfSale, 'ROS', '0.0')
  row++

  heading('Grocery chain')
  assumption('Retailer margin', scenario.grocery.retailerMargin, 'RetailerMargin', PCT, 'On RSP ex-VAT')
  assumption('Wholesaler margin', ws, 'WholesalerMargin', PCT, '0 = selling direct to retailer')
  row++

  heading('Listing / distribution')
  assumption('Stores', scenario.listing.stores, 'Stores', INT)
  assumption('SKUs', scenario.listing.skus, 'SKUs', INT)
  assumption('Weeks in period', scenario.listing.weeksInPeriod, null, INT, 'Changing this needs extra rows on the weekly sheets')
  assumption('Promo start week', scenario.listing.promoStartWeek, 'PromoStart', INT)
  assumption('Promo weeks', scenario.listing.promoWeeks, 'PromoWeeks', INT)
  assumption('Promo volume uplift', scenario.listing.promoUplift, 'PromoUplift', PCT)
  row++

  heading('Supply')
  assumption('Starting stock (units)', scenario.stock.startingStockUnits, 'StartStock', INT)
  assumption('Lead time (weeks)', scenario.stock.leadWeeks, 'LeadWeeks', INT)
  assumption('Weeks of cover', scenario.stock.weeksOfCover, 'CoverWeeks', INT)
  row++

  heading('Amazon FBA')
  assumption('Referral fee', amazonFees.referralFeePercent, 'AmzReferral', PCT)
  assumption('Fulfilment fee per unit', amazonFees.fulfilmentFeePerUnit, 'AmzFulfil', GBP)
  assumption('Storage per unit per month', amazonFees.monthlyStoragePerUnit, 'AmzStorage', GBP)
  assumption('Fuel & logistics surcharge', amazonFees.fuelLogisticsSurcharge, 'AmzFuel', PCT)
  assumption('Professional plan per month', scenario.amazon.planMonthly, 'AmzPlan', GBP)
  assumption('Expected monthly units', scenario.amazon.monthlyUnits, 'AmzUnits', INT)
  row++

  heading('TikTok Shop')
  assumption('Platform commission', tiktokFees.platformCommission, 'TtkCommission', PCT)
  assumption('Affiliate commission', tiktokFees.affiliateCommission, 'TtkAffiliate', PCT)
  assumption('Per-order fee', tiktokFees.perOrderFee, 'TtkOrderFee', GBP)
  assumption('Refund admin', tiktokFees.refundAdminPercent, 'TtkRefund', PCT)

  // ── Grocery P&L ─────────────────────────────────────────────────────────────
  const pnl = wb.addWorksheet('Grocery P&L')
  pnl.columns = [{ width: 30 }, { width: 16 }]
  pnl.getCell('A1').value = 'Grocery P&L (per unit)'
  pnl.getCell('A1').font = { bold: true }

  const pnlRow = (r: number, label: string, formula: string, result: number, fmt: string, name?: string) => {
    pnl.getCell(`A${r}`).value = label
    const cell = pnl.getCell(`B${r}`)
    cell.value = { formula, result }
    cell.numFmt = fmt
    if (name) wb.definedNames.add(`'Grocery P&L'!$B$${r}`, name)
  }
  pnlRow(3, 'RSP ex-VAT', 'RRP/(1+VAT)', grocery.rspExVat, GBP, 'RSPexVAT')
  pnlRow(4, 'Cost to retailer', 'RSPexVAT*(1-RetailerMargin)', grocery.costToRetailer, GBP, 'CostToRetailer')
  pnlRow(5, 'Your net revenue per unit', 'CostToRetailer*(1-WholesalerMargin)', grocery.brandNetRevenue, GBP, 'NetRevPerUnit')
  pnlRow(6, 'Gross margin per unit', 'NetRevPerUnit-COGS', grocery.brandGrossMarginPerUnit, GBP, 'MarginPerUnit')
  pnlRow(7, 'Gross margin %', 'IF(NetRevPerUnit=0,0,MarginPerUnit/NetRevPerUnit)', grocery.brandGrossMarginPercent, PCT)
  pnlRow(8, 'Revenue per case', 'NetRevPerUnit*UnitsPerCase', grocery.revenuePerCase, GBP)
  pnlRow(9, 'Margin per case', 'MarginPerUnit*UnitsPerCase', grocery.marginPerCase, GBP)

  // ── Weekly Projection ──────────────────────────────────────────────────────
  const wp = wb.addWorksheet('Weekly Projection')
  wp.columns = [
    { width: 8 }, { width: 16 }, { width: 14 }, { width: 14 }, { width: 14 }, { width: 16 }, { width: 16 },
  ]
  const wpHeaders = ['Week', 'On promo (1=yes)', 'Volume', 'Revenue', 'Margin', 'Cum. revenue', 'Cum. margin']
  wpHeaders.forEach((h, i) => {
    const cell = wp.getCell(1, i + 1)
    cell.value = h
    cell.font = { bold: true }
  })
  weeks.forEach((w, i) => {
    const r = i + 2
    wp.getCell(`A${r}`).value = w.week
    const set = (col: string, formula: string, result: number, fmt: string) => {
      const cell = wp.getCell(`${col}${r}`)
      cell.value = { formula, result }
      cell.numFmt = fmt
    }
    set('B', `IF(AND(A${r}>=PromoStart,A${r}<PromoStart+PromoWeeks),1,0)`, w.onPromo ? 1 : 0, '0')
    set('C', `Stores*SKUs*ROS*(1+B${r}*PromoUplift)`, w.volume, INT)
    set('D', `C${r}*NetRevPerUnit`, w.revenue, GBP)
    set('E', `C${r}*MarginPerUnit`, w.grossMargin, GBP)
    set('F', `SUM($D$2:D${r})`, w.cumulativeRevenue, GBP)
    set('G', `SUM($E$2:E${r})`, w.cumulativeMargin, GBP)
  })
  const totalRow = nWeeks + 2
  wp.getCell(`A${totalRow}`).value = 'Total'
  wp.getCell(`A${totalRow}`).font = { bold: true }
  const last = weeks[nWeeks - 1]
  ;(['C', 'D', 'E'] as const).forEach((col) => {
    const cell = wp.getCell(`${col}${totalRow}`)
    const results = { C: last.cumulativeVolume, D: last.cumulativeRevenue, E: last.cumulativeMargin }
    cell.value = { formula: `SUM(${col}2:${col}${nWeeks + 1})`, result: results[col] }
    cell.numFmt = col === 'C' ? INT : GBP
    cell.font = { bold: true }
  })

  // ── Stock Plan ─────────────────────────────────────────────────────────────
  const sp = wb.addWorksheet('Stock Plan')
  sp.columns = [
    { width: 8 }, { width: 12 }, { width: 12 }, { width: 12 }, { width: 20 }, { width: 12 }, { width: 12 }, { width: 14 },
  ]
  const spHeaders = ['Week', 'Demand', 'Opening', 'Arrivals', 'Order placed (edit me)', 'Available', 'Closing', 'Unmet demand']
  spHeaders.forEach((h, i) => {
    const cell = sp.getCell(1, i + 1)
    cell.value = h
    cell.font = { bold: true }
  })
  plan.rows.forEach((r, i) => {
    const x = i + 2
    sp.getCell(`A${x}`).value = r.week
    const set = (col: string, value: number | { formula: string; result: number }, fmt = INT) => {
      const cell = sp.getCell(`${col}${x}`)
      cell.value = value
      cell.numFmt = fmt
    }
    set('B', { formula: `'Weekly Projection'!C${x}`, result: r.demand })
    set('C', x === 2
      ? { formula: 'StartStock', result: r.opening }
      : { formula: `G${x - 1}`, result: r.opening })
    set('D', { formula: `IF(A${x}>LeadWeeks,INDEX($E$2:$E$${nWeeks + 1},A${x}-LeadWeeks),0)`, result: r.arrivals })
    set('E', r.orderPlaced) // plain editable value — the planner's lever
    set('F', { formula: `C${x}+D${x}`, result: r.opening + r.arrivals })
    set('G', { formula: `MAX(0,F${x}-B${x})`, result: r.closing })
    set('H', { formula: `MAX(0,B${x}-F${x})`, result: r.shortfall })
  })
  const noteCell = sp.getCell(`A${nWeeks + 3}`)
  noteCell.value =
    'Orders (column E) are plain numbers — edit them and arrivals, closings and unmet demand recalculate. ' +
    'Suggested orders follow an order-up-to policy: top up to cover the next lead time + weeks of cover, in whole cases.'
  noteCell.font = { italic: true, size: 9 }

  // ── Channels ───────────────────────────────────────────────────────────────
  const ch = wb.addWorksheet('Channels')
  ch.columns = [{ width: 34 }, { width: 16 }]
  ch.getCell('A1').value = 'Channel economics (per unit)'
  ch.getCell('A1').font = { bold: true }

  const chRow = (r: number, label: string, formula: string, result: number, fmt: string) => {
    ch.getCell(`A${r}`).value = label
    const cell = ch.getCell(`B${r}`)
    cell.value = { formula, result }
    cell.numFmt = fmt
  }
  chRow(3, 'Grocery — net revenue', 'NetRevPerUnit', grocery.brandNetRevenue, GBP)
  chRow(4, 'Grocery — gross profit', 'MarginPerUnit', grocery.brandGrossMarginPerUnit, GBP)
  chRow(5, 'Grocery — gross margin %', 'IF(NetRevPerUnit=0,0,MarginPerUnit/NetRevPerUnit)', grocery.brandGrossMarginPercent, PCT)

  const amzSub = scenario.amazon.monthlyUnits > 0 ? scenario.amazon.planMonthly / scenario.amazon.monthlyUnits : 0
  chRow(7, 'Amazon — selling price ex-VAT', 'RRP/(1+VAT)', amazon.sellingPriceExVat, GBP)
  chRow(8, 'Amazon — referral fee', 'B7*AmzReferral', amazon.referralFee, GBP)
  chRow(9, 'Amazon — fulfilment (incl. fuel)', 'AmzFulfil*(1+AmzFuel)', amazon.fulfilmentFee, GBP)
  chRow(10, 'Amazon — storage', 'AmzStorage', amazon.storageFee, GBP)
  chRow(11, 'Amazon — plan cost per unit', 'IF(AmzUnits=0,0,AmzPlan/AmzUnits)', amzSub, GBP)
  chRow(12, 'Amazon — net revenue', 'B7-B8-B9-B10-B11', amazon.netRevenue - amzSub, GBP)
  chRow(13, 'Amazon — gross profit', 'B12-COGS', amazon.grossProfit - amzSub, GBP)
  chRow(14, 'Amazon — gross margin %', 'IF(B7=0,0,B13/B7)',
    amazon.sellingPriceExVat > 0 ? (amazon.grossProfit - amzSub) / amazon.sellingPriceExVat : 0, PCT)

  chRow(16, 'TikTok — selling price ex-VAT', 'RRP/(1+VAT)', tiktok.sellingPriceExVat, GBP)
  chRow(17, 'TikTok — platform commission', 'B16*TtkCommission', tiktok.platformFee, GBP)
  chRow(18, 'TikTok — affiliate commission', 'B16*TtkAffiliate', tiktok.affiliateFee, GBP)
  chRow(19, 'TikTok — per-order fee', 'TtkOrderFee', tiktok.perOrderFee, GBP)
  chRow(20, 'TikTok — refund admin', 'B16*TtkRefund', tiktok.refundCost, GBP)
  chRow(21, 'TikTok — net revenue', 'B16-B17-B18-B19-B20', tiktok.netRevenue, GBP)
  chRow(22, 'TikTok — gross profit', 'B21-COGS', tiktok.grossProfit, GBP)
  chRow(23, 'TikTok — gross margin %', 'IF(B16=0,0,B22/B16)', tiktok.grossMarginPercent, PCT)

  // ── Download ───────────────────────────────────────────────────────────────
  const buffer = await wb.xlsx.writeBuffer()
  const blob = new Blob([buffer], {
    type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = `${product.name.replace(/\s+/g, '_')}_fmcg_model.xlsx`
  a.click()
  URL.revokeObjectURL(url)
}
