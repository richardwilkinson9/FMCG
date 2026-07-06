import { useStore } from '../../store/useStore'
import { useSession } from '../../store/session'

/**
 * Slim nav bar: GROSS. wordmark left, text links + the account button right.
 * The account button is ALWAYS visible (mobile included): signed out it says
 * SIGN IN and sells the point of it (saving); signed in it becomes THE ARCHIVE.
 * Both land on The Shelf's archive section.
 */
export default function GrossNav() {
  const setActiveCalculator = useStore((s) => s.setActiveCalculator)
  const activeCalculator = useStore((s) => s.activeCalculator)
  const session = useSession()

  const goToSection = (id: string) => {
    if (activeCalculator === 'home') {
      document.getElementById(id)?.scrollIntoView({ block: 'start' })
    } else {
      setActiveCalculator('home')
      requestAnimationFrame(() =>
        requestAnimationFrame(() => document.getElementById(id)?.scrollIntoView({ block: 'start' })),
      )
    }
  }

  const goToArchive = () => {
    setActiveCalculator('products')
    requestAnimationFrame(() =>
      requestAnimationFrame(() => document.getElementById('archive')?.scrollIntoView({ block: 'start' })),
    )
  }

  const link = 'text-ink no-underline text-sm font-medium cursor-pointer bg-transparent border-0 p-0 font-body'

  return (
    <div className="no-print flex items-center justify-between gap-3 py-3.5 px-[clamp(20px,4vw,44px)] bg-receipt border-b-2 border-ink">
      <button
        onClick={() => {
          setActiveCalculator('home')
          window.scrollTo(0, 0)
        }}
        className="font-display text-[26px] tracking-[-0.04em] leading-none text-ink bg-transparent border-0 p-0 cursor-pointer"
        aria-label="GROSS home"
      >
        GROSS.
      </button>
      <div className="flex items-center gap-7">
        <nav aria-label="Site" className="hidden min-[901px]:flex gap-7">
          <button onClick={() => goToSection('calculators')} className={link}>Calculators</button>
          <button onClick={() => { setActiveCalculator('cross-channel'); window.scrollTo(0, 0) }} className={link}>The Line-Up</button>
          <button onClick={() => { setActiveCalculator('methodology'); window.scrollTo(0, 0) }} className={link}>The Rate Card</button>
          <button onClick={() => { setActiveCalculator('ledger'); window.scrollTo(0, 0) }} className={link}>The Ledger</button>
        </nav>
        <button
          onClick={goToArchive}
          className={`border-2 border-ink font-mono text-[11px] tracking-[0.08em] py-1.5 px-3 cursor-pointer ${
            session ? 'bg-receipt text-ink hover:bg-bile' : 'bg-ink text-bile hover:bg-bile hover:text-ink'
          }`}
          title={session ? 'Your saved models' : 'Sign in to save your models and presets'}
        >
          {session ? 'THE ARCHIVE' : 'SIGN IN'}
        </button>
      </div>
    </div>
  )
}
