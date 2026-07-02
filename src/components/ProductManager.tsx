import { useId, useState } from 'react'
import { useStore, createBlankProduct } from '../store/useStore'
import { CATEGORY_TEMPLATES } from '../config/templates'
import type { Product } from '../types/product'
import NumberInput from './NumberInput'

const VAT_PRESETS = [
  { label: '20% standard', value: 0.20 },
  { label: '5% reduced', value: 0.05 },
  { label: '0% zero-rated', value: 0 },
]

function ProductForm({ product }: { product: Product }) {
  const updateProduct = useStore((s) => s.updateProduct)
  const nameId = useId()

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
      <div>
        <label htmlFor={nameId} className="block text-sm font-medium text-slate-700 mb-1">Product name</label>
        <input
          id={nameId}
          type="text"
          value={product.name}
          onChange={(e) => updateProduct(product.id, { name: e.target.value })}
          className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
        />
      </div>

      <NumberInput
        label="COGS per unit"
        prefix="£"
        min={0}
        value={product.cogsPerUnit}
        onChange={(v) => updateProduct(product.id, { cogsPerUnit: v })}
        help="Your cost to make/buy one consumer unit"
      />

      <NumberInput
        label="Units per case"
        min={0}
        value={product.unitsPerCase}
        onChange={(v) => updateProduct(product.id, { unitsPerCase: Math.round(v) })}
        help="Consumer units in one trade case"
      />

      <NumberInput
        label="RRP inc. VAT"
        prefix="£"
        min={0}
        value={product.rrpIncVat}
        onChange={(v) => updateProduct(product.id, { rrpIncVat: v })}
        help="Shelf price the shopper pays"
      />

      <div>
        <NumberInput
          label="VAT rate"
          suffix="%"
          min={0}
          value={product.vatRate * 100}
          onChange={(v) => updateProduct(product.id, { vatRate: v / 100 })}
          help="Most food is zero-rated; confectionery and drinks are standard-rated"
        />
        <div className="flex gap-1.5 mt-1.5">
          {VAT_PRESETS.map((preset) => (
            <button
              key={preset.label}
              type="button"
              onClick={() => updateProduct(product.id, { vatRate: preset.value })}
              className={`px-2 py-0.5 text-xs rounded-full border transition-colors ${
                Math.abs(product.vatRate - preset.value) < 0.0001
                  ? 'bg-blue-600 text-white border-blue-600'
                  : 'bg-white text-slate-500 border-slate-300 hover:border-blue-400'
              }`}
            >
              {preset.label}
            </button>
          ))}
        </div>
      </div>

      <NumberInput
        label="Weekly rate of sale"
        suffix="/store"
        min={0}
        value={product.weeklyRateOfSale}
        onChange={(v) => updateProduct(product.id, { weeklyRateOfSale: v })}
        help="Expected units sold per store per week"
      />
    </div>
  )
}

export default function ProductManager() {
  const { products, activeProductId, addProduct, removeProduct, duplicateProduct, setActiveProduct } = useStore()
  const [showTemplates, setShowTemplates] = useState(false)

  const activeProduct = products.find((p) => p.id === activeProductId)

  const handleAddBlank = () => {
    addProduct(createBlankProduct())
  }

  const handleApplyTemplate = (templateIndex: number) => {
    const template = CATEGORY_TEMPLATES[templateIndex]
    const product: Product = {
      ...createBlankProduct(template.name),
      ...template.defaults,
    }
    addProduct(product)
    setShowTemplates(false)
  }

  return (
    <section aria-label="Product" className="bg-white rounded-xl border border-slate-200 p-6 print-block">
      <div className="flex items-center justify-between mb-4 flex-wrap gap-2">
        <div>
          <h2 className="text-lg font-semibold text-slate-900">Your Product</h2>
          <p className="text-xs text-slate-400">Define it once — every calculator below uses these numbers.</p>
        </div>
        <div className="flex gap-2 no-print">
          <button
            onClick={() => setShowTemplates(!showTemplates)}
            className="px-3 py-1.5 text-sm bg-slate-100 text-slate-700 rounded-lg hover:bg-slate-200 transition-colors"
          >
            From template
          </button>
          <button
            onClick={handleAddBlank}
            className="px-3 py-1.5 text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
          >
            + Add product
          </button>
        </div>
      </div>

      {/* Template picker */}
      {showTemplates && (
        <div className="mb-4 p-4 bg-slate-50 rounded-lg border border-slate-200 no-print">
          <p className="text-sm text-slate-600 mb-3">
            Start with typical values for a category — you can adjust everything afterwards.
          </p>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
            {CATEGORY_TEMPLATES.map((t, i) => (
              <button
                key={t.name}
                onClick={() => handleApplyTemplate(i)}
                className="text-left p-3 bg-white rounded-lg border border-slate-200 hover:border-blue-400 hover:bg-blue-50 transition-colors"
              >
                <span className="block text-sm font-medium text-slate-800">{t.name}</span>
                <span className="block text-xs text-slate-500">{t.description}</span>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Product tabs */}
      {products.length > 1 && (
        <div className="flex gap-1 mb-4 flex-wrap" role="tablist" aria-label="Products">
          {products.map((p) => (
            <button
              key={p.id}
              role="tab"
              aria-selected={p.id === activeProductId}
              onClick={() => setActiveProduct(p.id)}
              className={`px-3 py-1.5 text-sm rounded-lg transition-colors ${
                p.id === activeProductId
                  ? 'bg-blue-600 text-white'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              {p.name || 'Unnamed'}
            </button>
          ))}
        </div>
      )}

      {/* Product form */}
      {activeProduct ? (
        <>
          <ProductForm product={activeProduct} />
          <div className="mt-4 flex gap-4 no-print">
            <button
              onClick={() => duplicateProduct(activeProduct.id)}
              className="text-sm text-blue-600 hover:text-blue-800 transition-colors"
              title="Copy this product to compare scenarios, e.g. current vs proposed pricing"
            >
              Duplicate to compare scenarios
            </button>
            {products.length > 1 && (
              <button
                onClick={() => removeProduct(activeProduct.id)}
                className="text-sm text-red-500 hover:text-red-700 transition-colors"
              >
                Remove this product
              </button>
            )}
          </div>
        </>
      ) : (
        <p className="text-slate-500 text-sm">No product selected. Add one above.</p>
      )}
    </section>
  )
}
