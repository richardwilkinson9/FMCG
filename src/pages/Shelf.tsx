import { useState } from 'react'
import { useStore, createBlankProduct, generateId } from '../store/useStore'
import { CATEGORY_TEMPLATES } from '../config/templates'
import type { Product } from '../types/product'
import {
  listArchive,
  saveToArchive,
  deleteFromArchive,
  hydrateSavedModel,
  type SavedModel,
} from '../store/archive'
import { PageHeader } from '../components/gross/CalcShell'
import GrossFooter from '../components/gross/GrossFooter'
import LedgerRat from '../components/gross/LedgerRat'
import Field, { TextField } from '../components/gross/Field'

/**
 * The Shelf — the product spine's home. Stack it with your range once;
 * every calculator reads from whichever product is on shelf (active).
 */
export default function Shelf() {
  const products = useStore((s) => s.products)
  const activeProductId = useStore((s) => s.activeProductId)
  const scenario = useStore((s) => s.scenario)
  const addProduct = useStore((s) => s.addProduct)
  const updateProduct = useStore((s) => s.updateProduct)
  const removeProduct = useStore((s) => s.removeProduct)
  const duplicateProduct = useStore((s) => s.duplicateProduct)
  const setActiveProduct = useStore((s) => s.setActiveProduct)
  const setActiveCalculator = useStore((s) => s.setActiveCalculator)

  const [archive, setArchive] = useState<SavedModel[]>(() => listArchive())
  const [saveName, setSaveName] = useState('')
  const [saveState, setSaveState] = useState<'idle' | 'saved' | 'failed'>('idle')

  const handleSave = () => {
    const saved = saveToArchive(saveName, products, scenario)
    if (saved) {
      setArchive(listArchive())
      setSaveName('')
      setSaveState('saved')
    } else {
      setSaveState('failed')
    }
    setTimeout(() => setSaveState('idle'), 1800)
  }

  const handleLoad = (model: SavedModel) => {
    const { products: p, scenario: s } = hydrateSavedModel(model)
    useStore.setState({
      products: p,
      activeProductId: p[0]?.id ?? null,
      scenario: s,
    })
  }

  const handleBin = (id: string) => {
    deleteFromArchive(id)
    setArchive(listArchive())
  }

  const addFromTemplate = (index: number) => {
    const template = CATEGORY_TEMPLATES[index]
    const product: Product = {
      ...template.defaults,
      id: generateId(),
      name: template.name,
    }
    addProduct(product)
  }

  const chip =
    'border-2 border-ink bg-receipt font-mono text-[11px] py-1.5 px-2.5 cursor-pointer tracking-[0.05em] hover:bg-ink hover:text-receipt'

  return (
    <div className="bg-receipt text-ink font-body min-h-screen">
      <PageHeader
        sku="50 00019"
        group="SPINE"
        type="PRODUCT MANAGER"
        title="The Shelf"
        subtitle="Stack it once. Every calculator reads from here."
        stampNote="verify your cost prices"
      />

      <div className="py-[clamp(26px,4vw,52px)] px-[clamp(20px,4vw,44px)]">
        <div className="max-w-[1180px] mx-auto">
          {/* Toolbar */}
          <div className="flex items-center justify-between border-b-2 border-ink pb-2.5 mb-4 flex-wrap gap-2">
            <span className="font-mono text-[13px] tracking-[0.1em] font-bold">THE PRODUCTS</span>
            <button
              onClick={() => addProduct(createBlankProduct())}
              className="border-2 border-ink bg-ink text-receipt font-mono text-[11px] py-1.5 px-2.5 cursor-pointer tracking-[0.05em] hover:bg-bile hover:text-ink"
            >
              + ADD PRODUCT
            </button>
          </div>

          {/* Template chips */}
          <div className="flex items-center gap-2 flex-wrap mb-7">
            <span className="font-mono text-[11px] tracking-[0.1em] opacity-60">START FROM A TEMPLATE</span>
            {CATEGORY_TEMPLATES.map((t, i) => (
              <button key={t.name} onClick={() => addFromTemplate(i)} className={chip} title={t.description}>
                {t.name.toUpperCase()}
              </button>
            ))}
          </div>

          {products.length === 0 ? (
            <div className="py-[clamp(40px,6vw,90px)] text-center">
              <div className="w-[210px] mx-auto text-ink">
                <LedgerRat holeColor="#F7F5EF" />
              </div>
              <h2 className="font-display text-[clamp(34px,5vw,58px)] tracking-[-0.02em] leading-[0.95] mt-[22px] mb-0">
                Nothing on the shelf.
              </h2>
              <button
                onClick={() => addProduct(createBlankProduct())}
                className="inline-flex items-center gap-3 mt-7 bg-ink text-receipt border-2 border-ink py-4 px-[26px] text-base font-semibold cursor-pointer hover:bg-bile hover:text-ink"
              >
                Add a product <span className="font-mono">→</span>
              </button>
            </div>
          ) : (
            <>
              {/* Product rows */}
              <div className="flex flex-col">
                {products.map((p) => {
                  const active = p.id === activeProductId
                  return (
                    <div key={p.id} className="border-2 border-ink -mt-0.5 first:mt-0 bg-receipt">
                      {/* Row header */}
                      <div className={`flex items-center justify-between gap-2 flex-wrap py-2 px-3.5 border-b-2 border-ink ${active ? 'bg-bile' : 'bg-receipt'}`}>
                        <span className="font-mono text-[13px] font-bold tracking-[0.03em]">
                          {p.name || 'Unnamed'}
                        </span>
                        <span className="flex gap-2 flex-wrap">
                          {active ? (
                            <span className="font-mono text-[10px] tracking-[0.08em] border-2 border-ink bg-ink text-bile py-0.5 px-[7px]">
                              ON SHELF
                            </span>
                          ) : (
                            <button onClick={() => setActiveProduct(p.id)} className={`${chip} text-[10px] py-0.5`}>
                              PUT ON SHELF
                            </button>
                          )}
                          <button onClick={() => duplicateProduct(p.id)} className={`${chip} text-[10px] py-0.5`}>
                            DUPLICATE
                          </button>
                          <button onClick={() => removeProduct(p.id)} className={`${chip} text-[10px] py-0.5 hover:bg-redpen hover:text-receipt`}>
                            REMOVE
                          </button>
                        </span>
                      </div>
                      {/* Fields */}
                      <div className="grid grid-cols-1 min-[901px]:grid-cols-3 gap-4 p-3.5">
                        <TextField label="Product name" value={p.name} onChange={(v) => updateProduct(p.id, { name: v })} />
                        <Field label="Cost price / unit" prefix="£" value={p.cogsPerUnit} onCommit={(v) => updateProduct(p.id, { cogsPerUnit: v })} />
                        <Field label="RSP" prefix="£" value={p.rrpIncVat} onCommit={(v) => updateProduct(p.id, { rrpIncVat: v })} />
                        <Field label="Units per case" inputMode="numeric" value={p.unitsPerCase} onCommit={(v) => updateProduct(p.id, { unitsPerCase: Math.round(v) })} />
                        <Field label="VAT rate" suffix="%" scale={100} value={p.vatRate} onCommit={(v) => updateProduct(p.id, { vatRate: v })} />
                        <Field label="Rate of sale / store / wk" value={p.weeklyRateOfSale} onCommit={(v) => updateProduct(p.id, { weeklyRateOfSale: v })} />
                      </div>
                    </div>
                  )
                })}
              </div>

              <div className="font-mono text-[11px] mt-3 opacity-65">
                The product ON SHELF is the one every calculator uses. The Range reads all of them.
              </div>

              {/* THE ARCHIVE — saved models */}
              <div className="flex items-center justify-between border-b-2 border-ink pb-2.5 mb-4 mt-10 flex-wrap gap-2">
                <span className="font-mono text-[13px] tracking-[0.1em] font-bold">THE ARCHIVE</span>
                <span className="font-mono text-[10px] tracking-[0.05em] opacity-60">
                  SAVED IN THIS BROWSER · ACCOUNT SYNC COMING
                </span>
              </div>

              <div className="flex gap-3 flex-wrap items-end mb-5">
                <div className="flex-1 min-w-[240px]">
                  <label className="block">
                    <span className="block text-xs font-semibold mb-1.5">Save the current model as</span>
                    <div className="flex border-2 border-ink bg-white h-[52px]">
                      <input
                        value={saveName}
                        onChange={(e) => setSaveName(e.target.value)}
                        placeholder="e.g. Tesco range review · Sept"
                        aria-label="Model name"
                        className="flex-1 min-w-0 border-0 outline-none bg-transparent px-3.5 font-mono text-[15px] text-ink"
                      />
                    </div>
                  </label>
                </div>
                <button
                  onClick={handleSave}
                  className="border-2 border-ink bg-ink text-receipt h-[52px] px-6 text-sm font-semibold cursor-pointer hover:bg-bile hover:text-ink"
                  style={saveState === 'failed' ? { color: '#E4002B' } : undefined}
                >
                  {saveState === 'saved' ? 'Saved' : saveState === 'failed' ? 'Storage blocked' : 'Save model'}
                </button>
              </div>

              {archive.length === 0 ? (
                <div className="font-mono text-[11px] opacity-65 mb-2">Nothing in the archive yet.</div>
              ) : (
                <div className="flex flex-col">
                  {archive.map((m) => (
                    <div
                      key={m.id}
                      className="flex items-center justify-between gap-3 flex-wrap border-2 border-ink -mt-0.5 first:mt-0 py-2.5 px-3.5 bg-receipt"
                    >
                      <span className="font-mono text-[13px]">
                        <span className="font-bold">{m.name}</span>
                        <span className="opacity-60">
                          {'  '}· {m.products.length} product{m.products.length === 1 ? '' : 's'} ·{' '}
                          {new Date(m.savedAt).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })}
                        </span>
                      </span>
                      <span className="flex gap-2">
                        <button onClick={() => handleLoad(m)} className={`${chip} text-[10px] py-0.5`}>
                          LOAD
                        </button>
                        <button onClick={() => handleBin(m.id)} className={`${chip} text-[10px] py-0.5 hover:bg-redpen hover:text-receipt`}>
                          BIN
                        </button>
                      </span>
                    </div>
                  ))}
                </div>
              )}

              {/* Onward */}
              <div className="flex gap-3 mt-7 flex-wrap">
                <button
                  onClick={() => { setActiveCalculator('retailer-pnl'); window.scrollTo(0, 0) }}
                  className="inline-flex items-center gap-3 bg-ink text-receipt border-2 border-ink py-4 px-[26px] text-base font-semibold cursor-pointer hover:bg-bile hover:text-ink"
                >
                  Do the gross maths <span className="font-mono">→</span>
                </button>
                <button
                  onClick={() => { setActiveCalculator('portfolio'); window.scrollTo(0, 0) }}
                  className="inline-flex items-center gap-3 bg-receipt text-ink border-2 border-ink py-4 px-[26px] text-base font-semibold cursor-pointer hover:bg-bile"
                >
                  See The Range <span className="font-mono">→</span>
                </button>
              </div>
            </>
          )}
        </div>
      </div>

      <GrossFooter />
    </div>
  )
}
