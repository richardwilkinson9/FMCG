import { useStore } from '../store/useStore'
import { defaultScenario } from '../store/scenario'
import { encodeStateToUrl } from '../utils/urlState'
import type { Product } from '../types/product'
import type { LedgerLine, LedgerShareScenario } from '../config/ledger'
import { ledgerIssue } from '../config/ledger'
import GrossFooter from '../components/gross/GrossFooter'
import Barcode from '../components/gross/Barcode'
import { RSection, RLine, Rule, AnswerBlock } from '../components/gross/Receipt'
import { BILE, INK, REDPEN } from '../components/gross/format'

/** Build the "run it with your numbers" link through the app's own encoder. */
function shareHref(s: LedgerShareScenario, tool: string): string {
  const scenario = defaultScenario()
  scenario.grocery.retailerMargin = s.retailerMargin
  scenario.minMargin.targetBrandMargin = s.targetBrandMargin
  scenario.minMargin.solveMode = s.solveMode
  scenario.listing.stores = s.stores
  const product: Product = {
    id: 'ledger-eg',
    name: s.productName,
    cogsPerUnit: s.cogsPerUnit,
    unitsPerCase: s.unitsPerCase,
    rrpIncVat: s.rrpIncVat,
    vatRate: s.vatRate,
    weeklyRateOfSale: s.weeklyRateOfSale,
  }
  try {
    return encodeStateToUrl([product], product.id, tool, scenario)
  } catch {
    return '/the-floor'
  }
}

/** One working line: a receipt row, or a sentence with an optional red phrase. */
function Line({ line }: { line: LedgerLine }) {
  if (line.prose) {
    if (line.redPhrase && line.prose.includes(line.redPhrase)) {
      const [before, after] = line.prose.split(line.redPhrase)
      return (
        <p className="text-[13px] leading-relaxed py-1.5">
          {before}
          <span style={{ color: REDPEN }}>{line.redPhrase}</span>
          {after}
        </p>
      )
    }
    return <p className="text-[13px] leading-relaxed py-1.5">{line.prose}</p>
  }
  return <RLine label={line.label ?? ''} value={line.value ?? ''} bold={line.bold} />
}

/**
 * A single Ledger issue, receipt-styled. The issue to render is taken from the
 * active page id ('ledger-001' → issue '001'), so future issues are data only.
 */
