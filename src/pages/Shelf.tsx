import { useEffect, useMemo, useState } from 'react'
import type { Session } from '@supabase/supabase-js'
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
import {
  getSession,
  onAuthChange,
  sendMagicLink,
  signOut,
  cloudList,
  cloudSave,
  cloudDelete,
  migrateLocalToCloud,
} from '../store/cloud'
import { PageHeader } from '../components/gross/CalcShell'
import GrossFooter from '../components/gross/GrossFooter'
import LedgerRat from '../components/gross/LedgerRat'
import Field, { TextField } from '../components/gross/Field'
import ComparePanel from '../components/gross/ComparePanel'

const chip =
  'border-2 border-ink bg-receipt font-mono text-[11px] py-1.5 px-2.5 cursor-pointer tracking-[0.05em] hover:bg-ink hover:text-receipt'

/** Saved models grouped by name — newest first, older saves are its versions. */
function groupVersions(models: SavedModel[]): { latest: SavedModel; older: SavedModel[] }[] {
  const byName = new Map<string, SavedModel[]>()
  for (const m of models) {
    const list = byName.get(m.name) ?? []
    list.push(m)
    byName.set(m.name, list)
  }
  return [...byName.values()]
    .map((list) => {
      const sorted = [...list].sort((x, y) => y.savedAt.localeCompare(x.savedAt))
      return { latest: sorted[0], older: sorted.slice(1) }
    })
    .sort((x, y) => y.latest.savedAt.localeCompare(x.latest.savedAt))
}

