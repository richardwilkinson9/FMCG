/**
 * FEE DEFAULTS — the single place to update when rate cards change.
 *
 * Every fee is an editable input in the UI; these are just the starting values.
 * Each entry includes a `note` shown as a tooltip so the user knows to verify.
 * Last reviewed: July 2026.
 */

export interface FeeDefault {
  label: string
  value: number
  note: string
}

// ─── UK VAT ────────────────────────────────────────────────────────────────────

export const UK_VAT_RATE: FeeDefault = {
  label: 'UK VAT rate',
  value: 0.20,
  note: 'Standard UK VAT rate. Zero-rated for most essential food — adjust if applicable.',
}

// ─── Amazon FBA UK ─────────────────────────────────────────────────────────────

export const AMAZON_FBA_DEFAULTS = {
  referralFeePercent: {
    label: 'Referral fee',
    value: 0.15,
    note: 'Typically 15% but ranges 8–15% by category. Check Seller Central rate card.',
  } as FeeDefault,

  fulfilmentFeePerUnit: {
    label: 'FBA fulfilment fee per unit',
    value: 3.15,
    note: 'Varies by weight/size tier. Check the current FBA fee schedule for your product dimensions.',
  } as FeeDefault,

  monthlyStoragePerUnit: {
    label: 'Monthly storage fee per unit',
    value: 0.10,
    note: 'Varies by season (Oct–Dec is higher) and product volume. As of mid-2026.',
  } as FeeDefault,

  professionalPlanMonthly: {
    label: 'Professional selling plan',
    value: 25.00,
    note: '£25/month excl. VAT. Required for most serious sellers.',
  } as FeeDefault,

  fuelLogisticsSurcharge: {
    label: 'Fuel & logistics surcharge',
    value: 0.015,
    note: '1.5% surcharge on UK FBA fulfilment fees from April 2026. Verify still applies.',
  } as FeeDefault,
}

// ─── TikTok Shop UK ────────────────────────────────────────────────────────────

export const TIKTOK_SHOP_DEFAULTS = {
  platformCommission: {
    label: 'Platform commission',
    value: 0.09,
    note: 'Default 9%. Electronics and some Beauty & Personal Care categories are 5%. Check your category.',
  } as FeeDefault,

  affiliateCommission: {
    label: 'Affiliate commission',
    value: 0.12,
    note: 'Paid to creators who promote your product. Typical range 10–20%, you set this per product.',
  } as FeeDefault,

  perOrderFee: {
    label: 'Per-order transaction fee',
    value: 0.30,
    note: 'A small per-order fee may apply. Verify on TikTok Shop Seller Centre.',
  } as FeeDefault,

  refundAdminPercent: {
    label: 'Refund admin fee',
    value: 0.03,
    note: 'Approximate cost of handling returns/refunds. Adjust based on your category return rate.',
  } as FeeDefault,
}

// ─── Grocery / Retailer ────────────────────────────────────────────────────────

export const GROCERY_DEFAULTS = {
  retailerMarginPercent: {
    label: 'Retailer margin',
    value: 0.35,
    note: 'Typical UK grocery retailer margin is 30–40% on RSP ex-VAT. Varies by category and retailer.',
  } as FeeDefault,

  wholesalerMarginPercent: {
    label: 'Wholesaler margin',
    value: 0.25,
    note: 'Typical UK wholesaler margin is 20–30% on their selling price. Set to 0 if selling direct to retailer.',
  } as FeeDefault,

  /** Used in the trade spend calculator */
  averagePromoDiscount: {
    label: 'Average promo discount',
    value: 0.25,
    note: 'Typical promotional price reduction, e.g. 25% off RSP. Adjust per mechanic.',
  } as FeeDefault,
}

// ─── Amazon FBA Size Tiers (UK, as of mid-2026) ──────────────────────────────
// Based on Amazon's published FBA fee schedule. Fulfilment fees depend on
// product size tier and unit weight. These are approximations — always verify
// against Seller Central.

