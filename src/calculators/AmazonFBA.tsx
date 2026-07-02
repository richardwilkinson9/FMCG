import { useStore } from '../store/useStore'
import { effectiveAmazonFees } from '../store/scenario'
import { amazonFBAMargin, estimateAmazonFBAFee, formatGBP, formatPercent } from '../utils/calculations'
import { AMAZON_FBA_DEFAULTS, AMAZON_CATEGORY_FEES } from '../config/fees'
import FeeInput from '../components/FeeInput'
import NumberInput from '../components/NumberInput'
import ResultCard from '../components/ResultCard'
import Tooltip from '../components/Tooltip'

export default function AmazonFBA() {
  const product = useStore((s) => s.getActiveProduct())
  const amazon = useStore((s) => s.scenario.amazon)
  const updateScenario = useStore((s) => s.updateScenario)

  if (!product) return <p className="text-slate-500">Select a product to begin.</p>

  const fees = effectiveAmazonFees(amazon)
  const estimated = estimateAmazonFBAFee(amazon.weightG, amazon.longestCm, amazon.medianCm, amazon.shortestCm)
  const result = amazonFBAMargin(product, fees)

  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-semibold text-slate-900 mb-1">Amazon FBA Margin Calculator</h3>
        <p className="text-sm text-slate-500">
          See your true margin after Amazon's referral, fulfilment and storage fees.
        </p>
      </div>

      {/* Fee estimator */}
      <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg space-y-4">
        <label className="flex items-center gap-2 cursor-pointer">
          <input
            type="checkbox"
            checked={amazon.estimatorOn}
            onChange={(e) => updateScenario('amazon', { estimatorOn: e.target.checked })}
            className="w-4 h-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500"
          />
          <span className="text-sm font-semibold text-blue-900">
            Estimate fees from product dimensions
            <Tooltip text="Enter your product's weight, dimensions and category to auto-calculate the FBA fulfilment fee and referral rate from Amazon UK's published fee schedule. Untick to enter fees manually." />
          </span>
        </label>

        {amazon.estimatorOn && (
          <>
            <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
              <div className="sm:col-span-2">
                <label htmlFor="amazon-category" className="block text-sm font-medium text-slate-700 mb-1">Amazon category</label>
                <select
                  id="amazon-category"
                  value={amazon.category}
                  onChange={(e) => updateScenario('amazon', { category: e.target.value })}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                >
                  {AMAZON_CATEGORY_FEES.map((c) => (
                    <option key={c.category} value={c.category}>
                      {c.category} ({(c.referralPercent * 100).toFixed(0)}%)
                    </option>
                  ))}
                </select>
              </div>
              <NumberInput label="Weight" suffix="g" min={0} value={amazon.weightG}
                onChange={(v) => updateScenario('amazon', { weightG: v })} />
              <NumberInput label="Longest side" suffix="cm" min={0} value={amazon.longestCm}
                onChange={(v) => updateScenario('amazon', { longestCm: v })} />
              <NumberInput label="Middle side" suffix="cm" min={0} value={amazon.medianCm}
                onChange={(v) => updateScenario('amazon', { medianCm: v })} />
              <NumberInput label="Shortest side" suffix="cm" min={0} value={amazon.shortestCm}
                onChange={(v) => updateScenario('amazon', { shortestCm: v })} />
            </div>
            <p className="text-xs text-blue-700">
              Size tier: <strong>{estimated.tier}</strong> — estimated fulfilment fee <strong>{formatGBP(estimated.fee)}</strong> · referral rate <strong>{(fees.referralFeePercent * 100).toFixed(0)}%</strong> ({amazon.category}). Always verify against Seller Central.
            </p>
          </>
        )}
      </div>

      {/* Fees in force */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <FeeInput
          fee={AMAZON_FBA_DEFAULTS.referralFeePercent}
          value={fees.referralFeePercent}
          onChange={(v) => updateScenario('amazon', { referralFee: v })}
          isPercent
          disabled={amazon.estimatorOn}
          disabledNote="Set by category above"
        />
        <FeeInput
          fee={AMAZON_FBA_DEFAULTS.fulfilmentFeePerUnit}
          value={fees.fulfilmentFeePerUnit}
          onChange={(v) => updateScenario('amazon', { fulfilmentFee: v })}
          disabled={amazon.estimatorOn}
          disabledNote="Set by size tier above"
        />
        <FeeInput
          fee={AMAZON_FBA_DEFAULTS.monthlyStoragePerUnit}
          value={amazon.storageFee}
          onChange={(v) => updateScenario('amazon', { storageFee: v })}
        />
        <FeeInput
          fee={AMAZON_FBA_DEFAULTS.fuelLogisticsSurcharge}
          value={amazon.fuelSurcharge}
          onChange={(v) => updateScenario('amazon', { fuelSurcharge: v })}
          isPercent
        />
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <ResultCard label="Selling price ex-VAT" value={formatGBP(result.sellingPriceExVat)} />
        <ResultCard label="Referral fee" value={formatGBP(result.referralFee)} />
        <ResultCard label="Fulfilment fee" value={formatGBP(result.fulfilmentFee)} sub="Includes fuel surcharge" />
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

      {result.grossProfit < 0 && (
        <p className="p-3 text-sm text-amber-800 bg-amber-50 border border-amber-200 rounded-lg">
          This product loses money on Amazon at its current price. Low-priced items often can't absorb the fixed fulfilment fee — consider a multipack (raises the selling price against a similar fee) or a higher RRP.
        </p>
      )}
    </div>
  )
}
