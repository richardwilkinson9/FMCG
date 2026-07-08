import { useStore } from '../../store/useStore'
import Barcode from './Barcode'

/** Calculator-page footer: barcode divider + paperwork links + the two fixed mono lines. */
export default function GrossFooter() {
  const setActiveCalculator = useStore((s) => s.setActiveCalculator)
  const go = (id: string) => { setActiveCalculator(id); window.scrollTo(0, 0) }
  const link = 'bg-transparent border-0 p-0 cursor-pointer font-mono text-[11px] text-receipt underline opacity-75 hover:opacity-100'
  return (
    <footer className="bg-ink text-receipt py-[clamp(34px,4vw,52px)] px-[clamp(20px,4vw,44px)] mt-5">
      <div className="max-w-[1180px] mx-auto">
        <div className="mb-7">
          <Barcode />
        </div>
        <div className="flex gap-5 flex-wrap font-mono text-[11px] mb-4">
          <button onClick={() => go('guides')} className={link}>The Guides</button>
          <button onClick={() => go('ledger')} className={link}>The Ledger</button>
          <button onClick={() => go('methodology')} className={link}>The Rate Card</button>
        </div>
        <div className="flex justify-between flex-wrap gap-3.5 font-mono text-[11px] opacity-75">
          <span>GROSS. CHECK YOUR MATHS. THE RAT IS NOT REAL.</span>
          <span>VAT NUMBER: NOT APPLICABLE. THIS IS A WEBSITE.</span>
        </div>
      </div>
    </footer>
  )
}
