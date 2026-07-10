import { useEffect, useId, useState } from 'react'

/** Strip floating-point noise for display (0.09 × 100 → "9") */
function clean(value: number): string {
  if (!Number.isFinite(value)) return ''
  return String(parseFloat(value.toFixed(6)))
}

const AFFIX =
  'w-11 flex items-center justify-center font-mono text-[15px] bg-receipt shrink-0'

/** Spoken names for the £/% affix boxes — the affixes are meaningful (they say
 * whether the field wants pounds or a percentage), so they join the input's
 * accessible name; the visual boxes themselves are aria-hidden to avoid the
 * screen reader announcing a lone "£" between label and value. */
const AFFIX_SPOKEN: Record<string, string> = { '£': 'pounds', '%': 'percent' }

function accessibleName(label: string, prefix?: string, suffix?: string): string {
  const unit = prefix ?? suffix
  if (!unit) return label
  return `${label}, ${AFFIX_SPOKEN[unit] ?? unit}`
}

interface FieldProps {
  label: string
  /** The committed numeric value (store units — e.g. 0.35 for 35%) */
  value: number
  /** Called with the parsed value converted back to store units */
  onCommit: (n: number) => void
  /** Display multiplier: 100 shows a stored 0.35 as "35" */
  scale?: number
  prefix?: string
  suffix?: string
  /** Small bordered mono tag next to the label, e.g. "dated default — check the rate card" */
  tag?: string
  inputMode?: 'decimal' | 'numeric'
}

/**
 * The GROSS number field: 2px Ink border, 52px tall, Space Mono value,
 * £/% affix boxes. Keeps what you type as text and commits every valid parse,
 * so partial entries like "1." never fight the user.
 */
export default function Field({ label, value, onCommit, scale = 1, prefix, suffix, tag, inputMode = 'decimal' }: FieldProps) {
  const id = useId()
  const [text, setText] = useState(clean(value * scale))
  const [focused, setFocused] = useState(false)

  useEffect(() => {
    if (!focused) setText(clean(value * scale))
  }, [value, scale, focused])

  const handleChange = (raw: string) => {
    setText(raw)
    const n = parseFloat(raw)
    if (Number.isFinite(n)) onCommit(n / scale)
  }

  return (
    <label htmlFor={id} className="block">
      <span className="flex items-center justify-between text-xs font-semibold mb-1.5">
        <span>{label}</span>
        {tag && (
          <span className="font-mono text-[10px] font-normal border-2 border-ink px-1.5 py-0.5 tracking-[0.03em]">
            {tag}
          </span>
        )}
      </span>
      <div className="flex border-2 border-ink bg-white h-[52px]">
        {prefix && <span aria-hidden="true" className={`${AFFIX} border-r-2 border-ink`}>{prefix}</span>}
        <input
          id={id}
          value={text}
          onChange={(e) => handleChange(e.target.value)}
          onFocus={() => setFocused(true)}
          onBlur={() => setFocused(false)}
          inputMode={inputMode}
          aria-label={accessibleName(label, prefix, suffix)}
          className="flex-1 min-w-0 border-0 outline-none bg-transparent px-3.5 font-mono text-base text-ink"
        />
        {suffix && <span aria-hidden="true" className={`${AFFIX} border-l-2 border-ink text-[13px]`}>{suffix}</span>}
      </div>
    </label>
  )
}

/** Free-text variant for the product name. */
export function TextField({ label, value, onChange }: { label: string; value: string; onChange: (v: string) => void }) {
  const id = useId()
  return (
    <label htmlFor={id} className="block">
      <span className="block text-xs font-semibold mb-1.5">{label}</span>
      <div className="flex border-2 border-ink bg-white h-[52px]">
        <input
          id={id}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          aria-label={label}
          className="flex-1 min-w-0 border-0 outline-none bg-transparent px-3.5 font-mono text-[15px] text-ink"
        />
      </div>
    </label>
  )
}

/** Section eyebrow inside the inputs column, e.g. "THE PRODUCT". */
export function InputSection({ children, first = false }: { children: React.ReactNode; first?: boolean }) {
  return (
    <div className={`font-mono text-[11px] tracking-[0.1em] opacity-60 mb-3 ${first ? '' : 'mt-[22px]'}`}>
      {children}
    </div>
  )
}

/** The full-width mono ON/OFF toggle bar (wholesaler, FBA estimator). */
export function MonoToggle({ label, on, onToggle }: { label: string; on: boolean; onToggle: () => void }) {
  return (
    <button
      onClick={onToggle}
      aria-pressed={on}
      className={`w-full flex items-center justify-between border-2 border-ink text-ink h-[52px] px-4 cursor-pointer font-mono text-[13px] font-bold tracking-[0.04em] ${on ? 'bg-bile' : 'bg-receipt'}`}
    >
      <span>{label}</span>
      <span className="border-2 border-ink px-2.5 py-[3px] bg-receipt">{on ? 'ON' : 'OFF'}</span>
    </button>
  )
}
