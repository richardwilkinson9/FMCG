import { useState, useEffect } from 'react'
import { useStore } from '../store/useStore'
import { tiktokShopMargin, getTikTokCommission, formatGBP, formatPercent } from '../utils/calculations'
import { TIKTOK_SHOP_DEFAULTS, TIKTOK_CATEGORY_FEES } from '../config/fees'
import FeeInput from '../components/FeeInput'
import ResultCard from '../components/ResultCard'
import Tooltip from '../components/Tooltip'

export default function TikTokShop() {
  const product = useStore((s) => s.getActiveProduct())

  const [useEstimator, setUseEstimator] = useState(true)
  const [category, setCategory] = useState('Food & Beverages')

  const [platformComm, setPlatformComm] = useState(TIKTOK_SHOP_DEFAULTS.platformCommission.value)
  const [affiliateComm, setAffiliateComm] = useState(TIKTOK_SHOP_DEFAULTS.affiliateCommission.value)
  const [perOrderFee, setPerOrderFee] = useState(TIKTOK_SHOP_DEFAULTS.perOrderFee.value)
  const [refundAdmin, setRefundAdmin] = useState(TIKTOK_SHOP_DEFAULTS.refundAdminPercent.value)

  useEffect(() => {
    if (useEstimator) {
      setPlatformComm(getTikTokCommission(category))
    }
  }, [useEstimator, category])

  if (!product) return <p className="text-slate-500">Select a product to begin.</p>

  const result = tiktokShopMargin(product, {
    platformCommission: platformComm,
    affiliateCommission: affiliateComm,
    perOrderFee,
    refundAdminPercent: refundAdmin,
  })

  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-semibold text-slate-900 mb-1">TikTok Shop Margin Calculator</h3>
        <p className="text-sm text-slate-500">
          See your true margin after TikTok's platform commission, affiliate fees and other charges.
        </p>
      </div>

      {/* Category estimator */}
      <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg space-y-3">
        <label className="flex items-center gap-2 cursor-pointer">
          <input type="checkbox" checked={useEstimator} onChange={(e) => setUseEstimator(e.target.checked)}
            className="w-4 h-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500" />
          <span className="text-sm font-semibold text-blue-900">
            Set commission by category
            <Tooltip text="Select your product category to auto-set the platform commission rate. Beauty & Personal Care and Electronics are typically 5%, most other categories are 9%. You can still override the value below." />
          </span>
        </label>

        {useEstimator && (
          <div className="max-w-sm">
            <label className="block text-sm font-medium text-slate-700 mb-1">TikTok Shop category</label>
            <select value={category} onChange={(e) => setCategory(e.target.value)}
              className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent">
              {TIKTOK_CATEGORY_FEES.map((c) => (
                <option key={c.category} value={c.category}>
                  {c.category} ({(c.commissionPercent * 100).toFixed(0)}%)
                </option>
              ))}
            </select>
          </div>
        )}

        {useEstimator && (
          <p className="text-xs text-blue-700">
            Platform commission for <strong>{category}</strong>: <strong>{(getTikTokCommission(category) * 100).toFixed(0)}%</strong>.
            Verify on TikTok Shop Seller Centre — rates can change.
          </p>
        )}
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <FeeInput fee={TIKTOK_SHOP_DEFAULTS.platformCommission} value={platformComm} onChange={setPlatformComm} isPercent />
        <FeeInput fee={TIKTOK_SHOP_DEFAULTS.affiliateCommission} value={affiliateComm} onChange={setAffiliateComm} isPercent />
        <FeeInput fee={TIKTOK_SHOP_DEFAULTS.perOrderFee} value={perOrderFee} onChange={setPerOrderFee} />
        <FeeInput fee={TIKTOK_SHOP_DEFAULTS.refundAdminPercent} value={refundAdmin} onChange={setRefundAdmin} isPercent />
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <ResultCard label="Selling price ex-VAT" value={formatGBP(result.sellingPriceExVat)} />
        <ResultCard label="Platform fee" value={formatGBP(result.platformFee)} />
        <ResultCard label="Affiliate fee" value={formatGBP(result.affiliateFee)} />
        <ResultCard label="Per-order fee" value={formatGBP(result.perOrderFee)} />
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <ResultCard label="Refund admin cost" value={formatGBP(result.refundCost)} />
        <ResultCard label="Total fees" value={formatGBP(result.totalFees)} />
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
