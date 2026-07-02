import type { CategoryTemplate } from '../types/product'

/**
 * Category templates pre-fill sensible defaults for common FMCG product types.
 * Users can start from any template and adjust values to match their actual product.
 */
export const CATEGORY_TEMPLATES: CategoryTemplate[] = [
  {
    name: 'Confectionery',
    description: 'Chocolate bars, sweets, biscuit bars',
    defaults: {
      cogsPerUnit: 0.35,
      unitsPerCase: 24,
      rrpIncVat: 1.25,
      vatRate: 0.20,
      weeklyRateOfSale: 8,
    },
  },
  {
    name: 'Soft Drinks',
    description: 'Cans, bottles, multipacks',
    defaults: {
      cogsPerUnit: 0.28,
      unitsPerCase: 12,
      rrpIncVat: 1.50,
      vatRate: 0.20,
      weeklyRateOfSale: 10,
    },
  },
  {
    name: 'Snacks & Crisps',
    description: 'Single bags, sharing bags, multipacks',
    defaults: {
      cogsPerUnit: 0.22,
      unitsPerCase: 32,
      rrpIncVat: 1.00,
      vatRate: 0.20,
      weeklyRateOfSale: 12,
    },
  },
  {
    name: 'Ambient Grocery',
    description: 'Sauces, condiments, tinned goods',
    defaults: {
      cogsPerUnit: 0.55,
      unitsPerCase: 6,
      rrpIncVat: 2.50,
      vatRate: 0.00,
      weeklyRateOfSale: 5,
    },
  },
  {
    name: 'Health & Wellness',
    description: 'Protein bars, supplements, functional foods',
    defaults: {
      cogsPerUnit: 0.80,
      unitsPerCase: 12,
      rrpIncVat: 2.99,
      vatRate: 0.20,
      weeklyRateOfSale: 4,
    },
  },
  {
    name: 'Beauty & Personal Care',
    description: 'Skincare, haircare, cosmetics',
    defaults: {
      cogsPerUnit: 1.50,
      unitsPerCase: 6,
      rrpIncVat: 8.99,
      vatRate: 0.20,
      weeklyRateOfSale: 3,
    },
  },
]
