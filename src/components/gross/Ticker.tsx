const TICKER_TEXT =
  "THE PROMO DIDN'T PAY BACK  ·  YOUR ROS ASSUMPTION IS OPTIMISTIC  ·  BACK MARGIN IS STILL MARGIN  ·  THE BUYER ALREADY KNOWS  ·  "

/** Thin Ink strip with scrolling Bile-Green Space-Mono text. Pauses on hover; static under reduced motion. */
export default function Ticker() {
  return (
    <div className="gross-ticker bg-ink border-b-2 border-ink overflow-hidden whitespace-nowrap" aria-hidden="true">
      <div className="gross-marquee inline-block py-[7px] font-mono text-[12.5px] tracking-[0.06em] text-bile">
        <span className="pr-10">{TICKER_TEXT}</span>
        <span className="pr-10">{TICKER_TEXT}</span>
      </div>
    </div>
  )
}
