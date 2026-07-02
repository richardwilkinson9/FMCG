import { useState, useEffect } from 'react'
import { useStore } from '../store/useStore'
import { amazonFBAMargin, estimateAmazonFBAFee, getAmazonReferralRate, formatGBP, formatPercent } from '../utils/calculations'
import { AMAZON_FBA_DEFAULTS, AMAZON_CATEGORY_FEES } from '../config/fees'
import FeeInput from '../components/FeeInput'
import ResultCard from '../components/ResultCard'
import Tooltip from '../components/Tooltip'

export default function AmazonFBA() {
  const product = useStore((s) => s.getActiveProduct())

  const [useEstimator, setUseEstimator] = useState(true)
  const [category, setCategory] = useState('Grocery & Gourmet Food')
  const [weightG, setWeightG] = useState(200)
  const [longestCm, setLongestCm] = useState(20)
  const [medianCm, setMedianCm] = useState(10)
  const [shortestCm, setShortestCm] = useState(5)

  const [referralFee, setReferralFee] = useState(AMAZON_FBA_DEFAULTS.referralFeePercent.value)
  const [fulfilmentFee, setFulfilmentFee] = useState(AMAZON_FBA_DEFAULTS.fulfilmentFeePerUnit.value)
  const [storageFee, setStorageFee] = useState(AMAZON_FBA_DEFAULTS.monthlyStoragePerUnit.value)
  const [fuelSurcharge, setFuelSurcharge] = useState(AMAZON_FBA_DEFAULTS.fuelLogisticsSurcharge.value)

  const estimated = estimateAmazonFBAFee(weightG, longestCm, medianCm, shortestCm)

  useEffect(() => {
    if (useEstimator) {
      setFulfilmentFee(estimated.fee)
      setReferralFee(getAmazonReferralRate(category))
    }
  }, [useEstimator, category, weightG, longestCm, medianCm, shortestCm, estimated.fee])

  if (!product) return <p className="text-slate-500">Select a product to begin.</p>

  const result = amazonFBAMargin(product, {
    referralFeePercent: referralFee,
    fulfilmentFeePerUnit: fulfilmentFee,
    monthlyStoragePerUnit: storageFee,
    fuelLogisticsSurcharge: fuelSurcharge,
  })

  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-semibold text-slate-900 mb-1">Amazon FBA Margin Calculator</h3>
        <p className="text-sm text-slate-500">
          See your true margin after Amazon's referral, fulfilment and storage fees.
        </p>
      </div>

      {/* Fee estimator toggle */}
      <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg space-y-4">
        <label className="flex items-center gap-2 cursor-pointer">
          <input type="checkbox" checked={useEstimator} onChange={(e) => setUseEstimator(e.target.checked)}
            className="w-4 h-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500" />
          <span className="text-sm font-semibold text-blue-900">
            Estimate fees from product dimensions
            <Tooltip text="Enter your product's weight, dimensions and category to auto-calculate the FBA fulfilment fee and referral rate. Based on Amazon UK's published fee schedule. You can still override any value below." />
          </span>
        </label>

        {useEstimator && (
          <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
            <div className="sm:col-span-2">
              <label className="block text-sm font-medium text-slate-700 mb-1">Amazon category</label>
              <select value={category} onChange={(e) => setCategory(e.target.value)}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent">
                {AMAZON_CATEGORY_FEES.map((c) => (
                  <option key={c.category} value={c.category}>
                    {c.category} ({(c.referralPercent * 100).toFixed(0)}%)
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Weight (g)</label>
              <input type="number" min="1" value={weightG} onChange={(e) => setWeightG(parseFloat(e.target.value) || 0)}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent" />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Longest (cm)</label>
              <input type="number" min="1" step="0.5" value={longestCm} onChange={(e) => setLongestCm(parseFloat(e.target.value) || 0)}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent" />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Middle (cm)</label>
              <input type="number" min="1" step="0.5" value={medianCm} onChange={(e) => setMedianCm(parseFloat(e.target.value) || 0)}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent" />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Shortest (cm)</label>
              <input type="number" min="1" step="0.5" value={shortestCm} onChange={(e) => setShortestCm(parseFloat(e.target.value) || 0)}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent" />
            </div>
          </div>
        )}

        {useEstimator && (
          <p className="text-xs text-blue-700">
            Size tier: <strong>{estimated.tier}</strong> — estimated fulfilment fee: <strong>{formatGBP(estimated.fee)}</strong> | Referral rate: <strong>{(getAmazonReferralRate(category) * 100).toFixed(0)}%</strong> ({category}).
            Always verify against Seller Central.
          </p>
        )}
      </div>

      {/* Manual fee overrides (always visible) */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <FeeInput fee={AMAZON_FBA_DEFAULTS.referralFeePercent} value={referralFee} onChange={setReferralFee} isPercent />
        <FeeInput fee={AMAZON_FBA_DEFAULTS.fulfilmentFeePerUnit} value={fulfilmentFee} onChange={setFulfilmentFee} />
        <FeeInput fee={AMAZON_FBA_DEFAULTS.monthlyStoragePerUnit} value={storageFee} onChange={setStorageFee} />
        <FeeInput fee={AMAZON_FBA_DEFAULTS.fuelLogisticsSurcharge} value={fuelSurcharge} onChange={setFuelSurcharge} isPercent />
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <ResultCard label="Selling price ex-VAT" value={formatGBP(result.sellingPriceExVat)} />
        <ResultCard label="Referral fee" value={formatGBP(result.referralFee)} />
        <ResultCard label="Fulfilment fee" value={formatGBP(result.fulfilmentFee)} />
        <ResultCard label="Storage fee" value={formatGBP(result.storageFee)} />
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <ResultCard label="Total Amazon fees" value={formatGBP(result.totalFees)} />
        <ResultCard label="Net revenue" value={formatGBP(result.netRevenue)} />
        <ResultCard
          label="Gross profit/unit"
          value={formatGBP(result.grossProfit)}
          highlight={result.grossProfit > 0}
          negative={result.grossProfit < 0}
        />
        <ResultCard
          label="Gross margin %"
          value={formatPercent(result.grossMarginPercent)}
          highlight={result.grossMarginPercent > 0}
          negative={result.grossMarginPercent < 0}
        />
      </div>
    </div>
  )
}
