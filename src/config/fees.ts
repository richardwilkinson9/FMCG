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

  /** Used in the trade spend calculator */
  averagePromoDiscount: {
    label: 'Average promo discount',
    value: 0.25,
    note: 'Typical promotional price reduction, e.g. 25% off RSP. Adjust per mechanic.',
  } as FeeDefault,
}
