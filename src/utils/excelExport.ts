import type { Product } from '../types/product'
import type { Scenario } from '../store/scenario'
import {
  activeWholesalerMargin,
  effectiveAmazonFees,
  effectiveTikTokFees,
  amazonCasesPerYear,
  amazonMonthlyUnits,
} from '../store/scenario'
import {
  retailerPnL,
  rspExVat,
  amazonFBAMargin,
  tiktokShopMargin,
  amazonAnnualPnL,
  tiktokAnnualPnL,
  weeklyProjection,
  listingModel,
  stockLedger,
  promoUpliftForWeek,
} from './calculations'

/**
 * The GROSS. Excel deck — a branded, formula-live workbook.
 *
 * Rules of the build:
 * - Every input is a NAMED cell on the Assumptions sheet. Every derived cell
 *   is a formula referencing those names, with a cached result so viewers
 *   that don't recalculate still show numbers. Change an assumption in Excel
 *   and the whole deck reprices.
 * - Brand: Ink/Bile/Receipt palette, receipt-style sheets, answer blocks as
 *   inverted Ink rows, negatives in Red-Pen. Fonts fall back gracefully
 *   (Arial Black for display, Courier New for the mono receipt voice).
 * - Verdict sentences are printed at export; the numbers recalculate.
 */

// GROSS palette (ARGB)
const INK = 'FF0A0A0A'
const BILE = 'FFC6F215'
const RECEIPT = 'FFF7F5EF'
const REDUCED = 'FFFFD400'
const REDPEN = 'FFE4002B'
const WHITE = 'FFFFFFFF'

const DISPLAY = 'Arial Black'
const MONO = 'Courier New'

const GBP = '£#,##0.00'
const PCT = '0.0%'
const INT = '#,##0'

type Cell = import('exceljs').Cell
type Worksheet = import('exceljs').Worksheet

const fill = (color: string) => ({ type: 'pattern' as const, pattern: 'solid' as const, fgColor: { argb: color } })

function receiptBase(ws: Worksheet, cols = 8) {
  ws.views = [{ showGridLines: false }]
  for (let i = 1; i <= cols; i++) {
    ws.getColumn(i).fill = fill(RECEIPT)
    ws.getColumn(i).font = { name: MONO, size: 10, color: { argb: INK } }
  }
}

