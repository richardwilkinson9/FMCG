import { useStore } from '../../store/useStore'

/**
 * Slim nav bar: GROSS. wordmark left, three text links right (hidden on mobile).
 * Section links go home and scroll to the anchor once the homepage has rendered.
 */
export default function GrossNav() {
  const setActiveCalculator = useStore((s) => s.setActiveCalculator)
  const activeCalculator = useStore((s) => s.activeCalculator)

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

  const link = 'text-ink no-underline text-sm font-medium cursor-pointer bg-transparent border-0 p-0 font-body'

  return (
    <div className="no-print flex items-center justify-between py-3.5 px-[clamp(20px,4vw,44px)] bg-receipt border-b-2 border-ink">
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
      <nav aria-label="Site" className="hidden min-[901px]:flex gap-7">
        <button onClick={() => goToSection('calculators')} className={link}>Calculators</button>
        <button onClick={() => { setActiveCalculator('cross-channel'); window.scrollTo(0, 0) }} className={link}>The Line-Up</button>
        <button onClick={() => { setActiveCalculator('methodology'); window.scrollTo(0, 0) }} className={link}>The Rate Card</button>
        <button onClick={() => goToSection('union')} className={link}>The Ledger</button>
      </nav>
    </div>
  )
}
