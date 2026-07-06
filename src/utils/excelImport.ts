import type { Product } from '../types/product'
import type { Scenario, Promo } from '../store/scenario'
import { mergeScenario, PROMO_MECHANICS } from '../store/scenario'

/**
 * Upload the deck back — read an edited GROSS export and rebuild the model.
 *
 * How it works: the export embeds the complete model in a very-hidden
 * `gross-meta` sheet (identity + everything the named cells don't carry),
 * then every INPUT the deck exposes is read back over the top:
 *  - the named cells on Assumptions (product, chain, trade, supply, fees,
 *    logistics, the six-slot promo table)
 *  - The Range sheet's per-product rows (name, cost, RSP, case size,
 *    channel flags, cases/year) matched by row order to the embedded model
 *
 * Derived cells are locked in the export and ignored here — only inputs
 * travel. Everything fails soft with a deadpan error string.
 */

type Workbook = import('exceljs').Workbook

export interface ImportResult {
  ok: boolean
  error?: string
  products?: Product[]
  activeProductId?: string
  scenario?: Scenario
  summary?: string
}

/** Resolve a defined name to its first range's cells, e.g. "Assumptions!$C$5". */
function refToCells(wb: Workbook, name: string): { sheet: string; col: string; row: number }[] {
  const ranges = wb.definedNames.getRanges(name)
  const ref = ranges?.ranges?.[0]
  if (!ref) return []
  const m = ref.match(/^'?([^'!]+)'?!\$?([A-Z]+)\$?(\d+)(?::\$?([A-Z]+)\$?(\d+))?$/)
  if (!m) return []
  const [, sheet, col, rowStr, col2, row2Str] = m
  const row = parseInt(rowStr, 10)
  if (!col2) return [{ sheet, col, row }]
  const rowEnd = parseInt(row2Str, 10)
  const cells: { sheet: string; col: string; row: number }[] = []
  for (let r = row; r <= rowEnd; r++) cells.push({ sheet, col: col2 === col ? col : col, row: r })
  return cells
}

function cellNumber(wb: Workbook, at: { sheet: string; col: string; row: number }): number | null {
  const ws = wb.getWorksheet(at.sheet)
  if (!ws) return null
  const v = ws.getCell(`${at.col}${at.row}`).value
  if (typeof v === 'number' && Number.isFinite(v)) return v
  if (v && typeof v === 'object' && 'result' in v && typeof v.result === 'number') return v.result
  return null
}

/** A single named input cell's value, or null. */
function named(wb: Workbook, name: string): number | null {
  const cells = refToCells(wb, name)
  return cells.length ? cellNumber(wb, cells[0]) : null
}

/** A named column range's values (the promo table). */
function namedRange(wb: Workbook, name: string): (number | null)[] {
  return refToCells(wb, name).map((at) => cellNumber(wb, at))
}

const mechanicFor = (discount: number): string => {
  const hit = PROMO_MECHANICS.find((m) => Math.abs(m.discount - discount) < 0.005)
  return hit ? hit.label : 'Custom'
}

