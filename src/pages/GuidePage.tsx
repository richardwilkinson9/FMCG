import { useStore } from '../store/useStore'
import { guideByIdOrKey, GUIDES } from '../config/guides'
import GrossFooter from '../components/gross/GrossFooter'
import Barcode from '../components/gross/Barcode'

/**
 * One guide, rendered from config/guides.ts. The FAQ is visible on the page —
 * the prerender mirrors it as FAQPage JSON-LD, and Google requires the two to
 * match. Lightweight on purpose (no CalcShell): guides are reading pages.
 */
export default function GuidePage() {
  const activeCalculator = useStore((s) => s.activeCalculator)
  const setActiveCalculator = useStore((s) => s.setActiveCalculator)
  const guide = guideByIdOrKey(activeCalculator)

  if (!guide) {
    return (
      <div className="bg-receipt text-ink font-body min-h-screen">
        <div className="py-16 px-6 text-center font-mono text-[13px]">
          Guide not found.{' '}
          <button onClick={() => { setActiveCalculator('guides'); window.scrollTo(0, 0) }} className="underline">
            All guides
          </button>
        </div>
        <GrossFooter />
      </div>
    )
  }

  const go = (id: string) => { setActiveCalculator(id); window.scrollTo(0, 0) }
  const others = GUIDES.filter((g) => g.key !== guide.key)

  return (
    <div className="bg-receipt text-ink font-body min-h-screen">
      <div className="py-[clamp(26px,4vw,52px)] px-[clamp(20px,4vw,44px)]">
        <div className="max-w-[720px] mx-auto">
          <button
            onClick={() => go('guides')}
            className="no-print font-mono text-[11px] tracking-[0.08em] opacity-60 hover:opacity-100 mb-4 bg-transparent border-0 p-0 cursor-pointer"
          >
            ← THE GUIDES
          </button>

          <article>
            <div className="font-mono text-[11px] tracking-[0.1em] opacity-60">GROSS. // THE GUIDES</div>
            <h1 className="font-display text-[clamp(34px,6vw,60px)] leading-[0.95] tracking-[-0.01em] mt-3">
              {guide.title}
            </h1>
            <p className="text-[16px] mt-3 opacity-85">{guide.standfirst}</p>

            <div className="mt-6 border-t-2 border-ink pt-5">
              {guide.sections.map((s, i) => (
                <section key={i} className="mb-6">
                  {s.heading && (
                    <h2 className="font-mono text-[15px] font-bold tracking-[0.02em] mb-2.5">{s.heading}</h2>
                  )}
                  {s.paras.map((p, j) => (
                    <p key={j} className="text-[15px] leading-relaxed mb-3 max-w-[64ch]">{p}</p>
                  ))}
                </section>
              ))}
            </div>

            <button
              onClick={() => go(guide.toolId)}
              className="no-print inline-flex items-center gap-3 bg-ink text-bile border-2 border-ink py-3.5 px-6 text-sm font-semibold cursor-pointer hover:bg-bile hover:text-ink"
            >
              {guide.toolLabel} <span className="font-mono">→</span>
            </button>

            <div className="mt-8 border-2 border-ink bg-white p-[clamp(18px,3vw,28px)]">
              <div className="font-mono text-[11px] tracking-[0.1em] opacity-60 mb-3">ASKED A LOT</div>
              {guide.faq.map((f) => (
                <div key={f.q} className="mb-4">
                  <h3 className="font-mono text-[14px] font-bold mb-1">{f.q}</h3>
                  <p className="text-[14px] leading-relaxed max-w-[62ch]">{f.a}</p>
                </div>
              ))}
            </div>

            <div className="my-8"><Barcode /></div>

            <div className="font-mono text-[11px] tracking-[0.1em] opacity-60 mb-3">MORE GUIDES</div>
            <div className="flex flex-col gap-2">
              {others.map((g) => (
                <button
                  key={g.key}
                  onClick={() => go(`guide-${g.key}`)}
                  className="text-left border-2 border-ink bg-white py-2.5 px-3.5 font-mono text-[13px] cursor-pointer hover:bg-bile"
                >
                  {g.title} →
                </button>
              ))}
            </div>

            <p className="font-mono text-[11px] mt-8 opacity-60">
              Figures are indicative, dated and sourced on The Rate Card. VAT number: not applicable. This is a website.
            </p>
          </article>
        </div>
      </div>
      <GrossFooter />
    </div>
  )
}
