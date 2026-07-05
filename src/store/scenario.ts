import {
  GROCERY_DEFAULTS,
  AMAZON_FBA_DEFAULTS,
  TIKTOK_SHOP_DEFAULTS,
} from '../config/fees'
import {
  estimateAmazonFBAFee,
  getAmazonReferralRate,
  getTikTokCommission,
  type AmazonFBAFees,
  type TikTokFees,
} from '../utils/calculations'

/**
 * The Scenario — every calculator setting that isn't part of the Product itself.
 *
 * Lives in the Zustand store (not component state) so that:
 *  - settings survive switching between calculator tabs
 *  - the Cross-Channel view reads the SAME fees as the individual tabs
 *  - share URLs capture the full model, not just the product
 *
 * All percentages are stored as decimals (0.35 = 35%); the UI converts.
 */

export interface GroceryScenario {
  retailerMargin: number
  wholesalerEnabled: boolean
  wholesalerMargin: number
}

/**
 * Inbound logistics — freight to the customer's DC/FC, £ per case. A CONSTANT:
 * one figure for every product and every customer, part of the landed-cost
 * make-up, folded into gross margin everywhere (not a below-the-line extra).
 */
export interface LogisticsScenario {
  perCase: number
}

export interface MinMarginScenario {
  targetBrandMargin: number
  solveMode: 'cost' | 'rrp'
}

/**
 * A promo on the annual calendar. Between two and six a year is normal;
 * the model allows zero to six. `discount` is the consumer price cut as a
 * decimal of shelf price (3 for 2 = 1/3, BOGOF = 1/2). `supplierFunded`
 * means the brand funds the cut off invoice (the retailer keeps their
 * margin %); unfunded means the retailer eats it and the brand banks list.
 */
export interface Promo {
  id: string
  startWeek: number
  weeks: number
  /** Display label, e.g. "25% off", "3 for 2", "BOGOF", "Custom" */
  mechanic: string
  discount: number
  uplift: number
  supplierFunded: boolean
}

/** The standard mechanics, with typical uplifts. Both stay editable. */
export const PROMO_MECHANICS: { label: string; discount: number; uplift: number }[] = [
  { label: '20% off', discount: 0.20, uplift: 0.5 },
  { label: '25% off', discount: 0.25, uplift: 0.65 },
  { label: '33% off', discount: 0.33, uplift: 0.9 },
  { label: '50% off', discount: 0.50, uplift: 1.5 },
  { label: '3 for 2', discount: 1 / 3, uplift: 0.8 },
  { label: 'BOGOF', discount: 0.5, uplift: 1.2 },
  { label: 'Custom', discount: 0.15, uplift: 0.5 },
]

export const MAX_PROMOS = 6

export interface ListingScenario {
  stores: number
  skus: number
  weeksInPeriod: number
  promos: Promo[]
}

/**
 * Spread N promos evenly across the period — each window centred in its own
 * 1/N slice of the year, clamped so nothing hangs off the calendar.
 */
export function suggestPromoTiming(promos: Promo[], weeksInPeriod: number): Promo[] {
  const n = promos.length
  if (n === 0) return promos
  return promos.map((p, i) => {
    const centre = ((i + 0.5) / n) * weeksInPeriod
    const start = Math.round(centre - p.weeks / 2) + 1
    const clamped = Math.max(1, Math.min(start, Math.max(1, weeksInPeriod - p.weeks + 1)))
    return { ...p, startWeek: clamped }
  })
}

export interface TradeSpendScenario {
  investment: number
  targetROI: number
}

/**
 * Supply plan settings. Demand comes from the Listing scenario's promo shape
 * (stores × ROS, with promo uplift) so stock and sales always agree, but the
 * planning horizon is its own field.
 */
export interface StockScenario {
  startingStockUnits: number
  weeksOfCover: number
  leadWeeks: number
  planWeeks: number
}

/**
 * The Waterfall — gross-to-net trade-spend deductions, each as a % of the
 * brand's list price (shelf ex-VAT less the chain margins).
 */
export interface WaterfallScenario {
  promoFunding: number
  backMargin: number
  otherTrade: number
  /** When true, the promo funding % is derived from the Listing promo calendar
   *  (annual supplier-funded spend ÷ annual GSV) instead of the manual field. */
  promoFromCalendar: boolean
}

export interface AmazonScenario {
  estimatorOn: boolean
  category: string
  weightG: number
  longestCm: number
  medianCm: number
  shortestCm: number
  /** Manual values, used when the estimator is off */
  referralFee: number
  fulfilmentFee: number
  storageFee: number
  fuelSurcharge: number
  /** Professional selling plan £/month (the £25 Amazon subscription), spread across monthly volume */
  planMonthly: number
  /** Expected throughput per month, in the selling unit (units, or cases if sellByCase) */
  monthlyUnits: number
  /** Sold as full cases on Amazon (one listing = one case) rather than singles.
   *  Amortises fulfilment/storage across the case, which is why cases win. */
  sellByCase: boolean
}

