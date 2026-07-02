import { useState } from 'react'

export default function Tooltip({ text }: { text: string }) {
  const [show, setShow] = useState(false)

  return (
    <span className="relative inline-block ml-1">
      <button
        type="button"
        onMouseEnter={() => setShow(true)}
        onMouseLeave={() => setShow(false)}
        onClick={() => setShow(!show)}
        className="inline-flex items-center justify-center w-4 h-4 text-[10px] font-bold text-slate-400 bg-slate-100 rounded-full hover:bg-slate-200 cursor-help"
        aria-label="More information"
      >
        ?
      </button>
      {show && (
        <div className="absolute bottom-6 left-1/2 -translate-x-1/2 w-56 p-2 text-xs text-slate-700 bg-white border border-slate-200 rounded-lg shadow-lg z-50">
          {text}
        </div>
      )}
    </span>
  )
}
