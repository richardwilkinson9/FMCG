import { useState } from 'react'

export default function Tooltip({ text }: { text: string }) {
  const [show, setShow] = useState(false)

  return (
    <span className="relative inline-block ml-1">
      <button
        type="button"
        onMouseEnter={() => setShow(true)}
        onMouseLeave={() => setShow(false)}
        onFocus={() => setShow(true)}
        onBlur={() => setShow(false)}
        onClick={() => setShow(!show)}
        className="inline-flex items-center justify-center w-4 h-4 text-[10px] font-bold text-slate-400 bg-slate-100 rounded-full hover:bg-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500 cursor-help"
        aria-label={`Help: ${text}`}
        aria-expanded={show}
      >
        ?
      </button>
      {show && (
        <span
          role="tooltip"
          className="absolute bottom-6 left-1/2 -translate-x-1/2 w-56 p-2 text-xs font-normal text-slate-700 bg-white border border-slate-200 rounded-lg shadow-lg z-50 block text-left"
        >
          {text}
        </span>
      )}
    </span>
  )
}