export interface TikTokScenario {
  estimatorOn: boolean
  category: string
  /** Manual value, used when the category estimator is off */
  platformCommission: number
  affiliateCommission: number
  perOrderFee: number
  refundAdmin: number
  /** Full-year view: cases sold through TikTok Shop per year */
  casesPerYear: number
}

/**
 * A Buyer — one retailer's saved commercial terms. Applying a buyer copies
 * its terms into scenario.grocery + scenario.waterfall, which every grocery
 * calculator already reads, so switching buyers reprices the whole site.
 */
export interface Buyer {
  id: string
  name: string
  retailerMargin: number
  wholesalerEnabled: boolean
  wholesalerMargin: number
  promoFunding: number
  backMargin: number
  otherTrade: number
}

export interface Scenario {
  grocery: GroceryScenario
  logistics: LogisticsScenario
  minMargin: MinMarginScenario
  listing: ListingScenario
  tradeSpend: TradeSpendScenario
  stock: StockScenario
  waterfall: WaterfallScenario
  amazon: AmazonScenario
  tiktok: TikTokScenario
  buyers: Buyer[]
}

export function defaultScenario(): Scenario {
  return {
    grocery: {
      retailerMargin: GROCERY_DEFAULTS.retailerMarginPercent.value,
      wholesalerEnabled: false,
      wholesalerMargin: GROCERY_DEFAULTS.wholesalerMarginPercent.value,
    },
    logistics: {
      perCase: 0,
    },
    minMargin: {
      targetBrandMargin: 0.3,
      solveMode: 'cost',
    },
    listing: {
      stores: 500,
      skus: 1,
      weeksInPeriod: 52,
      promos: [
        { id: 'p1', startWeek: 9, weeks: 6, mechanic: '25% off', discount: 0.25, uplift: 0.65, supplierFunded: true },
        { id: 'p2', startWeek: 35, weeks: 6, mechanic: '20% off', discount: 0.20, uplift: 0.5, supplierFunded: true },
      ],
    },
    tradeSpend: {
      investment: 10000,
      targetROI: 2.0,
    },
    stock: {
      startingStockUnits: 10000,
      weeksOfCover: 6,
      leadWeeks: 3,
      planWeeks: 26,
    },
    waterfall: {
      promoFunding: 0.15,
      backMargin: 0.05,
      otherTrade: 0.03,
      promoFromCalendar: false,
    },
    amazon: {
      estimatorOn: true,
      category: 'Grocery & Gourmet Food',
      weightG: 200,
      longestCm: 20,
      medianCm: 10,
      shortestCm: 5,
      referralFee: AMAZON_FBA_DEFAULTS.referralFeePercent.value,
      fulfilmentFee: AMAZON_FBA_DEFAULTS.fulfilmentFeePerUnit.value,
      storageFee: AMAZON_FBA_DEFAULTS.monthlyStoragePerUnit.value,
      fuelSurcharge: AMAZON_FBA_DEFAULTS.fuelLogisticsSurcharge.value,
      planMonthly: AMAZON_FBA_DEFAULTS.professionalPlanMonthly.value,
      monthlyUnits: 500,
      sellByCase: false,
    },
    tiktok: {
      estimatorOn: true,
      category: 'Food & Beverages',
      platformCommission: TIKTOK_SHOP_DEFAULTS.platformCommission.value,
      affiliateCommission: TIKTOK_SHOP_DEFAULTS.affiliateCommission.value,
      perOrderFee: TIKTOK_SHOP_DEFAULTS.perOrderFee.value,
      refundAdmin: TIKTOK_SHOP_DEFAULTS.refundAdminPercent.value,
      casesPerYear: 250,
    },
    buyers: [],
  }
}

