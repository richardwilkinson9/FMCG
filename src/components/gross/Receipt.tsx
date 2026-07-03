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
  children,
}: {
  tool: string
  name: string
  subline: string
  verdict: string
  verdictColor?: string
  /** Optional extra line above the fixed VAT line (deleted from the default per the copy deck) */
  footer?: string
  children: ReactNode
}) {
  return (
    <div className="gross-reveal print-block bg-receipt border-2 border-ink font-mono">
      <div className="border-t-2 border-dashed border-ink m-2.5 h-0" />
      <div className="pt-1 px-[22px] pb-[22px]">
        <div className="flex justify-between text-xs">
          <span>GROSS. // {tool}</span>
          <span>{receiptStamp()}</span>
        </div>
        <div className="text-[15px] font-bold mt-2">{name}</div>
        <div className="text-xs opacity-70">{subline}</div>

        {children}

        <Rule className="mt-4 mb-3" />
        <div className="text-[13px] leading-normal font-bold" style={{ color: verdictColor }}>
          {verdict}
        </div>
        <Rule className="mt-3.5 mb-3" />
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

/** Solid or dotted horizontal rule inside a receipt. */
export function Rule({ dotted = false, className = 'my-2' }: { dotted?: boolean; className?: string }) {
  return <div className={`border-t-2 border-ink ${dotted ? 'border-dotted' : ''} ${className}`} />
}

/** One receipt line item: label left, value right. */
export function RLine({
  label,
  value,
  dim = false,
  bold = false,
  color,
}: {
  label: string
  value: string
  dim?: boolean
  bold?: boolean
  color?: string
}) {
  return (
    <div className={`flex justify-between text-sm py-1 ${dim ? 'opacity-75' : ''} ${bold ? 'font-bold' : ''}`}>
      <span>{label}</span>
      <span style={color ? { color } : undefined}>{value}</span>
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
          <span className="w-3 h-3 border-2 border-ink inline-block" style={{ background: health.color }} />
          {health.label}
        </span>
      )}
    </div>
  )
}

/** The inverted Ink block holding the headline answer. */
export function AnswerBlock({
  rows,
}: {
  rows: { label: string; value: string; big?: boolean; color?: string }[]
}) {
  return (
    <div className="bg-ink text-bile py-3.5 px-4 my-1.5">
      {rows.map((r, i) => (
        <div key={r.label} className={`flex justify-between items-baseline ${i > 0 ? 'mt-1.5' : ''}`}>
          <span className="text-[13px]">{r.label}</span>
          <span
            className={`font-bold ${r.big === false ? 'text-lg' : 'text-2xl'}`}
            style={{ color: r.color ?? '#C6F215' }}
          >
            {r.value}
          </span>
        </div>
      ))}
    </div>
  )
}
