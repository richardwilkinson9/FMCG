import { create } from 'zustand'
import type { Product } from '../types/product'
import { UK_VAT_RATE } from '../config/fees'
import { type Scenario, defaultScenario } from './scenario'

interface AppState {
  products: Product[]
  activeProductId: string | null

  addProduct: (product: Product) => void
  updateProduct: (id: string, updates: Partial<Product>) => void
  removeProduct: (id: string) => void
  duplicateProduct: (id: string) => void
  setActiveProduct: (id: string) => void
  getActiveProduct: () => Product | undefined

  /** The currently selected calculator tab */
  activeCalculator: string
  setActiveCalculator: (id: string) => void

  /** All calculator settings — persists across tab switches and into share URLs */
  scenario: Scenario
  updateScenario: <K extends keyof Scenario>(section: K, patch: Partial<Scenario[K]>) => void
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
    scenario: defaultScenario(),

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

    duplicateProduct: (id) =>
      set((state) => {
        const source = state.products.find((p) => p.id === id)
        if (!source) return state
        const copy: Product = { ...source, id: generateId(), name: `${source.name} (copy)` }
        return {
          products: [...state.products, copy],
          activeProductId: copy.id,
        }
      }),

    setActiveProduct: (id) => set({ activeProductId: id }),

    getActiveProduct: () => {
      const state = get()
      return state.products.find((p) => p.id === state.activeProductId)
    },

    setActiveCalculator: (id) => set({ activeCalculator: id }),

    updateScenario: (section, patch) =>
      set((state) => ({
        scenario: {
          ...state.scenario,
          [section]: { ...state.scenario[section], ...patch },
        } as Scenario,
      })),
  }
})
