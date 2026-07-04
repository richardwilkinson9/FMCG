/**
 * The shared Product spine — the single source of truth that every calculator reads from.
 * Define a product once; every tool derives its numbers from these fields.
 */

/**
 * Which channels a product is listed on, and how much it sells on the
 * marketplaces. Absent fields default to "listed everywhere" with a sensible
 * annual volume, so old products/links keep working. Grocery volume comes from
 * the Listing projection; the marketplaces take an explicit cases/year per SKU.
 */
export interface ProductChannels {
  grocery?: boolean
  amazon?: boolean
  tiktok?: boolean
  amazonCasesPerYear?: number
  tiktokCasesPerYear?: number
}

export interface Product {
  id: string
  name: string
  /** Cost of goods sold per single consumer unit, in £ */
  cogsPerUnit: number
  /** Number of consumer units in one trade case */
  unitsPerCase: number
  /** Recommended retail price including VAT, in £ */
  rrpIncVat: number
  /** VAT rate as a decimal (0.20 = 20%) */
  vatRate: number
  /** Assumed weekly rate of sale per store (units) */
  weeklyRateOfSale: number
  /** Optional category, used only to show an indicative margin benchmark */
  category?: string
  /** Per-channel listing membership + marketplace volume */
  channels?: ProductChannels
}

export interface CategoryTemplate {
  name: string
  description: string
  defaults: Omit<Product, 'id' | 'name'>
}
