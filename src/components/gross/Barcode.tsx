const WIDTHS = [
  2, 1, 3, 1, 2, 4, 1, 2, 1, 3, 2, 1, 4, 1, 2, 3, 1, 2, 1, 4, 2, 1, 3, 2, 1, 2, 4, 1, 3, 1,
  2, 1, 4, 2, 1, 3, 1, 2, 4, 1, 2, 3, 1, 2, 1, 3, 4, 1, 2, 1, 3, 2, 1, 4, 1, 2, 3, 1, 2, 4,
]

/** EAN-style divider: vertical bars of varied widths. */
export default function Barcode({ color = '#C6F215', height = 44 }: { color?: string; height?: number }) {
  return (
    <div className="flex gap-[3px] items-stretch" style={{ height }} aria-hidden="true">
      {WIDTHS.map((w, i) => (
        <div key={i} style={{ width: w, background: color }} />
      ))}
    </div>
  )
}
