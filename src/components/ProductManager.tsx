import { useState } from 'react'
import { useStore, createBlankProduct } from '../store/useStore'
import { CATEGORY_TEMPLATES } from '../config/templates'
import type { Product } from '../types/product'

function ProductForm({ product }: { product: Product }) {
  const updateProduct = useStore((s) => s.updateProduct)

  const field = (
    label: string,
    key: keyof Product,
    type: 'text' | 'number' = 'number',
    step = '0.01',
    suffix = '',
    helpText = '',
  ) => (
    <div>
      <label className="block text-sm font-medium text-slate-700 mb-1">
        {label}
        {suffix && <span className="text-slate-400 ml-1">{suffix}</span>}
      </label>
      {type === 'text' ? (
        <input
          type="text"
          value={product[key] as string}
          onChange={(e) => updateProduct(product.id, { [key]: e.target.value })}
          className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
        />
      ) : (
        <input
          type="number"
          step={step}
          min="0"
          value={product[key] as number}
          onChange={(e) => updateProduct(product.id, { [key]: parseFloat(e.target.value) || 0 })}
          className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
        />
      )}
      {helpText && <p className="text-xs text-slate-400 mt-1">{helpText}</p>}
    </div>
  )

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
      {field('Product name', 'name', 'text')}
      {field('COGS per unit', 'cogsPerUnit', 'number', '0.01', '£', 'Your cost to make/buy one consumer unit')}
      {field('Units per case', 'unitsPerCase', 'number', '1', '', 'Consumer units in one trade case')}
      {field('RRP inc. VAT', 'rrpIncVat', 'number', '0.01', '£', 'Shelf price the shopper pays')}
      {field('VAT rate', 'vatRate', 'number', '0.01', '', '0.20 = 20%. Use 0 for zero-rated food')}
      {field('Weekly rate of sale', 'weeklyRateOfSale', 'number', '0.1', 'units/store/week', 'Expected units sold per store per week')}
    </div>
  )
}

export default function ProductManager() {
  const { products, activeProductId, addProduct, removeProduct, setActiveProduct } = useStore()
  const [showTemplates, setShowTemplates] = useState(false)

  const activeProduct = products.find((p) => p.id === activeProductId)

  const handleAddBlank = () => {
    const product = createBlankProduct()
    addProduct(product)
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
    <div className="bg-white rounded-xl border border-slate-200 p-6">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-lg font-semibold text-slate-900">Product Spine</h2>
        <div className="flex gap-2">
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
        <div className="mb-4 p-4 bg-slate-50 rounded-lg border border-slate-200">
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
                <div className="text-sm font-medium text-slate-800">{t.name}</div>
                <div className="text-xs text-slate-500">{t.description}</div>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Product tabs */}
      {products.length > 1 && (
        <div className="flex gap-1 mb-4 flex-wrap">
          {products.map((p) => (
            <button
              key={p.id}
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
          {products.length > 1 && (
            <button
              onClick={() => removeProduct(activeProduct.id)}
              className="mt-4 text-sm text-red-500 hover:text-red-700 transition-colors"
            >
              Remove this product
            </button>
          )}
        </>
      ) : (
        <p className="text-slate-500 text-sm">No product selected. Add one above.</p>
      )}
    </div>
  )
}