export async function importExcelModel(file: File): Promise<ImportResult> {
  let wb: Workbook
  try {
    const ExcelJS = await import('exceljs')
    wb = new ExcelJS.Workbook()
    await wb.xlsx.load(await file.arrayBuffer())
  } catch {
    return { ok: false, error: 'That did not read as an Excel file. Upload the .xlsx the Export gave you.' }
  }

  // 1. The embedded model — identity and base state
  const metaSheet = wb.getWorksheet('gross-meta')
  const tag = metaSheet?.getCell('A1').value
  const blob = metaSheet?.getCell('A2').value
  if (tag !== 'GROSS-DECK-V1' || typeof blob !== 'string') {
    return {
      ok: false,
      error: 'This deck predates upload-back (or is not a GROSS deck). Export a fresh one and edit that.',
    }
  }
  let base: { products: Product[]; activeProductId: string; scenario: Scenario }
  try {
    base = JSON.parse(decodeURIComponent(atob(blob)))
    if (!Array.isArray(base.products) || base.products.length === 0) throw new Error('empty')
  } catch {
    return { ok: false, error: 'The deck’s hidden model sheet is damaged. Export a fresh copy.' }
  }

  const products: Product[] = base.products.map((p) => ({ ...p, channels: p.channels ? { ...p.channels } : undefined }))

  // 2. The Range sheet rows — every product's basics + channel plan, by row order
  const rng = wb.getWorksheet('The Range')
  if (rng) {
    let headerRow = 0
    for (let r = 1; r <= 30 && !headerRow; r++) {
      if (rng.getCell(r, 2).value === 'SKU') headerRow = r
    }
    if (headerRow) {
      // Map columns by header text so old decks (no VAT%/ROS columns) and new
      // ones both read correctly
      const cols: Record<string, number> = {}
      for (let c = 2; c <= 20; c++) {
        const h = rng.getCell(headerRow, c).value
        if (typeof h === 'string' && h.trim()) cols[h.trim()] = c
      }
      for (let i = 0; i < products.length; i++) {
        const r = headerRow + 1 + i
        const label = rng.getCell(r, 2).value
        if (label === 'TOTAL (listed)' || label == null) break
        const p = products[i]
        if (typeof label === 'string' && label.trim()) p.name = label.trim()
        const num = (header: string) => {
          const col = cols[header]
          if (!col) return null
          const cell = rng.getCell(r, col)
          const v = typeof cell.value === 'object' && cell.value && 'result' in cell.value ? cell.value.result : cell.value
          return typeof v === 'number' && Number.isFinite(v) ? v : null
        }
        p.cogsPerUnit = num('COST') ?? p.cogsPerUnit
        p.rrpIncVat = num('RSP') ?? p.rrpIncVat
        p.vatRate = num('VAT%') ?? p.vatRate
        p.unitsPerCase = num('UPC') != null ? Math.max(1, Math.round(num('UPC')!)) : p.unitsPerCase
        p.weeklyRateOfSale = num('ROS') ?? p.weeklyRateOfSale
        p.channels = {
          ...p.channels,
          grocery: (num('GROC') ?? 1) >= 1,
          amazon: (num('AMZ') ?? 1) >= 1,
          amazonCasesPerYear: num('AMZ CS/YR') != null ? Math.max(0, Math.round(num('AMZ CS/YR')!)) : p.channels?.amazonCasesPerYear,
          tiktok: (num('TTK') ?? 1) >= 1,
          tiktokCasesPerYear: num('TTK CS/YR') != null ? Math.max(0, Math.round(num('TTK CS/YR')!)) : p.channels?.tiktokCasesPerYear,
        }
      }
    }
  }

  // 3. Named Assumptions cells over the PRIMARY product (they win over Range)
  const primary = products.find((p) => p.id === base.activeProductId) ?? products[0]
  const take = (name: string, apply: (v: number) => void) => {
    const v = named(wb, name)
    if (v != null) apply(v)
  }
  take('COGS', (v) => { primary.cogsPerUnit = v })
  take('UnitsPerCase', (v) => { primary.unitsPerCase = Math.max(1, Math.round(v)) })
  take('RRP', (v) => { primary.rrpIncVat = v })
  take('VAT', (v) => { primary.vatRate = v })
  take('ROS', (v) => { primary.weeklyRateOfSale = v })

  // 4. Scenario overlays
  const s = base.scenario
  take('RetailerMargin', (v) => { s.grocery.retailerMargin = v })
  const ws = named(wb, 'WholesalerMargin')
  if (ws != null) {
    s.grocery.wholesalerEnabled = ws > 0
    if (ws > 0) s.grocery.wholesalerMargin = ws
  }
  // One constant freight figure — new decks carry 'Logistics'; old decks had
  // per-channel cells, so fall back to the grocery one for a sensible read.
  take('Logistics', (v) => { s.logistics.perCase = Math.max(0, v) })
  if (named(wb, 'Logistics') == null) {
    take('GroceryLogistics', (v) => { s.logistics.perCase = Math.max(0, v) })
  }
  take('PromoFunding', (v) => { s.waterfall.promoFunding = v; s.waterfall.promoFromCalendar = false })
  take('BackMargin', (v) => { s.waterfall.backMargin = v })
  take('OtherTrade', (v) => { s.waterfall.otherTrade = v })
  take('Stores', (v) => { s.listing.stores = Math.max(1, Math.round(v)) })
  take('SKUs', (v) => { s.listing.skus = Math.max(1, Math.round(v)) })
  take('WeeksInPeriod', (v) => { s.listing.weeksInPeriod = Math.max(1, Math.min(104, Math.round(v))) })
  take('Investment', (v) => { s.listing.annualInvestment = Math.max(0, v) })
  take('StartStock', (v) => { s.stock.startingStockUnits = Math.max(0, Math.round(v)) })
  take('LeadWeeks', (v) => { s.stock.leadWeeks = Math.max(0, Math.round(v)) })
  take('CoverWeeks', (v) => { s.stock.weeksOfCover = Math.max(0, Math.round(v)) })

  // The promo calendar — six slots; start & length ≥ 1 means the slot is live
  const starts = namedRange(wb, 'PromoStarts')
  const lens = namedRange(wb, 'PromoLens')
  const uplifts = namedRange(wb, 'PromoUplifts')
  const discs = namedRange(wb, 'PromoDiscs')
  const funded = namedRange(wb, 'PromoFunded')
  if (starts.length === 6) {
    const promos: Promo[] = []
    for (let i = 0; i < 6; i++) {
      const start = Math.round(starts[i] ?? 0)
      const weeks = Math.round(lens[i] ?? 0)
      if (start >= 1 && weeks >= 1) {
        const discount = discs[i] ?? 0
        promos.push({
          id: `p${i + 1}`,
          startWeek: start,
          weeks,
          mechanic: mechanicFor(discount),
          discount,
          uplift: uplifts[i] ?? 0,
          supplierFunded: (funded[i] ?? 0) >= 1,
        })
      }
    }
    s.listing.promos = promos
  }

  // Marketplace fees come back as MANUAL per-unit values — the estimator and
  // the by-case amortisation were resolved at export, so this keeps the maths
  // identical to what the spreadsheet showed.
  const amzRef = named(wb, 'AmzReferral')
  if (amzRef != null) {
    s.amazon.estimatorOn = false
    s.amazon.sellByCase = false
    s.amazon.referralFee = amzRef
    take('AmzFulfil', (v) => { s.amazon.fulfilmentFee = v })
    take('AmzStorage', (v) => { s.amazon.storageFee = v })
    take('AmzFuel', (v) => { s.amazon.fuelSurcharge = v })
    take('AmzPlan', (v) => { s.amazon.planMonthly = v })
    take('AmzUnits', (v) => { s.amazon.monthlyUnits = Math.max(0, Math.round(v)) })
  }
  const ttkCom = named(wb, 'TtkCommission')
  if (ttkCom != null) {
    s.tiktok.estimatorOn = false
    s.tiktok.platformCommission = ttkCom
    take('TtkAffiliate', (v) => { s.tiktok.affiliateCommission = v })
    take('TtkOrderFee', (v) => { s.tiktok.perOrderFee = v })
    take('TtkRefund', (v) => { s.tiktok.refundAdmin = v })
    take('TtkCasesYear', (v) => { s.tiktok.casesPerYear = Math.max(0, Math.round(v)) })
  }

  const scenario = mergeScenario(s)
  const activeProductId = products.some((p) => p.id === base.activeProductId)
    ? base.activeProductId
    : products[0].id

  return {
    ok: true,
    products,
    activeProductId,
    scenario,
    summary: `${products.length} product${products.length === 1 ? '' : 's'} and every assumption read back in.`,
  }
}
