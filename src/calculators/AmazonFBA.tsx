import { useState } from 'react'
import { useStore } from '../store/useStore'
import { amazonFBAMargin, formatGBP, formatPercent } from '../utils/calculations'
import { AMAZON_FBA_DEFAULTS } from '../config/fees'
import FeeInput from '../components/FeeInput'
import ResultCard from '../components/ResultCard'

export default function AmazonFBA() {
  const product = useStore((s) => s.getActiveProduct())
  const [referralFee, setReferralFee] = useState(AMAZON_FBA_DEFAULTS.referralFeePercent.value)
  const [fulfilmentFee, setFulfilmentFee] = useState(AMAZON_FBA_DEFAULTS.fulfilmentFeePerUnit.value)
  const [storageFee, setStorageFee] = useState(AMAZON_FBA_DEFAULTS.monthlyStoragePerUnit.value)
  const [fuelSurcharge, setFuelSurcharge] = useState(AMAZON_FBA_DEFAULTS.fuelLogisticsSurcharge.value)

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
