import Barcode from './Barcode'

/** Calculator-page footer: barcode divider + the two fixed mono lines. */
export default function GrossFooter() {
  return (
    <footer className="bg-ink text-receipt py-[clamp(34px,4vw,52px)] px-[clamp(20px,4vw,44px)] mt-5">
      <div className="max-w-[1180px] mx-auto">
        <div className="mb-7">
          <Barcode />
        </div>
        <div className="flex justify-between flex-wrap gap-3.5 font-mono text-[11px] opacity-75">
          <span>GROSS. CHECK YOUR MATHS. THE RAT IS NOT REAL.</span>
          <span>VAT NUMBER: NOT APPLICABLE. THIS IS A WEBSITE.</span>
        </div>
      </div>
    </footer>
  )
}
