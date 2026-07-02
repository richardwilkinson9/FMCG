import { useState } from 'react'
import { useStore } from '../store/useStore'
import { encodeStateToUrl } from '../utils/urlState'

export default function ShareExport() {
  const { products, activeProductId, activeCalculator } = useStore()
  const [copied, setCopied] = useState(false)
  const [showEmailStub, setShowEmailStub] = useState(false)

  const handleShare = () => {
    const url = encodeStateToUrl(products, activeProductId, activeCalculator)
    navigator.clipboard.writeText(url).then(() => {
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    })
  }

  const handleExportCSV = () => {
    const product = products.find((p) => p.id === activeProductId)
    if (!product) return

    const rows = [
      ['Field', 'Value'],
      ['Product Name', product.name],
      ['COGS per Unit (£)', product.cogsPerUnit.toString()],
      ['Units per Case', product.unitsPerCase.toString()],
      ['RRP inc. VAT (£)', product.rrpIncVat.toString()],
      ['VAT Rate', (product.vatRate * 100).toString() + '%'],
      ['Weekly ROS/Store', product.weeklyRateOfSale.toString()],
    ]

    const csv = rows.map((r) => r.join(',')).join('\n')
    const blob = new Blob([csv], { type: 'text/csv' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `${product.name.replace(/\s+/g, '_')}_fmcg_maths.csv`
    a.click()
    URL.revokeObjectURL(url)
  }

  return (
    <div className="flex flex-wrap gap-2">
      <button
        onClick={handleShare}
        className="px-4 py-2 text-sm bg-slate-100 text-slate-700 rounded-lg hover:bg-slate-200 transition-colors"
      >
        {copied ? 'Link copied!' : 'Share via link'}
      </button>
      <button
        onClick={handleExportCSV}
        className="px-4 py-2 text-sm bg-slate-100 text-slate-700 rounded-lg hover:bg-slate-200 transition-colors"
      >
        Export CSV
      </button>
      <button
        onClick={() => setShowEmailStub(!showEmailStub)}
        className="px-4 py-2 text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
      >
        Export PDF
      </button>

      {showEmailStub && (
        <div className="w-full mt-2 p-4 bg-amber-50 border border-amber-200 rounded-lg">
          <p className="text-sm text-amber-800">
            PDF export and optional email capture will be available in a future release. For now, use your browser's print-to-PDF function (Ctrl+P / Cmd+P) or export as CSV above.
          </p>
        </div>
      )}
    </div>
  )
}
