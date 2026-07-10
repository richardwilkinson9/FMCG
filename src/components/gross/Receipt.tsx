import type { ReactNode } from 'react'

/** Today, receipt-stamp style: "03 JUL 2026" */
export function receiptStamp(): string {
  return new Date()
    .toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })
    .toUpperCase()
    .replace(/,/g, '')
}

/**
 * The till receipt — every calculator's result surface.
 * Dashed tear-lines top and bottom, Space Mono throughout, fixed VAT footer.
 */
export function Receipt({
  tool,
  name,
  subline,
  verdict,
  verdictColor = '#0A0A0A',
  footer,
  stickyHero = false,
  children,
}: {
  tool: string
  name: string
  subline: string
  verdict: string
  verdictColor?: string
  /** Optional extra line above the fixed VAT line (deleted from the default per the copy deck) */
  footer?: string
  /**
   * When true, the receipt body is a flex column below 901px so a hero
   * AnswerBlock (order-first + sticky) can pin to the top of the receipt while
   * the breakdown scrolls beneath it. Desktop stays plain block flow, so
   * non-grocery receipts that don't set this are completely unaffected.
   */
  stickyHero?: boolean
  children: ReactNode
}) {
  return (
    // role="region" + label: the receipt is the result surface, so screen
    // reader users can jump straight to it from the landmark list.
    <div
      role="region"
      aria-label={`The receipt — ${tool}`}
      className="gross-reveal print-block bg-receipt border-2 border-ink font-mono"
    >
      <div className="border-t-2 border-dashed border-ink m-2.5 h-0" aria-hidden="true" />
      <div className="pt-1 px-[22px] pb-[22px]">
        <div className="flex justify-between text-xs">
          <span>GROSS. // {tool}</span>
          <span>{receiptStamp()}</span>
        </div>
        {/* h2: the receipt's de-facto heading. Tailwind's preflight makes
            headings inherit font size/weight and zeroes margins, so this
            renders pixel-identically to the div it replaces. */}
        <h2 className="text-[15px] font-bold mt-2">{name}</h2>
        <div className="text-xs opacity-70">{subline}</div>

        {stickyHero ? (
          // Flex only below 901px; DOM order is unchanged so the reading order
          // and the maths sequence stay exactly as authored.
          <div className="flex flex-col min-[901px]:block">{children}</div>
        ) : (
          children
        )}

        {/* The verdict lands as a boxed closing statement, not another table row. */}
        <div
          className="border-2 border-ink px-3.5 py-3 mt-4 mb-3 text-[13px] leading-normal font-bold"
          style={{ color: verdictColor }}
        >
          {verdict}
        </div>
        <Rule className="mt-1 mb-3" />
        <div className="text-[11px] leading-relaxed opacity-75">
          {footer && (
            <>
              {footer}
              <br />
            </>
          )}
          VAT number: not applicable. This is a website.
        </div>
      </div>
      <div className="border-b-2 border-dashed border-ink m-2.5 h-0" />
    </div>
  )
}

/**
 * The mobile-only "there's more below" affordance, shown above the waterfall
 * when the hero answer block is pinned to the top of the receipt on a phone.
 * Hidden on desktop, where the answer sits in its normal place.
 */
export function BreakdownLabel() {
  // pending copy sign-off — the mobile "the breakdown" label wording
  return (
    <div className="min-[901px]:hidden font-mono text-[11px] tracking-[0.1em] opacity-60 mt-2.5 mb-1">
      THE BREAKDOWN ↓
    </div>
  )
}

/** Solid or dotted horizontal rule inside a receipt. Decorative — hidden from AT. */
export function Rule({ dotted = false, className = 'my-2' }: { dotted?: boolean; className?: string }) {
  return <div className={`border-t-2 border-ink ${dotted ? 'border-dotted' : ''} ${className}`} aria-hidden="true" />
}

/**
 * One receipt line item: label left, value right.
 *
 * Variants that make the gross-to-net read as a waterfall:
 * - `deduction` — a "less …" step: indents under a leading "−", full ink (no
 *   dimming), so the eye tracks the steps down.
 * - `subtotal` — a landing ("= …"): bold, with a 2px ink top rule above it.
 *
 * `dim`/`bold` stay for annotation and result lines that are not waterfall
 * steps. If `color` is bile (#C6F215) — invisible on the cream receipt — the
 * value is placed in an ink chip (bile on ink) instead, colour placement only.
 */
