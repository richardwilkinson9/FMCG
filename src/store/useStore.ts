import { create } from 'zustand'
import type { Product } from '../types/product'
import { UK_VAT_RATE } from '../config/fees'

interface AppState {
  products: Product[]
  activeProductId: string | null

  addProduct: (product: Product) => void
  updateProduct: (id: string, updates: Partial<Product>) => void
  removeProduct: (id: string) => void
  setActiveProduct: (id: string) => void
  getActiveProduct: () => Product | undefined

  /** The currently selected calculator tab */
  activeCalculator: string
  setActiveCalculator: (id: string) => void
}

/** Generate a short random ID (good enough for client-side MVP) */
export function generateId(): string {
  return Math.random().toString(36).slice(2, 10)
}

/** Create a blank product with sensible defaults */
export function createBlankProduct(name = 'New Product'): Product {
  return {
    id: generateId(),
    name,
    cogsPerUnit: 0.50,
    unitsPerCase: 12,
    rrpIncVat: 2.50,
    vatRate: UK_VAT_RATE.value,
    weeklyRateOfSale: 5,
  }
}

export const useStore = create<AppState>((set, get) => {
  const firstProduct = createBlankProduct('My Product')

  return {
    products: [firstProduct],
    activeProductId: firstProduct.id,
    activeCalculator: 'retailer-pnl',

    addProduct: (product) =>
      set((state) => ({
        products: [...state.products, product],
        activeProductId: product.id,
      })),

    updateProduct: (id, updates) =>
      set((state) => ({
        products: state.products.map((p) =>
          p.id === id ? { ...p, ...updates } : p
        ),
      })),

    removeProduct: (id) =>
      set((state) => {
        const remaining = state.products.filter((p) => p.id !== id)
        return {
          products: remaining,
          activeProductId:
            state.activeProductId === id
              ? (remaining[0]?.id ?? null)
              : state.activeProductId,
        }
      }),

    setActiveProduct: (id) => set({ activeProductId: id }),

    getActiveProduct: () => {
      const state = get()
      return state.products.find((p) => p.id === state.activeProductId)
    },

    setActiveCalculator: (id) => set({ activeCalculator: id }),
  }
})
