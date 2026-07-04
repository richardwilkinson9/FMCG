import type { ReactNode } from 'react'
import { useState } from 'react'
import { useStore } from '../../store/useStore'
import { encodeStateToUrl } from '../../utils/urlState'
import { downloadExcelModel } from '../../utils/excelExport'
import { pageById } from '../../config/pages'
import GrossFooter from './GrossFooter'
import LedgerRat from './LedgerRat'

/**
 * The "dated default — check the rate card" tag, now a link to The Rate Card
 * (the methodology page) so every fee caveat has somewhere to go.
 */
export function RateCardTag({ label = 'dated default — check the rate card' }: { label?: string }) {
  const setActiveCalculator = useStore((s) => s.setActiveCalculator)
  return (
    <button
      onClick={() => { setActiveCalculator('methodology'); window.scrollTo(0, 0) }}
      className="border-2 border-ink px-[5px] py-px font-normal cursor-pointer bg-transparent hover:bg-bile"
      title="See The Rate Card"
    >
      {label}
    </button>
  )
}

/**
 * The one-line, crawlable intro under a page header. Reads the active page from
 * the registry so it needs no props — it serves SEO and the first-time reader
 * without cluttering the header band.
 */
export function IntroLine() {
  const activeCalculator = useStore((s) => s.activeCalculator)
  const intro = pageById(activeCalculator)?.intro
  if (!intro) return null
  return (
    <div className="border-b-2 border-ink bg-white px-[clamp(20px,4vw,44px)] py-3">
      <p className="max-w-[1180px] mx-auto font-mono text-[13px] leading-snug opacity-75 m-0">{intro}</p>
    </div>
  )
}

/**
 * The shared calculator page template: Bile-Green header band (SKU eyebrow,
 * Anton title, best-before stamp), inputs-left / receipt-right split that
 * stacks below 900px, the rat empty state, and the page footer.
 */

export function BestBeforeStamp({ note = 'verify the rate card' }: { note?: string }) {
  return (
    <div className="border-2 border-ink bg-receipt py-2.5 px-3.5 rotate-[-2deg] font-mono text-xs leading-normal shrink-0">
      <div className="font-bold">DEFAULTS CHECKED</div>
      <div>03 JUL 2026</div>
      <div className="mt-1 opacity-70">{note}</div>
    </div>
  )
}

export function InputsHeader() {
  const clearProduct = useStore((s) => s.clearProduct)
  return (
    <div className="flex items-center justify-between border-b-2 border-ink pb-2.5 mb-[22px]">
      <span className="font-mono text-[13px] tracking-[0.1em] font-bold">THE INPUTS</span>
      <button
        onClick={clearProduct}
        className="border-2 border-ink bg-receipt font-mono text-[11px] py-1.5 px-2.5 cursor-pointer tracking-[0.05em] hover:bg-ink hover:text-receipt"
      >
        CHANGE PRODUCT
      </button>
    </div>
  )
}

/** Copy share link + Export, beneath the receipt. */
export function CalcActions() {
  const { products, activeProductId, activeCalculator, scenario, getActiveProduct } = useStore()
  const [copied, setCopied] = useState(false)
  const [exportState, setExportState] = useState<'idle' | 'building' | 'failed'>('idle')

  const copyLink = () => {
    const url = encodeStateToUrl(products, activeProductId, activeCalculator, scenario)
    navigator.clipboard?.writeText(url).catch(() => {})
    setCopied(true)
    setTimeout(() => setCopied(false), 1800)
  }

  const doExport = async () => {
    const product = getActiveProduct()
    if (!product || exportState === 'building') return
    setExportState('building')
    try {
      await downloadExcelModel(product, scenario)
      setExportState('idle')
    } catch {
      // Almost always a stale tab holding a purged chunk after a redeploy
      setExportState('failed')
      setTimeout(() => setExportState('idle'), 4000)
    }
  }

  const exportLabel =
    exportState === 'building' ? 'Building…'
      : exportState === 'failed' ? 'Failed — refresh the page'
        : 'Export'

  const base = 'flex-1 border-2 border-ink p-[15px] text-sm font-semibold cursor-pointer hover:bg-bile hover:text-ink'
  return (
    <div className="no-print flex gap-3 mt-4">
      <button onClick={copyLink} className={`${base} bg-ink text-receipt`}>
        {copied ? 'Link copied' : 'Copy share link'}
      </button>
      <button
        onClick={doExport}
        className={`${base} bg-receipt text-ink`}
        disabled={exportState === 'building'}
        style={exportState === 'failed' ? { color: '#E4002B' } : undefined}
      >
        {exportLabel}
      </button>
    </div>
  )
}

