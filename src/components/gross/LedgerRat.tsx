/**
 * Ledger the Rat — the mascot, verbatim from the handover asset.
 * Single colour via currentColor; `holeColor` fills the eye/lanyard/calculator
 * cut-outs and should match the background behind the rat.
 * Brand rule: marginal positions only (footer, empty state), max once per page.
 */
export default function LedgerRat({ holeColor = '#F7F5EF' }: { holeColor?: string }) {
  return (
    <svg viewBox="0 0 240 190" width="100%" style={{ display: 'block' }} aria-label="Ledger the Rat" role="img">
      <g fill="currentColor" fillRule="evenodd">
        <path d="M30 118 Q20 118 22 108 Q26 92 46 88 Q40 74 52 66 Q64 58 80 64 Q92 56 104 66 Q120 60 150 66 Q186 74 200 104 Q210 124 196 140 Q182 154 150 152 L86 152 Q60 154 48 140 Q38 130 40 122 Q34 122 30 118 Z M64 96 a6 6 0 1 0 0.1 0 Z" />
        <circle cx="96" cy="56" r="15" />
        <circle cx="96" cy="56" r="6" fill={holeColor} />
      </g>
      <path d="M198 130 Q232 128 234 96 Q235 78 220 74" fill="none" stroke="currentColor" strokeWidth="7" strokeLinecap="round" />
      <path d="M96 152 L92 174 M120 152 L124 174 M156 152 L160 174" stroke="currentColor" strokeWidth="7" strokeLinecap="round" />
      <path d="M28 112 L6 106 M28 118 L4 120 M30 124 L8 132" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" />
      <path d="M104 44 L128 30" stroke="currentColor" strokeWidth="6" strokeLinecap="round" />
      <path d="M112 78 L112 104" stroke="currentColor" strokeWidth="3" />
      <rect x="104" y="104" width="18" height="13" fill={holeColor} stroke="currentColor" strokeWidth="2.5" />
      <rect x="118" y="128" width="40" height="30" fill={holeColor} stroke="currentColor" strokeWidth="3" />
      <rect x="123" y="132" width="30" height="7" fill="currentColor" />
      <path d="M124 146 h4 M133 146 h4 M142 146 h4 M124 152 h4 M133 152 h4 M142 152 h4" stroke="currentColor" strokeWidth="3" />
    </svg>
  )
}
