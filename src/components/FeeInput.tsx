import type { FeeDefault } from '../config/fees'
import NumberInput from './NumberInput'

interface FeeInputProps {
  fee: FeeDefault
  value: number
  onChange: (value: number) => void
  /** If true, value is stored as a decimal (0.15) but displayed as a percentage (15) */
  isPercent?: boolean
  disabled?: boolean
  disabledNote?: string
}

export default function FeeInput({ fee, value, onChange, isPercent, disabled, disabledNote }: FeeInputProps) {
  return (
    <NumberInput
      label={fee.label}
      tooltip={fee.note}
      value={isPercent ? value * 100 : value}
      onChange={(n) => onChange(isPercent ? n / 100 : n)}
      prefix={isPercent ? undefined : '£'}
      suffix={isPercent ? '%' : undefined}
      min={0}
      disabled={disabled}
      disabledNote={disabledNote}
    />
  )
}
