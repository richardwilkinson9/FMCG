import { useEffect, useId, useState } from 'react'
import Tooltip from './Tooltip'

/**
 * A number field that doesn't fight the user.
 *
 * The naive pattern — `value={n} onChange={parseFloat(x) || 0}` — snaps the
 * field to 0 the moment you clear it, making it impossible to type "0.45"
 * naturally. This component keeps what you type as text, commits every valid
 * number as you go, and only resets to the canonical value on blur.
 */

/** Strip floating-point noise for display (0.09 × 100 → "9", not "9.000000000000002") */
function clean(value: number): string {
  if (!Number.isFinite(value)) return ''
  return String(parseFloat(value.toFixed(6)))
}

interface NumberInputProps {
  label: string
  value: number
  onChange: (value: number) => void
  /** Symbol inside the field on the left, e.g. '£' */
  prefix?: string
  /** Symbol inside the field on the right, e.g. '%' */
  suffix?: string
  min?: number
  /** Small grey helper text under the field */
  help?: string
  /** '?' bubble next to the label */
  tooltip?: string
  disabled?: boolean
  /** Shown under the field when disabled, e.g. "set automatically from category" */
  disabledNote?: string
}

export default function NumberInput({
  label,
  value,
  onChange,
  prefix,
  suffix,
  min,
  help,
  tooltip,
  disabled,
  disabledNote,
}: NumberInputProps) {
  const id = useId()
  const [text, setText] = useState(clean(value))
  const [focused, setFocused] = useState(false)

  // Sync from outside (e.g. template applied, URL restored) whenever not typing
  useEffect(() => {
    if (!focused) setText(clean(value))
  }, [value, focused])

  const handleChange = (raw: string) => {
    setText(raw)
    const n = parseFloat(raw)
    if (!Number.isNaN(n)) {
      onChange(min !== undefined && n < min ? min : n)
    }
  }

  return (
    <div>
      <label htmlFor={id} className="block text-sm font-medium text-slate-700 mb-1">
        {label}
        {tooltip && <Tooltip text={tooltip} />}
      </label>
      <div className="relative">
        {prefix && (
          <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm text-slate-400 pointer-events-none">
            {prefix}
          </span>
        )}
        <input
          id={id}
          type="text"
          inputMode="decimal"
          value={disabled ? clean(value) : text}
          disabled={disabled}
          onChange={(e) => handleChange(e.target.value)}
          onFocus={() => setFocused(true)}
          onBlur={() => setFocused(false)}
          className={`w-full ${prefix ? 'pl-7' : 'pl-3'} ${suffix ? 'pr-8' : 'pr-3'} py-2 border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent ${
            disabled
              ? 'bg-slate-100 text-slate-500 border-slate-200 cursor-not-allowed'
              : 'bg-white border-slate-300'
          }`}
        />
        {suffix && (
          <span className="absolute right-3 top-1/2 -translate-y-1/2 text-sm text-slate-400 pointer-events-none">
            {suffix}
          </span>
        )}
      </div>
      {disabled && disabledNote ? (
        <p className="text-xs text-blue-600 mt-1">{disabledNote}</p>
      ) : help ? (
        <p className="text-xs text-slate-400 mt-1">{help}</p>
      ) : null}
    </div>
  )
}
