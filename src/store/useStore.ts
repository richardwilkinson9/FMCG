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
  /** GROSS "CHANGE PRODUCT" — clears the selection to the empty state */
  clearProduct: () => void
  /** GROSS "Start with a product" — reselect an existing product or seed the demo */
  startProduct: () => void

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
    category: 'General FMCG',
  }
}

/** The demo product from the GROSS design references */
export function createDemoProduct(): Product {
  return {
    id: generateId(),
    name: 'VOLT 250ml',
    cogsPerUnit: 0.32,
    unitsPerCase: 24,
    rrpIncVat: 1.50,
    vatRate: UK_VAT_RATE.value,
    weeklyRateOfSale: 10,
    category: 'Soft drinks',
    channels: { grocery: true, amazon: true, tiktok: true, amazonCasesPerYear: 250, tiktokCasesPerYear: 250 },
  }
}

export const useStore = create<AppState>((set, get) => {
  const firstProduct = createDemoProduct()

  return {
    products: [firstProduct],
    activeProductId: firstProduct.id,
    activeCalculator: 'home',
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

    clearProduct: () => set({ activeProductId: null }),

    startProduct: () =>
      set((state) => {
        if (state.products.length > 0) return { activeProductId: state.products[0].id }
        const product = createDemoProduct()
        return { products: [product], activeProductId: product.id }
      }),

    getActiveProduct: () => {
      const state = get()
      return state.products.find((p) => p.id === state.activeProductId)
    },

    setActiveCalculator: (id) => set({ activeCalculator: id }),

    updateScenario: (section, patch) =>
      set((state) => ({
        scenario: {
          ...state.scenario,
          // Array sections (buyers) replace wholesale — spreading an array
          // into an object would corrupt it
          [section]: Array.isArray(patch)
            ? patch
            : { ...state.scenario[section], ...patch },
        } as Scenario,
      })),
  }
})