export interface AmazonSizeTier {
  name: string
  maxWeightG: number
  maxLongestCm: number
  maxMedianCm: number
  maxShortestCm: number
  fee: number
}

export const AMAZON_SIZE_TIERS: AmazonSizeTier[] = [
  { name: 'Small envelope',       maxWeightG: 80,   maxLongestCm: 33, maxMedianCm: 23, maxShortestCm: 2.5, fee: 1.83 },
  { name: 'Standard envelope',    maxWeightG: 460,  maxLongestCm: 33, maxMedianCm: 23, maxShortestCm: 2.5, fee: 2.04 },
  { name: 'Large envelope',       maxWeightG: 960,  maxLongestCm: 33, maxMedianCm: 23, maxShortestCm: 6,   fee: 2.28 },
  { name: 'Small parcel',         maxWeightG: 150,  maxLongestCm: 35, maxMedianCm: 25, maxShortestCm: 12,  fee: 2.73 },
  { name: 'Standard parcel',      maxWeightG: 400,  maxLongestCm: 45, maxMedianCm: 34, maxShortestCm: 26,  fee: 3.15 },
  { name: 'Small oversize',       maxWeightG: 2000, maxLongestCm: 61, maxMedianCm: 46, maxShortestCm: 46,  fee: 4.47 },
  { name: 'Standard oversize',    maxWeightG: 12000,maxLongestCm: 120,maxMedianCm: 60, maxShortestCm: 60,  fee: 6.28 },
  { name: 'Large oversize',       maxWeightG: 23500,maxLongestCm: 175,maxMedianCm: 120,maxShortestCm: 80,  fee: 15.66 },
]

// ─── Amazon Referral Fee by Category ─────────────────────────────────────────

export interface AmazonCategoryFee {
  category: string
  referralPercent: number
}

export const AMAZON_CATEGORY_FEES: AmazonCategoryFee[] = [
  { category: 'Grocery & Gourmet Food',        referralPercent: 0.15 },
  { category: 'Health & Personal Care',         referralPercent: 0.15 },
  { category: 'Beauty',                         referralPercent: 0.15 },
  { category: 'Baby Products',                  referralPercent: 0.15 },
  { category: 'Home & Kitchen',                 referralPercent: 0.15 },
  { category: 'Pet Supplies',                   referralPercent: 0.15 },
  { category: 'Sports & Outdoors',              referralPercent: 0.15 },
  { category: 'Electronics',                    referralPercent: 0.08 },
  { category: 'Computers & Accessories',        referralPercent: 0.08 },
  { category: 'Video Games',                    referralPercent: 0.15 },
  { category: 'Books',                          referralPercent: 0.15 },
  { category: 'Clothing & Accessories',         referralPercent: 0.15 },
  { category: 'DIY & Tools',                    referralPercent: 0.12 },
  { category: 'Other',                          referralPercent: 0.15 },
]

// ─── TikTok Shop Commission by Category ──────────────────────────────────────

export interface TikTokCategoryFee {
  category: string
  commissionPercent: number
}

export const TIKTOK_CATEGORY_FEES: TikTokCategoryFee[] = [
  { category: 'Food & Beverages',               commissionPercent: 0.09 },
  { category: 'Health & Wellness',               commissionPercent: 0.09 },
  { category: 'Beauty & Personal Care',          commissionPercent: 0.05 },
  { category: 'Home & Living',                   commissionPercent: 0.09 },
  { category: 'Sports & Outdoor',                commissionPercent: 0.09 },
  { category: 'Baby & Maternity',                commissionPercent: 0.09 },
  { category: 'Pet Supplies',                    commissionPercent: 0.09 },
  { category: 'Electronics',                     commissionPercent: 0.05 },
  { category: 'Fashion & Accessories',           commissionPercent: 0.09 },
  { category: 'Other',                           commissionPercent: 0.09 },
]
