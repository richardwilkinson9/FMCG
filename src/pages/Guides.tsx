import { useStore } from '../store/useStore'
import { GUIDES } from '../config/guides'
import GrossFooter from '../components/gross/GrossFooter'

/** The guides index — the long reads behind the calculators. */
export default function Guides() {
  const setActiveCalculator = useStore((s) => s.setActiveCalculator)
  const go = (id: string) => { setActiveCalculator(id); window.scrollTo(0, 0) }

  return (
    <div className="bg-receipt text-ink font-body min-h-screen">
      <div className="py-[clamp(26px,4vw,52px)] px-[clamp(20px,4vw,44px)]">
        <div className="max-w-[720px] mx-auto">
          <div className="font-mono text-[11px] tracking-[0.1em] opacity-60">SKU 50 15465 · PAPERWORK</div>
          <h1 className="font-display text-[clamp(40px,7vw,72px)] leading-[0.92] tracking-[-0.01em] mt-2">The Guides</h1>
          <p className="text-[15px] mt-2 max-w-[54ch]">
            The long reads behind the calculators. How the maths works, what the
            norms are, and where the money goes — written down properly, once.
          </p>

          <div className="mt-7 flex flex-col gap-4">
            {GUIDES.map((g) => (
              <button
                key={g.key}
                onClick={() => go(`guide-${g.key}`)}
                className="text-left border-2 border-ink bg-white p-[clamp(18px,3vw,26px)] cursor-pointer hover:bg-bile"
              >
                <h2 className="font-display text-[clamp(22px,3vw,30px)] leading-[0.98]">{g.title}</h2>
                <p className="text-[14px] mt-2 opacity-80">{g.standfirst}</p>
                <div className="font-mono text-[11px] tracking-[0.08em] mt-3 opacity-60">READ IT →</div>
              </button>
            ))}
          </div>
        </div>
      </div>
      <GrossFooter />
    </div>
  )
}
