/**
 * The shared Product spine — the single source of truth that every calculator reads from.
 * Define a product once; every tool derives its numbers from these fields.
 */

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
}

export interface CategoryTemplate {
  name: string
  description: string
  defaults: Omit<Product, 'id' | 'name'>
}