export async function downloadExcelModel(product: Product, scenario: Scenario): Promise<void> {
  const ExcelJS = await import('exceljs')
  const wb = new ExcelJS.Workbook()
  wb.creator = 'GROSS.'

  const ws = activeWholesalerMargin(scenario.grocery)
  const amazonFees = effectiveAmazonFees(scenario.amazon, product.unitsPerCase)
  const tiktokFees = effectiveTikTokFees(scenario.tiktok)
  const grocery = retailerPnL(product, scenario.grocery.retailerMargin, ws)
  const rsp = rspExVat(product)
  const amazon = amazonFBAMargin(product, amazonFees)
  const tiktok = tiktokShopMargin(product, tiktokFees)
  const listingInputs = {
    stores: scenario.listing.stores,
    skus: scenario.listing.skus,
    weeksInPeriod: scenario.listing.weeksInPeriod,
    promos: scenario.listing.promos,
  }
  const weeks = weeklyProjection(product, scenario.grocery.retailerMargin, listingInputs, ws)
  const listing = listingModel(product, scenario.grocery.retailerMargin, listingInputs, ws)
  const amzCasesYear = amazonCasesPerYear(scenario.amazon, product.unitsPerCase)
  const amazonYear = amazonAnnualPnL(product, amazonFees, scenario.amazon.planMonthly, amzCasesYear)
  const tiktokYear = tiktokAnnualPnL(product, tiktokFees, scenario.tiktok.casesPerYear)
  // Inbound logistics per consumer unit, per channel
  const upc = Math.max(product.unitsPerCase, 1)
  const groceryLogUnit = scenario.grocery.logisticsPerCase / upc
  const amazonLogUnit = scenario.amazon.logisticsPerCase / upc
  const tiktokLogUnit = scenario.tiktok.logisticsPerCase / upc
  const stockDemand: number[] = []
  for (let w = 1; w <= scenario.stock.planWeeks; w++) {
    stockDemand.push(product.weeklyRateOfSale * scenario.listing.stores * (1 + promoUpliftForWeek(scenario.listing.promos, w)))
  }
  const plan = stockLedger(stockDemand, scenario.stock.startingStockUnits, scenario.stock.leadWeeks, scenario.stock.weeksOfCover, product.unitsPerCase)
  // Reconcile the Waterfall's promo funding with the calendar when the toggle is on
  const effectivePromoFunding = scenario.waterfall.promoFromCalendar
    ? (listing.totalGsv > 0 ? listing.totalFunding / listing.totalGsv : 0)
    : scenario.waterfall.promoFunding
  const stamp = new Date().toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }).toUpperCase().replace(/,/g, '')
  const planCut = scenario.amazon.planMonthly / Math.max(amazonMonthlyUnits(scenario.amazon, product.unitsPerCase), 1)

  // Small style helpers ------------------------------------------------------
  const mono = (c: Cell, opts: { bold?: boolean; size?: number; color?: string } = {}) => {
    c.font = { name: MONO, size: opts.size ?? 10, bold: opts.bold ?? false, color: { argb: opts.color ?? INK } }
  }
  const setF = (c: Cell, formula: string, result: number, fmt: string) => {
    c.value = { formula, result }
    c.numFmt = fmt
  }
  const line = (sheet: Worksheet, r: number, label: string, opts: {
    formula?: string; result?: number; text?: string; fmt?: string
    bold?: boolean; dim?: boolean; red?: boolean
  }) => {
    const l = sheet.getCell(r, 2)
    l.value = label
    mono(l, { bold: opts.bold, color: opts.dim ? 'FF666666' : INK })
    const v = sheet.getCell(r, 5)
    if (opts.formula !== undefined) setF(v, opts.formula, opts.result ?? 0, opts.fmt ?? GBP)
    else if (opts.text !== undefined) v.value = opts.text
    else if (opts.result !== undefined) { v.value = opts.result; v.numFmt = opts.fmt ?? GBP }
    mono(v, { bold: opts.bold, color: opts.red ? REDPEN : INK })
    v.alignment = { horizontal: 'right' }
    return r + 1
  }
  const rule = (sheet: Worksheet, r: number, dotted = false) => {
    for (let i = 2; i <= 5; i++) {
      sheet.getCell(r, i).border = { top: { style: dotted ? 'dotted' : 'medium', color: { argb: INK } } }
    }
    return r
  }
  const sectionEyebrow = (sheet: Worksheet, r: number, text: string) => {
    const c = sheet.getCell(r, 2)
    c.value = text
    mono(c, { size: 8, color: 'FF666666' })
    return r + 1
  }
  const answerBlock = (sheet: Worksheet, r: number, rows: { label: string; formula?: string; result: number; fmt: string; red?: boolean }[]) => {
    for (const row of rows) {
      for (let i = 2; i <= 5; i++) sheet.getCell(r, i).fill = fill(INK)
      const l = sheet.getCell(r, 2)
      l.value = row.label
      mono(l, { color: BILE, bold: true })
      const v = sheet.getCell(r, 5)
      if (row.formula) setF(v, row.formula, row.result, row.fmt)
      else { v.value = row.result; v.numFmt = row.fmt }
      mono(v, { color: row.red ? REDPEN : BILE, bold: true, size: 13 })
      v.alignment = { horizontal: 'right' }
      sheet.getRow(r).height = 22
      r++
    }
    return r
  }
  const verdictAndFooter = (sheet: Worksheet, r: number, verdict: string, red = false) => {
    rule(sheet, r); r++
    const v = sheet.getCell(r, 2)
    v.value = verdict
    mono(v, { bold: true, color: red ? REDPEN : INK })
    sheet.mergeCells(r, 2, r, 7)
    v.alignment = { wrapText: true, vertical: 'top' }
    sheet.getRow(r).height = 30
    r += 2
    rule(sheet, r); r++
    const f = sheet.getCell(r, 2)
    f.value = 'VAT number: not applicable. This is a spreadsheet of a website.'
    mono(f, { size: 8, color: 'FF666666' })
    return r + 1
  }
  const toolHeader = (sheet: Worksheet, tool: string, subline: string) => {
    let r = 2
    const t = sheet.getCell(r, 2)
    t.value = `GROSS. // ${tool}`
    mono(t, { bold: true, size: 11 })
    const d = sheet.getCell(r, 5)
    d.value = stamp
    mono(d, { size: 9 })
    d.alignment = { horizontal: 'right' }
    r++
    const n = sheet.getCell(r, 2)
    n.value = product.name
    mono(n, { bold: true, size: 12 })
    r++
    const s = sheet.getCell(r, 2)
    s.value = subline
    mono(s, { size: 9, color: 'FF666666' })
    r += 1
    rule(sheet, ++r)
    return r + 1
  }
  const sheetCols = (sheet: Worksheet) => {
    sheet.getColumn(1).width = 2
    sheet.getColumn(2).width = 38
    sheet.getColumn(3).width = 12
    sheet.getColumn(4).width = 12
    sheet.getColumn(5).width = 18
    sheet.getColumn(6).width = 2
    sheet.getColumn(7).width = 30
    sheet.getColumn(8).width = 2
  }

  // ── COVER ──────────────────────────────────────────────────────────────────
  const cover = wb.addWorksheet('GROSS.', { properties: { tabColor: { argb: BILE } } })
  cover.views = [{ showGridLines: false }]
  for (let i = 1; i <= 10; i++) cover.getColumn(i).fill = fill(INK)
  cover.getColumn(2).width = 120
  const big = cover.getCell('B3')
  big.value = 'GROSS.'
  big.font = { name: DISPLAY, size: 64, bold: true, color: { argb: BILE } }
  cover.getRow(3).height = 84
  const tag = cover.getCell('B5')
  tag.value = 'Do the gross maths.'
  tag.font = { name: DISPLAY, size: 18, color: { argb: RECEIPT } }
  const pn = cover.getCell('B8')
  pn.value = `${product.name} · exported ${stamp}`
  pn.font = { name: MONO, size: 11, bold: true, color: { argb: BILE } }
  const how = cover.getCell('B10')
  how.value = 'Every input is a named cell on the Assumptions sheet. Change one and the deck reprices.'
  how.font = { name: MONO, size: 10, color: { argb: RECEIPT } }
  const how2 = cover.getCell('B11')
  how2.value = 'Numbers recalculate. Sentences were printed at export and stay put.'
  how2.font = { name: MONO, size: 10, color: { argb: RECEIPT } }
  const foot1 = cover.getCell('B14')
  foot1.value = 'GROSS. // FREE COMMERCIAL CALCULATORS FOR UK FMCG BRAND TEAMS — getgross.co.uk'
  foot1.font = { name: MONO, size: 8, color: { argb: BILE } }
  const foot2 = cover.getCell('B15')
  foot2.value = 'VAT NUMBER: NOT APPLICABLE. THIS IS A SPREADSHEET.'
  foot2.font = { name: MONO, size: 8, color: { argb: RECEIPT } }

  // ── ASSUMPTIONS ────────────────────────────────────────────────────────────
  const aws = wb.addWorksheet('Assumptions', { properties: { tabColor: { argb: INK } } })
  aws.views = [{ showGridLines: false }]
  for (let i = 1; i <= 8; i++) aws.getColumn(i).fill = fill(RECEIPT)
  aws.getColumn(1).width = 2
  aws.getColumn(2).width = 34
  aws.getColumn(3).width = 16
  aws.getColumn(4).width = 12
  aws.getColumn(5).width = 12
  aws.getColumn(6).width = 12
  aws.getColumn(7).width = 14
  aws.getColumn(8).width = 60

  let ar = 2
  const heading = (text: string) => {
    for (let i = 2; i <= 8; i++) aws.getCell(ar, i).fill = fill(INK)
    const c = aws.getCell(ar, 2)
    c.value = text
    c.font = { name: MONO, size: 10, bold: true, color: { argb: BILE } }
    aws.getRow(ar).height = 18
    ar++
  }
  const assumption = (label: string, value: number | string, name: string | null, fmt: string | null, note = '') => {
    const l = aws.getCell(ar, 2)
    l.value = label
    mono(l)
    const v = aws.getCell(ar, 3)
    v.value = value
    if (fmt) v.numFmt = fmt
    v.fill = fill(WHITE)
    v.border = { top: { style: 'thin', color: { argb: INK } }, bottom: { style: 'thin', color: { argb: INK } }, left: { style: 'thin', color: { argb: INK } }, right: { style: 'thin', color: { argb: INK } } }
    mono(v, { bold: true })
    v.alignment = { horizontal: 'right' }
    if (note) { const n = aws.getCell(ar, 8); n.value = note; mono(n, { size: 8, color: 'FF666666' }) }
    if (name) wb.definedNames.add(`Assumptions!$C$${ar}`, name)
    ar++
  }

  const title = aws.getCell(1, 2)
  title.value = 'ASSUMPTIONS — the only cells you need to touch'
  mono(title, { bold: true, size: 11 })
  ar = 3

  heading('THE PRODUCT')
  assumption('Name', product.name, null, null)
  assumption('Cost price / unit', product.cogsPerUnit, 'COGS', GBP)
  assumption('Units per case', product.unitsPerCase, 'UnitsPerCase', INT)
  assumption('RSP (inc VAT)', product.rrpIncVat, 'RRP', GBP, 'Shelf price the shopper pays')
  assumption('VAT rate', product.vatRate, 'VAT', PCT)
  assumption('Rate of sale / store / wk', product.weeklyRateOfSale, 'ROS', '0.0')
  ar++

  heading('THE CHAIN')
  assumption('Retailer margin', scenario.grocery.retailerMargin, 'RetailerMargin', PCT, 'dated default — check the rate card')
  assumption('Wholesaler margin', ws, 'WholesalerMargin', PCT, '0 = selling direct')
  assumption('Inbound logistics / case', scenario.grocery.logisticsPerCase, 'GroceryLogistics', GBP, 'Freight to the retailer DC, per case')
  ar++

  heading('TRADE SPEND (% of list)')
  assumption('Promo funding', effectivePromoFunding, 'PromoFunding', PCT, scenario.waterfall.promoFromCalendar ? 'derived from the promo calendar' : '')
  assumption('Back margin / retro', scenario.waterfall.backMargin, 'BackMargin', PCT)
  assumption('Other trade spend', scenario.waterfall.otherTrade, 'OtherTrade', PCT)
  ar++

  heading('THE LISTING')
  assumption('Stores', scenario.listing.stores, 'Stores', INT)
  assumption('SKUs listed', scenario.listing.skus, 'SKUs', INT)
  assumption('Weeks in period', scenario.listing.weeksInPeriod, null, INT, 'Add rows on Weekly Projection if you extend this')
  ar++

  heading('THE PROMO CALENDAR (up to six a year)')
  {
    // Header row for the six-slot promo table
    const promoHeaders = ['PROMO', 'START WK', 'WEEKS', 'UPLIFT', 'PRICE CUT', 'FUNDED (1=YOU)']
    promoHeaders.forEach((h, i) => {
      const c = aws.getCell(ar, i + 2)
      c.value = h
      mono(c, { size: 8, bold: true, color: 'FF666666' })
      c.alignment = { horizontal: i === 0 ? 'left' : 'right' }
    })
    ar++
    const promoFirstRow = ar
    const inputBorder = {
      top: { style: 'thin' as const, color: { argb: INK } },
      bottom: { style: 'thin' as const, color: { argb: INK } },
      left: { style: 'thin' as const, color: { argb: INK } },
      right: { style: 'thin' as const, color: { argb: INK } },
    }
    for (let i = 0; i < 6; i++) {
      const promo = scenario.listing.promos[i]
      const label = aws.getCell(ar, 2)
      label.value = promo ? `${i + 1}. ${promo.mechanic}` : `${i + 1}. (empty slot)`
      mono(label, { color: promo ? INK : 'FF999999' })
      const vals: [number, number, string][] = [
        [3, promo?.startWeek ?? 0, INT],
        [4, promo?.weeks ?? 0, INT],
        [5, promo?.uplift ?? 0, PCT],
        [6, promo?.discount ?? 0, PCT],
        [7, promo ? (promo.supplierFunded ? 1 : 0) : 0, '0'],
      ]
      for (const [col, value, fmt] of vals) {
        const c = aws.getCell(ar, col)
        c.value = value
        c.numFmt = fmt
        c.fill = fill(WHITE)
        c.border = inputBorder
        mono(c, { bold: true })
        c.alignment = { horizontal: 'right' }
      }
      ar++
    }
    const promoLastRow = ar - 1
    wb.definedNames.add(`Assumptions!$C$${promoFirstRow}:$C$${promoLastRow}`, 'PromoStarts')
    wb.definedNames.add(`Assumptions!$D$${promoFirstRow}:$D$${promoLastRow}`, 'PromoLens')
    wb.definedNames.add(`Assumptions!$E$${promoFirstRow}:$E$${promoLastRow}`, 'PromoUplifts')
    wb.definedNames.add(`Assumptions!$F$${promoFirstRow}:$F$${promoLastRow}`, 'PromoDiscs')
    wb.definedNames.add(`Assumptions!$G$${promoFirstRow}:$G$${promoLastRow}`, 'PromoFunded')
    const promoNote = aws.getCell(ar, 2)
    promoNote.value = 'A week of zero start/weeks is an empty slot. FUNDED 1 = you pay the price cut off invoice; 0 = the retailer eats it.'
    mono(promoNote, { size: 8, color: 'FF666666' })
    aws.mergeCells(ar, 2, ar, 8)
    ar++
  }
  ar++

  heading('THE SUPPLY')
  assumption('Starting stock (units)', scenario.stock.startingStockUnits, 'StartStock', INT)
  assumption('Lead time (weeks)', scenario.stock.leadWeeks, 'LeadWeeks', INT)
  assumption('Weeks of cover', scenario.stock.weeksOfCover, 'CoverWeeks', INT)
  ar++

  heading('THE AMAZON CUT')
  assumption('Referral fee', amazonFees.referralFeePercent, 'AmzReferral', PCT, 'dated default — check the rate card')
  assumption('Fulfilment / unit', amazonFees.fulfilmentFeePerUnit, 'AmzFulfil', GBP)
  assumption('Storage / unit / mo', amazonFees.monthlyStoragePerUnit, 'AmzStorage', GBP)
  assumption('Fuel surcharge', amazonFees.fuelLogisticsSurcharge, 'AmzFuel', PCT)
  assumption('Professional plan / mo', scenario.amazon.planMonthly, 'AmzPlan', GBP, "Amazon's £25 seller subscription")
  assumption('Units sold / mo (consumer)', amazonMonthlyUnits(scenario.amazon, product.unitsPerCase), 'AmzUnits', INT, scenario.amazon.sellByCase ? 'sold as cases; = cases/mo × case size' : '')
  assumption('Cases sold / year', amzCasesYear, 'AmzCasesYear', INT, 'Derived from units/mo; drives the full-year P&L')
  assumption('Inbound logistics / case', scenario.amazon.logisticsPerCase, 'AmzLogistics', GBP, 'Freight into the Amazon FC, per case')
  ar++

  heading('THE TIKTOK CUT')
  assumption('Platform commission', tiktokFees.platformCommission, 'TtkCommission', PCT, 'dated default — check the rate card')
  assumption('Affiliate commission', tiktokFees.affiliateCommission, 'TtkAffiliate', PCT)
  assumption('Per-order fee', tiktokFees.perOrderFee, 'TtkOrderFee', GBP)
  assumption('Refund admin', tiktokFees.refundAdminPercent, 'TtkRefund', PCT)
  assumption('Cases sold / year', scenario.tiktok.casesPerYear, 'TtkCasesYear', INT, 'Feeds the full-year P&L on The Cuts')
  assumption('Inbound logistics / case', scenario.tiktok.logisticsPerCase, 'TtkLogistics', GBP, 'Freight into the TikTok/3PL warehouse, per case')

  // ── THE P&L ────────────────────────────────────────────────────────────────
  const pnl = wb.addWorksheet('The P&L', { properties: { tabColor: { argb: BILE } } })
  receiptBase(pnl)
  sheetCols(pnl)
  let r = toolHeader(pnl, 'THE P&L', 'who takes what · per unit')
  r = sectionEyebrow(pnl, r, 'THE WATERFALL')
  r = line(pnl, r, 'Consumer pays (inc VAT)', { formula: 'RRP', result: product.rrpIncVat })
  r = line(pnl, r, 'less VAT', { formula: '-(RRP-RRP/(1+VAT))', result: -(product.rrpIncVat - rsp), dim: true })
  r = line(pnl, r, 'Shelf price ex-VAT', { formula: 'RRP/(1+VAT)', result: rsp, bold: true })
  wb.definedNames.add(`'The P&L'!$E$${r - 1}`, 'RSPexVAT')
  r = line(pnl, r, 'less retailer margin', { formula: '-RSPexVAT*RetailerMargin', result: -grocery.retailerMarginPerUnit, dim: true })
  r = line(pnl, r, 'less wholesaler margin', { formula: '-RSPexVAT*(1-RetailerMargin)*WholesalerMargin', result: -grocery.wholesalerMarginPerUnit, dim: true })
  r = line(pnl, r, 'You bank / unit', { formula: 'RSPexVAT*(1-RetailerMargin)*(1-WholesalerMargin)', result: grocery.brandNetRevenue, bold: true })
  wb.definedNames.add(`'The P&L'!$E$${r - 1}`, 'NetRevPerUnit')
  r = line(pnl, r, 'Net as % of shelf (gross)', { formula: 'IF(RSPexVAT=0,0,NetRevPerUnit/RSPexVAT)', result: rsp > 0 ? grocery.brandNetRevenue / rsp : 0, fmt: PCT, dim: true })
  r = line(pnl, r, 'less cost price', { formula: '-COGS', result: -product.cogsPerUnit, dim: true })
  r++
  r = sectionEyebrow(pnl, r, 'YOUR MARGIN')
  r = answerBlock(pnl, r, [
    { label: 'Gross margin / unit', formula: 'NetRevPerUnit-COGS', result: grocery.brandGrossMarginPerUnit, fmt: GBP, red: grocery.brandGrossMarginPerUnit <= 0 },
    { label: 'Margin % (of net revenue)', formula: 'IF(NetRevPerUnit=0,0,(NetRevPerUnit-COGS)/NetRevPerUnit)', result: grocery.brandGrossMarginPercent, fmt: PCT, red: grocery.brandGrossMarginPerUnit <= 0 },
  ])
  wb.definedNames.add(`'The P&L'!$E$${r - 2}`, 'MarginPerUnit')
  r = line(pnl, r, 'Margin / case', { formula: 'MarginPerUnit*UnitsPerCase', result: grocery.marginPerCase })
  r = line(pnl, r, 'Net revenue / case', { formula: 'NetRevPerUnit*UnitsPerCase', result: grocery.revenuePerCase })
  r = line(pnl, r, 'less inbound logistics / unit', { formula: '-GroceryLogistics/UnitsPerCase', result: -groceryLogUnit, dim: true })
  r = line(pnl, r, 'Margin after logistics / unit', { formula: 'MarginPerUnit-GroceryLogistics/UnitsPerCase', result: grocery.brandGrossMarginPerUnit - groceryLogUnit, bold: true, red: grocery.brandGrossMarginPerUnit - groceryLogUnit <= 0 })
  r++
  r = sectionEyebrow(pnl, r, 'IF THE BUYER PUSHES')
  const pushed25 = retailerPnL(product, scenario.grocery.retailerMargin + 0.025, ws)
  const pushed50 = retailerPnL(product, scenario.grocery.retailerMargin + 0.05, ws)
  r = line(pnl, r, 'At +2.5pts retailer margin', { formula: 'RSPexVAT*(1-(RetailerMargin+0.025))*(1-WholesalerMargin)-COGS', result: pushed25.brandGrossMarginPerUnit, dim: true })
  r = line(pnl, r, 'At +5pts retailer margin', { formula: 'RSPexVAT*(1-(RetailerMargin+0.05))*(1-WholesalerMargin)-COGS', result: pushed50.brandGrossMarginPerUnit, dim: true })
  const pnlVerdict = grocery.brandGrossMarginPerUnit <= 0
    ? `You make ${fmtGBP(grocery.brandGrossMarginPerUnit)} a unit. You are paying to be stocked. Fix the cost price or the RRP.`
    : `You keep ${fmtGBP(grocery.brandGrossMarginPerUnit)} of every ${fmtGBP(rsp)} on the shelf. Back margin is still margin.`
  verdictAndFooter(pnl, r + 1, pnlVerdict, grocery.brandGrossMarginPerUnit <= 0)

  // ── THE WATERFALL ──────────────────────────────────────────────────────────
  const wf = wb.addWorksheet('The Waterfall', { properties: { tabColor: { argb: BILE } } })
  receiptBase(wf)
  sheetCols(wf)
  const list = grocery.brandNetRevenue
  const promoCut = list * effectivePromoFunding
  const retroCut = list * scenario.waterfall.backMargin
  const otherCut = list * scenario.waterfall.otherTrade
  const tradeTotal = promoCut + retroCut + otherCut
  const netnet = list - tradeTotal
  const wfGm = netnet - product.cogsPerUnit
  r = toolHeader(wf, 'THE WATERFALL', 'gross to net · per unit')
  r = line(wf, r, 'Your list price', { formula: 'NetRevPerUnit', result: list, bold: true })
  const listRow = r - 1
  r = line(wf, r, 'less promo funding', { formula: `-$E$${listRow}*PromoFunding`, result: -promoCut, dim: true })
  r = line(wf, r, 'less back margin / retro', { formula: `-$E$${listRow}*BackMargin`, result: -retroCut, dim: true })
  r = line(wf, r, 'less other trade', { formula: `-$E$${listRow}*OtherTrade`, result: -otherCut, dim: true })
  r = line(wf, r, 'Total trade spend', { formula: `-$E$${listRow}*(PromoFunding+BackMargin+OtherTrade)`, result: -tradeTotal, bold: true, red: true })
  rule(wf, r, true); r++
  r = line(wf, r, 'Net net revenue', { formula: `$E$${listRow}*(1-PromoFunding-BackMargin-OtherTrade)`, result: netnet, bold: true })
  const netnetRow = r - 1
  r = line(wf, r, 'Net as % of list (gross)', { formula: `IF($E$${listRow}=0,0,$E$${netnetRow}/$E$${listRow})`, result: list > 0 ? netnet / list : 0, fmt: PCT, dim: true })
  r = line(wf, r, 'less cost price', { formula: '-COGS', result: -product.cogsPerUnit, dim: true })
  r++
  r = sectionEyebrow(wf, r, 'WHAT IS LEFT')
  r = answerBlock(wf, r, [
    { label: 'Net net margin / unit', formula: `$E$${netnetRow}-COGS`, result: wfGm, fmt: GBP, red: wfGm <= 0 },
    { label: 'Margin on list', formula: `IF($E$${listRow}=0,0,($E$${netnetRow}-COGS)/$E$${listRow})`, result: list > 0 ? wfGm / list : 0, fmt: PCT, red: wfGm <= 0 },
  ])
  r = line(wf, r, 'Margin as % of net revenue', { formula: `IF($E$${netnetRow}=0,0,($E$${netnetRow}-COGS)/$E$${netnetRow})`, result: netnet > 0 ? wfGm / netnet : 0, fmt: PCT })
  const wfVerdict = wfGm <= 0
    ? `Trade spend and cost eat the whole list price. You net ${fmtGBP(wfGm)} a unit. The promo plan does not work.`
    : `Trade spend takes ${fmtGBP(tradeTotal)} of your ${fmtGBP(list)} list price. You keep ${fmtGBP(wfGm)}. Back margin is still margin.`
  verdictAndFooter(wf, r + 1, wfVerdict, wfGm <= 0)

  // ── WEEKLY PROJECTION ─────────────────────────────────────────────────────
  // The promo calendar drives everything: SUMPRODUCT over the six promo slots
  // gives each week its uplift and its supplier-funded deduction rate.
  const wp = wb.addWorksheet('Weekly Projection', { properties: { tabColor: { argb: INK } } })
  wp.views = [{ showGridLines: false, state: 'frozen', ySplit: 2 }]
  for (let i = 1; i <= 10; i++) wp.getColumn(i).fill = fill(RECEIPT)
  wp.getColumn(1).width = 2
  ;[8, 14, 12, 14, 14, 14, 14, 16, 16].forEach((wdt, i) => { wp.getColumn(i + 2).width = wdt })
  const wpHeaders = ['WK', 'ON PROMO (1=YES)', 'VOLUME', 'GSV', 'FUNDING', 'NSV', 'MARGIN', 'CUM. NSV', 'CUM. MARGIN']
  wpHeaders.forEach((h, i) => {
    const c = wp.getCell(2, i + 2)
    c.value = h
    c.fill = fill(INK)
    c.font = { name: MONO, size: 9, bold: true, color: { argb: BILE } }
  })
  const inPromo = (rr: number) => `($B${rr}>=PromoStarts)*($B${rr}<PromoStarts+PromoLens)`
  weeks.forEach((wk, i) => {
    const rr = i + 3
    const a = wp.getCell(rr, 2); a.value = wk.week; mono(a)
    setF(wp.getCell(rr, 3), `IF(SUMPRODUCT(${inPromo(rr)})>0,1,0)`, wk.onPromo ? 1 : 0, '0')
    setF(wp.getCell(rr, 4), `Stores*SKUs*ROS*(1+SUMPRODUCT(${inPromo(rr)}*PromoUplifts))`, wk.volume, INT)
    setF(wp.getCell(rr, 5), `$D${rr}*NetRevPerUnit`, wk.gsv, GBP)
    setF(wp.getCell(rr, 6), `$E${rr}*SUMPRODUCT(${inPromo(rr)}*PromoDiscs*PromoFunded)`, wk.funding, GBP)
    setF(wp.getCell(rr, 7), `$E${rr}-$F${rr}`, wk.nsv, GBP)
    setF(wp.getCell(rr, 8), `$G${rr}-$D${rr}*COGS`, wk.grossMargin, GBP)
    setF(wp.getCell(rr, 9), `SUM($G$3:G${rr})`, wk.cumulativeNsv, GBP)
    setF(wp.getCell(rr, 10), `SUM($H$3:H${rr})`, wk.cumulativeMargin, GBP)
    for (let c = 3; c <= 10; c++) mono(wp.getCell(rr, c))
  })
  // Promo weeks turn bile — live with the promo calendar
  wp.addConditionalFormatting({
    ref: `B3:J${weeks.length + 2}`,
    rules: [{ type: 'expression', formulae: ['$C3=1'], priority: 1, style: { fill: fill(BILE) } }],
  })
  const wpTot = weeks.length + 3
  const totLabel = wp.getCell(wpTot, 2)
  totLabel.value = 'TOTAL'
  mono(totLabel, { bold: true })
  const lastWeek = weeks[weeks.length - 1]
  setF(wp.getCell(wpTot, 4), `SUM(D3:D${wpTot - 1})`, lastWeek.cumulativeVolume, INT)
  setF(wp.getCell(wpTot, 5), `SUM(E3:E${wpTot - 1})`, lastWeek.cumulativeGsv, GBP)
  setF(wp.getCell(wpTot, 6), `SUM(F3:F${wpTot - 1})`, lastWeek.cumulativeFunding, GBP)
  setF(wp.getCell(wpTot, 7), `SUM(G3:G${wpTot - 1})`, lastWeek.cumulativeNsv, GBP)
  setF(wp.getCell(wpTot, 8), `SUM(H3:H${wpTot - 1})`, lastWeek.cumulativeMargin, GBP)
  for (let c = 2; c <= 10; c++) {
    const cc = wp.getCell(wpTot, c)
    cc.border = { top: { style: 'medium', color: { argb: INK } } }
    mono(cc, { bold: true })
  }
  // THE ANNUAL PLAN — gross to net, off the table above
  let apr = wpTot + 2
  const apLabel = wp.getCell(apr, 2)
  apLabel.value = 'THE ANNUAL PLAN — GROSS TO NET'
  mono(apLabel, { size: 8, color: 'FF666666' })
  apr++
  const apLine = (label: string, formula: string, result: number, fmt: string, bold = false) => {
    const l = wp.getCell(apr, 2)
    l.value = label
    mono(l, { bold })
    wp.mergeCells(apr, 2, apr, 4)
    const v = wp.getCell(apr, 5)
    setF(v, formula, result, fmt)
    mono(v, { bold })
    v.alignment = { horizontal: 'right' }
    apr++
  }
  apLine('GSV (invoice, full list)', `$E$${wpTot}`, listing.totalGsv, GBP, true)
  apLine('less promo funding', `-$F$${wpTot}`, -listing.totalFunding, GBP)
  apLine('NSV', `$G$${wpTot}`, listing.totalNsv, GBP, true)
  apLine('NSV as % of GSV', `IF($E$${wpTot}=0,0,$G$${wpTot}/$E$${wpTot})`, listing.nsvPctOfGsv, PCT)
  apLine('Gross margin (NSV less COGS)', `$H$${wpTot}`, listing.totalGrossMargin, GBP, true)
  apLine('GM as % of NSV', `IF($G$${wpTot}=0,0,$H$${wpTot}/$G$${wpTot})`, listing.gmPctOfNsv, PCT)
  apLine('less inbound logistics', `-($D$${wpTot}/UnitsPerCase)*GroceryLogistics`, -listing.totalCases * scenario.grocery.logisticsPerCase, GBP)
  apLine('Margin after logistics', `$H$${wpTot}-($D$${wpTot}/UnitsPerCase)*GroceryLogistics`, listing.totalGrossMargin - listing.totalCases * scenario.grocery.logisticsPerCase, GBP, true)

  // ── STOCK PLAN ─────────────────────────────────────────────────────────────
  const sp = wb.addWorksheet('Stock Plan', { properties: { tabColor: { argb: INK } } })
  sp.views = [{ showGridLines: false, state: 'frozen', ySplit: 2 }]
  for (let i = 1; i <= 9; i++) sp.getColumn(i).fill = fill(RECEIPT)
  sp.getColumn(1).width = 2
  ;[8, 12, 12, 12, 22, 12, 12, 14].forEach((wdt, i) => { sp.getColumn(i + 2).width = wdt })
  const spHeaders = ['WK', 'DEMAND', 'OPENING', 'ARRIVALS', 'ORDER PLACED (EDIT ME)', 'AVAILABLE', 'CLOSING', 'UNMET DEMAND']
  spHeaders.forEach((h, i) => {
    const c = sp.getCell(2, i + 2)
    c.value = h
    c.fill = fill(INK)
    c.font = { name: MONO, size: 9, bold: true, color: { argb: i === 4 ? REDUCED : BILE } }
  })
  const nStock = plan.rows.length
  plan.rows.forEach((row, i) => {
    const rr = i + 3
    const a = sp.getCell(rr, 2); a.value = row.week; mono(a)
    setF(sp.getCell(rr, 3), `Stores*ROS*(1+SUMPRODUCT(($B${rr}>=PromoStarts)*($B${rr}<PromoStarts+PromoLens)*PromoUplifts))`, row.demand, INT)
    if (i === 0) setF(sp.getCell(rr, 4), 'StartStock', row.opening, INT)
    else setF(sp.getCell(rr, 4), `$H${rr - 1}`, row.opening, INT)
    setF(sp.getCell(rr, 5), `IF($B${rr}>LeadWeeks,INDEX($F$3:$F$${nStock + 2},$B${rr}-LeadWeeks),0)`, row.arrivals, INT)
    const order = sp.getCell(rr, 6)
    order.value = row.orderPlaced
    order.numFmt = INT
    order.fill = fill(WHITE)
    order.border = { top: { style: 'thin', color: { argb: INK } }, bottom: { style: 'thin', color: { argb: INK } }, left: { style: 'thin', color: { argb: INK } }, right: { style: 'thin', color: { argb: INK } } }
    setF(sp.getCell(rr, 7), `$D${rr}+$E${rr}`, row.opening + row.arrivals, INT)
    setF(sp.getCell(rr, 8), `MAX(0,$G${rr}-$C${rr})`, row.closing, INT)
    setF(sp.getCell(rr, 9), `MAX(0,$C${rr}-$G${rr})`, row.shortfall, INT)
    for (let c = 3; c <= 9; c++) if (c !== 6) mono(sp.getCell(rr, c))
    mono(order, { bold: true })
  })
  // Stockout weeks turn red — live with your order edits
  sp.addConditionalFormatting({
    ref: `B3:I${nStock + 2}`,
    rules: [{ type: 'expression', formulae: ['$I3>0'], priority: 1, style: { fill: fill(REDPEN), font: { color: { argb: WHITE } } } }],
  })
  const spNote = sp.getCell(nStock + 4, 2)
  spNote.value = 'Orders (column F) are plain numbers — edit them and arrivals, closings and unmet demand recalculate. Red rows are stockouts.'
  mono(spNote, { size: 8, color: 'FF666666' })
  sp.mergeCells(nStock + 4, 2, nStock + 4, 9)

  // ── THE CUTS (Amazon + TikTok) ─────────────────────────────────────────────
  const cuts = wb.addWorksheet('The Cuts', { properties: { tabColor: { argb: BILE } } })
  receiptBase(cuts)
  sheetCols(cuts)
  r = toolHeader(cuts, 'THE CUTS', 'marketplace margins · per unit')
  r = sectionEyebrow(cuts, r, 'THE AMAZON CUT')
  r = line(cuts, r, 'Sale price ex-VAT', { formula: 'RRP/(1+VAT)', result: rsp, bold: true })
  const amzSp = r - 1
  r = line(cuts, r, 'Referral fee', { formula: `-$E$${amzSp}*AmzReferral`, result: -amazon.referralFee, dim: true })
  r = line(cuts, r, 'Fulfilment (incl. fuel)', { formula: '-AmzFulfil*(1+AmzFuel)', result: -amazon.fulfilmentFee, dim: true })
  r = line(cuts, r, 'Storage / unit', { formula: '-AmzStorage', result: -amazon.storageFee, dim: true })
  r = line(cuts, r, 'Selling plan / unit', { formula: '-AmzPlan/MAX(AmzUnits,1)', result: -planCut, dim: true })
  const amzGp = amazon.grossProfit - planCut
  const amzNetUnit = amazon.netRevenue - planCut
  r = line(cuts, r, 'Net revenue / unit', { formula: `$E$${amzSp}*(1-AmzReferral)-AmzFulfil*(1+AmzFuel)-AmzStorage-AmzPlan/MAX(AmzUnits,1)`, result: amzNetUnit, bold: true })
  const amzNetRow = r - 1
  r = line(cuts, r, 'Net as % of gross (ex-VAT)', { formula: `IF($E$${amzSp}=0,0,$E$${amzNetRow}/$E$${amzSp})`, result: rsp > 0 ? amzNetUnit / rsp : 0, fmt: PCT, dim: true })
  r = answerBlock(cuts, r, [
    { label: 'Amazon gross profit / unit', formula: `$E$${amzNetRow}-COGS`, result: amzGp, fmt: GBP, red: amzGp <= 0 },
  ])
  r = line(cuts, r, 'Margin as % of net revenue', { formula: `IF($E$${amzNetRow}=0,0,($E$${amzNetRow}-COGS)/$E$${amzNetRow})`, result: amzNetUnit > 0 ? amzGp / amzNetUnit : 0, fmt: PCT })
  r = line(cuts, r, 'less inbound logistics / unit', { formula: '-AmzLogistics/UnitsPerCase', result: -amazonLogUnit, dim: true })
  r = line(cuts, r, 'Profit after logistics / unit', { formula: `$E$${amzNetRow}-COGS-AmzLogistics/UnitsPerCase`, result: amzGp - amazonLogUnit, fmt: GBP, bold: true, red: amzGp - amazonLogUnit <= 0 })
  r = line(cuts, r, 'Break-even sale price (inc VAT)', {
    formula: '(COGS+AmzFulfil*(1+AmzFuel)+AmzStorage+AmzPlan/MAX(AmzUnits,1)+AmzLogistics/UnitsPerCase)/(1-AmzReferral)*(1+VAT)',
    result: ((product.cogsPerUnit + amazonFees.fulfilmentFeePerUnit * (1 + amazonFees.fuelLogisticsSurcharge) + amazonFees.monthlyStoragePerUnit + planCut + amazonLogUnit) / (1 - amazonFees.referralFeePercent)) * (1 + product.vatRate),
    bold: true,
  })
  r += 2
  r = sectionEyebrow(cuts, r, 'THE TIKTOK CUT')
  r = line(cuts, r, 'Sale price ex-VAT', { formula: 'RRP/(1+VAT)', result: rsp, bold: true })
  const ttkSp = r - 1
  r = line(cuts, r, 'Platform commission', { formula: `-$E$${ttkSp}*TtkCommission`, result: -tiktok.platformFee, dim: true })
  r = line(cuts, r, 'Affiliate commission', { formula: `-$E$${ttkSp}*TtkAffiliate`, result: -tiktok.affiliateFee, dim: true })
  r = line(cuts, r, 'Per-order fee', { formula: '-TtkOrderFee', result: -tiktok.perOrderFee, dim: true })
  r = line(cuts, r, 'Refund admin', { formula: `-$E$${ttkSp}*TtkRefund`, result: -tiktok.refundCost, dim: true })
  r = line(cuts, r, 'Net revenue / unit', { formula: `$E$${ttkSp}*(1-TtkCommission-TtkAffiliate-TtkRefund)-TtkOrderFee`, result: tiktok.netRevenue, bold: true })
  const ttkNetRow = r - 1
  r = line(cuts, r, 'Net as % of gross (ex-VAT)', { formula: `IF($E$${ttkSp}=0,0,$E$${ttkNetRow}/$E$${ttkSp})`, result: tiktok.netPctOfGross, fmt: PCT, dim: true })
  r = answerBlock(cuts, r, [
    { label: 'TikTok gross profit / unit', formula: `$E$${ttkNetRow}-COGS`, result: tiktok.grossProfit, fmt: GBP, red: tiktok.grossProfit <= 0 },
  ])
  r = line(cuts, r, 'Margin as % of net revenue', { formula: `IF($E$${ttkNetRow}=0,0,($E$${ttkNetRow}-COGS)/$E$${ttkNetRow})`, result: tiktok.grossMarginPctOfNet, fmt: PCT })
  r = line(cuts, r, 'less inbound logistics / unit', { formula: '-TtkLogistics/UnitsPerCase', result: -tiktokLogUnit, dim: true })
  r = line(cuts, r, 'Profit after logistics / unit', { formula: `$E$${ttkNetRow}-COGS-TtkLogistics/UnitsPerCase`, result: tiktok.grossProfit - tiktokLogUnit, fmt: GBP, bold: true, red: tiktok.grossProfit - tiktokLogUnit <= 0 })
  r = line(cuts, r, 'Break-even sale price (inc VAT)', {
    formula: '(TtkOrderFee+COGS+TtkLogistics/UnitsPerCase)/(1-TtkCommission-TtkAffiliate-TtkRefund)*(1+VAT)',
    result: ((tiktokFees.perOrderFee + product.cogsPerUnit + tiktokLogUnit) / (1 - tiktokFees.platformCommission - tiktokFees.affiliateCommission - tiktokFees.refundAdminPercent)) * (1 + product.vatRate),
    bold: true,
  })

  // FULL YEAR — x cases a year through each marketplace
  r += 2
  r = sectionEyebrow(cuts, r, `THE FULL YEAR — AMAZON (${amzCasesYear} CASES)`)
  r = line(cuts, r, 'Units (cases × units per case)', { formula: 'AmzCasesYear*UnitsPerCase', result: amazonYear.units, fmt: INT, dim: true })
  r = line(cuts, r, 'GSV (ex-VAT)', { formula: 'AmzCasesYear*UnitsPerCase*RSPexVAT', result: amazonYear.gsv, bold: true })
  const amzYearGsv = r - 1
  r = line(cuts, r, 'less referral', { formula: `-$E$${amzYearGsv}*AmzReferral`, result: -amazonYear.referral, dim: true })
  r = line(cuts, r, 'less fulfilment (incl. fuel)', { formula: '-AmzCasesYear*UnitsPerCase*AmzFulfil*(1+AmzFuel)', result: -amazonYear.fulfilment, dim: true })
  r = line(cuts, r, 'less storage', { formula: '-AmzCasesYear*UnitsPerCase*AmzStorage', result: -amazonYear.storage, dim: true })
  r = line(cuts, r, 'less selling plan (12 months)', { formula: '-AmzPlan*12', result: -amazonYear.plan, dim: true })
  r = line(cuts, r, 'NSV', { formula: `$E$${amzYearGsv}*(1-AmzReferral)-AmzCasesYear*UnitsPerCase*(AmzFulfil*(1+AmzFuel)+AmzStorage)-AmzPlan*12`, result: amazonYear.nsv, bold: true })
  const amzYearNsv = r - 1
  r = line(cuts, r, 'NSV as % of GSV', { formula: `IF($E$${amzYearGsv}=0,0,$E$${amzYearNsv}/$E$${amzYearGsv})`, result: amazonYear.nsvPctOfGsv, fmt: PCT, dim: true })
  r = line(cuts, r, 'less COGS', { formula: '-AmzCasesYear*UnitsPerCase*COGS', result: -amazonYear.cogs, dim: true })
  r = answerBlock(cuts, r, [
    { label: 'Amazon gross margin, year', formula: `$E$${amzYearNsv}-AmzCasesYear*UnitsPerCase*COGS`, result: amazonYear.gm, fmt: GBP, red: amazonYear.gm <= 0 },
  ])
  const amzYearGmRow = r - 1
  r = line(cuts, r, 'GM as % of NSV', { formula: `IF($E$${amzYearNsv}=0,0,$E$${amzYearGmRow}/$E$${amzYearNsv})`, result: amazonYear.gmPctOfNsv, fmt: PCT })
  r = line(cuts, r, 'GM as % of GSV', { formula: `IF($E$${amzYearGsv}=0,0,$E$${amzYearGmRow}/$E$${amzYearGsv})`, result: amazonYear.gmPctOfGsv, fmt: PCT, dim: true })
  r = line(cuts, r, 'less inbound logistics (year)', { formula: '-AmzCasesYear*AmzLogistics', result: -amzCasesYear * scenario.amazon.logisticsPerCase, dim: true })
  r = line(cuts, r, 'Profit after logistics, year', { formula: `$E$${amzYearGmRow}-AmzCasesYear*AmzLogistics`, result: amazonYear.gm - amzCasesYear * scenario.amazon.logisticsPerCase, fmt: GBP, bold: true, red: amazonYear.gm - amzCasesYear * scenario.amazon.logisticsPerCase <= 0 })

  r += 2
  r = sectionEyebrow(cuts, r, `THE FULL YEAR — TIKTOK (${scenario.tiktok.casesPerYear} CASES)`)
  r = line(cuts, r, 'Units (cases × units per case)', { formula: 'TtkCasesYear*UnitsPerCase', result: tiktokYear.units, fmt: INT, dim: true })
  r = line(cuts, r, 'GSV (ex-VAT)', { formula: 'TtkCasesYear*UnitsPerCase*RSPexVAT', result: tiktokYear.gsv, bold: true })
  const ttkYearGsv = r - 1
  r = line(cuts, r, 'less platform commission', { formula: `-$E$${ttkYearGsv}*TtkCommission`, result: -tiktokYear.platform, dim: true })
  r = line(cuts, r, 'less affiliate commission', { formula: `-$E$${ttkYearGsv}*TtkAffiliate`, result: -tiktokYear.affiliate, dim: true })
  r = line(cuts, r, 'less per-order fees', { formula: '-TtkCasesYear*UnitsPerCase*TtkOrderFee', result: -tiktokYear.orderFees, dim: true })
  r = line(cuts, r, 'less refund admin', { formula: `-$E$${ttkYearGsv}*TtkRefund`, result: -tiktokYear.refunds, dim: true })
  r = line(cuts, r, 'NSV', { formula: `$E$${ttkYearGsv}*(1-TtkCommission-TtkAffiliate-TtkRefund)-TtkCasesYear*UnitsPerCase*TtkOrderFee`, result: tiktokYear.nsv, bold: true })
  const ttkYearNsv = r - 1
  r = line(cuts, r, 'NSV as % of GSV', { formula: `IF($E$${ttkYearGsv}=0,0,$E$${ttkYearNsv}/$E$${ttkYearGsv})`, result: tiktokYear.nsvPctOfGsv, fmt: PCT, dim: true })
  r = line(cuts, r, 'less COGS', { formula: '-TtkCasesYear*UnitsPerCase*COGS', result: -tiktokYear.cogs, dim: true })
  r = answerBlock(cuts, r, [
    { label: 'TikTok gross margin, year', formula: `$E$${ttkYearNsv}-TtkCasesYear*UnitsPerCase*COGS`, result: tiktokYear.gm, fmt: GBP, red: tiktokYear.gm <= 0 },
  ])
  const ttkYearGmRow = r - 1
  r = line(cuts, r, 'GM as % of NSV', { formula: `IF($E$${ttkYearNsv}=0,0,$E$${ttkYearGmRow}/$E$${ttkYearNsv})`, result: tiktokYear.gmPctOfNsv, fmt: PCT })
  r = line(cuts, r, 'GM as % of GSV', { formula: `IF($E$${ttkYearGsv}=0,0,$E$${ttkYearGmRow}/$E$${ttkYearGsv})`, result: tiktokYear.gmPctOfGsv, fmt: PCT, dim: true })
  r = line(cuts, r, 'less inbound logistics (year)', { formula: '-TtkCasesYear*TtkLogistics', result: -scenario.tiktok.casesPerYear * scenario.tiktok.logisticsPerCase, dim: true })
  r = line(cuts, r, 'Profit after logistics, year', { formula: `$E$${ttkYearGmRow}-TtkCasesYear*TtkLogistics`, result: tiktokYear.gm - scenario.tiktok.casesPerYear * scenario.tiktok.logisticsPerCase, fmt: GBP, bold: true, red: tiktokYear.gm - scenario.tiktok.casesPerYear * scenario.tiktok.logisticsPerCase <= 0 })

  verdictAndFooter(cuts, r + 1, 'Same cost price across both. Fees are dated defaults — check the rate card.')

  // ── THE LINE-UP ────────────────────────────────────────────────────────────
  const lu = wb.addWorksheet('The Line-Up', { properties: { tabColor: { argb: BILE } } })
  receiptBase(lu)
  sheetCols(lu)
  r = toolHeader(lu, 'THE LINE-UP', 'gross profit / unit · same cost price')
  const channels: { label: string; gpFormula: string; gp: number }[] = [
    { label: 'GROCERY', gpFormula: 'NetRevPerUnit-COGS', gp: grocery.brandGrossMarginPerUnit },
    { label: 'AMAZON FBA', gpFormula: 'RSPexVAT*(1-AmzReferral)-AmzFulfil*(1+AmzFuel)-AmzStorage-COGS', gp: amazon.grossProfit },
    { label: 'TIKTOK SHOP', gpFormula: 'RSPexVAT*(1-TtkCommission-TtkAffiliate-TtkRefund)-TtkOrderFee-COGS', gp: tiktok.grossProfit },
  ]
  for (const ch of channels) {
    const head = lu.getCell(r, 2)
    head.value = ch.label
    for (let i = 2; i <= 5; i++) lu.getCell(r, i).fill = fill(ch.gp === Math.max(...channels.map((c) => c.gp)) && ch.gp > 0 ? BILE : RECEIPT)
    mono(head, { bold: true })
    if (ch.gp === Math.max(...channels.map((c) => c.gp)) && ch.gp > 0) {
      const best = lu.getCell(r, 5)
      best.value = 'BEST'
      mono(best, { bold: true })
      best.alignment = { horizontal: 'right' }
    }
    r++
    r = line(lu, r, 'Gross profit / unit', { formula: ch.gpFormula, result: ch.gp, bold: true, red: ch.gp <= 0 })
    r = line(lu, r, '% of shelf ex-VAT', { formula: `IF(RSPexVAT=0,0,$E$${r - 1}/RSPexVAT)`, result: rsp > 0 ? ch.gp / rsp : 0, fmt: PCT, dim: true })
    r++
  }
  verdictAndFooter(lu, r, 'The biggest channel is rarely the one that pays.')

  // ── THE RANGE (static snapshot) ────────────────────────────────────────────
  // (Multi-product; the live model above runs on the product on shelf.)

  // ── DOWNLOAD ───────────────────────────────────────────────────────────────
  const buffer = await wb.xlsx.writeBuffer()
  const blob = new Blob([buffer], {
    type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = `GROSS_${product.name.replace(/\s+/g, '_')}.xlsx`
  a.click()
  URL.revokeObjectURL(url)
}

/** Local £ formatter for the printed verdict sentences. */
function fmtGBP(v: number): string {
  const m = Math.abs(v).toLocaleString('en-GB', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
  return `${v < 0 ? '−' : ''}£${m}`
}
