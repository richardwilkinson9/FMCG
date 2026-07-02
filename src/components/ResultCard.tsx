interface ResultCardProps {
  label: string
  value: string
  /** Optional small explanatory line, e.g. "= RSP ex-VAT × (1 − retailer margin)" */
  sub?: string
  highlight?: boolean
  negative?: boolean
}

export default function ResultCard({ label, value, sub, highlight, negative }: ResultCardProps) {
  return (
    <div
      className={`p-4 rounded-lg border print-block ${
        negative
          ? 'bg-red-50 border-red-200'
          : highlight
            ? 'bg-blue-50 border-blue-200'
            : 'bg-slate-50 border-slate-200'
      }`}
    >
      <div className="text-xs font-medium text-slate-500 mb-1">{label}</div>
      <div
        className={`text-lg font-semibold ${
          negative ? 'text-red-700' : highlight ? 'text-blue-700' : 'text-slate-900'
        }`}
      >
        {value}
      </div>
      {sub && <div className="text-[11px] text-slate-400 mt-1">{sub}</div>}
    </div>
  )
}