export function RLine({
  label,
  value,
  dim = false,
  bold = false,
  deduction = false,
  subtotal = false,
  color,
}: {
  label: string
  value: string
  dim?: boolean
  bold?: boolean
  deduction?: boolean
  subtotal?: boolean
  color?: string
}) {
  const shownLabel = deduction ? `− ${label}` : subtotal ? `= ${label}` : label
  const isBile = color?.toUpperCase() === '#C6F215'
  const cls = [
    'flex justify-between text-sm',
    subtotal ? 'font-bold border-t-2 border-ink pt-1.5 pb-1 mt-1' : 'py-1',
    deduction ? 'pl-5' : '',
    !deduction && !subtotal && dim ? 'opacity-75' : '',
    !subtotal && bold ? 'font-bold' : '',
  ]
    .filter(Boolean)
    .join(' ')
  return (
    <div className={cls}>
      <span>{shownLabel}</span>
      <span
        className={isBile ? 'font-bold' : undefined}
        style={
          isBile
            ? { background: '#0A0A0A', color: '#C6F215', padding: '2px 8px' }
            : color
              ? { color }
              : undefined
        }
      >
        {value}
      </span>
    </div>
  )
}

/** Receipt section eyebrow, optionally with a traffic-light health chip. */
export function RSection({
  label,
  health,
}: {
  label: string
  health?: { color: string; label: string }
}) {
  return (
    <div className="flex items-center justify-between mb-1.5">
      <span className="text-[11px] tracking-[0.1em] opacity-60">{label}</span>
      {health && (
        <span className="flex items-center gap-2 text-[11px] tracking-[0.06em]">
          {/* The swatch is decoration — the adjacent text label carries the status */}
          <span aria-hidden="true" className="w-3 h-3 border-2 border-ink inline-block" style={{ background: health.color }} />
          {health.label}
        </span>
      )}
    </div>
  )
}

/**
 * The inverted Ink block holding the headline answer.
 *
 * `hero` gives it the one-big-number shape: the FIRST row becomes a ~56px
 * Space Mono bile figure (the only bile element in the block) under a small
 * receipt-white eyebrow; every remaining row demotes to a single ruled
 * sub-line in receipt-white, split off by a 2px receipt-white top rule.
 * Below 901px the hero pins (order-first + sticky top-0) to the top of the
 * receipt so a phone gets the answer before any scrolling. dl/dt/dd semantics
 * are preserved in both shapes. Non-hero callers keep the multi-row look.
 */
export function AnswerBlock({
  rows,
  hero = false,
}: {
  rows: { label: string; value: string; big?: boolean; color?: string }[]
  hero?: boolean
}) {
  if (hero && rows.length > 0) {
    const [head, ...rest] = rows
    return (
      <div
        role="group"
        aria-label="The answer"
        className="bg-ink px-4 py-4 my-1.5 order-first sticky top-0 z-10 min-[901px]:order-none min-[901px]:static"
      >
        {/* dl must directly contain div>dt/dd groups only (axe definition-list),
            so the demoted figures are sibling rows — the first carries the 2px
            receipt-white rule that separates them from the hero. */}
        <dl>
          <div>
            <dt className="text-[11px] tracking-[0.14em] text-receipt">{head.label}</dt>
            <dd
              className="font-bold leading-[0.86] mt-2 text-[clamp(40px,8vw,56px)]"
              style={{ color: head.color ?? '#C6F215' }}
            >
              {head.value}
            </dd>
          </div>
          {rest.map((r, i) => (
            <div
              key={r.label}
              className={`flex justify-between text-[13px] ${i === 0 ? 'mt-3 pt-2.5 border-t-2' : 'mt-1'}`}
              style={i === 0 ? { borderColor: '#F7F5EF' } : undefined}
            >
              <dt className="text-receipt">{r.label}</dt>
              <dd style={{ color: r.color?.toUpperCase() === '#E4002B' ? '#E4002B' : '#F7F5EF' }}>
                {r.value}
              </dd>
            </div>
          ))}
        </dl>
      </div>
    )
  }
  return (
    // role="group" + label so the block announces as the answer; dl/dt/dd tie
    // each label to its value. Preflight zeroes dl/dd margins, so the rendered
    // pixels are identical to the previous div/span structure.
    <div role="group" aria-label="The answer" className="bg-ink text-bile py-3.5 px-4 my-1.5">
      <dl>
        {rows.map((r, i) => (
          <div key={r.label} className={`flex justify-between items-baseline ${i > 0 ? 'mt-1.5' : ''}`}>
            <dt className="text-[13px]">{r.label}</dt>
            <dd
              className={`font-bold ${r.big === false ? 'text-lg' : 'text-2xl'}`}
              style={{ color: r.color ?? '#C6F215' }}
            >
              {r.value}
            </dd>
          </div>
        ))}
      </dl>
    </div>
  )
}
