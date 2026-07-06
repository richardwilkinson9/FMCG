import { useState } from 'react'
import { useStore } from '../store/useStore'
import { PageHeader, IntroLine } from '../components/gross/CalcShell'
import GrossFooter from '../components/gross/GrossFooter'
import Barcode from '../components/gross/Barcode'
import { LEDGER_ISSUES } from '../config/ledger'

/**
 * The Ledger — the monthly letter's home. The promise, the sign-up, and the
 * archive (which is also the proof it exists).
 */
export default function Ledger() {
  const setActiveCalculator = useStore((s) => s.setActiveCalculator)
  const [email, setEmail] = useState('')
  const [state, setState] = useState<'idle' | 'sending' | 'signed' | 'failed'>('idle')

  const join = async () => {
    if (!/.+@.+\..+/.test(email) || state === 'sending') return
    setState('sending')
    const { unionSignup, logEvent } = await import('../store/cloud')
    const { ok } = await unionSignup(email)
    if (ok) logEvent('union', 'the-ledger')
    setState(ok ? 'signed' : 'failed')
    if (!ok) setTimeout(() => setState('idle'), 3000)
  }

  return (
    <div className="bg-receipt text-ink font-body min-h-screen">
      <PageHeader
        sku="50 13241"
        group="PAPERWORK"
        type="MONTHLY LETTER"
        title="The Ledger"
        subtitle="One email a month on the maths of the shelf."
        stampNote="no selling · unsubscribe any time"
      />
      <IntroLine />

      <div className="py-[clamp(26px,4vw,52px)] px-[clamp(20px,4vw,44px)]">
        <div className="max-w-[720px] mx-auto">
          <div className="border-2 border-ink bg-white p-[clamp(20px,3vw,32px)]">
            <div className="font-mono text-[11px] tracking-[0.1em] opacity-60 mb-3">THE TERMS</div>
            <div className="text-[15px] leading-relaxed max-w-[54ch]">
              Once a month: one commercial subject, done properly. Margins, trade
              spend, fees, payment terms — the numbers behind the shelf, with the
              working shown. No product news. No inspirational quotes. If an issue
              is not worth your time, it does not go out.
            </div>
            {state === 'signed' ? (
              <div className="mt-5 border-2 border-ink bg-ink text-bile font-mono text-[13px] p-[15px]">
                You're on the list. The next issue arrives when it's ready, not before.
              </div>
            ) : (
              <form
                className="mt-5 flex gap-3 flex-col min-[560px]:flex-row"
                onSubmit={(e) => { e.preventDefault(); void join() }}
              >
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="you@brand.co.uk"
                  aria-label="Email address for The Ledger"
                  className="flex-1 border-2 border-ink bg-receipt h-[50px] px-3.5 font-mono text-[14px] text-ink outline-none"
                />
                <button
                  type="submit"
                  disabled={state === 'sending' || !/.+@.+\..+/.test(email)}
                  className="border-2 border-ink bg-ink text-bile p-[13px] px-6 text-sm font-semibold cursor-pointer hover:bg-bile hover:text-ink disabled:opacity-40 disabled:cursor-not-allowed"
                >
                  {state === 'sending' ? 'Filing…' : state === 'failed' ? 'Try again' : 'Sign up'}
                </button>
              </form>
            )}
          </div>

          <div className="my-8"><Barcode /></div>

          <div className="font-mono text-[11px] tracking-[0.1em] opacity-60 mb-4">THE ARCHIVE</div>
          {LEDGER_ISSUES.length === 0 ? (
            <div className="border-2 border-ink bg-white p-[clamp(20px,3vw,32px)] font-mono text-[13px]">
              No issues yet. The first one is being totted up. Sign up above and it
              finds you; the archive fills in behind it.
            </div>
          ) : (
            LEDGER_ISSUES.map((issue) => (
              <button
                key={issue.slug}
                onClick={() => { setActiveCalculator(`ledger-${issue.slug}`); window.scrollTo(0, 0) }}
                className="block w-full text-left border-2 border-ink bg-white p-[clamp(20px,3vw,32px)] mb-5 cursor-pointer hover:bg-bile"
              >
                <div className="flex items-baseline justify-between font-mono text-[11px] tracking-[0.1em] opacity-60">
                  <span>NO. {String(issue.number).padStart(3, '0')} · {issue.date.toUpperCase()}</span>
                  <span aria-hidden="true">→</span>
                </div>
                <h2 className="font-display text-[clamp(24px,3vw,34px)] leading-[0.98] mt-2">{issue.title}</h2>
                <p className="text-[14px] mt-2 opacity-80">{issue.standfirst}</p>
                <div className="mt-3 flex items-baseline gap-2 border-t-2 border-dotted border-ink pt-3">
                  <span className="font-mono text-[11px] tracking-[0.1em] opacity-60">THE NUMBER</span>
                  <span className="font-mono text-2xl font-bold">{issue.theNumber}</span>
                </div>
              </button>
            ))
          )}
        </div>
      </div>

      <GrossFooter />
    </div>
  )
}