/** Merge a (possibly partial / stale) decoded scenario onto fresh defaults. */
export function mergeScenario(partial: unknown): Scenario {
  const base = defaultScenario()
  if (!partial || typeof partial !== 'object') return base
  const source = partial as Record<string, unknown>
  for (const key of Object.keys(base) as (keyof Scenario)[]) {
    const section = source[key]
    if (Array.isArray(base[key])) {
      // Array sections (buyers) replace wholesale — spreading an array into
      // an object would silently corrupt it
      if (Array.isArray(section)) base[key] = section as never
    } else if (section && typeof section === 'object') {
      base[key] = { ...base[key], ...(section as object) } as never
    }
  }

  // Back-compat: logistics used to be three per-channel fields. It is now one
  // constant (§ the landed-cost rule) — take the first non-zero old value.
  if (!(source.logistics && typeof source.logistics === 'object')) {
    const old = (section: string) => {
      const s = source[section]
      const v = s && typeof s === 'object' ? (s as Record<string, unknown>).logisticsPerCase : undefined
      return typeof v === 'number' && v > 0 ? v : 0
    }
    const legacy = old('grocery') || old('amazon') || old('tiktok')
    if (legacy > 0) base.logistics.perCase = legacy
  }

  // Back-compat: old links/saves carried a single promo as three flat fields.
  // Synthesise it as one calendar entry (no price cut — old model had none).
  const oldListing = source.listing as Record<string, unknown> | undefined
  if (oldListing && typeof oldListing === 'object' && !Array.isArray(oldListing.promos)) {
    const startWeek = typeof oldListing.promoStartWeek === 'number' ? oldListing.promoStartWeek : 9
    const weeks = typeof oldListing.promoWeeks === 'number' ? oldListing.promoWeeks : 0
    const uplift = typeof oldListing.promoUplift === 'number' ? oldListing.promoUplift : 0.5
    if (typeof oldListing.promoWeeks === 'number' || typeof oldListing.promoStartWeek === 'number' || typeof oldListing.promoUplift === 'number') {
      base.listing.promos = weeks > 0
        ? [{ id: 'legacy', startWeek, weeks, mechanic: 'Custom', discount: 0, uplift, supplierFunded: false }]
        : []
    }
  }
  // Strip any stray legacy fields carried across by the spread above
  delete (base.listing as unknown as Record<string, unknown>).promoWeeks
  delete (base.listing as unknown as Record<string, unknown>).promoStartWeek
  delete (base.listing as unknown as Record<string, unknown>).promoUplift

  // Promos need every field present even if a stale save carried partial ones
  base.listing.promos = (base.listing.promos ?? []).slice(0, MAX_PROMOS).map((p, i) => ({
    id: typeof p?.id === 'string' ? p.id : `p${i + 1}`,
    startWeek: typeof p?.startWeek === 'number' ? p.startWeek : 1,
    weeks: typeof p?.weeks === 'number' ? p.weeks : 4,
    mechanic: typeof p?.mechanic === 'string' ? p.mechanic : 'Custom',
    discount: typeof p?.discount === 'number' ? p.discount : 0,
    uplift: typeof p?.uplift === 'number' ? p.uplift : 0.5,
    supplierFunded: typeof p?.supplierFunded === 'boolean' ? p.supplierFunded : false,
  }))
  return base
}

/** The wholesaler margin actually applied (0 when the wholesaler is disabled). */
export function activeWholesalerMargin(g: GroceryScenario): number {
  return g.wholesalerEnabled ? g.wholesalerMargin : 0
}

/**
 * Resolve the Amazon fees in force, expressed PER CONSUMER UNIT.
 *
 * When selling by the case (one Amazon listing = one case), the fulfilment and
 * storage fees are charged once per case, so per consumer unit they divide by
 * unitsPerCase — which is exactly why full cases are cheaper to fulfil. Referral
 * is a percentage of price, so it's unchanged per unit either way. Pass the
 * product's unitsPerCase; omit it (or when selling by unit) and nothing divides.
 */
export function effectiveAmazonFees(a: AmazonScenario, unitsPerCase = 1): AmazonFBAFees {
  const perCase = a.sellByCase && unitsPerCase > 0 ? unitsPerCase : 1
  const fulfilment = a.estimatorOn
    ? estimateAmazonFBAFee(a.weightG, a.longestCm, a.medianCm, a.shortestCm).fee
    : a.fulfilmentFee
  return {
    referralFeePercent: a.estimatorOn ? getAmazonReferralRate(a.category) : a.referralFee,
    fulfilmentFeePerUnit: fulfilment / perCase,
    monthlyStoragePerUnit: a.storageFee / perCase,
    fuelLogisticsSurcharge: a.fuelSurcharge,
  }
}

/** Amazon cases per year, derived from the monthly throughput and the case size. */
export function amazonCasesPerYear(a: AmazonScenario, unitsPerCase: number): number {
  if (a.sellByCase) return Math.round(a.monthlyUnits * 12)
  return unitsPerCase > 0 ? Math.round((a.monthlyUnits * 12) / unitsPerCase) : 0
}

/** Consumer units sold per month on Amazon (throughput × case size when by case). */
export function amazonMonthlyUnits(a: AmazonScenario, unitsPerCase: number): number {
  return a.sellByCase ? a.monthlyUnits * unitsPerCase : a.monthlyUnits
}

/** Resolve the TikTok fees in force: category-based commission, or manual. */
export function effectiveTikTokFees(t: TikTokScenario): TikTokFees {
  return {
    platformCommission: t.estimatorOn ? getTikTokCommission(t.category) : t.platformCommission,
    affiliateCommission: t.affiliateCommission,
    perOrderFee: t.perOrderFee,
    refundAdminPercent: t.refundAdmin,
  }
}