export default function LedgerIssue() {
  const activeCalculator = useStore((s) => s.activeCalculator)
  const setActiveCalculator = useStore((s) => s.setActiveCalculator)
  const issue = ledgerIssue(activeCalculator)

  if (!issue) {
    return (
      <div className="bg-receipt text-ink font-body min-h-screen">
        <div className="py-16 px-6 text-center font-mono text-[13px]">
          Issue not found.{' '}
          <button onClick={() => { setActiveCalculator('ledger'); window.scrollTo(0, 0) }} className="underline">
            Back to the archive
          </button>
        </div>
        <GrossFooter />
      </div>
    )
  }

  const href = shareHref(issue.shareScenario, issue.shareTool)
  const no = `No. ${String(issue.number).padStart(3, '0')}`

  return (
    <div className="bg-receipt text-ink font-body min-h-screen">
      <div className="py-[clamp(26px,4vw,52px)] px-[clamp(20px,4vw,44px)]">
        <div className="max-w-[720px] mx-auto">
          {/* Back to archive */}
          <button
            onClick={() => { setActiveCalculator('ledger'); window.scrollTo(0, 0) }}
            className="no-print font-mono text-[11px] tracking-[0.08em] opacity-60 hover:opacity-100 mb-4 bg-transparent border-0 p-0 cursor-pointer"
          >
            ← THE LEDGER
          </button>

          {/* The receipt-styled issue */}
          <article className="bg-receipt border-2 border-ink font-mono">
            <div className="border-t-2 border-dashed border-ink m-2.5 h-0" />
            <div className="pt-1 px-[clamp(18px,4vw,32px)] pb-[clamp(18px,4vw,32px)]">
              {/* Masthead */}
              <div className="flex items-baseline justify-between border-b-2 border-ink pb-2">
                <span className="font-display text-[22px] tracking-[-0.02em]">THE LEDGER</span>
                <span className="text-sm">{no}</span>
              </div>
              <div className="text-[12px] opacity-60 mt-1.5">One receipt a week.</div>

              {/* Title + standfirst */}
              <h1 className="font-display text-[clamp(40px,7vw,72px)] leading-[0.92] tracking-[-0.01em] mt-6">
                {issue.title.toUpperCase()}
              </h1>
              <p className="font-body text-[15px] mt-3">{issue.standfirst}</p>

              {/* THE NUMBER */}
              <div className="mt-6">
                <RSection label="THE NUMBER" />
                <AnswerBlock rows={[{ label: 'Survives a halved rate of sale', value: issue.theNumber }]} />
                <div className="text-[11px] leading-relaxed opacity-55 mt-1.5">
                  {issue.theNumberSource.map((l, i) => (
                    <div key={i}>{l}</div>
                  ))}
                </div>
              </div>

              {/* THE WORKING */}
              <Rule className="mt-5 mb-3" />
              {issue.blocks.map((block, bi) => (
                <div key={bi}>
                  {bi > 0 && <Rule dotted className="mt-3 mb-2.5" />}
                  {block.section && <RSection label={block.section} />}
                  {block.lines.map((line, li) => (
                    <Line key={li} line={line} />
                  ))}
                </div>
              ))}

              {/* THE DOUBLING LAW */}
              {issue.doublingLaw && (
                <>
                  <Rule className="mt-4 mb-3" />
                  <RSection label={issue.doublingLaw.heading} />
                  <div className="bg-ink text-bile py-3 px-4 my-1.5">
                    <div className="flex justify-between text-[11px] tracking-[0.06em] opacity-70 border-b border-dotted border-bile pb-1.5 mb-1.5">
                      <span>MARGIN PER UNIT</span>
                      <span>ROS TO BREAK EVEN</span>
                    </div>
                    {issue.doublingLaw.rows.map((r) => (
                      <div key={r.margin} className="flex justify-between items-baseline py-0.5">
                        <span className="text-[15px]">{r.margin}</span>
                        <span className="text-[15px] font-bold" style={{ color: BILE }}>{r.ros}</span>
                      </div>
                    ))}
                  </div>
                  <p className="text-[13px] leading-relaxed py-1.5">{issue.doublingLaw.caption}</p>
                </>
              )}

              {/* THE RECEIPT — the button */}
              <Rule className="mt-4 mb-3" />
              <RSection label="THE RECEIPT" />
              <a
                href={href}
                className="no-print block text-center bg-ink text-bile border-2 border-ink py-[15px] px-5 text-sm font-bold tracking-[0.04em] mt-1 hover:bg-bile hover:text-ink"
              >
                {issue.shareButtonLabel}
              </a>
              <p className="text-[11px] leading-relaxed opacity-55 mt-2">{issue.shareSupport}</p>

              {/* THE MARGIN NOTE */}
              <Rule className="mt-4 mb-3" />
              <div className="text-[13px] leading-relaxed font-bold" style={{ color: INK }}>
                {issue.marginNote}
              </div>

              {/* Barcode divider + small print + best before */}
              <div className="mt-5 mb-3"><Barcode color="#0A0A0A" height={34} /></div>
              <div className="flex items-end justify-between gap-4">
                <div className="text-[11px] leading-relaxed opacity-75">
                  Every figure here is a declared worked example, not a market fact.
                  The working is shown; check every line.
                  <br />
                  VAT number: not applicable. This is a website.
                </div>
                <div className="border-2 border-ink bg-receipt py-2 px-3 rotate-[-2deg] text-[11px] leading-tight shrink-0">
                  <div className="font-bold">BEST BEFORE</div>
                  <div className="opacity-70">{issue.bestBefore}</div>
                </div>
              </div>
            </div>
            <div className="border-b-2 border-dashed border-ink m-2.5 h-0" />
          </article>
        </div>
      </div>
      <GrossFooter />
    </div>
  )
}
