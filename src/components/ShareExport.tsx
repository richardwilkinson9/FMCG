import { useState } from 'react'
import { useStore } from '../store/useStore'
import { encodeStateToUrl } from '../utils/urlState'
import { buildScenarioCsv } from '../utils/export'

export default function ShareExport() {
  const { products, activeProductId, activeCalculator, scenario } = useStore()
  const [copied, setCopied] = useState(false)
  const [showEmailStub, setShowEmailStub] = useState(false)
  const [email, setEmail] = useState('')
  const [emailNoted, setEmailNoted] = useState(false)

  const handleShare = () => {
    const url = encodeStateToUrl(products, activeProductId, activeCalculator, scenario)
    navigator.clipboard.writeText(url).then(() => {
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    })
  }

  const handleExportCSV = () => {
    const product = products.find((p) => p.id === activeProductId)
    if (!product) return

    const csv = buildScenarioCsv(product, scenario)
    const blob = new Blob([csv], { type: 'text/csv' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `${product.name.replace(/\s+/g, '_')}_fmcg_maths.csv`
    a.click()
    URL.revokeObjectURL(url)
    setShowEmailStub(true)
  }

  const handleExportPDF = () => {
    // Print stylesheet in index.css hides navigation and buttons
    window.print()
    setShowEmailStub(true)
  }

  return (
    <div className="flex flex-wrap gap-2 items-center justify-end">
      <button
        onClick={handleShare}
        className="px-4 py-2 text-sm bg-slate-100 text-slate-700 rounded-lg hover:bg-slate-200 transition-colors"
        title="Copies a link that reopens your exact model — products, fees and all settings"
      >
        {copied ? 'Link copied!' : 'Share via link'}
      </button>
      <button
        onClick={handleExportCSV}
        className="px-4 py-2 text-sm bg-slate-100 text-slate-700 rounded-lg hover:bg-slate-200 transition-colors"
        title="Downloads the full scenario — product, assumptions and every calculator's results"
      >
        Export CSV
      </button>
      <button
        onClick={handleExportPDF}
        className="px-4 py-2 text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
        title="Opens your browser's print dialogue — choose 'Save as PDF'"
      >
        Export PDF
      </button>

      {showEmailStub && (
        <div className="w-full mt-1 flex items-center gap-2 justify-end">
          {emailNoted ? (
            <p className="text-xs text-emerald-700">Thanks — we'll let you know when email delivery launches.</p>
          ) : (
            <>
              <label htmlFor="email-stub" className="text-xs text-slate-500">
                Want scenarios emailed to you in future?
              </label>
              <input
                id="email-stub"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@brand.co.uk"
                className="px-2 py-1 text-xs border border-slate-300 rounded-md w-44 focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
              <button
                onClick={() => email.includes('@') && setEmailNoted(true)}
                className="px-2 py-1 text-xs bg-slate-100 text-slate-600 rounded-md hover:bg-slate-200"
              >
                Notify me
              </button>
            </>
          )}
        </div>
      )}
    </div>
  )
}
