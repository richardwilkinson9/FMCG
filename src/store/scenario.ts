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

export interface MinMarginScenario {
  targetBrandMargin: number
  solveMode: 'cost' | 'rrp'
}

export interface ListingScenario {
  stores: number
  skus: number
  weeksInPeriod: number
  promoWeeks: number
  promoUplift: number
}

export interface TradeSpendScenario {
  investment: number
  targetROI: number
}

export interface StockScenario {
  stores: number
  weeksOfCover: number
  leadWeeks: number
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
}

export interface TikTokScenario {
  estimatorOn: boolean
  category: string
  /** Manual value, used when the category estimator is off */
  platformCommission: number
  affiliateCommission: number
  perOrderFee: number
  refundAdmin: number
}

export interface Scenario {
  grocery: GroceryScenario
  minMargin: MinMarginScenario
  listing: ListingScenario
  tradeSpend: TradeSpendScenario
  stock: StockScenario
  amazon: AmazonScenario
  tiktok: TikTokScenario
}

export function defaultScenario(): Scenario {
  return {
    grocery: {
      retailerMargin: GROCERY_DEFAULTS.retailerMarginPercent.value,
      wholesalerEnabled: false,
      wholesalerMargin: GROCERY_DEFAULTS.wholesalerMarginPercent.value,
    },
    minMargin: {
      targetBrandMargin: 0.3,
      solveMode: 'cost',
    },
    listing: {
      stores: 500,
      skus: 1,
      weeksInPeriod: 52,
      promoWeeks: 8,
      promoUplift: 0.5,
    },
    tradeSpend: {
      investment: 10000,
      targetROI: 2.0,
    },
    stock: {
      stores: 500,
      weeksOfCover: 6,
      leadWeeks: 3,
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
    },
    tiktok: {
      estimatorOn: true,
      category: 'Food & Beverages',
      platformCommission: TIKTOK_SHOP_DEFAULTS.platformCommission.value,
      affiliateCommission: TIKTOK_SHOP_DEFAULTS.affiliateCommission.value,
      perOrderFee: TIKTOK_SHOP_DEFAULTS.perOrderFee.value,
      refundAdmin: TIKTOK_SHOP_DEFAULTS.refundAdminPercent.value,
    },
  }
}

/** Merge a (possibly partial / stale) decoded scenario onto fresh defaults. */
export function mergeScenario(partial: unknown): Scenario {
  const base = defaultScenario()
  if (!partial || typeof partial !== 'object') return base
  const source = partial as Record<string, unknown>
  for (const key of Object.keys(base) as (keyof Scenario)[]) {
    const section = source[key]
    if (section && typeof section === 'object') {
      base[key] = { ...base[key], ...(section as object) } as never
    }
  }
  return base
}

/** The wholesaler margin actually applied (0 when the wholesaler is disabled). */
export function activeWholesalerMargin(g: GroceryScenario): number {
  return g.wholesalerEnabled ? g.wholesalerMargin : 0
}

/** Resolve the Amazon fees in force: estimated from dimensions/category, or manual. */
export function effectiveAmazonFees(a: AmazonScenario): AmazonFBAFees {
  if (a.estimatorOn) {
    const estimated = estimateAmazonFBAFee(a.weightG, a.longestCm, a.medianCm, a.shortestCm)
    return {
      referralFeePercent: getAmazonReferralRate(a.category),
      fulfilmentFeePerUnit: estimated.fee,
      monthlyStoragePerUnit: a.storageFee,
      fuelLogisticsSurcharge: a.fuelSurcharge,
    }
  }
  return {
    referralFeePercent: a.referralFee,
    fulfilmentFeePerUnit: a.fulfilmentFee,
    monthlyStoragePerUnit: a.storageFee,
    fuelLogisticsSurcharge: a.fuelSurcharge,
  }
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
