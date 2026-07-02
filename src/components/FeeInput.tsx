import type { FeeDefault } from '../config/fees'
import Tooltip from './Tooltip'

interface FeeInputProps {
  fee: FeeDefault
  value: number
  onChange: (value: number) => void
  /** If true, display as percentage (value is stored as decimal, e.g. 0.15) */
  isPercent?: boolean
  step?: string
}

export default function FeeInput({ fee, value, onChange, isPercent, step = '0.01' }: FeeInputProps) {
  const displayValue = isPercent ? value * 100 : value

  const handleChange = (raw: number) => {
    onChange(isPercent ? raw / 100 : raw)
  }

  return (
    <div>
      <label className="block text-sm font-medium text-slate-700 mb-1">
        {fee.label}
        <Tooltip text={fee.note} />
        {isPercent && <span className="text-slate-400 ml-1">%</span>}
        {!isPercent && <span className="text-slate-400 ml-1">£</span>}
      </label>
      <input
        type="number"
        step={step}
        min="0"
        value={displayValue}
        onChange={(e) => handleChange(parseFloat(e.target.value) || 0)}
        className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
      />
    </div>
  )
}
