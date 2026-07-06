import type { Product } from '../types/product'

/**
 * Core commercial maths derived from the Product spine.
 * These are pure functions — no side effects, easy to test.
 */

/** Strip VAT from a VAT-inclusive price */
export function exVat(incVat: number, vatRate: number): number {
  return incVat / (1 + vatRate)
}

/**
 * Inbound logistics (freight to the customer's DC/FC) expressed per consumer
 * unit. Entered ONCE as £ per case — a constant for every product and every
 * customer — and treated as part of the landed-cost make-up: every margin
 * function below deducts it alongside COGS.
 */
export function logisticsPerUnit(logisticsPerCase: number, unitsPerCase: number): number {
  return unitsPerCase > 0 ? logisticsPerCase / unitsPerCase : 0
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
export function retailerPnL(
  product: Product,
  retailerMarginPercent: number,
  wholesalerMarginPercent = 0,
  logisticsPerUnitCost = 0,
) {
  const rsp = rspExVat(product)
  const costToRetailer = rsp * (1 - retailerMarginPercent)
  const retailerMarginPerUnit = rsp - costToRetailer

  const wholesalerMarginPerUnit = costToRetailer * wholesalerMarginPercent
  const costToWholesaler = costToRetailer - wholesalerMarginPerUnit

  const brandNetRevenue = costToWholesaler
  // Landed cost = COGS + inbound logistics — both come out before margin
  const landedCostPerUnit = product.cogsPerUnit + logisticsPerUnitCost
  const brandGrossMarginPerUnit = brandNetRevenue - landedCostPerUnit
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
    logisticsPerUnit: logisticsPerUnitCost,
    landedCostPerUnit,
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
  logisticsPerUnitCost = 0,
) {
  const rsp = exVat(rrpIncVat, vatRate)
  const costToRetailer = rsp * (1 - retailerMarginPercent)
  const costToWholesaler = costToRetailer * (1 - wholesalerMarginPercent)
  // Margin target must clear the LANDED cost, so freight comes off the room for COGS
  const requiredCogs = costToWholesaler * (1 - targetBrandMarginPercent) - logisticsPerUnitCost
  return { requiredCogs, costToRetailer, costToWholesaler, rspExVat: rsp }
}

export function solveForRrp(
  cogsPerUnit: number,
  vatRate: number,
  retailerMarginPercent: number,
  targetBrandMarginPercent: number,
  wholesalerMarginPercent = 0,
  logisticsPerUnitCost = 0,
) {
  const costToWholesaler = (cogsPerUnit + logisticsPerUnitCost) / (1 - targetBrandMarginPercent)
  const costToRetailer = costToWholesaler / (1 - wholesalerMarginPercent)
  const rsp = costToRetailer / (1 - retailerMarginPercent)
  const rrpIncVat = rsp * (1 + vatRate)
  return { rrpIncVat, costToRetailer, costToWholesaler, rspExVat: rsp }
}

/**
 * Retailer listing model — project GSV, funding, NSV, volume and margin over
 * a period, week by week, with up to six promo windows on the calendar.
 *
 * The gross-to-net convention for a promo week:
 *  - GSV (invoice) = volume × list price. The list price never moves.
 *  - If the promo is supplier funded, the brand funds the price cut off
 *    invoice so the retailer keeps their margin %: funding = GSV × discount.
 *  - NSV = GSV − funding. Gross margin = NSV − COGS. If the retailer funds
 *    the promo, funding is zero and the brand banks full list.
 */
export interface PromoWindow {
  startWeek: number
  weeks: number
  /** Volume uplift during the promo, as a decimal (0.5 = +50%) */
  uplift: number
  /** Consumer price cut, as a decimal of the shelf price (0.25 = 25% off; 3 for 2 = 1/3) */
  discount: number
  /** True = the brand funds the cut off invoice; false = the retailer eats it */
  supplierFunded: boolean
}

export interface ListingModelInputs {
  stores: number
  skus: number
  weeksInPeriod: number
  promos: PromoWindow[]
}

/**
 * Annual customer investment — a fixed cash amount supporting the listing,
 * paid in four even quarterly instalments: weeks 1, 14, 27 and 40 of each
 * 52-week year (the pattern repeats past week 52).
 */
export function investmentForWeek(annualInvestment: number, week: number): number {
  if (annualInvestment <= 0 || week < 1) return 0
  return (week - 1) % 13 === 0 ? annualInvestment / 4 : 0
}

/** Quarterly instalments falling inside a period of N weeks. */
export function investmentInPeriod(annualInvestment: number, weeksInPeriod: number): number {
  if (annualInvestment <= 0 || weeksInPeriod < 1) return 0
  // Payments land every 13 weeks starting at week 1
  const payments = Math.floor((weeksInPeriod - 1) / 13) + 1
  return (annualInvestment / 4) * payments
}

/** Does any promo cover this week? */
export function promosCoveringWeek(promos: PromoWindow[], week: number): PromoWindow[] {
  return promos.filter((p) => week >= p.startWeek && week < p.startWeek + p.weeks)
}

/** Total volume uplift in force this week (overlapping promos stack). */
export function promoUpliftForWeek(promos: PromoWindow[], week: number): number {
  return promosCoveringWeek(promos, week).reduce((a, p) => a + p.uplift, 0)
}

/** Total supplier-funded deduction rate (% of list) in force this week. */
export function promoFundingRateForWeek(promos: PromoWindow[], week: number): number {
  return promosCoveringWeek(promos, week).reduce((a, p) => a + (p.supplierFunded ? p.discount : 0), 0)
}

/** Total consumer price cut this week (funded or not — the shopper pays less either way). */
export function promoDiscountForWeek(promos: PromoWindow[], week: number): number {
  return promosCoveringWeek(promos, week).reduce((a, p) => a + p.discount, 0)
}

export interface WeeklyProjectionRow {
  week: number
  onPromo: boolean
  volume: number
  /** Invoice value at full list price */
  gsv: number
  /** Supplier-funded promo deduction off invoice */
  funding: number
  /** GSV less funding */
  nsv: number
  /** NSV less COGS */
  grossMargin: number
  /** Consumer £ through the till (promo weeks at the cut shelf price) */
  retailSalesValue: number
  cumulativeVolume: number
  cumulativeGsv: number
  cumulativeFunding: number
  cumulativeNsv: number
  cumulativeMargin: number
}

export function weeklyProjection(
  product: Product,
  retailerMarginPercent: number,
  inputs: ListingModelInputs,
  wholesalerMarginPercent = 0,
  logisticsPerUnitCost = 0,
): WeeklyProjectionRow[] {
  const pnl = retailerPnL(product, retailerMarginPercent, wholesalerMarginPercent, logisticsPerUnitCost)
  const list = pnl.brandNetRevenue
  const baseWeeklyVolume = product.weeklyRateOfSale * inputs.stores * inputs.skus

  const rows: WeeklyProjectionRow[] = []
  let cumulativeVolume = 0
  let cumulativeGsv = 0
  let cumulativeFunding = 0
  let cumulativeNsv = 0
  let cumulativeMargin = 0

  for (let week = 1; week <= inputs.weeksInPeriod; week++) {
    const uplift = promoUpliftForWeek(inputs.promos, week)
    const fundingRate = promoFundingRateForWeek(inputs.promos, week)
    const discount = promoDiscountForWeek(inputs.promos, week)
    const onPromo = promosCoveringWeek(inputs.promos, week).length > 0

    const volume = baseWeeklyVolume * (1 + uplift)
    const gsv = volume * list
    const funding = gsv * fundingRate
    const nsv = gsv - funding
    // Landed cost per unit: COGS + the constant inbound logistics
    const grossMargin = nsv - volume * (product.cogsPerUnit + logisticsPerUnitCost)
    const retailSalesValue = volume * product.rrpIncVat * Math.max(0, 1 - discount)

    cumulativeVolume += volume
    cumulativeGsv += gsv
    cumulativeFunding += funding
    cumulativeNsv += nsv
    cumulativeMargin += grossMargin

    rows.push({
      week, onPromo, volume, gsv, funding, nsv, grossMargin, retailSalesValue,
      cumulativeVolume, cumulativeGsv, cumulativeFunding, cumulativeNsv, cumulativeMargin,
    })
  }
  return rows
}

/**
 * The year by month — the weekly spine rolled up on the FMCG 4-4-5 calendar
 * (quarters of 4+4+5 weeks; 12 months = 52 weeks). Fixed cash (customer
 * investment) lands in the month its quarterly instalment falls: M1, M4,
 * M7, M10. Months past the projection simply sum fewer (or zero) weeks.
 */
export interface MonthlyPhasingRow {
  month: number
  /** First and last week of the month on the 4-4-5 calendar */
  weekStart: number
  weekEnd: number
  volume: number
  gsv: number
  funding: number
  nsv: number
  grossMargin: number
  investment: number
  /** Gross margin less the investment instalments landing this month */
  netOfInvestment: number
}

const MONTH_WEEKS_445 = [4, 4, 5, 4, 4, 5, 4, 4, 5, 4, 4, 5]

export function monthlyPhasing(
  weeks: WeeklyProjectionRow[],
  annualInvestment = 0,
): MonthlyPhasingRow[] {
  const rows: MonthlyPhasingRow[] = []
  let weekStart = 1
  MONTH_WEEKS_445.forEach((len, i) => {
    const weekEnd = weekStart + len - 1
    let volume = 0, gsv = 0, funding = 0, nsv = 0, grossMargin = 0, investment = 0
    for (let w = weekStart; w <= weekEnd; w++) {
      investment += investmentForWeek(annualInvestment, w)
      const row = weeks[w - 1]
      if (!row) continue
      volume += row.volume
      gsv += row.gsv
      funding += row.funding
      nsv += row.nsv
      grossMargin += row.grossMargin
    }
    rows.push({
      month: i + 1,
      weekStart,
      weekEnd,
      volume,
      gsv,
      funding,
      nsv,
      grossMargin,
      investment,
      netOfInvestment: grossMargin - investment,
    })
    weekStart = weekEnd + 1
  })
  return rows
}

/**
 * THE WAIT — when the money actually moves, not when the sale happens.
 * Cash in: a week's NSV arrives `debtorDays` after invoice. Cash out: you pay
 * your supplier for that week's goods `creditorDays` after their invoice, and
 * the customer investment instalments leave in their calendar weeks. Days are
 * rounded to whole weeks. Stock build is The Stock Answer's problem — this is
 * the trading cash cycle on the sales line.
 */
export interface CashWeekRow {
  week: number
  cashIn: number
  cashOut: number
  net: number
  cumulative: number
}

export function cashPhasing(
  weeks: WeeklyProjectionRow[],
  product: Product,
  debtorDays: number,
  creditorDays: number,
  logisticsPerUnitCost = 0,
  annualInvestment = 0,
  /** One-off shelf fill (pipefill) landing in week 1: the NSV invoiced and the
   *  landed goods cost of stocking every store to go live. */
  shelfFill: { nsv: number; cost: number } = { nsv: 0, cost: 0 },
): { rows: CashWeekRow[]; peakGap: number; peakGapWeek: number; totalIn: number; totalOut: number } {
  const lagIn = Math.max(0, Math.round(debtorDays / 7))
  const lagOut = Math.max(0, Math.round(creditorDays / 7))
  const landedPerUnit = product.cogsPerUnit + logisticsPerUnitCost
  const horizon = weeks.length + Math.max(lagIn, lagOut)
  // The shelf fill is invoiced and bought in week 1, so its cash lands on the
  // same terms as any week-1 sale
  const fillInWeek = 1 + lagIn
  const fillOutWeek = 1 + lagOut

  const rows: CashWeekRow[] = []
  let cumulative = 0
  let peakGap = 0
  let peakGapWeek = 0
  let totalIn = 0
  let totalOut = 0
  for (let w = 1; w <= horizon; w++) {
    const saleInWeek = weeks[w - lagIn - 1]
    const saleOutWeek = weeks[w - lagOut - 1]
    const cashIn = (saleInWeek ? saleInWeek.nsv : 0) + (w === fillInWeek ? shelfFill.nsv : 0)
    const cashOut =
      (saleOutWeek ? saleOutWeek.volume * landedPerUnit : 0) +
      investmentForWeek(annualInvestment, w) +
      (w === fillOutWeek ? shelfFill.cost : 0)
    const net = cashIn - cashOut
    cumulative += net
    if (cumulative < peakGap) { peakGap = cumulative; peakGapWeek = w }
    totalIn += cashIn
    totalOut += cashOut
    rows.push({ week: w, cashIn, cashOut, net, cumulative })
  }
  return { rows, peakGap, peakGapWeek, totalIn, totalOut }
}

/** One promo's contribution to the annual plan, over its clamped window. */
export interface PromoSummary {
  index: number
  startWeek: number
  /** Weeks actually inside the period */
  weeksInPeriod: number
  incrementalUnits: number
  fundingCost: number
  clamped: boolean
}

/** Period totals, derived from the weekly projection so the two always agree. */
export function listingModel(
  product: Product,
  retailerMarginPercent: number,
  inputs: ListingModelInputs,
  wholesalerMarginPercent = 0,
  logisticsPerUnitCost = 0,
  annualInvestment = 0,
) {
  const weeks = weeklyProjection(product, retailerMarginPercent, inputs, wholesalerMarginPercent, logisticsPerUnitCost)
  const last = weeks[weeks.length - 1]
  const baseWeeklyVolume = product.weeklyRateOfSale * inputs.stores * inputs.skus
  const pnl = retailerPnL(product, retailerMarginPercent, wholesalerMarginPercent, logisticsPerUnitCost)

  const promoSummaries: PromoSummary[] = inputs.promos.map((p, index) => {
    let incrementalUnits = 0
    let fundingCost = 0
    let weeksInside = 0
    for (let week = p.startWeek; week < p.startWeek + p.weeks; week++) {
      if (week < 1 || week > inputs.weeksInPeriod) continue
      weeksInside++
      const row = weeks[week - 1]
      incrementalUnits += baseWeeklyVolume * p.uplift
      if (p.supplierFunded) fundingCost += row.volume * pnl.brandNetRevenue * p.discount
    }
    return {
      index,
      startWeek: p.startWeek,
      weeksInPeriod: weeksInside,
      incrementalUnits,
      fundingCost,
      clamped: weeksInside < p.weeks,
    }
  })

  const totalGsv = last?.cumulativeGsv ?? 0
  const totalFunding = last?.cumulativeFunding ?? 0
  const totalNsv = last?.cumulativeNsv ?? 0
  const totalGrossMargin = last?.cumulativeMargin ?? 0
  // Fixed cash supporting the listing, in even quarterly instalments —
  // below gross margin (it does not move with volume)
  const totalInvestment = investmentInPeriod(annualInvestment, inputs.weeksInPeriod)

  return {
    totalInvestment,
    marginAfterInvestment: totalGrossMargin - totalInvestment,
    totalVolume: last?.cumulativeVolume ?? 0,
    totalGsv,
    totalFunding,
    totalNsv,
    /** NSV as a share of GSV — how much of the invoice survives the promo plan */
    nsvPctOfGsv: totalGsv > 0 ? totalNsv / totalGsv : 0,
    totalGrossMargin,
    /** Margin as a share of NSV */
    gmPctOfNsv: totalNsv > 0 ? totalGrossMargin / totalNsv : 0,
    /** Kept for callers that treat "revenue" as what the brand banks (= NSV) */
    totalRevenue: totalNsv,
    totalRetailSalesValue: weeks.reduce((a, w) => a + w.retailSalesValue, 0),
    totalCases: (last?.cumulativeVolume ?? 0) / product.unitsPerCase,
    weeklyVolume: baseWeeklyVolume,
    peakWeeklyVolume: weeks.reduce((a, w) => Math.max(a, w.volume), 0),
    promoSummaries,
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
  logisticsPerUnitCost = 0,
) {
  const pnl = retailerPnL(product, retailerMarginPercent, wholesalerMarginPercent, logisticsPerUnitCost)
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

export function amazonFBAMargin(product: Product, fees: AmazonFBAFees, logisticsPerUnitCost = 0) {
  const sellingPrice = product.rrpIncVat
  const sellingPriceExVat = exVat(sellingPrice, product.vatRate)

  const referralFee = sellingPriceExVat * fees.referralFeePercent
  const fulfilmentFee = fees.fulfilmentFeePerUnit * (1 + fees.fuelLogisticsSurcharge)
  const storageFee = fees.monthlyStoragePerUnit
  const totalFees = referralFee + fulfilmentFee + storageFee

  const netRevenue = sellingPriceExVat - totalFees
  const grossProfit = netRevenue - product.cogsPerUnit - logisticsPerUnitCost
  const grossMarginPercent = sellingPriceExVat > 0 ? grossProfit / sellingPriceExVat : 0
  const grossMarginPctOfNet = netRevenue > 0 ? grossProfit / netRevenue : 0

  return {
    sellingPriceExVat,
    referralFee,
    fulfilmentFee,
    storageFee,
    totalFees,
    netRevenue,
    /** Net revenue as a share of the gross (ex-VAT) sale price */
    netPctOfGross: sellingPriceExVat > 0 ? netRevenue / sellingPriceExVat : 0,
    grossProfit,
    grossMarginPercent,
    grossMarginPctOfNet,
  }
}

/**
 * Full-year marketplace P&L — x cases a year in, GSV / NSV / GM out.
 * GSV = units × sale price ex-VAT. NSV = GSV less every marketplace fee
 * (the selling plan charged as £/month × 12, not amortised per unit).
 * GM = NSV less COGS. Percentages: NSV as % of GSV, GM as % of NSV.
 */
export function amazonAnnualPnL(
  product: Product,
  fees: AmazonFBAFees,
  planMonthly: number,
  casesPerYear: number,
  logisticsPerCase = 0,
) {
  const units = casesPerYear * product.unitsPerCase
  const sp = exVat(product.rrpIncVat, product.vatRate)
  const gsv = units * sp
  const referral = gsv * fees.referralFeePercent
  const fulfilment = units * fees.fulfilmentFeePerUnit * (1 + fees.fuelLogisticsSurcharge)
  const storage = units * fees.monthlyStoragePerUnit
  const plan = planMonthly * 12
  const totalFees = referral + fulfilment + storage + plan
  const nsv = gsv - totalFees
  const cogs = units * product.cogsPerUnit
  const logistics = casesPerYear * logisticsPerCase
  const gm = nsv - cogs - logistics
  return {
    units,
    gsv,
    referral,
    fulfilment,
    storage,
    plan,
    totalFees,
    nsv,
    nsvPctOfGsv: gsv > 0 ? nsv / gsv : 0,
    cogs,
    logistics,
    gm,
    gmPctOfNsv: nsv > 0 ? gm / nsv : 0,
    gmPctOfGsv: gsv > 0 ? gm / gsv : 0,
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

export function tiktokShopMargin(product: Product, fees: TikTokFees, logisticsPerUnitCost = 0) {
  const sellingPrice = product.rrpIncVat
  const sellingPriceExVat = exVat(sellingPrice, product.vatRate)

  const platformFee = sellingPriceExVat * fees.platformCommission
  const affiliateFee = sellingPriceExVat * fees.affiliateCommission
  const refundCost = sellingPriceExVat * fees.refundAdminPercent
  const totalFees = platformFee + affiliateFee + fees.perOrderFee + refundCost

  const netRevenue = sellingPriceExVat - totalFees
  const grossProfit = netRevenue - product.cogsPerUnit - logisticsPerUnitCost
  const grossMarginPercent = sellingPriceExVat > 0 ? grossProfit / sellingPriceExVat : 0
  const grossMarginPctOfNet = netRevenue > 0 ? grossProfit / netRevenue : 0

  return {
    sellingPriceExVat,
    platformFee,
    affiliateFee,
    perOrderFee: fees.perOrderFee,
    refundCost,
    totalFees,
    netRevenue,
    /** Net revenue as a share of the gross (ex-VAT) sale price */
    netPctOfGross: sellingPriceExVat > 0 ? netRevenue / sellingPriceExVat : 0,
    grossProfit,
    grossMarginPercent,
    grossMarginPctOfNet,
  }
}

// ── Channels: per-product membership + whole-channel P&L ──────────────────────

/** Default annual volume for a SKU on a marketplace when none is set. */
export const DEFAULT_CHANNEL_CASES = 250

/** Is this product listed on the channel? Absent = listed (opt-out model). */
export function channelListed(p: Product, channel: 'grocery' | 'amazon' | 'tiktok'): boolean {
  return p.channels?.[channel] ?? true
}

/** A SKU's cases/year on a marketplace, with a sensible default. */
export function skuCasesPerYear(p: Product, channel: 'amazon' | 'tiktok'): number {
  const v = channel === 'amazon' ? p.channels?.amazonCasesPerYear : p.channels?.tiktokCasesPerYear
  return v ?? DEFAULT_CHANNEL_CASES
}

export interface ChannelSkuRow<Y> {
  product: Product
  casesPerYear: number
  year: Y
  logistics: number
}

/**
 * Whole-channel Amazon P&L across every listed SKU. Each SKU brings its own
 * price, case size and cases/year; the selling plan (£/mo × 12) is a single
 * channel cost charged once, not per SKU. Inbound freight is per case per SKU.
 */
export function amazonChannelPnL(
  products: Product[],
  amazonFeesFor: (p: Product) => AmazonFBAFees,
  planMonthly: number,
  logisticsPerCase: number,
) {
  const listed = products.filter((p) => channelListed(p, 'amazon'))
  const rows = listed.map((p) => {
    const cases = skuCasesPerYear(p, 'amazon')
    // Plan handled at channel level; logistics folds into each SKU's gm
    const year = amazonAnnualPnL(p, amazonFeesFor(p), 0, cases, logisticsPerCase)
    return { product: p, casesPerYear: cases, year, logistics: year.logistics }
  })
  const sum = (f: (r: (typeof rows)[number]) => number) => rows.reduce((a, r) => a + f(r), 0)
  const gsv = sum((r) => r.year.gsv)
  const fees = sum((r) => r.year.referral + r.year.fulfilment + r.year.storage)
  const plan = planMonthly * 12
  const cogs = sum((r) => r.year.cogs)
  const logistics = sum((r) => r.logistics)
  const nsv = gsv - fees - plan
  // Landed: COGS + inbound freight both come out before margin
  const gm = nsv - cogs - logistics
  return {
    rows, skuCount: listed.length, gsv, fees, plan, cogs, logistics,
    nsv, nsvPctOfGsv: gsv > 0 ? nsv / gsv : 0,
    gm, gmPctOfNsv: nsv > 0 ? gm / nsv : 0,
  }
}

/** Whole-channel TikTok Shop P&L across every listed SKU. */
export function tiktokChannelPnL(
  products: Product[],
  tiktokFees: TikTokFees,
  logisticsPerCase: number,
) {
  const listed = products.filter((p) => channelListed(p, 'tiktok'))
  const rows = listed.map((p) => {
    const cases = skuCasesPerYear(p, 'tiktok')
    const year = tiktokAnnualPnL(p, tiktokFees, cases, logisticsPerCase)
    return { product: p, casesPerYear: cases, year, logistics: year.logistics }
  })
  const sum = (f: (r: (typeof rows)[number]) => number) => rows.reduce((a, r) => a + f(r), 0)
  const gsv = sum((r) => r.year.gsv)
  const fees = sum((r) => r.year.platform + r.year.affiliate + r.year.orderFees + r.year.refunds)
  const cogs = sum((r) => r.year.cogs)
  const logistics = sum((r) => r.logistics)
  const nsv = gsv - fees
  const gm = nsv - cogs - logistics
  return {
    rows, skuCount: listed.length, gsv, fees, cogs, logistics,
    nsv, nsvPctOfGsv: gsv > 0 ? nsv / gsv : 0,
    gm, gmPctOfNsv: nsv > 0 ? gm / nsv : 0,
  }
}

/**
 * Full-year TikTok Shop P&L. Same shape as the Amazon one; the per-order fee
 * assumes one unit per order (the cautious read).
 */
export function tiktokAnnualPnL(product: Product, fees: TikTokFees, casesPerYear: number, logisticsPerCase = 0) {
  const units = casesPerYear * product.unitsPerCase
  const sp = exVat(product.rrpIncVat, product.vatRate)
  const gsv = units * sp
  const platform = gsv * fees.platformCommission
  const affiliate = gsv * fees.affiliateCommission
  const orderFees = units * fees.perOrderFee
  const refunds = gsv * fees.refundAdminPercent
  const totalFees = platform + affiliate + orderFees + refunds
  const nsv = gsv - totalFees
  const cogs = units * product.cogsPerUnit
  const logistics = casesPerYear * logisticsPerCase
  const gm = nsv - cogs - logistics
  return {
    units,
    gsv,
    platform,
    affiliate,
    orderFees,
    refunds,
    totalFees,
    nsv,
    nsvPctOfGsv: gsv > 0 ? nsv / gsv : 0,
    cogs,
    logistics,
    gm,
    gmPctOfNsv: nsv > 0 ? gm / nsv : 0,
    gmPctOfGsv: gsv > 0 ? gm / gsv : 0,
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
  logisticsPerUnitCost = 0,
) {
  const grocery = retailerPnL(product, retailerMarginPercent, wholesalerMarginPercent, logisticsPerUnitCost)
  const amazon = amazonFBAMargin(product, amazonFees, logisticsPerUnitCost)
  const tiktok = tiktokShopMargin(product, tiktokFees, logisticsPerUnitCost)

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