export function EmptyState() {
  const setActiveCalculator = useStore((s) => s.setActiveCalculator)
  return (
    <div className="py-[clamp(50px,7vw,110px)] px-[clamp(20px,4vw,44px)]">
      <div className="max-w-[640px] mx-auto text-center">
        <div className="w-[210px] mx-auto text-ink">
          <LedgerRat holeColor="#F7F5EF" />
        </div>
        <h2 className="font-display text-[clamp(34px,5vw,58px)] tracking-[-0.02em] leading-[0.95] mt-[22px] mb-0">
          No product yet.
        </h2>
        <button
          onClick={() => {
            setActiveCalculator('products')
            window.scrollTo(0, 0)
          }}
          className="inline-flex items-center gap-3 mt-7 bg-ink text-receipt border-2 border-ink py-4 px-[26px] text-base font-semibold cursor-pointer hover:bg-bile hover:text-ink"
        >
          Start with a product <span className="font-mono">→</span>
        </button>
      </div>
    </div>
  )
}

/** The Bile-Green header band, shared by every GROSS page. */
export function PageHeader({
  sku,
  group,
  type,
  title,
  subtitle,
  stampNote,
}: {
  sku: string
  group: string
  type: string
  title: string
  subtitle: string
  stampNote?: string
}) {
  return (
    <div className="bg-bile border-b-2 border-ink py-[clamp(30px,4vw,52px)] px-[clamp(20px,4vw,44px)]">
      <div className="max-w-[1180px] mx-auto">
        <div className="flex items-end justify-between flex-wrap gap-[18px]">
          <div>
            <div className="font-mono text-xs tracking-[0.12em]">
              SKU {sku} · {group} · {type}
            </div>
            <h1 className="font-display text-[clamp(48px,8vw,104px)] leading-[0.85] tracking-[-0.03em] mt-2.5 mb-0">
              {title}
            </h1>
            <p className="text-[clamp(15px,1.6vw,18px)] font-medium mt-4 mb-0 max-w-[52ch]">{subtitle}</p>
          </div>
          <BestBeforeStamp note={stampNote} />
        </div>
      </div>
    </div>
  )
}

export default function CalcShell({
  sku,
  group,
  type,
  title,
  subtitle,
  stampNote,
  inputs,
  receipt,
}: {
  sku: string
  group: string
  type: string
  title: string
  subtitle: string
  stampNote?: string
  /** Render functions so field maths only runs when a product exists */
  inputs: () => ReactNode
  receipt: () => ReactNode
}) {
  const hasProduct = useStore((s) => s.products.some((p) => p.id === s.activeProductId))

  return (
    <div className="bg-receipt text-ink font-body min-h-screen">
      <PageHeader sku={sku} group={group} type={type} title={title} subtitle={subtitle} stampNote={stampNote} />
      <IntroLine />

      {hasProduct ? (
        <div className="py-[clamp(26px,4vw,52px)] px-[clamp(20px,4vw,44px)]">
          <div className="max-w-[1180px] mx-auto">
            <div className="grid grid-cols-1 min-[901px]:grid-cols-[1fr_1.05fr] gap-[34px] items-start">
              <div className="no-print">{inputs()}</div>
              <div>{receipt()}</div>
            </div>
          </div>
        </div>
      ) : (
        <EmptyState />
      )}

      <GrossFooter />
    </div>
  )
}