const shortDate = (iso: string) =>
  new Date(iso).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })

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

  // ── Account ──────────────────────────────────────────────────────────────
  const [session, setSession] = useState<Session | null>(null)
  const [authEmail, setAuthEmail] = useState('')
  const [authState, setAuthState] = useState<'idle' | 'sending' | 'sent' | 'failed'>('idle')

  // ── Archive ──────────────────────────────────────────────────────────────
  const [archive, setArchive] = useState<SavedModel[]>(() => listArchive())
  const [cloudOk, setCloudOk] = useState(true)
  const [saveName, setSaveName] = useState('')
  const [saveState, setSaveState] = useState<'idle' | 'saving' | 'saved' | 'failed'>('idle')
  const [expanded, setExpanded] = useState<string | null>(null)
  const [picked, setPicked] = useState<SavedModel[]>([])

  const refresh = async (s: Session | null) => {
    if (s) {
      const migrated = await migrateLocalToCloud()
      const { ok, models } = await cloudList()
      setCloudOk(ok)
      if (ok) setArchive(models)
      else if (migrated === 0) setArchive(listArchive())
    } else {
      setArchive(listArchive())
    }
  }

  useEffect(() => {
    let cancelled = false
    getSession().then((s) => {
      if (cancelled) return
      setSession(s)
      refresh(s)
    })
    const unsubscribe = onAuthChange((s) => {
      setSession(s)
      refresh(s)
    })
    return () => {
      cancelled = true
      unsubscribe()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const handleSendLink = async () => {
    if (!authEmail.includes('@') || authState === 'sending') return
    setAuthState('sending')
    const { ok } = await sendMagicLink(authEmail)
    setAuthState(ok ? 'sent' : 'failed')
    if (!ok) setTimeout(() => setAuthState('idle'), 3000)
  }

  const handleSave = async () => {
    if (saveState === 'saving') return
    setSaveState('saving')
    if (session) {
      const { ok } = await cloudSave(saveName, products, scenario)
      if (ok) {
        setSaveName('')
        setSaveState('saved')
        await refresh(session)
      } else {
        setSaveState('failed')
      }
    } else {
      const saved = saveToArchive(saveName, products, scenario)
      if (saved) {
        setArchive(listArchive())
        setSaveName('')
        setSaveState('saved')
      } else {
        setSaveState('failed')
      }
    }
    setTimeout(() => setSaveState('idle'), 1800)
  }

  const handleLoad = (model: SavedModel) => {
    const { products: p, scenario: s } = hydrateSavedModel(model)
    useStore.setState({ products: p, activeProductId: p[0]?.id ?? null, scenario: s })
    window.scrollTo(0, 0)
  }

  const handleBin = async (model: SavedModel) => {
    if (session) {
      await cloudDelete(model.id)
      await refresh(session)
    } else {
      deleteFromArchive(model.id)
      setArchive(listArchive())
    }
    setPicked((prev) => prev.filter((m) => m.id !== model.id))
  }

  const togglePick = (model: SavedModel) => {
    setPicked((prev) => {
      if (prev.some((m) => m.id === model.id)) return prev.filter((m) => m.id !== model.id)
      return [...prev.slice(-1), model] // keep at most two: previous last + this
    })
  }

  const groups = useMemo(() => groupVersions(archive), [archive])

  const addFromTemplate = (index: number) => {
    const template = CATEGORY_TEMPLATES[index]
    const product: Product = { ...template.defaults, id: generateId(), name: template.name }
    addProduct(product)
  }

  const versionRow = (m: SavedModel, isLatest: boolean, versionCount: number) => {
    const isPicked = picked.some((x) => x.id === m.id)
    return (
      <div
        key={m.id}
        className={`flex items-center justify-between gap-3 flex-wrap border-2 border-ink -mt-0.5 first:mt-0 py-2.5 px-3.5 ${isLatest ? 'bg-receipt' : 'bg-white'}`}
      >
        <span className="font-mono text-[13px]">
          <span className={isLatest ? 'font-bold' : ''}>{isLatest ? m.name : shortDate(m.savedAt)}</span>
          <span className="opacity-60">
            {'  '}· {m.products.length} product{m.products.length === 1 ? '' : 's'}
            {isLatest && ` · ${shortDate(m.savedAt)}`}
          </span>
        </span>
        <span className="flex gap-2 flex-wrap">
          {isLatest && versionCount > 1 && (
            <button
              onClick={() => setExpanded(expanded === m.name ? null : m.name)}
              className={`${chip} text-[10px] py-0.5`}
              aria-expanded={expanded === m.name}
            >
              {versionCount} VERSIONS {expanded === m.name ? '▴' : '▾'}
            </button>
          )}
          <button
            onClick={() => togglePick(m)}
            className={`${chip} text-[10px] py-0.5 ${isPicked ? 'bg-bile hover:bg-bile hover:text-ink' : ''}`}
            aria-pressed={isPicked}
          >
            {isPicked ? 'PICKED' : 'PICK'}
          </button>
          <button onClick={() => handleLoad(m)} className={`${chip} text-[10px] py-0.5`}>
            LOAD
          </button>
          <button onClick={() => handleBin(m)} className={`${chip} text-[10px] py-0.5 hover:bg-redpen hover:text-receipt`}>
            BIN
          </button>
        </span>
      </div>
    )
  }

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

              {/* THE ARCHIVE */}
              <div id="archive" className="flex items-center justify-between border-b-2 border-ink pb-2.5 mb-4 mt-10 flex-wrap gap-2 scroll-mt-4">
                <span className="font-mono text-[13px] tracking-[0.1em] font-bold">THE ARCHIVE</span>
                {session ? (
                  <span className="flex items-center gap-2 flex-wrap">
                    <span className="font-mono text-[10px] tracking-[0.05em] opacity-60">
                      {session.user.email?.toUpperCase()} {cloudOk ? '· SYNCED' : '· SYNC FAILED — SAVES STAY LOCAL'}
                    </span>
                    <button onClick={() => signOut()} className={`${chip} text-[10px] py-0.5`}>
                      SIGN OUT
                    </button>
                  </span>
                ) : authState === 'sent' ? (
                  <span className="font-mono text-[10px] tracking-[0.05em] opacity-60">
                    LINK SENT. CHECK YOUR INBOX, THEN COME BACK.
                  </span>
                ) : (
                  <span className="flex items-stretch gap-0 flex-wrap">
                    <input
                      type="email"
                      value={authEmail}
                      onChange={(e) => setAuthEmail(e.target.value)}
                      onKeyDown={(e) => e.key === 'Enter' && handleSendLink()}
                      placeholder="you@brand.co.uk"
                      aria-label="Email for sign-in link"
                      className="border-2 border-ink bg-white font-mono text-[11px] px-2 py-1.5 w-44 outline-none"
                    />
                    <button
                      onClick={handleSendLink}
                      className={`${chip} border-l-0 ${authState === 'failed' ? 'text-redpen' : ''}`}
                      disabled={authState === 'sending'}
                    >
                      {authState === 'sending' ? 'SENDING…' : authState === 'failed' ? 'FAILED — TRY AGAIN' : 'SIGN IN TO SYNC'}
                    </button>
                  </span>
                )}
              </div>

              <div className="font-mono text-[10px] tracking-[0.05em] opacity-60 mb-4">
                {session
                  ? 'SAVED TO YOUR ACCOUNT. RE-SAVE A NAME AND THE OLD COPY BECOMES A VERSION.'
                  : 'SAVED IN THIS BROWSER. SIGN IN AND THEY MOVE TO YOUR ACCOUNT.'}
              </div>

              <div className="flex gap-3 flex-wrap items-end mb-5">
                <div className="flex-1 min-w-[240px]">
                  <label className="block">
                    <span className="block text-xs font-semibold mb-1.5">Save the current model as</span>
                    <div className="flex border-2 border-ink bg-white h-[52px]">
                      <input
                        value={saveName}
                        onChange={(e) => setSaveName(e.target.value)}
                        onKeyDown={(e) => e.key === 'Enter' && handleSave()}
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
                  disabled={saveState === 'saving'}
                >
                  {saveState === 'saving' ? 'Saving…' : saveState === 'saved' ? 'Saved' : saveState === 'failed' ? 'Save failed' : 'Save model'}
                </button>
              </div>

              {groups.length === 0 ? (
                <div className="font-mono text-[11px] opacity-65 mb-2">Nothing in the archive yet.</div>
              ) : (
                <div className="flex flex-col">
                  {groups.map(({ latest, older }) => (
                    <div key={latest.name} className="flex flex-col">
                      {versionRow(latest, true, older.length + 1)}
                      {expanded === latest.name && older.map((m) => versionRow(m, false, 0))}
                    </div>
                  ))}
                </div>
              )}

              {picked.length === 2 && (() => {
                // Chronological: A = the earlier save, B = the later one
                const [a, b] = [...picked].sort((x, y) => x.savedAt.localeCompare(y.savedAt))
                return <ComparePanel a={a} b={b} />
              })()}
              {picked.length === 1 && (
                <div className="font-mono text-[11px] opacity-65 mt-3">
                  One picked. Pick a second save to compare.
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
